/**
 * Performance Optimization Hooks
 *
 * Provides utilities for virtualization, memoization, debouncing,
 * and performance monitoring.
 *
 * Part of VIZ-001 completion (remaining 10%)
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// ===================================================================
// VIRTUAL SCROLLING HOOK
// ===================================================================

export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  itemCount: number;
  overscan?: number; // Number of items to render outside visible area
}

export interface VirtualScrollResult {
  virtualItems: Array<{
    index: number;
    start: number;
    end: number;
  }>;
  totalHeight: number;
  scrollTop: number;
  setScrollTop: (scrollTop: number) => void;
}

export function useVirtualScroll(config: VirtualScrollConfig): VirtualScrollResult {
  const { itemHeight, containerHeight, itemCount, overscan = 3 } = config;
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = itemCount * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const virtualItems = useMemo(() => {
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight,
      });
    }
    return items;
  }, [startIndex, endIndex, itemHeight]);

  return {
    virtualItems,
    totalHeight,
    scrollTop,
    setScrollTop,
  };
}

// ===================================================================
// DEBOUNCE HOOK
// ===================================================================

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ===================================================================
// THROTTLE HOOK
// ===================================================================

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const lastRun = useRef(Date.now());

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      }
    },
    [callback, delay]
  );
}

// ===================================================================
// INTERSECTION OBSERVER HOOK (Lazy Loading)
// ===================================================================

export interface IntersectionConfig {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useIntersectionObserver(
  config: IntersectionConfig = {}
): [React.RefObject<HTMLElement>, boolean] {
  const { threshold = 0, rootMargin = '0px', triggerOnce = false } = config;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting;
        setIsIntersecting(isElementIntersecting);

        if (triggerOnce && isElementIntersecting) {
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isIntersecting];
}

// ===================================================================
// MEMOIZED COMPUTED VALUE HOOK
// ===================================================================

export function useMemoizedComputation<T>(
  computeFn: () => T,
  dependencies: React.DependencyList,
  cacheKey?: string
): T {
  // Use sessionStorage for cross-component cache
  const cachedValue = useMemo(() => {
    if (cacheKey) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached) as T;
        } catch {
          // Invalid cache, recompute
        }
      }
    }

    const result = computeFn();

    if (cacheKey) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(result));
      } catch {
        // Storage full or unavailable
      }
    }

    return result;
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return cachedValue;
}

// ===================================================================
// PERFORMANCE MONITORING HOOK
// ===================================================================

export interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  slowRenders: number; // Renders > 16ms (60fps threshold)
}

export function usePerformanceMonitor(componentName: string): PerformanceMetrics {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const slowRendersRef = useRef(0);
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTimeRef.current;

    renderCountRef.current += 1;
    renderTimesRef.current.push(renderTime);

    // Keep only last 100 renders
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current.shift();
    }

    if (renderTime > 16) {
      slowRendersRef.current += 1;
      console.warn(
        `[Performance] ${componentName} slow render: ${renderTime.toFixed(2)}ms`
      );
    }

    startTimeRef.current = performance.now();
  });

  const averageRenderTime =
    renderTimesRef.current.reduce((sum, time) => sum + time, 0) /
    Math.max(renderTimesRef.current.length, 1);

  return {
    renderCount: renderCountRef.current,
    lastRenderTime: renderTimesRef.current[renderTimesRef.current.length - 1] || 0,
    averageRenderTime,
    slowRenders: slowRendersRef.current,
  };
}

// ===================================================================
// IMAGE LAZY LOADING HOOK
// ===================================================================

export function useLazyImage(src: string, placeholder?: string): [string, boolean] {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [ref, isIntersecting] = useIntersectionObserver({ triggerOnce: true });

  useEffect(() => {
    if (!isIntersecting) return;

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };

    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
      setIsLoaded(false);
    };
  }, [src, isIntersecting]);

  return [imageSrc, isLoaded];
}

// ===================================================================
// BATCH UPDATE HOOK
// ===================================================================

export function useBatchUpdates<T>(delay: number = 50): {
  batch: T[];
  addToBatch: (item: T) => void;
  clearBatch: () => void;
} {
  const [batch, setBatch] = useState<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addToBatch = useCallback(
    (item: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setBatch((prev) => [...prev, item]);

      timeoutRef.current = setTimeout(() => {
        // Batch is ready for processing
        // Consumer can listen to batch changes
      }, delay);
    },
    [delay]
  );

  const clearBatch = useCallback(() => {
    setBatch([]);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { batch, addToBatch, clearBatch };
}

// ===================================================================
// WEB WORKER HOOK
// ===================================================================

export function useWebWorker<T, R>(
  workerFunction: (data: T) => R
): {
  result: R | null;
  error: Error | null;
  isLoading: boolean;
  execute: (data: T) => void;
} {
  const [result, setResult] = useState<R | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create worker blob
    const workerBlob = new Blob(
      [
        `
        self.onmessage = function(e) {
          const fn = ${workerFunction.toString()};
          try {
            const result = fn(e.data);
            self.postMessage({ result });
          } catch (error) {
            self.postMessage({ error: error.message });
          }
        };
      `,
      ],
      { type: 'application/javascript' }
    );

    workerRef.current = new Worker(URL.createObjectURL(workerBlob));

    return () => {
      workerRef.current?.terminate();
    };
  }, [workerFunction]);

  const execute = useCallback((data: T) => {
    if (!workerRef.current) return;

    setIsLoading(true);
    setError(null);

    workerRef.current.onmessage = (e: MessageEvent) => {
      if (e.data.error) {
        setError(new Error(e.data.error));
      } else {
        setResult(e.data.result);
      }
      setIsLoading(false);
    };

    workerRef.current.onerror = (e: ErrorEvent) => {
      setError(new Error(e.message));
      setIsLoading(false);
    };

    workerRef.current.postMessage(data);
  }, []);

  return { result, error, isLoading, execute };
}

// ===================================================================
// REQUEST ANIMATION FRAME HOOK
// ===================================================================

export function useAnimationFrame(callback: (deltaTime: number) => void, enabled: boolean = true) {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  useEffect(() => {
    if (!enabled) return;

    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callback(deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [callback, enabled]);
}

// ===================================================================
// MEMORY USAGE MONITOR
// ===================================================================

export function useMemoryMonitor(): {
  usedMemory: number; // MB
  totalMemory: number; // MB
  percentage: number;
} | null {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedMemory: number;
    totalMemory: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      // @ts-ignore - performance.memory is not standard
      if (performance.memory) {
        // @ts-ignore
        const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
        const usedMemory = usedJSHeapSize / 1048576; // Convert to MB
        const totalMemory = jsHeapSizeLimit / 1048576;
        const percentage = (usedMemory / totalMemory) * 100;

        setMemoryInfo({
          usedMemory: Math.round(usedMemory * 100) / 100,
          totalMemory: Math.round(totalMemory * 100) / 100,
          percentage: Math.round(percentage * 100) / 100,
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}
