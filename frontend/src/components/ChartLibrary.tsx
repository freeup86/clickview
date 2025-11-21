/**
 * Chart Library Component
 *
 * Visual library for browsing and selecting chart types.
 * Provides categorized view of all available charts with previews,
 * descriptions, and quick-start templates.
 */

import React, { useState, useMemo } from 'react';
import { ChartType } from '../types/charts';

interface ChartTypeInfo {
  type: ChartType;
  name: string;
  description: string;
  icon: string;
  category: 'basic' | 'advanced' | 'statistical' | 'business' | 'specialized';
  preview: string;
  requiredFields: string[];
  useCases: string[];
  difficulty: 'easy' | 'medium' | 'advanced';
}

/**
 * Chart type registry with metadata
 */
const CHART_LIBRARY: ChartTypeInfo[] = [
  // Basic Charts
  {
    type: ChartType.LINE,
    name: 'Line Chart',
    description: 'Display trends over time with connected data points',
    icon: '📈',
    category: 'basic',
    preview: '/previews/line.png',
    requiredFields: ['x', 'y'],
    useCases: ['Time series', 'Trends', 'Comparisons'],
    difficulty: 'easy',
  },
  {
    type: ChartType.BAR,
    name: 'Bar Chart',
    description: 'Compare values across categories using horizontal bars',
    icon: '📊',
    category: 'basic',
    preview: '/previews/bar.png',
    requiredFields: ['category', 'value'],
    useCases: ['Comparisons', 'Rankings', 'Distributions'],
    difficulty: 'easy',
  },
  {
    type: ChartType.COLUMN,
    name: 'Column Chart',
    description: 'Compare values across categories using vertical bars',
    icon: '📊',
    category: 'basic',
    preview: '/previews/column.png',
    requiredFields: ['category', 'value'],
    useCases: ['Comparisons', 'Rankings', 'Time periods'],
    difficulty: 'easy',
  },
  {
    type: ChartType.PIE,
    name: 'Pie Chart',
    description: 'Show proportions as slices of a circle',
    icon: '🥧',
    category: 'basic',
    preview: '/previews/pie.png',
    requiredFields: ['category', 'value'],
    useCases: ['Proportions', 'Market share', 'Percentages'],
    difficulty: 'easy',
  },
  {
    type: ChartType.DONUT,
    name: 'Donut Chart',
    description: 'Pie chart with a hollow center for cleaner look',
    icon: '🍩',
    category: 'basic',
    preview: '/previews/donut.png',
    requiredFields: ['category', 'value'],
    useCases: ['Proportions', 'KPIs', 'Percentages'],
    difficulty: 'easy',
  },
  {
    type: ChartType.AREA,
    name: 'Area Chart',
    description: 'Line chart with filled area underneath',
    icon: '📉',
    category: 'basic',
    preview: '/previews/area.png',
    requiredFields: ['x', 'y'],
    useCases: ['Cumulative trends', 'Volume over time', 'Comparisons'],
    difficulty: 'easy',
  },
  {
    type: ChartType.SCATTER,
    name: 'Scatter Plot',
    description: 'Show relationship between two variables',
    icon: '⚫',
    category: 'basic',
    preview: '/previews/scatter.png',
    requiredFields: ['x', 'y'],
    useCases: ['Correlations', 'Distributions', 'Outliers'],
    difficulty: 'medium',
  },

  // Advanced Charts
  {
    type: ChartType.STACKED_BAR,
    name: 'Stacked Bar',
    description: 'Bars divided into segments showing part-to-whole relationships',
    icon: '📊',
    category: 'advanced',
    preview: '/previews/stacked-bar.png',
    requiredFields: ['category', 'series', 'value'],
    useCases: ['Part-to-whole', 'Comparisons', 'Multiple series'],
    difficulty: 'medium',
  },
  {
    type: ChartType.STACKED_AREA,
    name: 'Stacked Area',
    description: 'Multiple area series stacked on top of each other',
    icon: '📈',
    category: 'advanced',
    preview: '/previews/stacked-area.png',
    requiredFields: ['x', 'series', 'y'],
    useCases: ['Cumulative trends', 'Multiple categories', 'Total over time'],
    difficulty: 'medium',
  },
  {
    type: ChartType.GROUPED_BAR,
    name: 'Grouped Bar',
    description: 'Multiple bars grouped side-by-side for comparison',
    icon: '📊',
    category: 'advanced',
    preview: '/previews/grouped-bar.png',
    requiredFields: ['category', 'series', 'value'],
    useCases: ['Multi-series comparison', 'Period over period', 'Categories'],
    difficulty: 'medium',
  },
  {
    type: ChartType.COMBO,
    name: 'Combo Chart',
    description: 'Combine multiple chart types (line, bar, area)',
    icon: '📊',
    category: 'advanced',
    preview: '/previews/combo.png',
    requiredFields: ['x', 'series'],
    useCases: ['Different metrics', 'Dual scales', 'Complex analysis'],
    difficulty: 'advanced',
  },
  {
    type: ChartType.DUAL_AXIS,
    name: 'Dual Axis Chart',
    description: 'Two different y-axes for different scales',
    icon: '📈',
    category: 'advanced',
    preview: '/previews/dual-axis.png',
    requiredFields: ['x', 'y1', 'y2'],
    useCases: ['Different scales', 'Multiple metrics', 'Correlations'],
    difficulty: 'advanced',
  },

  // Business Charts
  {
    type: ChartType.FUNNEL,
    name: 'Funnel Chart',
    description: 'Visualize progressive stages in a process',
    icon: '🔻',
    category: 'business',
    preview: '/previews/funnel.png',
    requiredFields: ['stage', 'value'],
    useCases: ['Conversion rates', 'Sales pipeline', 'Process stages'],
    difficulty: 'medium',
  },
  {
    type: ChartType.WATERFALL,
    name: 'Waterfall Chart',
    description: 'Show cumulative effect of sequential values',
    icon: '📊',
    category: 'business',
    preview: '/previews/waterfall.png',
    requiredFields: ['category', 'value'],
    useCases: ['Financial analysis', 'P&L breakdown', 'Variance analysis'],
    difficulty: 'advanced',
  },
  {
    type: ChartType.BULLET,
    name: 'Bullet Chart',
    description: 'Compare actual vs target performance',
    icon: '🎯',
    category: 'business',
    preview: '/previews/bullet.png',
    requiredFields: ['metric', 'actual', 'target'],
    useCases: ['KPIs', 'Goal tracking', 'Performance'],
    difficulty: 'medium',
  },
  {
    type: ChartType.GAUGE,
    name: 'Gauge Chart',
    description: 'Display single value on a radial scale',
    icon: '🎚️',
    category: 'business',
    preview: '/previews/gauge.png',
    requiredFields: ['value', 'min', 'max'],
    useCases: ['KPIs', 'Speedometer', 'Progress'],
    difficulty: 'medium',
  },

  // Specialized Charts
  {
    type: ChartType.HEATMAP,
    name: 'Heatmap',
    description: 'Show data density using color intensity',
    icon: '🔥',
    category: 'specialized',
    preview: '/previews/heatmap.png',
    requiredFields: ['x', 'y', 'value'],
    useCases: ['Patterns', 'Correlations', 'Time of day analysis'],
    difficulty: 'advanced',
  },
  {
    type: ChartType.TREEMAP,
    name: 'Treemap',
    description: 'Hierarchical data as nested rectangles',
    icon: '🗂️',
    category: 'specialized',
    preview: '/previews/treemap.png',
    requiredFields: ['category', 'value', 'hierarchy'],
    useCases: ['Hierarchies', 'Proportions', 'File systems'],
    difficulty: 'advanced',
  },
  {
    type: ChartType.SANKEY,
    name: 'Sankey Diagram',
    description: 'Flow between nodes with proportional widths',
    icon: '🌊',
    category: 'specialized',
    preview: '/previews/sankey.png',
    requiredFields: ['source', 'target', 'value'],
    useCases: ['Flows', 'Transitions', 'Energy/material flow'],
    difficulty: 'advanced',
  },
];

