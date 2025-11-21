/**
 * Report Builder Types
 *
 * Comprehensive type system for enterprise report building:
 * - Report definitions and metadata
 * - Layout and positioning
 * - Calculated fields and formulas
 * - Report templates
 * - Export configurations
 */

import { ChartType, ChartConfig } from './charts';
import { DrillDownConfig } from './drilldown';

// ===================================================================
// REPORT ELEMENT TYPES
// ===================================================================

/**
 * Types of elements that can be placed in a report
 */
export enum ReportElementType {
  CHART = 'chart',
  TABLE = 'table',
  TEXT = 'text',
  IMAGE = 'image',
  METRIC_CARD = 'metric_card',
  DIVIDER = 'divider',
  SHAPE = 'shape',
  FILTER = 'filter',
}

/**
 * Base properties for all report elements
 */
export interface BaseReportElement {
  id: string;
  type: ReportElementType;
  name: string;
  position: ElementPosition;
  style: ElementStyle;
  visibility?: VisibilityCondition;
  interactions?: ElementInteraction[];
  locked?: boolean;
  layerOrder?: number;
}

/**
 * Position and size of element in report (pixel-perfect)
 */
export interface ElementPosition {
  x: number; // pixels from left
  y: number; // pixels from top
  width: number; // pixels
  height: number; // pixels
  rotation?: number; // degrees
  zIndex?: number;
}

/**
 * Visual styling for report elements
 */
export interface ElementStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  opacity?: number;
  shadow?: BoxShadow;
  padding?: Spacing;
  margin?: Spacing;
}

export interface BoxShadow {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
}

export interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Conditional visibility for elements
 */
export interface VisibilityCondition {
  type: 'always' | 'conditional' | 'parameter';
  condition?: FormulaExpression;
  parameterName?: string;
  parameterValue?: any;
}

/**
 * Interactions for report elements
 */
export interface ElementInteraction {
  type: 'click' | 'hover' | 'doubleClick' | 'rightClick';
  action: InteractionAction;
}

export type InteractionAction =
  | { type: 'navigate'; url: string }
  | { type: 'filter'; targetElementId: string; field: string }
  | { type: 'drilldown'; config: DrillDownConfig }
  | { type: 'popup'; content: string }
  | { type: 'export'; format: 'pdf' | 'excel' | 'csv' }
  | { type: 'custom'; script: string };

// ===================================================================
// SPECIFIC ELEMENT TYPES
// ===================================================================

/**
 * Chart element
 */
export interface ChartElement extends BaseReportElement {
  type: ReportElementType.CHART;
  chartType: ChartType;
  config: ChartConfig;
  dataSource: DataSource;
  calculatedFields?: CalculatedField[];
  filters?: ReportFilter[];
  refreshInterval?: number; // seconds
}

/**
 * Table element
 */
export interface TableElement extends BaseReportElement {
  type: ReportElementType.TABLE;
  dataSource: DataSource;
  columns: TableColumn[];
  calculatedFields?: CalculatedField[];
  filters?: ReportFilter[];
  pagination?: TablePagination;
  sorting?: TableSorting[];
  conditionalFormatting?: ConditionalFormattingRule[];
  exportable?: boolean;
}

export interface TableColumn {
  id: string;
  field: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: ColumnFormat;
  visible?: boolean;
  frozen?: boolean;
  aggregation?: AggregationType;
}

export interface TablePagination {
  enabled: boolean;
  pageSize: number;
  pageSizeOptions?: number[];
  showPageNumbers?: boolean;
}

export interface TableSorting {
  field: string;
  direction: 'asc' | 'desc';
  priority?: number;
}

/**
 * Text element
 */
export interface TextElement extends BaseReportElement {
  type: ReportElementType.TEXT;
  content: string;
  textStyle: TextStyle;
  variables?: TextVariable[];
  markdown?: boolean;
}

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle?: 'normal' | 'italic' | 'oblique';
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textDecoration?: 'none' | 'underline' | 'line-through' | 'overline';
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface TextVariable {
  name: string;
  value: string | number | Date;
  format?: string;
}

