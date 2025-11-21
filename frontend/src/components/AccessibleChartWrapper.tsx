/**
 * Accessible Chart Wrapper
 *
 * Wraps charts with comprehensive accessibility features:
 * - ARIA labels and descriptions
 * - Keyboard navigation
 * - Screen reader support
 * - High contrast mode
 * - Focus management
 * - Data table alternative
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  generateChartAriaLabel,
  generateChartSummary,
  ChartKeyboardNavigator,
  isHighContrastMode,
  applyHighContrastMode,
  createAccessibleDataTable,
  announceToScreenReader,
} from '../utils/chartAccessibility';
import { ChartType, BaseChartProps } from '../types/charts';

interface AccessibleChartWrapperProps {
  children: React.ReactNode;
  chartType: ChartType;
  title?: string;
  description?: string;
  data?: any[];
  enableKeyboardNav?: boolean;
  enableDataTable?: boolean;
  onDataPointFocus?: (dataPoint: any, index: number) => void;
}

export const AccessibleChartWrapper: React.FC<AccessibleChartWrapperProps> = ({
  children,
  chartType,
  title,
  description,
  data = [],
  enableKeyboardNav = true,
  enableDataTable = true,
  onDataPointFocus,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showDataTable, setShowDataTable] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const navigatorRef = useRef<ChartKeyboardNavigator | null>(null);

  // Check for high contrast mode
  useEffect(() => {
    const checkHighContrast = () => {
      const isHighContrast = isHighContrastMode();
      setHighContrast(isHighContrast);

      if (isHighContrast && containerRef.current) {
        applyHighContrastMode(containerRef.current);
      }
    };

    checkHighContrast();

    // Listen for changes
    const mediaQueries = [
      window.matchMedia('(forced-colors: active)'),
      window.matchMedia('(prefers-contrast: more)'),
    ];

    mediaQueries.forEach((mq) => {
      mq.addEventListener('change', checkHighContrast);
    });

    return () => {
      mediaQueries.forEach((mq) => {
        mq.removeEventListener('change', checkHighContrast);
      });
    };
  }, []);

  // Initialize keyboard navigation
  useEffect(() => {
    if (!containerRef.current || !enableKeyboardNav) return;

    navigatorRef.current = new ChartKeyboardNavigator(containerRef.current, {
      enabled: true,
      announceChanges: true,
    });

    return () => {
      navigatorRef.current?.destroy();
    };
  }, [enableKeyboardNav]);

  // Calculate summary statistics
  const summary = React.useMemo(() => {
    if (!data || data.length === 0) return '';

    const values = data.map((d) => d.y || d.value || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const total = values.reduce((sum, v) => sum + v, 0);
    const mean = total / values.length;

    return generateChartSummary({
      count: data.length,
      min,
      max,
      mean,
      total,
    });
  }, [data]);

  // Generate ARIA label
  const ariaLabel = generateChartAriaLabel(chartType, title, data.length);

  // Generate data table
  const dataTableHtml = React.useMemo(() => {
    if (!enableDataTable || !data || data.length === 0) return '';

    const headers = ['Category', 'Value'];
    const rows = data.map((d) => [d.name || d.x || 'Data point', d.y || d.value || 0]);

    return createAccessibleDataTable({
      headers,
      rows,
      caption: title || 'Chart data',
    });
  }, [data, title, enableDataTable]);

  const toggleDataTable = useCallback(() => {
    setShowDataTable((prev) => {
      const newState = !prev;
      announceToScreenReader(
        newState ? 'Data table shown' : 'Data table hidden',
        'polite'
      );
      return newState;
    });
  }, []);

  return (
    <div className="accessible-chart-wrapper">
      {/* Skip to data table link */}
      {enableDataTable && (
        <div className="sr-only-focusable">
          <button
            onClick={toggleDataTable}
            className="skip-link px-4 py-2 bg-blue-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {showDataTable ? 'Hide' : 'View'} data table
          </button>
        </div>
      )}

      {/* Chart container */}
      <div
        ref={containerRef}
        className="chart-container relative"
        role="img"
        aria-label={ariaLabel}
        aria-describedby={description ? 'chart-description' : undefined}
        tabIndex={0}
      >
        {/* Hidden description */}
        {description && (
          <div id="chart-description" className="sr-only">
            {description}
          </div>
        )}

        {/* Hidden summary */}
        {summary && (
          <div className="sr-only" aria-live="polite">
            {summary}
          </div>
        )}

        {/* High contrast indicator */}
        {highContrast && (
          <div className="sr-only" role="status">
            High contrast mode is active
          </div>
        )}

        {/* Chart content */}
        {children}

        {/* Keyboard navigation hint */}
        {enableKeyboardNav && (
          <div className="sr-only">
            Use arrow keys to navigate through data points. Press Enter to activate.
          </div>
        )}
      </div>

      {/* Accessible data table */}
      {enableDataTable && showDataTable && (
        <div className="data-table-container mt-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Data Table
            </h3>
            <button
              onClick={toggleDataTable}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              aria-label="Hide data table"
            >
              Hide
            </button>
          </div>
          <div
            className="overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: dataTableHtml }}
          />
        </div>
      )}

      {/* CSS for accessibility */}
      <style jsx>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        .sr-only-focusable {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 50;
        }

        .sr-only-focusable button:not(:focus) {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        .skip-link:focus {
          position: static;
          width: auto;
          height: auto;
          padding: 0.5rem 1rem;
          margin: 0.5rem;
          overflow: visible;
          clip: auto;
          white-space: normal;
        }

        .keyboard-focused {
          outline: 3px solid #3b82f6;
          outline-offset: 2px;
          z-index: 10;
        }

        .high-contrast-mode {
          forced-color-adjust: none;
          background-color: var(--chart-bg);
          color: var(--chart-fg);
        }

        .high-contrast-mode * {
          border-color: var(--chart-border) !important;
          color: var(--chart-text) !important;
        }

        .data-table-container table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table-container th,
        .data-table-container td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .data-table-container th {
          font-weight: 600;
          background-color: #f9fafb;
          color: #111827;
        }

        .dark .data-table-container th {
          background-color: #374151;
          color: #f9fafb;
        }

        .data-table-container tbody tr:hover {
          background-color: #f3f4f6;
        }

        .dark .data-table-container tbody tr:hover {
          background-color: #4b5563;
        }

        /* Focus styles */
        *:focus-visible {
          outline: 3px solid #3b82f6;
          outline-offset: 2px;
        }

        /* Minimum touch target size (44x44px) */
        button,
        a,
        [role="button"],
        [tabindex]:not([tabindex="-1"]) {
          min-width: 44px;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
};

/**
 * HOC to add accessibility to any chart component
 */
export function withAccessibility<P extends BaseChartProps>(
  ChartComponent: React.ComponentType<P>,
  chartType: ChartType
) {
  return function AccessibleChart(
    props: P & {
      title?: string;
      description?: string;
      enableKeyboardNav?: boolean;
      enableDataTable?: boolean;
    }
  ) {
    const { title, description, enableKeyboardNav, enableDataTable, data, ...chartProps } = props;

    return (
      <AccessibleChartWrapper
        chartType={chartType}
        title={title}
        description={description}
        data={data?.series?.[0]?.data || []}
        enableKeyboardNav={enableKeyboardNav}
        enableDataTable={enableDataTable}
      >
        <ChartComponent {...(chartProps as P)} />
      </AccessibleChartWrapper>
    );
  };
}

/**
 * Accessibility control panel
 */
export const AccessibilityControls: React.FC<{
  onToggleHighContrast?: () => void;
  onToggleKeyboardNav?: () => void;
  onToggleDataTable?: () => void;
}> = ({ onToggleHighContrast, onToggleKeyboardNav, onToggleDataTable }) => {
  return (
    <div className="accessibility-controls flex items-center space-x-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Accessibility Options:
      </h3>

      {onToggleHighContrast && (
        <button
          onClick={onToggleHighContrast}
          className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle high contrast mode"
        >
          High Contrast
        </button>
      )}

      {onToggleKeyboardNav && (
        <button
          onClick={onToggleKeyboardNav}
          className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle keyboard navigation"
        >
          Keyboard Nav
        </button>
      )}

      {onToggleDataTable && (
        <button
          onClick={onToggleDataTable}
          className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle data table view"
        >
          Data Table
        </button>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
        WCAG 2.1 AA Compliant
      </div>
    </div>
  );
};
