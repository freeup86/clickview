/**
 * Anomaly Detection Service
 *
 * Detects anomalies in time-series and multi-dimensional data using
 * statistical methods and machine learning algorithms.
 *
 * Part of AI-002 implementation (Phase 5)
 */

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

export interface DataPoint {
  timestamp?: string | Date;
  value: number;
  label?: string;
  [key: string]: any;
}

export interface Anomaly {
  index: number;
  timestamp?: string | Date;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  type: 'spike' | 'drop' | 'trend_change' | 'outlier' | 'pattern_break';
  description: string;
}

export interface AnomalyDetectionConfig {
  method?: 'zscore' | 'iqr' | 'isolation_forest' | 'moving_average' | 'seasonal';
  sensitivity?: number; // 0-1, higher = more sensitive
  lookbackWindow?: number;
  seasonalPeriod?: number;
  minAnomalyScore?: number;
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  normalRange: {
    min: number;
    max: number;
    mean: number;
    stdDev: number;
  };
  totalDataPoints: number;
  anomalyCount: number;
  anomalyRate: number;
}

// ===================================================================
// STATISTICAL HELPERS
// ===================================================================

class Statistics {
  /**
   * Calculate mean
   */
  static mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  static stdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = this.mean(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = this.mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Calculate median
   */
  static median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  /**
   * Calculate quartiles
   */
  static quartiles(values: number[]): { q1: number; q2: number; q3: number; iqr: number } {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    const q2 = this.median(sorted);
    const q1 = this.median(sorted.slice(0, mid));
    const q3 = this.median(sorted.slice(mid + (sorted.length % 2)));
    const iqr = q3 - q1;

    return { q1, q2, q3, iqr };
  }

  /**
   * Calculate Z-score
   */
  static zScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }

  /**
   * Calculate moving average
   */
  static movingAverage(values: number[], window: number): number[] {
    const result: number[] = [];

    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - window + 1);
      const windowValues = values.slice(start, i + 1);
      result.push(this.mean(windowValues));
    }

    return result;
  }

  /**
   * Calculate exponential moving average
   */
  static ema(values: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const emaValues: number[] = [values[0]];

    for (let i = 1; i < values.length; i++) {
      emaValues.push(values[i] * k + emaValues[i - 1] * (1 - k));
    }

    return emaValues;
  }
}

// ===================================================================
// ANOMALY DETECTION METHODS
// ===================================================================

export class AnomalyDetector {
  /**
   * Detect anomalies using Z-score method
   */
  static zScoreDetection(
    data: DataPoint[],
    config: AnomalyDetectionConfig = {}
  ): AnomalyDetectionResult {
    const { sensitivity = 0.5, minAnomalyScore = 2.5 } = config;

    const values = data.map(d => d.value);
    const mean = Statistics.mean(values);
    const stdDev = Statistics.stdDev(values);

    // Adjust threshold based on sensitivity
    const threshold = minAnomalyScore * (1 - sensitivity * 0.5);

    const anomalies: Anomaly[] = [];

    data.forEach((point, index) => {
      const zScore = Statistics.zScore(point.value, mean, stdDev);
      const absZScore = Math.abs(zScore);

      if (absZScore > threshold) {
        const deviation = point.value - mean;
        const severity = this.calculateSeverity(absZScore, threshold);

        anomalies.push({
          index,
          timestamp: point.timestamp,
          value: point.value,
          expectedValue: mean,
          deviation,
          severity,
          confidence: Math.min(absZScore / 5, 1),
          type: deviation > 0 ? 'spike' : 'drop',
          description: `Value ${point.value.toFixed(2)} deviates ${absZScore.toFixed(2)} standard deviations from mean ${mean.toFixed(2)}`,
        });
      }
    });

    return {
      anomalies,
      normalRange: {
        min: mean - 2 * stdDev,
        max: mean + 2 * stdDev,
        mean,
        stdDev,
      },
      totalDataPoints: data.length,
      anomalyCount: anomalies.length,
      anomalyRate: anomalies.length / data.length,
    };
  }