/**
 * Image element
 */
export interface ImageElement extends BaseReportElement {
  type: ReportElementType.IMAGE;
  src: string;
  alt?: string;
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  alignment?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

/**
 * Metric card element (KPI display)
 */
export interface MetricCardElement extends BaseReportElement {
  type: ReportElementType.METRIC_CARD;
  dataSource: DataSource;
  metric: MetricDefinition;
  comparison?: MetricComparison;
  sparkline?: boolean;
  trend?: TrendIndicator;
}

export interface MetricDefinition {
  label: string;
  field: string;
  aggregation: AggregationType;
  format?: ColumnFormat;
  prefix?: string;
  suffix?: string;
  icon?: string;
}

export interface MetricComparison {
  type: 'previous_period' | 'target' | 'baseline';
  value?: number;
  label?: string;
  showPercentChange?: boolean;
  showAbsoluteChange?: boolean;
}

export interface TrendIndicator {
  enabled: boolean;
  direction?: 'up' | 'down' | 'flat';
  color?: string;
}

/**
 * Divider element
 */
export interface DividerElement extends BaseReportElement {
  type: ReportElementType.DIVIDER;
  orientation: 'horizontal' | 'vertical';
  thickness?: number;
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

/**
 * Shape element (rectangle, circle, line)
 */
export interface ShapeElement extends BaseReportElement {
  type: ReportElementType.SHAPE;
  shape: 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'line' | 'arrow';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

/**
 * Filter element (interactive filter UI)
 */
export interface FilterElement extends BaseReportElement {
  type: ReportElementType.FILTER;
  filterType: 'dropdown' | 'multiselect' | 'daterange' | 'slider' | 'search';
  field: string;
  label: string;
  options?: FilterOption[];
  defaultValue?: any;
  targetElements?: string[]; // IDs of elements to filter
}

export interface FilterOption {
  label: string;
  value: any;
}

// Union type for all report elements
export type ReportElement =
  | ChartElement
  | TableElement
  | TextElement
  | ImageElement
  | MetricCardElement
  | DividerElement
  | ShapeElement
  | FilterElement;

// ===================================================================
// DATA SOURCE & QUERIES
// ===================================================================

/**
 * Data source configuration
 */
export interface DataSource {
  type: 'static' | 'api' | 'query' | 'calculated';
  staticData?: any[];
  apiEndpoint?: string;
  apiMethod?: 'GET' | 'POST';
  apiHeaders?: Record<string, string>;
  apiBody?: any;
  query?: DataQuery;
  refreshInterval?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export interface DataQuery {
  sql?: string;
  collection?: string;
  filters?: QueryFilter[];
  aggregations?: QueryAggregation[];
  joins?: QueryJoin[];
  groupBy?: string[];
  orderBy?: QueryOrderBy[];
  limit?: number;
  offset?: number;
}

export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: any;
  type?: 'and' | 'or';
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_null'
  | 'is_not_null'
  | 'matches_regex';

export interface QueryAggregation {
  field: string;
  function: AggregationType;
  alias?: string;
}

export type AggregationType =
  | 'sum'
  | 'avg'
  | 'count'
  | 'count_distinct'
  | 'min'
  | 'max'
  | 'median'
  | 'stddev'
  | 'variance'
  | 'first'
  | 'last'
  | 'concat';

export interface QueryJoin {
  type: 'inner' | 'left' | 'right' | 'full';
  table: string;
  on: JoinCondition[];
}

export interface JoinCondition {
  leftField: string;
  rightField: string;
  operator?: '=' | '!=' | '>' | '>=' | '<' | '<=';
}

export interface QueryOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

// ===================================================================
// CALCULATED FIELDS & FORMULAS
// ===================================================================

/**
 * Calculated field definition
 */
export interface CalculatedField {
  id: string;
  name: string;
  label: string;
  formula: FormulaExpression;
  dataType: FieldDataType;
  format?: ColumnFormat;
  description?: string;
}

export type FieldDataType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'currency'
  | 'percentage';

/**
 * Formula expression (AST-based)
 */
export interface FormulaExpression {
  type: FormulaNodeType;
  value?: any;
  operator?: FormulaOperator;
  left?: FormulaExpression;
  right?: FormulaExpression;
  function?: FormulaFunction;
  args?: FormulaExpression[];
  field?: string;
}

export type FormulaNodeType =
  | 'literal'
  | 'field'
  | 'binary_op'
  | 'unary_op'
  | 'function'
  | 'conditional';

export type FormulaOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '**'
  | '=='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | '&&'
  | '||'
  | '!';

export type FormulaFunction =
  // Math
  | 'abs' | 'ceil' | 'floor' | 'round' | 'sqrt' | 'pow' | 'exp' | 'log'
  // Statistical
  | 'sum' | 'avg' | 'min' | 'max' | 'count' | 'median' | 'stddev' | 'variance'
  // String
  | 'concat' | 'upper' | 'lower' | 'trim' | 'substring' | 'replace' | 'length'
  // Date
  | 'now' | 'today' | 'year' | 'month' | 'day' | 'hour' | 'minute' | 'datediff' | 'dateadd'
  // Conditional
  | 'if' | 'coalesce' | 'nullif' | 'case'
  // Aggregation
  | 'running_total' | 'rank' | 'dense_rank' | 'row_number' | 'lag' | 'lead'
  // Conversion
  | 'to_string' | 'to_number' | 'to_date' | 'format';

/**
 * Column formatting options
 */
export interface ColumnFormat {
  type: 'number' | 'currency' | 'percentage' | 'date' | 'datetime' | 'time' | 'custom';
  decimals?: number;
  currencySymbol?: string;
  dateFormat?: string;
  customFormat?: string;
  locale?: string;
}

/**
 * Conditional formatting rule
 */
export interface ConditionalFormattingRule {
  id: string;
  name: string;
  condition: FormulaExpression;
  style: ElementStyle & TextStyle;
  priority?: number;
}

// ===================================================================
// REPORT DEFINITION
// ===================================================================

/**
 * Complete report definition
 */
export interface Report {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];

