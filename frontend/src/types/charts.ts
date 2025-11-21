/**
 * Visualization Engine - Type Definitions
 *
 * Complete type system for charts, configurations, and data transformations
 */

// ===================================================================
// CHART TYPES & ENUMS
// ===================================================================

export enum ChartType {
  // Basic Charts
  LINE = 'line',
  BAR = 'bar',
  COLUMN = 'column',
  PIE = 'pie',
  DONUT = 'donut',
  AREA = 'area',
  SCATTER = 'scatter',

  // Advanced Charts
  STACKED_BAR = 'stacked_bar',
  STACKED_AREA = 'stacked_area',
  GROUPED_BAR = 'grouped_bar',
  COMBO = 'combo',
  DUAL_AXIS = 'dual_axis',

  // Statistical Charts
  BOX_PLOT = 'box_plot',
  VIOLIN = 'violin',
  HISTOGRAM = 'histogram',

  // Business Charts
  FUNNEL = 'funnel',
  WATERFALL = 'waterfall',
  BULLET = 'bullet',
  GAUGE = 'gauge',

  // Heatmaps & Trees
  HEATMAP = 'heatmap',
  TREEMAP = 'treemap',
  SUNBURST = 'sunburst',
  SANKEY = 'sankey',

  // Specialized
  CANDLESTICK = 'candlestick',
  RADAR = 'radar',
  POLAR = 'polar',
  TIMELINE = 'timeline',
  GANTT = 'gantt',

  // Tables & Metrics
  METRIC = 'metric',
  KPI_CARD = 'kpi_card',
  TABLE = 'table',
  PIVOT_TABLE = 'pivot_table',

  // Geospatial
  MAP = 'map',
  CHOROPLETH = 'choropleth',
}

export enum AggregationType {
  SUM = 'sum',
  AVG = 'avg',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  MEDIAN = 'median',
  PERCENTILE = 'percentile',
  DISTINCT_COUNT = 'distinct_count',
  FIRST = 'first',
  LAST = 'last',
}

export enum TimeGranularity {
  SECOND = 'second',
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

// ===================================================================
// DATA STRUCTURES
// ===================================================================

export interface DataPoint {
  [key: string]: any;
}

export interface Series {
  name: string;
  data: DataPoint[];
  color?: string;
  type?: ChartType;
  yAxisId?: string;
}

export interface ChartData {
  series: Series[];
  categories?: string[];
  metadata?: {
    totalRecords?: number;
    timeRange?: { start: Date; end: Date };
    aggregations?: Record<string, any>;
  };
}

// ===================================================================
// CHART CONFIGURATION
// ===================================================================

export interface ChartAxis {
  label?: string;
  min?: number;
  max?: number;
  scale?: 'linear' | 'log' | 'time' | 'category';
  tickCount?: number;
  tickFormat?: string;
  gridLines?: boolean;
  reversed?: boolean;
}

export interface ChartLegend {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  layout?: 'horizontal' | 'vertical';
}

export interface ChartTooltip {
  enabled: boolean;
  shared?: boolean;
  format?: string;
  customFormatter?: (value: any, name: string) => string;
}

export interface ChartAnimation {
  enabled: boolean;
  duration?: number;
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface ChartColors {
  palette?: string[]; // Array of hex colors
  singleColor?: string;
  gradient?: {
    start: string;
    end: string;
    direction?: 'horizontal' | 'vertical' | 'diagonal';
  };
}

export interface ChartInteractivity {
  zoom?: boolean;
  pan?: boolean;
  brush?: boolean;
  clickable?: boolean;
  hoverable?: boolean;
  selectable?: boolean;
}

export interface DrillDownConfig {
  enabled: boolean;
  levels?: {
    dimension: string;
    label: string;
  }[];
  targetDashboardId?: string;
  parameterMapping?: Record<string, string>;
}

export interface ChartConfig {
  // Chart identification
  type: ChartType;
  title?: string;
  subtitle?: string;

  // Axes
  xAxis?: ChartAxis;
  yAxis?: ChartAxis;
  yAxis2?: ChartAxis; // For dual-axis charts

  // Visual elements
  legend?: ChartLegend;
  tooltip?: ChartTooltip;
  colors?: ChartColors;

  // Behavior
  animation?: ChartAnimation;
  interactivity?: ChartInteractivity;
  drillDown?: DrillDownConfig;

