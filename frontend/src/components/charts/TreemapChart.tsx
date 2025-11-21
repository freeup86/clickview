/**
 * Treemap Chart Component
 *
 * Renders hierarchical data using nested rectangles.
 * Ideal for showing proportional relationships in tree structures.
 */

import React from 'react';
import {
  Treemap,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { BaseChartProps } from '../../types/charts';

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
];

interface TreemapNode {
  name: string;
  size?: number;
  children?: TreemapNode[];
  fill?: string;
}

export const TreemapChart: React.FC<BaseChartProps> = ({
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

  // Transform data for treemap
  const treeData: TreemapNode[] = data.series.map((series, index) => {
    const colors = config.colors?.palette || theme?.colors.primary || DEFAULT_COLORS;
    return {
      name: series.name,
      children: series.data.map((point, idx) => ({
        name: point.name || point.x || `Item ${idx}`,
        size: point.y || point.value || 1,
        fill: point.color || colors[idx % colors.length],
      })),
    };
  });

  const colors = config.colors?.palette || theme?.colors.primary || DEFAULT_COLORS;

  const CustomContent: React.FC<any> = ({
    root,
    depth,
    x,
    y,
    width,
    height,
    index,
    name,
    value,
    fill,
  }) => {
    const fontSize = Math.max(10, Math.min(width / 6, height / 3, 14));
    const shouldShowValue = width > 40 && height > 30;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: fill || colors[index % colors.length],
            stroke: theme?.colors.background || '#fff',
            strokeWidth: 2,
            opacity: theme?.opacity || 0.85,
          }}
          onClick={() => {
            if (config.interactivity?.clickable && onEvent) {
              onEvent({
                type: 'click',
                data: { name, value, depth },
              });
            }
          }}
          className={config.interactivity?.clickable ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}
        />
        {width > 30 && height > 20 && (
          <text
            x={x + width / 2}
            y={y + height / 2 - (shouldShowValue ? 8 : 0)}
            textAnchor="middle"
            fill={theme?.fonts.axis.color || '#fff'}
            fontSize={fontSize}
            fontWeight={theme?.fonts.axis.weight || 600}
            fontFamily={theme?.fonts.axis.family}
          >
            {name}
          </text>
        )}
        {shouldShowValue && config.showValues && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 12}
            textAnchor="middle"
            fill={theme?.fonts.axis.color || '#fff'}
            fontSize={fontSize * 0.8}
            fontFamily={theme?.fonts.axis.family}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </text>
        )}
      </g>
    );
  };

  const CustomTooltip: React.FC<any> = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;

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
          {payload[0].payload.name}
        </p>
        <p
          className="text-sm"
          style={{ color: theme?.fonts.tooltip.color || '#6b7280' }}
        >
          Value: {payload[0].value?.toLocaleString()}
        </p>
      </div>
    );
  };

  return (
    <div className="w-full h-full p-4">
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

      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treeData}
          dataKey="size"
          aspectRatio={config.aspectRatio || 4 / 3}
          stroke={theme?.colors.background || '#fff'}
          fill={colors[0]}
          content={<CustomContent />}
          animationDuration={config.animation?.duration || theme?.animationDuration || 800}
          isAnimationActive={config.animation?.enabled !== false}
        >
          {config.tooltip?.enabled !== false && <Tooltip content={<CustomTooltip />} />}
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
};