interface ChartLibraryProps {
  onSelectChart?: (chartType: ChartType) => void;
  selectedCategory?: string;
}

export const ChartLibrary: React.FC<ChartLibraryProps> = ({
  onSelectChart,
  selectedCategory,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>(
    selectedCategory || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChart, setSelectedChart] = useState<ChartType | null>(null);

  // Filter charts based on category and search
  const filteredCharts = useMemo(() => {
    let charts = CHART_LIBRARY;

    // Filter by category
    if (activeCategory !== 'all') {
      charts = charts.filter((chart) => chart.category === activeCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      charts = charts.filter(
        (chart) =>
          chart.name.toLowerCase().includes(query) ||
          chart.description.toLowerCase().includes(query) ||
          chart.useCases.some((useCase) => useCase.toLowerCase().includes(query))
      );
    }

    return charts;
  }, [activeCategory, searchQuery]);

  // Get chart counts by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: CHART_LIBRARY.length,
      basic: 0,
      advanced: 0,
      business: 0,
      specialized: 0,
    };

    CHART_LIBRARY.forEach((chart) => {
      counts[chart.category]++;
    });

    return counts;
  }, []);

  const handleSelectChart = (chartType: ChartType) => {
    setSelectedChart(chartType);
    if (onSelectChart) {
      onSelectChart(chartType);
    }
  };

  const categories = [
    { id: 'all', name: 'All Charts', icon: '📊' },
    { id: 'basic', name: 'Basic', icon: '📈' },
    { id: 'advanced', name: 'Advanced', icon: '🎯' },
    { id: 'business', name: 'Business', icon: '💼' },
    { id: 'specialized', name: 'Specialized', icon: '🔬' },
  ];

  const selectedChartInfo = selectedChart
    ? CHART_LIBRARY.find((c) => c.type === selectedChart)
    : null;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Chart Library</h2>
        <p className="text-gray-600">
          Choose from {CHART_LIBRARY.length} professionally designed chart types
        </p>
      </div>

      {/* Search */}
      <div className="bg-white border-b px-6 py-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search charts by name, description, or use case..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-3 h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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
        {/* Category Sidebar */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <div className="p-4 space-y-1">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                  activeCategory === category.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center space-x-3">
                  <span className="text-xl">{category.icon}</span>
                  <span>{category.name}</span>
                </span>
                <span className="text-sm text-gray-500">
                  {categoryCounts[category.id]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Chart Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredCharts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No charts found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCharts.map((chart) => (
                <button
                  key={chart.type}
                  onClick={() => handleSelectChart(chart.type)}
                  className={`bg-white rounded-lg border-2 p-6 text-left transition-all hover:shadow-lg hover:border-blue-400 ${
                    selectedChart === chart.type
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Chart Icon & Name */}
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-3xl">{chart.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {chart.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          chart.difficulty === 'easy'
                            ? 'bg-green-100 text-green-700'
                            : chart.difficulty === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {chart.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4">
                    {chart.description}
                  </p>

                  {/* Use Cases */}
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-500 mb-2">
                      Best for:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {chart.useCases.map((useCase, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                        >
                          {useCase}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Required Fields */}
                  <div className="text-xs text-gray-500">
                    Requires: {chart.requiredFields.join(', ')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chart Details Panel */}
        {selectedChartInfo && (
          <div className="w-80 bg-white border-l overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedChartInfo.name}
                </h3>
                <button
                  onClick={() => setSelectedChart(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Icon */}
                <div className="text-6xl text-center py-4">
                  {selectedChartInfo.icon}
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-gray-600">
                    {selectedChartInfo.description}
                  </p>
                </div>

                {/* Category */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Category
                  </h4>
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm capitalize">
                    {selectedChartInfo.category}
                  </span>
                </div>

                {/* Difficulty */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Difficulty
                  </h4>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm capitalize ${
                      selectedChartInfo.difficulty === 'easy'
                        ? 'bg-green-100 text-green-700'
                        : selectedChartInfo.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {selectedChartInfo.difficulty}
                  </span>
                </div>

                {/* Required Fields */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Required Fields
                  </h4>
                  <ul className="space-y-1">
                    {selectedChartInfo.requiredFields.map((field, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Use Cases */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Common Use Cases
                  </h4>
                  <ul className="space-y-1">
                    {selectedChartInfo.useCases.map((useCase, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-center">
                        <span className="text-blue-500 mr-2">→</span>
                        {useCase}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => onSelectChart && onSelectChart(selectedChartInfo.type)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Use This Chart
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartLibrary;
