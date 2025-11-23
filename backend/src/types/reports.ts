/**
 * Enterprise Report Builder Type Definitions
 *
 * Phase 4 - REPORT-001 & REPORT-002
 * Comprehensive type definitions for reports, schedules, and related entities
 */

// ===================================================================
// REPORT TYPES
// ===================================================================

export interface Report {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  elements: ReportElement[];
  layout: ReportLayout;
  permissions: ReportPermissions;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface ReportLayout {
  width: number;
  height: number;
  backgroundColor?: string;
  padding?: number;
  gridSize?: number;
  showGrid?: boolean;
}

export interface ReportPermissions {
  public: boolean;
  users?: Array<{
    userId: string;
    role: 'read' | 'write' | 'admin';
  }>;
  teams?: Array<{
    teamId: string;
    role: 'read' | 'write' | 'admin';
  }>;
}

// ===================================================================
// REPORT ELEMENT TYPES
// ===================================================================

export type ReportElement =
  | TextElement
  | ChartElement
  | TableElement
  | MetricElement
  | ImageElement
  | ShapeElement;

export interface BaseElement {
  id: string;
  type: 'text' | 'chart' | 'table' | 'metric' | 'image' | 'shape';
  position: Position;
  size: Size;
  style?: ElementStyle;
  locked?: boolean;
  visible?: boolean;
  visibility?: VisibilityConfig;
  interactions?: Interaction[];
}

export interface Position {
  x: number;
  y: number;
  z?: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ElementStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  shadow?: string;
}

// Text Element
export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'lighter';
  fontFamily?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
}

// Chart Element
export interface ChartElement extends BaseElement {
  type: 'chart';
  chartType: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'radar';
  dataSource?: DataSource;
  chartConfig?: ChartConfig;
  calculatedFields?: CalculatedField[];
  filters?: DataFilter[];
}

export interface ChartConfig {
  title?: string;
  legend?: {
    show: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
  };
  axes?: {
    x?: AxisConfig;
    y?: AxisConfig;
  };
  colors?: string[];
  showValues?: boolean;
  stacked?: boolean;
}

export interface AxisConfig {
  label?: string;
  min?: number;
  max?: number;
  gridLines?: boolean;
  format?: string;
}

// Table Element
export interface TableElement extends BaseElement {
  type: 'table';
  dataSource?: DataSource;
  columns: TableColumn[];
  pagination?: {
    enabled: boolean;
    pageSize: number;
  };
  sorting?: {
    enabled: boolean;
    defaultColumn?: string;
    defaultOrder?: 'asc' | 'desc';
  };
  filtering?: {
    enabled: boolean;
  };
  styling?: TableStyling;
  calculatedFields?: CalculatedField[];
  filters?: DataFilter[];
}

export interface TableColumn {
  id: string;
  field: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: string;
  visible?: boolean;
  sortable?: boolean;
  filterable?: boolean;
}

export interface TableStyling {
  headerBackgroundColor?: string;
  headerTextColor?: string;
  rowBackgroundColor?: string;
  alternateRowColor?: string;
  borderColor?: string;
  fontSize?: number;
  conditionalFormatting?: ConditionalFormattingRule[];
}

export interface ConditionalFormattingRule {
  type: 'cellValue' | 'dataBar' | 'colorScale';
  column?: string;
  operator?: 'greaterThan' | 'lessThan' | 'equals' | 'between';
  value?: number;
  value2?: number; // For 'between' operator
  style?: {
    backgroundColor?: string;
    textColor?: string;
    fontWeight?: 'normal' | 'bold';
  };
  gradient?: {
    minColor: string;
    maxColor: string;
  };
}

// Metric Element
export interface MetricElement extends BaseElement {
  type: 'metric';
  metric: {
    label: string;
    field: string;
    format?: 'number' | 'currency' | 'percent';
    prefix?: string;
    suffix?: string;
  };
  dataSource?: DataSource;
  comparison?: {
    value: number;
    showChange?: boolean;
    showPercentChange?: boolean;
  };
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
}

