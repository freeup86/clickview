/**
 * Cumulative Flow Diagram (CFD) Component
 *
 * Visualizes work distribution across different statuses over time.
 * Helps identify bottlenecks and process efficiency.
 */

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BaseChartProps } from '../../types/charts';

export const CumulativeFlowChart: React.FC<BaseChartProps> = ({
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

  // Transform data for CFD
  // Expected format: series with different statuses, data points with dates
  const statuses = data.series.map((s) => s.name);

  // Merge all series data by date
  const dateMap = new Map<string, any>();

  data.series.forEach((series) => {
    series.data.forEach((point: any) => {
      const date = point.x || point.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date });
      }
      const dateData = dateMap.get(date);
      dateData[series.name] = point.y || point.count || 0;
    });
  });

  const transformedData = Array.from(dateMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate cumulative values
  const cumulativeData = transformedData.map((item, index) => {
    const cumulativeItem: any = { date: item.date };

    statuses.forEach((status) => {
      if (index === 0) {
        cumulativeItem[status] = item[status] || 0;
      } else {
        const prevValue = transformedData[index - 1][status] || 0;
        cumulativeItem[status] = prevValue + (item[status] || 0);
      }
    });

    return cumulativeItem;
  });

  // Default status colors (can be customized via config)
  const statusColors: Record<string, string> = {
    Backlog: '#9ca3af',
    'To Do': '#6b7280',
    'In Progress': '#3b82f6',
    'In Review': '#f59e0b',
    Testing: '#8b5cf6',
    Done: '#10b981',
    Closed: '#059669',
    ...config.colors?.statusColors,
  };

  const getStatusColor = (status: string, index: number) => {
    if (statusColors[status]) return statusColors[status];

    const defaultColors = theme?.colors?.primary || [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
      '#06b6d4',
    ];

    return defaultColors[index % defaultColors.length];
  };

  const handleAreaClick = (data: any) => {
    if (onEvent && config.interactivity?.clickable) {
      onEvent({
        type: 'click',
        data,
      });
    }
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Calculate total items
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          {payload
            .slice()
            .reverse()
            .map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{entry.name}:</span>
                </div>
                <span className="font-semibold">{entry.value}</span>
              </div>
            ))}
          <div className="flex items-center justify-between gap-4 border-t pt-1 mt-1">
            <span className="font-semibold">Total:</span>
            <span className="font-semibold">{total}</span>
          </div>
        </div>
      </div>
    );
  };

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

      {/* Subtitle */}
      {config.subtitle && (
        <p
          className="mb-2 text-center"
          style={{
            fontSize: theme?.fonts?.axis?.size || 12,
            color: theme?.fonts?.axis?.color || '#6b7280',
            fontFamily: theme?.fonts?.axis?.family,
          }}
        >
          {config.subtitle}
        </p>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={cumulativeData}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <defs>
            {statuses.map((status, index) => {
              const color = getStatusColor(status, index);
              return (
                <linearGradient
                  key={status}
                  id={`color${status.replace(/\s+/g, '')}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.6} />
                </linearGradient>
              );
            })}
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
              value: config.yAxis?.label || 'Cumulative Items',
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

          {/* Render areas in reverse order (Done at bottom, Backlog at top) */}
          {statuses.map((status, index) => {
            const color = getStatusColor(status, index);
            return (
              <Area
                key={status}
                type="monotone"
                dataKey={status}
                stackId="1"
                stroke={color}
                fill={`url(#color${status.replace(/\s+/g, '')})`}
                fillOpacity={1}
                onClick={handleAreaClick}
                cursor={config.interactivity?.clickable ? 'pointer' : 'default'}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>

      {/* CFD Interpretation Guide */}
      {config.showValues && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-gray-700">
          <div className="font-semibold mb-1">💡 Reading the CFD:</div>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>Vertical distance:</strong> Number of items in that status
            </li>
            <li>
              <strong>Horizontal bands:</strong> Lead time (time items spend in process)
            </li>
            <li>
              <strong>Narrowing bands:</strong> Items moving quickly (good flow)
            </li>
            <li>
              <strong>Widening bands:</strong> Bottleneck in that stage
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
