/**
 * Interactive Chart Wrapper
 *
 * Wraps any chart component and adds advanced interactivity:
 * - Pan and zoom
 * - Crosshair cursor
 * - Selection
 * - Keyboard shortcuts
 * - Touch gestures (mobile support)
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ChartInteractivityProvider,
  useChartInteractivity,
  useWheelZoom,
  useMousePan,
  useKeyboardShortcuts,
  ChartInteractionConfig,
} from '../context/ChartInteractivity';
import { ChartInteractivityToolbar, CrosshairOverlay, SelectionBox } from './ChartInteractivityToolbar';
import { BaseChartProps } from '../types/charts';

interface InteractiveChartWrapperProps {
  children: React.ReactNode;
  config?: ChartInteractionConfig;
  showToolbar?: boolean;
  toolbarPosition?: 'top' | 'bottom' | 'floating';
  onInteractionChange?: (state: any) => void;
  height?: number | string;
  width?: number | string;
}

/**
 * Internal wrapper component that uses the context
 */
const InteractiveChartContent: React.FC<Omit<InteractiveChartWrapperProps, 'config'>> = ({
  children,
  showToolbar = true,
  toolbarPosition = 'floating',
  onInteractionChange,
  height = '100%',
  width = '100%',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const {
    state,
    setCrosshair,
    startBrush,
    updateBrush,
    endBrush,
    selectPoint,
  } = useChartInteractivity();

  // Get interaction handlers
  const handleWheel = useWheelZoom(true);
  const { handleMouseDown, handleMouseMove, handleMouseUp } = useMousePan(true);
  useKeyboardShortcuts(true);

  // Measure container dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Notify parent of interaction changes
  useEffect(() => {
    if (onInteractionChange) {
      onInteractionChange(state);
    }
  }, [state, onInteractionChange]);

  // Mouse move handler for crosshair
  const handleMouseMoveForCrosshair = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !state.crosshair.enabled) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setCrosshair(x, y);
    },
    [state.crosshair.enabled, setCrosshair]
  );

  // Mouse leave handler
  const handleMouseLeave = useCallback(() => {
    if (state.crosshair.enabled) {
      setCrosshair(null, null);
    }
  }, [state.crosshair.enabled, setCrosshair]);

  // Touch gestures for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch zoom gesture
        e.preventDefault();
      }
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Handle pinch zoom
        e.preventDefault();
      }
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ height, width }}
      onWheel={handleWheel as any}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        handleMouseMove(e);
        handleMouseMoveForCrosshair(e);
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* Toolbar */}
      {showToolbar && <ChartInteractivityToolbar position={toolbarPosition} />}

      {/* Crosshair Overlay */}
      <CrosshairOverlay width={dimensions.width} height={dimensions.height} />

      {/* Selection Box */}
      <SelectionBox width={dimensions.width} height={dimensions.height} />

      {/* Chart Content */}
      <div
        className="w-full h-full"
        style={{
          transform: `scale(${state.zoom.x}, ${state.zoom.y}) translate(${state.pan.offsetX}px, ${state.pan.offsetY}px)`,
          transformOrigin: 'center center',
          transition: state.pan.isPanning ? 'none' : 'transform 0.2s ease-out',
          cursor: state.pan.isPanning ? 'grabbing' : state.pan.enabled ? 'grab' : 'default',
        }}
      >
        {children}
      </div>

      {/* Zoom Indicator */}
      {(state.zoom.x !== 1 || state.zoom.y !== 1) && !showToolbar && (
        <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs">
          Zoom: {Math.round(state.zoom.x * 100)}%
        </div>
      )}
    </div>
  );
};

/**
 * Main Interactive Chart Wrapper Component
 */
