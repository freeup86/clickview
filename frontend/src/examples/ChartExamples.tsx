/**
 * Chart Examples
 *
 * Demonstrates usage of all chart components with sample data.
 * Use this as a reference for implementing charts in your dashboards.
 */

import React from 'react';
import { ChartType, ChartData, ChartConfig, WidgetConfig } from '../types/charts';
import { WidgetRenderer } from '../components/WidgetRenderer';
import { LIGHT_THEME, DARK_THEME, BUSINESS_THEME } from '../themes/defaultTheme';

/**
 * Sample data generators
 */
const generateTimeSeriesData = (points: number = 12): any[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return Array.from({ length: points }, (_, i) => ({
    month: months[i % 12],
    revenue: Math.floor(Math.random() * 50000) + 30000,
    expenses: Math.floor(Math.random() * 30000) + 20000,
    profit: Math.floor(Math.random() * 20000) + 10000,
  }));
};

const generateCategoryData = (): any[] => [
  { category: 'Electronics', sales: 45000, target: 50000 },
  { category: 'Clothing', sales: 32000, target: 30000 },
  { category: 'Food', sales: 28000, target: 25000 },
  { category: 'Books', sales: 15000, target: 18000 },
  { category: 'Toys', sales: 22000, target: 20000 },
];

const generateFunnelData = (): any[] => [
  { stage: 'Website Visits', value: 10000 },
  { stage: 'Product Views', value: 7500 },
  { stage: 'Add to Cart', value: 3200 },
  { stage: 'Checkout', value: 1800 },
  { stage: 'Purchase', value: 1200 },
];

const generateScatterData = (): any[] =>
  Array.from({ length: 50 }, () => ({
    age: Math.floor(Math.random() * 60) + 20,
    satisfaction: Math.floor(Math.random() * 100),
    spending: Math.floor(Math.random() * 5000) + 500,
  }));

/**
 * Example widget configurations
 */
export const ChartExamples = {
  /**
   * Line Chart Example
   */
  lineChart: (): WidgetConfig => ({
    id: 'example-line-1',
    type: ChartType.LINE,
    title: 'Revenue Trend',
    description: 'Monthly revenue over the past year',
    x: 0,
    y: 0,
    width: 6,
    height: 4,
    dataSource: {
      type: 'static',
      data: generateTimeSeriesData(),
    },
    dataMapping: {
      xField: 'month',
      yField: 'revenue',
    },
    chartConfig: {
      type: ChartType.LINE,
      title: 'Revenue Trend',
      xAxis: { label: 'Month' },
      yAxis: { label: 'Revenue ($)' },
      legend: { show: true, position: 'top' },
      tooltip: { enabled: true },
      animation: { enabled: true, duration: 1000 },
      interactivity: { hoverable: true, clickable: false },
    },
  }),

  /**
   * Bar Chart Example
   */
  barChart: (): WidgetConfig => ({
    id: 'example-bar-1',
    type: ChartType.BAR,
    title: 'Sales by Category',
    x: 6,
    y: 0,
    width: 6,
    height: 4,
    dataSource: {
      type: 'static',
      data: generateCategoryData(),
    },
    dataMapping: {
      xField: 'category',
      yField: ['sales', 'target'],
    },
    chartConfig: {
      type: ChartType.BAR,
      title: 'Sales vs Target',
      xAxis: { label: 'Category' },
      yAxis: { label: 'Amount ($)' },
      legend: { show: true, position: 'top' },
      tooltip: { enabled: true },
      orientation: 'vertical',
    },
  }),

  /**
   * Pie Chart Example
   */
  pieChart: (): WidgetConfig => ({
    id: 'example-pie-1',
    type: ChartType.PIE,
    title: 'Market Share',
    x: 0,
    y: 4,
    width: 4,
    height: 4,
    dataSource: {
      type: 'static',
      data: generateCategoryData(),
    },
    dataMapping: {
      categoryField: 'category',
      valueField: 'sales',
    },
    chartConfig: {
      type: ChartType.PIE,
      title: 'Market Share by Category',
      legend: { show: true, position: 'right' },
      tooltip: { enabled: true },
      showPercentages: true,
      showValues: true,
    },
  }),

  /**
   * Donut Chart Example
   */
  donutChart: (): WidgetConfig => ({
    id: 'example-donut-1',
    type: ChartType.DONUT,
    title: 'Revenue Distribution',
    x: 4,
    y: 4,
    width: 4,
    height: 4,
    dataSource: {
      type: 'static',
      data: generateCategoryData(),
    },
    dataMapping: {
      categoryField: 'category',
      valueField: 'sales',
    },
    chartConfig: {
      type: ChartType.DONUT,
      title: 'Revenue Distribution',
      legend: { show: true, position: 'bottom' },
      tooltip: { enabled: true },
      innerRadius: 60,
      showPercentages: true,
    },
  }),

  /**
   * Area Chart Example
   */
  areaChart: (): WidgetConfig => ({
    id: 'example-area-1',
    type: ChartType.AREA,
    title: 'Revenue, Expenses & Profit',
    x: 8,
    y: 4,
    width: 4,
    height: 4,
    dataSource: {
      type: 'static',
      data: generateTimeSeriesData(),
    },
    dataMapping: {
      xField: 'month',
      yField: ['revenue', 'expenses', 'profit'],
    },
    chartConfig: {
      type: ChartType.AREA,
      title: 'Financial Overview',
      xAxis: { label: 'Month' },
      yAxis: { label: 'Amount ($)' },
      legend: { show: true, position: 'top' },
      tooltip: { enabled: true },
      stacked: false,
    },
  }),

  /**
   * Stacked Area Chart Example
   */
  stackedAreaChart: (): WidgetConfig => ({
    id: 'example-stacked-area-1',
    type: ChartType.STACKED_AREA,
    title: 'Cumulative Financial Data',
    x: 0,
    y: 8,
    width: 6,
    height: 4,
    dataSource: {
      type: 'static',
      data: generateTimeSeriesData(),
    },
    dataMapping: {
      xField: 'month',
      yField: ['revenue', 'expenses', 'profit'],
    },
    chartConfig: {
      type: ChartType.STACKED_AREA,
      title: 'Stacked Financial Data',
      xAxis: { label: 'Month' },
      yAxis: { label: 'Amount ($)' },
      legend: { show: true, position: 'top' },
      stacked: true,
    },
  }),

  /**
   * Scatter Chart Example
   */
  scatterChart: (): WidgetConfig => ({
    id: 'example-scatter-1',
    type: ChartType.SCATTER,
    title: 'Customer Age vs Satisfaction',
    x: 6,
    y: 8,
    width: 6,
    height: 4,
    dataSource: {
      type: 'static',
      data: generateScatterData(),
    },
    dataMapping: {
      xField: 'age',
      yField: 'satisfaction',
    },
    chartConfig: {
      type: ChartType.SCATTER,
      title: 'Customer Analysis',
      xAxis: { label: 'Age' },
      yAxis: { label: 'Satisfaction Score' },
      tooltip: { enabled: true },
    },
  }),

  /**
   * Combo Chart Example (Line + Bar)
   */
  comboChart: (): WidgetConfig => ({
    id: 'example-combo-1',
    type: ChartType.COMBO,
    title: 'Revenue & Growth Rate',
    x: 0,
    y: 12,
    width: 6,
    height: 4,
    dataSource: {
      type: 'static',
      data: generateTimeSeriesData().map((d, i, arr) => ({
        ...d,
        growthRate: i > 0 ? ((d.revenue - arr[i - 1].revenue) / arr[i - 1].revenue) * 100 : 0,
      })),
    },
    dataMapping: {
      xField: 'month',
      yField: 'revenue',
    },
    chartConfig: {
      type: ChartType.COMBO,
      title: 'Revenue & Growth',
      xAxis: { label: 'Month' },
      yAxis: { label: 'Revenue ($)' },
      yAxis2: { label: 'Growth Rate (%)' },
      legend: { show: true, position: 'top' },
    },
  }),

  /**
   * Funnel Chart Example
   */
  funnelChart: (): WidgetConfig => ({
    id: 'example-funnel-1',
    type: ChartType.FUNNEL,
    title: 'Sales Conversion Funnel',
    x: 6,
    y: 12,
    width: 6,
    height: 4,
    dataSource: {
      type: 'static',
      data: generateFunnelData(),
    },
    dataMapping: {
      xField: 'stage',
      yField: 'value',
    },
    chartConfig: {
      type: ChartType.FUNNEL,
      title: 'Conversion Funnel',
      showValues: true,
      showPercentages: true,
      interactivity: { clickable: true },
    },
  }),
};

