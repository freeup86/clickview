import { logger } from '../config/logger';
import { 
  getDateRangeFromFilter, 
  filterByWeekdays, 
  applyCustomFieldFilter,
  calculatePercentage,
  calculateCumulative,
  groupByTimeInterval
} from '../utils/date-helpers';

export interface AggregationConfig {
  sourceData: any[];
  aggregationType: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'range' | 'median' | 'distinct' | 'percentage' | 'progress' | 'cumulative_count';
  field?: string;
  groupBy?: string;
  timeGroupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  filters?: any;
  dateField?: string;
  calculatedFields?: Array<{
    name: string;
    formula: string;
  }>;
}

export class DataAggregationService {
  static aggregate(config: AggregationConfig): any[] {
    let data = [...config.sourceData];

    // Apply filters
    if (config.filters && config.filters.length > 0) {
      data = this.applyFilters(data, config.filters);
    }

    // Apply calculated fields
    if (config.calculatedFields && config.calculatedFields.length > 0) {
      data = this.applyCalculatedFields(data, config.calculatedFields);
    }

    // Group data if needed
    if (config.groupBy || config.timeGroupBy) {
      return this.groupAndAggregate(data, config);
    }

    // Simple aggregation without grouping
    return [{
      value: this.performAggregation(data, config.aggregationType, config.field)
    }];
  }

  private static applyFilters(data: any[], filters: any): any[] {
    if (!filters) return data;
    
    let filtered = [...data];
    
    // Handle object-based filters (new format)
    if (typeof filters === 'object' && !Array.isArray(filters)) {
      // Handle date range filter
      if (filters.dateRange) {
        const { startDate, endDate } = getDateRangeFromFilter(filters.dateRange);
        filtered = filtered.filter(item => {
          const itemDate = item.date_done || item.date_created || item.due_date;
          if (!itemDate) return false;
          const date = new Date(itemDate);
          return date >= startDate && date <= endDate;
        });
      }
      
      // Handle weekdays filter
      if (filters.weekdays && Array.isArray(filters.weekdays)) {
        filtered = filterByWeekdays(filtered, filters.weekdays);
      }
      
      // Handle status filter
      if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
        filtered = filtered.filter(item => {
          const itemStatus = item.status?.status || item.status;
          return filters.status.includes(itemStatus);
        });
      }
      
      // Handle priority filter
      if (filters.priority && Array.isArray(filters.priority) && filters.priority.length > 0) {
        filtered = filtered.filter(item => {
          const itemPriority = item.priority?.priority || item.priority;
          return filters.priority.includes(itemPriority);
        });
      }
      
      // Handle custom field filters
      if (filters.customFieldFilters && Array.isArray(filters.customFieldFilters)) {
        // Filter out empty custom field filters before applying
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
        
        validCustomFieldFilters.forEach((filter: any) => {
          filtered = applyCustomFieldFilter(filtered, filter);
        });
      }
      
      // Handle value_stream filter
      if (filters.value_stream && filters.value_stream !== null && filters.value_stream !== '') {
        filtered = filtered.filter(item => item.value_stream === filters.value_stream);
      }
      
      // Handle modalities filter
      if (filters.modalities && filters.modalities !== null && filters.modalities !== '') {
        const modalitiesList = filters.modalities.split(',').map((m: string) => m.trim());
        filtered = filtered.filter(item => {
          if (!item.modalities) return false;
          const itemModalities = Array.isArray(item.modalities) ? item.modalities : [item.modalities];
          return modalitiesList.some((mod: string) => itemModalities.includes(mod));
        });
      }
      
      return filtered;
    }
    
    // Handle array-based filters (legacy format)
    if (Array.isArray(filters)) {
      return data.filter(item => {
        return filters.every(filter => {
          const fieldValue = this.getNestedValue(item, filter.field);
          return this.evaluateCondition(fieldValue, filter.operator, filter.value);
        });
      });
    }
    
