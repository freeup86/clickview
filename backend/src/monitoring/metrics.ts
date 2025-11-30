/**
 * Application Metrics Collection
 *
 * Production-ready metrics collection for monitoring application health,
 * performance, and business KPIs.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

// Metric types
interface Counter {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
}

interface Gauge {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
}

interface Histogram {
  name: string;
  values: number[];
  labels: Record<string, string>;
  count: number;
  sum: number;
  buckets: Record<number, number>;
}

// Metric storage
class MetricsRegistry {
  private counters: Map<string, Counter> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private startTime: Date = new Date();

  // Default histogram buckets for response times (ms)
  private defaultBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

  /**
   * Increment a counter
   */
  incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const key = this.getKey(name, labels);
    const existing = this.counters.get(key);

    if (existing) {
      existing.value += value;
      existing.timestamp = new Date();
    } else {
      this.counters.set(key, {
        name,
        value,
        labels,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getKey(name, labels);
    this.gauges.set(key, {
      name,
      value,
      labels,
      timestamp: new Date(),
    });
  }

  /**
   * Record a histogram observation
   */
  observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getKey(name, labels);
    let histogram = this.histograms.get(key);

    if (!histogram) {
      histogram = {
        name,
        values: [],
        labels,
        count: 0,
        sum: 0,
        buckets: {},
      };
      // Initialize buckets
      for (const bucket of this.defaultBuckets) {
        histogram.buckets[bucket] = 0;
      }
      histogram.buckets[Infinity] = 0;
      this.histograms.set(key, histogram);
    }

    histogram.values.push(value);
    histogram.count++;
    histogram.sum += value;

    // Update buckets
    for (const bucket of this.defaultBuckets) {
      if (value <= bucket) {
        histogram.buckets[bucket]++;
      }
    }
    histogram.buckets[Infinity]++;

    // Keep only last 1000 values for percentile calculations
    if (histogram.values.length > 1000) {
      histogram.values = histogram.values.slice(-1000);
    }
  }

  /**
   * Get all metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    // Uptime
    const uptimeSeconds = (Date.now() - this.startTime.getTime()) / 1000;
    lines.push(`# HELP process_uptime_seconds Process uptime in seconds`);
    lines.push(`# TYPE process_uptime_seconds gauge`);
    lines.push(`process_uptime_seconds ${uptimeSeconds}`);

    // Memory usage
    const memUsage = process.memoryUsage();
    lines.push(`# HELP process_memory_bytes Process memory usage`);
    lines.push(`# TYPE process_memory_bytes gauge`);
    lines.push(`process_memory_bytes{type="heapUsed"} ${memUsage.heapUsed}`);
    lines.push(`process_memory_bytes{type="heapTotal"} ${memUsage.heapTotal}`);
    lines.push(`process_memory_bytes{type="rss"} ${memUsage.rss}`);
    lines.push(`process_memory_bytes{type="external"} ${memUsage.external}`);

    // Counters
    for (const counter of this.counters.values()) {
      const labelStr = this.formatLabels(counter.labels);
      lines.push(`# HELP ${counter.name} Counter metric`);
      lines.push(`# TYPE ${counter.name} counter`);
      lines.push(`${counter.name}${labelStr} ${counter.value}`);
    }

    // Gauges
    for (const gauge of this.gauges.values()) {
      const labelStr = this.formatLabels(gauge.labels);
      lines.push(`# HELP ${gauge.name} Gauge metric`);
      lines.push(`# TYPE ${gauge.name} gauge`);
      lines.push(`${gauge.name}${labelStr} ${gauge.value}`);
    }

    // Histograms
    for (const histogram of this.histograms.values()) {
      const labelStr = this.formatLabels(histogram.labels);
      lines.push(`# HELP ${histogram.name} Histogram metric`);
      lines.push(`# TYPE ${histogram.name} histogram`);

      // Buckets
      let cumulative = 0;
      for (const bucket of [...this.defaultBuckets, Infinity]) {
        cumulative += histogram.buckets[bucket] || 0;
        const le = bucket === Infinity ? '+Inf' : bucket.toString();
        const bucketLabels = { ...histogram.labels, le };
        lines.push(`${histogram.name}_bucket${this.formatLabels(bucketLabels)} ${cumulative}`);
      }

      lines.push(`${histogram.name}_sum${labelStr} ${histogram.sum}`);
      lines.push(`${histogram.name}_count${labelStr} ${histogram.count}`);
    }

    return lines.join('\n');
  }

  /**
   * Get metrics as JSON for dashboards
   */
  getJsonMetrics(): Record<string, any> {
    return {
      uptime: (Date.now() - this.startTime.getTime()) / 1000,
      memory: process.memoryUsage(),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, h]) => [
          key,
          {
            ...h,
            percentiles: this.calculatePercentiles(h.values),
          },
        ])
      ),
    };
  }

  /**
   * Calculate percentiles from values array
   */
  private calculatePercentiles(values: number[]): Record<string, number> {
    if (values.length === 0) return {};

    const sorted = [...values].sort((a, b) => a - b);
    const percentiles = [50, 90, 95, 99];
    const result: Record<string, number> = {};

    for (const p of percentiles) {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      result[`p${p}`] = sorted[Math.max(0, index)];
    }

    return result;
  }

  private getKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  private formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';
    return '{' + entries.map(([k, v]) => `${k}="${v}"`).join(',') + '}';
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.startTime = new Date();
  }
}

