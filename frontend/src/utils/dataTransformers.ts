/**
 * Data Transformation Utilities
 *
 * Handles data aggregation, filtering, sorting, and transformation
 * for chart visualization
 */

import { ChartData, Series, AggregationType, DataPoint } from '../types/charts';

export class DataTransformers {
  /**
   * Transform raw data into chart-ready format
   */
  static transformToChartData(
    data: any[],
    xField: string,
    yField: string | string[],
    seriesField?: string
  ): ChartData {
    if (!data || data.length === 0) {
      return { series: [] };
    }

    // Single series
    if (!seriesField) {
      const yFields = Array.isArray(yField) ? yField : [yField];

      const series: Series[] = yFields.map((field) => ({
        name: field,
        data: data.map((item) => ({
          x: item[xField],
          y: item[field],
          ...item, // Include all fields for tooltip
        })),
      }));

      return {
        series,
        categories: data.map((item) => String(item[xField])),
      };
    }

    // Multiple series grouped by seriesField
    const seriesMap = new Map<string, DataPoint[]>();

    data.forEach((item) => {
      const seriesKey = String(item[seriesField]);
      if (!seriesMap.has(seriesKey)) {
        seriesMap.set(seriesKey, []);
      }

      const yValue = Array.isArray(yField) ? item[yField[0]] : item[yField];

      seriesMap.get(seriesKey)!.push({
        x: item[xField],
        y: yValue,
        ...item,
      });
    });

    const series: Series[] = Array.from(seriesMap.entries()).map(([name, dataPoints]) => ({
      name,
      data: dataPoints,
    }));

    return {
      series,
      categories: [...new Set(data.map((item) => String(item[xField])))],
    };
  }

  /**
   * Aggregate data by group
   */
  static aggregate(
    data: any[],
    groupByField: string,
    valueField: string,
    aggregationType: AggregationType
  ): any[] {
    const groups = new Map<string, any[]>();

    // Group data
    data.forEach((item) => {
      const key = String(item[groupByField]);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    // Aggregate each group
    return Array.from(groups.entries()).map(([groupKey, items]) => {
      const values = items.map((item) => Number(item[valueField])).filter((v) => !isNaN(v));

      let aggregatedValue: number;

      switch (aggregationType) {
        case AggregationType.SUM:
          aggregatedValue = values.reduce((sum, val) => sum + val, 0);
          break;

        case AggregationType.AVG:
          aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;

        case AggregationType.COUNT:
          aggregatedValue = values.length;
          break;

        case AggregationType.MIN:
          aggregatedValue = Math.min(...values);
          break;

        case AggregationType.MAX:
          aggregatedValue = Math.max(...values);
          break;

        case AggregationType.MEDIAN:
          const sorted = [...values].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          aggregatedValue =
            sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
          break;

        case AggregationType.DISTINCT_COUNT:
          aggregatedValue = new Set(values).size;
          break;

        case AggregationType.FIRST:
          aggregatedValue = values[0];
          break;

        case AggregationType.LAST:
          aggregatedValue = values[values.length - 1];
          break;

        default:
          aggregatedValue = values.reduce((sum, val) => sum + val, 0);
      }

      return {
        [groupByField]: groupKey,
        [valueField]: aggregatedValue,
        _count: values.length,
        _items: items,
      };
    });
  }

  /**
   * Filter data based on conditions
   */
  static filter(
    data: any[],
    filters: Array<{
      field: string;
      operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between';
      value: any;
    }>
  ): any[] {
    return data.filter((item) => {
      return filters.every((filter) => {
        const itemValue = item[filter.field];

        switch (filter.operator) {
          case 'equals':
            return itemValue === filter.value;

          case 'contains':
            return String(itemValue).toLowerCase().includes(String(filter.value).toLowerCase());

          case 'greaterThan':
            return Number(itemValue) > Number(filter.value);

          case 'lessThan':
            return Number(itemValue) < Number(filter.value);

          case 'between':
            return (
              Array.isArray(filter.value) &&
              Number(itemValue) >= Number(filter.value[0]) &&
              Number(itemValue) <= Number(filter.value[1])
            );

          default:
            return true;
        }
      });
    });
  }

  /**
   * Sort data
   */
  static sort(data: any[], field: string, order: 'asc' | 'desc' = 'asc'): any[] {
    return [...data].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];

      // Handle different data types
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return order === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // String comparison
      const aStr = String(aValue);
      const bStr = String(bValue);
      return order === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }

  /**
   * Pivot data for pivot tables
   */
  static pivot(
    data: any[],
    rowField: string,
    columnField: string,
    valueField: string,
    aggregation: AggregationType = AggregationType.SUM
  ): any[] {
    const pivot: any[] = [];
    const rowKeys = [...new Set(data.map((item) => item[rowField]))];
    const colKeys = [...new Set(data.map((item) => item[columnField]))];

    rowKeys.forEach((rowKey) => {
      const row: any = { [rowField]: rowKey };

      colKeys.forEach((colKey) => {
        const filtered = data.filter(
          (item) => item[rowField] === rowKey && item[columnField] === colKey
        );

        if (filtered.length > 0) {
          const values = filtered.map((item) => Number(item[valueField])).filter((v) => !isNaN(v));
          row[String(colKey)] = this.applyAggregation(values, aggregation);
        } else {
          row[String(colKey)] = null;
        }
      });

      pivot.push(row);
    });

    return pivot;
  }

  /**
   * Apply aggregation to values
   */
  private static applyAggregation(values: number[], aggregation: AggregationType): number {
    if (values.length === 0) return 0;

    switch (aggregation) {
      case AggregationType.SUM:
        return values.reduce((sum, val) => sum + val, 0);
      case AggregationType.AVG:
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case AggregationType.COUNT:
        return values.length;
      case AggregationType.MIN:
        return Math.min(...values);
      case AggregationType.MAX:
        return Math.max(...values);
      case AggregationType.MEDIAN:
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      default:
        return values[0];
    }
  }

  /**
   * Time-series bucketing
   */
  static timeBucket(
    data: any[],
    timeField: string,
    bucketSize: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year',
    valueField: string,
    aggregation: AggregationType = AggregationType.SUM
  ): any[] {
    const buckets = new Map<string, any[]>();

    data.forEach((item) => {
      const date = new Date(item[timeField]);
      const bucketKey = this.getBucketKey(date, bucketSize);

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(item);
    });

    return Array.from(buckets.entries())
      .map(([bucket, items]) => {
        const values = items.map((item) => Number(item[valueField])).filter((v) => !isNaN(v));

        return {
          [timeField]: bucket,
          [valueField]: this.applyAggregation(values, aggregation),
          _count: items.length,
        };
      })
      .sort((a, b) => new Date(a[timeField]).getTime() - new Date(b[timeField]).getTime());
  }

  /**
   * Get bucket key for time-series
   */
  private static getBucketKey(
    date: Date,
    bucketSize: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
  ): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();

    switch (bucketSize) {
      case 'hour':
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:00`;
      case 'day':
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${String(Math.ceil(weekStart.getDate() / 7)).padStart(2, '0')}`;
      case 'month':
        return `${year}-${String(month).padStart(2, '0')}`;
      case 'quarter':
        const quarter = Math.ceil(month / 3);
        return `${year}-Q${quarter}`;
      case 'year':
        return String(year);
      default:
        return date.toISOString();
    }
  }

