import React from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AreaChartProps {
  data: any;
  config: {
    xAxisKey?: string;
    yAxisKey?: string;
    areaColor?: string;
    showGrid?: boolean;
    showLegend?: boolean;
    gradient?: boolean;
  };
}

const AreaChart: React.FC<AreaChartProps> = ({ data, config }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No data available
      </div>
    );
  }

  const chartData = Array.isArray(data) ? data : [data];
  const xKey = config.xAxisKey || 'group';
  const yKey = config.yAxisKey || 'value';
  const color = config.areaColor || '#7B68EE';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsAreaChart data={chartData}>
        {config.gradient !== false && (
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
        )}
        {config.showGrid !== false && (
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        )}
        <XAxis 
          dataKey={xKey}
          tick={{ fontSize: 12 }}
          stroke="#6b7280"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          stroke="#6b7280"
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
        {config.showLegend && <Legend />}
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={color}
          fill={config.gradient !== false ? "url(#colorGradient)" : color}
          strokeWidth={2}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
};

export default AreaChart;