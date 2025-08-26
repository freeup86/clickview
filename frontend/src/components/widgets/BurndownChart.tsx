import React from 'react';
import LineChart from './LineChart';

interface BurndownChartProps {
  data: any;
  config: any;
}

const BurndownChart: React.FC<BurndownChartProps> = ({ data, config }) => {
  // Transform data for burndown display
  const burndownConfig = {
    ...config,
    xAxisKey: 'date',
    yAxisKey: 'remaining',
    lineColor: '#E2445C',
    showGrid: true,
  };

  return <LineChart data={data} config={burndownConfig} />;
};

export default BurndownChart;