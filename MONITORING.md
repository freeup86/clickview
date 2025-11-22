# ClickView Enterprise - Monitoring and Alerting Guide

## Table of Contents

1. [Overview](#overview)
2. [Metrics Collection](#metrics-collection)
3. [Prometheus Setup](#prometheus-setup)
4. [Grafana Dashboards](#grafana-dashboards)
5. [Error Tracking](#error-tracking)
6. [Logging](#logging)
7. [Uptime Monitoring](#uptime-monitoring)
8. [Alerting Rules](#alerting-rules)
9. [Alert Channels](#alert-channels)
10. [Performance Monitoring](#performance-monitoring)
11. [Best Practices](#best-practices)

## Overview

Effective monitoring is critical for maintaining system reliability, performance, and security. This guide covers the complete monitoring stack for ClickView Enterprise.

### Monitoring Stack

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Backend  │  │ Frontend │  │ Database │             │
│  │ (Node.js)│  │ (React)  │  │(Postgres)│             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
└───────┼─────────────┼─────────────┼───────────────────┘
        │             │             │
        │    Metrics  │  Logs       │  Events
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────┐
│                  Collection Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │Prometheus│  │ Winston  │  │  Sentry  │             │
│  │  Metrics │  │   Logs   │  │  Errors  │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
└───────┼─────────────┼─────────────┼───────────────────┘
        │             │             │
        │             │             │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────┐
│                 Visualization Layer                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Grafana  │  │   ELK    │  │  Sentry  │             │
│  │Dashboards│  │  Kibana  │  │    UI    │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
└───────┼─────────────┼─────────────┼───────────────────┘
        │             │             │
        │             │             │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────┐
│                   Alerting Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │AlertManager│ │  Email  │  │  Slack   │             │
│  │  PagerDuty │ │   SMS   │  │  Webhook │             │
│  └────────────┘ └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

## Metrics Collection

### Application Metrics

The backend exposes Prometheus-compatible metrics at `/metrics` endpoint.

#### Instrument Backend Code

```typescript
// backend/src/middleware/metrics.ts
import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

export const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

export const cacheHitRate = new promClient.Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate',
  registers: [register],
});

// Metrics middleware
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });
  });

  next();
}

// Metrics endpoint
export function metricsEndpoint(req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
}
```

#### Add to Express App

```typescript
// backend/src/index.ts
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics';

// Add metrics middleware
app.use(metricsMiddleware);

// Expose metrics endpoint
app.get('/metrics', metricsEndpoint);
```

### Frontend Metrics (Web Vitals)

```typescript
// frontend/src/utils/metrics.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Send to your analytics endpoint
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metric),
  });
}

export function initWebVitals() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
```

## Prometheus Setup

### Docker Compose Configuration

```yaml
# monitoring/docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/prometheus/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager/config.yml:/etc/alertmanager/config.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/config.yml'
      - '--storage.path=/alertmanager'
    restart: unless-stopped
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
      - grafana_data:/var/lib/grafana
    restart: unless-stopped
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    restart: unless-stopped
    networks:
      - monitoring

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: postgres-exporter
    ports:
      - "9187:9187"
    environment:
      DATA_SOURCE_NAME: "postgresql://clickview_user:password@postgres:5432/clickview_db?sslmode=disable"
    restart: unless-stopped
    networks:
      - monitoring

volumes:
  prometheus_data:
  alertmanager_data:
  grafana_data:

networks:
  monitoring:
    driver: bridge
```

### Prometheus Configuration

```yaml
# monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'clickview-production'
    environment: 'production'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

# Load rules
rule_files:
  - '/etc/prometheus/alerts.yml'

# Scrape configurations
scrape_configs:
  # ClickView Backend
  - job_name: 'clickview-backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/metrics'
    scrape_interval: 10s

  # Node Exporter (System Metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # PostgreSQL
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis (if redis_exporter is added)
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

## Grafana Dashboards

### Dashboard Provisioning

```yaml
# monitoring/grafana/provisioning/dashboards/dashboard.yml
apiVersion: 1

providers:
  - name: 'ClickView'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
```

### Data Source Configuration

```yaml
# monitoring/grafana/provisioning/datasources/datasource.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

### Example Dashboard JSON

Create `monitoring/grafana/dashboards/clickview-overview.json`:

```json
{
  "dashboard": {
    "title": "ClickView Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "{{route}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])",
            "legendFormat": "{{route}}"
          }
        ]
      },
      {
        "title": "Database Query Duration",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))",
            "legendFormat": "{{query_type}}"
          }
        ]
      }
    ]
  }
}
```

## Error Tracking

### Sentry Integration

#### Backend Setup

```typescript
// backend/src/config/sentry.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export function initSentry(app: Express) {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        // HTTP integration
        new Sentry.Integrations.Http({ tracing: true }),
        // Express integration
        new Sentry.Integrations.Express({ app }),
        // Profiling
        new ProfilingIntegration(),
      ],
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),

      beforeSend(event, hint) {
        // Don't send errors in development
        if (process.env.NODE_ENV === 'development') {
          return null;
        }

        // Filter out certain errors
        if (event.exception) {
          const error = hint.originalException;
          // Don't send validation errors
          if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 400) {
            return null;
          }
        }

        return event;
      },
    });

    // Request handler must be the first middleware
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }
}

export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler();
}
```

#### Frontend Setup

```typescript
// frontend/src/config/sentry.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initSentry() {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        new BrowserTracing(),
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }
}
```

## Logging

### Winston Configuration

```typescript
// backend/src/config/logger.ts
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console transport
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level}]: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
      }`;
    })
  ),
});

// File transport with rotation
const fileTransport = new DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
});

// Error file transport
const errorFileTransport = new DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '30d',
  format: logFormat,
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'clickview-backend',
    environment: process.env.NODE_ENV,
  },
  transports: [
    consoleTransport,
    fileTransport,
    errorFileTransport,
  ],
});

// Request logger
export const requestLogger = logger.child({ component: 'http' });

// Database logger
export const dbLogger = logger.child({ component: 'database' });
```

### ELK Stack (Optional)

```yaml
# monitoring/docker-compose.elk.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    ports:
      - "5044:5044"
      - "9600:9600"
    volumes:
      - ./monitoring/logstash/pipeline:/usr/share/logstash/pipeline
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

## Uptime Monitoring

### External Monitoring Services

1. **UptimeRobot** (Free tier available)
   - Monitor: https://clickview.yourdomain.com/health
   - Interval: 5 minutes
   - Alert channels: Email, SMS, Slack

2. **Pingdom**
   - Real user monitoring (RUM)
   - Page speed monitoring
   - Transaction monitoring

3. **StatusCake**
   - Uptime monitoring
   - SSL certificate monitoring
   - Domain monitoring

### Health Check Endpoints

```typescript
// backend/src/routes/health.ts
import { Router } from 'express';
import { pool } from '../config/database';
import { cacheService } from '../services/cache.service';

const router = Router();

// Basic health check
router.get('/health', async (req, res) => {
  try {
    // Check database
    await pool.query('SELECT 1');

    // Check Redis
    await cacheService.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Detailed health check
router.get('/health/detailed', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    disk: false,
    memory: false,
  };

  try {
    // Database check
    await pool.query('SELECT 1');
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  try {
    // Redis check
    await cacheService.ping();
    checks.redis = true;
  } catch (error) {
    console.error('Redis health check failed:', error);
  }

  // Memory check
  const memUsage = process.memoryUsage();
  checks.memory = memUsage.heapUsed / memUsage.heapTotal < 0.9; // < 90%

  const allHealthy = Object.values(checks).every(check => check === true);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
    },
    uptime: process.uptime(),
  });
});

export default router;
```

## Alerting Rules

### Prometheus Alert Rules

```yaml
# monitoring/prometheus/alerts.yml
groups:
  - name: clickview_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"

      # Slow response time
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time detected"
          description: "95th percentile response time is {{ $value }}s (threshold: 2s)"

      # High CPU usage
      - alert: HighCPUUsage
        expr: |
          100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is {{ $value | humanize }}% (threshold: 80%)"

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value | humanizePercentage }} (threshold: 85%)"

      # Database connection pool exhaustion
      - alert: DatabaseConnectionPoolExhaustion
        expr: |
          pg_stat_database_numbackends / pg_settings_max_connections > 0.8
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "Connection pool usage is {{ $value | humanizePercentage }} (threshold: 80%)"

      # Application down
      - alert: ApplicationDown
        expr: up{job="clickview-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "ClickView application is down"
          description: "The application has been down for more than 1 minute"

      # SSL certificate expiring
      - alert: SSLCertificateExpiringSoon
        expr: |
          (ssl_cert_not_after - time()) / 86400 < 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SSL certificate expiring soon"
          description: "SSL certificate expires in {{ $value }} days"

      # Disk space low
      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.15
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Disk space running low"
          description: "Available disk space is {{ $value | humanizePercentage }} (threshold: 15%)"
```

### AlertManager Configuration

```yaml
# monitoring/alertmanager/config.yml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@clickview.com'
  smtp_auth_username: 'alerts@clickview.com'
  smtp_auth_password: 'your-password'

# Alert routing
route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

  routes:
    # Critical alerts go to PagerDuty
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true

    # Warning alerts go to Slack
    - match:
        severity: warning
      receiver: 'slack'

receivers:
  - name: 'default'
    email_configs:
      - to: 'team@clickview.com'
        headers:
          Subject: '[ClickView] Alert: {{ .GroupLabels.alertname }}'

  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        title: 'ClickView Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        description: '{{ .GroupLabels.alertname }}: {{ .GroupLabels.instance }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

## Alert Channels

### Slack Integration

```bash
# Create Slack webhook
# Go to https://api.slack.com/messaging/webhooks
# Create a new webhook URL
# Add to alertmanager config
```

### PagerDuty Integration

```bash
# 1. Create PagerDuty service
# 2. Get integration key
# 3. Add to alertmanager config
```

### Email Alerts

Configure SMTP in AlertManager config (shown above).

## Performance Monitoring

### Application Performance Monitoring (APM)

#### New Relic

```typescript
// backend/src/config/newrelic.ts
import newrelic from 'newrelic';

export function initNewRelic() {
  if (process.env.NEW_RELIC_LICENSE_KEY) {
    newrelic.instrumentLoadedModule(
      'express',
      require('express')
    );
  }
}
```

#### Datadog

```typescript
// backend/src/config/datadog.ts
import tracer from 'dd-trace';

export function initDatadog() {
  if (process.env.DD_API_KEY) {
    tracer.init({
      service: 'clickview-backend',
      env: process.env.NODE_ENV,
      analytics: true,
    });
  }
}
```

## Best Practices

### 1. Golden Signals

Monitor these four key metrics:
- **Latency**: Response time
- **Traffic**: Requests per second
- **Errors**: Error rate
- **Saturation**: Resource utilization

### 2. Alert Fatigue Prevention

- Set appropriate thresholds
- Use proper alert severity levels
- Implement alert grouping and deduplication
- Add runbooks to alerts
- Regular alert review and tuning

### 3. Retention Policies

- **Metrics**: 15 days (Prometheus)
- **Logs**: 90 days (compliance requirement)
- **Traces**: 7 days
- **Backups**: 30 days

### 4. Dashboard Design

- One dashboard per service
- Group related metrics
- Use consistent color schemes
- Add annotations for deployments
- Include SLA targets

### 5. On-Call Best Practices

- Rotate on-call duties
- Document escalation procedures
- Maintain runbooks for common issues
- Post-incident reviews
- Blameless culture

### 6. Security Monitoring

- Failed authentication attempts
- Privilege escalation attempts
- Data access patterns
- API rate limit violations
- SSL certificate expiration

## Quick Start

### Deploy Monitoring Stack

```bash
# Start Prometheus + Grafana
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# Access Grafana
open http://localhost:3002
# Login: admin / admin

# Access Prometheus
open http://localhost:9090

# Access AlertManager
open http://localhost:9093
```

### View Metrics

```bash
# Check metrics endpoint
curl http://localhost:3001/metrics

# Query Prometheus
curl 'http://localhost:9090/api/v1/query?query=up'
```

### Test Alerts

```bash
# Trigger test alert
curl -X POST http://localhost:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '[{
    "labels": {"alertname": "Test", "severity": "warning"},
    "annotations": {"summary": "Test alert"}
  }]'
```

## Troubleshooting

### Metrics Not Appearing

1. Check backend is exposing /metrics
2. Verify Prometheus can reach backend
3. Check Prometheus targets: http://localhost:9090/targets
4. Review Prometheus logs

### Alerts Not Firing

1. Verify alert rules are loaded in Prometheus
2. Check AlertManager is reachable
3. Review AlertManager logs
4. Test webhook URLs

### Grafana Dashboard Issues

1. Verify Prometheus datasource is configured
2. Check query syntax
3. Ensure metrics exist in Prometheus
4. Review browser console for errors

---

For more information:
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Sentry Documentation](https://docs.sentry.io/)
