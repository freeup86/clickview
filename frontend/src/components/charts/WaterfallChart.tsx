/**
 * Waterfall Chart Component
 *
 * Visualizes cumulative effect of sequential positive and negative values.
 * Ideal for financial statements, profit/loss analysis, and inventory flow.
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { BaseChartProps } from '../../types/charts';

interface WaterfallDataPoint {
  name: string;
  value: number;
  start: number;
  end: number;
  isTotal?: boolean;
  isSubtotal?: boolean;
}

const DEFAULT_COLORS = {
  positive: '#10b981',
  negative: '#ef4444',
  total: '#3b82f6',
  subtotal: '#8b5cf6',
};

export const WaterfallChart: React.FC<BaseChartProps> = ({
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

  // Transform data for waterfall chart
  const waterfallData: WaterfallDataPoint[] = useMemo(() => {
    const points: WaterfallDataPoint[] = [];
    let cumulative = 0;

    data.series[0].data.forEach((point, index) => {
      const value = point.y || 0;
      const isTotal = point.isTotal || false;
      const isSubtotal = point.isSubtotal || false;

      const start = isTotal || isSubtotal ? 0 : cumulative;
      const end = isTotal || isSubtotal ? cumulative + value : cumulative + value;

      points.push({
        name: point.x || point.name || `Item ${index + 1}`,
        value: Math.abs(value),
        start: Math.min(start, end),
        end: Math.max(start, end),
        isTotal,
        isSubtotal,
      });

      cumulative = end;
    });

    return points;
  }, [data]);

  const getBarColor = (point: WaterfallDataPoint): string => {
    if (point.isTotal) return DEFAULT_COLORS.total;
    if (point.isSubtotal) return DEFAULT_COLORS.subtotal;
    return point.end >= point.start ? DEFAULT_COLORS.positive : DEFAULT_COLORS.negative;
  };

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

    const point = payload[0].payload;
    const value = point.end - point.start;

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
          className="font-semibold mb-1"
          style={{ color: theme?.fonts.tooltip.color || '#111827' }}
        >
          {point.name}
        </p>
        <p
          className="text-sm"
          style={{ color: theme?.fonts.tooltip.color || '#6b7280' }}
        >
          {point.isTotal ? 'Total' : point.isSubtotal ? 'Subtotal' : 'Change'}: {' '}
          <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
            {value >= 0 ? '+' : ''}{value.toLocaleString()}
          </span>
        </p>
        <p
          className="text-sm"
          style={{ color: theme?.fonts.tooltip.color || '#6b7280' }}
        >
          Running Total: {point.end.toLocaleString()}
        </p>
      </div>
    );
  };

  // Prepare data for Recharts
  const chartData = waterfallData.map(point => ({
    ...point,
    hidden: [point.start, point.end - point.start],
  }));

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={dimensions?.margin || { top: 20, right: 30, left: 20, bottom: 60 }}
          onClick={handleClick}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme?.colors.gridLines || '#e5e7eb'}
            opacity={0.5}
          />

          <XAxis
            dataKey="name"
            label={config.xAxis?.label ? {
              value: config.xAxis.label,
              position: 'insideBottom',
              offset: -10,
            } : undefined}
            tick={{
              fill: theme?.fonts.axis.color || '#6b7280',
              fontSize: theme?.fonts.axis.size || 12,
            }}
            stroke={theme?.colors.text || '#9ca3af'}
            angle={-45}
            textAnchor="end"
            height={80}
          />

          <YAxis
            label={config.yAxis?.label ? {
              value: config.yAxis.label,
              angle: -90,
              position: 'insideLeft',
            } : undefined}
            tick={{
              fill: theme?.fonts.axis.color || '#6b7280',
              fontSize: theme?.fonts.axis.size || 12,
            }}
            stroke={theme?.colors.text || '#9ca3af'}
          />

          <ReferenceLine y={0} stroke={theme?.colors.text || '#6b7280'} />

          {config.tooltip?.enabled !== false && <Tooltip content={<CustomTooltip />} />}

          {config.legend?.show !== false && (
            <Legend
              wrapperStyle={{ fontSize: theme?.fonts.legend.size || 12 }}
              verticalAlign={config.legend?.position === 'bottom' ? 'bottom' : 'top'}
              align={config.legend?.align || 'center'}
            />
          )}

          {/* Invisible bar to create spacing from bottom */}
          <Bar
            dataKey="start"
            stackId="a"
            fill="transparent"
            isAnimationActive={false}
          />

          {/* Actual visible bar */}
          <Bar
            dataKey="value"
            stackId="a"
            animationDuration={config.animation?.duration || theme?.animationDuration || 800}
            isAnimationActive={config.animation?.enabled !== false}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry)}
                opacity={theme?.opacity || 0.85}
                className={config.interactivity?.clickable ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}
              />
            ))}
          </Bar>

          {/* Connecting lines */}
          {chartData.map((entry, index) => {
            if (index === chartData.length - 1) return null;
            const nextEntry = chartData[index + 1];

            return (
              <ReferenceLine
                key={`connector-${index}`}
                segment={[
                  { x: index + 0.5, y: entry.end },
                  { x: index + 0.5, y: nextEntry.start },
                ]}
                stroke={theme?.colors.gridLines || '#9ca3af'}
                strokeDasharray="3 3"
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
