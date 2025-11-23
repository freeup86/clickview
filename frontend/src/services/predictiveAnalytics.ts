/**
 * Predictive Analytics Service
 *
 * Provides time-series forecasting, trend analysis, and risk prediction
 * using statistical models and machine learning algorithms.
 *
 * Part of AI-002 implementation (Phase 5)
 */

import { DataPoint } from './anomalyDetection';

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

export interface ForecastPoint {
  timestamp: string | Date;
  value: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface ForecastConfig {
  method?: 'linear' | 'exponential' | 'seasonal' | 'arima' | 'prophet';
  horizon: number; // Number of periods to forecast
  confidence?: number; // 0-1, default 0.95
  seasonalPeriod?: number;
  includeConfidenceInterval?: boolean;
}

export interface ForecastResult {
  forecast: ForecastPoint[];
  accuracy: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    mae: number; // Mean Absolute Error
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality: 'strong' | 'weak' | 'none';
}

export interface RiskScore {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    name: string;
    impact: number; // -1 to 1
    description: string;
  }>;
  recommendation: string;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'flat';
  slope: number;
  rSquared: number; // Goodness of fit
  changeRate: number; // Percentage change per period
  volatility: number; // Standard deviation of changes
  projections: {
    nextPeriod: number;
    next5Periods: number;
    next10Periods: number;
  };
}

// ===================================================================
// FORECASTING METHODS
// ===================================================================

export class Forecaster {
  /**
   * Linear regression forecast
   */
  static linearForecast(
    data: DataPoint[],
    config: ForecastConfig
  ): ForecastResult {
    const { horizon, confidence = 0.95 } = config;

    const values = data.map(d => d.value);
    const n = values.length;

    // Calculate linear regression
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const { slope, intercept, rSquared } = this.linearRegression(x, y);

    // Generate forecast
    const forecast: ForecastPoint[] = [];
    const residuals = y.map((yi, i) => yi - (slope * x[i] + intercept));
    const stdError = Math.sqrt(
      residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2)
    );

    // Z-score for confidence interval (95% = 1.96)
    const zScore = this.getZScore(confidence);
    const marginOfError = zScore * stdError;

    for (let i = 0; i < horizon; i++) {
      const futureX = n + i;
      const predictedValue = slope * futureX + intercept;

      forecast.push({
        timestamp: this.getFutureTimestamp(data, i),
        value: predictedValue,
        lowerBound: predictedValue - marginOfError,
        upperBound: predictedValue + marginOfError,
        confidence,
      });
    }

    // Calculate accuracy metrics (on historical data)
    const predictions = x.map(xi => slope * xi + intercept);
    const accuracy = this.calculateAccuracy(values, predictions);

