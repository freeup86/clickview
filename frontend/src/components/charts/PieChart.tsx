/**
 * Pie Chart Component
 *
 * Renders pie and donut charts with labels and customizable styles
 */

import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BaseChartProps, ChartType } from '../../types/charts';

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
];

export const PieChartComponent: React.FC<BaseChartProps> = ({
  data,
  config,
  theme,
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

  // Transform data for pie chart
  const chartData = data.series[0].data.map((point, index) => ({
    name: point.x || data.categories?.[index] || `Item ${index + 1}`,
    value: point.y,
  }));

  const colors = config.colors?.palette || theme?.colors.primary || DEFAULT_COLORS;
  const isDonut = config.type === ChartType.DONUT;
  const innerRadius = isDonut ? (config.innerRadius || 60) : 0;

  // Calculate percentages
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const dataWithPercentages = chartData.map((item) => ({
    ...item,
    percentage: ((item.value / total) * 100).toFixed(1),
  }));

  const handleClick = (data: any, index: number) => {
    if (config.interactivity?.clickable && onEvent) {
      onEvent({
        type: 'click',
        data,
        dataIndex: index,
      });
    }
  };

  const renderLabel = (entry: any) => {
    if (!config.showValues && !config.showPercentages) return '';

    if (config.showPercentages) {
      return `${entry.percentage}%`;
    }

    if (config.showValues) {
      return entry.value.toLocaleString();
    }

    return '';
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={dataWithPercentages}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius="80%"
          fill="#8884d8"
          dataKey="value"
          label={renderLabel}
          labelLine={config.showValues || config.showPercentages}
          startAngle={config.startAngle || 0}
          onClick={handleClick}
          animationDuration={config.animation?.duration || 1000}
          isAnimationActive={config.animation?.enabled !== false}
        >
          {dataWithPercentages.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
              stroke={theme?.colors.background || 'white'}
              strokeWidth={2}
            />
          ))}
        </Pie>

        {config.tooltip?.enabled !== false && (
          <Tooltip
            contentStyle={{
              backgroundColor: theme?.colors.background || 'white',
              border: `1px solid ${theme?.colors.borders || '#e5e7eb'}`,
              borderRadius: theme?.borderRadius || 8,
            }}
            formatter={(value: number, name: string, entry: any) => [
              `${value.toLocaleString()} (${entry.payload.percentage}%)`,
              name,
            ]}
          />
        )}

        {config.legend?.show !== false && (
          <Legend
            wrapperStyle={{ fontSize: theme?.fonts.legend.size || 12 }}
            verticalAlign={config.legend?.position === 'bottom' ? 'bottom' : 'top'}
            align={config.legend?.align || 'center'}
            layout={config.legend?.layout || 'horizontal'}
          />
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};
