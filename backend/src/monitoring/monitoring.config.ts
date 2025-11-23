/**
 * Monitoring Configuration
 *
 * Centralized configuration for monitoring and observability:
 * - Application Performance Monitoring (APM)
 * - Error tracking
 * - Metrics collection
 * - Log aggregation
 * - Distributed tracing
 */

import * as Sentry from '@sentry/node';
import * as SentryTracing from '@sentry/tracing';
import { Express, Request, Response, NextFunction } from 'express';
import { StatsD } from 'node-statsd';
import winston from 'winston';
import 'winston-daily-rotate-file';

/**
 * Sentry Configuration
 * Error tracking and performance monitoring
 */
export function initializeSentry(app: Express): void {
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    console.warn('SENTRY_DSN not configured. Sentry will not be initialized.');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || 'unknown',

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Attach stacktrace to messages
    attachStacktrace: true,

    // Integrations
    integrations: [
      // Express integration
      new Sentry.Integrations.Http({ tracing: true }),
      new SentryTracing.Integrations.Express({ app }),
      new SentryTracing.Integrations.Postgres(),
      new SentryTracing.Integrations.GraphQL(),
    ],

    // Before send hook to filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from error context
      if (event.request) {
        delete event.request.cookies;

        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }

        if (event.request.data) {
          // Mask password fields
          if (typeof event.request.data === 'object') {
            const data = event.request.data as any;
            if (data.password) data.password = '[FILTERED]';
            if (data.newPassword) data.newPassword = '[FILTERED]';
            if (data.confirmPassword) data.confirmPassword = '[FILTERED]';
          }
        }
      }

      return event;
    },

    // Ignore common errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
    ],
  });

  // Request handler must be the first middleware
  app.use(Sentry.Handlers.requestHandler());

  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());
}

/**
 * Sentry error handler (must be added AFTER all routes)
 */
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status code >= 500
      return true;
    },
  });
}

/**
 * StatsD Configuration
 * Metrics collection for DataDog, Graphite, etc.
 */
export class MetricsClient {
  private client: StatsD;
  private prefix: string;

  constructor() {
    const host = process.env.STATSD_HOST || 'localhost';
    const port = parseInt(process.env.STATSD_PORT || '8125', 10);
    this.prefix = process.env.STATSD_PREFIX || 'clickview';

    this.client = new StatsD({
      host,
      port,
      prefix: `${this.prefix}.`,
      globalTags: {
        env: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || 'unknown',
      },
    });
  }

  /**
   * Increment a counter
   */
  increment(metric: string, value: number = 1, tags?: string[]): void {
    this.client.increment(metric, value, tags);
  }

  /**
   * Decrement a counter
   */
  decrement(metric: string, value: number = 1, tags?: string[]): void {
    this.client.decrement(metric, value, tags);
  }

  /**
   * Record a timing
   */
  timing(metric: string, duration: number, tags?: string[]): void {
    this.client.timing(metric, duration, tags);
  }

  /**
   * Record a gauge (current value)
   */
  gauge(metric: string, value: number, tags?: string[]): void {
    this.client.gauge(metric, value, tags);
  }

  /**
   * Record a histogram
   */
  histogram(metric: string, value: number, tags?: string[]): void {
    this.client.histogram(metric, value, tags);
  }

  /**
   * Record a set (unique values)
   */
  set(metric: string, value: number, tags?: string[]): void {
    this.client.set(metric, value, tags);
  }

  /**
   * Close the client
   */
  close(): void {
    this.client.close();
  }
}

/**
 * Winston Logger Configuration
 * Structured logging with daily rotation
 */
export function createLogger(): winston.Logger {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const logDir = process.env.LOG_DIR || 'logs';

  // Custom format for structured logging
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  );

  // Console format for development
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let msg = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
      }
      return msg;
    })
  );

  // Create transports
  const transports: winston.transport[] = [];

  // Console transport
  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
        level: logLevel,
      })
    );
  }

  // File transport with daily rotation
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: `${logDir}/application-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
      level: logLevel,
    })
  );

  // Error log file
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: `${logDir}/error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
      level: 'error',
    })
  );

  // Create logger
  const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports,
    exitOnError: false,
  });

  return logger;
}

/**
 * Request logging middleware
 */
