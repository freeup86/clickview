/**
 * Drill-Down Examples
 *
 * Comprehensive examples demonstrating multi-level drill-down functionality.
 * Shows time-series, geographic, sales, and product hierarchy drill-downs.
 */

import React, { useState } from 'react';
import { DrillDownProvider, useDrillDown } from '../context/DrillDownContext';
import { DrillDownBreadcrumb } from '../components/DrillDownBreadcrumb';
import { WidgetRenderer } from '../components/WidgetRenderer';
import { WidgetConfig, ChartType } from '../types/charts';
import { DrillDownLevel, DrillDownConfig } from '../types/drilldown';
import { DrillDownPathBuilder, DrillDownTemplates } from '../utils/drillDownManager';

/**
 * Sample Data Generators
 */

// Yearly sales data
const yearlyData = [
  { year: '2021', revenue: 2800000, profit: 420000, growth: 12.5 },
  { year: '2022', revenue: 3200000, profit: 520000, growth: 14.3 },
  { year: '2023', revenue: 3800000, profit: 680000, growth: 18.8 },
  { year: '2024', revenue: 4500000, profit: 900000, growth: 18.4 },
];

// Quarterly data by year
const quarterlyData: Record<string, any[]> = {
  '2024': [
    { quarter: 'Q1 2024', revenue: 950000, profit: 180000 },
    { quarter: 'Q2 2024', revenue: 1100000, profit: 220000 },
    { quarter: 'Q3 2024', revenue: 1250000, profit: 260000 },
    { quarter: 'Q4 2024', revenue: 1200000, profit: 240000 },
  ],
};

// Monthly data by quarter
const monthlyData: Record<string, any[]> = {
  'Q4 2024': [
    { month: 'Oct 2024', revenue: 380000, profit: 76000, orders: 245 },
    { month: 'Nov 2024', revenue: 420000, profit: 88000, orders: 278 },
    { month: 'Dec 2024', revenue: 400000, profit: 76000, orders: 256 },
  ],
};

// Geographic data
const countryData = [
  { country: 'USA', revenue: 1800000, customers: 1250 },
  { country: 'UK', revenue: 950000, customers: 680 },
  { country: 'Germany', revenue: 820000, customers: 520 },
  { country: 'France', revenue: 630000, customers: 410 },
  { country: 'Canada', revenue: 300000, customers: 180 },
];

const stateData: Record<string, any[]> = {
  USA: [
    { state: 'California', revenue: 680000, customers: 450 },
    { state: 'Texas', revenue: 420000, customers: 310 },
    { state: 'New York', revenue: 380000, customers: 280 },
    { state: 'Florida', revenue: 320000, customers: 210 },
  ],
};

const cityData: Record<string, any[]> = {
  California: [
    { city: 'Los Angeles', revenue: 285000, customers: 198 },
    { city: 'San Francisco', revenue: 245000, customers: 165 },
    { city: 'San Diego', revenue: 150000, customers: 87 },
  ],
};

/**
 * Example 1: Time-Series Drill-Down (Year → Quarter → Month)
 */
