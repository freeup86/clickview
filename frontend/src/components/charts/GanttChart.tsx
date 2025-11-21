/**
 * Gantt Chart Component
 *
 * Project timeline visualization showing tasks, dependencies, and progress.
 * Ideal for project management, resource planning, and schedule tracking.
 */

import React, { useMemo } from 'react';
import { BaseChartProps } from '../../types/charts';

interface GanttTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress?: number;
  dependencies?: string[];
  assignee?: string;
  color?: string;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
];

export const GanttChart: React.FC<BaseChartProps> = ({
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

  // Transform data to Gantt tasks
  const tasks: GanttTask[] = useMemo(() => {
    return data.series.flatMap((series, seriesIndex) =>
      series.data.map((point, index) => ({
        id: point.id || `task-${seriesIndex}-${index}`,
        name: point.name || series.name,
        startDate: new Date(point.startDate || point.x),
        endDate: new Date(point.endDate || point.y),
        progress: point.progress || 0,
        dependencies: point.dependencies || [],
        assignee: point.assignee,
        color: point.color || series.color,
      }))
    );
  }, [data]);

  // Calculate time range
  const { minDate, maxDate } = useMemo(() => {
    const dates = tasks.flatMap(t => [t.startDate, t.endDate]);
    return {
      minDate: new Date(Math.min(...dates.map(d => d.getTime()))),
      maxDate: new Date(Math.max(...dates.map(d => d.getTime()))),
    };
  }, [tasks]);

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  // Chart dimensions
  const rowHeight = 40;
  const chartHeight = tasks.length * rowHeight + 100;
  const chartWidth = 800;
  const labelWidth = 200;
  const plotWidth = chartWidth - labelWidth - 40;

  const getX = (date: Date) => {
    const days = (date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    return labelWidth + 20 + (days / totalDays) * plotWidth;
  };

  const getWidth = (start: Date, end: Date) => {
    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return (days / totalDays) * plotWidth;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const colors = config.colors?.palette || theme?.colors.primary || DEFAULT_COLORS;

  return (
    <div className="w-full h-full overflow-auto p-4">
      {config.title && (
        <h3
          className="text-center mb-4 font-semibold"
          style={{
            fontSize: theme?.fonts.title.size || 16,
            color: theme?.fonts.title.color || '#111827',
            fontFamily: theme?.fonts.title.family,
          }}
        >
          {config.title}
        </h3>
      )}

      <svg width={chartWidth} height={chartHeight} className="max-w-full">
        {/* Header with time labels */}
        <g>
          <rect
            x={0}
            y={0}
            width={chartWidth}
            height={50}
            fill={theme?.colors.background || '#f9fafb'}
          />

          {/* Month markers */}
          {Array.from({ length: Math.ceil(totalDays / 7) }, (_, i) => {
            const date = new Date(minDate);
            date.setDate(date.getDate() + i * 7);
            const x = getX(date);

            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={50}
                  x2={x}
                  y2={chartHeight}
                  stroke={theme?.colors.gridLines || '#e5e7eb'}
                  strokeDasharray="3 3"
                  opacity={0.5}
                />
                <text
                  x={x}
                  y={30}
                  textAnchor="middle"
                  fill={theme?.fonts.axis.color || '#6b7280'}
                  fontSize={theme?.fonts.axis.size || 10}
                  fontFamily={theme?.fonts.axis.family}
                >
                  {formatDate(date)}
                </text>
              </g>
            );
          })}

          {/* Column headers */}
          <text
            x={10}
            y={30}
            fill={theme?.fonts.axis.color || '#6b7280'}
            fontSize={theme?.fonts.axis.size || 11}
            fontWeight="600"
            fontFamily={theme?.fonts.axis.family}
          >
            Task Name
          </text>
        </g>

        {/* Task rows */}
        {tasks.map((task, index) => {
          const y = 50 + index * rowHeight;
          const x = getX(task.startDate);
          const width = getWidth(task.startDate, task.endDate);
          const color = task.color || colors[index % colors.length];

          return (
            <g
              key={task.id}
              onClick={() => {
                if (config.interactivity?.clickable && onEvent) {
                  onEvent({ type: 'click', data: task });
                }
              }}
              className={config.interactivity?.clickable ? 'cursor-pointer' : ''}
            >
              {/* Row background */}
              <rect
                x={0}
                y={y}
                width={chartWidth}
                height={rowHeight}
                fill={index % 2 === 0 ? 'transparent' : theme?.colors.background || '#f9fafb'}
              />

              {/* Task label */}
              <text
                x={10}
                y={y + rowHeight / 2}
                dominantBaseline="middle"
                fill={theme?.fonts.axis.color || '#374151'}
                fontSize={theme?.fonts.axis.size || 11}
                fontFamily={theme?.fonts.axis.family}
              >
                {task.name}
              </text>

              {/* Task bar background */}
              <rect
                x={x}
                y={y + 10}
                width={width}
                height={20}
                fill={color}
                opacity={0.3}
                rx={theme?.borderRadius || 4}
              />

              {/* Task bar progress */}
              {task.progress !== undefined && (
                <rect
                  x={x}
                  y={y + 10}
                  width={width * (task.progress / 100)}
                  height={20}
                  fill={color}
                  opacity={theme?.opacity || 0.85}
                  rx={theme?.borderRadius || 4}
                />
              )}

              {/* Task bar border */}
              <rect
                x={x}
                y={y + 10}
                width={width}
                height={20}
                fill="none"
                stroke={color}
                strokeWidth="1"
                rx={theme?.borderRadius || 4}
              />

              {/* Progress text */}
              {config.showValues && task.progress !== undefined && width > 40 && (
                <text
                  x={x + width / 2}
                  y={y + rowHeight / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={theme?.fonts.axis.size || 10}
                  fontWeight="600"
                  fontFamily={theme?.fonts.axis.family}
                >
                  {task.progress}%
                </text>
              )}
            </g>
          );
        })}

        {/* Today marker */}
        {(() => {
          const today = new Date();
          if (today >= minDate && today <= maxDate) {
            const x = getX(today);
            return (
              <g>
                <line
                  x1={x}
                  y1={50}
                  x2={x}
                  y2={chartHeight}
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />
                <text
                  x={x + 5}
                  y={65}
                  fill="#ef4444"
                  fontSize={theme?.fonts.axis.size || 10}
                  fontWeight="600"
                  fontFamily={theme?.fonts.axis.family}
                >
                  Today
                </text>
              </g>
            );
          }
          return null;
        })()}
      </svg>
    </div>
  );
};
