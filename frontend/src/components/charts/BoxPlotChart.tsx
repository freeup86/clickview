/**
 * Box Plot Chart Component
 *
 * Displays distribution of data through quartiles.
 * Ideal for statistical analysis, outlier detection, and data comparison.
 */

import React, { useMemo } from 'react';
import { BaseChartProps } from '../../types/charts';

interface BoxPlotData {
  name: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers?: number[];
  mean?: number;
}

const DEFAULT_COLOR = '#3b82f6';

export const BoxPlotChart: React.FC<BaseChartProps> = ({
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

  if (!data?.series || data.series.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No data available
      </div>
    );
  }

  // Transform data to box plot format
  const boxPlotData: BoxPlotData[] = useMemo(() => {
    return data.series.map((series) => {
      const values = series.data.map(d => d.y || 0).sort((a, b) => a - b);

      const q1Index = Math.floor(values.length * 0.25);
      const medianIndex = Math.floor(values.length * 0.5);
      const q3Index = Math.floor(values.length * 0.75);

      const q1 = values[q1Index];
      const median = values[medianIndex];
      const q3 = values[q3Index];
      const iqr = q3 - q1;

      // Calculate outlier thresholds
      const lowerFence = q1 - 1.5 * iqr;
      const upperFence = q3 + 1.5 * iqr;

      // Find min/max within fences
      const min = values.find(v => v >= lowerFence) || values[0];
      const max = [...values].reverse().find(v => v <= upperFence) || values[values.length - 1];

      // Find outliers
      const outliers = values.filter(v => v < lowerFence || v > upperFence);

      // Calculate mean
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

      return {
        name: series.name,
        min,
        q1,
        median,
        q3,
        max,
        outliers,
        mean,
      };
    });
  }, [data]);

  // Calculate scale
  const globalMin = Math.min(...boxPlotData.map(d => Math.min(d.min, ...d.outliers || [])));
  const globalMax = Math.max(...boxPlotData.map(d => Math.max(d.max, ...d.outliers || [])));
  const range = globalMax - globalMin;
  const padding = range * 0.1;

  const chartHeight = 400;
  const chartWidth = 600;
  const plotHeight = chartHeight - 100;
  const plotWidth = chartWidth - 120;
  const boxWidth = Math.min(60, plotWidth / boxPlotData.length - 20);

  const scale = (value: number) => {
    return plotHeight - ((value - globalMin + padding) / (range + 2 * padding)) * plotHeight + 40;
  };

  const colors = config.colors?.palette || theme?.colors.primary || [DEFAULT_COLOR];

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      {config.title && (
        <h3
          className="text-center mb-4 font-semibold absolute top-4"
          style={{
            fontSize: theme?.fonts.title.size || 16,
            color: theme?.fonts.title.color || '#111827',
            fontFamily: theme?.fonts.title.family,
          }}
        >
          {config.title}
        </h3>
      )}

      <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="max-w-full">
        {/* Y-axis */}
        <line
          x1={60}
          y1={40}
          x2={60}
          y2={plotHeight + 40}
          stroke={theme?.colors.text || '#9ca3af'}
          strokeWidth="1"
        />

        {/* Grid lines and labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const value = globalMin - padding + ratio * (range + 2 * padding);
          const y = scale(value);

          return (
            <g key={index}>
              <line
                x1={60}
                y1={y}
                x2={plotWidth + 60}
                y2={y}
                stroke={theme?.colors.gridLines || '#e5e7eb'}
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <text
                x={50}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fill={theme?.fonts.axis.color || '#6b7280'}
                fontSize={theme?.fonts.axis.size || 10}
                fontFamily={theme?.fonts.axis.family}
              >
                {value.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Box plots */}
        {boxPlotData.map((box, index) => {
          const x = 60 + (index + 0.5) * (plotWidth / boxPlotData.length);
          const color = colors[index % colors.length];

          return (
            <g key={index}>
              {/* Whisker lines */}
              <line
                x1={x}
                y1={scale(box.min)}
                x2={x}
                y2={scale(box.q1)}
                stroke={color}
                strokeWidth="2"
              />
              <line
                x1={x}
                y1={scale(box.q3)}
                x2={x}
                y2={scale(box.max)}
                stroke={color}
                strokeWidth="2"
              />

              {/* Whisker caps */}
              <line
                x1={x - 10}
                y1={scale(box.min)}
                x2={x + 10}
                y2={scale(box.min)}
                stroke={color}
                strokeWidth="2"
              />
              <line
                x1={x - 10}
                y1={scale(box.max)}
                x2={x + 10}
                y2={scale(box.max)}
                stroke={color}
                strokeWidth="2"
              />

              {/* Box */}
              <rect
                x={x - boxWidth / 2}
                y={scale(box.q3)}
                width={boxWidth}
                height={scale(box.q1) - scale(box.q3)}
                fill={color}
                fillOpacity={theme?.opacity || 0.3}
                stroke={color}
                strokeWidth="2"
                rx={theme?.borderRadius || 0}
              />

              {/* Median line */}
              <line
                x1={x - boxWidth / 2}
                y1={scale(box.median)}
                x2={x + boxWidth / 2}
                y2={scale(box.median)}
                stroke={color}
                strokeWidth="3"
              />

              {/* Mean marker (optional) */}
              {config.showValues && box.mean !== undefined && (
                <circle
                  cx={x}
                  cy={scale(box.mean)}
                  r="4"
                  fill={color}
                  stroke={theme?.colors.background || '#fff'}
                  strokeWidth="2"
                />
              )}

              {/* Outliers */}
              {box.outliers?.map((outlier, oIndex) => (
                <circle
                  key={oIndex}
                  cx={x + (Math.random() - 0.5) * 10}
                  cy={scale(outlier)}
                  r="3"
                  fill={color}
                  opacity={0.6}
                />
              ))}

              {/* X-axis label */}
              <text
                x={x}
                y={plotHeight + 60}
                textAnchor="middle"
                fill={theme?.fonts.axis.color || '#6b7280'}
                fontSize={theme?.fonts.axis.size || 11}
                fontFamily={theme?.fonts.axis.family}
              >
                {box.name}
              </text>
            </g>
          );
        })}

        {/* X-axis */}
        <line
          x1={60}
          y1={plotHeight + 40}
          x2={plotWidth + 60}
          y2={plotHeight + 40}
          stroke={theme?.colors.text || '#9ca3af'}
          strokeWidth="1"
        />

        {/* Axis labels */}
        {config.xAxis?.label && (
          <text
            x={chartWidth / 2}
            y={chartHeight - 10}
            textAnchor="middle"
            fill={theme?.fonts.axis.color || '#6b7280'}
            fontSize={theme?.fonts.axis.size || 12}
            fontFamily={theme?.fonts.axis.family}
          >
            {config.xAxis.label}
          </text>
        )}
        {config.yAxis?.label && (
          <text
            x={20}
            y={chartHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, 20, ${chartHeight / 2})`}
            fill={theme?.fonts.axis.color || '#6b7280'}
            fontSize={theme?.fonts.axis.size || 12}
            fontFamily={theme?.fonts.axis.family}
          >
            {config.yAxis.label}
          </text>
        )}
      </svg>
    </div>
  );
};
