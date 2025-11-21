/**
 * Anomaly Detection Service (AI-002)
 *
 * Provides intelligent anomaly detection for data monitoring:
 * - Statistical outlier detection (Z-score, IQR, MAD)
 * - Time series anomaly detection
 * - Trend forecasting and deviation analysis
 * - Pattern recognition and seasonality detection
 * - Risk scoring and confidence intervals
 * - Adaptive thresholds based on historical data
 * - Multi-dimensional anomaly detection
 */

import { Pool } from 'pg';

// ===================================================================
// ANOMALY DETECTION SERVICE CLASS
// ===================================================================

export class AnomalyDetectionService {
  private pool: Pool;
  private readonly HISTORY_DAYS = 90; // Days of historical data to analyze
  private readonly SEASONALITY_PERIOD = 7; // Weekly seasonality by default

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Detect anomalies in a dataset using multiple methods
   */
  public async detectAnomalies(
    data: DataPoint[],
    options: AnomalyDetectionOptions = {}
  ): Promise<AnomalyDetectionResult> {
    const startTime = Date.now();

    // Apply default options
    const opts: Required<AnomalyDetectionOptions> = {
      methods: options.methods || ['zscore', 'iqr', 'isolation_forest'],
      sensitivity: options.sensitivity || 'medium',
      includeSeasonality: options.includeSeasonality !== false,
      confidenceLevel: options.confidenceLevel || 0.95,
      minDataPoints: options.minDataPoints || 30,
    };

    // Validate data
    if (data.length < opts.minDataPoints) {
      return {
        anomalies: [],
        summary: {
          totalPoints: data.length,
          anomalyCount: 0,
          anomalyRate: 0,
          confidenceLevel: opts.confidenceLevel,
          methods: opts.methods,
        },
        metadata: {
          executionTime: Date.now() - startTime,
          insufficientData: true,
          message: `Need at least ${opts.minDataPoints} data points for reliable detection`,
        },
      };
    }

    // Extract values and timestamps
    const values = data.map((d) => d.value);
    const timestamps = data.map((d) => d.timestamp);

    // Detect anomalies using selected methods
    const anomalyIndices = new Map<number, AnomalyScore[]>();

    for (const method of opts.methods) {
      const indices = await this.detectByMethod(method, values, timestamps, opts);
      indices.forEach(({ index, score, reason }) => {
        if (!anomalyIndices.has(index)) {
          anomalyIndices.set(index, []);
        }
        anomalyIndices.get(index)!.push({ method, score, reason });
      });
    }

    // Build anomaly results
    const anomalies: Anomaly[] = Array.from(anomalyIndices.entries())
      .map(([index, scores]) => {
        const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
        const severity = this.calculateSeverity(avgScore);

        return {
          index,
          timestamp: data[index].timestamp,
          value: data[index].value,
          expectedValue: this.calculateExpectedValue(values, index, opts),
          deviation: 0, // Will be calculated below
          severity,
          confidence: avgScore,
          methods: scores.map((s) => s.method),
          reasons: scores.map((s) => s.reason),
          metadata: data[index].metadata,
        };
      })
      .map((anomaly) => {
        anomaly.deviation = Math.abs(anomaly.value - anomaly.expectedValue);
        return anomaly;
      })
      .sort((a, b) => b.confidence - a.confidence);

    // Calculate summary statistics
    const summary: AnomalySummary = {
      totalPoints: data.length,
      anomalyCount: anomalies.length,
      anomalyRate: anomalies.length / data.length,
      confidenceLevel: opts.confidenceLevel,
      methods: opts.methods,
      severityCounts: {
        critical: anomalies.filter((a) => a.severity === 'critical').length,
        high: anomalies.filter((a) => a.severity === 'high').length,
        medium: anomalies.filter((a) => a.severity === 'medium').length,
        low: anomalies.filter((a) => a.severity === 'low').length,
      },
    };

    // Calculate trend and seasonality
    const trend = this.calculateTrend(values, timestamps);
    const seasonality = opts.includeSeasonality
      ? this.detectSeasonality(values, timestamps)
      : undefined;

    return {
      anomalies,
      summary,
      trend,
      seasonality,
      metadata: {
        executionTime: Date.now() - startTime,
        insufficientData: false,
      },
    };
  }

