/**
 * Bar Chart Component
 *
 * Renders bar charts with support for stacked, grouped, and horizontal orientations
 */

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BaseChartProps } from '../../types/charts';

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
];

export const BarChartComponent: React.FC<BaseChartProps> = ({
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

  // Transform data
  const chartData = data.series[0].data.map((point, index) => {
    const item: any = { name: point.x || data.categories?.[index] };
    data.series.forEach((series) => {
      item[series.name] = series.data[index]?.y;
    });
    return item;
  });

  const colors = config.colors?.palette || theme?.colors.primary || DEFAULT_COLORS;
  const isHorizontal = config.orientation === 'horizontal';

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
      <RechartsBarChart
        data={chartData}
        layout={isHorizontal ? 'vertical' : 'horizontal'}
        margin={dimensions?.margin || { top: 20, right: 30, left: 20, bottom: 20 }}
        onClick={handleClick}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={theme?.colors.gridLines || '#e5e7eb'}
          opacity={0.5}
        />

        {isHorizontal ? (
          <>
            <XAxis
              type="number"
              tick={{ fill: theme?.fonts.axis.color || '#6b7280' }}
              stroke={theme?.colors.text || '#9ca3af'}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: theme?.fonts.axis.color || '#6b7280' }}
              stroke={theme?.colors.text || '#9ca3af'}
              width={100}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="name"
              tick={{ fill: theme?.fonts.axis.color || '#6b7280' }}
              stroke={theme?.colors.text || '#9ca3af'}
            />
            <YAxis
              tick={{ fill: theme?.fonts.axis.color || '#6b7280' }}
              stroke={theme?.colors.text || '#9ca3af'}
            />
          </>
        )}

        {config.tooltip?.enabled !== false && (
          <Tooltip
            contentStyle={{
              backgroundColor: theme?.colors.background || 'white',
              border: `1px solid ${theme?.colors.borders || '#e5e7eb'}`,
              borderRadius: theme?.borderRadius || 8,
            }}
          />
        )}

        {config.legend?.show !== false && (
          <Legend
            wrapperStyle={{ fontSize: theme?.fonts.legend.size || 12 }}
            verticalAlign={config.legend?.position === 'bottom' ? 'bottom' : 'top'}
          />
        )}

        {data.series.map((series, index) => {
          const seriesColor = series.color || colors[index % colors.length];

          return (
            <Bar
              key={series.name}
              dataKey={series.name}
              fill={seriesColor}
              stackId={config.stacked ? '1' : undefined}
              radius={[theme?.borderRadius || 4, theme?.borderRadius || 4, 0, 0]}
              animationDuration={config.animation?.duration || 1000}
              isAnimationActive={config.animation?.enabled !== false}
            >
              {/* Single color bars or gradient */}
              {config.colors?.singleColor && chartData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={config.colors!.singleColor} />
              ))}
            </Bar>
          );
        })}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};
