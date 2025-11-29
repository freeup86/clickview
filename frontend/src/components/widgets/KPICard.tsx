import React from 'react';
import { TrendingUpIcon, TrendingDownIcon } from '../icons';

interface KPICardProps {
  data: any;
  config: {
    metric?: string;
    format?: string;
    showTrend?: boolean;
    trendPeriod?: string;
    color?: string;
    icon?: string;
  };
}

const KPICard: React.FC<KPICardProps> = ({ data, config }) => {
  if (!data || data.length === 0) {
    return (
      <div className="kpi-card items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <svg className="w-6 h-6" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data available</p>
        </div>
      </div>
    );
  }

  // Handle different data structures
  let currentValue = 0;
  if (typeof data[0]?.value === 'object' && data[0]?.value?.value !== undefined) {
    currentValue = Number(data[0].value.value) || 0;
  } else {
    currentValue = Number(data[0]?.value) || 0;
  }

  let previousValue = 0;
  if (data[1]) {
    if (typeof data[1]?.value === 'object' && data[1]?.value?.value !== undefined) {
      previousValue = Number(data[1].value.value) || 0;
    } else {
      previousValue = Number(data[1]?.value) || 0;
    }
  }

  const trend = previousValue ? ((currentValue - previousValue) / previousValue) * 100 : 0;
  const isPositive = trend >= 0;
  const hasTrend = config.showTrend && trend !== 0;

  const formatValue = (value: number) => {
    const numValue = Number(value) || 0;

    if (config.format === 'percentage') {
      return `${numValue.toFixed(1)}%`;
    }
    if (config.format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numValue);
    }
    if (config.format === 'decimal') {
      return numValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M`;
    }
    if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(1)}K`;
    }
    return numValue.toLocaleString();
  };

  // Color styles based on config - ClickUp style (simple, no gradients)
  const getColor = () => {
    switch (config.color) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'danger':
        return '#ef4444';
      case 'info':
        return '#3b82f6';
      case 'purple':
        return '#8b5cf6';
      case 'pink':
        return '#ec4899';
      default:
        return '#7B68EE';
    }
  };

  return (
    <div className="kpi-card justify-center items-center text-center">
      <div className="w-full">
        {/* Main Value - Large and prominent like ClickUp */}
        <div
          className="text-5xl lg:text-6xl font-bold tracking-tight mb-1"
          style={{ color: getColor() }}
        >
          {formatValue(currentValue)}
        </div>

        {/* Metric Label */}
        {config.metric && (
          <div className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {config.metric}
          </div>
        )}

        {/* Trend Badge */}
        {hasTrend && (
          <div className="flex items-center justify-center mt-3">
            <div
              className={`kpi-trend ${isPositive ? 'positive' : 'negative'}`}
            >
              {isPositive ? (
                <TrendingUpIcon className="w-3.5 h-3.5" />
              ) : (
                <TrendingDownIcon className="w-3.5 h-3.5" />
              )}
              <span>{Math.abs(trend).toFixed(1)}%</span>
              {config.trendPeriod && (
                <span className="ml-1 opacity-75">vs {config.trendPeriod}</span>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar for percentage values */}
        {config.format === 'percentage' && currentValue <= 100 && (
          <div className="mt-4">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(currentValue, 100)}%`,
                  backgroundColor: getColor(),
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
