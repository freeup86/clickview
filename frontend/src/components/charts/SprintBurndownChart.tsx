/**
 * Sprint Burndown Chart Component
 *
 * Visualizes remaining work vs ideal burndown line for a single sprint.
 * Helps teams track if they're on pace to complete sprint goals.
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { BaseChartProps } from '../../types/charts';

export const SprintBurndownChart: React.FC<BaseChartProps> = ({
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

  // Transform data for burndown chart
  const transformedData = data.series[0].data.map((item: any) => ({
    date: item.x || item.date || item.day,
    ideal: item.ideal || 0,
    actual: item.actual || item.y || item.remaining || 0,
    completed: item.completed || 0,
  }));

  // Calculate total work
  const totalWork = transformedData[0]?.ideal || transformedData[0]?.actual || 0;
  const currentRemaining = transformedData[transformedData.length - 1]?.actual || 0;
  const onTrack = currentRemaining <= (transformedData[transformedData.length - 1]?.ideal || 0);

  const handlePointClick = (data: any) => {
    if (onEvent && config.interactivity?.clickable) {
      onEvent({
        type: 'click',
        data,
      });
    }
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-semibold">
                {entry.value.toFixed(1)} {config.numberFormat === 'hours' ? 'hrs' : 'pts'}
              </span>
            </div>
          ))}
          {payload[0]?.payload?.completed !== undefined && (
            <div className="flex items-center justify-between gap-4 border-t pt-1 mt-1">
              <span className="text-gray-600">Completed:</span>
              <span className="font-semibold text-green-600">
                {payload[0].payload.completed.toFixed(1)}{' '}
                {config.numberFormat === 'hours' ? 'hrs' : 'pts'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const colors = theme?.colors?.primary || ['#3b82f6', '#10b981', '#f59e0b'];

  return (
    <div className="w-full h-full flex flex-col p-4">
      {/* Title */}
      {config.title && (
        <h3
          className="mb-4 font-semibold text-center"
          style={{
            fontSize: theme?.fonts?.title?.size || 16,
            color: theme?.fonts?.title?.color || '#111827',
            fontFamily: theme?.fonts?.title?.family,
          }}
        >
          {config.title}
        </h3>
      )}

      {/* Sprint status summary */}
      <div className="flex items-center justify-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Total Work:</span>
          <span className="font-semibold">{totalWork.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Remaining:</span>
          <span className="font-semibold">{currentRemaining.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Status:</span>
          <span
            className={`font-semibold px-2 py-1 rounded text-xs ${
              onTrack
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {onTrack ? 'On Track' : 'At Risk'}
          </span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={transformedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[1] || '#10b981'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[1] || '#10b981'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme?.colors?.gridLines || '#e5e7eb'}
          />
          <XAxis
            dataKey="date"
            angle={-45}
            textAnchor="end"
            height={60}
            tick={{
              fill: theme?.fonts?.axis?.color || '#6b7280',
              fontSize: theme?.fonts?.axis?.size || 12,
              fontFamily: theme?.fonts?.axis?.family,
            }}
          />
          <YAxis
            label={{
              value: config.yAxis?.label || 'Remaining Work (Points/Hours)',
              angle: -90,
              position: 'insideLeft',
              style: {
                fill: theme?.fonts?.axis?.color || '#6b7280',
                fontSize: theme?.fonts?.axis?.size || 12,
                fontFamily: theme?.fonts?.axis?.family,
              },
            }}
            tick={{
              fill: theme?.fonts?.axis?.color || '#6b7280',
              fontSize: theme?.fonts?.axis?.size || 12,
            }}
          />
          <Tooltip content={customTooltip} />
          <Legend
            wrapperStyle={{
              paddingTop: '10px',
              fontFamily: theme?.fonts?.legend?.family,
              fontSize: theme?.fonts?.legend?.size || 12,
            }}
          />

          {/* Ideal burndown line */}
          <Line
            type="monotone"
            dataKey="ideal"
            stroke={colors[2] || '#f59e0b'}
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Ideal Burndown"
            dot={false}
            activeDot={{ r: 6 }}
          />

          {/* Actual burndown with area fill */}
          <Area
            type="monotone"
            dataKey="actual"
            fill="url(#actualGradient)"
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke={colors[1] || '#10b981'}
            strokeWidth={3}
            name="Actual Remaining"
            dot={{ r: 4, fill: colors[1] || '#10b981' }}
            activeDot={{ r: 6, onClick: handlePointClick }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
