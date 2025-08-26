import React from 'react';

interface HeatMapProps {
  data: any;
  config: any;
}

const HeatMap: React.FC<HeatMapProps> = ({ data, config }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No data available
      </div>
    );
  }

  // Simplified heatmap visualization
  const maxValue = Math.max(...data.map((d: any) => d.value || 0));

  const getColor = (value: number) => {
    const intensity = (value / maxValue) * 100;
    if (intensity < 20) return 'bg-purple-100';
    if (intensity < 40) return 'bg-purple-200';
    if (intensity < 60) return 'bg-purple-300';
    if (intensity < 80) return 'bg-purple-400';
    return 'bg-purple-500';
  };

  return (
    <div className="grid grid-cols-7 gap-1 p-2">
      {data.map((item: any, index: number) => (
        <div
          key={index}
          className={`${getColor(item.value)} rounded p-2 text-center text-xs`}
          title={`${item.label || item.x}: ${item.value}`}
        >
          {item.value}
        </div>
      ))}
    </div>
  );
};

export default HeatMap;