/**
 * Anomaly Detection Dashboard
 *
 * Visualize and manage anomaly detection for metrics:
 * - Real-time anomaly monitoring
 * - Historical anomaly analysis
 * - Severity-based filtering and sorting
 * - Trend and seasonality visualization
 * - Detection method configuration
 * - Anomaly acknowledgment and notes
 * - Export anomaly reports
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';

// ===================================================================
// MAIN ANOMALY DETECTION DASHBOARD
// ===================================================================

interface AnomalyDetectionDashboardProps {
  metricId?: string;
  dashboardId?: string;
  timeRange?: { start: Date; end: Date };
}

export const AnomalyDetectionDashboard: React.FC<AnomalyDetectionDashboardProps> = ({
  metricId,
  dashboardId,
  timeRange = {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
  },
}) => {
  const [anomalyData, setAnomalyData] = useState<AnomalyDetectionResult | null>(null);
  const [dashboardInsights, setDashboardInsights] = useState<DashboardAnomalyInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [detectionConfig, setDetectionConfig] = useState<AnomalyDetectionOptions>({
    methods: ['zscore', 'iqr'],
    sensitivity: 'medium',
    includeSeasonality: true,
  });
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    loadAnomalyData();
  }, [metricId, dashboardId, timeRange, detectionConfig]);

  const loadAnomalyData = async () => {
    setLoading(true);
    try {
      if (dashboardId) {
        // Load dashboard-wide anomalies
        const response = await fetch('/api/anomaly-detection/dashboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dashboardId, timeRange }),
        });
        const data = await response.json();
        setDashboardInsights(data);
      } else if (metricId) {
        // Load metric-specific anomalies
        const response = await fetch('/api/anomaly-detection/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metricId, timeRange, options: detectionConfig }),
        });
        const data = await response.json();
        setAnomalyData(data);
      }
    } catch (error) {
      console.error('Failed to load anomaly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnomalies = anomalyData?.anomalies.filter((a) =>
    selectedSeverity === 'all' ? true : a.severity === selectedSeverity
  );

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Anomaly Detection</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            AI-powered anomaly detection and monitoring
          </p>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Configuration
        </button>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <AnomalyConfigPanel
          config={detectionConfig}
          onChange={(config) => {
            setDetectionConfig(config);
            setShowConfig(false);
          }}
          onClose={() => setShowConfig(false)}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Analyzing data for anomalies...</div>
        </div>
      ) : dashboardInsights ? (
        <DashboardInsightsView insights={dashboardInsights} />
      ) : anomalyData ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Total Anomalies"
              value={anomalyData.summary.anomalyCount}
              icon="🚨"
              trend={{ value: anomalyData.summary.anomalyRate * 100, label: '% of data points' }}
            />
            <SeverityStatCard
              label="Critical"
              value={anomalyData.summary.severityCounts?.critical || 0}
              severity="critical"
            />
            <SeverityStatCard
              label="High"
              value={anomalyData.summary.severityCounts?.high || 0}
              severity="high"
            />
            <SeverityStatCard
              label="Medium"
              value={anomalyData.summary.severityCounts?.medium || 0}
              severity="medium"
            />
            <SeverityStatCard label="Low" value={anomalyData.summary.severityCounts?.low || 0} severity="low" />
          </div>

          {/* Trend Analysis */}
          {anomalyData.trend && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Trend Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Direction</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {anomalyData.trend.direction === 'increasing' && '📈'}
                    {anomalyData.trend.direction === 'decreasing' && '📉'}
                    {anomalyData.trend.direction === 'stable' && '➡️'}
                    {anomalyData.trend.direction.charAt(0).toUpperCase() + anomalyData.trend.direction.slice(1)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">R² (Fit Quality)</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {(anomalyData.trend.rSquared * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Slope</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {anomalyData.trend.slope.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Seasonality Analysis */}
          {anomalyData.seasonality?.detected && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Seasonality Detected</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Period</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {anomalyData.seasonality.period} data points
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Strength</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {(anomalyData.seasonality.strength * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Severity Filter */}
          <div className="flex gap-2">
            {['all', 'critical', 'high', 'medium', 'low'].map((severity) => (
              <button
                key={severity}
                onClick={() => setSelectedSeverity(severity)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedSeverity === severity
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </button>
            ))}
          </div>

          {/* Anomaly List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Detected Anomalies ({filteredAnomalies?.length || 0})
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAnomalies && filteredAnomalies.length > 0 ? (
                filteredAnomalies.map((anomaly, index) => <AnomalyCard key={index} anomaly={anomaly} />)
              ) : (
                <div className="p-12 text-center text-gray-500">No anomalies found</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-gray-500">Select a metric or dashboard to analyze</div>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// ANOMALY CARD COMPONENT
// ===================================================================

interface AnomalyCardProps {
  anomaly: Anomaly;
}

const AnomalyCard: React.FC<AnomalyCardProps> = ({ anomaly }) => {
  const getSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700',
      medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
      low: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700',
    };
    return colors[severity] || colors.low;
  };

  const getSeverityIcon = (severity: string): string => {
    const icons: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵',
    };
    return icons[severity] || '🔵';
  };

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-start gap-4">
        <div className="text-2xl">{getSeverityIcon(anomaly.severity)}</div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-1 text-xs font-semibold rounded border ${getSeverityColor(anomaly.severity)}`}>
                  {anomaly.severity.toUpperCase()}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(anomaly.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Actual:</span>
                  <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">{anomaly.value.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Expected:</span>
                  <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                    {anomaly.expectedValue.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Deviation:</span>
                  <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                    {anomaly.deviation.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-600 dark:text-gray-400">Confidence</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {(anomaly.confidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Detection Methods */}
          <div className="flex flex-wrap gap-2 mb-2">
            {anomaly.methods.map((method, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
              >
                {method}
              </span>
            ))}
          </div>

          {/* Reasons */}
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {anomaly.reasons.slice(0, 2).map((reason, idx) => (
              <div key={idx}>• {reason}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// DASHBOARD INSIGHTS VIEW
// ===================================================================

interface DashboardInsightsViewProps {
  insights: DashboardAnomalyInsights;
}

const DashboardInsightsView: React.FC<DashboardInsightsViewProps> = ({ insights }) => {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Metrics" value={insights.totalMetrics} icon="📊" />
        <StatCard
          label="Metrics with Anomalies"
          value={insights.metricsWithAnomalies}
          icon="🚨"
          trend={{ value: (insights.metricsWithAnomalies / insights.totalMetrics) * 100, label: '% affected' }}
        />
        <StatCard label="Total Anomalies" value={insights.summary.totalAnomalies} icon="⚠️" />
        <StatCard label="Critical Anomalies" value={insights.summary.criticalAnomalies} icon="🔴" />
      </div>

      {/* Metric Anomalies */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Metrics with Anomalies</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {insights.anomalies.map((metricInfo, index) => (
            <MetricAnomalyCard key={index} metricInfo={metricInfo} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// METRIC ANOMALY CARD
// ===================================================================

interface MetricAnomalyCardProps {
  metricInfo: MetricAnomalyInfo;
}

const MetricAnomalyCard: React.FC<MetricAnomalyCardProps> = ({ metricInfo }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{metricInfo.metricName}</h3>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
            <span>{metricInfo.anomalyCount} anomalies</span>
            {metricInfo.criticalCount > 0 && (
              <span className="text-red-600 dark:text-red-400 font-semibold">{metricInfo.criticalCount} critical</span>
            )}
            {metricInfo.trend && (
              <span>
                Trend: {metricInfo.trend.direction === 'increasing' && '📈'}
                {metricInfo.trend.direction === 'decreasing' && '📉'}
                {metricInfo.trend.direction === 'stable' && '➡️'}
                {metricInfo.trend.direction}
              </span>
            )}
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg
            className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {expanded && <AnomalyCard anomaly={metricInfo.mostRecentAnomaly} />}
    </div>
  );
};

// ===================================================================
// ANOMALY CONFIG PANEL
// ===================================================================

interface AnomalyConfigPanelProps {
  config: AnomalyDetectionOptions;
  onChange: (config: AnomalyDetectionOptions) => void;
  onClose: () => void;
}

const AnomalyConfigPanel: React.FC<AnomalyConfigPanelProps> = ({ config, onChange, onClose }) => {
  const [localConfig, setLocalConfig] = useState(config);

  const methodOptions = [
    { value: 'zscore', label: 'Z-Score', description: 'Statistical deviation from mean' },
    { value: 'iqr', label: 'IQR', description: 'Interquartile range outlier detection' },
    { value: 'mad', label: 'MAD', description: 'Median absolute deviation (robust)' },
    { value: 'isolation_forest', label: 'Isolation Forest', description: 'Density-based detection' },
    { value: 'moving_average', label: 'Moving Average', description: 'Trend deviation detection' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Anomaly Detection Configuration</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-6">
        {/* Detection Methods */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Detection Methods</label>
          <div className="space-y-2">
            {methodOptions.map((method) => (
              <label key={method.value} className="flex items-start gap-3 p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localConfig.methods?.includes(method.value as any)}
                  onChange={(e) => {
                    const methods = e.target.checked
                      ? [...(localConfig.methods || []), method.value]
                      : localConfig.methods?.filter((m) => m !== method.value);
                    setLocalConfig({ ...localConfig, methods: methods as any });
                  }}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{method.label}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{method.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Sensitivity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sensitivity</label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setLocalConfig({ ...localConfig, sensitivity: level })}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  localConfig.sensitivity === level
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {localConfig.sensitivity === 'low' && 'Fewer anomalies, higher confidence (less sensitive)'}
            {localConfig.sensitivity === 'medium' && 'Balanced detection (recommended)'}
            {localConfig.sensitivity === 'high' && 'More anomalies, lower confidence (more sensitive)'}
          </p>
        </div>

        {/* Seasonality */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localConfig.includeSeasonality !== false}
              onChange={(e) => setLocalConfig({ ...localConfig, includeSeasonality: e.target.checked })}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Include Seasonality Detection</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Detect repeating patterns in time series data (requires more data points)
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onChange(localConfig)}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Apply Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// STAT CARD COMPONENT
// ===================================================================

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  trend?: {
    value: number;
    label: string;
  };
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, trend }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value.toLocaleString()}</div>
      {trend && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {trend.value.toFixed(1)}% {trend.label}
        </div>
      )}
    </div>
  );
};

// ===================================================================
// SEVERITY STAT CARD
// ===================================================================

interface SeverityStatCardProps {
  label: string;
  value: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const SeverityStatCard: React.FC<SeverityStatCardProps> = ({ label, value, severity }) => {
  const colors: Record<string, { bg: string; text: string }> = {
    critical: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400' },
    high: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    medium: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400' },
    low: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
  };

  const { bg, text } = colors[severity];

  return (
    <div className={`${bg} rounded-lg shadow p-6`}>
      <div className={`text-sm font-medium ${text} mb-2`}>{label}</div>
      <div className={`text-3xl font-bold ${text}`}>{value.toLocaleString()}</div>
    </div>
  );
};

// ===================================================================
// TYPES
// ===================================================================

interface AnomalyDetectionOptions {
  methods?: Array<'zscore' | 'iqr' | 'mad' | 'isolation_forest' | 'moving_average'>;
  sensitivity?: 'low' | 'medium' | 'high';
  includeSeasonality?: boolean;
  confidenceLevel?: number;
}

interface AnomalyDetectionResult {
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

interface Anomaly {
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

interface AnomalySummary {
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

interface TrendAnalysis {
  slope: number;
  intercept: number;
  rSquared: number;
  direction: 'increasing' | 'decreasing' | 'stable';
  forecast: (steps: number) => number;
}

interface SeasonalityAnalysis {
  detected: boolean;
  period: number;
  strength: number;
  peaks?: Array<{ lag: number; correlation: number }>;
}

interface DashboardAnomalyInsights {
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

interface MetricAnomalyInfo {
  metricId: string;
  metricName: string;
  anomalyCount: number;
  mostRecentAnomaly: Anomaly;
  criticalCount: number;
  trend?: TrendAnalysis;
}