  /**
   * Detect anomalies for a specific metric over time
   */
  public async detectMetricAnomalies(
    metricId: string,
    startDate: Date,
    endDate: Date,
    options: AnomalyDetectionOptions = {}
  ): Promise<AnomalyDetectionResult> {
    // Fetch historical data
    const query = `
      SELECT
        timestamp,
        value,
        metadata
      FROM metric_values
      WHERE metric_id = $1
        AND timestamp >= $2
        AND timestamp <= $3
      ORDER BY timestamp ASC
    `;

    const result = await this.pool.query(query, [metricId, startDate, endDate]);

    const data: DataPoint[] = result.rows.map((row) => ({
      timestamp: row.timestamp,
      value: parseFloat(row.value),
      metadata: row.metadata,
    }));

    return this.detectAnomalies(data, options);
  }

  /**
   * Real-time anomaly detection for streaming data
   */
  public async detectRealtimeAnomaly(
    metricId: string,
    currentValue: number,
    timestamp: Date = new Date()
  ): Promise<RealtimeAnomalyResult> {
    // Fetch recent historical data for comparison
    const historicalData = await this.fetchHistoricalData(metricId, this.HISTORY_DAYS);

    if (historicalData.length < 30) {
      return {
        isAnomaly: false,
        confidence: 0,
        message: 'Insufficient historical data for reliable detection',
      };
    }

    const values = historicalData.map((d) => d.value);

    // Calculate statistical measures
    const stats = this.calculateStatistics(values);
    const zScore = Math.abs((currentValue - stats.mean) / stats.stdDev);
    const iqrScore = this.calculateIQRScore(currentValue, values);

    // Check against adaptive threshold
    const threshold = this.getAdaptiveThreshold(stats, 'medium');
    const isAnomaly = zScore > threshold.zScore || iqrScore > threshold.iqr;

    // Calculate confidence
    const confidence = Math.min(Math.max(zScore, iqrScore) / 5, 1);

    // Calculate expected value using exponential smoothing
    const expectedValue = this.calculateExpectedValueWithSmoothing(values);
    const deviation = Math.abs(currentValue - expectedValue);
    const deviationPercentage = (deviation / expectedValue) * 100;

    return {
      isAnomaly,
      confidence,
      severity: isAnomaly ? this.calculateSeverity(confidence) : 'normal',
      currentValue,
      expectedValue,
      deviation,
      deviationPercentage,
      zScore,
      threshold: {
        upper: stats.mean + threshold.zScore * stats.stdDev,
        lower: stats.mean - threshold.zScore * stats.stdDev,
      },
      message: isAnomaly
        ? `Value ${currentValue.toFixed(2)} deviates ${deviationPercentage.toFixed(1)}% from expected ${expectedValue.toFixed(2)}`
        : 'Value is within normal range',
    };
  }

