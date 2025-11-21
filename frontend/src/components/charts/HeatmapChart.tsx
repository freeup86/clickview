/**
 * Heatmap Chart Component
 *
 * Renders heatmaps for 2D data visualization with customizable color scales.
 * Ideal for correlation matrices, time-based patterns, and density maps.
 */

import React, { useMemo } from 'react';
import { BaseChartProps } from '../../types/charts';

interface HeatmapCell {
  x: string | number;
  y: string | number;
  value: number;
  label?: string;
}

const DEFAULT_COLORS = {
  low: '#3b82f6',
  mid: '#fbbf24',
  high: '#ef4444',
};

export const HeatmapChart: React.FC<BaseChartProps> = ({
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

  // Transform data into heatmap cells
  const heatmapData: HeatmapCell[] = useMemo(() => {
    const cells: HeatmapCell[] = [];
    data.series.forEach((series) => {
      series.data.forEach((point) => {
        cells.push({
          x: point.x,
          y: series.name,
          value: point.y || 0,
          label: point.label,
        });
      });
    });
    return cells;
  }, [data]);

  // Get unique x and y values
  const xValues = useMemo(() => {
    return Array.from(new Set(heatmapData.map((cell) => cell.x)));
  }, [heatmapData]);

  const yValues = useMemo(() => {
    return Array.from(new Set(heatmapData.map((cell) => cell.y)));
  }, [heatmapData]);

  // Calculate min and max values for color scaling
  const { min, max } = useMemo(() => {
    const values = heatmapData.map((cell) => cell.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [heatmapData]);

  // Color interpolation function
  const getColor = (value: number): string => {
    if (config.colors?.gradient) {
      const { start, end } = config.colors.gradient;
      const ratio = (value - min) / (max - min);
      return interpolateColor(start, end, ratio);
    }

    // Default three-color gradient
    const ratio = (value - min) / (max - min);
    if (ratio < 0.5) {
      return interpolateColor(DEFAULT_COLORS.low, DEFAULT_COLORS.mid, ratio * 2);
    } else {
      return interpolateColor(DEFAULT_COLORS.mid, DEFAULT_COLORS.high, (ratio - 0.5) * 2);
    }
  };

  const handleCellClick = (cell: HeatmapCell) => {
    if (config.interactivity?.clickable && onEvent) {
      onEvent({
        type: 'click',
        data: cell,
      });
    }
  };

  const cellWidth = 100 / xValues.length;
  const cellHeight = 100 / yValues.length;

  return (
    <div className="w-full h-full p-4">
      {/* Title */}
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

      <div className="relative w-full" style={{ height: 'calc(100% - 80px)' }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-around pr-2">
          {yValues.map((y, index) => (
            <div
              key={index}
              className="text-right"
              style={{
                fontSize: theme?.fonts.axis.size || 11,
                color: theme?.fonts.axis.color || '#6b7280',
                fontFamily: theme?.fonts.axis.family,
              }}
            >
              {String(y)}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="ml-20 h-full flex flex-col">
          {yValues.map((y, yIndex) => (
            <div key={yIndex} className="flex flex-1">
              {xValues.map((x, xIndex) => {
                const cell = heatmapData.find((c) => c.x === x && c.y === y);
                const value = cell?.value || 0;
                const bgColor = getColor(value);

                return (
                  <div
                    key={xIndex}
                    className="flex-1 border border-gray-200 flex items-center justify-center cursor-pointer transition-all hover:opacity-80"
                    style={{
                      backgroundColor: bgColor,
                      borderRadius: theme?.borderRadius || 0,
                    }}
                    onClick={() => cell && handleCellClick(cell)}
                    title={`${x}, ${y}: ${value.toFixed(2)}`}
                  >
                    {config.showValues && (
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: getContrastColor(bgColor),
                        }}
                      >
                        {value.toFixed(1)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* X-axis labels */}
          <div className="flex mt-2">
            {xValues.map((x, index) => (
              <div
                key={index}
                className="flex-1 text-center"
                style={{
                  fontSize: theme?.fonts.axis.size || 11,
                  color: theme?.fonts.axis.color || '#6b7280',
                  fontFamily: theme?.fonts.axis.family,
                }}
              >
                {String(x)}
              </div>
            ))}
          </div>
        </div>

        {/* Color scale legend */}
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <span
              className="text-xs"
              style={{
                color: theme?.fonts.axis.color || '#6b7280',
              }}
            >
              {min.toFixed(1)}
            </span>
            <div className="w-48 h-4 rounded" style={{
              background: `linear-gradient(to right, ${DEFAULT_COLORS.low}, ${DEFAULT_COLORS.mid}, ${DEFAULT_COLORS.high})`,
            }} />
            <span
              className="text-xs"
              style={{
                color: theme?.fonts.axis.color || '#6b7280',
              }}
            >
              {max.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to interpolate between two hex colors
function interpolateColor(color1: string, color2: string, ratio: number): string {
  const hex = (x: number) => {
    const h = x.toString(16);
    return h.length === 1 ? '0' + h : h;
  };

  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);

  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return '#' + hex(r) + hex(g) + hex(b);
}

// Helper function to get contrasting text color
function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.substring(1, 3), 16);
  const g = parseInt(hexColor.substring(3, 5), 16);
  const b = parseInt(hexColor.substring(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#FFFFFF';
}
