/**
 * Chart Interactivity System
 *
 * Provides advanced interaction capabilities for all chart types:
 * - Pan and zoom
 * - Crosshair cursor
 * - Data point selection
 * - Range selection with brush
 * - Keyboard navigation
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// ===================================================================
// TYPES
// ===================================================================

export interface ChartInteractionState {
  // Pan & Zoom
  zoom: {
    x: number;  // Zoom level for X axis (1 = 100%)
    y: number;  // Zoom level for Y axis
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  };

  // Crosshair
  crosshair: {
    enabled: boolean;
    x: number | null;
    y: number | null;
    dataPoint?: any;
  };

  // Selection
  selection: {
    mode: 'none' | 'single' | 'multi' | 'range';
    selectedPoints: any[];
    selectedRange?: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };
  };

  // Brush
  brush: {
    enabled: boolean;
    startX?: number;
    endX?: number;
  };

  // Panning
  pan: {
    enabled: boolean;
    isPanning: boolean;
    startX?: number;
    startY?: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface ChartInteractionConfig {
  enablePan?: boolean;
  enableZoom?: boolean;
  enableCrosshair?: boolean;
  enableSelection?: boolean;
  enableBrush?: boolean;
  selectionMode?: 'single' | 'multi' | 'range';
  zoomConstraints?: {
    minZoom?: number;
    maxZoom?: number;
  };
}

interface ChartInteractivityContextValue {
  state: ChartInteractionState;
  config: ChartInteractionConfig;

  // Actions
  setZoom: (x: number, y: number) => void;
  resetZoom: () => void;
  zoomIn: (factor?: number) => void;
  zoomOut: (factor?: number) => void;

  setCrosshair: (x: number | null, y: number | null, dataPoint?: any) => void;
  toggleCrosshair: () => void;

  selectPoint: (point: any) => void;
  selectPoints: (points: any[]) => void;
  clearSelection: () => void;

  startBrush: (x: number) => void;
  updateBrush: (x: number) => void;
  endBrush: () => void;

  startPan: (x: number, y: number) => void;
  updatePan: (x: number, y: number) => void;
  endPan: () => void;

  reset: () => void;
}

// ===================================================================
// CONTEXT
// ===================================================================

const ChartInteractivityContext = createContext<ChartInteractivityContextValue | undefined>(undefined);

export const useChartInteractivity = () => {
  const context = useContext(ChartInteractivityContext);
  if (!context) {
    throw new Error('useChartInteractivity must be used within ChartInteractivityProvider');
  }
  return context;
};

// ===================================================================
// PROVIDER
// ===================================================================

interface ChartInteractivityProviderProps {
  children: React.ReactNode;
  config?: ChartInteractionConfig;
  onStateChange?: (state: ChartInteractionState) => void;
}

export const ChartInteractivityProvider: React.FC<ChartInteractivityProviderProps> = ({
  children,
  config = {},
  onStateChange,
}) => {
  const defaultState: ChartInteractionState = {
    zoom: { x: 1, y: 1 },
    crosshair: { enabled: config.enableCrosshair ?? false, x: null, y: null },
    selection: { mode: config.selectionMode || 'none', selectedPoints: [] },
    brush: { enabled: config.enableBrush ?? false },
    pan: { enabled: config.enablePan ?? false, isPanning: false, offsetX: 0, offsetY: 0 },
  };

  const [state, setState] = useState<ChartInteractionState>(defaultState);

  // Notify parent of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  // Zoom actions
  const setZoom = useCallback((x: number, y: number) => {
    setState(prev => ({
      ...prev,
      zoom: {
        ...prev.zoom,
        x: Math.max(config.zoomConstraints?.minZoom || 0.1, Math.min(x, config.zoomConstraints?.maxZoom || 10)),
        y: Math.max(config.zoomConstraints?.minZoom || 0.1, Math.min(y, config.zoomConstraints?.maxZoom || 10)),
      },
    }));
  }, [config.zoomConstraints]);

  const resetZoom = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: { x: 1, y: 1 },
      pan: { ...prev.pan, offsetX: 0, offsetY: 0 },
    }));
  }, []);

  const zoomIn = useCallback((factor: number = 1.2) => {
    setState(prev => ({
      ...prev,
      zoom: {
        ...prev.zoom,
        x: Math.min(prev.zoom.x * factor, config.zoomConstraints?.maxZoom || 10),
        y: Math.min(prev.zoom.y * factor, config.zoomConstraints?.maxZoom || 10),
      },
    }));
  }, [config.zoomConstraints]);

  const zoomOut = useCallback((factor: number = 1.2) => {
    setState(prev => ({
      ...prev,
      zoom: {
        ...prev.zoom,
        x: Math.max(prev.zoom.x / factor, config.zoomConstraints?.minZoom || 0.1),
        y: Math.max(prev.zoom.y / factor, config.zoomConstraints?.minZoom || 0.1),
      },
    }));
  }, [config.zoomConstraints]);

  // Crosshair actions
  const setCrosshair = useCallback((x: number | null, y: number | null, dataPoint?: any) => {
    setState(prev => ({
      ...prev,
      crosshair: { ...prev.crosshair, x, y, dataPoint },
    }));
  }, []);

  const toggleCrosshair = useCallback(() => {
    setState(prev => ({
      ...prev,
      crosshair: { ...prev.crosshair, enabled: !prev.crosshair.enabled },
    }));
  }, []);

  // Selection actions
  const selectPoint = useCallback((point: any) => {
    setState(prev => {
      const mode = prev.selection.mode;
      if (mode === 'single') {
        return { ...prev, selection: { ...prev.selection, selectedPoints: [point] } };
      } else if (mode === 'multi') {
        const exists = prev.selection.selectedPoints.some(p => p.id === point.id);
        return {
          ...prev,
          selection: {
            ...prev.selection,
            selectedPoints: exists
              ? prev.selection.selectedPoints.filter(p => p.id !== point.id)
              : [...prev.selection.selectedPoints, point],
          },
        };
      }
      return prev;
    });
  }, []);

  const selectPoints = useCallback((points: any[]) => {
    setState(prev => ({
      ...prev,
      selection: { ...prev.selection, selectedPoints: points },
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selection: { ...prev.selection, selectedPoints: [], selectedRange: undefined },
    }));
  }, []);

  // Brush actions
  const startBrush = useCallback((x: number) => {
    setState(prev => ({
      ...prev,
      brush: { ...prev.brush, startX: x, endX: x },
    }));
  }, []);

  const updateBrush = useCallback((x: number) => {
    setState(prev => ({
      ...prev,
      brush: { ...prev.brush, endX: x },
    }));
  }, []);

  const endBrush = useCallback(() => {
    setState(prev => {
      if (prev.brush.startX !== undefined && prev.brush.endX !== undefined) {
        return {
          ...prev,
          zoom: {
            ...prev.zoom,
            minX: Math.min(prev.brush.startX, prev.brush.endX),
            maxX: Math.max(prev.brush.startX, prev.brush.endX),
          },
          brush: { enabled: prev.brush.enabled, startX: undefined, endX: undefined },
        };
      }
      return prev;
    });
  }, []);

  // Pan actions
  const startPan = useCallback((x: number, y: number) => {
    setState(prev => ({
      ...prev,
      pan: { ...prev.pan, isPanning: true, startX: x, startY: y },
    }));
  }, []);

  const updatePan = useCallback((x: number, y: number) => {
    setState(prev => {
      if (prev.pan.isPanning && prev.pan.startX !== undefined && prev.pan.startY !== undefined) {
        return {
          ...prev,
          pan: {
            ...prev.pan,
            offsetX: prev.pan.offsetX + (x - prev.pan.startX),
            offsetY: prev.pan.offsetY + (y - prev.pan.startY),
            startX: x,
            startY: y,
          },
        };
      }
      return prev;
    });
  }, []);

  const endPan = useCallback(() => {
    setState(prev => ({
      ...prev,
      pan: { ...prev.pan, isPanning: false, startX: undefined, startY: undefined },
    }));
  }, []);

  // Reset all
  const reset = useCallback(() => {
    setState(defaultState);
  }, [defaultState]);

  const value: ChartInteractivityContextValue = {
    state,
    config,
    setZoom,
    resetZoom,
    zoomIn,
    zoomOut,
    setCrosshair,
    toggleCrosshair,
    selectPoint,
    selectPoints,
    clearSelection,
    startBrush,
    updateBrush,
    endBrush,
    startPan,
    updatePan,
    endPan,
    reset,
  };

  return (
    <ChartInteractivityContext.Provider value={value}>
      {children}
    </ChartInteractivityContext.Provider>
  );
};

// ===================================================================
// HOOKS
// ===================================================================

/**
 * Hook for handling mouse wheel zoom
 */
