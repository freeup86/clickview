/**
 * Chart Accessibility Utilities
 *
 * Comprehensive accessibility support for WCAG 2.1 AA compliance:
 * - ARIA labels and descriptions
 * - Keyboard navigation
 * - Screen reader announcements
 * - High contrast mode
 * - Focus management
 */

import { ChartType } from '../types/charts';

// ===================================================================
// ARIA LABEL GENERATION
// ===================================================================

/**
 * Generate descriptive ARIA label for chart
 */
export function generateChartAriaLabel(
  chartType: ChartType,
  title?: string,
  dataPointCount?: number
): string {
  const chartTypeNames: Record<ChartType, string> = {
    [ChartType.LINE]: 'line chart',
    [ChartType.BAR]: 'bar chart',
    [ChartType.COLUMN]: 'column chart',
    [ChartType.PIE]: 'pie chart',
    [ChartType.DONUT]: 'donut chart',
    [ChartType.AREA]: 'area chart',
    [ChartType.SCATTER]: 'scatter plot',
    [ChartType.STACKED_BAR]: 'stacked bar chart',
    [ChartType.STACKED_AREA]: 'stacked area chart',
    [ChartType.GROUPED_BAR]: 'grouped bar chart',
    [ChartType.COMBO]: 'combination chart',
    [ChartType.DUAL_AXIS]: 'dual axis chart',
    [ChartType.BOX_PLOT]: 'box plot',
    [ChartType.VIOLIN]: 'violin plot',
    [ChartType.HISTOGRAM]: 'histogram',
    [ChartType.FUNNEL]: 'funnel chart',
    [ChartType.WATERFALL]: 'waterfall chart',
    [ChartType.BULLET]: 'bullet chart',
    [ChartType.GAUGE]: 'gauge chart',
    [ChartType.HEATMAP]: 'heatmap',
    [ChartType.TREEMAP]: 'treemap',
    [ChartType.SUNBURST]: 'sunburst chart',
    [ChartType.SANKEY]: 'sankey diagram',
    [ChartType.CANDLESTICK]: 'candlestick chart',
    [ChartType.RADAR]: 'radar chart',
    [ChartType.POLAR]: 'polar chart',
    [ChartType.TIMELINE]: 'timeline',
    [ChartType.GANTT]: 'gantt chart',
    [ChartType.METRIC]: 'metric card',
    [ChartType.KPI_CARD]: 'KPI card',
    [ChartType.TABLE]: 'data table',
    [ChartType.PIVOT_TABLE]: 'pivot table',
    [ChartType.MAP]: 'map',
    [ChartType.CHOROPLETH]: 'choropleth map',
  };

  const chartName = chartTypeNames[chartType] || 'chart';
  const titlePart = title ? `${title}, ` : '';
  const dataPart = dataPointCount ? ` with ${dataPointCount} data points` : '';

  return `${titlePart}${chartName}${dataPart}`;
}

/**
 * Generate description for data point
 */
export function generateDataPointDescription(
  dataPoint: any,
  seriesName?: string,
  valueFormat?: (value: number) => string
): string {
  const format = valueFormat || ((v: number) => v.toLocaleString());

  const parts: string[] = [];

  if (seriesName) {
    parts.push(seriesName);
  }

  if (dataPoint.name || dataPoint.x) {
    parts.push(dataPoint.name || dataPoint.x);
  }

  if (dataPoint.y !== undefined) {
    parts.push(`value ${format(dataPoint.y)}`);
  } else if (dataPoint.value !== undefined) {
    parts.push(`value ${format(dataPoint.value)}`);
  }

  return parts.join(', ');
}

/**
 * Generate summary statistics for screen readers
 */
export function generateChartSummary(data: {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  total?: number;
  count?: number;
}): string {
  const parts: string[] = [];

  if (data.count !== undefined) {
    parts.push(`${data.count} data points`);
  }

  if (data.min !== undefined && data.max !== undefined) {
    parts.push(`ranging from ${data.min.toLocaleString()} to ${data.max.toLocaleString()}`);
  }

  if (data.mean !== undefined) {
    parts.push(`with an average of ${data.mean.toLocaleString()}`);
  }

  if (data.median !== undefined) {
    parts.push(`and a median of ${data.median.toLocaleString()}`);
  }

  if (data.total !== undefined) {
    parts.push(`totaling ${data.total.toLocaleString()}`);
  }

  return parts.join(', ');
}