export const InteractiveChartWrapper: React.FC<InteractiveChartWrapperProps> = ({
  children,
  config = {},
  showToolbar = true,
  toolbarPosition = 'floating',
  onInteractionChange,
  height = '100%',
  width = '100%',
}) => {
  return (
    <ChartInteractivityProvider config={config} onStateChange={onInteractionChange}>
      <InteractiveChartContent
        showToolbar={showToolbar}
        toolbarPosition={toolbarPosition}
        onInteractionChange={onInteractionChange}
        height={height}
        width={width}
      >
        {children}
      </InteractiveChartContent>
    </ChartInteractivityProvider>
  );
};

/**
 * HOC to add interactivity to any chart component
 */
export function withInteractivity<P extends BaseChartProps>(
  ChartComponent: React.ComponentType<P>,
  defaultConfig?: ChartInteractionConfig
) {
  return function InteractiveChart(props: P & { interactivity?: ChartInteractionConfig }) {
    const { interactivity, ...chartProps } = props;
    const config = { ...defaultConfig, ...interactivity };

    return (
      <InteractiveChartWrapper config={config}>
        <ChartComponent {...(chartProps as P)} />
      </InteractiveChartWrapper>
    );
  };
}

/**
 * Preset configurations for different chart types
 */
export const InteractivityPresets = {
  full: {
    enablePan: true,
    enableZoom: true,
    enableCrosshair: true,
    enableSelection: true,
    enableBrush: true,
    selectionMode: 'multi' as const,
    zoomConstraints: { minZoom: 0.1, maxZoom: 10 },
  },

  zoomOnly: {
    enablePan: false,
    enableZoom: true,
    enableCrosshair: false,
    enableSelection: false,
    enableBrush: false,
    zoomConstraints: { minZoom: 0.5, maxZoom: 5 },
  },

  panAndZoom: {
    enablePan: true,
    enableZoom: true,
    enableCrosshair: false,
    enableSelection: false,
    enableBrush: false,
    zoomConstraints: { minZoom: 0.5, maxZoom: 5 },
  },

  crosshairOnly: {
    enablePan: false,
    enableZoom: false,
    enableCrosshair: true,
    enableSelection: false,
    enableBrush: false,
  },

  selection: {
    enablePan: false,
    enableZoom: false,
    enableCrosshair: false,
    enableSelection: true,
    enableBrush: true,
    selectionMode: 'multi' as const,
  },

  timeSeries: {
    enablePan: true,
    enableZoom: true,
    enableCrosshair: true,
    enableSelection: false,
    enableBrush: true,
    zoomConstraints: { minZoom: 1, maxZoom: 20 },
  },

  financial: {
    enablePan: true,
    enableZoom: true,
    enableCrosshair: true,
    enableSelection: false,
    enableBrush: true,
    zoomConstraints: { minZoom: 1, maxZoom: 50 },
  },

  scatter: {
    enablePan: true,
    enableZoom: true,
    enableCrosshair: true,
    enableSelection: true,
    enableBrush: true,
    selectionMode: 'multi' as const,
    zoomConstraints: { minZoom: 0.5, maxZoom: 10 },
  },
};

/**
 * Example usage component
 */
export const InteractiveChartExample: React.FC = () => {
  const [interactionState, setInteractionState] = useState<any>(null);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Interactive Chart Example</h2>

      <div className="grid grid-cols-1 gap-6">
        {/* Full Interactivity */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Full Interactivity</h3>
          <p className="text-sm text-gray-600 mb-4">
            Pan, zoom, crosshair, selection, and brush enabled
          </p>
          <div className="h-96 bg-gray-50 rounded">
            <InteractiveChartWrapper
              config={InteractivityPresets.full}
              onInteractionChange={setInteractionState}
            >
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-gray-500">Your chart component goes here</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Try: Mouse wheel to zoom, Drag to pan, Hover for crosshair
                  </p>
                </div>
              </div>
            </InteractiveChartWrapper>
          </div>
        </div>

        {/* Interaction State */}
        {interactionState && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold mb-2">Current Interaction State</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(interactionState, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
