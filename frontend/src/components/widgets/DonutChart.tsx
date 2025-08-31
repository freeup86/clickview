import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
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

const defaultColors = {
  PREDEVELOPMENT: '#ef4444',
  PAUSED: '#a855f7',
  OUTLINES: '#ec4899',
  STORYBOARD: '#10b981',
  DEVELOPMENT: '#f59e0b',
  COMPLETED: '#3b82f6',
};

const DonutChart: React.FC<DonutChartProps> = ({ data, config, onClick }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No data available
      </div>
    );
  }

  const chartData = Array.isArray(data) ? data : [data];
  const dataKey = config.dataKey || 'value';
  const nameKey = config.nameKey || 'name';
  const colors = { ...defaultColors, ...config.colors };
  
  // Calculate total
  const total = chartData.reduce((sum, item) => sum + (item[dataKey] || 0), 0);

  // Custom label with percentage
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent, index
  }: any) => {
    if (!config.showPercentages || percent < 0.03) return null; // Don't show labels for very small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0];
      const percentage = ((data.value / total) * 100).toFixed(2);
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-sm flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full inline-block" 
              style={{ backgroundColor: data.payload.fill }}
            />
            {data.name}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Count: <span className="font-semibold">{data.value}</span>
          </p>
          <p className="text-xs text-gray-600">
            Percentage: <span className="font-semibold">{percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap gap-2 justify-center mt-4">
        {payload.map((entry: any, index: number) => {
          const percentage = ((entry.payload[dataKey] / total) * 100).toFixed(1);
          return (
            <li key={`item-${index}`} className="flex items-center gap-1 text-xs">
              <span 
                className="w-3 h-3 rounded-full inline-block" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-700">{entry.value}:</span>
              <span className="font-semibold text-gray-900">{percentage}%</span>
            </li>
          );
        })}
      </ul>
    );
  };

  const handleClick = (data: any) => {
    if (onClick) {
      onClick(data);
    }
  };

  // Add fill color to data
  const processedData = chartData.map((item: any) => ({
    ...item,
    fill: colors[item[nameKey]] || colors[item.status] || '#8884d8'
  }));

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4">
      {config.title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{config.title}</h3>
      )}
      <ResponsiveContainer width="100%" height={config.showLegend ? "70%" : "85%"}>
        <PieChart>
          <Pie
            data={processedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={config.showPercentages ? renderCustomizedLabel : false}
            outerRadius={80}
            innerRadius={50}
            dataKey={dataKey}
            nameKey={nameKey}
            onClick={handleClick}
            cursor="pointer"
          >
            {processedData.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {config.showTotal !== false && (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
              <tspan fontSize="24" fontWeight="bold" fill="#1f2937">{total}</tspan>
              <tspan fontSize="12" fill="#6b7280" x="50%" dy="20">Total</tspan>
            </text>
          )}
        </PieChart>
      </ResponsiveContainer>
      {config.showLegend !== false && (
        <Legend content={renderCustomLegend} />
      )}
    </div>
  );
};

export default DonutChart;