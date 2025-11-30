/**
 * Performance Monitoring Utilities
 *
 * Tools for monitoring and optimizing application performance
 */

import * as React from 'react';

/**
 * Measure the execution time of a function
 */
export function measurePerformance<T>(
  fn: () => T,
  label: string = 'Operation'
): T {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  }
  return fn();
}

/**
 * Measure async function execution time
 */
export async function measureAsyncPerformance<T>(
  fn: () => Promise<T>,
  label: string = 'Async Operation'
): Promise<T> {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  }
  return fn();
}

/**
 * Create a performance mark for Chrome DevTools
 */
export function mark(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure performance between two marks
 */
export function measure(
  name: string,
  startMark: string,
  endMark: string
): void {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
    } catch (error) {
      // Marks don't exist, ignore
    }
  }
}

/**
 * Clear performance marks
 */
export function clearMarks(name?: string): void {
  if (typeof performance !== 'undefined' && performance.clearMarks) {
    performance.clearMarks(name);
  }
}

/**
 * Memoization helper for expensive calculations
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getCacheKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = getCacheKey
      ? getCacheKey(...args)
      : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Batch multiple state updates to reduce re-renders
 */
export function batchUpdates(callback: () => void): void {
  // React 18+ automatically batches updates
  // This is kept for compatibility with older versions
  if (typeof (window as any).requestIdleCallback === 'function') {
    (window as any).requestIdleCallback(callback);
  } else {
    setTimeout(callback, 0);
  }
}

/**
 * Check if an object has changed (shallow comparison)
 */
export function hasChanged(
  prev: Record<string, any>,
  next: Record<string, any>
): boolean {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);

  if (prevKeys.length !== nextKeys.length) {
    return true;
  }

  return prevKeys.some((key) => prev[key] !== next[key]);
}

/**
 * Deep comparison for objects (useful for useMemo dependencies)
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;

  if (
    typeof obj1 !== 'object' ||
    obj1 === null ||
    typeof obj2 !== 'object' ||
    obj2 === null
  ) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

/**
 * Lazy load a component with error handling
 */
export function lazyLoadComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: React.ReactNode = null
) {
  const LazyComponent = React.lazy(importFn);

  return (props: React.ComponentProps<T>) =>
    React.createElement(
      React.Suspense,
      { fallback },
      React.createElement(LazyComponent, props)
    );
}
