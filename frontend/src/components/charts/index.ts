/**
 * Chart Components Index & Registry
 *
 * Centralized export point for all chart components with registry system.
 */

import { ChartType, ChartRegistryEntry, ChartRegistry } from '../../types/charts';

// Basic Charts
export { LineChartComponent } from './LineChart';
export { BarChartComponent } from './BarChart';
export { PieChartComponent } from './PieChart';
export { AreaChartComponent } from './AreaChart';
export { ScatterChartComponent } from './ScatterChart';

// Advanced Charts
export { ComboChartComponent } from './ComboChart';
export { FunnelChartComponent } from './FunnelChart';
export { HeatmapChart } from './HeatmapChart';
export { TreemapChart } from './TreemapChart';
export { WaterfallChart } from './WaterfallChart';
export { GaugeChart } from './GaugeChart';
export { RadarChartComponent } from './RadarChart';
export { BoxPlotChart } from './BoxPlotChart';
export { ViolinChart } from './ViolinChart';
export { CandlestickChart } from './CandlestickChart';
export { GanttChart } from './GanttChart';
export { TimelineChart } from './TimelineChart';
export { SunburstChart } from './SunburstChart';
export { SankeyChart } from './SankeyChart';

// Re-export types for convenience
export type { BaseChartProps } from '../../types/charts';

/**
 * Chart Registry - maps chart types to components
 */
import { LineChartComponent } from './LineChart';
import { BarChartComponent } from './BarChart';
import { PieChartComponent } from './PieChart';
import { AreaChartComponent } from './AreaChart';
import { ScatterChartComponent } from './ScatterChart';
import { FunnelChartComponent } from './FunnelChart';
import { ComboChartComponent } from './ComboChart';
import { HeatmapChart } from './HeatmapChart';
import { TreemapChart } from './TreemapChart';
import { WaterfallChart } from './WaterfallChart';
import { GaugeChart } from './GaugeChart';
import { RadarChartComponent } from './RadarChart';
import { BoxPlotChart } from './BoxPlotChart';
import { ViolinChart } from './ViolinChart';
import { CandlestickChart } from './CandlestickChart';
import { GanttChart } from './GanttChart';
import { TimelineChart } from './TimelineChart';
import { SunburstChart } from './SunburstChart';
import { SankeyChart } from './SankeyChart';