  // Layout
  layout: ReportLayout;
  elements: ReportElement[];

  // Data
  dataSources: Record<string, DataSource>;
  calculatedFields: CalculatedField[];
  parameters: ReportParameter[];

  // Metadata
  createdBy: string;
  createdAt: Date;
  modifiedBy?: string;
  modifiedAt?: Date;
  version: number;

  // Settings
  settings: ReportSettings;

  // Sharing
  sharing: ReportSharing;
}

/**
 * Report layout configuration
 */
export interface ReportLayout {
  type: 'canvas' | 'grid' | 'flow';
  width: number; // pixels
  height: number; // pixels
  backgroundColor?: string;
  backgroundImage?: string;
  pageSize?: PageSize;
  orientation?: 'portrait' | 'landscape';
  margins?: Spacing;
  grid?: GridConfig;
}

export type PageSize =
  | 'custom'
  | 'letter' // 8.5" x 11"
  | 'legal' // 8.5" x 14"
  | 'a4' // 210mm x 297mm
  | 'a3' // 297mm x 420mm
  | 'tabloid' // 11" x 17"
  | 'screen'; // Responsive

export interface GridConfig {
  enabled: boolean;
  columns: number;
  rows: number;
  columnGap: number;
  rowGap: number;
  snapToGrid: boolean;
}

/**
 * Report parameter (user inputs)
 */
export interface ReportParameter {
  id: string;
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'list';
  defaultValue?: any;
  required?: boolean;
  options?: FilterOption[];
  validation?: ParameterValidation;
  description?: string;
}

export interface ParameterValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidator?: string;
}

/**
 * Report settings
 */
export interface ReportSettings {
  theme?: string;
  responsiveMode?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  timezone?: string;
  locale?: string;
  exportSettings?: ExportSettings;
  interactivity?: ReportInteractivity;
}

export interface ExportSettings {
  allowPDF?: boolean;
  allowExcel?: boolean;
  allowCSV?: boolean;
  allowImage?: boolean;
  allowPrint?: boolean;
  watermark?: string;
  includeTimestamp?: boolean;
  includeFilters?: boolean;
}

export interface ReportInteractivity {
  enableFiltering?: boolean;
  enableDrilldown?: boolean;
  enableTooltips?: boolean;
  enableCrosshair?: boolean;
  enableSelection?: boolean;
  enableZoom?: boolean;
}

/**
 * Report sharing configuration
 */
export interface ReportSharing {
  visibility: 'private' | 'organization' | 'public';
  allowedUsers?: string[];
  allowedRoles?: string[];
  permissions?: ReportPermission[];
  embedEnabled?: boolean;
  embedUrl?: string;
  publicUrl?: string;
}

export interface ReportPermission {
  userId: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canSchedule?: boolean;
}

// ===================================================================
// REPORT FILTERS
// ===================================================================

export interface ReportFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  label?: string;
  locked?: boolean;
}

// ===================================================================
// REPORT TEMPLATES
// ===================================================================

/**
 * Report template definition
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: ReportTemplateCategory;
  thumbnail?: string;
  previewImages?: string[];

  // Template structure
  layout: ReportLayout;
  elements: Partial<ReportElement>[]; // Partial because data sources are placeholders

  // Template metadata
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedSetupTime?: number; // minutes
  requiredDataFields?: TemplateDataField[];

  // Template configuration
  configurableProperties?: TemplateProperty[];
  colorSchemes?: ColorScheme[];

  // Usage
  usageCount?: number;
  rating?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export type ReportTemplateCategory =
  | 'executive'
  | 'sales'
  | 'marketing'
  | 'finance'
  | 'operations'
  | 'hr'
  | 'analytics'
  | 'custom';

export interface TemplateDataField {
  name: string;
  label: string;
  dataType: FieldDataType;
  required: boolean;
  description?: string;
}

export interface TemplateProperty {
  id: string;
  label: string;
  type: 'string' | 'number' | 'color' | 'boolean' | 'select';
  defaultValue: any;
  options?: any[];
  description?: string;
}

export interface ColorScheme {
  id: string;
  name: string;
  colors: string[];
  description?: string;
}

// ===================================================================
// REPORT BUILDER STATE
// ===================================================================

/**
 * Report builder UI state
 */
export interface ReportBuilderState {
  currentReport: Report | null;
  selectedElements: string[];
  clipboard: ReportElement[];
  history: ReportHistoryEntry[];
  historyIndex: number;
  isDirty: boolean;
  mode: 'design' | 'preview' | 'data';
  gridVisible: boolean;
  snapToGrid: boolean;
  zoom: number;
}

export interface ReportHistoryEntry {
  timestamp: Date;
  action: string;
  report: Report;
}

// ===================================================================
// REPORT SCHEDULING (for REPORT-002)
// ===================================================================

export interface ReportSchedule {
  id: string;
  reportId: string;
  name: string;
  enabled: boolean;

  // Schedule configuration
  schedule: ScheduleConfig;

  // Distribution
  distribution: DistributionConfig[];

  // Parameters
  parameters?: Record<string, any>;

  // Metadata
  createdBy: string;
  createdAt: Date;
  lastRun?: Date;
  nextRun?: Date;
  runCount?: number;
}

export interface ScheduleConfig {
  type: 'cron' | 'interval' | 'event';
  cron?: string;
  interval?: number; // minutes
  eventTrigger?: string;
  timezone?: string;
}

export interface DistributionConfig {
  type: 'email' | 'slack' | 'teams' | 'sftp' | 'webhook';
  enabled: boolean;
  config: EmailConfig | SlackConfig | TeamsConfig | SFTPConfig | WebhookConfig;
}

export interface EmailConfig {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  format: 'pdf' | 'excel' | 'csv';
  filename?: string;
}

export interface SlackConfig {
  channel: string;
  message?: string;
  webhookUrl?: string;
}

export interface TeamsConfig {
  channel: string;
  message?: string;
  webhookUrl?: string;
}

export interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  remotePath: string;
  filename?: string;
}

export interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: any;
}
