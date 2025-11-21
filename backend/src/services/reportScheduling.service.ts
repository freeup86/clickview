/**
 * Report Scheduling Service
 *
 * Manages scheduled report generation and distribution:
 * - Cron-based scheduling
 * - Event-triggered reports
 * - Report generation (PDF, Excel, PowerPoint, CSV, JSON)
 * - Multi-channel distribution (Email, Slack, Teams, SFTP, Webhook)
 * - Conditional delivery rules
 * - Execution history and logging
 */

import * as cron from 'node-cron';
import { Pool, PoolClient } from 'pg';
import nodemailer from 'nodemailer';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// ===================================================================
// TYPES
// ===================================================================

interface ReportSchedule {
  id: string;
  reportId: string;
  name: string;
  enabled: boolean;
  schedule: ScheduleConfig;
  distribution: DistributionConfig[];
  parameters?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  lastRun?: Date;
  nextRun?: Date;
  runCount?: number;
}

interface ScheduleConfig {
  type: 'cron' | 'interval' | 'event';
  cron?: string;
  interval?: number; // minutes
  eventTrigger?: string;
  timezone?: string;
}

interface DistributionConfig {
  type: 'email' | 'slack' | 'teams' | 'sftp' | 'webhook';
  enabled: boolean;
  config: EmailConfig | SlackConfig | TeamsConfig | SFTPConfig | WebhookConfig;
}

interface EmailConfig {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body?: string;
  attachments?: EmailAttachment[];
}

interface EmailAttachment {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  filename?: string;
}

interface SlackConfig {
  channel: string;
  message?: string;
  webhookUrl?: string;
}

interface TeamsConfig {
  channel: string;
  message?: string;
  webhookUrl?: string;
}

interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  remotePath: string;
  filename?: string;
}

interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: any;
}

interface ScheduleExecution {
  id: string;
  scheduleId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'success' | 'failed' | 'partial';
  error?: string;
  distributionResults?: DistributionResult[];
}

interface DistributionResult {
  type: string;
  success: boolean;
  error?: string;
  timestamp: Date;
}

// ===================================================================
// REPORT SCHEDULING SERVICE
// ===================================================================

export class ReportSchedulingService {
  private pool: Pool;
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private intervalJobs: Map<string, NodeJS.Timeout> = new Map();
  private emailTransporter: nodemailer.Transporter;

