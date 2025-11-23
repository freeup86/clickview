/**
 * Sprint Burnup Chart Component
 *
 * Shows work completed over time plus total scope.
 * Helps identify scope changes during the sprint.
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

export const SprintBurnupChart: React.FC<BaseChartProps> = ({
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

  // Transform data for burnup chart
  const transformedData = data.series[0].data.map((item: any) => ({
    date: item.x || item.date || item.day,
    totalScope: item.totalScope || item.scope || item.total || 0,
    completed: item.completed || item.y || item.done || 0,
    ideal: item.ideal || 0,
  }));

  // Calculate scope change
  const initialScope = transformedData[0]?.totalScope || 0;
  const currentScope = transformedData[transformedData.length - 1]?.totalScope || 0;
  const scopeChange = currentScope - initialScope;
  const scopeChangePercent = initialScope > 0 ? ((scopeChange / initialScope) * 100).toFixed(1) : '0';

  const completed = transformedData[transformedData.length - 1]?.completed || 0;
  const completionPercent = currentScope > 0 ? ((completed / currentScope) * 100).toFixed(1) : '0';

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
          <div className="flex items-center justify-between gap-4 border-t pt-1 mt-1">
            <span className="text-gray-600">Progress:</span>
            <span className="font-semibold">
              {payload.find((p: any) => p.dataKey === 'completed')
                ? (
                    (payload.find((p: any) => p.dataKey === 'completed').value /
                      payload.find((p: any) => p.dataKey === 'totalScope').value) *
                    100
                  ).toFixed(0)
                : 0}
              %
            </span>
          </div>
        </div>
      </div>
    );
  };

  const colors = theme?.colors?.primary || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

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
          <span className="text-gray-600">Total Scope:</span>
          <span className="font-semibold">{currentScope.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Completed:</span>
          <span className="font-semibold text-green-600">{completed.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Progress:</span>
          <span className="font-semibold">{completionPercent}%</span>
        </div>
        {scopeChange !== 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Scope Change:</span>
            <span
              className={`font-semibold ${
                scopeChange > 0 ? 'text-orange-600' : 'text-blue-600'
              }`}
            >
              {scopeChange > 0 ? '+' : ''}
              {scopeChange.toFixed(1)} ({scopeChangePercent > 0 ? '+' : ''}
              {scopeChangePercent}%)
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={transformedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <defs>
            <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[1] || '#10b981'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[1] || '#10b981'} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="scopeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[0] || '#3b82f6'} stopOpacity={0.1} />
              <stop offset="95%" stopColor={colors[0] || '#3b82f6'} stopOpacity={0} />
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
              value: config.yAxis?.label || 'Work (Points/Hours)',
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

          {/* Total scope line (shows scope changes) */}
          <Area
            type="stepAfter"
            dataKey="totalScope"
            fill="url(#scopeGradient)"
            stroke="none"
          />
          <Line
            type="stepAfter"
            dataKey="totalScope"
            stroke={colors[0] || '#3b82f6'}
            strokeWidth={2}
            name="Total Scope"
            dot={{ r: 4, fill: colors[0] || '#3b82f6' }}
            activeDot={{ r: 6, onClick: handlePointClick }}
          />

          {/* Ideal progress line */}
          {transformedData.some((d: any) => d.ideal > 0) && (
            <Line
              type="monotone"
              dataKey="ideal"
              stroke={colors[2] || '#f59e0b'}
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Ideal Progress"
              dot={false}
              activeDot={{ r: 6 }}
            />
          )}

          {/* Completed work line */}
          <Area
            type="monotone"
            dataKey="completed"
            fill="url(#completedGradient)"
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="completed"
            stroke={colors[1] || '#10b981'}
            strokeWidth={3}
            name="Work Completed"
            dot={{ r: 4, fill: colors[1] || '#10b981' }}
            activeDot={{ r: 6, onClick: handlePointClick }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Scope change indicator */}
      {scopeChange !== 0 && (
        <div
          className={`mt-4 p-2 rounded-lg text-center text-sm ${
            scopeChange > 0
              ? 'bg-orange-50 text-orange-800'
              : 'bg-blue-50 text-blue-800'
          }`}
        >
          <span className="font-semibold">
            {scopeChange > 0 ? '⚠️ Scope Increased' : '✓ Scope Decreased'}
          </span>
          {' '}by {Math.abs(scopeChange).toFixed(1)} points during this sprint
        </div>
      )}
    </div>
  );
};
