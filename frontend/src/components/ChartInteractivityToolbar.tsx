/**
 * Chart Interactivity Toolbar
 *
 * Provides UI controls for chart interactions:
 * - Zoom in/out/reset buttons
 * - Crosshair toggle
 * - Pan mode toggle
 * - Selection mode
 * - Keyboard shortcuts help
 */

import React, { useState } from 'react';
import { useChartInteractivity } from '../context/ChartInteractivity';

interface ChartInteractivityToolbarProps {
  position?: 'top' | 'bottom' | 'floating';
  showLabels?: boolean;
  compact?: boolean;
}

export const ChartInteractivityToolbar: React.FC<ChartInteractivityToolbarProps> = ({
  position = 'floating',
  showLabels = false,
  compact = false,
}) => {
  const {
    zoomIn,
    zoomOut,
    resetZoom,
    toggleCrosshair,
    clearSelection,
    state,
    config,
  } = useChartInteractivity();

  const [showHelp, setShowHelp] = useState(false);

  const buttonClass = `
    px-3 py-2 rounded-md transition-all duration-200
    bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
    hover:bg-gray-50 dark:hover:bg-gray-700
    active:bg-gray-100 dark:active:bg-gray-600
    disabled:opacity-50 disabled:cursor-not-allowed
    ${compact ? 'text-xs' : 'text-sm'}
  `;

  const activeButtonClass = `
    ${buttonClass}
    bg-blue-500 text-white border-blue-600
    hover:bg-blue-600 active:bg-blue-700
  `;

  const positionClasses = {
    top: 'w-full flex justify-center p-2 border-b border-gray-200 dark:border-gray-700',
    bottom: 'w-full flex justify-center p-2 border-t border-gray-200 dark:border-gray-700',
    floating: 'absolute top-4 right-4 z-10 shadow-lg rounded-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-2',
  };

  return (
    <div className={positionClasses[position]}>
      <div className={`flex items-center gap-2 ${compact ? 'flex-wrap' : 'space-x-1'}`}>
        {/* Zoom Controls */}
        {config.enableZoom && (
          <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            <button
              onClick={() => zoomIn()}
              className={buttonClass}
              title="Zoom In (+ key)"
              aria-label="Zoom in"
            >
              <span className="text-lg">🔍+</span>
              {showLabels && <span className="ml-1">Zoom In</span>}
            </button>
            <button
              onClick={() => zoomOut()}
              className={buttonClass}
              title="Zoom Out (- key)"
              aria-label="Zoom out"
            >
              <span className="text-lg">🔍−</span>
              {showLabels && <span className="ml-1">Zoom Out</span>}
            </button>
            <button
              onClick={() => resetZoom()}
              className={buttonClass}
              title="Reset Zoom (0 or R key)"
              aria-label="Reset zoom"
              disabled={state.zoom.x === 1 && state.zoom.y === 1}
            >
              <span className="text-lg">↺</span>
              {showLabels && <span className="ml-1">Reset</span>}
            </button>
          </div>
        )}

        {/* Crosshair */}
        {config.enableCrosshair && (
          <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            <button
              onClick={() => toggleCrosshair()}
              className={state.crosshair.enabled ? activeButtonClass : buttonClass}
              title="Toggle Crosshair (C key)"
              aria-label="Toggle crosshair"
              aria-pressed={state.crosshair.enabled}
            >
              <span className="text-lg">✛</span>
              {showLabels && <span className="ml-1">Crosshair</span>}
            </button>
          </div>
        )}

        {/* Pan Mode */}
        {config.enablePan && (
          <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            <button
              className={state.pan.enabled ? activeButtonClass : buttonClass}
              title="Pan mode (drag to move)"
              aria-label="Toggle pan mode"
              aria-pressed={state.pan.enabled}
            >
              <span className="text-lg">✋</span>
              {showLabels && <span className="ml-1">Pan</span>}
            </button>
          </div>
        )}

        {/* Selection */}
        {config.enableSelection && (
          <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            <button
              onClick={() => clearSelection()}
              className={buttonClass}
              title="Clear Selection (Esc key)"
              aria-label="Clear selection"
              disabled={state.selection.selectedPoints.length === 0}
            >
              <span className="text-lg">⊗</span>
              {showLabels && <span className="ml-1">Clear</span>}
            </button>
            {state.selection.selectedPoints.length > 0 && (
              <span className="text-xs text-gray-600 dark:text-gray-400 px-2">
                {state.selection.selectedPoints.length} selected
              </span>
            )}
          </div>
        )}

        {/* Zoom Level Indicator */}
        {config.enableZoom && state.zoom.x !== 1 && (
          <div className="flex items-center px-2 text-xs text-gray-600 dark:text-gray-400">
            {Math.round(state.zoom.x * 100)}%
          </div>
        )}

        {/* Help */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={buttonClass}
            title="Keyboard Shortcuts"
            aria-label="Show keyboard shortcuts"
            aria-expanded={showHelp}
          >
            <span className="text-lg">⌨️</span>
            {showLabels && <span className="ml-1">Help</span>}
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Help Panel */}
      {showHelp && (
        <div className="absolute top-full right-0 mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 min-w-64">
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Zoom In</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">+</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Zoom Out</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">-</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Reset Zoom</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">0 or R</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Toggle Crosshair</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">C</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Clear Selection</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Esc</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Mouse Wheel</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Zoom</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Drag</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Pan</span>
            </div>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            className="mt-3 w-full py-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Crosshair Overlay Component
 *
 * Renders crosshair lines over the chart
 */
interface CrosshairOverlayProps {
  width: number;
  height: number;
  color?: string;
}

export const CrosshairOverlay: React.FC<CrosshairOverlayProps> = ({
  width,
  height,
  color = '#3b82f6',
}) => {
  const { state } = useChartInteractivity();

  if (!state.crosshair.enabled || state.crosshair.x === null || state.crosshair.y === null) {
    return null;
  }

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none z-10"
      width={width}
      height={height}
      style={{ position: 'absolute' }}
    >
      {/* Vertical line */}
      <line
        x1={state.crosshair.x}
        y1={0}
        x2={state.crosshair.x}
        y2={height}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.6}
      />
      {/* Horizontal line */}
      <line
        x1={0}
        y1={state.crosshair.y}
        x2={width}
        y2={state.crosshair.y}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.6}
      />
      {/* Center dot */}
      <circle
        cx={state.crosshair.x}
        cy={state.crosshair.y}
        r={4}
        fill={color}
        opacity={0.8}
      />

      {/* Data point tooltip */}
      {state.crosshair.dataPoint && (
        <g>
          <rect
            x={state.crosshair.x + 10}
            y={state.crosshair.y - 30}
            width={120}
            height={50}
            fill="white"
            stroke={color}
            strokeWidth={1}
            rx={4}
            opacity={0.95}
          />
          <text
            x={state.crosshair.x + 20}
            y={state.crosshair.y - 12}
            fontSize={12}
            fill="#374151"
            fontWeight="600"
          >
            {state.crosshair.dataPoint.label || 'Data Point'}
          </text>
          <text
            x={state.crosshair.x + 20}
            y={state.crosshair.y + 4}
            fontSize={11}
            fill="#6b7280"
          >
            Value: {state.crosshair.dataPoint.value?.toFixed(2)}
          </text>
        </g>
      )}
    </svg>
  );
};

/**
 * Selection Box Component
 *
 * Renders selection rectangle during brush/range selection
 */
interface SelectionBoxProps {
  width: number;
  height: number;
  color?: string;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  width,
  height,
  color = '#3b82f6',
}) => {
  const { state } = useChartInteractivity();

  if (!state.selection.selectedRange) {
    return null;
  }

  const { x1, y1, x2, y2 } = state.selection.selectedRange;
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none z-10"
      width={width}
      height={height}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={color}
        fillOpacity={0.1}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="4 4"
      />
    </svg>
  );
};
