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

const BarChart: React.FC<BarChartProps> = ({ data, config, onClick }) => {
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
  
  // Transform data to ensure valid labels
  const transformedData = chartData.map((item: any) => {
    let groupLabel = item.group;
    
    // Handle various invalid group values
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
    
    // Also ensure the xKey field is set properly
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
        margin={{ top: 20, right: 30, left: 40, bottom: 40 }}
      >
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9}/>
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.9}/>
          </linearGradient>
        </defs>
        {config.showGrid !== false && (
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" strokeOpacity={0.5} />
        )}
        <XAxis 
          dataKey="group"
          stroke="#374151"
          tick={{ fill: '#374151', fontSize: 11 }}
          interval={0}
        />
        <YAxis 
          tick={{ fontSize: 11, fill: '#6b7280' }}
          stroke="#e5e7eb"
          axisLine={{ strokeWidth: 0.5 }}
          label={{ 
            value: config.yAxisLabel || 'Task Count', 
            angle: -90, 
            position: 'insideLeft',
            style: { fontSize: 12, fill: '#6b7280' }
          }}
        />
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
        {config.showLegend && (
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="rect"
            iconSize={12}
          />
        )}
        {config.multiSeries ? (
          <>
            <Bar 
              dataKey="forecast"
              fill="#6366f1"
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
              name="Forecast"
            >
              <LabelList 
                dataKey="forecast" 
                position="top" 
                style={{ fontSize: '10px', fill: '#6366f1' }}
              />
            </Bar>
            <Bar 
              dataKey="actual"
              fill="#10b981"
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
              name="Actual"
            >
              <LabelList 
                dataKey="actual" 
                position="top" 
                style={{ fontSize: '10px', fill: '#10b981' }}
              />
            </Bar>
          </>
        ) : (
          <Bar 
            dataKey={yKey}
            fill="url(#colorGradient)"
            radius={[8, 8, 0, 0]}
            animationDuration={1000}
            cursor="pointer"
          >
            <LabelList 
              dataKey={yKey} 
              position="top" 
              style={{ fontSize: '10px', fill: '#6366f1' }}
            />
          </Bar>
        )}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;