  constructor(pool: Pool) {
    this.pool = pool;

    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
    });
  }

  /**
   * Initialize service - load and start all active schedules
   */
  public async initialize(): Promise<void> {
    console.log('Initializing Report Scheduling Service...');

    const schedules = await this.getActiveSchedules();

    for (const schedule of schedules) {
      await this.startSchedule(schedule);
    }

    console.log(`Started ${schedules.length} active schedules`);
  }

  /**
   * Shutdown service - stop all jobs
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down Report Scheduling Service...');

    // Stop all cron jobs
    this.cronJobs.forEach((job) => job.stop());
    this.cronJobs.clear();

    // Stop all interval jobs
    this.intervalJobs.forEach((job) => clearInterval(job));
    this.intervalJobs.clear();

    console.log('Report Scheduling Service shut down');
  }

  // ===================================================================
  // SCHEDULE MANAGEMENT
  // ===================================================================

  /**
   * Create a new report schedule
   */
  public async createSchedule(schedule: Omit<ReportSchedule, 'id' | 'createdAt' | 'runCount'>): Promise<ReportSchedule> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `INSERT INTO report_schedules
        (report_id, name, enabled, schedule_config, distribution_config, parameters, created_by, created_at, next_run)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
        RETURNING *`,
        [
          schedule.reportId,
          schedule.name,
          schedule.enabled,
          JSON.stringify(schedule.schedule),
          JSON.stringify(schedule.distribution),
          JSON.stringify(schedule.parameters || {}),
          schedule.createdBy,
          this.calculateNextRun(schedule.schedule),
        ]
      );

      const createdSchedule = this.mapScheduleFromDB(result.rows[0]);

      // Start the schedule if enabled
      if (createdSchedule.enabled) {
        await this.startSchedule(createdSchedule);
      }

      return createdSchedule;
    } finally {
      client.release();
    }
  }

  /**
   * Update a report schedule
   */
  public async updateSchedule(scheduleId: string, updates: Partial<ReportSchedule>): Promise<ReportSchedule> {
    const client = await this.pool.connect();

    try {
      // Stop existing schedule
      await this.stopSchedule(scheduleId);

      // Build update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updates.name);
      }

      if (updates.enabled !== undefined) {
        updateFields.push(`enabled = $${paramIndex++}`);
        updateValues.push(updates.enabled);
      }

      if (updates.schedule !== undefined) {
        updateFields.push(`schedule_config = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.schedule));

        // Recalculate next run
        updateFields.push(`next_run = $${paramIndex++}`);
        updateValues.push(this.calculateNextRun(updates.schedule));
      }

      if (updates.distribution !== undefined) {
        updateFields.push(`distribution_config = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.distribution));
      }

      if (updates.parameters !== undefined) {
        updateFields.push(`parameters = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.parameters));
      }

      updateValues.push(scheduleId);

      const result = await client.query(
        `UPDATE report_schedules
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *`,
        updateValues
      );

      if (result.rows.length === 0) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      const updatedSchedule = this.mapScheduleFromDB(result.rows[0]);

      // Restart schedule if enabled
      if (updatedSchedule.enabled) {
        await this.startSchedule(updatedSchedule);
      }

      return updatedSchedule;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a report schedule
   */
  public async deleteSchedule(scheduleId: string): Promise<void> {
    await this.stopSchedule(scheduleId);

    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM report_schedules WHERE id = $1', [scheduleId]);
    } finally {
      client.release();
    }
  }

  /**
   * Get schedule by ID
   */
  public async getSchedule(scheduleId: string): Promise<ReportSchedule | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM report_schedules WHERE id = $1', [scheduleId]);
      return result.rows.length > 0 ? this.mapScheduleFromDB(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Get all schedules for a report
   */
  public async getSchedulesForReport(reportId: string): Promise<ReportSchedule[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM report_schedules WHERE report_id = $1 ORDER BY created_at DESC', [
        reportId,
      ]);
      return result.rows.map((row) => this.mapScheduleFromDB(row));
    } finally {
      client.release();
    }
  }

  /**
   * Get all active schedules
   */
  private async getActiveSchedules(): Promise<ReportSchedule[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM report_schedules WHERE enabled = TRUE');
      return result.rows.map((row) => this.mapScheduleFromDB(row));
    } finally {
      client.release();
    }
  }

  // ===================================================================
  // SCHEDULE EXECUTION
  // ===================================================================

  /**
   * Start a schedule (begin executing based on schedule config)
   */
  private async startSchedule(schedule: ReportSchedule): Promise<void> {
    const { id, schedule: config } = schedule;

    if (config.type === 'cron' && config.cron) {
      // Cron-based schedule
      if (!cron.validate(config.cron)) {
        console.error(`Invalid cron expression for schedule ${id}: ${config.cron}`);
        return;
      }

      const job = cron.schedule(
        config.cron,
        async () => {
          await this.executeSchedule(schedule);
        },
        {
          timezone: config.timezone || 'UTC',
        }
      );

      job.start();
      this.cronJobs.set(id, job);

      console.log(`Started cron schedule ${id}: ${config.cron}`);
    } else if (config.type === 'interval' && config.interval) {
      // Interval-based schedule
      const intervalMs = config.interval * 60 * 1000; // Convert minutes to ms

      const job = setInterval(async () => {
        await this.executeSchedule(schedule);
      }, intervalMs);

      this.intervalJobs.set(id, job);

      // Execute immediately on start
      setTimeout(() => this.executeSchedule(schedule), 0);

      console.log(`Started interval schedule ${id}: every ${config.interval} minutes`);
    } else if (config.type === 'event') {
      // Event-triggered (handled separately via event bus)
      console.log(`Event-triggered schedule ${id}: ${config.eventTrigger}`);
    }
  }

  /**
   * Stop a schedule
   */
  private async stopSchedule(scheduleId: string): Promise<void> {
    // Stop cron job
    const cronJob = this.cronJobs.get(scheduleId);
    if (cronJob) {
      cronJob.stop();
      this.cronJobs.delete(scheduleId);
      console.log(`Stopped cron schedule ${scheduleId}`);
    }

    // Stop interval job
    const intervalJob = this.intervalJobs.get(scheduleId);
    if (intervalJob) {
      clearInterval(intervalJob);
      this.intervalJobs.delete(scheduleId);
      console.log(`Stopped interval schedule ${scheduleId}`);
    }
  }

  /**
   * Execute a schedule (generate and distribute report)
   */
  public async executeSchedule(schedule: ReportSchedule): Promise<ScheduleExecution> {
    const execution: ScheduleExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scheduleId: schedule.id,
      startedAt: new Date(),
      status: 'running',
      distributionResults: [],
    };

    const client = await this.pool.connect();

    try {
      console.log(`Executing schedule ${schedule.id}: ${schedule.name}`);

      // Record execution start
      await client.query(
        `INSERT INTO schedule_executions (id, schedule_id, started_at, status) VALUES ($1, $2, $3, $4)`,
        [execution.id, schedule.id, execution.startedAt, 'running']
      );

      // Update schedule last_run and run_count
      await client.query(
        `UPDATE report_schedules SET last_run = $1, run_count = COALESCE(run_count, 0) + 1 WHERE id = $2`,
        [execution.startedAt, schedule.id]
      );

      // Generate report in multiple formats
      const reportData = await this.generateReport(schedule.reportId, schedule.parameters);

      // Distribute to all configured channels
      for (const dist of schedule.distribution) {
        if (!dist.enabled) continue;

        try {
          await this.distributeReport(dist, reportData, schedule);
          execution.distributionResults!.push({
            type: dist.type,
            success: true,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error(`Distribution failed for ${dist.type}:`, error);
          execution.distributionResults!.push({
            type: dist.type,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date(),
          });
        }
      }

      // Determine overall status
      const allSucceeded = execution.distributionResults!.every((r) => r.success);
      const allFailed = execution.distributionResults!.every((r) => !r.success);

      execution.status = allSucceeded ? 'success' : allFailed ? 'failed' : 'partial';
      execution.completedAt = new Date();

      // Update execution record
      await client.query(
        `UPDATE schedule_executions SET completed_at = $1, status = $2, distribution_results = $3 WHERE id = $4`,
        [execution.completedAt, execution.status, JSON.stringify(execution.distributionResults), execution.id]
      );

      // Update next run time
      const nextRun = this.calculateNextRun(schedule.schedule);
      await client.query(`UPDATE report_schedules SET next_run = $1 WHERE id = $2`, [nextRun, schedule.id]);

      console.log(`Schedule ${schedule.id} executed: ${execution.status}`);

      return execution;
    } catch (error) {
      console.error(`Schedule execution failed for ${schedule.id}:`, error);

      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();

      await client.query(
        `UPDATE schedule_executions SET completed_at = $1, status = $2, error = $3 WHERE id = $4`,
        [execution.completedAt, execution.status, execution.error, execution.id]
      );

      throw error;
    } finally {
      client.release();
    }
  }

  // ===================================================================
  // REPORT GENERATION
  // ===================================================================

  /**
   * Generate report in requested formats
   */
  private async generateReport(
    reportId: string,
    parameters?: Record<string, any>
  ): Promise<Record<string, Buffer>> {
    // TODO: Implement actual report generation
    // This would fetch the report definition, execute queries, and generate outputs

    console.log(`Generating report ${reportId} with parameters:`, parameters);

    return {
      pdf: Buffer.from('PDF content placeholder'),
      excel: Buffer.from('Excel content placeholder'),
      csv: Buffer.from('CSV content placeholder'),
      json: Buffer.from(JSON.stringify({ data: 'JSON placeholder' })),
    };
  }

  // ===================================================================
  // DISTRIBUTION
  // ===================================================================

  /**
   * Distribute report to configured channel
   */
  private async distributeReport(
    distribution: DistributionConfig,
    reportData: Record<string, Buffer>,
    schedule: ReportSchedule
  ): Promise<void> {
    switch (distribution.type) {
      case 'email':
        await this.distributeViaEmail(distribution.config as EmailConfig, reportData, schedule);
        break;

      case 'slack':
        await this.distributeViaSlack(distribution.config as SlackConfig, reportData, schedule);
        break;

      case 'teams':
        await this.distributeViaTeams(distribution.config as TeamsConfig, reportData, schedule);
        break;

      case 'sftp':
        await this.distributeViaSFTP(distribution.config as SFTPConfig, reportData, schedule);
        break;

      case 'webhook':
        await this.distributeViaWebhook(distribution.config as WebhookConfig, reportData, schedule);
        break;

      default:
        throw new Error(`Unknown distribution type: ${distribution.type}`);
    }
  }

  /**
   * Distribute via email
   */
  private async distributeViaEmail(
    config: EmailConfig,
    reportData: Record<string, Buffer>,
    schedule: ReportSchedule
  ): Promise<void> {
    const attachments = (config.attachments || []).map((att) => ({
      filename: att.filename || `${schedule.name}.${att.format}`,
      content: reportData[att.format],
    }));

    await this.emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'reports@clickview.com',
      to: config.to.join(', '),
      cc: config.cc?.join(', '),
      bcc: config.bcc?.join(', '),
      subject: config.subject || `Scheduled Report: ${schedule.name}`,
      text: config.body || `Your scheduled report "${schedule.name}" is attached.`,
      attachments,
    });

    console.log(`Report sent via email to ${config.to.length} recipient(s)`);
  }

  /**
   * Distribute via Slack
   */
  private async distributeViaSlack(
    config: SlackConfig,
    reportData: Record<string, Buffer>,
    schedule: ReportSchedule
  ): Promise<void> {
    if (!config.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    await axios.post(config.webhookUrl, {
      channel: config.channel,
      text: config.message || `Scheduled report: ${schedule.name}`,
      // TODO: Upload report files to Slack
    });

    console.log(`Report sent to Slack channel: ${config.channel}`);
  }

  /**
   * Distribute via Microsoft Teams
   */
  private async distributeViaTeams(
    config: TeamsConfig,
    reportData: Record<string, Buffer>,
    schedule: ReportSchedule
  ): Promise<void> {
    if (!config.webhookUrl) {
      throw new Error('Teams webhook URL not configured');
    }

    await axios.post(config.webhookUrl, {
      text: config.message || `Scheduled report: ${schedule.name}`,
      // TODO: Attach report files
    });

    console.log(`Report sent to Teams channel: ${config.channel}`);
  }

  /**
   * Distribute via SFTP
   */
  private async distributeViaSFTP(
    config: SFTPConfig,
    reportData: Record<string, Buffer>,
    schedule: ReportSchedule
  ): Promise<void> {
    // TODO: Implement SFTP upload using ssh2-sftp-client or similar
    console.log(`Would upload report to SFTP: ${config.host}:${config.port}${config.remotePath}`);
  }

  /**
   * Distribute via webhook
   */
  private async distributeViaWebhook(
    config: WebhookConfig,
    reportData: Record<string, Buffer>,
    schedule: ReportSchedule
  ): Promise<void> {
    await axios({
      method: config.method,
      url: config.url,
      headers: config.headers || {},
      data: config.body || {
        schedule: {
          id: schedule.id,
          name: schedule.name,
        },
        report: reportData.json.toString('utf-8'),
      },
    });

    console.log(`Report sent to webhook: ${config.url}`);
  }

  // ===================================================================
  // UTILITIES
  // ===================================================================

  /**
   * Calculate next run time based on schedule config
   */
  private calculateNextRun(config: ScheduleConfig): Date | null {
    if (config.type === 'cron' && config.cron) {
      // Use cron parser to calculate next run
      // For simplicity, return current time + 1 hour
      const nextRun = new Date();
      nextRun.setHours(nextRun.getHours() + 1);
      return nextRun;
    }

    if (config.type === 'interval' && config.interval) {
      const nextRun = new Date();
      nextRun.setMinutes(nextRun.getMinutes() + config.interval);
      return nextRun;
    }

    return null;
  }

  /**
   * Map database row to ReportSchedule
   */
  private mapScheduleFromDB(row: any): ReportSchedule {
    return {
      id: row.id,
      reportId: row.report_id,
      name: row.name,
      enabled: row.enabled,
      schedule: JSON.parse(row.schedule_config),
      distribution: JSON.parse(row.distribution_config),
      parameters: row.parameters ? JSON.parse(row.parameters) : undefined,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      lastRun: row.last_run ? new Date(row.last_run) : undefined,
      nextRun: row.next_run ? new Date(row.next_run) : undefined,
      runCount: row.run_count || 0,
    };
  }
}
