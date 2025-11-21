/**
 * Conditional Formatting System
 *
 * Apply dynamic styling rules to chart data based on conditions.
 * Supports value-based rules, range-based rules, and custom logic.
 */

/**
 * Conditional formatting rule types
 */
export enum ConditionType {
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  EQUAL = 'eq',
  NOT_EQUAL = 'ne',
  BETWEEN = 'between',
  NOT_BETWEEN = 'notBetween',
  IN = 'in',
  NOT_IN = 'notIn',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notContains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  IS_NULL = 'isNull',
  IS_NOT_NULL = 'isNotNull',
  TOP_N = 'topN',
  BOTTOM_N = 'bottomN',
  ABOVE_AVERAGE = 'aboveAverage',
  BELOW_AVERAGE = 'belowAverage',
  CUSTOM = 'custom',
}

/**
 * Formatting styles that can be applied
 */
export interface FormattingStyle {
  color?: string;
  backgroundColor?: string;
  fontWeight?: number | string;
  fontSize?: number;
  opacity?: number;
  borderColor?: string;
  borderWidth?: number;
  icon?: string;
  prefix?: string;
  suffix?: string;
  formatter?: (value: any) => string;
}

/**
 * Conditional formatting rule
 */
export interface ConditionalFormattingRule {
  id: string;
  name: string;
  field: string;
  condition: ConditionType;
  value?: any;
  value2?: any; // For BETWEEN
  style: FormattingStyle;
  priority?: number;
  enabled?: boolean;
  customFunction?: (value: any, row: any, dataset: any[]) => boolean;
}

/**
 * Predefined rule templates
 */
export const FORMATTING_TEMPLATES = {
  // Financial
  positiveNegative: (field: string): ConditionalFormattingRule[] => [
    {
      id: 'positive',
      name: 'Positive Values',
      field,
      condition: ConditionType.GREATER_THAN,
      value: 0,
      style: {
        color: '#10b981',
        prefix: '+',
      },
      priority: 1,
      enabled: true,
    },
    {
      id: 'negative',
      name: 'Negative Values',
      field,
      condition: ConditionType.LESS_THAN,
      value: 0,
      style: {
        color: '#ef4444',
      },
      priority: 2,
      enabled: true,
    },
    {
      id: 'zero',
      name: 'Zero Values',
      field,
      condition: ConditionType.EQUAL,
      value: 0,
      style: {
        color: '#6b7280',
      },
      priority: 3,
      enabled: true,
    },
  ],

  // Performance indicators
  trafficLight: (field: string, low: number, high: number): ConditionalFormattingRule[] => [
    {
      id: 'red',
      name: 'Low Performance (Red)',
      field,
      condition: ConditionType.LESS_THAN,
      value: low,
      style: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
      },
      priority: 1,
      enabled: true,
    },
    {
      id: 'yellow',
      name: 'Medium Performance (Yellow)',
      field,
      condition: ConditionType.BETWEEN,
      value: low,
      value2: high,
      style: {
        backgroundColor: '#fef3c7',
        color: '#92400e',
      },
      priority: 2,
      enabled: true,
    },
    {
      id: 'green',
      name: 'High Performance (Green)',
      field,
      condition: ConditionType.GREATER_THAN_OR_EQUAL,
      value: high,
      style: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
      },
      priority: 3,
      enabled: true,
    },
  ],

  // Heatmap
  heatmap: (field: string, colors: string[]): ConditionalFormattingRule[] => {
    const numColors = colors.length;
    return Array.from({ length: numColors }, (_, i) => ({
      id: `heatmap-${i}`,
      name: `Heatmap Level ${i + 1}`,
      field,
      condition: ConditionType.CUSTOM,
      style: {
        backgroundColor: colors[i],
        color: i < numColors / 2 ? '#000000' : '#FFFFFF',
      },
      priority: i + 1,
      enabled: true,
      customFunction: (value: any, row: any, dataset: any[]) => {
        const values = dataset.map(d => Number(d[field]));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        const step = range / numColors;
        const normalized = (Number(value) - min) / range;
        const bucket = Math.floor(normalized * numColors);
        return bucket === i;
      },
    }));
  },

  // Data bars
  dataBars: (field: string, color: string = '#3b82f6'): ConditionalFormattingRule[] => [
    {
      id: 'data-bar',
      name: 'Data Bar',
      field,
      condition: ConditionType.CUSTOM,
      style: {
        backgroundColor: color,
        opacity: 0.3,
      },
      priority: 1,
      enabled: true,
      customFunction: (value: any, row: any, dataset: any[]) => true, // Always apply
    },
  ],

  // Outliers
  outliers: (field: string): ConditionalFormattingRule[] => [
    {
      id: 'outlier-high',
      name: 'High Outliers',
      field,
      condition: ConditionType.CUSTOM,
      style: {
        backgroundColor: '#fef3c7',
        color: '#92400e',
        fontWeight: 'bold',
        icon: '⚠️',
      },
      priority: 1,
      enabled: true,
      customFunction: (value: any, row: any, dataset: any[]) => {
        const values = dataset.map(d => Number(d[field]));
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        return Number(value) > q3 + 1.5 * iqr;
      },
    },
    {
      id: 'outlier-low',
      name: 'Low Outliers',
      field,
      condition: ConditionType.CUSTOM,
      style: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        fontWeight: 'bold',
        icon: '⚠️',
      },
      priority: 2,
      enabled: true,
      customFunction: (value: any, row: any, dataset: any[]) => {
        const values = dataset.map(d => Number(d[field]));
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        return Number(value) < q1 - 1.5 * iqr;
      },
    },
  ],

  // Top/Bottom N
  topN: (field: string, n: number = 10): ConditionalFormattingRule[] => [
    {
      id: 'top-n',
      name: `Top ${n} Values`,
      field,
      condition: ConditionType.TOP_N,
      value: n,
      style: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
        fontWeight: 'bold',
      },
      priority: 1,
      enabled: true,
    },
  ],

  bottomN: (field: string, n: number = 10): ConditionalFormattingRule[] => [
    {
      id: 'bottom-n',
      name: `Bottom ${n} Values`,
      field,
      condition: ConditionType.BOTTOM_N,
      value: n,
      style: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        fontWeight: 'bold',
      },
      priority: 1,
      enabled: true,
    },
  ],
};

