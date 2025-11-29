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
  LabelList,
  Cell,
} from 'recharts';

interface BarChartProps {
  data: any;
  config: {
    xAxisKey?: string;
    yAxisKey?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    barColor?: string;
    showGrid?: boolean;
    showLegend?: boolean;
    stacked?: boolean;
    multiSeries?: boolean;
  };
  onClick?: (data: any) => void;
}

// Modern color palette
const CHART_COLORS = {
  primary: ['#7B68EE', '#6c47ff', '#5d32f0'],
  gradient: ['#7B68EE', '#a78bfa'],
  multi: ['#7B68EE', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'],
  forecast: '#6366f1',
  actual: '#10b981',
};

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

const BarChart: React.FC<BarChartProps> = ({ data, config, onClick }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  const chartData = Array.isArray(data) ? data : [data];
  const xKey = config.xAxisKey || 'group';
  const yKey = config.yAxisKey || 'value';

  // Transform data to ensure valid labels
  const transformedData = chartData.map((item: any) => {
    let groupLabel = item.group;

    if (!groupLabel ||
        groupLabel === 'invalid' ||
        groupLabel === 'undefined' ||
        groupLabel === 'unknown' ||
        groupLabel === 'null' ||
        String(groupLabel) === 'undefined') {
      groupLabel = 'Current Period';
    }

    const newItem = {
      ...item,
      group: groupLabel
    };

    if (xKey !== 'group') {
      newItem[xKey] = groupLabel;
    }

    return newItem;
  });

  const handleClick = (data: any) => {
    if (onClick && data && data.activePayload) {
      onClick(data.activePayload[0]);
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart
        data={transformedData}
        onClick={handleClick}
        margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
      >
        <defs>
          <linearGradient id="barGradientPrimary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7B68EE" stopOpacity={1}/>
            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.8}/>
          </linearGradient>
          <linearGradient id="barGradientSuccess" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
            <stop offset="100%" stopColor="#34d399" stopOpacity={0.8}/>
          </linearGradient>
          <filter id="shadow" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#7B68EE" floodOpacity="0.15"/>
          </filter>
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
          dataKey="group"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
          dy={8}
          interval={0}
        />

        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          width={40}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(123, 104, 238, 0.05)' }} />

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

        {config.multiSeries ? (
          <>
            <Bar
              dataKey="forecast"
              fill="url(#barGradientPrimary)"
              radius={[6, 6, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
              name="Forecast"
              filter="url(#shadow)"
            />
            <Bar
              dataKey="actual"
              fill="url(#barGradientSuccess)"
              radius={[6, 6, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
              name="Actual"
            />
          </>
        ) : (
          <Bar
            dataKey={yKey}
            fill="url(#barGradientPrimary)"
            radius={[6, 6, 0, 0]}
            animationDuration={800}
            animationEasing="ease-out"
            cursor="pointer"
            filter="url(#shadow)"
          >
            {transformedData.map((entry: any, index: number) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#barGradientPrimary)`}
              />
            ))}
          </Bar>
        )}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;
