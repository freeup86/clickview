/**
 * Alerting System
 *
 * Production-ready alerting for critical system events.
 * Supports multiple notification channels and configurable thresholds.
 */

import { logger } from '../config/logger';

// Alert severity levels
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// Alert types
export enum AlertType {
  SYSTEM = 'system',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  AVAILABILITY = 'availability',
  BUSINESS = 'business',
}

// Alert interface
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved?: boolean;
  resolvedAt?: Date;
}

// Alert rule interface
interface AlertRule {
  name: string;
  type: AlertType;
  condition: (metrics: Record<string, any>) => boolean;
  severity: AlertSeverity;
  message: (metrics: Record<string, any>) => string;
  cooldownMinutes: number;
  enabled: boolean;
}

// Notification channel interface
interface NotificationChannel {
  name: string;
  enabled: boolean;
  send: (alert: Alert) => Promise<void>;
}

class AlertingService {
  private alerts: Map<string, Alert> = new Map();
  private alertRules: AlertRule[] = [];
  private notificationChannels: NotificationChannel[] = [];
  private lastAlertTimes: Map<string, Date> = new Map();

  constructor() {
    this.initializeDefaultRules();
    this.initializeDefaultChannels();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    this.alertRules = [
      // High error rate
      {
        name: 'high_error_rate',
        type: AlertType.AVAILABILITY,
        condition: (metrics) => {
          const errorRate = metrics.http_errors_total / (metrics.http_requests_total || 1);
          return errorRate > 0.05; // > 5% error rate
        },
        severity: AlertSeverity.ERROR,
        message: (metrics) => {
          const errorRate = ((metrics.http_errors_total / (metrics.http_requests_total || 1)) * 100).toFixed(2);
          return `High error rate detected: ${errorRate}%`;
        },
        cooldownMinutes: 5,
        enabled: true,
      },

      // High response time
      {
        name: 'high_response_time',
        type: AlertType.PERFORMANCE,
        condition: (metrics) => {
          const p95 = metrics.http_request_duration_ms?.percentiles?.p95 || 0;
          return p95 > 2000; // > 2 seconds
        },
        severity: AlertSeverity.WARNING,
        message: (metrics) => {
          const p95 = metrics.http_request_duration_ms?.percentiles?.p95 || 0;
          return `High P95 response time: ${p95}ms`;
        },
        cooldownMinutes: 10,
        enabled: true,
      },

      // Memory usage
      {
        name: 'high_memory_usage',
        type: AlertType.SYSTEM,
        condition: (metrics) => {
          const heapUsed = metrics.memory?.heapUsed || 0;
          const heapTotal = metrics.memory?.heapTotal || 1;
          return heapUsed / heapTotal > 0.9; // > 90% heap usage
        },
        severity: AlertSeverity.WARNING,
        message: (metrics) => {
          const usage = ((metrics.memory?.heapUsed / metrics.memory?.heapTotal) * 100).toFixed(1);
          return `High memory usage: ${usage}%`;
        },
        cooldownMinutes: 15,
        enabled: true,
      },

      // Database connection issues
      {
        name: 'database_connection_failed',
        type: AlertType.AVAILABILITY,
        condition: (metrics) => metrics.database_health === 'fail',
        severity: AlertSeverity.CRITICAL,
        message: () => 'Database connection failed',
        cooldownMinutes: 1,
        enabled: true,
      },

      // Redis connection issues
      {
        name: 'redis_connection_failed',
        type: AlertType.AVAILABILITY,
        condition: (metrics) => metrics.redis_health === 'fail',
        severity: AlertSeverity.ERROR,
        message: () => 'Redis connection failed',
        cooldownMinutes: 1,
        enabled: true,
      },

      // High rate limit hits
      {
        name: 'high_rate_limit_hits',
        type: AlertType.SECURITY,
        condition: (metrics) => {
          const rateLimitHits = metrics.rate_limit_exceeded_total || 0;
          return rateLimitHits > 100; // > 100 hits in monitoring window
        },
        severity: AlertSeverity.WARNING,
        message: (metrics) => `High rate limit activity: ${metrics.rate_limit_exceeded_total} blocked requests`,
        cooldownMinutes: 30,
        enabled: true,
      },

      // Failed login attempts
      {
        name: 'multiple_failed_logins',
        type: AlertType.SECURITY,
        condition: (metrics) => {
          const failedLogins = metrics.auth_failed_total || 0;
          return failedLogins > 50; // > 50 failed logins
        },
        severity: AlertSeverity.WARNING,
        message: (metrics) => `Multiple failed login attempts detected: ${metrics.auth_failed_total}`,
        cooldownMinutes: 15,
        enabled: true,
      },
    ];
  }