export const useWheelZoom = (enabled: boolean = true) => {
  const { setZoom, state } = useChartInteractivity();

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!enabled) return;

      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(state.zoom.x * delta, state.zoom.y * delta);
    },
    [enabled, setZoom, state.zoom]
  );

  return handleWheel;
};

/**
 * Hook for handling mouse pan
 */
export const useMousePan = (enabled: boolean = true) => {
  const { startPan, updatePan, endPan, state } = useChartInteractivity();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !state.pan.enabled) return;
      startPan(e.clientX, e.clientY);
    },
    [enabled, startPan, state.pan.enabled]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !state.pan.isPanning) return;
      updatePan(e.clientX, e.clientY);
    },
    [enabled, updatePan, state.pan.isPanning]
  );

  const handleMouseUp = useCallback(() => {
    if (!enabled) return;
    endPan();
  }, [enabled, endPan]);

  return { handleMouseDown, handleMouseMove, handleMouseUp };
};

/**
 * Hook for keyboard shortcuts
 */
export const useKeyboardShortcuts = (enabled: boolean = true) => {
  const { zoomIn, zoomOut, resetZoom, toggleCrosshair, clearSelection } = useChartInteractivity();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom: + / -
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      }
      // Reset: 0 or R
      else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetZoom();
      }
      // Crosshair: C
      else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        toggleCrosshair();
      }
      // Clear selection: Escape
      else if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, zoomIn, zoomOut, resetZoom, toggleCrosshair, clearSelection]);
};