/**
 * Evaluate a single rule against a value
 */
export const evaluateRule = (
  rule: ConditionalFormattingRule,
  value: any,
  row: any,
  dataset: any[]
): boolean => {
  if (!rule.enabled) return false;

  // Custom function takes precedence
  if (rule.condition === ConditionType.CUSTOM && rule.customFunction) {
    return rule.customFunction(value, row, dataset);
  }

  const numValue = typeof value === 'number' ? value : Number(value);
  const ruleValue = typeof rule.value === 'number' ? rule.value : Number(rule.value);

  switch (rule.condition) {
    case ConditionType.GREATER_THAN:
      return numValue > ruleValue;

    case ConditionType.GREATER_THAN_OR_EQUAL:
      return numValue >= ruleValue;

    case ConditionType.LESS_THAN:
      return numValue < ruleValue;

    case ConditionType.LESS_THAN_OR_EQUAL:
      return numValue <= ruleValue;

    case ConditionType.EQUAL:
      return value === rule.value;

    case ConditionType.NOT_EQUAL:
      return value !== rule.value;

    case ConditionType.BETWEEN:
      return numValue >= Number(rule.value) && numValue <= Number(rule.value2);

    case ConditionType.NOT_BETWEEN:
      return numValue < Number(rule.value) || numValue > Number(rule.value2);

    case ConditionType.IN:
      return Array.isArray(rule.value) && rule.value.includes(value);

    case ConditionType.NOT_IN:
      return Array.isArray(rule.value) && !rule.value.includes(value);

    case ConditionType.CONTAINS:
      return String(value).includes(String(rule.value));

    case ConditionType.NOT_CONTAINS:
      return !String(value).includes(String(rule.value));

    case ConditionType.STARTS_WITH:
      return String(value).startsWith(String(rule.value));

    case ConditionType.ENDS_WITH:
      return String(value).endsWith(String(rule.value));

    case ConditionType.IS_NULL:
      return value === null || value === undefined;

    case ConditionType.IS_NOT_NULL:
      return value !== null && value !== undefined;

    case ConditionType.TOP_N: {
      const values = dataset.map(d => Number(d[rule.field]));
      const sorted = [...values].sort((a, b) => b - a);
      const threshold = sorted[Math.min(Number(rule.value) - 1, sorted.length - 1)];
      return numValue >= threshold;
    }

    case ConditionType.BOTTOM_N: {
      const values = dataset.map(d => Number(d[rule.field]));
      const sorted = [...values].sort((a, b) => a - b);
      const threshold = sorted[Math.min(Number(rule.value) - 1, sorted.length - 1)];
      return numValue <= threshold;
    }

    case ConditionType.ABOVE_AVERAGE: {
      const values = dataset.map(d => Number(d[rule.field]));
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      return numValue > avg;
    }

    case ConditionType.BELOW_AVERAGE: {
      const values = dataset.map(d => Number(d[rule.field]));
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      return numValue < avg;
    }

    default:
      return false;
  }
};

/**
 * Apply conditional formatting rules to a value
 */
export const applyConditionalFormatting = (
  value: any,
  row: any,
  field: string,
  rules: ConditionalFormattingRule[],
  dataset: any[]
): FormattingStyle => {
  // Filter rules for this field
  const applicableRules = rules.filter(rule => rule.field === field);

  // Sort by priority (lower number = higher priority)
  applicableRules.sort((a, b) => (a.priority || 999) - (b.priority || 999));

  // Find first matching rule
  const matchingRule = applicableRules.find(rule =>
    evaluateRule(rule, value, row, dataset)
  );

  // Return style if found, otherwise empty object
  return matchingRule?.style || {};
};

/**
 * Apply formatting to entire dataset
 */
export const applyFormattingToDataset = (
  dataset: any[],
  rules: ConditionalFormattingRule[]
): Map<string, FormattingStyle[]> => {
  const formattingMap = new Map<string, FormattingStyle[]>();

  dataset.forEach((row, index) => {
    const rowId = `row-${index}`;
    const styles: FormattingStyle[] = [];

    // Get all unique fields from rules
    const fields = [...new Set(rules.map(r => r.field))];

    fields.forEach(field => {
      const style = applyConditionalFormatting(
        row[field],
        row,
        field,
        rules,
        dataset
      );
      styles.push(style);
    });

    formattingMap.set(rowId, styles);
  });

  return formattingMap;
};

/**
 * Generate color scale for heatmap
 */
export const generateColorScale = (
  startColor: string,
  endColor: string,
  steps: number
): string[] => {
  const start = hexToRgb(startColor);
  const end = hexToRgb(endColor);

  if (!start || !end) return [];

  const colors: string[] = [];

  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const r = Math.round(start.r + (end.r - start.r) * ratio);
    const g = Math.round(start.g + (end.g - start.g) * ratio);
    const b = Math.round(start.b + (end.b - start.b) * ratio);
    colors.push(rgbToHex(r, g, b));
  }

  return colors;
};

/**
 * Helper: Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Helper: Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export default {
  ConditionType,
  FORMATTING_TEMPLATES,
  evaluateRule,
  applyConditionalFormatting,
  applyFormattingToDataset,
  generateColorScale,
};