  /**
   * Calculate moving average
   */
  static movingAverage(
    data: any[],
    valueField: string,
    windowSize: number
  ): any[] {
    return data.map((item, index) => {
      const start = Math.max(0, index - windowSize + 1);
      const window = data.slice(start, index + 1);
      const values = window.map((w) => Number(w[valueField])).filter((v) => !isNaN(v));
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

      return {
        ...item,
        [`${valueField}_ma${windowSize}`]: avg,
      };
    });
  }

  /**
   * Calculate percentage change
   */
  static percentageChange(
    data: any[],
    valueField: string
  ): any[] {
    return data.map((item, index) => {
      if (index === 0) {
        return {
          ...item,
          [`${valueField}_pct_change`]: 0,
        };
      }

      const current = Number(item[valueField]);
      const previous = Number(data[index - 1][valueField]);
      const pctChange = previous !== 0 ? ((current - previous) / previous) * 100 : 0;

      return {
        ...item,
        [`${valueField}_pct_change`]: pctChange,
      };
    });
  }

  /**
   * Detect outliers using IQR method
   */
  static detectOutliers(
    data: any[],
    valueField: string
  ): { data: any[]; outliers: any[] } {
    const values = data.map((item) => Number(item[valueField])).filter((v) => !isNaN(v));
    const sorted = [...values].sort((a, b) => a - b);

    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const normal: any[] = [];
    const outliers: any[] = [];

    data.forEach((item) => {
      const value = Number(item[valueField]);
      if (value < lowerBound || value > upperBound) {
        outliers.push({ ...item, _isOutlier: true });
      } else {
        normal.push({ ...item, _isOutlier: false });
      }
    });

    return { data: normal, outliers };
  }
}

/**
 * Number formatting utilities
 */
export class NumberFormatters {
  static formatNumber(
    value: number,
    format?: string
  ): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '-';
    }

    // Default formats
    if (!format) {
      return value.toLocaleString();
    }

    // Currency
    if (format.startsWith('$')) {
      const decimals = parseInt(format.substring(1) || '2');
      return `$${value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    }

    // Percentage
    if (format === '%') {
      return `${(value * 100).toFixed(2)}%`;
    }

    // Decimal places
    if (format.startsWith('.')) {
      const decimals = parseInt(format.substring(1));
      return value.toFixed(decimals);
    }

    // Compact notation (1.2K, 3.4M, etc.)
    if (format === 'compact') {
      return this.formatCompact(value);
    }

    return value.toLocaleString();
  }

  static formatCompact(value: number): string {
    const abs = Math.abs(value);

    if (abs >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B`;
    } else if (abs >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    } else if (abs >= 1e3) {
      return `${(value / 1e3).toFixed(1)}K`;
    }

    return value.toString();
  }

  static formatPercentage(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  static formatCurrency(
    value: number,
    currency: string = 'USD',
    decimals: number = 2
  ): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }
}

/**
 * Date formatting utilities
 */
export class DateFormatters {
  static formatDate(
    date: Date | string,
    format: string = 'YYYY-MM-DD'
  ): string {
    const d = date instanceof Date ? date : new Date(date);

    if (isNaN(d.getTime())) {
      return '-';
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  static formatRelative(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) > 1 ? 's' : ''} ago`;

    return this.formatDate(d, 'YYYY-MM-DD');
  }
}
