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
  };
}

const KPICard: React.FC<KPICardProps> = ({ data, config }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No data available
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

  const formatValue = (value: number) => {
    // Ensure value is a number
    const numValue = Number(value) || 0;
    
    if (config.format === 'percentage') {
      return `${numValue.toFixed(1)}%`;
    }
    if (config.format === 'currency') {
      return `$${numValue.toLocaleString()}`;
    }
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M`;
    }
    if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(1)}K`;
    }
    return numValue.toLocaleString();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="w-full">
        {config.metric && (
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{config.metric}</div>
        )}
        <div className="flex items-baseline justify-between">
          <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {formatValue(currentValue)}
          </div>
          {config.showTrend && trend !== 0 && (
            <div className={`flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
              isPositive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isPositive ? (
                <TrendingUpIcon className="w-3 h-3 mr-0.5" />
              ) : (
                <TrendingDownIcon className="w-3 h-3 mr-0.5" />
              )}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
        {config.trendPeriod && (
          <div className="text-xs text-gray-400 mt-2">vs {config.trendPeriod}</div>
        )}
      </div>
    </div>
  );
};

export default KPICard;