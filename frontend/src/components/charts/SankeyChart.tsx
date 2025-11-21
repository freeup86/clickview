/**
 * Sankey Diagram Component
 *
 * Flow diagram showing quantity transfer between nodes.
 * Ideal for energy flow, material flow, and process visualization.
 */

import React, { useMemo } from 'react';
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts';
import { BaseChartProps } from '../../types/charts';

interface SankeyNode {
  name: string;
  color?: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
];

export const SankeyChart: React.FC<BaseChartProps> = ({
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

  // Transform data to Sankey format
  const sankeyData: SankeyData = useMemo(() => {
    const nodeMap = new Map<string, number>();
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    const getOrCreateNode = (name: string, color?: string): number => {
      if (nodeMap.has(name)) {
        return nodeMap.get(name)!;
      }
      const index = nodes.length;
      nodes.push({ name, color });
      nodeMap.set(name, index);
      return index;
    };

    // Process each series as links
    data.series.forEach((series) => {
      series.data.forEach((point) => {
        const source = getOrCreateNode(point.source || point.from || point.x || '');
        const target = getOrCreateNode(point.target || point.to || point.name || '');
        const value = point.value || point.y || 0;

        links.push({ source, target, value });
      });
    });

    return { nodes, links };
  }, [data]);

  const colors = config.colors?.palette || theme?.colors.primary || DEFAULT_COLORS;

  // Add colors to nodes
  const coloredData = useMemo(() => {
    return {
      ...sankeyData,
      nodes: sankeyData.nodes.map((node, index) => ({
        ...node,
        color: node.color || colors[index % colors.length],
      })),
    };
  }, [sankeyData, colors]);

  const CustomNode: React.FC<any> = ({
    x,
    y,
    width,
    height,
    index,
    payload,
    containerWidth,
  }) => {
    const isOut = x + width + 6 > containerWidth;
    const node = coloredData.nodes[index];

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={node.color}
          opacity={theme?.opacity || 0.85}
          rx={theme?.borderRadius || 2}
          className={config.interactivity?.clickable ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}
          onClick={() => {
            if (config.interactivity?.clickable && onEvent) {
              onEvent({
                type: 'click',
                data: { name: node.name, index },
              });
            }
          }}
        />
        <text
          x={isOut ? x - 6 : x + width + 6}
          y={y + height / 2}
          textAnchor={isOut ? 'end' : 'start'}
          dominantBaseline="middle"
          fill={theme?.fonts.axis.color || '#374151'}
          fontSize={theme?.fonts.axis.size || 12}
          fontFamily={theme?.fonts.axis.family}
        >
          {node.name}
        </text>
      </g>
    );
  };

  const CustomLink: React.FC<any> = ({
    sourceX,
    targetX,
    sourceY,
    targetY,
    sourceControlX,
    targetControlX,
    linkWidth,
    index,
  }) => {
    const link = coloredData.links[index];
    const sourceNode = coloredData.nodes[link.source];

    return (
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        stroke={sourceNode.color}
        strokeWidth={linkWidth}
        fill="none"
        opacity={theme?.opacity || 0.4}
        className="transition-opacity hover:opacity-70"
      />
    );
  };

  const CustomTooltip: React.FC<any> = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;

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
          {data.source?.name || data.name} → {data.target?.name}
        </p>
        <p
          className="text-sm"
          style={{ color: theme?.fonts.tooltip.color || '#6b7280' }}
        >
          Flow: {data.value?.toLocaleString()}
        </p>
      </div>
    );
  };

  return (
    <div className="w-full h-full">
      {config.title && (
        <h3
          className="text-center pt-4 font-semibold"
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
        <Sankey
          data={coloredData}
          node={<CustomNode />}
          link={<CustomLink />}
          margin={dimensions?.margin || { top: 40, right: 160, left: 160, bottom: 40 }}
          nodeWidth={config.showValues ? 15 : 10}
          nodePadding={50}
        >
          {config.tooltip?.enabled !== false && <Tooltip content={<CustomTooltip />} />}
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
};
