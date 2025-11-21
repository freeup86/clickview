/**
 * Candlestick Chart Component
 *
 * Financial chart showing open, high, low, close prices.
 * Ideal for stock market analysis and trading visualization.
 */

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BaseChartProps } from '../../types/charts';

interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export const CandlestickChart: React.FC<BaseChartProps> = ({
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

  // Transform data for candlestick
  const candleData: CandleData[] = data.series[0].data.map((point) => ({
    date: point.x || point.date || '',
    open: point.open || 0,
    high: point.high || 0,
    low: point.low || 0,
    close: point.close || 0,
    volume: point.volume,
  }));

  const CustomTooltip: React.FC<any> = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;

    const candle = payload[0].payload;
    const change = candle.close - candle.open;
    const changePercent = ((change / candle.open) * 100).toFixed(2);

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
          className="font-semibold mb-2"
          style={{ color: theme?.fonts.tooltip.color || '#111827' }}
        >
          {candle.date}
        </p>
        <div className="space-y-1 text-sm">
          <p style={{ color: theme?.fonts.tooltip.color || '#6b7280' }}>
            Open: <span className="font-medium">{candle.open.toFixed(2)}</span>
          </p>
          <p style={{ color: theme?.fonts.tooltip.color || '#6b7280' }}>
            High: <span className="font-medium">{candle.high.toFixed(2)}</span>
          </p>
          <p style={{ color: theme?.fonts.tooltip.color || '#6b7280' }}>
            Low: <span className="font-medium">{candle.low.toFixed(2)}</span>
          </p>
          <p style={{ color: theme?.fonts.tooltip.color || '#6b7280' }}>
            Close: <span className="font-medium">{candle.close.toFixed(2)}</span>
          </p>
          <p style={{ color: change >= 0 ? '#10b981' : '#ef4444' }}>
            Change: {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent}%)
          </p>
          {candle.volume && (
            <p style={{ color: theme?.fonts.tooltip.color || '#6b7280' }}>
              Volume: <span className="font-medium">{candle.volume.toLocaleString()}</span>
            </p>
          )}
        </div>
      </div>
    );
  };

  // Custom candlestick rendering
  const CandlestickBar: React.FC<any> = (props) => {
    const { x, y, width, height, payload } = props;
    const { open, close, high, low } = payload;
    const isGreen = close >= open;

    const bodyHeight = Math.abs(close - open) * (height / (high - low));
    const bodyY = isGreen
      ? y + (high - close) * (height / (high - low))
      : y + (high - open) * (height / (high - low));

    const wickX = x + width / 2;
    const highY = y;
    const lowY = y + height;

    return (
      <g>
        {/* Wick */}
        <line
          x1={wickX}
          y1={highY}
          x2={wickX}
          y2={lowY}
          stroke={isGreen ? '#10b981' : '#ef4444'}
          strokeWidth="1"
        />
        {/* Body */}
        <rect
          x={x}
          y={bodyY}
          width={width}
          height={bodyHeight || 1}
          fill={isGreen ? '#10b981' : '#ef4444'}
          stroke={isGreen ? '#059669' : '#dc2626'}
          strokeWidth="1"
          opacity={theme?.opacity || 0.85}
        />
      </g>
    );
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={candleData}
          margin={dimensions?.margin || { top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme?.colors.gridLines || '#e5e7eb'}
            opacity={0.5}
          />

          <XAxis
            dataKey="date"
            tick={{
              fill: theme?.fonts.axis.color || '#6b7280',
              fontSize: theme?.fonts.axis.size || 12,
            }}
            stroke={theme?.colors.text || '#9ca3af'}
          />

          <YAxis
            domain={['dataMin - 5', 'dataMax + 5']}
            tick={{
              fill: theme?.fonts.axis.color || '#6b7280',
              fontSize: theme?.fonts.axis.size || 12,
            }}
            stroke={theme?.colors.text || '#9ca3af'}
          />

          {config.tooltip?.enabled !== false && <Tooltip content={<CustomTooltip />} />}

          {/* Candlesticks using custom shape */}
          <Bar
            dataKey="high"
            shape={<CandlestickBar />}
            isAnimationActive={config.animation?.enabled !== false}
            animationDuration={config.animation?.duration || theme?.animationDuration || 800}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
