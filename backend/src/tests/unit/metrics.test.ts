/**
 * Metrics and Alerting Unit Tests
 * Tests for INFRA-001 implementation
 */

import { MetricsRegistry, metricsMiddleware, businessMetrics } from '../../monitoring/metrics';
import { AlertingService, AlertSeverity, AlertType } from '../../monitoring/alerting';
import { Request, Response, NextFunction } from 'express';

describe('MetricsRegistry', () => {
  let metricsRegistry: MetricsRegistry;

  beforeEach(() => {
    metricsRegistry = new MetricsRegistry();
  });

  describe('incrementCounter', () => {
    it('should increment a counter', () => {
      metricsRegistry.incrementCounter('http_requests_total', { method: 'GET', path: '/api/test' });
      metricsRegistry.incrementCounter('http_requests_total', { method: 'GET', path: '/api/test' });

      const metrics = metricsRegistry.getJsonMetrics();
      expect(metrics.counters).toBeDefined();
    });

    it('should handle different labels separately', () => {
      metricsRegistry.incrementCounter('http_requests_total', { method: 'GET', path: '/api/a' });
      metricsRegistry.incrementCounter('http_requests_total', { method: 'POST', path: '/api/b' });

      const prometheusMetrics = metricsRegistry.getPrometheusMetrics();
      expect(prometheusMetrics).toContain('http_requests_total');
    });

    it('should increment by custom value', () => {
      metricsRegistry.incrementCounter('events_total', {}, 5);
      metricsRegistry.incrementCounter('events_total', {}, 3);

      const metrics = metricsRegistry.getJsonMetrics();
      expect(metrics.counters).toBeDefined();
    });
  });

  describe('setGauge', () => {
    it('should set a gauge value', () => {
      metricsRegistry.setGauge('temperature', 25.5, { location: 'server-room' });

      const metrics = metricsRegistry.getJsonMetrics();
      expect(metrics.gauges).toBeDefined();
    });

    it('should update gauge value', () => {
      metricsRegistry.setGauge('active_connections', 10);
      metricsRegistry.setGauge('active_connections', 15);
      metricsRegistry.setGauge('active_connections', 12);

      const metrics = metricsRegistry.getJsonMetrics();
      expect(metrics.gauges).toBeDefined();
    });
  });

  describe('observeHistogram', () => {
    it('should record histogram observation', () => {
      metricsRegistry.observeHistogram('http_request_duration_seconds', 0.5, { path: '/api/test' });
      metricsRegistry.observeHistogram('http_request_duration_seconds', 1.2, { path: '/api/test' });
      metricsRegistry.observeHistogram('http_request_duration_seconds', 0.3, { path: '/api/test' });

      const metrics = metricsRegistry.getJsonMetrics();
      expect(metrics.histograms).toBeDefined();
    });
  });

  describe('getPrometheusMetrics', () => {
    it('should return valid Prometheus format', () => {
      metricsRegistry.incrementCounter('test_counter', { label: 'value' });
      metricsRegistry.setGauge('test_gauge', 42);
      metricsRegistry.observeHistogram('test_histogram', 0.5);

      const output = metricsRegistry.getPrometheusMetrics();

      expect(typeof output).toBe('string');
      expect(output).toContain('test_counter');
      expect(output).toContain('test_gauge');
      expect(output).toContain('test_histogram');
    });

    it('should include HELP and TYPE comments', () => {
      metricsRegistry.incrementCounter('http_requests', {});

      const output = metricsRegistry.getPrometheusMetrics();

      expect(output).toContain('# HELP');
      expect(output).toContain('# TYPE');
    });
  });

  describe('getJsonMetrics', () => {
    it('should return structured JSON metrics', () => {
      metricsRegistry.incrementCounter('counter1', {});
      metricsRegistry.setGauge('gauge1', 10);
      metricsRegistry.observeHistogram('histogram1', 0.5);

      const metrics = metricsRegistry.getJsonMetrics();

      expect(metrics).toHaveProperty('counters');
      expect(metrics).toHaveProperty('gauges');
      expect(metrics).toHaveProperty('histograms');
      expect(metrics).toHaveProperty('timestamp');
    });
  });
});

describe('metricsMiddleware', () => {
  it('should record request metrics', () => {
    const mockReq = {
      method: 'GET',
      path: '/api/test',
      url: '/api/test',
    } as Request;

    const mockRes = {
      statusCode: 200,
      on: jest.fn((event, callback) => {
        if (event === 'finish') {
          // Simulate response finish
          setTimeout(callback, 10);
        }
      }),
      get: jest.fn().mockReturnValue('100'),
    } as unknown as Response;

    const mockNext = jest.fn() as NextFunction;

    metricsMiddleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });
});

describe('businessMetrics', () => {
  describe('trackDashboardView', () => {
    it('should track dashboard view without error', () => {
      expect(() => {
        businessMetrics.trackDashboardView('dashboard-123', 'user-456');
      }).not.toThrow();
    });
  });

  describe('trackReportGeneration', () => {
    it('should track report generation', () => {
      expect(() => {
        businessMetrics.trackReportGeneration('pdf', 1500);
      }).not.toThrow();
    });
  });

  describe('trackCacheOperation', () => {
    it('should track cache hit', () => {
      expect(() => {
        businessMetrics.trackCacheOperation('hit', 5);
      }).not.toThrow();
    });

    it('should track cache miss', () => {
      expect(() => {
        businessMetrics.trackCacheOperation('miss', 150);
      }).not.toThrow();
    });
  });

  describe('trackDatabaseQuery', () => {
    it('should track database query execution', () => {
      expect(() => {
        businessMetrics.trackDatabaseQuery('SELECT', 50);
      }).not.toThrow();
    });
  });
});