    return {
      forecast,
      accuracy,
      trend: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable',
      seasonality: 'none',
    };
  }

  /**
   * Exponential smoothing forecast (Holt's method)
   */
  static exponentialForecast(
    data: DataPoint[],
    config: ForecastConfig
  ): ForecastResult {
    const { horizon, confidence = 0.95 } = config;

    const values = data.map(d => d.value);

    // Holt's exponential smoothing parameters
    const alpha = 0.3; // Level smoothing
    const beta = 0.1; // Trend smoothing

    let level = values[0];
    let trend = 0;

    const smoothed: number[] = [level];

    // Apply Holt's method
    for (let i = 1; i < values.length; i++) {
      const prevLevel = level;
      level = alpha * values[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
      smoothed.push(level);
    }

    // Calculate forecast
    const forecast: ForecastPoint[] = [];
    const residuals = values.map((v, i) => v - smoothed[i]);
    const stdError = Math.sqrt(
      residuals.reduce((sum, r) => sum + r * r, 0) / values.length
    );

    const zScore = this.getZScore(confidence);

    for (let i = 0; i < horizon; i++) {
      const forecastValue = level + (i + 1) * trend;
      const marginOfError = zScore * stdError * Math.sqrt(i + 1);

      forecast.push({
        timestamp: this.getFutureTimestamp(data, i),
        value: forecastValue,
        lowerBound: forecastValue - marginOfError,
        upperBound: forecastValue + marginOfError,
        confidence,
      });
    }

    const accuracy = this.calculateAccuracy(values, smoothed);

    return {
      forecast,
      accuracy,
      trend: trend > 0.01 ? 'increasing' : trend < -0.01 ? 'decreasing' : 'stable',
      seasonality: 'none',
    };
  }

  /**
   * Seasonal forecast (Seasonal decomposition)
   */
  static seasonalForecast(
    data: DataPoint[],
    config: ForecastConfig
  ): ForecastResult {
    const { horizon, seasonalPeriod = 7, confidence = 0.95 } = config;

    const values = data.map(d => d.value);

    // Decompose into trend and seasonal components
    const { trend: trendComponent, seasonal, residuals } = this.seasonalDecomposition(
      values,
      seasonalPeriod
    );

    // Forecast trend
    const trendForecast = this.forecastTrend(trendComponent, horizon);

    // Forecast using trend + seasonal pattern
    const forecast: ForecastPoint[] = [];
    const stdError = Math.sqrt(
      residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length
    );
    const zScore = this.getZScore(confidence);

    for (let i = 0; i < horizon; i++) {
      const seasonalIndex = (values.length + i) % seasonalPeriod;
      const forecastValue = trendForecast[i] + seasonal[seasonalIndex];
      const marginOfError = zScore * stdError;

      forecast.push({
        timestamp: this.getFutureTimestamp(data, i),
        value: forecastValue,
        lowerBound: forecastValue - marginOfError,
        upperBound: forecastValue + marginOfError,
        confidence,
      });
    }

    const fitted = values.map((_, i) => {
      const trendValue = trendComponent[i] || trendComponent[trendComponent.length - 1];
      const seasonalValue = seasonal[i % seasonalPeriod];
      return trendValue + seasonalValue;
    });

    const accuracy = this.calculateAccuracy(values, fitted);

    return {
      forecast,
      accuracy,
      trend: this.determineTrend(trendComponent),
      seasonality: 'strong',
    };
  }

  /**
   * Linear regression calculation
   */
  private static linearRegression(x: number[], y: number[]) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const rSquared = 1 - ssResidual / ssTotal;

    return { slope, intercept, rSquared };
  }

  /**
   * Seasonal decomposition
   */
  private static seasonalDecomposition(values: number[], period: number) {
    // Calculate moving average (trend)
    const trend: number[] = [];
    const halfPeriod = Math.floor(period / 2);

    for (let i = 0; i < values.length; i++) {
      if (i < halfPeriod || i >= values.length - halfPeriod) {
        trend.push(values[i]);
      } else {
        const window = values.slice(i - halfPeriod, i + halfPeriod + 1);
        trend.push(window.reduce((a, b) => a + b, 0) / window.length);
      }
    }

    // Calculate detrended values
    const detrended = values.map((v, i) => v - trend[i]);

    // Calculate seasonal component (average for each season)
    const seasonal: number[] = [];
    for (let i = 0; i < period; i++) {
      const seasonValues = [];
      for (let j = i; j < detrended.length; j += period) {
        seasonValues.push(detrended[j]);
      }
      seasonal.push(
        seasonValues.reduce((a, b) => a + b, 0) / seasonValues.length
      );
    }

    // Calculate residuals
    const residuals = values.map((v, i) => {
      const seasonalValue = seasonal[i % period];
      return v - trend[i] - seasonalValue;
    });

    return { trend, seasonal, residuals };
  }

  /**
   * Forecast trend component
   */
  private static forecastTrend(trend: number[], horizon: number): number[] {
    // Use last trend values and slope
    const lastValues = trend.slice(-10);
    const { slope } = this.linearRegression(
      Array.from({ length: lastValues.length }, (_, i) => i),
      lastValues
    );

    const lastValue = trend[trend.length - 1];
    const forecast: number[] = [];

    for (let i = 0; i < horizon; i++) {
      forecast.push(lastValue + slope * (i + 1));
    }

    return forecast;
  }

  /**
   * Determine trend direction
   */
  private static determineTrend(trend: number[]): 'increasing' | 'decreasing' | 'stable' {
    const { slope } = this.linearRegression(
      Array.from({ length: trend.length }, (_, i) => i),
      trend
    );

    if (slope > 0.01) return 'increasing';
    if (slope < -0.01) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate forecast accuracy
   */
  private static calculateAccuracy(actual: number[], predicted: number[]) {
    const n = Math.min(actual.length, predicted.length);
    let mape = 0;
    let mae = 0;
    let mse = 0;

    for (let i = 0; i < n; i++) {
      const error = actual[i] - predicted[i];
      mape += Math.abs(error / actual[i]);
      mae += Math.abs(error);
      mse += error * error;
    }

    return {
      mape: (mape / n) * 100,
      mae: mae / n,
      rmse: Math.sqrt(mse / n),
    };
  }

  /**
   * Get Z-score for confidence level
   */
  private static getZScore(confidence: number): number {
    // Common confidence levels
    if (confidence >= 0.99) return 2.576;
    if (confidence >= 0.95) return 1.96;
    if (confidence >= 0.90) return 1.645;
    return 1.96;
  }

  /**
   * Get future timestamp
   */
  private static getFutureTimestamp(
    data: DataPoint[],
    periodsAhead: number
  ): string | Date {
    if (data.length < 2 || !data[0].timestamp) {
      return new Date();
    }

    // Calculate time interval
    const t1 = new Date(data[data.length - 1].timestamp!).getTime();
    const t2 = new Date(data[data.length - 2].timestamp!).getTime();
    const interval = t1 - t2;

    return new Date(t1 + interval * (periodsAhead + 1));
  }

  /**
   * Main forecast function
   */
  static forecast(
    data: DataPoint[],
    config: ForecastConfig
  ): ForecastResult {
    const method = config.method || 'linear';

    switch (method) {
      case 'linear':
        return this.linearForecast(data, config);
      case 'exponential':
        return this.exponentialForecast(data, config);
      case 'seasonal':
        return this.seasonalForecast(data, config);
      default:
        return this.linearForecast(data, config);
    }
  }
}

