/**
 * Sprint Velocity Chart Component
 *
 * Compares committed vs completed work across multiple sprints.
 * Shows sprint points or time estimates for capacity planning.
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { BaseChartProps } from '../../types/charts';

export const SprintVelocityChart: React.FC<BaseChartProps> = ({
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

  // Transform data for velocity chart
  const transformedData = data.series[0].data.map((item: any, index: number) => {
    const sprintName = item.x || item.sprint || `Sprint ${index + 1}`;

    // Get committed and completed values
    const committed = item.committed || item.planned || 0;
    const completed = item.completed || item.actual || item.y || 0;

    return {
      sprint: sprintName,
      committed,
      completed,
      variance: completed - committed,
      completionRate: committed > 0 ? Math.round((completed / committed) * 100) : 0,
    };
  });

  // Calculate average velocity
  const avgCompleted = transformedData.reduce((sum, item) => sum + item.completed, 0) / transformedData.length;

  const handleBarClick = (data: any) => {
    if (onEvent && config.interactivity?.clickable) {
      onEvent({
        type: 'click',
        data,
      });
    }
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-blue-600">Committed:</span>
            <span className="font-semibold">{data.committed}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-green-600">Completed:</span>
            <span className="font-semibold">{data.completed}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-1">
            <span className="text-gray-600">Variance:</span>
            <span
              className={`font-semibold ${
                data.variance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {data.variance > 0 ? '+' : ''}
              {data.variance}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600">Completion:</span>
            <span className="font-semibold">{data.completionRate}%</span>
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

      {/* Subtitle with average velocity */}
      {config.subtitle !== false && (
        <p
          className="mb-2 text-center"
          style={{
            fontSize: theme?.fonts?.axis?.size || 12,
            color: theme?.fonts?.axis?.color || '#6b7280',
            fontFamily: theme?.fonts?.axis?.family,
          }}
        >
          Average Velocity: {avgCompleted.toFixed(1)} points per sprint
        </p>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={transformedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme?.colors?.gridLines || '#e5e7eb'}
          />
          <XAxis
            dataKey="sprint"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{
              fill: theme?.fonts?.axis?.color || '#6b7280',
              fontSize: theme?.fonts?.axis?.size || 12,
              fontFamily: theme?.fonts?.axis?.family,
            }}
          />
          <YAxis
            label={{
              value: config.yAxis?.label || 'Story Points / Hours',
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
              paddingTop: '20px',
              fontFamily: theme?.fonts?.legend?.family,
              fontSize: theme?.fonts?.legend?.size || 12,
            }}
          />

          {/* Average velocity reference line */}
          <ReferenceLine
            y={avgCompleted}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{
              value: 'Avg',
              position: 'right',
              fill: '#f59e0b',
              fontSize: 10,
            }}
          />

          <Bar
            dataKey="committed"
            fill={colors[0] || '#3b82f6'}
            name="Committed"
            onClick={handleBarClick}
            cursor={config.interactivity?.clickable ? 'pointer' : 'default'}
          />
          <Bar
            dataKey="completed"
            fill={colors[1] || '#10b981'}
            name="Completed"
            onClick={handleBarClick}
            cursor={config.interactivity?.clickable ? 'pointer' : 'default'}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
