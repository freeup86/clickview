/**
 * Sunburst Chart Component
 *
 * Hierarchical data visualization using concentric circles.
 * Ideal for showing part-to-whole relationships in nested data.
 */

import React, { useMemo } from 'react';
import { BaseChartProps } from '../../types/charts';

interface SunburstNode {
  name: string;
  value?: number;
  children?: SunburstNode[];
  color?: string;
}

interface SunburstSegment {
  node: SunburstNode;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  color: string;
  level: number;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
];

export const SunburstChart: React.FC<BaseChartProps> = ({
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

  // Build hierarchical data
  const rootNode: SunburstNode = useMemo(() => {
    return {
      name: 'root',
      children: data.series.map(series => ({
        name: series.name,
        value: series.data.reduce((sum, d) => sum + (d.value || d.y || 0), 0),
        children: series.data.map(point => ({
          name: point.name || point.x || '',
          value: point.value || point.y || 0,
        })),
      })),
    };
  }, [data]);

  // Calculate total value
  const getTotalValue = (node: SunburstNode): number => {
    if (node.children && node.children.length > 0) {
      return node.children.reduce((sum, child) => sum + getTotalValue(child), 0);
    }
    return node.value || 0;
  };

  // Generate segments
  const segments = useMemo(() => {
    const result: SunburstSegment[] = [];
    const colors = config.colors?.palette || theme?.colors.primary || DEFAULT_COLORS;
    const maxRadius = 200;
    const centerRadius = 50;

    const buildSegments = (
      node: SunburstNode,
      startAngle: number,
      endAngle: number,
      level: number,
      colorIndex: number
    ) => {
      if (!node.children || node.children.length === 0) return;

      const totalValue = getTotalValue(node);
      const innerRadius = centerRadius + level * 40;
      const outerRadius = innerRadius + 40;

      let currentAngle = startAngle;

      node.children.forEach((child, index) => {
        const childValue = getTotalValue(child);
        const angleDelta = ((endAngle - startAngle) * childValue) / totalValue;
        const childEndAngle = currentAngle + angleDelta;

        const color = colors[(colorIndex + index) % colors.length];

        result.push({
          node: child,
          startAngle: currentAngle,
          endAngle: childEndAngle,
          innerRadius,
          outerRadius,
          color,
          level,
        });

        // Recursively process children
        buildSegments(child, currentAngle, childEndAngle, level + 1, colorIndex + index);

        currentAngle = childEndAngle;
      });
    };

    buildSegments(rootNode, 0, 360, 0, 0);
    return result;
  }, [rootNode, config, theme]);

  const centerX = 250;
  const centerY = 250;

  // Helper to create arc path
  const createArcPath = (
    startAngle: number,
    endAngle: number,
    innerRadius: number,
    outerRadius: number
  ): string => {
    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
    const endAngleRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = centerX + innerRadius * Math.cos(startAngleRad);
    const y1 = centerY + innerRadius * Math.sin(startAngleRad);
    const x2 = centerX + outerRadius * Math.cos(startAngleRad);
    const y2 = centerY + outerRadius * Math.sin(startAngleRad);
    const x3 = centerX + outerRadius * Math.cos(endAngleRad);
    const y3 = centerY + outerRadius * Math.sin(endAngleRad);
    const x4 = centerX + innerRadius * Math.cos(endAngleRad);
    const y4 = centerY + innerRadius * Math.sin(endAngleRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `
      M ${x1} ${y1}
      L ${x2} ${y2}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x3} ${y3}
      L ${x4} ${y4}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1}
      Z
    `;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      {config.title && (
        <h3
          className="mb-4 font-semibold"
          style={{
            fontSize: theme?.fonts.title.size || 16,
            color: theme?.fonts.title.color || '#111827',
            fontFamily: theme?.fonts.title.family,
          }}
        >
          {config.title}
        </h3>
      )}

      <svg width="500" height="500" viewBox="0 0 500 500" className="max-w-full">
        {/* Segments */}
        {segments.map((segment, index) => {
          const midAngle = (segment.startAngle + segment.endAngle) / 2;
          const midRadius = (segment.innerRadius + segment.outerRadius) / 2;
          const labelAngle = (midAngle - 90) * (Math.PI / 180);
          const labelX = centerX + midRadius * Math.cos(labelAngle);
          const labelY = centerY + midRadius * Math.sin(labelAngle);

          const shouldShowLabel = segment.endAngle - segment.startAngle > 15;

          return (
            <g
              key={index}
              onClick={() => {
                if (config.interactivity?.clickable && onEvent) {
                  onEvent({
                    type: 'click',
                    data: {
                      name: segment.node.name,
                      value: getTotalValue(segment.node),
                      level: segment.level,
                    },
                  });
                }
              }}
              className={config.interactivity?.clickable ? 'cursor-pointer' : ''}
            >
              <path
                d={createArcPath(
                  segment.startAngle,
                  segment.endAngle,
                  segment.innerRadius,
                  segment.outerRadius
                )}
                fill={segment.color}
                opacity={theme?.opacity || 0.85}
                stroke={theme?.colors.background || 'white'}
                strokeWidth="2"
                className="transition-opacity hover:opacity-70"
              />

              {shouldShowLabel && config.showValues && (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={theme?.fonts.axis.color || 'white'}
                  fontSize={theme?.fonts.axis.size || 10}
                  fontWeight="600"
                  fontFamily={theme?.fonts.axis.family}
                  pointerEvents="none"
                >
                  {segment.node.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Center circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={50}
          fill={theme?.colors.background || 'white'}
          stroke={theme?.colors.gridLines || '#e5e7eb'}
          strokeWidth="2"
        />

        {/* Center label */}
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={theme?.fonts.title.color || '#111827'}
          fontSize={theme?.fonts.title.size || 14}
          fontWeight="600"
          fontFamily={theme?.fonts.title.family}
        >
          Total
        </text>
        <text
          x={centerX}
          y={centerY + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={theme?.fonts.axis.color || '#6b7280'}
          fontSize={theme?.fonts.axis.size || 12}
          fontFamily={theme?.fonts.axis.family}
        >
          {getTotalValue(rootNode).toLocaleString()}
        </text>
      </svg>
    </div>
  );
};