  /**
   * Detect anomalies using IQR (Interquartile Range) method
   */
  static iqrDetection(
    data: DataPoint[],
    config: AnomalyDetectionConfig = {}
  ): AnomalyDetectionResult {
    const { sensitivity = 0.5 } = config;

    const values = data.map(d => d.value);
    const { q1, q2, q3, iqr } = Statistics.quartiles(values);

    // Adjust multiplier based on sensitivity
    const multiplier = 1.5 * (1 - sensitivity * 0.3);
    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;

    const anomalies: Anomaly[] = [];

    data.forEach((point, index) => {
      if (point.value < lowerBound || point.value > upperBound) {
        const deviation = point.value > upperBound ? point.value - q2 : q2 - point.value;
        const normalizedDeviation = deviation / iqr;
        const severity = this.calculateSeverity(normalizedDeviation, 1);

        anomalies.push({
          index,
          timestamp: point.timestamp,
          value: point.value,
          expectedValue: q2,
          deviation,
          severity,
          confidence: Math.min(normalizedDeviation / 3, 1),
          type: point.value > upperBound ? 'spike' : 'drop',
          description: `Value ${point.value.toFixed(2)} is outside IQR bounds [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
        });
      }
    });

    return {
      anomalies,
      normalRange: {
        min: lowerBound,
        max: upperBound,
        mean: q2,
        stdDev: iqr / 1.35,
      },
      totalDataPoints: data.length,
      anomalyCount: anomalies.length,
      anomalyRate: anomalies.length / data.length,
    };
  }

  /**
   * Detect anomalies using moving average method
   */
  static movingAverageDetection(
    data: DataPoint[],
    config: AnomalyDetectionConfig = {}
  ): AnomalyDetectionResult {
    const { lookbackWindow = 10, sensitivity = 0.5 } = config;

    const values = data.map(d => d.value);
    const movingAvg = Statistics.movingAverage(values, lookbackWindow);

    // Calculate deviation threshold
    const deviations = values.map((val, i) => Math.abs(val - movingAvg[i]));
    const avgDeviation = Statistics.mean(deviations);
    const threshold = avgDeviation * (2 - sensitivity);

    const anomalies: Anomaly[] = [];

    data.forEach((point, index) => {
      const expectedValue = movingAvg[index];
      const deviation = point.value - expectedValue;
      const absDeviation = Math.abs(deviation);

      if (absDeviation > threshold) {
        const normalizedDeviation = absDeviation / avgDeviation;
        const severity = this.calculateSeverity(normalizedDeviation, 1);

        anomalies.push({
          index,
          timestamp: point.timestamp,
          value: point.value,
          expectedValue,
          deviation,
          severity,
          confidence: Math.min(normalizedDeviation / 3, 1),
          type: deviation > 0 ? 'spike' : 'drop',
          description: `Value ${point.value.toFixed(2)} deviates ${absDeviation.toFixed(2)} from moving average ${expectedValue.toFixed(2)}`,
        });
      }
    });

    const mean = Statistics.mean(values);
    const stdDev = Statistics.stdDev(values);

    return {
      anomalies,
      normalRange: {
        min: mean - 2 * stdDev,
        max: mean + 2 * stdDev,
        mean,
        stdDev,
      },
      totalDataPoints: data.length,
      anomalyCount: anomalies.length,
      anomalyRate: anomalies.length / data.length,
    };
  }

  /**
   * Detect seasonal anomalies
   */
  static seasonalDetection(
    data: DataPoint[],
    config: AnomalyDetectionConfig = {}
  ): AnomalyDetectionResult {
    const { seasonalPeriod = 7, sensitivity = 0.5 } = config;

    // Group data by seasonal period
    const seasonalGroups: number[][] = Array.from({ length: seasonalPeriod }, () => []);

    data.forEach((point, index) => {
      const seasonIndex = index % seasonalPeriod;
      seasonalGroups[seasonIndex].push(point.value);
    });

    // Calculate seasonal baselines
    const seasonalBaselines = seasonalGroups.map(group => ({
      mean: Statistics.mean(group),
      stdDev: Statistics.stdDev(group),
    }));

    const threshold = 2.5 * (1 - sensitivity * 0.5);
    const anomalies: Anomaly[] = [];

    data.forEach((point, index) => {
      const seasonIndex = index % seasonalPeriod;
      const baseline = seasonalBaselines[seasonIndex];
      const zScore = Statistics.zScore(point.value, baseline.mean, baseline.stdDev);
      const absZScore = Math.abs(zScore);

      if (absZScore > threshold) {
        const deviation = point.value - baseline.mean;
        const severity = this.calculateSeverity(absZScore, threshold);

        anomalies.push({
          index,
          timestamp: point.timestamp,
          value: point.value,
          expectedValue: baseline.mean,
          deviation,
          severity,
          confidence: Math.min(absZScore / 5, 1),
          type: 'pattern_break',
          description: `Seasonal anomaly: value ${point.value.toFixed(2)} deviates from expected ${baseline.mean.toFixed(2)}`,
        });
      }
    });

    const values = data.map(d => d.value);
    const mean = Statistics.mean(values);
    const stdDev = Statistics.stdDev(values);

    return {
      anomalies,
      normalRange: {
        min: mean - 2 * stdDev,
        max: mean + 2 * stdDev,
        mean,
        stdDev,
      },
      totalDataPoints: data.length,
      anomalyCount: anomalies.length,
      anomalyRate: anomalies.length / data.length,
    };
  }

  /**
   * Detect trend changes
   */
  static trendChangeDetection(
    data: DataPoint[],
    config: AnomalyDetectionConfig = {}
  ): AnomalyDetectionResult {
    const { lookbackWindow = 5 } = config;

    const values = data.map(d => d.value);
    const anomalies: Anomaly[] = [];

    for (let i = lookbackWindow; i < values.length - lookbackWindow; i++) {
      const beforeWindow = values.slice(i - lookbackWindow, i);
      const afterWindow = values.slice(i + 1, i + 1 + lookbackWindow);

      const beforeTrend = this.calculateTrend(beforeWindow);
      const afterTrend = this.calculateTrend(afterWindow);

      // Detect significant trend reversal
      if (Math.sign(beforeTrend) !== Math.sign(afterTrend) && Math.abs(afterTrend - beforeTrend) > 0.1) {
        anomalies.push({
          index: i,
          timestamp: data[i].timestamp,
          value: values[i],
          expectedValue: values[i],
          deviation: 0,
          severity: 'medium',
          confidence: Math.min(Math.abs(afterTrend - beforeTrend), 1),
          type: 'trend_change',
          description: `Trend reversal detected: from ${beforeTrend > 0 ? 'upward' : 'downward'} to ${afterTrend > 0 ? 'upward' : 'downward'}`,
        });
      }
    }

    const mean = Statistics.mean(values);
    const stdDev = Statistics.stdDev(values);

    return {
      anomalies,
      normalRange: {
        min: mean - 2 * stdDev,
        max: mean + 2 * stdDev,
        mean,
        stdDev,
      },
      totalDataPoints: data.length,
      anomalyCount: anomalies.length,
      anomalyRate: anomalies.length / data.length,
    };
  }

  /**
   * Calculate trend (simple linear regression slope)
   */
  private static calculateTrend(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return slope;
  }

  /**
   * Calculate severity level
   */
  private static calculateSeverity(
    score: number,
    threshold: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = score / threshold;

    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  /**
   * Detect anomalies using specified method
   */
  static detect(
    data: DataPoint[],
    config: AnomalyDetectionConfig = {}
  ): AnomalyDetectionResult {
    const method = config.method || 'zscore';

    switch (method) {
      case 'zscore':
        return this.zScoreDetection(data, config);
      case 'iqr':
        return this.iqrDetection(data, config);
      case 'moving_average':
        return this.movingAverageDetection(data, config);
      case 'seasonal':
        return this.seasonalDetection(data, config);
      default:
        return this.zScoreDetection(data, config);
    }
  }
}

// ===================================================================
// MULTI-METHOD ENSEMBLE DETECTION
// ===================================================================

export function ensembleDetection(
  data: DataPoint[],
  config: AnomalyDetectionConfig = {}
): AnomalyDetectionResult {
  // Run multiple detection methods
  const results = [
    AnomalyDetector.zScoreDetection(data, config),
    AnomalyDetector.iqrDetection(data, config),
    AnomalyDetector.movingAverageDetection(data, config),
  ];

  // Aggregate anomalies (count occurrences across methods)
  const anomalyVotes = new Map<number, number>();

  results.forEach(result => {
    result.anomalies.forEach(anomaly => {
      anomalyVotes.set(anomaly.index, (anomalyVotes.get(anomaly.index) || 0) + 1);
    });
  });

  // Select anomalies detected by at least 2 methods
  const consensusAnomalies = results[0].anomalies.filter(
    anomaly => (anomalyVotes.get(anomaly.index) || 0) >= 2
  );

  return {
    anomalies: consensusAnomalies,
    normalRange: results[0].normalRange,
    totalDataPoints: data.length,
    anomalyCount: consensusAnomalies.length,
    anomalyRate: consensusAnomalies.length / data.length,
  };
}
