/**
 * Funnel Chart Component
 *
 * Displays data as stages in a funnel, typically for conversion analysis.
 * Shows progressive reduction from one stage to the next.
 */

import React, { useMemo } from 'react';
import { BaseChartProps } from '../../types/charts';

interface FunnelStage {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

export const FunnelChartComponent: React.FC<BaseChartProps> = ({
  data,
  config,
  theme,
  onEvent,
  loading,
  error,
}) => {
  // Transform data to funnel stages
  const stages = useMemo<FunnelStage[]>(() => {
    if (!data.series.length) return [];

    const series = data.series[0]; // Funnel uses first series
    const total = series.data[0]?.y || 0;

    return series.data.map((point, index) => {
      const value = point.y || 0;
      const percentage = total > 0 ? (value / total) * 100 : 0;

      return {
        name: point.x || data.categories?.[index] || `Stage ${index + 1}`,
        value,
        percentage,
        color: point.color,
      };
    });
  }, [data]);

  // Determine colors
  const colors = useMemo(() => {
    if (config.colors?.palette) {
      return config.colors.palette;
    }
    if (theme?.colors.primary) {
      return theme.colors.primary;
    }
    return ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  }, [config.colors, theme]);

  // Handle stage click
  const handleStageClick = (stage: FunnelStage, index: number) => {
    if (config.interactivity?.clickable && onEvent) {
      onEvent({
        type: 'click',
        data: stage,
        dataIndex: index,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading chart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Error: {error.message}</div>
      </div>
    );
  }

  if (!stages.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  const maxValue = Math.max(...stages.map((s) => s.value));
  const showPercentages = config.showPercentages ?? true;
  const showValues = config.showValues ?? true;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8">
      {/* Title */}
      {config.title && (
        <div
          className="text-center mb-6"
          style={{
            fontSize: theme?.fonts.title.size || 18,
            fontWeight: theme?.fonts.title.weight || 600,
            color: theme?.fonts.title.color || '#111827',
            fontFamily: theme?.fonts.title.family || 'Inter, sans-serif',
          }}
        >
          {config.title}
        </div>
      )}

      {/* Funnel Stages */}
      <div className="w-full max-w-2xl space-y-2">
        {stages.map((stage, index) => {
          const widthPercentage = (stage.value / maxValue) * 100;
          const color = stage.color || colors[index % colors.length];
          const previousValue = index > 0 ? stages[index - 1].value : stage.value;
          const dropoff = index > 0
            ? ((previousValue - stage.value) / previousValue) * 100
            : 0;

          return (
            <div key={index} className="relative">
              {/* Stage bar */}
              <div
                className="mx-auto transition-all duration-300 hover:opacity-80 cursor-pointer"
                style={{
                  width: `${widthPercentage}%`,
                  minWidth: '20%',
                  height: '60px',
                  backgroundColor: color,
                  borderRadius: theme?.borderRadius || 8,
                  opacity: config.opacity ?? theme?.opacity ?? 0.9,
                }}
                onClick={() => handleStageClick(stage, index)}
              >
                <div className="flex items-center justify-between h-full px-4">
                  {/* Stage name */}
                  <span
                    className="font-medium text-white"
                    style={{
                      fontSize: theme?.fonts.axis.size || 12,
                      fontFamily: theme?.fonts.axis.family || 'Inter, sans-serif',
                    }}
                  >
                    {stage.name}
                  </span>

                  {/* Value and percentage */}
                  <div className="text-right text-white">
                    {showValues && (
                      <div
                        className="font-semibold"
                        style={{
                          fontSize: (theme?.fonts.tooltip.size || 12) + 2,
                        }}
                      >
                        {stage.value.toLocaleString()}
                      </div>
                    )}
                    {showPercentages && (
                      <div
                        className="text-xs opacity-90"
                        style={{
                          fontSize: theme?.fonts.tooltip.size || 12,
                        }}
                      >
                        {stage.percentage?.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dropoff indicator */}
              {index > 0 && dropoff > 0 && (
                <div
                  className="text-center mt-1"
                  style={{
                    fontSize: theme?.fonts.axis.size || 11,
                    color: theme?.fonts.axis.color || '#6b7280',
                  }}
                >
                  ↓ {dropoff.toFixed(1)}% drop-off
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Conversion rate */}
      {stages.length > 1 && (
        <div
          className="mt-6 text-center"
          style={{
            fontSize: theme?.fonts.legend.size || 12,
            color: theme?.fonts.legend.color || '#374151',
            fontWeight: theme?.fonts.legend.weight || 500,
          }}
        >
          Overall Conversion Rate:{' '}
          <span className="font-bold">
            {((stages[stages.length - 1].value / stages[0].value) * 100).toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default FunnelChartComponent;