// Singleton instance
export const metricsRegistry = new MetricsRegistry();

/**
 * Middleware to collect HTTP request metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const path = req.route?.path || req.path;
  const method = req.method;

  // Track active requests
  metricsRegistry.setGauge('http_requests_active', 1, { method, path });

  // On response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode.toString();
    const labels = { method, path, status: statusCode };

    // Request counter
    metricsRegistry.incrementCounter('http_requests_total', labels);

    // Request duration histogram
    metricsRegistry.observeHistogram('http_request_duration_ms', duration, {
      method,
      path,
    });

    // Error tracking
    if (res.statusCode >= 400) {
      metricsRegistry.incrementCounter('http_errors_total', labels);
    }

    // Response size
    const contentLength = res.get('content-length');
    if (contentLength) {
      metricsRegistry.observeHistogram(
        'http_response_size_bytes',
        parseInt(contentLength, 10),
        { method, path }
      );
    }
  });

  next();
}

/**
 * Business metrics helpers
 */
export const businessMetrics = {
  /**
   * Track dashboard view
   */
  trackDashboardView(dashboardId: string, userId?: string): void {
    metricsRegistry.incrementCounter('dashboard_views_total', {
      dashboard_id: dashboardId,
      authenticated: userId ? 'true' : 'false',
    });
  },

  /**
   * Track report generation
   */
  trackReportGeneration(format: string, duration: number): void {
    metricsRegistry.incrementCounter('reports_generated_total', { format });
    metricsRegistry.observeHistogram('report_generation_duration_ms', duration, { format });
  },

  /**
   * Track API call to ClickUp
   */
  trackClickUpApiCall(endpoint: string, success: boolean, duration: number): void {
    metricsRegistry.incrementCounter('clickup_api_calls_total', {
      endpoint,
      success: success.toString(),
    });
    metricsRegistry.observeHistogram('clickup_api_duration_ms', duration, { endpoint });
  },

  /**
   * Track cache performance
   */
  trackCacheHit(hit: boolean, cacheType: string): void {
    metricsRegistry.incrementCounter('cache_requests_total', {
      type: cacheType,
      result: hit ? 'hit' : 'miss',
    });
  },

  /**
   * Track database query
   */
  trackDatabaseQuery(query: string, duration: number): void {
    // Extract query type (SELECT, INSERT, UPDATE, DELETE)
    const queryType = query.trim().split(' ')[0].toUpperCase();
    metricsRegistry.observeHistogram('database_query_duration_ms', duration, {
      type: queryType,
    });
  },

  /**
   * Track WebSocket connections
   */
  trackWebSocketConnection(action: 'connect' | 'disconnect'): void {
    if (action === 'connect') {
      metricsRegistry.incrementCounter('websocket_connections_total', {});
    }
    // The gauge for active connections should be updated by socket.io events
  },

  /**
   * Track user actions
   */
  trackUserAction(action: string, userId: string): void {
    metricsRegistry.incrementCounter('user_actions_total', { action });
  },
};

export default {
  metricsRegistry,
  metricsMiddleware,
  businessMetrics,
};
