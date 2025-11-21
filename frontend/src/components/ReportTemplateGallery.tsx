/**
 * Report Template Gallery
 *
 * Browse and select from pre-built report templates:
 * - Executive dashboards
 * - Sales reports
 * - Financial reports
 * - Marketing analytics
 * - Operations dashboards
 * - HR analytics
 * - Custom templates
 */

import React, { useState, useMemo } from 'react';
import {
  ReportTemplate,
  ReportTemplateCategory,
  Report,
  ReportElement,
  ReportElementType,
  ChartElement,
  MetricCardElement,
  TextElement,
} from '../types/reports';
import { ChartType } from '../types/charts';

// ===================================================================
// TEMPLATE GALLERY COMPONENT
// ===================================================================

interface ReportTemplateGalleryProps {
  onSelectTemplate: (template: ReportTemplate) => void;
  onClose?: () => void;
}

export const ReportTemplateGallery: React.FC<ReportTemplateGalleryProps> = ({
  onSelectTemplate,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ReportTemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const templates = getBuiltInTemplates();

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [templates, selectedCategory, searchQuery]);

  const categories: Array<{ id: ReportTemplateCategory | 'all'; label: string; icon: string }> = [
    { id: 'all', label: 'All Templates', icon: '📁' },
    { id: 'executive', label: 'Executive', icon: '👔' },
    { id: 'sales', label: 'Sales', icon: '💰' },
    { id: 'marketing', label: 'Marketing', icon: '📢' },
    { id: 'finance', label: 'Finance', icon: '💵' },
    { id: 'operations', label: 'Operations', icon: '⚙️' },
    { id: 'hr', label: 'HR', icon: '👥' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'custom', label: 'Custom', icon: '🎨' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Report Templates</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Categories */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-xl">{category.icon}</span>
                  <span className="text-sm">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main - Template Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p>No templates found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={() => onSelectTemplate(template)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// TEMPLATE CARD
// ===================================================================

const TemplateCard: React.FC<{
  template: ReportTemplate;
  onSelect: () => void;
}> = ({ template, onSelect }) => {
  const difficultyColors = {
    beginner: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    advanced: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  };

  return (
    <div
      className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
        {template.thumbnail ? (
          <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover" />
        ) : (
          <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{template.name}</h3>
          <span className={`px-2 py-1 text-xs font-medium rounded ${difficultyColors[template.difficulty]}`}>
            {template.difficulty}
          </span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{template.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">+{template.tags.length - 3}</span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{template.elements.length} elements</span>
          {template.usageCount !== undefined && <span>{template.usageCount} uses</span>}
          {template.rating && (
            <span className="flex items-center gap-1">
              ⭐ {template.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Hover Action */}
      <div className="p-4 pt-0">
        <button className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
          Use Template
        </button>
      </div>
    </div>
  );
};

// ===================================================================
// BUILT-IN TEMPLATES
// ===================================================================

function getBuiltInTemplates(): ReportTemplate[] {
  return [
    // Executive Dashboard
    {
      id: 'exec-dashboard-01',
      name: 'Executive Dashboard',
      description: 'Comprehensive executive dashboard with key business metrics, trends, and performance indicators.',
      category: 'executive',
      thumbnail: undefined,
      previewImages: [],
      tags: ['dashboard', 'kpi', 'metrics', 'executive', 'overview'],
      difficulty: 'beginner',
      estimatedSetupTime: 15,
      layout: {
        type: 'canvas',
        width: 1920,
        height: 1080,
        backgroundColor: '#f3f4f6',
        pageSize: 'screen',
        orientation: 'landscape',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      elements: [
        // Header
        {
          id: 'header-1',
          type: ReportElementType.TEXT,
          name: 'Dashboard Title',
          position: { x: 40, y: 40, width: 600, height: 60 },
          style: {},
          content: 'Executive Dashboard',
          textStyle: {
            fontSize: 32,
            fontWeight: 'bold',
            color: '#111827',
          },
        } as Partial<TextElement>,

        // KPI Cards Row
        {
          id: 'metric-1',
          type: ReportElementType.METRIC_CARD,
          name: 'Revenue',
          position: { x: 40, y: 120, width: 300, height: 150 },
          style: {},
          metric: {
            label: 'Total Revenue',
            field: 'revenue',
            aggregation: 'sum',
            prefix: '$',
            format: { type: 'currency', currencySymbol: 'USD' },
          },
          comparison: {
            type: 'previous_period',
            showPercentChange: true,
          },
        } as Partial<MetricCardElement>,

        {
          id: 'metric-2',
          type: ReportElementType.METRIC_CARD,
          name: 'Customers',
          position: { x: 360, y: 120, width: 300, height: 150 },
          style: {},
          metric: {
            label: 'Active Customers',
            field: 'customers',
            aggregation: 'count_distinct',
          },
          comparison: {
            type: 'previous_period',
            showPercentChange: true,
          },
        } as Partial<MetricCardElement>,

        {
          id: 'metric-3',
          type: ReportElementType.METRIC_CARD,
          name: 'Orders',
          position: { x: 680, y: 120, width: 300, height: 150 },
          style: {},
          metric: {
            label: 'Total Orders',
            field: 'orders',
            aggregation: 'count',
          },
          comparison: {
            type: 'previous_period',
            showPercentChange: true,
          },
        } as Partial<MetricCardElement>,

        {
          id: 'metric-4',
          type: ReportElementType.METRIC_CARD,
          name: 'Conversion',
          position: { x: 1000, y: 120, width: 300, height: 150 },
          style: {},
          metric: {
            label: 'Conversion Rate',
            field: 'conversion_rate',
            aggregation: 'avg',
            suffix: '%',
            format: { type: 'percentage', decimals: 2 },
          },
          comparison: {
            type: 'target',
            value: 5.0,
            showPercentChange: true,
          },
        } as Partial<MetricCardElement>,

        // Charts
        {
          id: 'chart-1',
          type: ReportElementType.CHART,
          name: 'Revenue Trend',
          position: { x: 40, y: 300, width: 620, height: 400 },
          style: {},
          chartType: ChartType.LINE,
          config: {
            data: { series: [] },
            title: 'Revenue Over Time',
          },
          dataSource: { type: 'static' },
        } as Partial<ChartElement>,

        {
          id: 'chart-2',
          type: ReportElementType.CHART,
          name: 'Sales by Category',
          position: { x: 680, y: 300, width: 620, height: 400 },
          style: {},
          chartType: ChartType.BAR,
          config: {
            data: { series: [] },
            title: 'Sales by Category',
          },
          dataSource: { type: 'static' },
        } as Partial<ChartElement>,

        {
          id: 'chart-3',
          type: ReportElementType.CHART,
          name: 'Regional Distribution',
          position: { x: 1320, y: 300, width: 560, height: 400 },
          style: {},
          chartType: ChartType.PIE,
          config: {
            data: { series: [] },
            title: 'Sales by Region',
          },
          dataSource: { type: 'static' },
        } as Partial<ChartElement>,
      ],
      requiredDataFields: [
        { name: 'revenue', label: 'Revenue', dataType: 'currency', required: true },
        { name: 'customers', label: 'Customers', dataType: 'integer', required: true },
        { name: 'orders', label: 'Orders', dataType: 'integer', required: true },
        { name: 'conversion_rate', label: 'Conversion Rate', dataType: 'percentage', required: true },
      ],
      configurableProperties: [],
      colorSchemes: [],
      usageCount: 1250,
      rating: 4.8,
      createdAt: new Date('2024-01-01'),
    },

    // Sales Performance Report
    {
      id: 'sales-perf-01',
      name: 'Sales Performance Report',
      description: 'Track sales metrics, pipeline health, and team performance with detailed analytics.',
      category: 'sales',
      tags: ['sales', 'performance', 'pipeline', 'team', 'quota'],
      difficulty: 'intermediate',
      estimatedSetupTime: 25,
      layout: {
        type: 'canvas',
        width: 1920,
        height: 1080,
        backgroundColor: '#ffffff',
        pageSize: 'screen',
        orientation: 'landscape',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      elements: [],
      requiredDataFields: [],
      configurableProperties: [],
      colorSchemes: [],
      usageCount: 890,
      rating: 4.6,
      createdAt: new Date('2024-01-15'),
    },

    // Financial Summary
    {
      id: 'finance-summary-01',
      name: 'Financial Summary',
      description: 'P&L statement, cash flow analysis, and key financial indicators in a single view.',
      category: 'finance',
      tags: ['finance', 'p&l', 'cash-flow', 'balance-sheet', 'financial'],
      difficulty: 'advanced',
      estimatedSetupTime: 40,
      layout: {
        type: 'canvas',
        width: 1920,
        height: 1080,
        backgroundColor: '#ffffff',
        pageSize: 'letter',
        orientation: 'portrait',
        margins: { top: 40, right: 40, bottom: 40, left: 40 },
      },
      elements: [],
      requiredDataFields: [],
      configurableProperties: [],
      colorSchemes: [],
      usageCount: 670,
      rating: 4.9,
      createdAt: new Date('2024-02-01'),
    },

    // Marketing Analytics
    {
      id: 'marketing-analytics-01',
      name: 'Marketing Analytics',
      description: 'Campaign performance, lead generation, and ROI tracking for marketing teams.',
      category: 'marketing',
      tags: ['marketing', 'campaigns', 'leads', 'roi', 'attribution'],
      difficulty: 'intermediate',
      estimatedSetupTime: 30,
      layout: {
        type: 'canvas',
        width: 1920,
        height: 1080,
        backgroundColor: '#f9fafb',
        pageSize: 'screen',
        orientation: 'landscape',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      elements: [],
      requiredDataFields: [],
      configurableProperties: [],
      colorSchemes: [],
      usageCount: 540,
      rating: 4.5,
      createdAt: new Date('2024-02-15'),
    },

    // Operations Dashboard
    {
      id: 'ops-dashboard-01',
      name: 'Operations Dashboard',
      description: 'Monitor operational efficiency, resource utilization, and process metrics.',
      category: 'operations',
      tags: ['operations', 'efficiency', 'resources', 'processes', 'kpi'],
      difficulty: 'intermediate',
      estimatedSetupTime: 35,
      layout: {
        type: 'canvas',
        width: 1920,
        height: 1080,
        backgroundColor: '#f3f4f6',
        pageSize: 'screen',
        orientation: 'landscape',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      elements: [],
      requiredDataFields: [],
      configurableProperties: [],
      colorSchemes: [],
      usageCount: 420,
      rating: 4.4,
      createdAt: new Date('2024-03-01'),
    },

    // HR Analytics
    {
      id: 'hr-analytics-01',
      name: 'HR Analytics',
      description: 'Employee metrics, turnover analysis, and workforce planning insights.',
      category: 'hr',
      tags: ['hr', 'employees', 'turnover', 'headcount', 'workforce'],
      difficulty: 'beginner',
      estimatedSetupTime: 20,
      layout: {
        type: 'canvas',
        width: 1920,
        height: 1080,
        backgroundColor: '#ffffff',
        pageSize: 'screen',
        orientation: 'landscape',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      elements: [],
      requiredDataFields: [],
      configurableProperties: [],
      colorSchemes: [],
      usageCount: 310,
      rating: 4.3,
      createdAt: new Date('2024-03-15'),
    },
  ];
}
