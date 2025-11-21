/**
 * Theme Showcase
 *
 * Interactive demonstration of all available themes with live chart previews.
 * Shows conditional formatting and theme customization capabilities.
 */

import React, { useState } from 'react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ThemeSelector, CompactThemeSelector } from '../components/ThemeSelector';
import { WidgetRenderer } from '../components/WidgetRenderer';
import { ChartType, WidgetConfig } from '../types/charts';
import { FORMATTING_TEMPLATES, applyConditionalFormatting } from '../utils/conditionalFormatting';

/**
 * Sample Data
 */
const salesData = [
  { month: 'Jan', sales: 42000, target: 45000, growth: 12.5 },
  { month: 'Feb', sales: 48000, target: 45000, growth: 14.3 },
  { month: 'Mar', sales: 51000, target: 50000, growth: 6.2 },
  { month: 'Apr', sales: 47000, target: 50000, growth: -7.8 },
  { month: 'May', sales: 55000, target: 52000, growth: 17.0 },
  { month: 'Jun', sales: 59000, target: 55000, growth: 7.3 },
  { month: 'Jul', sales: 62000, target: 60000, growth: 5.1 },
  { month: 'Aug', sales: 58000, target: 60000, growth: -6.5 },
  { month: 'Sep', sales: 64000, target: 62000, growth: 10.3 },
  { month: 'Oct', sales: 68000, target: 65000, growth: 6.2 },
  { month: 'Nov', sales: 72000, target: 70000, growth: 5.9 },
  { month: 'Dec', sales: 78000, target: 75000, growth: 8.3 },
];

const categoryData = [
  { category: 'Electronics', revenue: 285000, profit: 42750, margin: 15 },
  { category: 'Clothing', revenue: 198000, profit: 39600, margin: 20 },
  { category: 'Food', revenue: 156000, profit: 23400, margin: 15 },
  { category: 'Books', revenue: 89000, profit: 22250, margin: 25 },
  { category: 'Toys', revenue: 124000, profit: 18600, margin: 15 },
  { category: 'Sports', revenue: 167000, profit: 33400, margin: 20 },
];

/**
 * Theme Showcase Content
 */
