/**
 * Combo Chart Component
 *
 * Combines multiple chart types (line, bar, area) in a single visualization.
 * Useful for showing different data types or metrics on the same axes.
 */

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BaseChartProps, ChartType } from '../../types/charts';

export const ComboChartComponent: React.FC<BaseChartProps> = ({
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

  // Render appropriate chart element based on series type
  const renderChartElement = (series: any, index: number) => {
    const color = series.color || colors[index % colors.length];
    const seriesType = series.type || ChartType.LINE;
    const yAxisId = series.yAxisId || 'left';

    const commonProps = {
      key: series.name,
      dataKey: series.name,
      yAxisId,
      animationDuration: config.animation?.enabled !== false
        ? config.animation?.duration ?? theme?.animationDuration ?? 1000
        : 0,
      animationEasing: config.animation?.easing || theme?.animationEasing,
    };

    switch (seriesType) {
      case ChartType.BAR:
      case ChartType.COLUMN:
        return (
          <Bar
            {...commonProps}
            fill={color}
            fillOpacity={config.opacity ?? theme?.opacity ?? 0.8}
          />
        );

      case ChartType.AREA:
        return (
          <Area
            {...commonProps}
            type="monotone"
            fill={color}
            stroke={color}
            fillOpacity={config.opacity ?? theme?.opacity ?? 0.3}
            strokeWidth={theme?.strokeWidth || 2}
          />
        );

      case ChartType.LINE:
      default:
        return (
          <Line
            {...commonProps}
            type="monotone"
            stroke={color}
            strokeWidth={theme?.strokeWidth || 2}
            dot={{ fill: color, r: 4 }}
            activeDot={{ r: 6 }}
          />
        );
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

  // Check if we need a second Y-axis
  const hasSecondaryAxis = data.series.some((s) => s.yAxisId === 'right');

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={chartData}
        onClick={handleClick}
        margin={{ top: 10, right: hasSecondaryAxis ? 30 : 10, left: 0, bottom: 0 }}
      >
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
          yAxisId="left"
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

        {hasSecondaryAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: theme?.fonts.axis.color || '#6b7280' }}
            tickLine={{ stroke: theme?.colors.gridLines || '#e5e7eb' }}
            label={
              config.yAxis2?.label
                ? {
                    value: config.yAxis2.label,
                    angle: 90,
                    position: 'insideRight',
                  }
                : undefined
            }
            domain={[
              config.yAxis2?.min ?? 'auto',
              config.yAxis2?.max ?? 'auto',
            ]}
          />
        )}

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

        {data.series.map((series, index) => renderChartElement(series, index))}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default ComboChartComponent;
