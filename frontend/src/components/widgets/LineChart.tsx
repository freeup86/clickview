import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface LineChartProps {
  data: any;
  config: {
    xAxisKey?: string;
    yAxisKey?: string;
    lineColor?: string;
    showGrid?: boolean;
    showLegend?: boolean;
    smooth?: boolean;
    showDots?: boolean;
  };
}

const LineChart: React.FC<LineChartProps> = ({ data, config }) => {
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

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={chartData}>
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
        <Line
          type={config.smooth ? 'monotone' : 'linear'}
          dataKey={yKey}
          stroke={config.lineColor || '#7B68EE'}
          strokeWidth={2}
          dot={config.showDots !== false}
          activeDot={{ r: 6 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

export default LineChart;