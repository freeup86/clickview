import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
         subDays, subWeeks, subMonths, addWeeks, addDays } from 'date-fns';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export function getDateRangeFromFilter(dateRange: string): DateRange {
  const now = new Date();
  
  switch (dateRange) {
    case 'today':
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now)
      };
      
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday)
      };
      
    case 'current_week':
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }), // Monday
        endDate: endOfWeek(now, { weekStartsOn: 1 })
      };
      
    case 'last_week':
      const lastWeek = subWeeks(now, 1);
      return {
        startDate: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        endDate: endOfWeek(lastWeek, { weekStartsOn: 1 })
      };
      
    case 'next_week':
      const nextWeek = addWeeks(now, 1);
      return {
        startDate: startOfWeek(nextWeek, { weekStartsOn: 1 }),
        endDate: endOfWeek(nextWeek, { weekStartsOn: 1 })
      };
      
    case 'current_month':
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now)
      };
      
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth)
      };
      
    case 'last_7_days':
      return {
        startDate: startOfDay(subDays(now, 7)),
        endDate: endOfDay(now)
      };
      
    case 'last_30_days':
      return {
        startDate: startOfDay(subDays(now, 30)),
        endDate: endOfDay(now)
      };
      
    default:
      // Default to last 7 days
      return {
        startDate: startOfDay(subDays(now, 7)),
        endDate: endOfDay(now)
      };
  }
}

export function filterByWeekdays(data: any[], weekdays: string[], dateField: string = 'date_done'): any[] {
  const weekdayMap: { [key: string]: number } = {
    'Sun': 0, 'Sunday': 0,
    'Mon': 1, 'Monday': 1,
    'Tue': 2, 'Tuesday': 2,
    'Wed': 3, 'Wednesday': 3,
    'Thu': 4, 'Thursday': 4,
    'Fri': 5, 'Friday': 5,
    'Sat': 6, 'Saturday': 6
  };
  
  const targetDays = weekdays.map(day => weekdayMap[day]).filter(d => d !== undefined);
  
  return data.filter(item => {
    const date = item[dateField];
    if (!date) return false;
    
    const itemDate = new Date(date);
    const dayOfWeek = itemDate.getDay();
    
    return targetDays.includes(dayOfWeek);
  });
}

export function applyCustomFieldFilter(data: any[], filter: any): any[] {
  const { field, operator, value } = filter;
  
  return data.filter(item => {
    const fieldParts = field.split('.');
    let fieldValue = item;
    
    // Navigate nested fields
    for (const part of fieldParts) {
      fieldValue = fieldValue?.[part];
      if (fieldValue === undefined) return false;
    }
    
    // Apply operator
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'not_contains':
        return !String(fieldValue).includes(String(value));
      case 'greater_than':
        return fieldValue > value;
      case 'less_than':
        return fieldValue < value;
      case 'between':
        return Array.isArray(value) && fieldValue >= value[0] && fieldValue <= value[1];
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'is_null':
        return fieldValue === null || fieldValue === undefined;
      case 'is_not_null':
        return fieldValue !== null && fieldValue !== undefined;
      default:
        return true;
    }
  });
}

export function calculatePercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function calculateCumulative(data: any[], dateField: string = 'date', valueField: string = 'count'): any[] {
  // Sort by date
  const sorted = [...data].sort((a, b) => {
    const dateA = new Date(a[dateField]).getTime();
    const dateB = new Date(b[dateField]).getTime();
    return dateA - dateB;
  });
  
  // Calculate cumulative values
  let cumulative = 0;
  return sorted.map(item => {
    cumulative += item[valueField] || 0;
    return {
      ...item,
      cumulative_value: cumulative
    };
  });
}

export function groupByTimeInterval(data: any[], interval: string, dateField: string = 'date_done'): Map<string, any[]> {
  const grouped = new Map<string, any[]>();
  
  data.forEach(item => {
    const date = item[dateField];
    if (!date) return;
    
    const itemDate = new Date(date);
    let key: string;
    
    switch (interval) {
      case 'day':
        key = itemDate.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = startOfWeek(itemDate, { weekStartsOn: 1 });
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarter':
        const quarter = Math.floor(itemDate.getMonth() / 3) + 1;
        key = `${itemDate.getFullYear()}-Q${quarter}`;
        break;
      case 'year':
        key = String(itemDate.getFullYear());
        break;
      default:
        key = itemDate.toISOString().split('T')[0];
    }
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  });
  
  return grouped;
}