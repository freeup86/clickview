/**
 * Drill-Down Hook
 *
 * Provides drill-down functionality for chart components.
 * Manages drill-down state and modal display.
 */

import { useState, useCallback } from 'react';
import { ChartEvent } from '../types/charts';
import { DrillDownData } from '../components/DrillDownModal';

export interface UseDrillDownOptions {
  enabled?: boolean;
  dataSource?: any[];
  getFilteredData?: (event: ChartEvent) => any[];
  columns?: DrillDownData['columns'];
  onNavigate?: (item: any) => void;
}

export const useDrillDown = (options: UseDrillDownOptions = {}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);

  const openDrillDown = useCallback(
    (event: ChartEvent, title?: string) => {
      if (!options.enabled) return;

      // Get filtered data based on the clicked element
      let filteredData: any[] = [];

      if (options.getFilteredData) {
        filteredData = options.getFilteredData(event);
      } else if (options.dataSource) {
        // Default filtering logic
        filteredData = options.dataSource.filter((item) => {
          if (event.data?.group) {
            // Filter by group value (e.g., clicked bar in bar chart)
            return Object.values(item).some(
              (value) => String(value) === String(event.data.group)
            );
          }
          return true;
        });
      }

      // Determine default columns if not provided
      const columns =
        options.columns ||
        (filteredData.length > 0
          ? Object.keys(filteredData[0]).map((key) => ({
              key,
              label: key
                .split('_')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
              type: inferColumnType(filteredData[0][key]),
            }))
          : []);

      const drillDownTitle =
        title ||
        `Details: ${event.data?.name || event.data?.group || 'Data'}`;

      setDrillDownData({
        title: drillDownTitle,
        data: filteredData,
        columns,
        onNavigate: options.onNavigate,
        metadata: {
          totalCount: options.dataSource?.length,
          chartEvent: event,
        },
      });

      setIsModalOpen(true);
    },
    [options]
  );

  const closeDrillDown = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleChartClick = useCallback(
    (event: ChartEvent) => {
      openDrillDown(event);
    },
    [openDrillDown]
  );

  return {
    isModalOpen,
    drillDownData,
    openDrillDown,
    closeDrillDown,
    handleChartClick,
  };
};

/**
 * Infer column type from value
 */
function inferColumnType(
  value: any
): 'string' | 'number' | 'date' | 'status' | 'priority' {
  if (value == null) return 'string';

  // Check if it's a date
  if (value instanceof Date || (!isNaN(Date.parse(value)) && String(value).includes('-'))) {
    return 'date';
  }

  // Check if it's a number
  if (typeof value === 'number' || !isNaN(Number(value))) {
    return 'number';
  }

  // Check if it's a status object or field
  if (
    (typeof value === 'object' && 'status' in value) ||
    (typeof value === 'string' &&
      /status|complete|progress|review|open|closed|done/i.test(value))
  ) {
    return 'status';
  }

  // Check if it's a priority object or field
  if (
    (typeof value === 'object' && 'priority' in value) ||
    (typeof value === 'string' && /urgent|high|normal|low|priority/i.test(value))
  ) {
    return 'priority';
  }

  return 'string';
}