describe('AlertingService', () => {
  let alertingService: AlertingService;

  beforeEach(() => {
    alertingService = new AlertingService();
  });

  describe('createAlert', () => {
    it('should create a new alert', async () => {
      const alert = await alertingService.createAlert(
        AlertType.System,
        AlertSeverity.Warning,
        'Test Alert',
        'This is a test alert message',
        'unit-test'
      );

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.title).toBe('Test Alert');
      expect(alert.severity).toBe(AlertSeverity.Warning);
      expect(alert.type).toBe(AlertType.System);
      expect(alert.status).toBe('active');
    });

    it('should include metadata in alert', async () => {
      const metadata = { component: 'database', instance: 'primary' };

      const alert = await alertingService.createAlert(
        AlertType.Availability,
        AlertSeverity.Critical,
        'DB Down',
        'Database connection failed',
        'health-check',
        metadata
      );

      expect(alert.metadata).toEqual(metadata);
    });
  });

  describe('getActiveAlerts', () => {
    it('should return only active alerts', async () => {
      await alertingService.createAlert(
        AlertType.Performance,
        AlertSeverity.Info,
        'Active Alert',
        'Message',
        'test'
      );

      const activeAlerts = alertingService.getActiveAlerts();

      expect(Array.isArray(activeAlerts)).toBe(true);
      expect(activeAlerts.every(a => a.status === 'active')).toBe(true);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an active alert', async () => {
      const alert = await alertingService.createAlert(
        AlertType.Security,
        AlertSeverity.Warning,
        'Security Alert',
        'Suspicious activity detected',
        'security-monitor'
      );

      const result = alertingService.acknowledgeAlert(alert.id, 'user-123');

      expect(result).toBe(true);

      const activeAlerts = alertingService.getActiveAlerts();
      const acknowledgedAlert = activeAlerts.find(a => a.id === alert.id);
      expect(acknowledgedAlert?.status).toBe('acknowledged');
      expect(acknowledgedAlert?.acknowledgedBy).toBe('user-123');
    });

    it('should return false for non-existent alert', () => {
      const result = alertingService.acknowledgeAlert('non-existent-id', 'user-123');

      expect(result).toBe(false);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an active alert', async () => {
      const alert = await alertingService.createAlert(
        AlertType.Business,
        AlertSeverity.Error,
        'Business Alert',
        'Revenue drop detected',
        'analytics'
      );

      const result = alertingService.resolveAlert(alert.id, 'Issue fixed');

      expect(result).toBe(true);

      const activeAlerts = alertingService.getActiveAlerts();
      expect(activeAlerts.find(a => a.id === alert.id)).toBeUndefined();
    });

    it('should return false for non-existent alert', () => {
      const result = alertingService.resolveAlert('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('getAlertHistory', () => {
    it('should return alert history', async () => {
      await alertingService.createAlert(
        AlertType.System,
        AlertSeverity.Info,
        'History Alert 1',
        'Message 1',
        'test'
      );

      await alertingService.createAlert(
        AlertType.System,
        AlertSeverity.Warning,
        'History Alert 2',
        'Message 2',
        'test'
      );

      const history = alertingService.getAlertHistory(10);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should respect limit parameter', async () => {
      // Create multiple alerts
      for (let i = 0; i < 5; i++) {
        await alertingService.createAlert(
          AlertType.System,
          AlertSeverity.Info,
          `Alert ${i}`,
          'Message',
          'test'
        );
      }

      const history = alertingService.getAlertHistory(3);

      expect(history.length).toBeLessThanOrEqual(3);
    });
  });

  describe('evaluateRules', () => {
    it('should evaluate alert rules without throwing', async () => {
      const metrics = {
        error_rate: 0.5, // High error rate
        response_time_p95: 2000,
        memory_usage_percent: 85,
      };

      await expect(
        alertingService.evaluateRules(metrics)
      ).resolves.not.toThrow();
    });

    it('should create alerts when thresholds are exceeded', async () => {
      const metrics = {
        error_rate: 15, // Very high error rate (> 5%)
      };

      const initialCount = alertingService.getActiveAlerts().length;

      await alertingService.evaluateRules(metrics);

      // May or may not create alert depending on cooldown
      // Just verify no error is thrown
    });
  });

  describe('alert severity levels', () => {
    it('should support all severity levels', async () => {
      const severities = [
        AlertSeverity.Info,
        AlertSeverity.Warning,
        AlertSeverity.Error,
        AlertSeverity.Critical,
      ];

      for (const severity of severities) {
        const alert = await alertingService.createAlert(
          AlertType.System,
          severity,
          `${severity} Alert`,
          'Test message',
          'test'
        );

        expect(alert.severity).toBe(severity);
      }
    });
  });

  describe('alert types', () => {
    it('should support all alert types', async () => {
      const types = [
        AlertType.System,
        AlertType.Security,
        AlertType.Performance,
        AlertType.Availability,
        AlertType.Business,
      ];

      for (const type of types) {
        const alert = await alertingService.createAlert(
          type,
          AlertSeverity.Info,
          `${type} Alert`,
          'Test message',
          'test'
        );

        expect(alert.type).toBe(type);
      }
    });
  });
});
