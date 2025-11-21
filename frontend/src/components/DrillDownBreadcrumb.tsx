/**
 * Drill-Down Breadcrumb Component
 *
 * Visual navigation for drill-down levels showing the current path
 * and allowing users to navigate back to previous levels.
 */

import React from 'react';
import { useDrillDown } from '../context/DrillDownContext';
import { DrillDownBreadcrumb as BreadcrumbType } from '../types/drilldown';

interface DrillDownBreadcrumbProps {
  className?: string;
  showHome?: boolean;
  homeLabel?: string;
  separator?: 'slash' | 'chevron' | 'arrow' | 'dot';
  maxVisible?: number;
  compact?: boolean;
}

export const DrillDownBreadcrumb: React.FC<DrillDownBreadcrumbProps> = ({
  className = '',
  showHome = true,
  homeLabel = 'Home',
  separator = 'chevron',
  maxVisible,
  compact = false,
}) => {
  const { getBreadcrumbs, navigateToLevel, reset, getCurrentLevel } = useDrillDown();

  const breadcrumbs = getBreadcrumbs();
  const currentLevel = getCurrentLevel();

  // Render separator
  const renderSeparator = () => {
    const baseClasses = 'mx-2 text-gray-400';

    switch (separator) {
      case 'slash':
        return <span className={baseClasses}>/</span>;
      case 'arrow':
        return <span className={baseClasses}>→</span>;
      case 'dot':
        return <span className={baseClasses}>•</span>;
      case 'chevron':
      default:
        return (
          <svg
            className={`w-4 h-4 ${baseClasses}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        );
    }
  };

  // Handle breadcrumb click
  const handleClick = (level: number) => {
    if (level === -1) {
      reset();
    } else {
      navigateToLevel(level);
    }
  };

  // Truncate breadcrumbs if maxVisible is set
  const visibleBreadcrumbs = React.useMemo(() => {
    if (!maxVisible || breadcrumbs.length <= maxVisible) {
      return breadcrumbs;
    }

    // Keep first and last items, add ellipsis for middle items
    const first = breadcrumbs.slice(0, 1);
    const last = breadcrumbs.slice(-maxVisible + 1);

    return [...first, { level: -999, name: '...', label: '...', parameters: {}, filters: [], canNavigateBack: false } as BreadcrumbType, ...last];
  }, [breadcrumbs, maxVisible]);

  if (breadcrumbs.length === 0 && !showHome) {
    return null;
  }

  return (
    <nav className={`flex items-center ${className}`} aria-label="Drill-down breadcrumb">
      <ol className="flex items-center space-x-0">
        {/* Home/Root level */}
        {showHome && (
          <li className="flex items-center">
            <button
              onClick={() => handleClick(-1)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                currentLevel === -1
                  ? 'text-blue-600 font-semibold bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
              }`}
              aria-current={currentLevel === -1 ? 'page' : undefined}
            >
              {!compact && (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              )}
              {!compact && <span>{homeLabel}</span>}
              {compact && <span>🏠</span>}
            </button>
            {breadcrumbs.length > 0 && renderSeparator()}
          </li>
        )}

        {/* Breadcrumb items */}
        {visibleBreadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isCurrent = breadcrumb.level === currentLevel;
          const isEllipsis = breadcrumb.level === -999;

          return (
            <li key={breadcrumb.level} className="flex items-center">
              {isEllipsis ? (
                <span className="px-3 py-2 text-gray-400">...</span>
              ) : (
                <button
                  onClick={() => handleClick(breadcrumb.level)}
                  disabled={!breadcrumb.canNavigateBack && !isLast}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    isCurrent
                      ? 'text-blue-600 font-semibold bg-blue-50'
                      : breadcrumb.canNavigateBack
                      ? 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                  aria-current={isCurrent ? 'page' : undefined}
                  title={
                    compact && breadcrumb.parameters
                      ? Object.entries(breadcrumb.parameters)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(', ')
                      : undefined
                  }
                >
                  {breadcrumb.label}
                  {!compact && breadcrumb.parameters && Object.keys(breadcrumb.parameters).length > 0 && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({Object.values(breadcrumb.parameters)[0]})
                    </span>
                  )}
                </button>
              )}
              {!isLast && renderSeparator()}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/**
 * Compact Breadcrumb with Dropdown
 *
 * Shows only current level with dropdown for navigation
 */
interface CompactBreadcrumbProps {
  className?: string;
}

export const CompactDrillDownBreadcrumb: React.FC<CompactBreadcrumbProps> = ({ className = '' }) => {
  const { getBreadcrumbs, navigateToLevel, reset, getCurrentLevel } = useDrillDown();
  const [isOpen, setIsOpen] = React.useState(false);

  const breadcrumbs = getBreadcrumbs();
  const currentLevel = getCurrentLevel();
  const currentBreadcrumb = breadcrumbs[currentLevel];

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
        <span className="font-medium text-gray-700">
          {currentBreadcrumb?.label || 'Home'}
        </span>
        <span className="text-xs text-gray-500">
          Level {currentLevel + 1}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              {/* Home */}
              <button
                onClick={() => {
                  reset();
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                <span className="font-medium text-gray-700">Home</span>
              </button>

              <div className="my-2 border-t border-gray-200" />

              {/* Levels */}
              {breadcrumbs.map((breadcrumb, index) => (
                <button
                  key={breadcrumb.level}
                  onClick={() => {
                    navigateToLevel(breadcrumb.level);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left ${
                    breadcrumb.level === currentLevel
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span>{breadcrumb.label}</span>
                  <span className="text-xs text-gray-500">
                    L{breadcrumb.level + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DrillDownBreadcrumb;