// ===================================================================
// KEYBOARD NAVIGATION
// ===================================================================

export interface KeyboardNavigationConfig {
  enabled: boolean;
  focusOnMount?: boolean;
  announceChanges?: boolean;
  dataPointSelector?: string;
}

/**
 * Keyboard navigation handler for charts
 */
export class ChartKeyboardNavigator {
  private container: HTMLElement;
  private config: Required<KeyboardNavigationConfig>;
  private currentIndex: number = -1;
  private dataPoints: HTMLElement[] = [];
  private announcer?: HTMLElement;

  constructor(container: HTMLElement, config: KeyboardNavigationConfig = { enabled: true }) {
    this.container = container;
    this.config = {
      enabled: config.enabled,
      focusOnMount: config.focusOnMount ?? false,
      announceChanges: config.announceChanges ?? true,
      dataPointSelector: config.dataPointSelector || '[data-point-index]',
    };

    this.initialize();
  }

  private initialize() {
    if (!this.config.enabled) return;

    // Make container focusable
    if (!this.container.hasAttribute('tabindex')) {
      this.container.setAttribute('tabindex', '0');
    }

    // Add ARIA role
    this.container.setAttribute('role', 'img');

    // Create live region for announcements
    if (this.config.announceChanges) {
      this.announcer = this.createLiveRegion();
    }

    // Find all data points
    this.updateDataPoints();

    // Add event listeners
    this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.container.addEventListener('focus', this.handleFocus.bind(this));

    if (this.config.focusOnMount) {
      this.container.focus();
    }
  }

  private createLiveRegion(): HTMLElement {
    const existing = document.getElementById('chart-announcer');
    if (existing) return existing;

    const announcer = document.createElement('div');
    announcer.id = 'chart-announcer';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';
    document.body.appendChild(announcer);
    return announcer;
  }

  private updateDataPoints() {
    this.dataPoints = Array.from(
      this.container.querySelectorAll(this.config.dataPointSelector)
    ) as HTMLElement[];
  }