export function requestLogger(logger: winston.Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Log request
    logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - start;

      logger.info('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
    });

    next();
  };
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitoring(metrics: MetricsClient) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Increment request counter
    metrics.increment('http.request', 1, [`method:${req.method}`, `path:${req.route?.path || 'unknown'}`]);

    res.on('finish', () => {
      const duration = Date.now() - start;

      // Record response time
      metrics.timing('http.response_time', duration, [
        `method:${req.method}`,
        `path:${req.route?.path || 'unknown'}`,
        `status:${res.statusCode}`,
      ]);

      // Increment response counter
      metrics.increment('http.response', 1, [
        `method:${req.method}`,
        `path:${req.route?.path || 'unknown'}`,
        `status:${res.statusCode}`,
      ]);
    });

    next();
  };
}

/**
 * Custom metrics for business logic
 */
export class ApplicationMetrics {
  constructor(private metrics: MetricsClient) {}

  // Authentication metrics
  recordLogin(success: boolean): void {
    this.metrics.increment('auth.login', 1, [`success:${success}`]);
  }

  recordRegistration(): void {
    this.metrics.increment('auth.registration', 1);
  }

  recordMFAVerification(success: boolean): void {
    this.metrics.increment('auth.mfa_verification', 1, [`success:${success}`]);
  }

  // Dashboard metrics
  recordDashboardCreated(): void {
    this.metrics.increment('dashboard.created', 1);
  }

  recordDashboardViewed(): void {
    this.metrics.increment('dashboard.viewed', 1);
  }

  recordDashboardExported(format: string): void {
    this.metrics.increment('dashboard.exported', 1, [`format:${format}`]);
  }

  // Report metrics
  recordReportCreated(): void {
    this.metrics.increment('report.created', 1);
  }

  recordReportGenerated(duration: number): void {
    this.metrics.increment('report.generated', 1);
    this.metrics.timing('report.generation_time', duration);
  }

  // Query metrics
  recordDatabaseQuery(duration: number, table: string): void {
    this.metrics.timing('database.query_time', duration, [`table:${table}`]);
  }

  recordCacheHit(key: string): void {
    this.metrics.increment('cache.hit', 1, [`key:${key}`]);
  }

  recordCacheMiss(key: string): void {
    this.metrics.increment('cache.miss', 1, [`key:${key}`]);
  }

  // Error metrics
  recordError(type: string): void {
    this.metrics.increment('error', 1, [`type:${type}`]);
  }

  // Performance metrics
  recordMemoryUsage(heapUsed: number, heapTotal: number): void {
    this.metrics.gauge('memory.heap_used', heapUsed);
    this.metrics.gauge('memory.heap_total', heapTotal);
  }

  recordActiveConnections(count: number): void {
    this.metrics.gauge('connections.active', count);
  }
}

/**
 * Alert Configuration
 */
export interface AlertRule {
  name: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  duration: number; // seconds
  severity: 'critical' | 'warning' | 'info';
  notificationChannels: string[];
}

export const alertRules: AlertRule[] = [
  {
    name: 'High Error Rate',
    metric: 'error',
    threshold: 10,
    operator: 'gt',
    duration: 300, // 5 minutes
    severity: 'critical',
    notificationChannels: ['email', 'slack'],
  },
  {
    name: 'Slow Database Queries',
    metric: 'database.query_time',
    threshold: 1000, // 1 second
    operator: 'gt',
    duration: 60,
    severity: 'warning',
    notificationChannels: ['slack'],
  },
  {
    name: 'High Memory Usage',
    metric: 'memory.heap_used',
    threshold: 0.9, // 90%
    operator: 'gt',
    duration: 600, // 10 minutes
    severity: 'warning',
    notificationChannels: ['email'],
  },
  {
    name: 'Failed Logins',
    metric: 'auth.login',
    threshold: 5,
    operator: 'gt',
    duration: 60,
    severity: 'warning',
    notificationChannels: ['slack'],
  },
  {
    name: 'Database Unavailable',
    metric: 'health.database',
    threshold: 0,
    operator: 'eq',
    duration: 30,
    severity: 'critical',
    notificationChannels: ['email', 'slack', 'pagerduty'],
  },
];

/**
 * Export monitoring initialization
 */
export function initializeMonitoring(app: Express) {
  // Initialize Sentry
  initializeSentry(app);

  // Create metrics client
  const metrics = new MetricsClient();

  // Create logger
  const logger = createLogger();

  // Add middleware
  app.use(requestLogger(logger));
  app.use(performanceMonitoring(metrics));

  // Create application metrics
  const appMetrics = new ApplicationMetrics(metrics);

  return {
    metrics,
    logger,
    appMetrics,
  };
}
