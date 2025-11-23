/**
 * Battery Chart Component
 *
 * Displays a progress or capacity indicator as a battery charging level.
 * Ideal for capacity tracking, progress indicators, and resource utilization.
 */

import React from 'react';
import { BaseChartProps } from '../../types/charts';

interface BatteryLevel {
  threshold: number;
  color: string;
  label?: string;
}

const DEFAULT_LEVELS: BatteryLevel[] = [
  { threshold: 20, color: '#ef4444', label: 'Critical' },
  { threshold: 40, color: '#f97316', label: 'Low' },
  { threshold: 60, color: '#fbbf24', label: 'Medium' },
  { threshold: 80, color: '#84cc16', label: 'Good' },
  { threshold: 100, color: '#10b981', label: 'Full' },
];

export const BatteryChart: React.FC<BaseChartProps> = ({
  data,
  config,
  theme,
  dimensions,
  onEvent,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">Error loading chart: {error.message}</div>
      </div>
    );
  }

  if (!data?.series || data.series.length === 0 || !data.series[0].data[0]) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No data available
      </div>
    );
  }

  const value = data.series[0].data[0].y || 0;
  const min = config.yAxis?.min || 0;
  const max = config.yAxis?.max || 100;
  const label = data.series[0].name || config.title || 'Progress';

  // Normalize value to 0-100 range
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  // Determine battery color based on level
  const currentLevel = DEFAULT_LEVELS.find(level => percentage <= level.threshold) || DEFAULT_LEVELS[DEFAULT_LEVELS.length - 1];

  // Battery dimensions
  const batteryWidth = 200;
  const batteryHeight = 100;
  const batteryRx = 8;
  const terminalWidth = 10;
  const terminalHeight = 30;
  const borderWidth = 4;
  const innerPadding = 6;

  // Calculate fill width
  const fillWidth = (batteryWidth - (borderWidth * 2) - (innerPadding * 2)) * (percentage / 100);

  // Orientation
  const isVertical = config.orientation === 'vertical';

  const handleClick = () => {
    if (onEvent && config.interactivity?.clickable) {
      onEvent({
        type: 'click',
        data: { value, percentage, label },
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      {/* Title */}
      {config.title && (
        <h3
          className="mb-4 font-semibold text-center"
          style={{
            fontSize: theme?.fonts.title.size || 16,
            color: theme?.fonts.title.color || '#111827',
            fontFamily: theme?.fonts.title.family,
          }}
        >
          {config.title}
        </h3>
      )}

      {isVertical ? (
        // Vertical Battery
        <svg
          width={batteryHeight + 40}
          height={batteryWidth + 40}
          viewBox={`0 0 ${batteryHeight + 40} ${batteryWidth + 40}`}
          className="max-w-full cursor-pointer"
          onClick={handleClick}
        >
          {/* Battery terminal (top) */}
          <rect
            x={(batteryHeight + 40 - terminalHeight) / 2}
            y={10}
            width={terminalHeight}
            height={terminalWidth}
            rx={2}
            fill={theme?.colors.borders || '#9ca3af'}
          />

          {/* Battery body */}
          <rect
            x={20}
            y={20 + terminalWidth}
            width={batteryHeight}
            height={batteryWidth}
            rx={batteryRx}
            fill={theme?.colors.background || '#f3f4f6'}
            stroke={theme?.colors.borders || '#9ca3af'}
            strokeWidth={borderWidth}
          />

          {/* Battery fill - from bottom to top */}
          <rect
            x={20 + borderWidth + innerPadding}
            y={20 + terminalWidth + batteryWidth - fillWidth - borderWidth - innerPadding}
            width={batteryHeight - (borderWidth * 2) - (innerPadding * 2)}
            height={fillWidth}
            rx={batteryRx - 4}
            fill={currentLevel.color}
            opacity={0.9}
          />

          {/* Percentage text */}
          <text
            x={(batteryHeight + 40) / 2}
            y={20 + terminalWidth + batteryWidth / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={theme?.fonts.title.color || '#111827'}
            fontSize="20"
            fontWeight="bold"
            fontFamily={theme?.fonts.title.family}
          >
            {percentage.toFixed(0)}%
          </text>
        </svg>
      ) : (
        // Horizontal Battery
        <svg
          width={batteryWidth + 40}
          height={batteryHeight + 40}
          viewBox={`0 0 ${batteryWidth + 40} ${batteryHeight + 40}`}
          className="max-w-full cursor-pointer"
          onClick={handleClick}
        >
          {/* Battery body */}
          <rect
            x={20}
            y={20}
            width={batteryWidth}
            height={batteryHeight}
            rx={batteryRx}
            fill={theme?.colors.background || '#f3f4f6'}
            stroke={theme?.colors.borders || '#9ca3af'}
            strokeWidth={borderWidth}
          />

          {/* Battery terminal (right side) */}
          <rect
            x={20 + batteryWidth}
            y={20 + (batteryHeight - terminalHeight) / 2}
            width={terminalWidth}
            height={terminalHeight}
            rx={2}
            fill={theme?.colors.borders || '#9ca3af'}
          />

          {/* Battery fill - from left to right */}
          <rect
            x={20 + borderWidth + innerPadding}
            y={20 + borderWidth + innerPadding}
            width={fillWidth}
            height={batteryHeight - (borderWidth * 2) - (innerPadding * 2)}
            rx={batteryRx - 4}
            fill={currentLevel.color}
            opacity={0.9}
          />

          {/* Percentage text */}
          <text
            x={20 + batteryWidth / 2}
            y={20 + batteryHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={theme?.fonts.title.color || '#111827'}
            fontSize="24"
            fontWeight="bold"
            fontFamily={theme?.fonts.title.family}
          >
            {percentage.toFixed(0)}%
          </text>
        </svg>
      )}

      {/* Value and label */}
      <div className="mt-4 text-center">
        {config.showValues && (
          <div
            className="font-semibold"
            style={{
              fontSize: theme?.fonts.title.size || 14,
              color: theme?.fonts.title.color || '#111827',
              fontFamily: theme?.fonts.title.family,
            }}
          >
            {value.toFixed(config.numberFormat ? 1 : 0)} / {max}
          </div>
        )}
        <div
          className="text-sm mt-1"
          style={{
            color: theme?.fonts.axis.color || '#6b7280',
            fontFamily: theme?.fonts.axis.family,
          }}
        >
          {label}
        </div>
      </div>

      {/* Legend for levels */}
      {config.legend?.show !== false && (
        <div className="flex items-center justify-center flex-wrap gap-3 mt-4">
          {DEFAULT_LEVELS.map((level, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: level.color }}
              />
              <span
                className="text-xs"
                style={{
                  color: theme?.fonts.legend.color || '#6b7280',
                  fontFamily: theme?.fonts.legend.family,
                }}
              >
                {level.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
