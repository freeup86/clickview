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
  Area,
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
    showArea?: boolean;
    multiLine?: boolean;
  };
  onClick?: (data: any) => void;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="chart-tooltip-value" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{entry.value?.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const LineChart: React.FC<LineChartProps> = ({ data, config, onClick }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  const chartData = Array.isArray(data) ? data : [data];
  const xKey = config.xAxisKey || 'group';
  const yKey = config.yAxisKey || 'value';

  const handleClick = (data: any) => {
    if (onClick && data && data.activePayload) {
      onClick(data.activePayload[0]);
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart
        data={chartData}
        onClick={handleClick}
        margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
      >
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7B68EE" stopOpacity={0.3}/>
            <stop offset="100%" stopColor="#7B68EE" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7B68EE"/>
            <stop offset="100%" stopColor="#a78bfa"/>
          </linearGradient>
        </defs>

        {config.showGrid !== false && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            strokeOpacity={0.5}
            vertical={false}
          />
        )}

        <XAxis
          dataKey={xKey}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
          dy={8}
        />

        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          width={40}
        />

        <Tooltip content={<CustomTooltip />} />

        {config.showLegend && (
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ color: '#374151', fontSize: '12px', fontWeight: 500 }}>{value}</span>
            )}
          />
        )}

        {/* Area fill for smooth gradient effect */}
        {config.showArea !== false && (
          <Area
            type={config.smooth !== false ? 'monotone' : 'linear'}
            dataKey={yKey}
            stroke="none"
            fill="url(#lineGradient)"
            animationDuration={800}
          />
        )}

        <Line
          type={config.smooth !== false ? 'monotone' : 'linear'}
          dataKey={yKey}
          stroke="url(#lineStroke)"
          strokeWidth={3}
          dot={config.showDots !== false ? {
            fill: '#fff',
            stroke: '#7B68EE',
            strokeWidth: 2,
            r: 4,
          } : false}
          activeDot={{
            r: 6,
            fill: '#7B68EE',
            stroke: '#fff',
            strokeWidth: 2,
          }}
          animationDuration={800}
          animationEasing="ease-out"
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

export default LineChart;