  // Chart-specific options
  stacked?: boolean;
  showValues?: boolean;
  showPercentages?: boolean;
  innerRadius?: number; // For donut charts
  startAngle?: number; // For pie/donut
  orientation?: 'horizontal' | 'vertical';

  // Data formatting
  numberFormat?: string;
  dateFormat?: string;

  // Dimensions
  width?: number | string;
  height?: number | string;
  aspectRatio?: number;

  // Responsive
  responsive?: boolean;
  maintainAspectRatio?: boolean;
}

// ===================================================================
// WIDGET CONFIGURATION
// ===================================================================

export interface WidgetConfig {
  // Basic info
  id: string;
  type: ChartType;
  title: string;
  description?: string;

  // Layout
  x: number;
  y: number;
  width: number;
  height: number;

  // Data source
  dataSource?: {
    type: 'query' | 'api' | 'static';
    query?: string;
    endpoint?: string;
    data?: any[];
    refreshInterval?: number; // milliseconds
  };

  // Data transformation
  dataMapping: {
    xField?: string;
    yField?: string | string[];
    seriesField?: string;
    valueField?: string;
    categoryField?: string;
    timeField?: string;
  };

  // Chart configuration
  chartConfig: ChartConfig;

  // Filters
  filters?: {
    field: string;
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between';
    value: any;
  }[];

  // Conditional formatting
  conditionalFormatting?: {
    field: string;
    rules: {
      condition: string;
      color?: string;
      backgroundColor?: string;
      icon?: string;
    }[];
  }[];
}

// ===================================================================
// THEME CONFIGURATION
// ===================================================================

export interface ChartTheme {
  name: string;

  // Colors
  colors: {
    primary: string[];
    background: string;
    text: string;
    gridLines: string;
    borders: string;
  };

  // Typography
  fonts: {
    title: {
      family: string;
      size: number;
      weight: number;
      color: string;
    };
    axis: {
      family: string;
      size: number;
      weight: number;
      color: string;
    };
    legend: {
      family: string;
      size: number;
      weight: number;
      color: string;
    };
    tooltip: {
      family: string;
      size: number;
      weight: number;
      color: string;
    };
  };

  // Styling
  borderRadius: number;
  strokeWidth: number;
  opacity: number;

  // Animation defaults
  animationDuration: number;
  animationEasing: string;
}

// ===================================================================
// UTILITY TYPES
// ===================================================================

export interface ChartDimensions {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ChartEvent {
  type: 'click' | 'hover' | 'brush' | 'zoom';
  data: any;
  point?: { x: number; y: number };
  seriesIndex?: number;
  dataIndex?: number;
}

export type ChartEventHandler = (event: ChartEvent) => void;

// ===================================================================
// CHART COMPONENT PROPS
// ===================================================================

export interface BaseChartProps {
  data: ChartData;
  config: ChartConfig;
  theme?: ChartTheme;
  dimensions?: ChartDimensions;
  onEvent?: ChartEventHandler;
  loading?: boolean;
  error?: Error | null;
}

// ===================================================================
// DATA TRANSFORMATION
// ===================================================================

export interface DataTransformer {
  transform: (data: any[]) => ChartData;
  aggregate?: (data: any[], groupBy: string, aggregation: AggregationType) => any[];
  filter?: (data: any[], filters: any[]) => any[];
  sort?: (data: any[], field: string, order: 'asc' | 'desc') => any[];
  pivot?: (data: any[], rowField: string, columnField: string, valueField: string) => any[];
}

// ===================================================================
// CHART REGISTRY
// ===================================================================

export interface ChartRegistryEntry {
  type: ChartType;
  name: string;
  description: string;
  icon: string;
  category: 'basic' | 'advanced' | 'statistical' | 'business' | 'specialized';
  component: React.ComponentType<BaseChartProps>;
  requiredFields: string[];
  optionalFields: string[];
  defaultConfig: Partial<ChartConfig>;
  previewImage?: string;
}

export type ChartRegistry = Record<ChartType, ChartRegistryEntry>;

// ===================================================================
// EXPORT TYPES
// ===================================================================

export interface ChartExportOptions {
  format: 'png' | 'jpg' | 'svg' | 'pdf';
  quality?: number; // 0-1
  width?: number;
  height?: number;
  backgroundColor?: string;
  includeLegend?: boolean;
  includeTitle?: boolean;
}
