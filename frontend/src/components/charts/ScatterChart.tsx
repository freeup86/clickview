/**
 * Scatter Chart Component
 *
 * Displays data points as individual dots to show relationships between variables.
 * Supports multiple series, bubble sizes, and clustering visualization.
 */

import React, { useMemo } from 'react';
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
  Cell,
} from 'recharts';
import { BaseChartProps } from '../../types/charts';

export const ScatterChartComponent: React.FC<BaseChartProps> = ({
  data,
  config,
  theme,
  onEvent,
  loading,
  error,
}) => {
  // Transform data to Recharts scatter format
  const chartData = useMemo(() => {
    return data.series.map((series) => ({
      name: series.name,
      data: series.data.map((point) => ({
        x: point.x ?? 0,
        y: point.y ?? 0,
        z: point.z ?? 1, // For bubble size
        ...point, // Include any additional fields
      })),
    }));
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

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0].payload;
    return (
      <div
        style={{
          backgroundColor: theme?.colors.background || '#ffffff',
          border: `1px solid ${theme?.colors.borders || '#d1d5db'}`,
          borderRadius: theme?.borderRadius || 8,
          padding: '8px 12px',
          fontSize: theme?.fonts.tooltip.size || 12,
          color: theme?.fonts.tooltip.color || '#111827',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {payload[0].name || 'Point'}
        </div>
        <div>X: {point.x?.toLocaleString()}</div>
        <div>Y: {point.y?.toLocaleString()}</div>
        {point.z !== undefined && point.z !== 1 && (
          <div>Size: {point.z?.toLocaleString()}</div>
        )}
      </div>
    );
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

  if (!chartData.length || !chartData.some((s) => s.data.length > 0)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  const animationDuration = config.animation?.enabled !== false
    ? config.animation?.duration ?? theme?.animationDuration ?? 1000
    : 0;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsScatterChart
        onClick={handleClick}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={theme?.colors.gridLines || '#e5e7eb'}
        />

        <XAxis
          type="number"
          dataKey="x"
          name={config.xAxis?.label || 'X'}
          tick={{ fill: theme?.fonts.axis.color || '#6b7280' }}
          tickLine={{ stroke: theme?.colors.gridLines || '#e5e7eb' }}
          label={
            config.xAxis?.label
              ? {
                  value: config.xAxis.label,
                  position: 'insideBottom',
                  offset: -10,
                }
              : undefined
          }
          domain={[
            config.xAxis?.min ?? 'auto',
            config.xAxis?.max ?? 'auto',
          ]}
        />

        <YAxis
          type="number"
          dataKey="y"
          name={config.yAxis?.label || 'Y'}
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

        <ZAxis
          type="number"
          dataKey="z"
          range={[50, 400]}
          name="Size"
        />

        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

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

        {chartData.map((series, index) => {
          const color = data.series[index]?.color || colors[index % colors.length];
          return (
            <Scatter
              key={series.name}
              name={series.name}
              data={series.data}
              fill={color}
              fillOpacity={config.opacity ?? theme?.opacity ?? 0.6}
              animationDuration={animationDuration}
              animationEasing={config.animation?.easing || theme?.animationEasing}
            >
              {series.data.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={entry.color || color}
                />
              ))}
            </Scatter>
          );
        })}
      </RechartsScatterChart>
    </ResponsiveContainer>
  );
};

export default ScatterChartComponent;