  /**
   * Initialize notification channels
   */
  private initializeDefaultChannels(): void {
    // Log channel (always enabled)
    this.notificationChannels.push({
      name: 'log',
      enabled: true,
      send: async (alert) => {
        const logLevel = {
          [AlertSeverity.INFO]: 'info',
          [AlertSeverity.WARNING]: 'warn',
          [AlertSeverity.ERROR]: 'error',
          [AlertSeverity.CRITICAL]: 'error',
        }[alert.severity] as 'info' | 'warn' | 'error';

        logger[logLevel]('ALERT', {
          alertId: alert.id,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          metadata: alert.metadata,
        });
      },
    });

    // Webhook channel (for Slack, Teams, PagerDuty, etc.)
    if (process.env.ALERT_WEBHOOK_URL) {
      this.notificationChannels.push({
        name: 'webhook',
        enabled: true,
        send: async (alert) => {
          try {
            const response = await fetch(process.env.ALERT_WEBHOOK_URL!, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                alert_id: alert.id,
                type: alert.type,
                severity: alert.severity,
                title: alert.title,
                message: alert.message,
                timestamp: alert.timestamp.toISOString(),
                source: alert.source,
                metadata: alert.metadata,
              }),
            });

            if (!response.ok) {
              logger.error('Failed to send webhook alert', {
                status: response.status,
                alertId: alert.id,
              });
            }
          } catch (error) {
            logger.error('Webhook alert error', { error, alertId: alert.id });
          }
        },
      });
    }

    // Email channel (if configured)
    if (process.env.ALERT_EMAIL_ENABLED === 'true') {
      this.notificationChannels.push({
        name: 'email',
        enabled: true,
        send: async (alert) => {
          // Email sending would be implemented here
          // Using nodemailer or similar
          logger.info('Email alert would be sent', { alertId: alert.id });
        },
      });
    }
  }

  /**
   * Create and dispatch an alert
   */
  async createAlert(
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    message: string,
    source: string,
    metadata?: Record<string, any>
  ): Promise<Alert> {
    const alert: Alert = {
      id: this.generateAlertId(),
      type,
      severity,
      title,
      message,
      timestamp: new Date(),
      source,
      metadata,
      acknowledged: false,
      resolved: false,
    };

    this.alerts.set(alert.id, alert);

    // Send notifications
    await this.sendNotifications(alert);

    return alert;
  }

  /**
   * Evaluate alert rules against current metrics
   */
  async evaluateRules(metrics: Record<string, any>): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastAlert = this.lastAlertTimes.get(rule.name);
      if (lastAlert) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (Date.now() - lastAlert.getTime() < cooldownMs) {
          continue;
        }
      }

      // Evaluate condition
      try {
        if (rule.condition(metrics)) {
          const message = rule.message(metrics);
          await this.createAlert(
            rule.type,
            rule.severity,
            rule.name.replace(/_/g, ' ').toUpperCase(),
            message,
            'alerting-service',
            { rule: rule.name, metrics }
          );
          this.lastAlertTimes.set(rule.name, new Date());
        }
      } catch (error) {
        logger.error('Error evaluating alert rule', { rule: rule.name, error });
      }
    }
  }

  /**
   * Send alert to all enabled channels
   */
  private async sendNotifications(alert: Alert): Promise<void> {
    const promises = this.notificationChannels
      .filter((channel) => channel.enabled)
      .map((channel) =>
        channel.send(alert).catch((error) => {
          logger.error(`Failed to send alert via ${channel.name}`, { error, alertId: alert.id });
        })
      );

    await Promise.all(promises);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get active (unresolved) alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((alert) => !alert.resolved);
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Add custom alert rule
   */
  addRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  /**
   * Add notification channel
   */
  addChannel(channel: NotificationChannel): void {
    this.notificationChannels.push(channel);
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear old resolved alerts (cleanup)
   */
  cleanupOldAlerts(maxAgeHours: number = 24): void {
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt.getTime() < cutoff) {
        this.alerts.delete(id);
      }
    }
  }
}

// Singleton instance
export const alertingService = new AlertingService();

export default alertingService;