// ===================================================================
// TREND ANALYSIS
// ===================================================================

export function analyzeTrend(data: DataPoint[]): TrendAnalysis {
  const values = data.map(d => d.value);
  const x = Array.from({ length: values.length }, (_, i) => i);

  const { slope, intercept, rSquared } = Forecaster['linearRegression'](x, values);

  // Calculate change rate
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const changeRate = (slope / mean) * 100;

  // Calculate volatility
  const changes = [];
  for (let i = 1; i < values.length; i++) {
    changes.push((values[i] - values[i - 1]) / values[i - 1]);
  }
  const volatility =
    Math.sqrt(changes.reduce((sum, c) => sum + c * c, 0) / changes.length) * 100;

  // Generate projections
  const lastX = values.length - 1;
  const projections = {
    nextPeriod: slope * (lastX + 1) + intercept,
    next5Periods: slope * (lastX + 5) + intercept,
    next10Periods: slope * (lastX + 10) + intercept,
  };

  return {
    direction: slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat',
    slope,
    rSquared,
    changeRate,
    volatility,
    projections,
  };
}

// ===================================================================
// RISK PREDICTION
// ===================================================================

export function calculateRiskScore(
  data: DataPoint[],
  thresholds?: {
    critical?: number;
    warning?: number;
  }
): RiskScore {
  const trend = analyzeTrend(data);
  const values = data.map(d => d.value);
  const currentValue = values[values.length - 1];

  const factors: RiskScore['factors'] = [];
  let totalRisk = 50; // Base risk score

  // Factor 1: Trend direction
  if (trend.direction === 'down') {
    const impact = Math.min(Math.abs(trend.changeRate) / 10, 1);
    factors.push({
      name: 'Declining Trend',
      impact: -impact,
      description: `${Math.abs(trend.changeRate).toFixed(1)}% decline per period`,
    });
    totalRisk += impact * 20;
  }

  // Factor 2: Volatility
  if (trend.volatility > 10) {
    const impact = Math.min(trend.volatility / 50, 1);
    factors.push({
      name: 'High Volatility',
      impact: -impact,
      description: `${trend.volatility.toFixed(1)}% volatility`,
    });
    totalRisk += impact * 15;
  }

  // Factor 3: Threshold violations
  if (thresholds?.critical && currentValue < thresholds.critical) {
    factors.push({
      name: 'Critical Threshold',
      impact: -1,
      description: `Below critical threshold (${thresholds.critical})`,
    });
    totalRisk += 30;
  } else if (thresholds?.warning && currentValue < thresholds.warning) {
    factors.push({
      name: 'Warning Threshold',
      impact: -0.5,
      description: `Below warning threshold (${thresholds.warning})`,
    });
    totalRisk += 15;
  }

  // Normalize risk score
  const score = Math.max(0, Math.min(100, totalRisk));

  // Determine risk level
  let level: RiskScore['level'];
  if (score >= 75) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 25) level = 'medium';
  else level = 'low';

  // Generate recommendation
  const recommendation = generateRecommendation(level, factors);

  return {
    score,
    level,
    factors,
    recommendation,
  };
}

function generateRecommendation(
  level: RiskScore['level'],
  factors: RiskScore['factors']
): string {
  if (level === 'critical') {
    return 'Immediate action required. Consider implementing mitigation strategies.';
  }

  if (level === 'high') {
    return 'Elevated risk detected. Monitor closely and prepare contingency plans.';
  }

  if (level === 'medium') {
    return 'Moderate risk. Continue monitoring and review trends regularly.';
  }

  return 'Low risk. Maintain current operations and monitoring practices.';
}
