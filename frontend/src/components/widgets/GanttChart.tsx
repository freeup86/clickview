import React from 'react';

interface GanttChartProps {
  data: any;
  config: any;
}

const GanttChart: React.FC<GanttChartProps> = ({ data, config }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No data available
      </div>
    );
  }

  // Simplified Gantt chart visualization
  return (
    <div className="overflow-auto h-full">
      <div className="space-y-2 p-2">
        {data.map((task: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div className="w-32 text-sm truncate">{task.name}</div>
            <div className="flex-1 bg-gray-100 rounded h-6 relative">
              <div
                className="absolute h-full bg-primary-500 rounded"
                style={{
                  left: `${task.progress || 0}%`,
                  width: `${100 - (task.progress || 0)}%`,
                  opacity: 0.3,
                }}
              />
              <div
                className="absolute h-full bg-primary-500 rounded"
                style={{
                  width: `${task.progress || 0}%`,
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {task.progress || 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GanttChart;