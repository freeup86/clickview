/**
 * Workload Chart Component
 *
 * Visualizes team member capacity vs allocated work.
 * Helps with resource planning and identifying overallocation.
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
  Cell,
} from 'recharts';
import { BaseChartProps } from '../../types/charts';

export const WorkloadChart: React.FC<BaseChartProps> = ({
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

  // Transform data for workload chart
  const transformedData = data.series[0].data.map((item: any) => {
    const assignee = item.x || item.assignee || item.name || 'Unassigned';
    const allocated = item.allocated || item.y || item.workload || 0;
    const capacity = item.capacity || item.max || config.yAxis?.max || 40; // Default 40 hours

    const utilizationPercent = capacity > 0 ? (allocated / capacity) * 100 : 0;

    // Determine status
    let status = 'normal';
    if (utilizationPercent > 100) {
      status = 'overallocated';
    } else if (utilizationPercent > 85) {
      status = 'near-capacity';
    } else if (utilizationPercent < 50) {
      status = 'underutilized';
    }

    return {
      assignee,
      allocated,
      capacity,
      available: Math.max(0, capacity - allocated),
      utilizationPercent: Math.round(utilizationPercent),
      status,
    };
  });

  // Sort by utilization (highest first)
  transformedData.sort((a, b) => b.utilizationPercent - a.utilizationPercent);

  // Calculate team statistics
  const totalCapacity = transformedData.reduce((sum, item) => sum + item.capacity, 0);
  const totalAllocated = transformedData.reduce((sum, item) => sum + item.allocated, 0);
  const teamUtilization = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;
  const overallocatedCount = transformedData.filter((item) => item.status === 'overallocated').length;

  const getBarColor = (status: string) => {
    const colors = theme?.colors?.primary || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    switch (status) {
      case 'overallocated':
        return colors[3] || '#ef4444'; // Red
      case 'near-capacity':
        return colors[2] || '#f59e0b'; // Orange
      case 'underutilized':
        return colors[0] || '#3b82f6'; // Blue
      default:
        return colors[1] || '#10b981'; // Green
    }
  };

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
            <span className="text-gray-600">Allocated:</span>
            <span className="font-semibold">
              {data.allocated.toFixed(1)} {config.numberFormat === 'points' ? 'pts' : 'hrs'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600">Capacity:</span>
            <span className="font-semibold">
              {data.capacity.toFixed(1)} {config.numberFormat === 'points' ? 'pts' : 'hrs'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600">Available:</span>
            <span className="font-semibold text-green-600">
              {data.available.toFixed(1)} {config.numberFormat === 'points' ? 'pts' : 'hrs'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-1 mt-1">
            <span className="text-gray-600">Utilization:</span>
            <span
              className={`font-semibold ${
                data.status === 'overallocated'
                  ? 'text-red-600'
                  : data.status === 'near-capacity'
                  ? 'text-orange-600'
                  : 'text-green-600'
              }`}
            >
              {data.utilizationPercent}%
            </span>
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

      {/* Team statistics */}
      <div className="flex items-center justify-center gap-6 mb-4 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Team Utilization:</span>
          <span className="font-semibold">{teamUtilization.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Total Capacity:</span>
          <span className="font-semibold">{totalCapacity.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Total Allocated:</span>
          <span className="font-semibold">{totalAllocated.toFixed(1)}</span>
        </div>
        {overallocatedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-semibold">⚠️ {overallocatedCount} Overallocated</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={transformedData}
          layout={config.orientation === 'vertical' ? 'vertical' : 'horizontal'}
          margin={{ top: 20, right: 30, left: config.orientation === 'vertical' ? 100 : 20, bottom: 60 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme?.colors?.gridLines || '#e5e7eb'}
          />

          {config.orientation === 'vertical' ? (
            <>
              <XAxis
                type="number"
                tick={{
                  fill: theme?.fonts?.axis?.color || '#6b7280',
                  fontSize: theme?.fonts?.axis?.size || 12,
                }}
              />
              <YAxis
                type="category"
                dataKey="assignee"
                width={100}
                tick={{
                  fill: theme?.fonts?.axis?.color || '#6b7280',
                  fontSize: theme?.fonts?.axis?.size || 12,
                  fontFamily: theme?.fonts?.axis?.family,
                }}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="assignee"
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
                  value: config.yAxis?.label || 'Hours / Points',
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
            </>
          )}

          <Tooltip content={customTooltip} />
          <Legend
            wrapperStyle={{
              paddingTop: '10px',
              fontFamily: theme?.fonts?.legend?.family,
              fontSize: theme?.fonts?.legend?.size || 12,
            }}
          />

          {/* Capacity reference line */}
          <ReferenceLine
            y={transformedData[0]?.capacity || 40}
            stroke="#9ca3af"
            strokeDasharray="3 3"
            label={{
              value: 'Capacity',
              position: 'right',
              fill: '#6b7280',
              fontSize: 10,
            }}
          />

          <Bar
            dataKey="allocated"
            name="Allocated Work"
            onClick={handleBarClick}
            cursor={config.interactivity?.clickable ? 'pointer' : 'default'}
            radius={[4, 4, 0, 0]}
          >
            {transformedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend for status colors */}
      <div className="flex items-center justify-center gap-4 mt-4 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <span>Overallocated (&gt;100%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-orange-500" />
          <span>Near Capacity (85-100%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>Normal (50-85%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span>Underutilized (&lt;50%)</span>
        </div>
      </div>
    </div>
  );
};
