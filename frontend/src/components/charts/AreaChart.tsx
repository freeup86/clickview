/**
 * Area Chart Component
 *
 * Supports single and multi-series area charts with stacking options.
 * Built with Recharts for consistent rendering and animations.
 */

import React, { useMemo } from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts';
import { BaseChartProps } from '../../types/charts';

export const AreaChartComponent: React.FC<BaseChartProps> = ({
  data,
  config,
  theme,
  onEvent,
  loading,
  error,
}) => {
  // Transform data to Recharts format
  const chartData = useMemo(() => {
    if (!data.series.length) return [];

    const maxLength = Math.max(...data.series.map((s) => s.data.length));

    return Array.from({ length: maxLength }, (_, index) => {
      const item: any = {
        name: data.categories?.[index] || data.series[0].data[index]?.x || index,
      };

      data.series.forEach((series) => {
        const point = series.data[index];
        item[series.name] = point?.y ?? null;
      });

      return item;
    });
  }, [data]);

  // Determine colors
  const colors = useMemo(() => {
    if (config.colors?.palette) {
      return config.colors.palette;
    }
    if (theme?.colors.primary) {
      return theme.colors.primary;
    }
    return ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  }, [config.colors, theme]);

  // Handle chart events
  const handleClick = (data: any) => {
    if (config.interactivity?.clickable && onEvent) {
      onEvent({
        type: 'click',
        data,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading chart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Error: {error.message}</div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  const isStacked = config.stacked ?? false;
  const showBrush = config.interactivity?.brush ?? false;
  const animationDuration = config.animation?.enabled !== false
    ? config.animation?.duration ?? theme?.animationDuration ?? 1000
    : 0;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsAreaChart
        data={chartData}
        onClick={handleClick}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          {data.series.map((series, index) => {
            const color = series.color || colors[index % colors.length];
            return (
              <linearGradient
                key={`gradient-${series.name}`}
                id={`gradient-${series.name}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            );
          })}
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke={theme?.colors.gridLines || '#e5e7eb'}
        />

        <XAxis
          dataKey="name"
          tick={{ fill: theme?.fonts.axis.color || '#6b7280' }}
          tickLine={{ stroke: theme?.colors.gridLines || '#e5e7eb' }}
          label={
            config.xAxis?.label
              ? {
                  value: config.xAxis.label,
                  position: 'insideBottom',
                  offset: -5,
                }
              : undefined
          }
        />

        <YAxis
          tick={{ fill: theme?.fonts.axis.color || '#6b7280' }}
          tickLine={{ stroke: theme?.colors.gridLines || '#e5e7eb' }}
          label={
            config.yAxis?.label
              ? {
                  value: config.yAxis.label,
                  angle: -90,
                  position: 'insideLeft',
                }
              : undefined
          }
          domain={[
            config.yAxis?.min ?? 'auto',
            config.yAxis?.max ?? 'auto',
          ]}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: theme?.colors.background || '#ffffff',
            border: `1px solid ${theme?.colors.borders || '#d1d5db'}`,
            borderRadius: theme?.borderRadius || 8,
          }}
          labelStyle={{
            color: theme?.fonts.tooltip.color || '#111827',
            fontWeight: theme?.fonts.tooltip.weight || 600,
          }}
        />

        {config.legend?.show !== false && (
          <Legend
            verticalAlign={
              config.legend?.position === 'bottom' || config.legend?.position === 'top'
                ? config.legend.position
                : 'top'
            }
            wrapperStyle={{
              color: theme?.fonts.legend.color || '#374151',
            }}
          />
        )}

        {data.series.map((series, index) => {
          const color = series.color || colors[index % colors.length];
          return (
            <Area
              key={series.name}
              type="monotone"
              dataKey={series.name}
              stroke={color}
              strokeWidth={theme?.strokeWidth || config.strokeWidth || 2}
              fill={`url(#gradient-${series.name})`}
              fillOpacity={config.opacity ?? theme?.opacity ?? 0.6}
              stackId={isStacked ? 'stack' : undefined}
              animationDuration={animationDuration}
              animationEasing={config.animation?.easing || theme?.animationEasing}
              dot={false}
              activeDot={{
                r: 6,
                fill: color,
                stroke: theme?.colors.background || '#ffffff',
                strokeWidth: 2,
              }}
            />
          );
        })}

        {showBrush && (
          <Brush
            dataKey="name"
            height={30}
            stroke={theme?.colors.borders || '#d1d5db'}
          />
        )}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
};

export default AreaChartComponent;
