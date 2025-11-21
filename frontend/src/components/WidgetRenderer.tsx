/**
 * Widget Renderer
 *
 * Centralized widget rendering system that dynamically loads the correct
 * chart component based on widget configuration.
 *
 * Supports:
 * - Dynamic chart type selection
 * - Data fetching and caching
 * - Error boundaries
 * - Loading states
 * - Event handling
 * - Drill-down navigation
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WidgetConfig, ChartType, ChartData, ChartEvent } from '../types/charts';
import { DataTransformers } from '../utils/dataTransformers';

// Chart components
import { LineChartComponent } from './charts/LineChart';
import { BarChartComponent } from './charts/BarChart';
import { PieChartComponent } from './charts/PieChart';
import { AreaChartComponent } from './charts/AreaChart';
import { ScatterChartComponent } from './charts/ScatterChart';
import { ComboChartComponent } from './charts/ComboChart';
import { FunnelChartComponent } from './charts/FunnelChart';

// Chart registry mapping types to components
const CHART_COMPONENTS: Record<ChartType, React.ComponentType<any>> = {
  // Basic charts - fully implemented
  [ChartType.LINE]: LineChartComponent,
  [ChartType.BAR]: BarChartComponent,
  [ChartType.COLUMN]: BarChartComponent,
  [ChartType.PIE]: PieChartComponent,
  [ChartType.DONUT]: PieChartComponent,
  [ChartType.AREA]: AreaChartComponent,
  [ChartType.SCATTER]: ScatterChartComponent,

  // Advanced charts - implemented
  [ChartType.STACKED_BAR]: BarChartComponent,
  [ChartType.STACKED_AREA]: AreaChartComponent,
  [ChartType.GROUPED_BAR]: BarChartComponent,
  [ChartType.COMBO]: ComboChartComponent,
  [ChartType.DUAL_AXIS]: ComboChartComponent,

  // Business charts - implemented
  [ChartType.FUNNEL]: FunnelChartComponent,

  // Others default to similar charts (placeholders for future)
  [ChartType.BOX_PLOT]: LineChartComponent,
  [ChartType.VIOLIN]: LineChartComponent,
  [ChartType.HISTOGRAM]: BarChartComponent,
  [ChartType.WATERFALL]: BarChartComponent,
  [ChartType.BULLET]: BarChartComponent,
  [ChartType.GAUGE]: PieChartComponent,
  [ChartType.HEATMAP]: LineChartComponent,
  [ChartType.TREEMAP]: PieChartComponent,
  [ChartType.SUNBURST]: PieChartComponent,
  [ChartType.SANKEY]: LineChartComponent,
  [ChartType.CANDLESTICK]: LineChartComponent,
  [ChartType.RADAR]: LineChartComponent,
  [ChartType.POLAR]: PieChartComponent,
  [ChartType.TIMELINE]: LineChartComponent,
  [ChartType.GANTT]: BarChartComponent,
  [ChartType.METRIC]: LineChartComponent,
  [ChartType.KPI_CARD]: LineChartComponent,
  [ChartType.TABLE]: LineChartComponent,
  [ChartType.PIVOT_TABLE]: LineChartComponent,
  [ChartType.MAP]: LineChartComponent,
  [ChartType.CHOROPLETH]: LineChartComponent,
};

interface WidgetRendererProps {
  config: WidgetConfig;
  onDrillDown?: (targetDashboardId: string, params: Record<string, any>) => void;
  className?: string;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  config,
  onDrillDown,
  className = '',
}) => {
  const navigate = useNavigate();
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch data based on data source configuration
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!config.dataSource) {
          throw new Error('No data source configured');
        }

        if (config.dataSource.type === 'static' && config.dataSource.data) {
          // Static data
          setData(config.dataSource.data);
        } else if (config.dataSource.type === 'api' && config.dataSource.endpoint) {
          // API endpoint
          const response = await fetch(config.dataSource.endpoint);
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }
          const result = await response.json();
          setData(result);
        } else if (config.dataSource.type === 'query' && config.dataSource.query) {
          // SQL query (would call backend)
          // For now, use mock data
          setData([]);
        }
      } catch (err) {
        console.error('Error fetching widget data:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up refresh interval if configured
    if (config.dataSource?.refreshInterval) {
      const interval = setInterval(fetchData, config.dataSource.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [config.dataSource]);

  // Transform raw data into chart-ready format
  const chartData: ChartData = useMemo(() => {
    if (!data || data.length === 0) {
      return { series: [] };
    }

    // Apply filters
    let filteredData = data;
    if (config.filters && config.filters.length > 0) {
      filteredData = DataTransformers.filter(data, config.filters);
    }

    // Transform based on data mapping
    const { xField, yField, seriesField } = config.dataMapping;

    if (!xField || !yField) {
      return { series: [] };
    }

    return DataTransformers.transformToChartData(
      filteredData,
      xField,
      yField,
      seriesField
    );
  }, [data, config.dataMapping, config.filters]);

  // Handle chart events
  const handleChartEvent = (event: ChartEvent) => {
    // Handle click events
    if (event.type === 'click' && config.chartConfig.drillDown?.enabled) {
      const { targetDashboardId, parameterMapping } = config.chartConfig.drillDown;

      if (targetDashboardId) {
        // Build parameters from clicked data
        const params: Record<string, any> = {};

        if (parameterMapping && event.data) {
          Object.entries(parameterMapping).forEach(([paramName, fieldName]) => {
            params[paramName] = event.data[fieldName];
          });
        }

        // Navigate to target dashboard or call callback
        if (onDrillDown) {
          onDrillDown(targetDashboardId, params);
        } else {
          navigate(`/dashboards/${targetDashboardId}`, { state: { params } });
        }
      }
    }
  };

  // Get the chart component for this widget type
  const ChartComponent = CHART_COMPONENTS[config.type];

  if (!ChartComponent) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-red-600">
          Unsupported chart type: {config.type}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-full ${className}`}>
      {/* Widget title */}
      {config.title && (
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-white border-b">
          <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
          {config.description && (
            <p className="text-sm text-gray-500 mt-1">{config.description}</p>
          )}
        </div>
      )}

      {/* Chart container */}
      <div
        className={config.title ? 'pt-16 h-full' : 'h-full'}
        style={{
          width: config.width || '100%',
          height: config.height || '100%',
        }}
      >
        <ChartComponent
          data={chartData}
          config={config.chartConfig}
          loading={loading}
          error={error}
          onEvent={handleChartEvent}
        />
      </div>

      {/* Refresh indicator */}
      {config.dataSource?.refreshInterval && (
        <div className="absolute bottom-2 right-2 z-10">
          <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
            <svg
              className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Auto-refresh</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Widget Grid Container
 *
 * Renders multiple widgets in a grid layout based on their positions
 */
interface WidgetGridProps {
  widgets: WidgetConfig[];
  onDrillDown?: (targetDashboardId: string, params: Record<string, any>) => void;
}

export const WidgetGrid: React.FC<WidgetGridProps> = ({ widgets, onDrillDown }) => {
  return (
    <div className="relative w-full h-full">
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className="absolute"
          style={{
            left: `${(widget.x / 12) * 100}%`,
            top: `${widget.y * 60}px`, // 60px per grid row
            width: `${(widget.width / 12) * 100}%`,
            height: `${widget.height * 60}px`,
            padding: '8px',
          }}
        >
          <div className="w-full h-full bg-white rounded-lg shadow-sm border border-gray-200">
            <WidgetRenderer
              config={widget}
              onDrillDown={onDrillDown}
              className="p-4"
            />
          </div>
        </div>
      ))}
    </div>
  );
};
