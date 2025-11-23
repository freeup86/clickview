/**
 * useDebounce Hook
 *
 * Delays updating a value until after a specified delay has passed
 * since the last time the value changed. Useful for optimizing
 * expensive operations like API calls or complex calculations.
 */

import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useThrottle Hook
 *
 * Limits the rate at which a value can be updated. Unlike debounce,
 * throttle ensures the value is updated at regular intervals.
 */

export function useThrottle<T>(value: T, interval: number = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated;

    if (timeSinceLastUpdate >= interval) {
      setThrottledValue(value);
      setLastUpdated(now);
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        setLastUpdated(Date.now());
      }, interval - timeSinceLastUpdate);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [value, interval, lastUpdated]);

  return throttledValue;
}
