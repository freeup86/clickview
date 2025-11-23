/**
 * Chart Interactivity Hook
 *
 * Provides advanced interaction features for charts including:
 * - Pan and zoom
 * - Crosshair cursor
 * - Data point selection
 * - Range selection
 * - Multi-touch gestures
 *
 * Part of VIZ-001 completion (remaining 10%)
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';

// ===================================================================
// PAN AND ZOOM HOOK
// ===================================================================

export interface PanZoomConfig {
  minZoom?: number;
  maxZoom?: number;
  enablePan?: boolean;
  enableZoom?: boolean;
  enableWheelZoom?: boolean;
  enablePinchZoom?: boolean;
  zoomSpeed?: number;
}

export interface PanZoomState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface PanZoomHandlers {
  onWheel: (event: React.WheelEvent) => void;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onTouchStart: (event: React.TouchEvent) => void;
  onTouchMove: (event: React.TouchEvent) => void;
  onTouchEnd: (event: React.TouchEvent) => void;
}

export function usePanZoom(config: PanZoomConfig = {}): [PanZoomState, PanZoomHandlers, { reset: () => void; setZoom: (zoom: number) => void }] {
  const {
    minZoom = 0.5,
    maxZoom = 10,
    enablePan = true,
    enableZoom = true,
    enableWheelZoom = true,
    enablePinchZoom = true,
    zoomSpeed = 0.1,
  } = config;

  const [state, setState] = useState<PanZoomState>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef<number | null>(null);

  // Wheel zoom handler
  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (!enableZoom || !enableWheelZoom) return;

      event.preventDefault();
      const delta = -event.deltaY * zoomSpeed * 0.01;

      setState((prev) => ({
        ...prev,
        zoom: Math.max(minZoom, Math.min(maxZoom, prev.zoom * (1 + delta))),
      }));
    },
    [enableZoom, enableWheelZoom, zoomSpeed, minZoom, maxZoom]
  );

  // Mouse pan handlers
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!enablePan) return;

      isPanning.current = true;
      lastMousePos.current = { x: event.clientX, y: event.clientY };
    },
    [enablePan]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!enablePan || !isPanning.current) return;

      const deltaX = event.clientX - lastMousePos.current.x;
      const deltaY = event.clientY - lastMousePos.current.y;

      setState((prev) => ({
        ...prev,
        panX: prev.panX + deltaX,
        panY: prev.panY + deltaY,
      }));

      lastMousePos.current = { x: event.clientX, y: event.clientY };
    },
    [enablePan]
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Touch handlers for pinch zoom
  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length === 2 && enablePinchZoom) {
        lastTouchDistance.current = getTouchDistance(event.touches);
      } else if (event.touches.length === 1 && enablePan) {
        isPanning.current = true;
        lastMousePos.current = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      }
    },
    [enablePan, enablePinchZoom]
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length === 2 && enablePinchZoom && lastTouchDistance.current) {
        const distance = getTouchDistance(event.touches);
        const scale = distance / lastTouchDistance.current;

        setState((prev) => ({
          ...prev,
          zoom: Math.max(minZoom, Math.min(maxZoom, prev.zoom * scale)),
        }));

        lastTouchDistance.current = distance;
      } else if (event.touches.length === 1 && enablePan && isPanning.current) {
        const deltaX = event.touches[0].clientX - lastMousePos.current.x;
        const deltaY = event.touches[0].clientY - lastMousePos.current.y;

        setState((prev) => ({
          ...prev,
          panX: prev.panX + deltaX,
          panY: prev.panY + deltaY,
        }));

        lastMousePos.current = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      }
    },
    [enablePan, enablePinchZoom, minZoom, maxZoom]
  );

  const handleTouchEnd = useCallback(() => {
    isPanning.current = false;
    lastTouchDistance.current = null;
  }, []);

  const reset = useCallback(() => {
    setState({ zoom: 1, panX: 0, panY: 0 });
  }, []);

  const setZoom = useCallback(
    (zoom: number) => {
      setState((prev) => ({
        ...prev,
        zoom: Math.max(minZoom, Math.min(maxZoom, zoom)),
      }));
    },
    [minZoom, maxZoom]
  );

  return [
    state,
    {
      onWheel: handleWheel,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    { reset, setZoom },
  ];
}

// ===================================================================
// CROSSHAIR CURSOR HOOK
// ===================================================================

export interface CrosshairConfig {
  showVertical?: boolean;
  showHorizontal?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDashArray?: string;
  showTooltip?: boolean;
}

export interface CrosshairState {
  x: number;
  y: number;
  visible: boolean;
  dataPoint?: any;
}

export function useCrosshair(config: CrosshairConfig = {}) {
  const {
    showVertical = true,
    showHorizontal = true,
    strokeColor = '#666',
    strokeWidth = 1,
    strokeDashArray = '3 3',
    showTooltip = true,
  } = config;

  const [crosshair, setCrosshair] = useState<CrosshairState>({
    x: 0,
    y: 0,
    visible: false,
  });

  const containerRef = useRef<HTMLElement | null>(null);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setCrosshair({
        x,
        y,
        visible: true,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setCrosshair((prev) => ({ ...prev, visible: false }));
  }, []);

  const updateDataPoint = useCallback((dataPoint: any) => {
    setCrosshair((prev) => ({ ...prev, dataPoint }));
  }, []);

  return {
    crosshair,
    containerRef,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
    },
    updateDataPoint,
    config: {
      showVertical,
      showHorizontal,
      strokeColor,
      strokeWidth,
      strokeDashArray,
      showTooltip,
    },
  };
}

// ===================================================================
// DATA POINT SELECTION HOOK
// ===================================================================

export interface DataPointSelectionConfig {
  mode?: 'single' | 'multiple';
  onSelectionChange?: (selected: any[]) => void;
}

export function useDataPointSelection(config: DataPointSelectionConfig = {}) {
  const { mode = 'single', onSelectionChange } = config;
  const [selectedPoints, setSelectedPoints] = useState<any[]>([]);

  const selectPoint = useCallback(
    (point: any) => {
      setSelectedPoints((prev) => {
        let newSelection: any[];

        if (mode === 'single') {
          newSelection = [point];
        } else {
          // Toggle selection in multiple mode
          const isSelected = prev.some((p) => JSON.stringify(p) === JSON.stringify(point));
          if (isSelected) {
            newSelection = prev.filter((p) => JSON.stringify(p) !== JSON.stringify(point));
          } else {
            newSelection = [...prev, point];
          }
        }

        onSelectionChange?.(newSelection);
        return newSelection;
      });
    },
    [mode, onSelectionChange]
  );

  const clearSelection = useCallback(() => {
    setSelectedPoints([]);
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  const isSelected = useCallback(
    (point: any) => {
      return selectedPoints.some((p) => JSON.stringify(p) === JSON.stringify(point));
    },
    [selectedPoints]
  );

  return {
    selectedPoints,
    selectPoint,
    clearSelection,
    isSelected,
  };
}

// ===================================================================
// RANGE SELECTION HOOK
// ===================================================================

export interface RangeSelectionConfig {
  axis?: 'x' | 'y' | 'both';
  onRangeSelect?: (range: { start: number; end: number; axis: 'x' | 'y' }) => void;
}

export interface RangeState {
  isSelecting: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function useRangeSelection(config: RangeSelectionConfig = {}) {
  const { axis = 'x', onRangeSelect } = config;
  const [range, setRange] = useState<RangeState>({
    isSelecting: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  });

  const containerRef = useRef<HTMLElement | null>(null);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setRange({
        isSelecting: true,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
      });
    },
    []
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!range.isSelecting || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setRange((prev) => ({
        ...prev,
        endX: axis === 'y' ? prev.startX : x,
        endY: axis === 'x' ? prev.startY : y,
      }));
    },
    [range.isSelecting, axis]
  );

  const handleMouseUp = useCallback(() => {
    if (range.isSelecting) {
      // Notify about selection
      if (axis === 'x' || axis === 'both') {
        onRangeSelect?.({
          start: Math.min(range.startX, range.endX),
          end: Math.max(range.startX, range.endX),
          axis: 'x',
        });
      }
      if (axis === 'y' || axis === 'both') {
        onRangeSelect?.({
          start: Math.min(range.startY, range.endY),
          end: Math.max(range.startY, range.endY),
          axis: 'y',
        });
      }

      setRange((prev) => ({ ...prev, isSelecting: false }));
    }
  }, [range, axis, onRangeSelect]);

  const clearRange = useCallback(() => {
    setRange({
      isSelecting: false,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
    });
  }, []);

  return {
    range,
    containerRef,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
    },
    clearRange,
  };
}

// ===================================================================
// COMBINED CHART INTERACTIVITY HOOK
// ===================================================================

export interface ChartInteractivityConfig {
  panZoom?: PanZoomConfig;
  crosshair?: CrosshairConfig;
  dataPointSelection?: DataPointSelectionConfig;
  rangeSelection?: RangeSelectionConfig;
}

export function useChartInteractivity(config: ChartInteractivityConfig = {}) {
  const panZoom = usePanZoom(config.panZoom);
  const crosshair = useCrosshair(config.crosshair);
  const dataPointSelection = useDataPointSelection(config.dataPointSelection);
  const rangeSelection = useRangeSelection(config.rangeSelection);

  return {
    panZoom,
    crosshair,
    dataPointSelection,
    rangeSelection,
  };
}

// ===================================================================
// CHART ANIMATION HOOK
// ===================================================================

export interface AnimationConfig {
  duration?: number;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  delay?: number;
}

export function useChartAnimation(config: AnimationConfig = {}) {
  const { duration = 1000, easing = 'easeInOut', delay = 0 } = config;
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const easingFunctions = {
    linear: (t: number) => t,
    easeIn: (t: number) => t * t,
    easeOut: (t: number) => t * (2 - t),
    easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  };

  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp + delay;
      }

      const elapsed = timestamp - startTimeRef.current;
      const rawProgress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFunctions[easing](rawProgress);

      setProgress(easedProgress);

      if (rawProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    },
    [duration, easing, delay]
  );

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  const reset = useCallback(() => {
    setProgress(0);
    startTimeRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [animate]);

  return { progress, reset };
}

// ===================================================================
// TOOLTIP POSITIONING HOOK
// ===================================================================

export interface TooltipPosition {
  x: number;
  y: number;
  alignment: 'left' | 'right' | 'center';
  verticalAlignment: 'top' | 'bottom';
}

export function useTooltipPosition(containerRef: React.RefObject<HTMLElement>) {
  const [position, setPosition] = useState<TooltipPosition>({
    x: 0,
    y: 0,
    alignment: 'right',
    verticalAlignment: 'top',
  });

  const updatePosition = useCallback(
    (mouseX: number, mouseY: number, tooltipWidth: number = 200, tooltipHeight: number = 100) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Determine horizontal alignment
      const absoluteX = containerRect.left + mouseX;
      const spaceOnRight = viewportWidth - absoluteX;
      const alignment = spaceOnRight < tooltipWidth ? 'left' : 'right';

      // Determine vertical alignment
      const absoluteY = containerRect.top + mouseY;
      const spaceBelow = viewportHeight - absoluteY;
      const verticalAlignment = spaceBelow < tooltipHeight ? 'top' : 'bottom';

      setPosition({
        x: mouseX,
        y: mouseY,
        alignment,
        verticalAlignment,
      });
    },
    [containerRef]
  );

  return { position, updatePosition };
}