const ThemeShowcaseContent: React.FC = () => {
  const { currentTheme, currentThemeId, toggleDarkMode, isDarkMode } = useTheme();
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  // Widget configurations
  const lineChartConfig: WidgetConfig = {
    id: 'sales-trend',
    type: ChartType.LINE,
    title: 'Monthly Sales Trend',
    x: 0,
    y: 0,
    width: 6,
    height: 4,
    dataSource: { type: 'static', data: salesData },
    dataMapping: { xField: 'month', yField: ['sales', 'target'] },
    chartConfig: {
      type: ChartType.LINE,
      xAxis: { label: 'Month' },
      yAxis: { label: 'Sales ($)' },
      legend: { show: true, position: 'top' },
      animation: { enabled: true, duration: 1000 },
    },
  };

  const barChartConfig: WidgetConfig = {
    id: 'category-revenue',
    type: ChartType.BAR,
    title: 'Revenue by Category',
    x: 6,
    y: 0,
    width: 6,
    height: 4,
    dataSource: { type: 'static', data: categoryData },
    dataMapping: { xField: 'category', yField: 'revenue' },
    chartConfig: {
      type: ChartType.BAR,
      xAxis: { label: 'Category' },
      yAxis: { label: 'Revenue ($)' },
      orientation: 'vertical',
      animation: { enabled: true, duration: 800 },
    },
  };

  const pieChartConfig: WidgetConfig = {
    id: 'category-distribution',
    type: ChartType.PIE,
    title: 'Revenue Distribution',
    x: 0,
    y: 4,
    width: 6,
    height: 4,
    dataSource: { type: 'static', data: categoryData },
    dataMapping: { categoryField: 'category', valueField: 'revenue' },
    chartConfig: {
      type: ChartType.PIE,
      legend: { show: true, position: 'right' },
      showPercentages: true,
    },
  };

  const areaChartConfig: WidgetConfig = {
    id: 'profit-margin',
    type: ChartType.AREA,
    title: 'Profit Margin Trend',
    x: 6,
    y: 4,
    width: 6,
    height: 4,
    dataSource: { type: 'static', data: salesData },
    dataMapping: { xField: 'month', yField: 'growth' },
    chartConfig: {
      type: ChartType.AREA,
      xAxis: { label: 'Month' },
      yAxis: { label: 'Growth (%)' },
      animation: { enabled: true, duration: 1200 },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ backgroundColor: currentTheme.colors.background }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Theme Showcase</h1>
              <p className="text-gray-600 mt-1">
                Explore {25}+ professional themes with live chart previews
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>

              {/* Compact Theme Selector */}
              <CompactThemeSelector />

              {/* Full Theme Gallery Button */}
              <button
                onClick={() => setShowThemeSelector(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Browse All Themes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Current Theme Info */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {currentTheme.name}
              </h2>
              <p className="text-gray-600 mb-4">
                {currentThemeId && (() => {
                  const registry = require('../themes').default;
                  const metadata = registry.find((t: any) => t.id === currentThemeId);
                  return metadata?.description || 'Custom theme';
                })()}
              </p>

              {/* Theme Properties */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Color Palette</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentTheme.colors.primary.map((color, index) => (
                      <div
                        key={index}
                        className="group relative"
                      >
                        <div
                          className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer transition-transform hover:scale-110"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {color}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Typography</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Title:</span>{' '}
                      <span className="font-medium">{currentTheme.fonts.title.family}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Body:</span>{' '}
                      <span className="font-medium">{currentTheme.fonts.axis.family}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Animation:</span>{' '}
                      <span className="font-medium">{currentTheme.animationDuration}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Theme Badge */}
            <div className="ml-6">
              {currentThemeId && (() => {
                const registry = require('../themes').default;
                const metadata = registry.find((t: any) => t.id === currentThemeId);
                if (!metadata) return null;

                return (
                  <div className="flex flex-col gap-2">
                    {metadata.accessibility.wcagLevel && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        WCAG {metadata.accessibility.wcagLevel}
                      </span>
                    )}
                    {metadata.accessibility.colorblindSafe && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        Colorblind Safe
                      </span>
                    )}
                    {metadata.accessibility.highContrast && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                        High Contrast
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Chart Grid */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow" style={{ height: '400px' }}>
            <WidgetRenderer config={lineChartConfig} />
          </div>

          <div className="bg-white rounded-lg shadow" style={{ height: '400px' }}>
            <WidgetRenderer config={barChartConfig} />
          </div>

          <div className="bg-white rounded-lg shadow" style={{ height: '400px' }}>
            <WidgetRenderer config={pieChartConfig} />
          </div>

          <div className="bg-white rounded-lg shadow" style={{ height: '400px' }}>
            <WidgetRenderer config={areaChartConfig} />
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Theme System Features</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">✅ Themes</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 25+ professional themes</li>
                <li>• Industry-specific designs</li>
                <li>• Accessibility optimized</li>
                <li>• Nature-inspired palettes</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">✅ Features</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Auto dark mode detection</li>
                <li>• LocalStorage persistence</li>
                <li>• Dynamic theme switching</li>
                <li>• Custom theme builder</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">✅ Accessibility</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• WCAG 2.1 AAA compliant themes</li>
                <li>• Colorblind-safe palettes</li>
                <li>• High contrast options</li>
                <li>• Print-optimized themes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Gallery Modal */}
      {showThemeSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-white rounded-lg shadow-2xl">
              <div className="flex justify-end p-4 border-b">
                <button
                  onClick={() => setShowThemeSelector(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <ThemeSelector />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main Export with Provider
 */
export const ThemeShowcasePage: React.FC = () => {
  return (
    <ThemeProvider defaultThemeId="light" autoFollowSystem={false}>
      <ThemeShowcaseContent />
    </ThemeProvider>
  );
};

export default ThemeShowcasePage;