export const CHART_REGISTRY: Partial<ChartRegistry> = {
  [ChartType.LINE]: {
    type: ChartType.LINE,
    name: 'Line Chart',
    description: 'Display trends over time',
    icon: '📈',
    category: 'basic',
    component: LineChartComponent,
    requiredFields: ['xField', 'yField'],
    optionalFields: ['seriesField'],
    defaultConfig: { type: ChartType.LINE },
  },
  [ChartType.BAR]: {
    type: ChartType.BAR,
    name: 'Bar Chart',
    description: 'Compare values across categories',
    icon: '📊',
    category: 'basic',
    component: BarChartComponent,
    requiredFields: ['xField', 'yField'],
    optionalFields: ['seriesField'],
    defaultConfig: { type: ChartType.BAR },
  },
  [ChartType.PIE]: {
    type: ChartType.PIE,
    name: 'Pie Chart',
    description: 'Show proportions',
    icon: '🥧',
    category: 'basic',
    component: PieChartComponent,
    requiredFields: ['categoryField', 'valueField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.PIE },
  },
  [ChartType.AREA]: {
    type: ChartType.AREA,
    name: 'Area Chart',
    description: 'Line chart with filled area',
    icon: '📊',
    category: 'basic',
    component: AreaChartComponent,
    requiredFields: ['xField', 'yField'],
    optionalFields: ['seriesField'],
    defaultConfig: { type: ChartType.AREA },
  },
  [ChartType.SCATTER]: {
    type: ChartType.SCATTER,
    name: 'Scatter Plot',
    description: 'Show correlation',
    icon: '⚬',
    category: 'statistical',
    component: ScatterChartComponent,
    requiredFields: ['xField', 'yField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.SCATTER },
  },
  [ChartType.FUNNEL]: {
    type: ChartType.FUNNEL,
    name: 'Funnel Chart',
    description: 'Process visualization',
    icon: '🔻',
    category: 'business',
    component: FunnelChartComponent,
    requiredFields: ['categoryField', 'valueField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.FUNNEL },
  },
  [ChartType.COMBO]: {
    type: ChartType.COMBO,
    name: 'Combo Chart',
    description: 'Multiple chart types',
    icon: '📊',
    category: 'advanced',
    component: ComboChartComponent,
    requiredFields: ['xField', 'yField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.COMBO },
  },
  [ChartType.HEATMAP]: {
    type: ChartType.HEATMAP,
    name: 'Heatmap',
    description: '2D color visualization',
    icon: '🔥',
    category: 'advanced',
    component: HeatmapChart,
    requiredFields: ['xField', 'yField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.HEATMAP },
  },
  [ChartType.TREEMAP]: {
    type: ChartType.TREEMAP,
    name: 'Treemap',
    description: 'Hierarchical rectangles',
    icon: '🗂️',
    category: 'advanced',
    component: TreemapChart,
    requiredFields: ['categoryField', 'valueField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.TREEMAP },
  },
  [ChartType.WATERFALL]: {
    type: ChartType.WATERFALL,
    name: 'Waterfall Chart',
    description: 'Cumulative values',
    icon: '💧',
    category: 'business',
    component: WaterfallChart,
    requiredFields: ['xField', 'yField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.WATERFALL },
  },
  [ChartType.GAUGE]: {
    type: ChartType.GAUGE,
    name: 'Gauge',
    description: 'Single value meter',
    icon: '🎯',
    category: 'business',
    component: GaugeChart,
    requiredFields: ['valueField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.GAUGE },
  },
  [ChartType.RADAR]: {
    type: ChartType.RADAR,
    name: 'Radar Chart',
    description: 'Multivariate data',
    icon: '🕸️',
    category: 'statistical',
    component: RadarChartComponent,
    requiredFields: ['categoryField', 'valueField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.RADAR },
  },
  [ChartType.BOX_PLOT]: {
    type: ChartType.BOX_PLOT,
    name: 'Box Plot',
    description: 'Statistical distribution',
    icon: '📦',
    category: 'statistical',
    component: BoxPlotChart,
    requiredFields: ['categoryField', 'valueField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.BOX_PLOT },
  },
  [ChartType.VIOLIN]: {
    type: ChartType.VIOLIN,
    name: 'Violin Plot',
    description: 'Distribution with density',
    icon: '🎻',
    category: 'statistical',
    component: ViolinChart,
    requiredFields: ['categoryField', 'valueField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.VIOLIN },
  },
  [ChartType.CANDLESTICK]: {
    type: ChartType.CANDLESTICK,
    name: 'Candlestick',
    description: 'Financial OHLC',
    icon: '📉',
    category: 'specialized',
    component: CandlestickChart,
    requiredFields: ['dateField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.CANDLESTICK },
  },
  [ChartType.GANTT]: {
    type: ChartType.GANTT,
    name: 'Gantt Chart',
    description: 'Project timeline',
    icon: '📅',
    category: 'specialized',
    component: GanttChart,
    requiredFields: ['taskField', 'startField', 'endField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.GANTT },
  },
  [ChartType.TIMELINE]: {
    type: ChartType.TIMELINE,
    name: 'Timeline',
    description: 'Event chronology',
    icon: '⏱️',
    category: 'specialized',
    component: TimelineChart,
    requiredFields: ['dateField', 'eventField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.TIMELINE },
  },
  [ChartType.SUNBURST]: {
    type: ChartType.SUNBURST,
    name: 'Sunburst',
    description: 'Hierarchical circles',
    icon: '☀️',
    category: 'advanced',
    component: SunburstChart,
    requiredFields: ['categoryField', 'valueField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.SUNBURST },
  },
  [ChartType.SANKEY]: {
    type: ChartType.SANKEY,
    name: 'Sankey Diagram',
    description: 'Flow visualization',
    icon: '🌊',
    category: 'specialized',
    component: SankeyChart,
    requiredFields: ['sourceField', 'targetField', 'valueField'],
    optionalFields: [],
    defaultConfig: { type: ChartType.SANKEY },
  },
};

/**
 * Get chart component by type
 */
export const getChartComponent = (type: ChartType) => {
  return CHART_REGISTRY[type]?.component;
};

/**
 * Get chart metadata by type
 */
export const getChartMetadata = (type: ChartType) => {
  return CHART_REGISTRY[type];
};

/**
 * Get all charts by category
 */
export const getChartsByCategory = (category: 'basic' | 'advanced' | 'statistical' | 'business' | 'specialized') => {
  return Object.values(CHART_REGISTRY).filter(
    (entry) => entry && entry.category === category
  );
};