// Image Element
export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  alt?: string;
  fit?: 'cover' | 'contain' | 'fill' | 'none';
}

// Shape Element
export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: 'rectangle' | 'circle' | 'line' | 'arrow';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

// ===================================================================
// DATA SOURCE TYPES
// ===================================================================

export interface DataSource {
  type: 'query' | 'api' | 'static';
  query?: string;
  apiEndpoint?: string;
  data?: any;
  refreshInterval?: number; // In seconds
  cache?: boolean;
}

export interface CalculatedField {
  name: string;
  formula: string;
  dataType?: 'number' | 'string' | 'date' | 'boolean';
}

export interface DataFilter {
  field: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'in';
  value: any;
}

// ===================================================================
// VISIBILITY & INTERACTION TYPES
// ===================================================================

export interface VisibilityConfig {
  type: 'always' | 'conditional' | 'parameter';
  condition?: string; // Expression to evaluate
  parameter?: string; // Parameter name to check
  parameterValue?: any; // Optional expected value
}

export interface Interaction {
  type: 'click' | 'hover' | 'doubleClick';
  action: InteractionAction;
}

export type InteractionAction =
  | NavigateAction
  | TooltipAction
  | DrilldownAction
  | ModalAction
  | FilterAction;

export interface NavigateAction {
  type: 'navigate';
  target: string; // URL or report ID
  openInNewTab?: boolean;
}

export interface TooltipAction {
  type: 'tooltip';
  content: string;
}

export interface DrilldownAction {
  type: 'drilldown';
  targetReport: string;
  parameters?: Record<string, string>;
}

export interface ModalAction {
  type: 'modal';
  content: string;
  title?: string;
}

export interface FilterAction {
  type: 'filter';
  field: string;
  value: any;
}

// ===================================================================
// SCHEDULE TYPES
// ===================================================================

export interface ReportSchedule {
  id: string;
  reportId: string;
  name: string;
  description?: string;
  enabled: boolean;
  scheduleType: 'cron' | 'interval';
  cron?: string; // Cron expression
  interval?: number; // Minutes
  parameters?: Record<string, any>;
  distribution: DistributionChannel[];
  createdBy: string;
  createdAt: Date;
  lastRun: Date | null;
  nextRun: Date | null;
  runCount: number;
}

export type DistributionChannel =
  | EmailChannel
  | SlackChannel
  | TeamsChannel
  | SFTPChannel
  | WebhookChannel;

export interface BaseChannel {
  type: 'email' | 'slack' | 'teams' | 'sftp' | 'webhook';
  enabled: boolean;
}

export interface EmailChannel extends BaseChannel {
  type: 'email';
  recipients: string[];
  subject?: string;
  body?: string;
  attachmentFormat?: 'pdf' | 'excel' | 'both';
}

export interface SlackChannel extends BaseChannel {
  type: 'slack';
  webhookUrl: string;
  channel?: string;
  message?: string;
}

export interface TeamsChannel extends BaseChannel {
  type: 'teams';
  webhookUrl: string;
  title?: string;
  message?: string;
}

export interface SFTPChannel extends BaseChannel {
  type: 'sftp';
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  path: string;
  filename?: string;
  format?: 'pdf' | 'excel';
}

export interface WebhookChannel extends BaseChannel {
  type: 'webhook';
  webhookUrl: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: string;
}

// ===================================================================
// EXECUTION TYPES
// ===================================================================

export interface ScheduleExecution {
  id: string;
  scheduleId: string;
  startedAt: Date;
  completedAt: Date | null;
  status: 'running' | 'success' | 'failed' | 'partial';
  error?: string;
  distributionResults: DistributionResult[];
}

export interface DistributionResult {
  type: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

// ===================================================================
// QUERY & CACHE TYPES
// ===================================================================

export interface QueryOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[];
}
