import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DonutChartProps {
  data: any;
  config: {
    title?: string;
    dataKey?: string;
    nameKey?: string;
    colors?: Record<string, string>;
    showPercentages?: boolean;
    showLegend?: boolean;
    showTotal?: boolean;
  };
  onClick?: (data: any) => void;
}

// Modern color palette
const MODERN_COLORS = [
  '#7B68EE', // Primary purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

const defaultStatusColors: Record<string, string> = {
  PREDEVELOPMENT: '#ef4444',
  PAUSED: '#a855f7',
  OUTLINES: '#ec4899',
  STORYBOARD: '#10b981',
  DEVELOPMENT: '#f59e0b',
  COMPLETED: '#7B68EE',
  OPEN: '#3b82f6',
  'IN PROGRESS': '#f59e0b',
  DONE: '#10b981',
  CLOSED: '#6b7280',
  TODO: '#94a3b8',
};

const DonutChart: React.FC<DonutChartProps> = ({ data, config, onClick }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
        <svg className="w-12 h-12 mb-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  const chartData = Array.isArray(data) ? data : [data];
  const dataKey = config.dataKey || 'value';
  const nameKey = config.nameKey || 'name';
  const colors = { ...defaultStatusColors, ...config.colors };

  // Calculate total
  const total = chartData.reduce((sum, item) => sum + (item[dataKey] || 0), 0);

  // Custom label renderer
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }: any) => {
    if (!config.showPercentages || percent < 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
        fontWeight="600"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const entry = payload[0];
      const percentage = ((entry.value / total) * 100).toFixed(1);
      return (
        <div className="chart-tooltip">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.payload.fill }}
            />
            <span className="chart-tooltip-label">{entry.name}</span>
          </div>
          <div className="space-y-0.5">
            <p className="chart-tooltip-value">
              Count: <span className="font-semibold text-gray-900">{entry.value.toLocaleString()}</span>
            </p>
            <p className="chart-tooltip-value">
              Share: <span className="font-semibold text-gray-900">{percentage}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleClick = (data: any) => {
    if (onClick) {
      onClick(data);
    }
  };

  // Process data with colors
  const processedData = chartData.map((item: any, index: number) => {
    const name = item[nameKey] || item.status || 'Unknown';
    const fill = colors[name] || colors[item.status] || MODERN_COLORS[index % MODERN_COLORS.length];
    return {
      ...item,
      name,
      fill
    };
  });

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {processedData.map((entry: any, index: number) => (
                <linearGradient
                  key={`gradient-${index}`}
                  id={`donutGradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                  <stop offset="100%" stopColor={entry.fill} stopOpacity={0.8} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={processedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={config.showPercentages ? renderCustomizedLabel : undefined}
              outerRadius="80%"
              innerRadius="55%"
              dataKey={dataKey}
              nameKey="name"
              onClick={handleClick}
              cursor="pointer"
              animationDuration={800}
              animationEasing="ease-out"
              stroke="#fff"
              strokeWidth={2}
            >
              {processedData.map((entry: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#donutGradient-${index})`}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />

            {/* Center Total Display */}
            {config.showTotal !== false && (
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                <tspan
                  x="50%"
                  dy="-6"
                  fontSize="28"
                  fontWeight="700"
                  fill="#1f2937"
                >
                  {total.toLocaleString()}
                </tspan>
                <tspan
                  x="50%"
                  dy="20"
                  fontSize="11"
                  fill="#9ca3af"
                  fontWeight="500"
                >
                  Total
                </tspan>
              </text>
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Modern Legend */}
      {config.showLegend !== false && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-2 pt-2">
          {processedData.slice(0, 6).map((entry: any, index: number) => {
            const percentage = ((entry[dataKey] / total) * 100).toFixed(0);
            return (
              <div
                key={`legend-${index}`}
                className="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handleClick({ payload: entry })}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="text-gray-600 truncate max-w-[80px]">{entry.name}</span>
                <span className="font-semibold text-gray-900">{percentage}%</span>
              </div>
            );
          })}
          {processedData.length > 6 && (
            <span className="text-xs text-gray-400">+{processedData.length - 6} more</span>
          )}
        </div>
      )}
    </div>
  );
};

export default DonutChart;