    return filtered;
  }

  private static evaluateCondition(fieldValue: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === filterValue;
      case 'not_equals':
        return fieldValue !== filterValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(filterValue);
      case 'less_than':
        return Number(fieldValue) < Number(filterValue);
      case 'between':
        return Number(fieldValue) >= Number(filterValue[0]) && 
               Number(fieldValue) <= Number(filterValue[1]);
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(filterValue) && !filterValue.includes(fieldValue);
      case 'is_null':
        return fieldValue == null;
      case 'is_not_null':
        return fieldValue != null;
      default:
        return true;
    }
  }

  private static applyCalculatedFields(data: any[], calculatedFields: any[]): any[] {
    return data.map(item => {
      const enrichedItem = { ...item };
      
      calculatedFields.forEach(field => {
        try {
          enrichedItem[field.name] = this.evaluateFormula(item, field.formula);
        } catch (error) {
          logger.error('Failed to evaluate calculated field', { field, error });
          enrichedItem[field.name] = null;
        }
      });
      
      return enrichedItem;
    });
  }

  private static evaluateFormula(item: any, formula: string): any {
    // Simple formula evaluation for common cases
    // This is a basic implementation - in production, use a proper expression parser
    
    // Handle task age calculation
    if (formula === 'task_age') {
      const created = new Date(item.date_created);
      const now = new Date();
      return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Handle time to completion
    if (formula === 'time_to_completion') {
      if (item.date_done) {
        const created = new Date(item.date_created);
        const done = new Date(item.date_done);
        return Math.floor((done.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      }
      return null;
    }
    
    // Handle completion percentage
    if (formula === 'completion_percentage') {
      if (item.time_estimate && item.time_spent) {
        return Math.min(100, Math.round((item.time_spent / item.time_estimate) * 100));
      }
      return null;
    }
    
    // Handle overdue flag
    if (formula === 'is_overdue') {
      if (item.due_date && !item.date_done) {
        return new Date(item.due_date) < new Date();
      }
      return false;
    }
    
    return null;
  }

  private static groupAndAggregate(data: any[], config: AggregationConfig): any[] {
    const groups = new Map<string, any[]>();
    
    // Group data
    data.forEach(item => {
      let groupKey: string;
      
      if (config.timeGroupBy && config.groupBy) {
        const dateField = config.dateField || 'date_created';
        const timeKey = this.getTimeGroupKey(item, dateField, config.timeGroupBy);
        groupKey = timeKey;
      } else if (config.groupBy) {
        // Handle special groupBy cases
        if (config.groupBy === 'day_of_week') {
          // Extract day of week from date field
          const dateField = (config as any).dateField || 'date_done';
          const dateValue = this.getNestedValue(item, dateField);
          if (dateValue) {
            const date = new Date(dateValue);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            groupKey = days[date.getDay()];
          } else {
            groupKey = 'No Date';
          }
        } else {
          const value = this.getNestedValue(item, config.groupBy);
          // Handle ClickUp status objects - if grouping by 'status', use status.status
          if (config.groupBy === 'status' && value && typeof value === 'object' && value.status) {
            groupKey = String(value.status);
          } else if (value && typeof value === 'object') {
            // For other objects, try to get a meaningful string representation
            groupKey = value.name || value.title || value.id || String(value);
          } else {
            groupKey = String(value);
          }
        }
      } else if (config.timeGroupBy) {
        const dateField = config.dateField || 'date_created';
        groupKey = this.getTimeGroupKey(item, dateField, config.timeGroupBy);
      } else {
        groupKey = 'all';
      }
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    });
    
    // Aggregate each group
    const results: any[] = [];
    groups.forEach((groupData, groupKey) => {
      results.push({
        group: groupKey,
        value: this.performAggregation(groupData, config.aggregationType, config.field),
        count: groupData.length
      });
    });
    
    // Sort results
    results.sort((a, b) => {
      // Special sorting for day of week
      if (config.groupBy === 'day_of_week') {
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'No Date'];
        const indexA = dayOrder.indexOf(a.group);
        const indexB = dayOrder.indexOf(b.group);
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
      }
      
      if (config.timeGroupBy) {
        // Skip sorting for invalid/unknown dates
        if (a.group === 'unknown' || a.group === 'invalid') return 1;
        if (b.group === 'unknown' || b.group === 'invalid') return -1;
        
        const dateA = new Date(a.group);
        const dateB = new Date(b.group);
        
        // Check if dates are valid before comparing
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return dateA.getTime() - dateB.getTime();
        }
      }
      return String(a.group).localeCompare(String(b.group));
    });
    
    // Handle cumulative count if needed
    if (config.aggregationType === 'cumulative_count') {
      let cumulative = 0;
      return results.map(item => {
        cumulative += item.count;
        return {
          ...item,
          value: cumulative,
          cumulative_value: cumulative
        };
      });
    }
    
    return results;
  }

  private static getTimeGroupKey(item: any, dateField: string, groupBy: string): string {
    const dateValue = this.getNestedValue(item, dateField);
    
    // Handle null or undefined date values
    if (!dateValue) {
      return 'unknown';
    }
    
    // Convert to Date object - handle both timestamp and string formats
    let date: Date;
    if (typeof dateValue === 'number') {
      // ClickUp uses millisecond timestamps
      date = new Date(dateValue);
    } else if (typeof dateValue === 'string') {
      // Handle ISO string or other date formats
      date = new Date(dateValue);
    } else {
      return 'invalid';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'invalid';
    }
    
    switch (groupBy) {
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${date.getFullYear()}-Q${quarter}`;
      case 'year':
        return String(date.getFullYear());
      default:
        return date.toISOString();
    }
  }

  private static performAggregation(data: any[], type: string, field?: string): any {
    if (data.length === 0) return 0;
    
    switch (type) {
      case 'count':
        return data.length;
      
      case 'sum':
        if (!field) return 0;
        return data.reduce((sum, item) => {
          const value = Number(this.getNestedValue(item, field)) || 0;
          return sum + value;
        }, 0);
      
      case 'avg':
        if (!field) return 0;
        const sum = data.reduce((s, item) => {
          const value = Number(this.getNestedValue(item, field)) || 0;
          return s + value;
        }, 0);
        return sum / data.length;
      
      case 'min':
        if (!field) return 0;
        return Math.min(...data.map(item => 
          Number(this.getNestedValue(item, field)) || Infinity
        ));
      
      case 'max':
        if (!field) return 0;
        return Math.max(...data.map(item =>
          Number(this.getNestedValue(item, field)) || -Infinity
        ));

      case 'range':
        if (!field) return 0;
        const values = data.map(item => Number(this.getNestedValue(item, field)) || 0);
        const maxVal = Math.max(...values);
        const minVal = Math.min(...values);
        return maxVal - minVal;

      case 'median':
        if (!field) return 0;
        const sortedValues = data
          .map(item => Number(this.getNestedValue(item, field)) || 0)
          .sort((a, b) => a - b);
        const mid = Math.floor(sortedValues.length / 2);
        return sortedValues.length % 2 === 0
          ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
          : sortedValues[mid];

      case 'distinct':
        if (!field) return data.length;
        const uniqueValues = new Set(data.map(item => 
          this.getNestedValue(item, field)
        ));
        return uniqueValues.size;
      
      case 'percentage':
        // Calculate percentage of completed items
        const completed = data.filter(item => 
          item.status === 'complete' || item.status === 'closed' || 
          item.status?.status === 'complete' || item.status?.status === 'closed' ||
          item.date_done
        ).length;
        return calculatePercentage(completed, data.length);
      
      case 'progress':
        // Return progress data for progress bars
        const done = data.filter(item => 
          item.status === 'complete' || item.status === 'closed' || 
          item.status?.status === 'complete' || item.status?.status === 'closed' ||
          item.date_done
        ).length;
        return {
          value: done,
          max: data.length,
          percentage: calculatePercentage(done, data.length)
        };
      
      case 'cumulative_count':
        // This is handled differently in groupAndAggregate
        return data.length;
      
      default:
        return 0;
    }
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        if (key.includes('[') && key.includes(']')) {
          // Handle array notation
          const [arrayKey, indexStr] = key.split('[');
          const index = parseInt(indexStr.replace(']', ''));
          return current[arrayKey]?.[index];
        }
        return current[key];
      }
      return undefined;
    }, obj);
  }

  // Transform data for specific chart types
  static transformForChart(data: any[], chartType: string, config: any): any {
    switch (chartType) {
      case 'bar_chart':
      case 'line_chart':
      case 'area_chart':
        return this.transformForXYChart(data, config);
      
      case 'pie_chart':
      case 'donut_chart':
        return this.transformForPieChart(data, config);
      
      case 'heatmap':
        return this.transformForHeatmap(data, config);
      
      case 'gantt_chart':
        return this.transformForGantt(data, config);
      
      case 'burndown_chart':
        return this.transformForBurndown(data, config);
      
      default:
        return data;
    }
  }

  private static transformForXYChart(data: any[], config: any): any[] {
    return data.map(item => ({
      x: item.group || item.name || item.id,
      y: item.value,
      label: item.label || item.group
    }));
  }

  private static transformForPieChart(data: any[], config: any): any[] {
    return data.map(item => ({
      name: item.group || item.name,
      value: item.value,
      percentage: 0 // Will be calculated on frontend
    }));
  }

  private static transformForHeatmap(data: any[], config: any): any[] {
    // Create a matrix for heatmap
    const matrix: any = {};
    
    data.forEach(item => {
      const x = item[config.xField] || 'Unknown';
      const y = item[config.yField] || 'Unknown';
      const value = item[config.valueField] || 0;
      
      if (!matrix[y]) matrix[y] = {};
      matrix[y][x] = value;
    });
    
    // Convert to array format
    const result: any[] = [];
    Object.keys(matrix).forEach(y => {
      Object.keys(matrix[y]).forEach(x => {
        result.push({
          x,
          y,
          value: matrix[y][x]
        });
      });
    });
    
    return result;
  }

  private static transformForGantt(tasks: any[], config: any): any[] {
    return tasks
      .filter(task => task.start_date || task.date_created)
      .map(task => ({
        id: task.id,
        name: task.name,
        start: new Date(task.start_date || task.date_created),
        end: task.due_date ? new Date(task.due_date) : new Date(),
        progress: task.status?.type === 'closed' ? 100 : 
                  (task.time_spent && task.time_estimate) ? 
                  Math.min(100, (task.time_spent / task.time_estimate) * 100) : 0,
        assignee: task.assignees?.[0]?.username || 'Unassigned',
        status: task.status?.status || 'Unknown',
        dependencies: task.dependencies || []
      }));
  }

  private static transformForBurndown(tasks: any[], config: any): any[] {
    const startDate = config.startDate ? new Date(config.startDate) : 
                      new Date(Math.min(...tasks.map(t => new Date(t.date_created).getTime())));
    const endDate = config.endDate ? new Date(config.endDate) : new Date();
    
    // Calculate total points
    const totalPoints = tasks.reduce((sum, task) => {
      return sum + (task.time_estimate || config.defaultEstimate || 1);
    }, 0);
    
    // Generate daily burndown data
    const burndownData: any[] = [];
    const currentDate = new Date(startDate);
    let remainingPoints = totalPoints;
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Calculate completed points up to this date
      const completedPoints = tasks
        .filter(task => task.date_done && new Date(task.date_done) <= currentDate)
        .reduce((sum, task) => sum + (task.time_estimate || config.defaultEstimate || 1), 0);
      
      remainingPoints = totalPoints - completedPoints;
      
      burndownData.push({
        date: dateStr,
        ideal: totalPoints * (1 - (currentDate.getTime() - startDate.getTime()) / 
                               (endDate.getTime() - startDate.getTime())),
        actual: remainingPoints
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return burndownData;
  }
}