/**
 * Example Dashboard Component
 */
export const ChartExamplesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ClickView Chart Library
        </h1>
        <p className="text-gray-600 mb-8">
          Explore our comprehensive chart components with live examples
        </p>

        {/* Line Chart */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Line Chart</h2>
          <div className="bg-white rounded-lg shadow p-4" style={{ height: '400px' }}>
            <WidgetRenderer config={ChartExamples.lineChart()} />
          </div>
        </div>

        {/* Bar Chart */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Bar Chart</h2>
          <div className="bg-white rounded-lg shadow p-4" style={{ height: '400px' }}>
            <WidgetRenderer config={ChartExamples.barChart()} />
          </div>
        </div>

        {/* Grid of smaller charts */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Pie Chart</h2>
            <div className="bg-white rounded-lg shadow p-4" style={{ height: '350px' }}>
              <WidgetRenderer config={ChartExamples.pieChart()} />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Donut Chart</h2>
            <div className="bg-white rounded-lg shadow p-4" style={{ height: '350px' }}>
              <WidgetRenderer config={ChartExamples.donutChart()} />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Area Chart</h2>
            <div className="bg-white rounded-lg shadow p-4" style={{ height: '350px' }}>
              <WidgetRenderer config={ChartExamples.areaChart()} />
            </div>
          </div>
        </div>

        {/* Advanced Charts */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Scatter Chart</h2>
            <div className="bg-white rounded-lg shadow p-4" style={{ height: '400px' }}>
              <WidgetRenderer config={ChartExamples.scatterChart()} />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Funnel Chart</h2>
            <div className="bg-white rounded-lg shadow p-4" style={{ height: '400px' }}>
              <WidgetRenderer config={ChartExamples.funnelChart()} />
            </div>
          </div>
        </div>

        {/* Combo Chart */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Combo Chart (Multiple Types)</h2>
          <div className="bg-white rounded-lg shadow p-4" style={{ height: '400px' }}>
            <WidgetRenderer config={ChartExamples.comboChart()} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartExamplesPage;
