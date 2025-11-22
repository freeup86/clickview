/**
 * Report Scheduling & Distribution Service
 *
 * Phase 4 - REPORT-002 Implementation
 * Handles report scheduling, execution, and distribution
 */

import { ReportSchedule, ScheduleExecution, DistributionChannel } from '../types/reports';
import { DatabaseService } from './databaseService';
import { ReportBuilderService } from './reportBuilderService';
import { EmailService } from './emailService';
import { SlackService } from './slackService';
import { TeamsService } from './teamsService';
import { SFTPService} from './sftpService';
import cron from 'node-cron';

// ===================================================================
// SCHEDULE SERVICE
// ===================================================================

export class ScheduleService {
  private db: DatabaseService;
  private reportBuilder: ReportBuilderService;
  private emailService: EmailService;
  private slackService: SlackService;
  private teamsService: TeamsService;
  private sftpService: SFTPService;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.db = new DatabaseService();
    this.reportBuilder = new ReportBuilderService();
    this.emailService = new EmailService();
    this.slackService = new SlackService();
    this.teamsService = new TeamsService();
    this.sftpService = new SFTPService();

    // Initialize existing schedules on startup
    this.initializeSchedules();
  }

  // ===================================================================
  // SCHEDULE CRUD OPERATIONS
  // ===================================================================

  /**
   * Create a new schedule
   */
  async createSchedule(
    schedule: Omit<ReportSchedule, 'id' | 'createdAt' | 'lastRun' | 'nextRun' | 'runCount'>
  ): Promise<ReportSchedule> {
    const newSchedule: ReportSchedule = {
      ...schedule,
      id: this.generateId(),
      createdAt: new Date(),
      lastRun: null,
      nextRun: this.calculateNextRun(schedule),
      runCount: 0,
    };

    await this.db.insert('schedules', newSchedule);

    // Start cron job if enabled
    if (newSchedule.enabled) {
      this.startSchedule(newSchedule);
    }

    return newSchedule;
  }

  /**
   * Get schedule by ID
   */
  async getSchedule(scheduleId: string): Promise<ReportSchedule | null> {
    return await this.db.findOne<ReportSchedule>('schedules', { id: scheduleId });
  }

  /**
   * List all schedules
   */
  async listSchedules(filters?: {
    reportId?: string;
    enabled?: boolean;
    userId?: string;
  }): Promise<ReportSchedule[]> {
    const query: any = {};

    if (filters?.reportId) {
      query.reportId = filters.reportId;
    }

    if (filters?.enabled !== undefined) {
      query.enabled = filters.enabled;
    }

    if (filters?.userId) {
      query.createdBy = filters.userId;
    }

    return await this.db.find<ReportSchedule>('schedules', query);
  }

  /**
   * Update schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<ReportSchedule>
  ): Promise<ReportSchedule> {
    const schedule = await this.getSchedule(scheduleId);

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const updatedSchedule: ReportSchedule = {
      ...schedule,
      ...updates,
      nextRun: this.calculateNextRun({ ...schedule, ...updates }),
    };

    await this.db.update('schedules', { id: scheduleId }, updatedSchedule);

    // Restart cron job
    this.stopSchedule(scheduleId);
    if (updatedSchedule.enabled) {
      this.startSchedule(updatedSchedule);
    }

    return updatedSchedule;
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    this.stopSchedule(scheduleId);
    await this.db.delete('schedules', { id: scheduleId });
  }

  /**
   * Toggle schedule enabled/disabled
   */
  async toggleSchedule(scheduleId: string, enabled: boolean): Promise<ReportSchedule> {
    return await this.updateSchedule(scheduleId, { enabled });
  }

  // ===================================================================
  // SCHEDULE EXECUTION
  // ===================================================================

  /**
   * Execute a schedule manually
   */
  async executeSchedule(scheduleId: string): Promise<ScheduleExecution> {
    const schedule = await this.getSchedule(scheduleId);

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const execution: ScheduleExecution = {
      id: this.generateId(),
      scheduleId: schedule.id,
      startedAt: new Date(),
      completedAt: null,
      status: 'running',
      distributionResults: [],
    };

    try {
      // Save execution to database
      await this.db.insert('schedule_executions', execution);

      // Execute the report
      const { report, data } = await this.reportBuilder.executeReport(
        schedule.reportId,
        schedule.parameters
      );

      // Distribute to all channels
      const distributionResults = await this.distributeReport(
        report,
        data,
        schedule.distribution
      );

      // Update execution with results
      execution.completedAt = new Date();
      execution.status = this.determineExecutionStatus(distributionResults);
      execution.distributionResults = distributionResults;

      await this.db.update('schedule_executions', { id: execution.id }, execution);

      // Update schedule stats
      await this.updateScheduleStats(scheduleId);

      return execution;
    } catch (error: any) {
      // Mark execution as failed
      execution.completedAt = new Date();
      execution.status = 'failed';
      execution.error = error.message;

      await this.db.update('schedule_executions', { id: execution.id }, execution);

      throw error;
    }
  }

  /**
   * Get execution history for a schedule
   */
  async getExecutionHistory(
    scheduleId: string,
    limit: number = 20
  ): Promise<ScheduleExecution[]> {
    return await this.db.find<ScheduleExecution>(
      'schedule_executions',
      { scheduleId },
      { limit, sort: { startedAt: -1 } }
    );
  }

  /**
   * Get recent executions across all schedules
   */
  async getRecentExecutions(limit: number = 20): Promise<ScheduleExecution[]> {
    return await this.db.find<ScheduleExecution>(
      'schedule_executions',
      {},
      { limit, sort: { startedAt: -1 } }
    );
  }

  // ===================================================================
  // DISTRIBUTION
  // ===================================================================

  /**
   * Distribute report to all configured channels
   */
  private async distributeReport(
    report: any,
    data: any,
    channels: DistributionChannel[]
  ): Promise<Array<{ type: string; success: boolean; error?: string }>> {
    const results = await Promise.all(
      channels
        .filter((channel) => channel.enabled)
        .map(async (channel) => {
          try {
            await this.distributeToChannel(report, data, channel);
            return { type: channel.type, success: true };
          } catch (error: any) {
            console.error(`Distribution to ${channel.type} failed:`, error);
            return { type: channel.type, success: false, error: error.message };
          }
        })
    );

    return results;
  }

  /**
   * Distribute to a specific channel
   */
  private async distributeToChannel(
    report: any,
    data: any,
    channel: DistributionChannel
  ): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.emailService.send({
          to: channel.recipients || [],
          subject: channel.subject || `Report: ${report.name}`,
          body: channel.body || '',
          attachments: [], // TODO: Generate PDF/Excel attachment
        });
        break;

      case 'slack':
        await this.slackService.sendMessage({
          webhookUrl: channel.webhookUrl || '',
          channel: channel.channel,
          message: `Report "${report.name}" has been generated.`,
          attachments: [], // TODO: Add report data
        });
        break;

      case 'teams':
        await this.teamsService.sendMessage({
          webhookUrl: channel.webhookUrl || '',
          title: `Report: ${report.name}`,
          text: 'Report has been generated.',
        });
        break;

      case 'sftp':
        // TODO: Generate file and upload via SFTP
        await this.sftpService.upload({
          host: channel.host || '',
          port: channel.port || 22,
          username: channel.username || '',
          password: channel.password,
          privateKey: channel.privateKey,
          remotePath: channel.path || '',
          fileName: `${report.name}.pdf`,
          data: Buffer.from(''), // TODO: Generate actual file
        });
        break;

      case 'webhook':
        await fetch(channel.webhookUrl || '', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report, data }),
        });
        break;

      default:
        throw new Error(`Unknown distribution channel type: ${channel.type}`);
    }
  }

  // ===================================================================
  // CRON MANAGEMENT
  // ===================================================================

  /**
   * Initialize all enabled schedules on startup
   */
  private async initializeSchedules(): Promise<void> {
    const schedules = await this.listSchedules({ enabled: true });

    schedules.forEach((schedule) => {
      this.startSchedule(schedule);
    });

    console.log(`Initialized ${schedules.length} scheduled reports`);
  }

  /**
   * Start a schedule's cron job
   */
  private startSchedule(schedule: ReportSchedule): void {
    // Stop existing task if any
    this.stopSchedule(schedule.id);

    if (schedule.scheduleType === 'cron' && schedule.cron) {
      const task = cron.schedule(schedule.cron, async () => {
        console.log(`Executing scheduled report: ${schedule.id}`);
        try {
          await this.executeSchedule(schedule.id);
        } catch (error) {
          console.error(`Failed to execute schedule ${schedule.id}:`, error);
        }
      });

      this.scheduledTasks.set(schedule.id, task);
    } else if (schedule.scheduleType === 'interval' && schedule.interval) {
      // Use setInterval for interval-based schedules
      const intervalMs = schedule.interval * 60 * 1000; // Convert minutes to ms
      const intervalId = setInterval(async () => {
        console.log(`Executing scheduled report: ${schedule.id}`);
        try {
          await this.executeSchedule(schedule.id);
        } catch (error) {
          console.error(`Failed to execute schedule ${schedule.id}:`, error);
        }
      }, intervalMs);

      // Store interval ID as task
      this.scheduledTasks.set(schedule.id, {
        stop: () => clearInterval(intervalId),
      } as any);
    }
  }

  /**
   * Stop a schedule's cron job
   */
  private stopSchedule(scheduleId: string): void {
    const task = this.scheduledTasks.get(scheduleId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(scheduleId);
    }
  }

  // ===================================================================
  // STATISTICS
  // ===================================================================

  /**
   * Get schedule statistics
   */
  async getStats(timeRange: '24h' | '7d' | '30d' = '24h'): Promise<{
    totalExecutions: number;
    executionsToday: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    avgDuration: number;
  }> {
    const now = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
    }

    const executions = await this.db.find<ScheduleExecution>('schedule_executions', {
      startedAt: { $gte: startDate },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const successfulExecutions = executions.filter((e) => e.status === 'success').length;
    const failedExecutions = executions.filter((e) => e.status === 'failed').length;
    const executionsToday = executions.filter((e) => new Date(e.startedAt) >= today).length;

    const durations = executions
      .filter((e) => e.completedAt)
      .map((e) => new Date(e.completedAt!).getTime() - new Date(e.startedAt).getTime());

    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    return {
      totalExecutions: executions.length,
      executionsToday,
      successfulExecutions,
      failedExecutions,
      successRate: executions.length > 0
        ? Math.round((successfulExecutions / executions.length) * 100)
        : 0,
      avgDuration,
    };
  }

  // ===================================================================
  // UTILITIES
  // ===================================================================

  /**
   * Calculate next run time
   */
  private calculateNextRun(schedule: Partial<ReportSchedule>): Date | null {
    if (!schedule.enabled) return null;

    if (schedule.scheduleType === 'cron' && schedule.cron) {
      // Use cron parser library to calculate next run
      // For now, return approximate next run
      return new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    } else if (schedule.scheduleType === 'interval' && schedule.interval) {
      return new Date(Date.now() + schedule.interval * 60 * 1000);
    }

    return null;
  }

  /**
   * Update schedule statistics after execution
   */
  private async updateScheduleStats(scheduleId: string): Promise<void> {
    const schedule = await this.getSchedule(scheduleId);
    if (!schedule) return;

    await this.db.update(
      'schedules',
      { id: scheduleId },
      {
        lastRun: new Date(),
        nextRun: this.calculateNextRun(schedule),
        runCount: (schedule.runCount || 0) + 1,
      }
    );
  }

  /**
   * Determine execution status from distribution results
   */
  private determineExecutionStatus(
    results: Array<{ type: string; success: boolean; error?: string }>
  ): 'success' | 'failed' | 'partial' {
    const successCount = results.filter((r) => r.success).length;

    if (successCount === 0) return 'failed';
    if (successCount === results.length) return 'success';
    return 'partial';
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const scheduleService = new ScheduleService();
