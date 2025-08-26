import React from 'react';

interface ProgressBarProps {
  data: any;
  config: {
    label?: string;
    maxValue?: number;
    showPercentage?: boolean;
    color?: string;
    height?: number;
  };
}

const ProgressBar: React.FC<ProgressBarProps> = ({ data, config }) => {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No data available
      </div>
    );
  }

  const value = Array.isArray(data) ? data[0]?.value || 0 : data.value || 0;
  const maxValue = config.maxValue || 100;
  const percentage = Math.min((value / maxValue) * 100, 100);
  const color = config.color || '#7B68EE';
  const height = config.height || 24;

  return (
    <div className="flex flex-col justify-center h-full">
      {config.label && (
        <div className="mb-2 text-sm font-medium text-gray-700">{config.label}</div>
      )}
      <div className="relative">
        <div 
          className="bg-gray-200 rounded-full overflow-hidden"
          style={{ height: `${height}px` }}
        >
          <div
            className="h-full transition-all duration-500 ease-out rounded-full"
            style={{
              width: `${percentage}%`,
              backgroundColor: color,
            }}
          />
        </div>
        {config.showPercentage !== false && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              {percentage.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>{value.toLocaleString()}</span>
        <span>{maxValue.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default ProgressBar;