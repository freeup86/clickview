import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PieChartProps {
  data: any;
  config: {
    innerRadius?: number;
    showLegend?: boolean;
    showLabels?: boolean;
    colors?: string[];
  };
}

const COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#14b8a6', // Teal
];

const PieChart: React.FC<PieChartProps> = ({ data, config }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No data available
      </div>
    );
  }

  const chartData = Array.isArray(data) ? data : [data];
  const colors = config.colors || COLORS;

  const renderLabel = (entry: any) => {
    const total = chartData.reduce((sum: number, item: any) => sum + item.value, 0);
    const percent = ((entry.value / total) * 100).toFixed(1);
    return config.showLabels ? `${percent}%` : '';
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={config.innerRadius || 0}
          outerRadius="80%"
          fill="#8884d8"
          dataKey="value"
          label={renderLabel}
          animationBegin={0}
          animationDuration={800}
        >
          {chartData.map((entry: any, index: number) => (
            <Cell 
              key={`cell-${index}`} 
              fill={colors[index % colors.length]}
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }}
            />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{
            backgroundColor: '#fff',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            padding: '12px'
          }}
          labelStyle={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}
          itemStyle={{ fontSize: '12px', color: '#6b7280' }}
        />
        {config.showLegend !== false && (
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
            iconSize={10}
          />
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

export default PieChart;