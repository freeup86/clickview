/**
 * Violin Chart Component
 *
 * Combines box plot with kernel density plot to show data distribution.
 * Ideal for comparing distributions across categories.
 */

import React, { useMemo } from 'react';
import { BaseChartProps } from '../../types/charts';

interface ViolinData {
  name: string;
  values: number[];
  density: { value: number; density: number }[];
  quartiles: {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
  };
}

const DEFAULT_COLOR = '#8b5cf6';

export const ViolinChart: React.FC<BaseChartProps> = ({
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

  // Calculate kernel density estimation
  const kernelDensity = (values: number[], bandwidth: number, steps: number = 50) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const step = (max - min) / steps;
    const density: { value: number; density: number }[] = [];

    for (let i = 0; i <= steps; i++) {
      const x = min + i * step;
      let sum = 0;

      for (const value of values) {
        const u = (x - value) / bandwidth;
        // Gaussian kernel
        sum += Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
      }

      density.push({
        value: x,
        density: sum / (values.length * bandwidth),
      });
    }

    return density;
  };

  // Transform data to violin format
  const violinData: ViolinData[] = useMemo(() => {
    return data.series.map((series) => {
      const values = series.data.map(d => d.y || 0).sort((a, b) => a - b);
      const bandwidth = (Math.max(...values) - Math.min(...values)) / 10;

      const q1Index = Math.floor(values.length * 0.25);
      const medianIndex = Math.floor(values.length * 0.5);
      const q3Index = Math.floor(values.length * 0.75);

      return {
        name: series.name,
        values,
        density: kernelDensity(values, bandwidth),
        quartiles: {
          min: values[0],
          q1: values[q1Index],
          median: values[medianIndex],
          q3: values[q3Index],
          max: values[values.length - 1],
        },
      };
    });
  }, [data]);

  // Calculate scale
  const globalMin = Math.min(...violinData.flatMap(d => d.values));
  const globalMax = Math.max(...violinData.flatMap(d => d.values));
  const maxDensity = Math.max(...violinData.flatMap(d => d.density.map(p => p.density)));

  const chartHeight = 400;
  const chartWidth = 600;
  const plotHeight = chartHeight - 100;
  const plotWidth = chartWidth - 120;
  const violinWidth = Math.min(80, plotWidth / violinData.length - 20);

  const scale = (value: number) => {
    return plotHeight - ((value - globalMin) / (globalMax - globalMin)) * plotHeight + 40;
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
          const value = globalMin + ratio * (globalMax - globalMin);
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

        {/* Violins */}
        {violinData.map((violin, index) => {
          const x = 60 + (index + 0.5) * (plotWidth / violinData.length);
          const color = colors[index % colors.length];

          // Create violin path (mirrored density curve)
          const leftPath = violin.density.map((point, i) => {
            const y = scale(point.value);
            const width = (point.density / maxDensity) * (violinWidth / 2);
            return i === 0
              ? `M ${x - width} ${y}`
              : `L ${x - width} ${y}`;
          }).join(' ');

          const rightPath = violin.density.slice().reverse().map((point) => {
            const y = scale(point.value);
            const width = (point.density / maxDensity) * (violinWidth / 2);
            return `L ${x + width} ${y}`;
          }).join(' ');

          const violinPath = `${leftPath} ${rightPath} Z`;

          return (
            <g key={index}>
              {/* Violin shape */}
              <path
                d={violinPath}
                fill={color}
                fillOpacity={theme?.opacity || 0.4}
                stroke={color}
                strokeWidth="1"
              />

              {/* Box plot inside violin */}
              <line
                x1={x}
                y1={scale(violin.quartiles.min)}
                x2={x}
                y2={scale(violin.quartiles.max)}
                stroke={color}
                strokeWidth="1"
                opacity={0.5}
              />

              <rect
                x={x - 4}
                y={scale(violin.quartiles.q3)}
                width={8}
                height={scale(violin.quartiles.q1) - scale(violin.quartiles.q3)}
                fill={color}
                fillOpacity={0.8}
              />

              <line
                x1={x - 6}
                y1={scale(violin.quartiles.median)}
                x2={x + 6}
                y2={scale(violin.quartiles.median)}
                stroke="white"
                strokeWidth="2"
              />

              {/* X-axis label */}
              <text
                x={x}
                y={plotHeight + 60}
                textAnchor="middle"
                fill={theme?.fonts.axis.color || '#6b7280'}
                fontSize={theme?.fonts.axis.size || 11}
                fontFamily={theme?.fonts.axis.family}
              >
                {violin.name}
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
      </svg>
    </div>
  );
};