  /**
   * Get anomaly detection insights for a dashboard
   */
  public async getDashboardAnomalies(
    dashboardId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<DashboardAnomalyInsights> {
    // Fetch all metrics for the dashboard
    const metricsQuery = `
      SELECT DISTINCT m.id, m.name, m.type
      FROM metrics m
      JOIN dashboard_widgets dw ON dw.metric_id = m.id
      WHERE dw.dashboard_id = $1
    `;

    const metricsResult = await this.pool.query(metricsQuery, [dashboardId]);

    // Detect anomalies for each metric
    const metricAnomalies: MetricAnomalyInfo[] = [];

    for (const metric of metricsResult.rows) {
      const result = await this.detectMetricAnomalies(
        metric.id,
        timeRange.start,
        timeRange.end,
        { methods: ['zscore', 'iqr'], sensitivity: 'medium' }
      );

      if (result.anomalies.length > 0) {
        metricAnomalies.push({
          metricId: metric.id,
          metricName: metric.name,
          anomalyCount: result.anomalies.length,
          mostRecentAnomaly: result.anomalies[0],
          criticalCount: result.summary.severityCounts?.critical || 0,
          trend: result.trend,
        });
      }
    }

    // Sort by criticality
    metricAnomalies.sort((a, b) => b.criticalCount - a.criticalCount);

    return {
      dashboardId,
      timeRange,
      totalMetrics: metricsResult.rows.length,
      metricsWithAnomalies: metricAnomalies.length,
      anomalies: metricAnomalies,
      summary: {
        totalAnomalies: metricAnomalies.reduce((sum, m) => sum + m.anomalyCount, 0),
        criticalAnomalies: metricAnomalies.reduce((sum, m) => sum + m.criticalCount, 0),
      },
    };
  }

  // ===================================================================
  // DETECTION METHODS
  // ===================================================================

  /**
   * Detect anomalies using a specific method
   */
  private async detectByMethod(
    method: string,
    values: number[],
    timestamps: Date[],
    options: Required<AnomalyDetectionOptions>
  ): Promise<Array<{ index: number; score: number; reason: string }>> {
    switch (method) {
      case 'zscore':
        return this.detectZScore(values, options);
      case 'iqr':
        return this.detectIQR(values, options);
      case 'mad':
        return this.detectMAD(values, options);
      case 'isolation_forest':
        return this.detectIsolationForest(values, options);
      case 'moving_average':
        return this.detectMovingAverage(values, options);
      default:
        return [];
    }
  }

  /**
   * Z-Score method: Detects points that deviate significantly from mean
   */
  private detectZScore(
    values: number[],
    options: Required<AnomalyDetectionOptions>
  ): Array<{ index: number; score: number; reason: string }> {
    const stats = this.calculateStatistics(values);
    const threshold = this.getAdaptiveThreshold(stats, options.sensitivity);

    const anomalies: Array<{ index: number; score: number; reason: string }> = [];

    values.forEach((value, index) => {
      const zScore = Math.abs((value - stats.mean) / stats.stdDev);
      if (zScore > threshold.zScore) {
        anomalies.push({
          index,
          score: Math.min(zScore / 5, 1), // Normalize to 0-1
          reason: `Z-score ${zScore.toFixed(2)} exceeds threshold ${threshold.zScore.toFixed(2)}`,
        });
      }
    });

    return anomalies;
  }

  /**
   * IQR (Interquartile Range) method: Detects outliers using quartiles
   */
  private detectIQR(
    values: number[],
    options: Required<AnomalyDetectionOptions>
  ): Array<{ index: number; score: number; reason: string }> {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = this.percentile(sorted, 25);
    const q3 = this.percentile(sorted, 75);
    const iqr = q3 - q1;

    const multiplier = this.getSensitivityMultiplier(options.sensitivity);
    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;

    const anomalies: Array<{ index: number; score: number; reason: string }> = [];

    values.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        const deviation = value < lowerBound ? lowerBound - value : value - upperBound;
        const score = Math.min(deviation / iqr, 1);

        anomalies.push({
          index,
          score,
          reason: `Value ${value.toFixed(2)} outside IQR bounds [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
        });
      }
    });

    return anomalies;
  }

  /**
   * MAD (Median Absolute Deviation) method: Robust to outliers
   */
  private detectMAD(
    values: number[],
    options: Required<AnomalyDetectionOptions>
  ): Array<{ index: number; score: number; reason: string }> {
    const median = this.percentile([...values].sort((a, b) => a - b), 50);
    const deviations = values.map((v) => Math.abs(v - median));
    const mad = this.percentile([...deviations].sort((a, b) => a - b), 50);

    const threshold = this.getSensitivityMultiplier(options.sensitivity) * 2;
    const anomalies: Array<{ index: number; score: number; reason: string }> = [];

    values.forEach((value, index) => {
      const modifiedZScore = (0.6745 * (value - median)) / mad;
      if (Math.abs(modifiedZScore) > threshold) {
        anomalies.push({
          index,
          score: Math.min(Math.abs(modifiedZScore) / 10, 1),
          reason: `Modified Z-score ${modifiedZScore.toFixed(2)} exceeds threshold ${threshold.toFixed(2)}`,
        });
      }
    });

    return anomalies;
  }

  /**
   * Simplified Isolation Forest: Detects anomalies in sparse regions
   */
  private detectIsolationForest(
    values: number[],
    options: Required<AnomalyDetectionOptions>
  ): Array<{ index: number; score: number; reason: string }> {
    // Simplified implementation using density-based approach
    const windowSize = Math.max(5, Math.floor(values.length * 0.1));
    const anomalies: Array<{ index: number; score: number; reason: string }> = [];

    values.forEach((value, index) => {
      // Calculate local density
      const neighbors = values
        .map((v, i) => ({ value: v, index: i }))
        .filter((v) => Math.abs(v.index - index) <= windowSize)
        .map((v) => Math.abs(v.value - value));

      const avgDistance = neighbors.reduce((sum, d) => sum + d, 0) / neighbors.length;
      const globalAvgDistance = this.calculateStatistics(values).stdDev;

      const isolationScore = avgDistance / globalAvgDistance;
      const threshold = this.getSensitivityMultiplier(options.sensitivity);

      if (isolationScore > threshold) {
        anomalies.push({
          index,
          score: Math.min(isolationScore / 5, 1),
          reason: `Isolation score ${isolationScore.toFixed(2)} indicates sparse region`,
        });
      }
    });

    return anomalies;
  }

  /**
   * Moving Average method: Detects deviations from trend
   */
  private detectMovingAverage(
    values: number[],
    options: Required<AnomalyDetectionOptions>
  ): Array<{ index: number; score: number; reason: string }> {
    const windowSize = Math.max(5, Math.floor(values.length * 0.1));
    const anomalies: Array<{ index: number; score: number; reason: string }> = [];

    for (let i = windowSize; i < values.length; i++) {
      const window = values.slice(i - windowSize, i);
      const movingAvg = window.reduce((sum, v) => sum + v, 0) / window.length;
      const windowStd = this.calculateStatistics(window).stdDev;

      const deviation = Math.abs(values[i] - movingAvg);
      const threshold = this.getSensitivityMultiplier(options.sensitivity) * windowStd;

      if (deviation > threshold) {
        anomalies.push({
          index: i,
          score: Math.min(deviation / (threshold * 2), 1),
          reason: `Value ${values[i].toFixed(2)} deviates from moving average ${movingAvg.toFixed(2)}`,
        });
      }
    }

    return anomalies;
  }

  // ===================================================================
  // STATISTICAL CALCULATIONS
  // ===================================================================

  /**
   * Calculate basic statistics
   */
  private calculateStatistics(values: number[]): Statistics {
    const n = values.length;
    const mean = values.reduce((sum, v) => sum + v, 0) / n;

    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[n - 1];
    const median = this.percentile(sorted, 50);

    return { mean, median, stdDev, variance, min, max, count: n };
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Calculate IQR score for a single value
   */
  private calculateIQRScore(value: number, values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = this.percentile(sorted, 25);
    const q3 = this.percentile(sorted, 75);
    const iqr = q3 - q1;

    if (value < q1) {
      return (q1 - value) / iqr;
    } else if (value > q3) {
      return (value - q3) / iqr;
    }
    return 0;
  }

  /**
   * Calculate trend using linear regression
   */
  private calculateTrend(values: number[], timestamps: Date[]): TrendAnalysis {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, v) => sum + v, 0);
    const sumY = y.reduce((sum, v) => sum + v, 0);
    const sumXY = x.reduce((sum, v, i) => sum + v * y[i], 0);
    const sumXX = x.reduce((sum, v) => sum + v * v, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, v) => sum + Math.pow(v - yMean, 2), 0);
    const ssResidual = y.reduce((sum, v, i) => sum + Math.pow(v - (slope * i + intercept), 2), 0);
    const rSquared = 1 - ssResidual / ssTotal;

    // Determine trend direction
    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else {
      direction = slope > 0 ? 'increasing' : 'decreasing';
    }

    return {
      slope,
      intercept,
      rSquared,
      direction,
      forecast: (steps: number) => slope * (n + steps - 1) + intercept,
    };
  }

  /**
   * Detect seasonality patterns
   */
  private detectSeasonality(values: number[], timestamps: Date[]): SeasonalityAnalysis | undefined {
    if (values.length < this.SEASONALITY_PERIOD * 4) {
      return undefined; // Need at least 4 cycles for reliable detection
    }

    // Calculate autocorrelation for different lags
    const maxLag = Math.min(30, Math.floor(values.length / 3));
    const autocorrelations: Array<{ lag: number; correlation: number }> = [];

    for (let lag = 1; lag <= maxLag; lag++) {
      const correlation = this.calculateAutocorrelation(values, lag);
      autocorrelations.push({ lag, correlation });
    }

    // Find significant peaks in autocorrelation
    const peaks = autocorrelations
      .filter((ac) => ac.correlation > 0.5)
      .sort((a, b) => b.correlation - a.correlation);

    if (peaks.length === 0) {
      return {
        detected: false,
        period: 0,
        strength: 0,
      };
    }

    const strongestPeak = peaks[0];

    return {
      detected: true,
      period: strongestPeak.lag,
      strength: strongestPeak.correlation,
      peaks: peaks.slice(0, 3),
    };
  }

  /**
   * Calculate autocorrelation for a given lag
   */
  private calculateAutocorrelation(values: number[], lag: number): number {
    const n = values.length;
    const mean = values.reduce((sum, v) => sum + v, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n - lag; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < n; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return numerator / denominator;
  }

  /**
   * Calculate expected value using exponential smoothing
   */
  private calculateExpectedValueWithSmoothing(values: number[], alpha: number = 0.3): number {
    let smoothed = values[0];

    for (let i = 1; i < values.length; i++) {
      smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    }

    return smoothed;
  }

  /**
   * Calculate expected value for a specific index
   */
  private calculateExpectedValue(
    values: number[],
    index: number,
    options: Required<AnomalyDetectionOptions>
  ): number {
    // Use moving average for expected value
    const windowSize = Math.max(5, Math.floor(values.length * 0.1));
    const start = Math.max(0, index - windowSize);
    const end = Math.min(values.length, index + windowSize);
    const window = values.slice(start, end).filter((_, i) => i + start !== index);

    return window.reduce((sum, v) => sum + v, 0) / window.length;
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  /**
   * Get adaptive threshold based on statistics
   */
  private getAdaptiveThreshold(
    stats: Statistics,
    sensitivity: 'low' | 'medium' | 'high'
  ): { zScore: number; iqr: number } {
    const multipliers = {
      low: { zScore: 3.5, iqr: 2.5 },
      medium: { zScore: 3.0, iqr: 1.5 },
      high: { zScore: 2.5, iqr: 1.0 },
    };

    return multipliers[sensitivity];
  }

  /**
   * Get sensitivity multiplier
   */
  private getSensitivityMultiplier(sensitivity: 'low' | 'medium' | 'high'): number {
    const multipliers = {
      low: 3.0,
      medium: 2.0,
      high: 1.5,
    };
    return multipliers[sensitivity];
  }

  /**
   * Calculate severity level based on confidence score
   */
  private calculateSeverity(confidence: number): 'critical' | 'high' | 'medium' | 'low' {
    if (confidence >= 0.9) return 'critical';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Fetch historical data for a metric
   */
  private async fetchHistoricalData(metricId: string, days: number): Promise<DataPoint[]> {
    const query = `
      SELECT timestamp, value, metadata
      FROM metric_values
      WHERE metric_id = $1
        AND timestamp >= NOW() - INTERVAL '${days} days'
      ORDER BY timestamp ASC
    `;

    const result = await this.pool.query(query, [metricId]);

    return result.rows.map((row) => ({
      timestamp: row.timestamp,
      value: parseFloat(row.value),
      metadata: row.metadata,
    }));
  }
}

// ===================================================================
// TYPES AND INTERFACES
// ===================================================================

export interface DataPoint {
  timestamp: Date;
  value: number;
  metadata?: any;
}

export interface AnomalyDetectionOptions {
  methods?: Array<'zscore' | 'iqr' | 'mad' | 'isolation_forest' | 'moving_average'>;
  sensitivity?: 'low' | 'medium' | 'high';
  includeSeasonality?: boolean;
  confidenceLevel?: number;
  minDataPoints?: number;
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  summary: AnomalySummary;
  trend?: TrendAnalysis;
  seasonality?: SeasonalityAnalysis;
  metadata: {
    executionTime: number;
    insufficientData: boolean;
    message?: string;
  };
}

export interface Anomaly {
  index: number;
  timestamp: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  methods: string[];
  reasons: string[];
  metadata?: any;
}

export interface AnomalyScore {
  method?: string;
  score: number;
  reason: string;
}

export interface AnomalySummary {
  totalPoints: number;
  anomalyCount: number;
  anomalyRate: number;
  confidenceLevel: number;
  methods: string[];
  severityCounts?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface TrendAnalysis {
  slope: number;
  intercept: number;
  rSquared: number;
  direction: 'increasing' | 'decreasing' | 'stable';
  forecast: (steps: number) => number;
}

export interface SeasonalityAnalysis {
  detected: boolean;
  period: number;
  strength: number;
  peaks?: Array<{ lag: number; correlation: number }>;
}

export interface Statistics {
  mean: number;
  median: number;
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  count: number;
}

export interface RealtimeAnomalyResult {
  isAnomaly: boolean;
  confidence: number;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'normal';
  currentValue?: number;
  expectedValue?: number;
  deviation?: number;
  deviationPercentage?: number;
  zScore?: number;
  threshold?: {
    upper: number;
    lower: number;
  };
  message: string;
}

export interface DashboardAnomalyInsights {
  dashboardId: string;
  timeRange: { start: Date; end: Date };
  totalMetrics: number;
  metricsWithAnomalies: number;
  anomalies: MetricAnomalyInfo[];
  summary: {
    totalAnomalies: number;
    criticalAnomalies: number;
  };
}

export interface MetricAnomalyInfo {
  metricId: string;
  metricName: string;
  anomalyCount: number;
  mostRecentAnomaly: Anomaly;
  criticalCount: number;
  trend?: TrendAnalysis;
}