const TimeSeriesDrillDown: React.FC = () => {
  const { state, getCurrentLevel } = useDrillDown();
  const currentLevel = getCurrentLevel();

  // Build drill-down configuration
  const drillDownConfig: DrillDownConfig = {
    enabled: true,
    levels: [
      {
        id: 'yearly',
        name: 'Yearly View',
        description: 'Annual revenue overview',
        targetType: 'data',
        chartType: ChartType.LINE,
        isDrillable: true,
        parameterMapping: { year: 'year' },
      },
      {
        id: 'quarterly',
        name: 'Quarterly View',
        description: 'Quarterly breakdown',
        targetType: 'data',
        chartType: ChartType.BAR,
        isDrillable: true,
        parameterMapping: { quarter: 'quarter' },
      },
      {
        id: 'monthly',
        name: 'Monthly View',
        description: 'Monthly details',
        targetType: 'data',
        chartType: ChartType.AREA,
        isDrillable: false,
      },
    ],
    maxDepth: 3,
    preserveInUrl: true,
  };

  // Get data for current level
  const getCurrentData = () => {
    const params = state?.parameters || {};

    switch (currentLevel) {
      case 0: // Quarterly
        return quarterlyData[params.year] || [];
      case 1: // Monthly
        return monthlyData[params.quarter] || [];
      default: // Yearly
        return yearlyData;
    }
  };

  // Get chart config for current level
  const getChartConfig = (): WidgetConfig => {
    const data = getCurrentData();
    const params = state?.parameters || {};

    switch (currentLevel) {
      case 0: // Quarterly
        return {
          id: 'quarterly-chart',
          type: ChartType.BAR,
          title: `Quarterly Revenue - ${params.year}`,
          x: 0,
          y: 0,
          width: 12,
          height: 6,
          dataSource: { type: 'static', data },
          dataMapping: { xField: 'quarter', yField: 'revenue' },
          chartConfig: {
            type: ChartType.BAR,
            xAxis: { label: 'Quarter' },
            yAxis: { label: 'Revenue ($)' },
            interactivity: { clickable: true },
            drillDown: drillDownConfig,
          },
        };

      case 1: // Monthly
        return {
          id: 'monthly-chart',
          type: ChartType.AREA,
          title: `Monthly Revenue - ${params.quarter}`,
          x: 0,
          y: 0,
          width: 12,
          height: 6,
          dataSource: { type: 'static', data },
          dataMapping: { xField: 'month', yField: ['revenue', 'profit'] },
          chartConfig: {
            type: ChartType.AREA,
            xAxis: { label: 'Month' },
            yAxis: { label: 'Amount ($)' },
            interactivity: { clickable: false },
          },
        };

      default: // Yearly
        return {
          id: 'yearly-chart',
          type: ChartType.LINE,
          title: 'Annual Revenue Trend',
          x: 0,
          y: 0,
          width: 12,
          height: 6,
          dataSource: { type: 'static', data },
          dataMapping: { xField: 'year', yField: 'revenue' },
          chartConfig: {
            type: ChartType.LINE,
            xAxis: { label: 'Year' },
            yAxis: { label: 'Revenue ($)' },
            interactivity: { clickable: true },
            drillDown: drillDownConfig,
          },
        };
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Time-Series Drill-Down</h3>
        <p className="text-sm text-gray-600">
          Click on data points to drill from Year → Quarter → Month
        </p>
      </div>

      {/* Breadcrumb Navigation */}
      <DrillDownBreadcrumb className="mb-4" />

      {/* Chart */}
      <div style={{ height: '400px' }}>
        <WidgetRenderer config={getChartConfig()} />
      </div>

      {/* Level Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded">
        <div className="text-sm">
          <strong>Current Level:</strong> {currentLevel === -1 ? 'Yearly' : currentLevel === 0 ? 'Quarterly' : 'Monthly'}
        </div>
        {state?.parameters && Object.keys(state.parameters).length > 0 && (
          <div className="text-sm mt-1">
            <strong>Parameters:</strong> {JSON.stringify(state.parameters, null, 2)}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Example 2: Geographic Drill-Down (Country → State → City)
 */
const GeographicDrillDown: React.FC = () => {
  const { state, getCurrentLevel } = useDrillDown();
  const currentLevel = getCurrentLevel();

  const drillDownConfig: DrillDownConfig = {
    enabled: true,
    levels: [
      {
        id: 'country',
        name: 'Country View',
        targetType: 'data',
        chartType: ChartType.BAR,
        isDrillable: true,
        parameterMapping: { country: 'country' },
      },
      {
        id: 'state',
        name: 'State View',
        targetType: 'data',
        chartType: ChartType.BAR,
        isDrillable: true,
        parameterMapping: { state: 'state' },
      },
      {
        id: 'city',
        name: 'City View',
        targetType: 'data',
        chartType: ChartType.TABLE,
        isDrillable: false,
      },
    ],
  };

  const getCurrentData = () => {
    const params = state?.parameters || {};

    switch (currentLevel) {
      case 0: // States
        return stateData[params.country] || [];
      case 1: // Cities
        return cityData[params.state] || [];
      default: // Countries
        return countryData;
    }
  };

  const getChartConfig = (): WidgetConfig => {
    const data = getCurrentData();
    const params = state?.parameters || {};

    const baseConfig = {
      x: 0,
      y: 0,
      width: 12,
      height: 6,
      dataSource: { type: 'static' as const, data },
      chartConfig: {
        type: ChartType.BAR,
        orientation: 'vertical' as const,
        interactivity: { clickable: currentLevel < 2 },
        drillDown: drillDownConfig,
      },
    };

    switch (currentLevel) {
      case 0:
        return {
          ...baseConfig,
          id: 'state-chart',
          type: ChartType.BAR,
          title: `States in ${params.country}`,
          dataMapping: { xField: 'state', yField: 'revenue' },
        };
      case 1:
        return {
          ...baseConfig,
          id: 'city-chart',
          type: ChartType.BAR,
          title: `Cities in ${params.state}, ${params.country}`,
          dataMapping: { xField: 'city', yField: 'revenue' },
        };
      default:
        return {
          ...baseConfig,
          id: 'country-chart',
          type: ChartType.BAR,
          title: 'Revenue by Country',
          dataMapping: { xField: 'country', yField: 'revenue' },
        };
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Geographic Drill-Down</h3>
        <p className="text-sm text-gray-600">
          Click bars to drill from Country → State → City
        </p>
      </div>

      <DrillDownBreadcrumb className="mb-4" />

      <div style={{ height: '400px' }}>
        <WidgetRenderer config={getChartConfig()} />
      </div>
    </div>
  );
};

/**
 * Main Examples Page
 */
export const DrillDownExamplesPage: React.FC = () => {
  return (
    <DrillDownProvider>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Multi-Level Drill-Down Examples
            </h1>
            <p className="text-gray-600">
              Interactive examples demonstrating context-aware drill-down navigation
            </p>
          </div>

          {/* Time-Series Example */}
          <div className="mb-8">
            <TimeSeriesDrillDown />
          </div>

          {/* Geographic Example */}
          <div className="mb-8">
            <GeographicDrillDown />
          </div>

          {/* Features List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Features Demonstrated</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">✅ Navigation</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Drill down by clicking data points</li>
                  <li>• Drill up via breadcrumb navigation</li>
                  <li>• Jump to any previous level</li>
                  <li>• Reset to initial view</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">✅ State Management</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• URL persistence (refresh-safe)</li>
                  <li>• localStorage backup</li>
                  <li>• Parameter passing between levels</li>
                  <li>• Filter accumulation</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">✅ Chart Integration</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Dynamic chart type switching</li>
                  <li>• Data transformation per level</li>
                  <li>• Automatic axis configuration</li>
                  <li>• Interactive tooltips</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">✅ Configuration</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Maximum depth limits</li>
                  <li>• Parameter mapping</li>
                  <li>• Filter rules</li>
                  <li>• Event callbacks</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DrillDownProvider>
  );
};

export default DrillDownExamplesPage;
