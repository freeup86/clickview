import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

interface StackedBarChartProps {
  data: any;
  config: {
    title?: string;
    xAxisKey?: string;
    yAxisKeys?: string[];
    colors?: Record<string, string>;
    showValues?: boolean;
    showGrid?: boolean;
    showLegend?: boolean;
    stacked?: boolean;
  };
  onClick?: (data: any) => void;
}

const defaultColors = {
  SEN: '#2563eb', // Blue
  QRQ: '#dc2626', // Red  
  PREDEVELOPMENT: '#ef4444',
  PAUSED: '#a855f7',
  OUTLINES: '#ec4899',
  STORYBOARD: '#10b981',
  DEVELOPMENT: '#f59e0b',
  COMPLETED: '#3b82f6',
};

const StackedBarChart: React.FC<StackedBarChartProps> = ({ data, config, onClick }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No data available
      </div>
    );
  }

  const chartData = Array.isArray(data) ? data : [data];
  const xKey = config.xAxisKey || 'date';
  const yKeys = config.yAxisKeys || ['SEN', 'QRQ'];
  const colors = { ...defaultColors, ...config.colors };

  // Custom label formatter to show values on bars
  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (!value || value === 0 || !config.showValues) return null;
    
    return (
      <text 
        x={x + width / 2} 
        y={y + height / 2} 
        fill="white" 
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
      >
        {value}
      </text>
    );
  };

  const handleClick = (data: any) => {
    if (onClick && data) {
      onClick(data);
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1">
                <span 
                  className="w-3 h-3 rounded-full inline-block" 
                  style={{ backgroundColor: entry.fill }}
                />
                {entry.name}:
              </span>
              <span className="ml-4 font-semibold">{entry.value}</span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center text-xs font-bold">
              <span>Total:</span>
              <span>{total}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full p-4">
      {config.title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{config.title}</h3>
      )}
      <ResponsiveContainer width="100%" height={config.title ? "calc(100% - 32px)" : "100%"}>
        <RechartsBarChart 
          data={chartData}
          onClick={handleClick}
          margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
        >
          {config.showGrid !== false && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          )}
          <XAxis 
            dataKey={xKey}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#6b7280' }}
            label={{ 
              value: 'Tasks', 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: 12, fill: '#6b7280' }
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
          {config.showLegend !== false && (
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="square"
              iconSize={10}
              formatter={(value) => <span style={{ fontSize: '11px' }}>{value}</span>}
            />
          )}
          {yKeys.map((key) => (
            <Bar 
              key={key}
              dataKey={key}
              stackId={config.stacked !== false ? "stack" : undefined}
              fill={colors[key] || '#8884d8'}
              cursor="pointer"
            >
              {config.showValues && (
                <LabelList content={renderCustomizedLabel} />
              )}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StackedBarChart;