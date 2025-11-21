/**
 * Drill-Down Types and Interfaces
 *
 * Type definitions for multi-level drill-down functionality.
 * Supports context-aware drilling, breadcrumb navigation, and state preservation.
 */

import { ChartType } from './charts';

/**
 * Drill-down level configuration
 */
export interface DrillDownLevel {
  id: string;
  name: string;
  description?: string;

  // Target configuration
  targetType: 'dashboard' | 'widget' | 'data' | 'url';
  targetId?: string;
  targetUrl?: string;

  // Data configuration
  dataSource?: {
    type: 'api' | 'query' | 'static';
    endpoint?: string;
    query?: string;
    data?: any[];
  };

  // Chart configuration for this level
  chartType?: ChartType;
  chartConfig?: any;

  // Parameter mapping
  parameterMapping?: Record<string, string>;

  // Filters to apply at this level
  filters?: DrillDownFilter[];

  // Whether this level can be drilled further
  isDrillable: boolean;

  // Next level configuration
  nextLevel?: DrillDownLevel;
}

/**
 * Drill-down filter
 */
export interface DrillDownFilter {
  field: string;
  operator: 'equals' | 'in' | 'between' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'gte' | 'lt' | 'lte';
  value: any;
  source?: 'parameter' | 'context' | 'user' | 'static';
}

/**
 * Drill-down state
 */
export interface DrillDownState {
  levels: DrillDownBreadcrumb[];
  currentLevel: number;
  parameters: Record<string, any>;
  filters: DrillDownFilter[];
  timestamp: Date;
}

/**
 * Breadcrumb item for navigation
 */
export interface DrillDownBreadcrumb {
  level: number;
  name: string;
  label: string;
  parameters: Record<string, any>;
  filters: DrillDownFilter[];
  canNavigateBack: boolean;
}

/**
 * Drill-down configuration for a widget/chart
 */
export interface DrillDownConfig {
  enabled: boolean;

  // Drill-down levels
  levels: DrillDownLevel[];

  // Maximum drill-down depth
  maxDepth?: number;

  // Whether to preserve state in URL
  preserveInUrl?: boolean;

  // Whether to preserve state in localStorage
  preserveInStorage?: boolean;

  // Storage key for state persistence
  storageKey?: string;

  // Callback when drill-down occurs
  onDrillDown?: (state: DrillDownState) => void;

  // Callback when drill-up occurs
  onDrillUp?: (state: DrillDownState) => void;

  // Callback when drill-down path is reset
  onReset?: () => void;

  // Animation configuration
  animation?: {
    enabled: boolean;
    duration: number;
    type: 'slide' | 'fade' | 'zoom';
  };
}

/**
 * Drill-down action
 */
export interface DrillDownAction {
  type: 'drill-down' | 'drill-up' | 'navigate-to-level' | 'reset';
  level?: number;
  parameters?: Record<string, any>;
  filters?: DrillDownFilter[];
  targetLevel?: DrillDownLevel;
}

/**
 * Drill-down context for a specific data point
 */
export interface DrillDownContext {
  // Source chart/widget
  sourceWidgetId: string;
  sourceChartType: ChartType;

  // Clicked data point
  dataPoint: any;
  dataIndex: number;
  seriesName?: string;

  // Current state
  currentState: DrillDownState;

  // Available actions
  availableActions: DrillDownAction[];

  // Suggested next level (context-aware)
  suggestedNextLevel?: DrillDownLevel;
}

/**
 * Drill-down path definition
 */
export interface DrillDownPath {
  id: string;
  name: string;
  description?: string;

  // Path configuration
  levels: DrillDownLevel[];

  // When this path is applicable
  applicableWhen?: {
    chartTypes?: ChartType[];
    dataFields?: string[];
    userRoles?: string[];
  };

  // Priority (higher = preferred)
  priority?: number;
}

/**
 * Cross-dashboard drill-down
 */
export interface CrossDashboardDrillDown {
  sourceDashboardId: string;
  sourceWidgetId: string;
  targetDashboardId: string;
  targetWidgetId?: string;

  // Parameter mapping from source to target
  parameterMapping: Record<string, string>;

  // Whether to open in new tab/window
  openInNewWindow?: boolean;

  // Navigation mode
  mode: 'replace' | 'push' | 'modal' | 'drawer';
}

/**
 * Drill-down history entry
 */
export interface DrillDownHistoryEntry {
  timestamp: Date;
  userId: string;
  dashboardId: string;
  widgetId: string;

  // Drill path taken
  path: DrillDownBreadcrumb[];

  // Parameters at each level
  parameters: Record<string, any>[];

  // Time spent at this level
  durationMs?: number;
}

/**
 * Drill-down analytics
 */
export interface DrillDownAnalytics {
  // Most common drill paths
  popularPaths: {
    path: string[];
    count: number;
    avgDuration: number;
  }[];

  // Drill-down depth distribution
  depthDistribution: Record<number, number>;

  // Drop-off points (where users stop drilling)
  dropOffPoints: {
    level: number;
    count: number;
    percentage: number;
  }[];

  // Conversion rate (users who complete full drill path)
  conversionRate: number;
}

/**
 * Smart drill-down suggestions
 */
export interface DrillDownSuggestion {
  level: DrillDownLevel;
  confidence: number;
  reason: string;

  // Predicted value/benefit
  relevanceScore?: number;

  // Sample data preview
  preview?: any[];
}

/**
 * Drill-down template for common patterns
 */
export interface DrillDownTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'finance' | 'operations' | 'marketing' | 'custom';

  // Template configuration
  levels: Partial<DrillDownLevel>[];

  // Variables to be filled in
  variables: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array';
    required: boolean;
    defaultValue?: any;
  }[];
}

/**
 * Drill-down options for charts
 */
export interface ChartDrillDownOptions {
  // Enable/disable drill-down
  enabled: boolean;

  // Drill mode
  mode: 'click' | 'double-click' | 'context-menu' | 'button';

  // Visual indicators
  indicators: {
    showCursor?: boolean;
    showTooltipHint?: boolean;
    highlightDrillablePoints?: boolean;
    cursorStyle?: string;
  };

  // Confirmation
  requireConfirmation?: boolean;
  confirmationMessage?: string;

  // Loading state
  showLoadingIndicator?: boolean;
}

export default {
  DrillDownLevel,
  DrillDownState,
  DrillDownConfig,
  DrillDownAction,
  DrillDownContext,
  DrillDownPath,
  CrossDashboardDrillDown,
};
