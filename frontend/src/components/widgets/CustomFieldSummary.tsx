import React from 'react';

interface CustomFieldSummaryProps {
  data: any;
  config: any;
}

const CustomFieldSummary: React.FC<CustomFieldSummaryProps> = ({ data, config }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No data available
      </div>
    );
  }

  const summaryData = Array.isArray(data) ? data : [data];

  return (
    <div className="space-y-3 p-2">
      {summaryData.map((item: any, index: number) => (
        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="text-sm font-medium text-gray-900">
              {item.name || item.group || `Field ${index + 1}`}
            </div>
            {item.description && (
              <div className="text-xs text-gray-500 mt-1">{item.description}</div>
            )}
          </div>
          <div className="text-lg font-semibold text-primary-500">
            {item.value !== undefined ? item.value.toLocaleString() : '-'}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CustomFieldSummary;