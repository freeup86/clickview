import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import apiService from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import KPICard from './KPICard';
import BarChart from './BarChart';
import StackedBarChart from './StackedBarChart';
import DonutChart from './DonutChart';
import LineChart from './LineChart';
import PieChart from './PieChart';
import AreaChart from './AreaChart';
import DataTable from './DataTable';
import ProgressBar from './ProgressBar';
import HeatMap from './HeatMap';
import GanttChart from './GanttChart';
import BurndownChart from './BurndownChart';
import CustomFieldSummary from './CustomFieldSummary';
import TaskDrillDownModal from './TaskDrillDownModal';
import { TextBlockWidget } from './TextBlockWidget';

interface WidgetRendererProps {
  widget: {
    id: string;
    type: string;
    title: string;
    config: any;
    data_config: any;
    filters: any;
  };
  globalFilters: any;
  workspaceId?: string;
  onChartClick?: (data: any) => void;
}

const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  globalFilters,
  workspaceId,
  onChartClick,
}) => {
  const [widgetData, setWidgetData] = useState<any>(null);
  const [showDrillDown, setShowDrillDown] = useState(false);
  const [drillDownFilters, setDrillDownFilters] = useState<any>(null);
  const [drillDownTitle, setDrillDownTitle] = useState<string>('');

  // Helper function to clean empty filter values
  const cleanFilters = (filters: any): any => {
    if (!filters) return {};
    
    const cleaned: any = {};
    
    // Copy non-empty properties
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      
      // Skip null, undefined, empty strings, and empty arrays
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            cleaned[key] = value;
          }
        } else {
          cleaned[key] = value;
        }
      }
    });
    
    // Special handling for customFieldFilters
    if (filters.customFieldFilters && Array.isArray(filters.customFieldFilters)) {
      const validCustomFieldFilters = filters.customFieldFilters.filter((filter: any) => {
        // Skip filters with empty arrays or null/undefined values
        if (!filter || !filter.field) return false;
        
        // For 'in' and 'not_in' operators, skip if value is empty array
        if ((filter.operator === 'in' || filter.operator === 'not_in') && 
            Array.isArray(filter.value) && filter.value.length === 0) {
          return false;
        }
        
        // For 'contains' operator, skip if value is empty array or empty string
        if (filter.operator === 'contains' && 
            (Array.isArray(filter.value) && filter.value.length === 0 || 
             filter.value === '' || filter.value === null || filter.value === undefined)) {
          return false;
        }
        
        // For 'equals' operator, skip if value is null or undefined
        if (filter.operator === 'equals' && 
            (filter.value === null || filter.value === undefined)) {
          return false;
        }
        
        return true;
      });
      
      if (validCustomFieldFilters.length > 0) {
        cleaned.customFieldFilters = validCustomFieldFilters;
      }
    }
    
    return cleaned;
  };

  // Fetch widget data (skip for text_block widgets)
  const { isLoading, isError, data } = useQuery(
    ['widget-data', widget.id, JSON.stringify(widget.data_config), JSON.stringify(globalFilters), JSON.stringify(widget.filters)],
    () => {
      const combinedFilters = {
        ...globalFilters,
        ...widget.filters,
      };

      // Clean the filters to remove empty values
      const cleanedFilters = cleanFilters(combinedFilters);

      // Default to 'tasks' if sourceType is not specified
      const sourceType = widget.data_config.sourceType || 'tasks';
      // Default to 'count' if aggregationType is not specified
      const aggregationType = widget.data_config.aggregationType || 'count';

      // Build parameters object, excluding empty values
      const params: any = {
        workspaceId: workspaceId!,
        sourceType,
        filters: cleanedFilters,
        aggregationType,
      };

      // Only include non-empty values
      if (widget.data_config.spaceId) params.spaceId = widget.data_config.spaceId;
      if (widget.data_config.folderId) params.folderId = widget.data_config.folderId;
      if (widget.data_config.listId) params.listId = widget.data_config.listId;
      if (widget.data_config.groupBy) params.groupBy = widget.data_config.groupBy;
      if (widget.data_config.timeGroupBy) params.timeGroupBy = widget.data_config.timeGroupBy;
      
      // Pass special data config for task completion widgets
      if (widget.data_config.dateField || widget.data_config.comparisonDateField) {
        params.dataConfig = widget.data_config;
      }

      return apiService.getAggregatedData(params);
    },
    {
      enabled: !!workspaceId && widget.type !== 'text_block',
      refetchInterval: widget.config.refreshInterval ? widget.config.refreshInterval * 1000 : false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Always treat data as stale - force fresh requests
      cacheTime: 0, // Don't cache at all
      refetchOnMount: 'always', // Always refetch when component mounts
      onSuccess: (data) => {
        if (data.success) {
          setWidgetData(data.data);
        }
      },
    }
  );

  // Skip loading/error states for text_block widgets
  if (widget.type !== 'text_block') {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="medium" />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-500 mb-2">Failed to load widget data</p>
            <button className="btn btn-sm btn-outline" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      );
    }
  }

  // Handle chart click for drill-down
  const handleChartClick = (data: any) => {
    if (onChartClick) {
      onChartClick(data);
    }
    
    // Set up drill-down filters based on clicked data
    const baseFilters = {
      ...globalFilters,
      ...widget.filters
    };
    
    // Create proper filters based on clicked segment
    let drillFilters: any = {};
    
    if (data.payload) {
      const clickedData = data.payload;
      
      // Handle status clicks (from donut charts)
      if (clickedData.status || clickedData.name) {
        const statusValue = clickedData.status || clickedData.name;
        drillFilters.status = [statusValue]; // Status filter expects an array
      }
      
      // Handle date-based clicks (from bar charts)
      if (clickedData.group) {
        // If it's a day of week, we need to filter by that day
        const dayMatch = clickedData.group.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i);
        if (dayMatch) {
          // For day of week, we can add a custom filter or just show all tasks
          // Since the backend doesn't support day-of-week filtering directly,
          // we'll show all tasks from that period
          drillFilters.dateRange = 'current_week';
        } else if (clickedData.group.includes('Week')) {
          // Handle week-based filtering
          drillFilters.dateRange = 'current_week';
        }
      }
      
      // Handle priority clicks
      if (clickedData.priority) {
        drillFilters.priority = [clickedData.priority];
      }
      
      // Handle assignee clicks
      if (clickedData.assignee) {
        drillFilters.assignees = [clickedData.assignee];
      }
    }
    
    // Merge with base filters but only include valid filter fields
    const finalFilters = {
      ...baseFilters,
      ...drillFilters
    };
    
    // Remove any invalid fields that the backend doesn't accept
    delete finalFilters.group;
    
    setDrillDownFilters(finalFilters);
    setDrillDownTitle(`${widget.title} - ${data.payload?.group || data.payload?.name || 'Details'}`);
    setShowDrillDown(true);
  };

  // Render appropriate widget based on type
  return (
    <>
      {(() => {
        switch (widget.type) {
          case 'kpi_card':
            return <KPICard data={widgetData} config={widget.config} />;
          
          case 'bar_chart':
            return <BarChart data={widgetData} config={widget.config} onClick={handleChartClick} />;
          
          case 'stacked_bar_chart':
            return <StackedBarChart data={widgetData} config={widget.config} onClick={handleChartClick} />;
          
          case 'line_chart':
            return <LineChart data={widgetData} config={widget.config} onClick={handleChartClick} />;

          case 'pie_chart':
            return <PieChart data={widgetData} config={widget.config} onClick={handleChartClick} />;

          case 'donut_chart':
            return <DonutChart data={widgetData} config={widget.config} onClick={handleChartClick} />;

          case 'area_chart':
            return <AreaChart data={widgetData} config={widget.config} onClick={handleChartClick} />;
          
          case 'data_table':
            return <DataTable data={widgetData} config={widget.config} />;
          
          case 'progress_bar':
            return <ProgressBar data={widgetData} config={widget.config} />;
          
          case 'heatmap':
            return <HeatMap data={widgetData} config={widget.config} onClick={handleChartClick} />;

          case 'gantt_chart':
            return <GanttChart data={widgetData} config={widget.config} onClick={handleChartClick} />;

          case 'burndown_chart':
            return <BurndownChart data={widgetData} config={widget.config} onClick={handleChartClick} />;
          
          case 'custom_field_summary':
            return <CustomFieldSummary data={widgetData} config={widget.config} />;

          case 'text_block':
            return (
              <TextBlockWidget
                content={widget.config?.content || ''}
                readOnly={false}
                onSave={(content) => {
                  // Update widget config with new content
                  // This would typically call an API to save the widget
                  console.log('Saving text block content:', content);
                }}
              />
            );

          default:
            return (
              <div className="flex items-center justify-center h-full text-gray-500">
                Unsupported widget type: {widget.type}
              </div>
            );
        }
      })()}
      
      {/* Drill-down modal */}
      {workspaceId && (
        <TaskDrillDownModal
          isOpen={showDrillDown}
          onClose={() => setShowDrillDown(false)}
          filters={drillDownFilters}
          workspaceId={workspaceId}
          title={drillDownTitle}
          listId={widget.data_config?.listId}
          spaceId={widget.data_config?.spaceId}
        />
      )}
    </>
  );
};

export default WidgetRenderer;