/**
 * Radar/Spider Chart Component
 *
 * Displays multivariate data on axes starting from the same point.
 * Ideal for skill assessments, performance comparisons, and competitive analysis.
 */

import React from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { BaseChartProps } from '../../types/charts';

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
];

export const RadarChartComponent: React.FC<BaseChartProps> = ({
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

  // Transform data for radar chart
  const chartData = data.series[0].data.map((point, index) => {
    const item: any = { subject: point.x || point.name || data.categories?.[index] };
    data.series.forEach((series) => {
      item[series.name] = series.data[index]?.y || 0;
    });
    return item;
  });

  const colors = config.colors?.palette || theme?.colors.primary || DEFAULT_COLORS;

  const handleClick = (dataPoint: any) => {
    if (config.interactivity?.clickable && onEvent) {
      onEvent({
        type: 'click',
        data: dataPoint,
      });
    }
  };

  const CustomTooltip: React.FC<any> = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;

    return (
      <div
        className="p-3 shadow-lg rounded"
        style={{
          backgroundColor: theme?.colors.background || 'white',
          border: `1px solid ${theme?.colors.borders || '#e5e7eb'}`,
          borderRadius: theme?.borderRadius || 8,
        }}
      >
        <p
          className="font-semibold mb-2"
          style={{ color: theme?.fonts.tooltip.color || '#111827' }}
        >
          {payload[0].payload.subject}
        </p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-sm"
            style={{ color: entry.color }}
          >
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart
          data={chartData}
          margin={dimensions?.margin || { top: 20, right: 30, left: 20, bottom: 20 }}
          onClick={handleClick}
        >
          <PolarGrid
            stroke={theme?.colors.gridLines || '#e5e7eb'}
            strokeDasharray="3 3"
          />

          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: theme?.fonts.axis.color || '#6b7280',
              fontSize: theme?.fonts.axis.size || 12,
              fontFamily: theme?.fonts.axis.family,
            }}
            stroke={theme?.colors.text || '#9ca3af'}
          />

          <PolarRadiusAxis
            angle={90}
            domain={config.yAxis?.min !== undefined || config.yAxis?.max !== undefined
              ? [config.yAxis?.min || 0, config.yAxis?.max || 'auto']
              : undefined}
            tick={{
              fill: theme?.fonts.axis.color || '#6b7280',
              fontSize: theme?.fonts.axis.size || 10,
            }}
            stroke={theme?.colors.text || '#9ca3af'}
          />

          {config.tooltip?.enabled !== false && <Tooltip content={<CustomTooltip />} />}

          {config.legend?.show !== false && (
            <Legend
              wrapperStyle={{ fontSize: theme?.fonts.legend.size || 12 }}
              verticalAlign={config.legend?.position === 'bottom' ? 'bottom' : 'top'}
              align={config.legend?.align || 'center'}
            />
          )}

          {data.series.map((series, index) => (
            <Radar
              key={series.name}
              name={series.name}
              dataKey={series.name}
              stroke={series.color || colors[index % colors.length]}
              fill={series.color || colors[index % colors.length]}
              fillOpacity={theme?.opacity || 0.3}
              strokeWidth={theme?.strokeWidth || 2}
              dot={config.showValues ? { fill: series.color || colors[index % colors.length], r: 4 } : false}
              animationDuration={config.animation?.duration || theme?.animationDuration || 1000}
              isAnimationActive={config.animation?.enabled !== false}
            />
          ))}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
};
