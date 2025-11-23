/**
 * Anomaly Detection Dashboard Component
 *
 * Displays detected anomalies, predictions, and risk assessments
 * with interactive visualizations.
 *
 * Part of AI-002 implementation (Phase 5)
 */

import React, { useState, useEffect } from 'react';
import {
  AnomalyDetector,
  AnomalyDetectionResult,
  DataPoint,
  Anomaly,
} from '../../services/anomalyDetection';
import {
  Forecaster,
  ForecastResult,
  analyzeTrend,
  calculateRiskScore,
  TrendAnalysis,
  RiskScore,
} from '../../services/predictiveAnalytics';

// ===================================================================
// COMPONENT PROPS
// ===================================================================

export interface AnomalyDashboardProps {
  data: DataPoint[];
  enablePredictions?: boolean;
  enableRiskAnalysis?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export const AnomalyDashboard: React.FC<AnomalyDashboardProps> = ({
  data,
  enablePredictions = true,
  enableRiskAnalysis = true,
  autoRefresh = false,
  refreshInterval = 60000,
}) => {
  const [anomalies, setAnomalies] = useState<AnomalyDetectionResult | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [trend, setTrend] = useState<TrendAnalysis | null>(null);
  const [risk, setRisk] = useState<RiskScore | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'zscore' | 'iqr' | 'moving_average' | 'seasonal'>('zscore');
  const [sensitivity, setSensitivity] = useState(0.5);

  /**
   * Run analysis
   */
  useEffect(() => {
    if (!data || data.length === 0) return;

    // Detect anomalies
    const anomalyResult = AnomalyDetector.detect(data, {
      method: selectedMethod,
      sensitivity,
    });
    setAnomalies(anomalyResult);

    // Analyze trend
    const trendResult = analyzeTrend(data);
    setTrend(trendResult);

    // Generate forecast
    if (enablePredictions) {
      const forecastResult = Forecaster.forecast(data, {
        method: 'exponential',
        horizon: 10,
        confidence: 0.95,
      });
      setForecast(forecastResult);
    }

    // Calculate risk
    if (enableRiskAnalysis) {
      const riskResult = calculateRiskScore(data);
      setRisk(riskResult);
    }
  }, [data, selectedMethod, sensitivity, enablePredictions, enableRiskAnalysis]);

  /**
   * Auto-refresh
   */
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Trigger re-analysis
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  if (!anomalies) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="anomaly-dashboard space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Analytics Dashboard
        </h2>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Detection Method
            </label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="zscore">Z-Score</option>
              <option value="iqr">IQR</option>
              <option value="moving_average">Moving Average</option>
              <option value="seasonal">Seasonal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sensitivity: {(sensitivity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-48"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Anomaly Count */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">
            Anomalies Detected
          </div>
          <div className="text-3xl font-bold text-red-600">
            {anomalies.anomalyCount}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {(anomalies.anomalyRate * 100).toFixed(1)}% of data
          </div>
        </div>

        {/* Trend */}
        {trend && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">
              Trend
            </div>
            <div className={`text-3xl font-bold ${
              trend.direction === 'up' ? 'text-green-600' :
              trend.direction === 'down' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '→'}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {Math.abs(trend.changeRate).toFixed(1)}% per period
            </div>
          </div>
        )}

        {/* Forecast Accuracy */}
        {forecast && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">
              Forecast MAPE
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {forecast.accuracy.mape.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Mean Absolute Error
            </div>
          </div>
        )}

        {/* Risk Score */}
        {risk && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">
              Risk Level
            </div>
            <div className={`text-3xl font-bold ${
              risk.level === 'critical' ? 'text-red-600' :
              risk.level === 'high' ? 'text-orange-600' :
              risk.level === 'medium' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {risk.score.toFixed(0)}
            </div>
            <div className="text-sm text-gray-600 mt-1 uppercase">
              {risk.level}
            </div>
          </div>
        )}
      </div>

      {/* Anomaly List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Detected Anomalies
        </h3>

        {anomalies.anomalies.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No anomalies detected
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {anomalies.anomalies.map((anomaly, index) => (
              <AnomalyCard key={index} anomaly={anomaly} />
            ))}
          </div>
        )}
      </div>

      {/* Forecast */}
      {enablePredictions && forecast && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Forecast (Next {forecast.forecast.length} Periods)
          </h3>

          <div className="space-y-2">
            {forecast.forecast.slice(0, 5).map((point, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div className="text-sm text-gray-600">
                  Period {index + 1}
                </div>
                <div className="text-sm font-medium">
                  {point.value.toFixed(2)}
                  <span className="text-xs text-gray-500 ml-2">
                    ({point.lowerBound.toFixed(2)} - {point.upperBound.toFixed(2)})
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <div>Trend: <span className="font-medium">{forecast.trend}</span></div>
            <div>Seasonality: <span className="font-medium">{forecast.seasonality}</span></div>
          </div>
        </div>
      )}

      {/* Risk Analysis */}
      {enableRiskAnalysis && risk && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Risk Analysis
          </h3>

          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Risk Factors:</div>
            <div className="space-y-2">
              {risk.factors.map((factor, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      factor.impact < -0.5 ? 'bg-red-500' :
                      factor.impact < 0 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                  ></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{factor.name}</div>
                    <div className="text-xs text-gray-600">{factor.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <div className="text-sm font-medium text-blue-800 mb-1">
              Recommendation
            </div>
            <div className="text-sm text-blue-700">
              {risk.recommendation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// ANOMALY CARD COMPONENT
// ===================================================================

const AnomalyCard: React.FC<{ anomaly: Anomaly }> = ({ anomaly }) => {
  const severityColors = {
    low: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    medium: 'bg-orange-100 border-orange-300 text-orange-800',
    high: 'bg-red-100 border-red-300 text-red-800',
    critical: 'bg-purple-100 border-purple-300 text-purple-800',
  };

  const typeLabels = {
    spike: '📈 Spike',
    drop: '📉 Drop',
    trend_change: '🔄 Trend Change',
    outlier: '⚠️ Outlier',
    pattern_break: '🔔 Pattern Break',
  };

  return (
    <div className={`p-4 border rounded-lg ${severityColors[anomaly.severity]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm font-semibold">
          {typeLabels[anomaly.type]}
        </div>
        <div className="text-xs font-medium uppercase">
          {anomaly.severity}
        </div>
      </div>

      <div className="text-sm mb-2">{anomaly.description}</div>

      <div className="flex items-center gap-4 text-xs">
        {anomaly.timestamp && (
          <div>
            Time: {new Date(anomaly.timestamp).toLocaleString()}
          </div>
        )}
        <div>
          Confidence: {(anomaly.confidence * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
};
