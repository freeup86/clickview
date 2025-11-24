import Joi from 'joi';

// Workspace schemas
export const createWorkspaceSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional().allow(''),
  apiKey: Joi.string().optional().allow(''),
  clickupTeamId: Joi.string().optional().allow('')
});

export const updateWorkspaceSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  apiKey: Joi.string().optional(),
  isActive: Joi.boolean().optional()
});

// Dashboard schemas
export const createDashboardSchema = Joi.object({
  workspaceId: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).allow('').optional(),
  layoutConfig: Joi.array().items(Joi.object()).optional(),
  globalFilters: Joi.object().optional(),
  refreshInterval: Joi.number().min(60).max(3600).optional(),
  isTemplate: Joi.boolean().optional(),
  templateCategory: Joi.string().valid('overview', 'sprint', 'team', 'custom').optional()
});

export const updateDashboardSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  layoutConfig: Joi.array().items(Joi.object()).optional(),
  globalFilters: Joi.object().optional(),
  refreshInterval: Joi.number().min(60).max(3600).optional()
});

// Widget schemas
const widgetTypes = [
  'kpi_card', 'bar_chart', 'line_chart', 'pie_chart', 'donut_chart',
  'area_chart', 'gantt_chart', 'heatmap', 'data_table', 'progress_bar',
  'burndown_chart', 'custom_field_summary'
];

export const createWidgetSchema = Joi.object({
  dashboardId: Joi.string().uuid().required(),
  type: Joi.string().valid(...widgetTypes).required(),
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(500).optional(),
  position: Joi.object({
    x: Joi.number().min(0).required(),
    y: Joi.number().min(0).required(),
    w: Joi.number().min(1).max(12).required(),
    h: Joi.number().min(1).max(12).required()
  }).required(),
  config: Joi.object().optional(),
  dataConfig: Joi.object({
    sourceType: Joi.string().valid('tasks', 'custom_fields', 'time_tracking', 'comments', 'attachments').required(),
    spaceId: Joi.string().optional(),
    folderId: Joi.string().optional(),
    listId: Joi.string().optional(),
    customFieldId: Joi.string().optional(),
    aggregationType: Joi.string().valid('sum', 'avg', 'count', 'min', 'max', 'distinct').optional(),
    groupBy: Joi.string().optional(),
    timeGroupBy: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').optional(),
    calculatedFields: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      formula: Joi.string().required()
    })).optional()
  }).required(),
  filters: Joi.object().optional(),
  refreshInterval: Joi.number().min(60).max(3600).optional()
});

export const updateWidgetSchema = Joi.object({
  type: Joi.string().valid(...widgetTypes).optional(),
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(500).optional(),
  position: Joi.object({
    x: Joi.number().min(0).required(),
    y: Joi.number().min(0).required(),
    w: Joi.number().min(1).max(12).required(),
    h: Joi.number().min(1).max(12).required()
  }).optional(),
  config: Joi.object().optional(),
  dataConfig: Joi.object().optional(),
  filters: Joi.object().optional(),
  refreshInterval: Joi.number().min(60).max(3600).optional()
});

export const batchUpdateWidgetsSchema = Joi.object({
  widgets: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      position: Joi.object({
        x: Joi.number().min(0).required(),
        y: Joi.number().min(0).required(),
        w: Joi.number().min(1).max(12).required(),
        h: Joi.number().min(1).max(12).required()
      }).optional(),
      config: Joi.object().optional()
    })
  ).min(1).required()
});

// Filter schemas
export const filterSchema = Joi.object({
  field: Joi.string().required(),
  operator: Joi.string().valid(
    'equals', 'not_equals', 'contains', 'not_contains',
    'greater_than', 'less_than', 'between', 'in', 'not_in',
    'is_null', 'is_not_null'
  ).required(),
  value: Joi.any().allow(null, '').optional()
});

export const createFilterPresetSchema = Joi.object({
  workspaceId: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).required(),
  filters: Joi.object().required(),
  isGlobal: Joi.boolean().optional()
});

// Data query schemas
export const dataQuerySchema = Joi.object({
  workspaceId: Joi.string().uuid().required(),
  sourceType: Joi.string().valid('tasks', 'custom_fields', 'time_tracking', 'comments', 'attachments').required(),
  spaceId: Joi.string().optional(),
  folderId: Joi.string().optional(),
  listId: Joi.string().optional(),
  filters: Joi.alternatives().try(
    Joi.array().items(filterSchema),
    Joi.object({
      status: Joi.array().items(Joi.string()).optional(),
      dateRange: Joi.string().valid(
        'today', 'yesterday', 'current_week', 'last_week', 'next_week',
        'current_month', 'last_month', 'last_7_days', 'last_30_days', 'all'
      ).optional(),
      weekdays: Joi.array().items(Joi.string()).optional(),
      customFieldFilters: Joi.array().items(Joi.object({
        field: Joi.string().required(),
        operator: Joi.string().required(),
        value: Joi.any().allow(null, '').optional()
      })).optional(),
      priority: Joi.array().items(Joi.string()).optional(),
      assignee: Joi.array().items(Joi.string()).optional(),
      tags: Joi.array().items(Joi.string()).optional()
    })
  ).optional(),
  aggregationType: Joi.string().valid(
    'sum', 'avg', 'count', 'min', 'max', 'distinct',
    'percentage', 'progress', 'cumulative_count', 'none'
  ).optional(),
  groupBy: Joi.string().optional(),
  timeGroupBy: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  limit: Joi.number().min(1).max(1000).optional(),
  offset: Joi.number().min(0).optional(),
  dataConfig: Joi.object().optional()
});

// Pagination schema
export const paginationSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  workspaceId: Joi.string().uuid().optional()  // Allow workspaceId in query params
});