  private handleFocus() {
    if (this.currentIndex === -1 && this.dataPoints.length > 0) {
      this.selectDataPoint(0);
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    const actions: Record<string, () => void> = {
      ArrowRight: () => this.navigate(1),
      ArrowLeft: () => this.navigate(-1),
      ArrowUp: () => this.navigate(-1),
      ArrowDown: () => this.navigate(1),
      Home: () => this.selectDataPoint(0),
      End: () => this.selectDataPoint(this.dataPoints.length - 1),
      Enter: () => this.activateDataPoint(),
      Space: () => this.activateDataPoint(),
    };

    const action = actions[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  }

  private navigate(direction: number) {
    if (this.dataPoints.length === 0) return;

    const newIndex = Math.max(
      0,
      Math.min(this.dataPoints.length - 1, this.currentIndex + direction)
    );

    this.selectDataPoint(newIndex);
  }

  private selectDataPoint(index: number) {
    if (index < 0 || index >= this.dataPoints.length) return;

    // Remove previous selection
    if (this.currentIndex >= 0 && this.dataPoints[this.currentIndex]) {
      this.dataPoints[this.currentIndex].classList.remove('keyboard-focused');
      this.dataPoints[this.currentIndex].setAttribute('aria-selected', 'false');
    }

    // Add new selection
    this.currentIndex = index;
    const dataPoint = this.dataPoints[index];
    dataPoint.classList.add('keyboard-focused');
    dataPoint.setAttribute('aria-selected', 'true');

    // Announce to screen readers
    if (this.announcer) {
      const description = dataPoint.getAttribute('aria-label') || dataPoint.textContent || '';
      this.announcer.textContent = description;
    }

    // Scroll into view if needed
    dataPoint.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  private activateDataPoint() {
    if (this.currentIndex >= 0 && this.dataPoints[this.currentIndex]) {
      const dataPoint = this.dataPoints[this.currentIndex];
      dataPoint.click();
    }
  }

  public destroy() {
    this.container.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.container.removeEventListener('focus', this.handleFocus.bind(this));
  }
}

// ===================================================================
// HIGH CONTRAST MODE
// ===================================================================

/**
 * Detect if high contrast mode is enabled
 */
export function isHighContrastMode(): boolean {
  // Check Windows high contrast mode
  if (window.matchMedia) {
    const highContrast = window.matchMedia('(-ms-high-contrast: active)');
    if (highContrast.matches) return true;

    // Check for forced colors (modern browsers)
    const forcedColors = window.matchMedia('(forced-colors: active)');
    if (forcedColors.matches) return true;

    // Check for prefers-contrast
    const prefersContrast = window.matchMedia('(prefers-contrast: more)');
    if (prefersContrast.matches) return true;
  }

  return false;
}

/**
 * Get high contrast color scheme
 */
export function getHighContrastColors() {
  return {
    background: '#000000',
    foreground: '#FFFFFF',
    primary: '#00FF00',
    secondary: '#00FFFF',
    tertiary: '#FFFF00',
    quaternary: '#FF00FF',
    accent: '#FF0000',
    border: '#FFFFFF',
    text: '#FFFFFF',
    gridLines: '#808080',
  };
}

/**
 * Apply high contrast styles to chart
 */
export function applyHighContrastMode(element: HTMLElement) {
  const colors = getHighContrastColors();

  element.style.setProperty('--chart-bg', colors.background);
  element.style.setProperty('--chart-fg', colors.foreground);
  element.style.setProperty('--chart-primary', colors.primary);
  element.style.setProperty('--chart-border', colors.border);
  element.style.setProperty('--chart-text', colors.text);
  element.style.setProperty('--chart-grid', colors.gridLines);

  element.classList.add('high-contrast-mode');
}

// ===================================================================
// FOCUS MANAGEMENT
// ===================================================================

/**
 * Focus trap for modal dialogs
 */
export class FocusTrap {
  private element: HTMLElement;
  private previouslyFocused: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];

  constructor(element: HTMLElement) {
    this.element = element;
    this.activate();
  }

  private activate() {
    this.previouslyFocused = document.activeElement as HTMLElement;
    this.updateFocusableElements();
    this.element.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Focus first element
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }
  }

  private updateFocusableElements() {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    this.focusableElements = Array.from(
      this.element.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  public deactivate() {
    this.element.removeEventListener('keydown', this.handleKeyDown.bind(this));
    if (this.previouslyFocused) {
      this.previouslyFocused.focus();
    }
  }
}

// ===================================================================
// SCREEN READER UTILITIES
// ===================================================================

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcer = document.createElement('div');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.style.position = 'absolute';
  announcer.style.left = '-10000px';
  announcer.textContent = message;

  document.body.appendChild(announcer);

  setTimeout(() => {
    document.body.removeChild(announcer);
  }, 1000);
}

/**
 * Create accessible data table from chart data
 */
export function createAccessibleDataTable(data: {
  headers: string[];
  rows: (string | number)[][];
  caption?: string;
}): string {
  const { headers, rows, caption } = data;

  let html = '<table role="table" class="sr-only">';

  if (caption) {
    html += `<caption>${caption}</caption>`;
  }

  html += '<thead><tr>';
  headers.forEach((header) => {
    html += `<th scope="col">${header}</th>`;
  });
  html += '</tr></thead><tbody>';

  rows.forEach((row) => {
    html += '<tr>';
    row.forEach((cell, index) => {
      html += index === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';

  return html;
}

// ===================================================================
// WCAG COMPLIANCE CHECKS
// ===================================================================

/**
 * Check color contrast ratio
 */
export function checkColorContrast(
  foreground: string,
  background: string
): { ratio: number; passesAA: boolean; passesAAA: boolean } {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance
    const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return {
    ratio,
    passesAA: ratio >= 4.5, // WCAG AA for normal text
    passesAAA: ratio >= 7, // WCAG AAA for normal text
  };
}

/**
 * Ensure minimum touch target size (44x44px for WCAG 2.1 Level AA)
 */
export function ensureMinimumTouchTarget(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const minSize = 44;

  if (rect.width < minSize || rect.height < minSize) {
    element.style.minWidth = `${minSize}px`;
    element.style.minHeight = `${minSize}px`;
    element.style.padding = '8px';
  }
}
