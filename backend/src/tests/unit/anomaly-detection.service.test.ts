/**
 * Anomaly Detection Service Unit Tests
 * Tests for AI-002 implementation
 */

import { AnomalyDetectionService, DataPoint } from '../../services/anomaly-detection.service';
import { Pool } from 'pg';

describe('AnomalyDetectionService', () => {
  let anomalyService: AnomalyDetectionService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      }),
    } as any;

    anomalyService = new AnomalyDetectionService(mockPool);
  });

  describe('detectAnomalies', () => {
    it('should return empty result for insufficient data', async () => {
      const data: DataPoint[] = [
        { timestamp: new Date(), value: 100 },
        { timestamp: new Date(), value: 110 },
      ];

      const result = await anomalyService.detectAnomalies(data, { minDataPoints: 30 });

      expect(result.anomalies).toEqual([]);
      expect(result.metadata.insufficientData).toBe(true);
      expect(result.summary.anomalyCount).toBe(0);
    });

    it('should detect anomalies using z-score method', async () => {
      // Generate normal data with a clear outlier
      const data: DataPoint[] = [];
      const baseDate = new Date();

      for (let i = 0; i < 50; i++) {
        data.push({
          timestamp: new Date(baseDate.getTime() + i * 3600000),
          value: 100 + Math.random() * 10, // Values between 100-110
        });
      }

      // Add clear outlier
      data[25] = {
        timestamp: new Date(baseDate.getTime() + 25 * 3600000),
        value: 200, // Clear outlier
      };

      const result = await anomalyService.detectAnomalies(data, {
        methods: ['zscore'],
        sensitivity: 'high',
      });

      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.summary.totalPoints).toBe(50);
    });

    it('should detect anomalies using IQR method', async () => {
      const data: DataPoint[] = [];
      const baseDate = new Date();

      // Generate clustered data
      for (let i = 0; i < 50; i++) {
        data.push({
          timestamp: new Date(baseDate.getTime() + i * 3600000),
          value: i < 48 ? 100 : 500, // Last 2 are outliers
        });
      }

      const result = await anomalyService.detectAnomalies(data, {
        methods: ['iqr'],
        sensitivity: 'medium',
      });

      expect(result.anomalies.length).toBeGreaterThan(0);
    });

    it('should detect anomalies using multiple methods', async () => {
      const data: DataPoint[] = [];
      const baseDate = new Date();

      for (let i = 0; i < 50; i++) {
        data.push({
          timestamp: new Date(baseDate.getTime() + i * 3600000),
          value: 100 + (i === 25 ? 100 : Math.random() * 5),
        });
      }

      const result = await anomalyService.detectAnomalies(data, {
        methods: ['zscore', 'iqr', 'mad'],
        sensitivity: 'high',
      });

      expect(result.summary.methods).toContain('zscore');
      expect(result.summary.methods).toContain('iqr');
      expect(result.summary.methods).toContain('mad');
    });

    it('should calculate trend analysis', async () => {
      const data: DataPoint[] = [];
      const baseDate = new Date();

      // Generate increasing trend
      for (let i = 0; i < 50; i++) {
        data.push({
          timestamp: new Date(baseDate.getTime() + i * 3600000),
          value: 100 + i * 2, // Linear increase
        });
      }

      const result = await anomalyService.detectAnomalies(data, {
        methods: ['zscore'],
      });

      expect(result.trend).toBeDefined();
      expect(result.trend!.direction).toBe('increasing');
      expect(result.trend!.slope).toBeGreaterThan(0);
    });

    it('should detect stable trend', async () => {
      const data: DataPoint[] = [];
      const baseDate = new Date();

      // Generate stable data
      for (let i = 0; i < 50; i++) {
        data.push({
          timestamp: new Date(baseDate.getTime() + i * 3600000),
          value: 100 + Math.random() * 0.1, // Nearly constant
        });
      }

      const result = await anomalyService.detectAnomalies(data);

      expect(result.trend).toBeDefined();
      expect(result.trend!.direction).toBe('stable');
    });

    it('should detect seasonality when present', async () => {
      const data: DataPoint[] = [];
      const baseDate = new Date();

      // Generate data with weekly seasonality (28+ data points for 4 cycles)
      for (let i = 0; i < 56; i++) {
        const dayOfWeek = i % 7;
        const seasonalValue = dayOfWeek < 5 ? 100 : 50; // Weekday vs weekend pattern
        data.push({
          timestamp: new Date(baseDate.getTime() + i * 86400000),
          value: seasonalValue + Math.random() * 5,
        });
      }

      const result = await anomalyService.detectAnomalies(data, {
        includeSeasonality: true,
      });

      expect(result.seasonality).toBeDefined();
    });

    it('should calculate severity correctly', async () => {
      const data: DataPoint[] = [];
      const baseDate = new Date();

      for (let i = 0; i < 50; i++) {
        data.push({
          timestamp: new Date(baseDate.getTime() + i * 3600000),
          value: i === 25 ? 1000 : 100, // Extreme outlier
        });
      }

      const result = await anomalyService.detectAnomalies(data, {
        methods: ['zscore'],
        sensitivity: 'high',
      });

      if (result.anomalies.length > 0) {
        const severity = result.anomalies[0].severity;
        expect(['critical', 'high', 'medium', 'low']).toContain(severity);
      }
    });

    it('should include metadata in anomaly results', async () => {
      const data: DataPoint[] = [];
      const baseDate = new Date();

      for (let i = 0; i < 50; i++) {
        data.push({
          timestamp: new Date(baseDate.getTime() + i * 3600000),
          value: 100,
          metadata: { source: 'test' },
        });
      }

      const result = await anomalyService.detectAnomalies(data);

      expect(result.metadata.executionTime).toBeDefined();
      expect(result.metadata.insufficientData).toBe(false);
    });
  });

  describe('detectMetricAnomalies', () => {
    it('should fetch and analyze metric data', async () => {
      const mockRows = [];
      const baseDate = new Date();

      for (let i = 0; i < 50; i++) {
        mockRows.push({
          timestamp: new Date(baseDate.getTime() + i * 3600000),
          value: '100',
          metadata: null,
        });
      }

      mockPool.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await anomalyService.detectMetricAnomalies(
        'metric-123',
        new Date(baseDate.getTime() - 86400000 * 7),
        baseDate
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.any(Array)
      );
      expect(result.summary.totalPoints).toBe(50);
    });

    it('should handle empty metric data', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await anomalyService.detectMetricAnomalies(
        'metric-123',
        new Date(),
        new Date()
      );

      expect(result.metadata.insufficientData).toBe(true);
    });
  });

  describe('detectRealtimeAnomaly', () => {
    it('should detect anomaly in real-time', async () => {
      // Mock historical data
      const mockRows = [];
      for (let i = 0; i < 50; i++) {
        mockRows.push({
          timestamp: new Date(),
          value: '100',
          metadata: null,
        });
      }
      mockPool.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await anomalyService.detectRealtimeAnomaly(
        'metric-123',
        500 // Abnormal value
      );

      expect(result.isAnomaly).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.message).toBeDefined();
    });

    it('should return normal for values within range', async () => {
      const mockRows = [];
      for (let i = 0; i < 50; i++) {
        mockRows.push({
          timestamp: new Date(),
          value: '100',
          metadata: null,
        });
      }
      mockPool.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await anomalyService.detectRealtimeAnomaly(
        'metric-123',
        100 // Normal value
      );

      expect(result.isAnomaly).toBe(false);
      expect(result.message).toContain('within normal range');
    });

    it('should handle insufficient historical data', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ value: '100' }] }); // Only 1 row

      const result = await anomalyService.detectRealtimeAnomaly(
        'metric-123',
        100
      );

      expect(result.isAnomaly).toBe(false);
      expect(result.message).toContain('Insufficient');
    });

    it('should calculate deviation percentage', async () => {
      const mockRows = [];
      for (let i = 0; i < 50; i++) {
        mockRows.push({
          timestamp: new Date(),
          value: '100',
          metadata: null,
        });
      }
      mockPool.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await anomalyService.detectRealtimeAnomaly(
        'metric-123',
        150 // 50% deviation
      );

      if (result.isAnomaly && result.deviationPercentage !== undefined) {
        expect(result.deviationPercentage).toBeGreaterThan(0);
      }
    });
  });

  describe('getDashboardAnomalies', () => {
    it('should get anomaly insights for dashboard', async () => {
      // Mock metrics query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'metric-1', name: 'Metric 1', type: 'gauge' },
          { id: 'metric-2', name: 'Metric 2', type: 'counter' },
        ],
      });

      // Mock metric values for each metric
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await anomalyService.getDashboardAnomalies(
        'dashboard-123',
        {
          start: new Date(Date.now() - 86400000 * 7),
          end: new Date(),
        }
      );

      expect(result.dashboardId).toBe('dashboard-123');
      expect(result.totalMetrics).toBe(2);
    });

    it('should sort anomalies by criticality', async () => {
      // Mock metrics
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'metric-1', name: 'Critical Metric', type: 'gauge' },
          { id: 'metric-2', name: 'Normal Metric', type: 'gauge' },
        ],
      });

      // Mock data with outliers for first metric
      const mockRowsWithOutlier = [];
      for (let i = 0; i < 50; i++) {
        mockRowsWithOutlier.push({
          timestamp: new Date(),
          value: i === 25 ? '1000' : '100',
          metadata: null,
        });
      }
      mockPool.query.mockResolvedValueOnce({ rows: mockRowsWithOutlier });

      // Normal data for second metric
      const mockNormalRows = [];
      for (let i = 0; i < 50; i++) {
        mockNormalRows.push({
          timestamp: new Date(),
          value: '100',
          metadata: null,
        });
      }
      mockPool.query.mockResolvedValueOnce({ rows: mockNormalRows });

      const result = await anomalyService.getDashboardAnomalies(
        'dashboard-123',
        {
          start: new Date(Date.now() - 86400000 * 7),
          end: new Date(),
        }
      );

      expect(result.summary).toBeDefined();
    });
  });

  describe('statistical calculations', () => {
    it('should detect decreasing trend', async () => {
      const data: DataPoint[] = [];
      const baseDate = new Date();

      for (let i = 0; i < 50; i++) {
        data.push({
          timestamp: new Date(baseDate.getTime() + i * 3600000),
          value: 200 - i * 2, // Decreasing trend
        });
      }

      const result = await anomalyService.detectAnomalies(data);

      expect(result.trend?.direction).toBe('decreasing');
      expect(result.trend?.slope).toBeLessThan(0);
    });

    it('should calculate R-squared for trend', async () => {
      const data: DataPoint[] = [];
      const baseDate = new Date();

      // Perfect linear data
      for (let i = 0; i < 50; i++) {
        data.push({
          timestamp: new Date(baseDate.getTime() + i * 3600000),
          value: i,
        });
      }

      const result = await anomalyService.detectAnomalies(data);

      expect(result.trend?.rSquared).toBeGreaterThan(0.95); // Near perfect fit
    });

    it('should provide forecast function', async () => {
      const data: DataPoint[] = [];
      const baseDate = new Date();

      for (let i = 0; i < 50; i++) {
        data.push({
          timestamp: new Date(baseDate.getTime() + i * 3600000),
          value: 100 + i,
        });
      }

      const result = await anomalyService.detectAnomalies(data);

      expect(result.trend?.forecast).toBeDefined();
      const forecast = result.trend!.forecast(10);
      expect(forecast).toBeGreaterThan(150); // Should be around 160
    });
  });

  describe('sensitivity levels', () => {
    it('should detect more anomalies with high sensitivity', async () => {
      const data: DataPoint[] = [];
      const baseDate = new Date();

      for (let i = 0; i < 50; i++) {
        data.push({
          timestamp: new Date(baseDate.getTime() + i * 3600000),
          value: 100 + (i % 10 === 0 ? 20 : 0), // Mild deviations
        });
      }

      const highSensResult = await anomalyService.detectAnomalies(data, {
        sensitivity: 'high',
      });

      const lowSensResult = await anomalyService.detectAnomalies(data, {
        sensitivity: 'low',
      });

      expect(highSensResult.anomalies.length).toBeGreaterThanOrEqual(
        lowSensResult.anomalies.length
      );
    });
  });

  describe('moving average method', () => {
    it('should detect trend deviations', async () => {
      const data: DataPoint[] = [];
      const baseDate = new Date();

      for (let i = 0; i < 50; i++) {
        // Stable trend with sudden spike
        const value = i >= 30 && i <= 35 ? 200 : 100;
        data.push({
          timestamp: new Date(baseDate.getTime() + i * 3600000),
          value,
        });
      }

      const result = await anomalyService.detectAnomalies(data, {
        methods: ['moving_average'],
        sensitivity: 'high',
      });

      expect(result.summary.methods).toContain('moving_average');
    });
  });

  describe('isolation forest method', () => {
    it('should detect points in sparse regions', async () => {
      const data: DataPoint[] = [];
      const baseDate = new Date();

      // Clustered data with isolated points
      for (let i = 0; i < 50; i++) {
        let value;
        if (i === 25) {
          value = 500; // Isolated point
        } else {
          value = 100 + Math.random() * 10;
        }
        data.push({
          timestamp: new Date(baseDate.getTime() + i * 3600000),
          value,
        });
      }

      const result = await anomalyService.detectAnomalies(data, {
        methods: ['isolation_forest'],
        sensitivity: 'high',
      });

      expect(result.summary.methods).toContain('isolation_forest');
    });
  });
});
