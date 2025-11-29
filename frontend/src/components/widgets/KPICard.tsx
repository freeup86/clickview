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
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">No data available</p>
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

  // Color styles based on config
  const getColorClasses = () => {
    switch (config.color) {
      case 'success':
        return 'from-emerald-500 to-teal-500';
      case 'warning':
        return 'from-amber-500 to-orange-500';
      case 'danger':
        return 'from-red-500 to-rose-500';
      case 'info':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-primary-500 to-purple-500';
    }
  };

  return (
    <div className="kpi-card justify-center">
      <div className="w-full">
        {/* Metric Label */}
        {config.metric && (
          <div className="kpi-label">{config.metric}</div>
        )}

        {/* Value and Trend Row */}
        <div className="flex items-end justify-between gap-4">
          {/* Main Value */}
          <div className={`kpi-value ${config.color ? '' : 'colored'} bg-gradient-to-r ${getColorClasses()} bg-clip-text text-transparent`}>
            {formatValue(currentValue)}
          </div>

          {/* Trend Badge */}
          {hasTrend && (
            <div
              className={`kpi-trend ${
                isPositive ? 'positive' : 'negative'
              }`}
            >
              {isPositive ? (
                <TrendingUpIcon className="w-3.5 h-3.5" />
              ) : (
                <TrendingDownIcon className="w-3.5 h-3.5" />
              )}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Period/Comparison Text */}
        {config.trendPeriod && (
          <div className="kpi-period">
            vs {config.trendPeriod}
          </div>
        )}

        {/* Progress Bar (optional visual) */}
        {config.format === 'percentage' && currentValue <= 100 && (
          <div className="mt-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getColorClasses()} rounded-full transition-all duration-500`}
                style={{ width: `${Math.min(currentValue, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
