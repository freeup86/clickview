/**
 * Gauge Chart Component
 *
 * Displays a single value on a circular gauge with configurable ranges.
 * Ideal for KPIs, performance metrics, and progress indicators.
 */

import React, { useMemo } from 'react';
import { BaseChartProps } from '../../types/charts';

interface GaugeRange {
  min: number;
  max: number;
  color: string;
  label?: string;
}

const DEFAULT_RANGES: GaugeRange[] = [
  { min: 0, max: 33, color: '#ef4444', label: 'Low' },
  { min: 33, max: 66, color: '#fbbf24', label: 'Medium' },
  { min: 66, max: 100, color: '#10b981', label: 'High' },
];

export const GaugeChart: React.FC<BaseChartProps> = ({
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
  const label = data.series[0].name || config.title || 'Gauge';

  // Normalize value to 0-1 range
  const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Gauge configuration
  const startAngle = config.startAngle || -135;
  const endAngle = config.startAngle !== undefined ? config.startAngle + 270 : 135;
  const radius = 120;
  const innerRadius = config.innerRadius || 80;
  const centerX = 150;
  const centerY = 150;

  // Calculate needle angle
  const needleAngle = startAngle + normalizedValue * (endAngle - startAngle);

  // Get ranges (use custom or default)
  const ranges = DEFAULT_RANGES;

  // Determine current range and color
  const currentRange = ranges.find(r => value >= r.min && value < r.max) || ranges[ranges.length - 1];

  // Helper to convert degrees to radians
  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  // Helper to get arc path
  const getArcPath = (startDeg: number, endDeg: number, outerR: number, innerR: number) => {
    const startRad = degToRad(startDeg);
    const endRad = degToRad(endDeg);

    const x1 = centerX + outerR * Math.cos(startRad);
    const y1 = centerY + outerR * Math.sin(startRad);
    const x2 = centerX + outerR * Math.cos(endRad);
    const y2 = centerY + outerR * Math.sin(endRad);
    const x3 = centerX + innerR * Math.cos(endRad);
    const y3 = centerY + innerR * Math.sin(endRad);
    const x4 = centerX + innerR * Math.cos(startRad);
    const y4 = centerY + innerR * Math.sin(startRad);

    const largeArc = endDeg - startDeg > 180 ? 1 : 0;

    return `
      M ${x1} ${y1}
      A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;
  };

  // Calculate tick marks
  const tickCount = 10;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const angle = startAngle + (i / tickCount) * (endAngle - startAngle);
    const tickValue = min + (i / tickCount) * (max - min);
    return { angle, value: tickValue };
  });

  // Needle coordinates
  const needleLength = innerRadius - 10;
  const needleX = centerX + needleLength * Math.cos(degToRad(needleAngle));
  const needleY = centerY + needleLength * Math.sin(degToRad(needleAngle));

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      {/* Title */}
      {config.title && (
        <h3
          className="mb-4 font-semibold"
          style={{
            fontSize: theme?.fonts.title.size || 16,
            color: theme?.fonts.title.color || '#111827',
            fontFamily: theme?.fonts.title.family,
          }}
        >
          {config.title}
        </h3>
      )}

      <svg width="300" height="220" viewBox="0 0 300 220" className="max-w-full">
        {/* Background arc segments for ranges */}
        {ranges.map((range, index) => {
          const rangeStartAngle = startAngle + ((range.min - min) / (max - min)) * (endAngle - startAngle);
          const rangeEndAngle = startAngle + ((range.max - min) / (max - min)) * (endAngle - startAngle);

          return (
            <path
              key={index}
              d={getArcPath(rangeStartAngle, rangeEndAngle, radius, innerRadius)}
              fill={range.color}
              opacity={theme?.opacity || 0.3}
              stroke={theme?.colors.background || '#fff'}
              strokeWidth="2"
            />
          );
        })}

        {/* Tick marks */}
        {ticks.map((tick, index) => {
          const tickAngle = degToRad(tick.angle);
          const tickStartX = centerX + (innerRadius - 10) * Math.cos(tickAngle);
          const tickStartY = centerY + (innerRadius - 10) * Math.sin(tickAngle);
          const tickEndX = centerX + (innerRadius - 5) * Math.cos(tickAngle);
          const tickEndY = centerY + (innerRadius - 5) * Math.sin(tickAngle);

          const labelX = centerX + (innerRadius - 25) * Math.cos(tickAngle);
          const labelY = centerY + (innerRadius - 25) * Math.sin(tickAngle);

          return (
            <g key={index}>
              <line
                x1={tickStartX}
                y1={tickStartY}
                x2={tickEndX}
                y2={tickEndY}
                stroke={theme?.colors.text || '#6b7280'}
                strokeWidth="2"
              />
              {index % 2 === 0 && (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={theme?.fonts.axis.color || '#6b7280'}
                  fontSize={theme?.fonts.axis.size || 10}
                  fontFamily={theme?.fonts.axis.family}
                >
                  {tick.value.toFixed(0)}
                </text>
              )}
            </g>
          );
        })}

        {/* Needle */}
        <g>
          {/* Needle shadow for depth */}
          <line
            x1={centerX}
            y1={centerY}
            x2={needleX + 2}
            y2={needleY + 2}
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Main needle */}
          <line
            x1={centerX}
            y1={centerY}
            x2={needleX}
            y2={needleY}
            stroke={currentRange?.color || '#3b82f6'}
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Needle center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r="8"
            fill={currentRange?.color || '#3b82f6'}
            stroke={theme?.colors.background || '#fff'}
            strokeWidth="2"
          />
        </g>

        {/* Value display */}
        <text
          x={centerX}
          y={centerY + 40}
          textAnchor="middle"
          fill={theme?.fonts.title.color || '#111827'}
          fontSize="24"
          fontWeight="bold"
          fontFamily={theme?.fonts.title.family}
        >
          {value.toFixed(config.numberFormat ? 1 : 0)}
        </text>

        {/* Label */}
        <text
          x={centerX}
          y={centerY + 60}
          textAnchor="middle"
          fill={theme?.fonts.axis.color || '#6b7280'}
          fontSize={theme?.fonts.axis.size || 12}
          fontFamily={theme?.fonts.axis.family}
        >
          {label}
        </text>
      </svg>

      {/* Legend for ranges */}
      {config.legend?.show !== false && (
        <div className="flex items-center justify-center space-x-4 mt-4">
          {ranges.map((range, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: range.color }}
              />
              <span
                className="text-xs"
                style={{
                  color: theme?.fonts.legend.color || '#6b7280',
                  fontFamily: theme?.fonts.legend.family,
                }}
              >
                {range.label || `${range.min}-${range.max}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
