/**
 * Line Chart Component
 *
 * Renders line charts with support for multiple series, time-series data,
 * and advanced features like area fill, markers, and zoom.
 */

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  Area,
} from 'recharts';
import { BaseChartProps } from '../../types/charts';

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
];

export const LineChartComponent: React.FC<BaseChartProps> = ({
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

  // Transform data for Recharts
  const chartData = data.series[0].data.map((point, index) => {
    const item: any = { name: point.x || data.categories?.[index] };
    data.series.forEach((series) => {
      item[series.name] = series.data[index]?.y;
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

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart
        data={chartData}
        margin={dimensions?.margin || { top: 20, right: 30, left: 20, bottom: 20 }}
        onClick={handleClick}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={theme?.colors.gridLines || '#e5e7eb'}
          opacity={config.xAxis?.gridLines === false ? 0 : 0.5}
        />

        <XAxis
          dataKey="name"
          label={config.xAxis?.label ? { value: config.xAxis.label, position: 'insideBottom', offset: -10 } : undefined}
          tick={{ fill: theme?.fonts.axis.color || '#6b7280', fontSize: theme?.fonts.axis.size || 12 }}
          stroke={theme?.colors.text || '#9ca3af'}
        />

        <YAxis
          label={config.yAxis?.label ? { value: config.yAxis.label, angle: -90, position: 'insideLeft' } : undefined}
          tick={{ fill: theme?.fonts.axis.color || '#6b7280', fontSize: theme?.fonts.axis.size || 12 }}
          stroke={theme?.colors.text || '#9ca3af'}
          domain={config.yAxis?.min !== undefined || config.yAxis?.max !== undefined
            ? [config.yAxis?.min || 'auto', config.yAxis?.max || 'auto']
            : undefined}
        />

        {config.tooltip?.enabled !== false && (
          <Tooltip
            contentStyle={{
              backgroundColor: theme?.colors.background || 'white',
              border: `1px solid ${theme?.colors.borders || '#e5e7eb'}`,
              borderRadius: theme?.borderRadius || 8,
            }}
            labelStyle={{ color: theme?.fonts.tooltip.color || '#111827' }}
          />
        )}

        {config.legend?.show !== false && (
          <Legend
            wrapperStyle={{ fontSize: theme?.fonts.legend.size || 12 }}
            verticalAlign={config.legend?.position === 'bottom' ? 'bottom' : 'top'}
            align={config.legend?.align || 'center'}
          />
        )}

        {config.interactivity?.brush && (
          <Brush dataKey="name" height={30} stroke={colors[0]} />
        )}

        {data.series.map((series, index) => {
          const seriesColor = series.color || colors[index % colors.length];

          // If stacked area is requested, use Area component
          if (config.stacked) {
            return (
              <Area
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stackId="1"
                stroke={seriesColor}
                fill={seriesColor}
                fillOpacity={0.6}
                strokeWidth={theme?.strokeWidth || 2}
                dot={config.showValues ? { fill: seriesColor, r: 4 } : false}
                activeDot={config.interactivity?.hoverable !== false ? { r: 6 } : false}
                animationDuration={config.animation?.duration || theme?.animationDuration || 1000}
                animationEasing={config.animation?.easing || theme?.animationEasing || 'ease'}
                isAnimationActive={config.animation?.enabled !== false}
              />
            );
          }

          return (
            <Line
              key={series.name}
              type="monotone"
              dataKey={series.name}
              stroke={seriesColor}
              strokeWidth={theme?.strokeWidth || 2}
              dot={config.showValues ? { fill: seriesColor, r: 4 } : false}
              activeDot={config.interactivity?.hoverable !== false ? { r: 6 } : false}
              animationDuration={config.animation?.duration || theme?.animationDuration || 1000}
              animationEasing={config.animation?.easing || theme?.animationEasing || 'ease'}
              isAnimationActive={config.animation?.enabled !== false}
            />
          );
        })}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};
