/**
 * Accessibility Hook
 *
 * Provides accessibility utilities for keyboard navigation,
 * ARIA labels, and screen reader support.
 *
 * Part of VIZ-001 completion (remaining 10%)
 */

import { useEffect, useCallback, useRef } from 'react';

// ===================================================================
// KEYBOARD NAVIGATION HOOK
// ===================================================================

export interface KeyboardNavigationConfig {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onTab?: () => void;
  onSpace?: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation(config: KeyboardNavigationConfig) {
  const { enabled = true, ...handlers } = config;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, shiftKey } = event;

      switch (key) {
        case 'ArrowUp':
          if (handlers.onArrowUp) {
            event.preventDefault();
            handlers.onArrowUp();
          }
          break;

        case 'ArrowDown':
          if (handlers.onArrowDown) {
            event.preventDefault();
            handlers.onArrowDown();
          }
          break;

        case 'ArrowLeft':
          if (handlers.onArrowLeft) {
            event.preventDefault();
            handlers.onArrowLeft();
          }
          break;

        case 'ArrowRight':
          if (handlers.onArrowRight) {
            event.preventDefault();
            handlers.onArrowRight();
          }
          break;

        case 'Enter':
          if (handlers.onEnter) {
            event.preventDefault();
            handlers.onEnter();
          }
          break;

        case 'Escape':
          if (handlers.onEscape) {
            event.preventDefault();
            handlers.onEscape();
          }
          break;

        case 'Tab':
          if (handlers.onTab && !shiftKey) {
            event.preventDefault();
            handlers.onTab();
          }
          break;

        case ' ':
        case 'Spacebar': // For older browsers
          if (handlers.onSpace) {
            event.preventDefault();
            handlers.onSpace();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handlers]);
}

// ===================================================================
// FOCUS MANAGEMENT HOOK
// ===================================================================

export interface FocusManagementConfig {
  trapFocus?: boolean;
  returnFocusOnUnmount?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
}

export function useFocusManagement(config: FocusManagementConfig = {}) {
  const { trapFocus = false, returnFocusOnUnmount = true, initialFocusRef } = config;
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Save current focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Set initial focus
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    }

    return () => {
      // Return focus on unmount
      if (returnFocusOnUnmount && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    if (!trapFocus || !containerRef.current) return;

    const handleFocusTrap = (event: FocusEvent) => {
      if (!containerRef.current) return;

      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey && document.activeElement === firstElement) {
        lastElement?.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        firstElement?.focus();
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleFocusTrap as any);

    return () => {
      document.removeEventListener('keydown', handleFocusTrap as any);
    };
  }, [trapFocus]);

  return containerRef;
}

// ===================================================================
// ARIA ANNOUNCER HOOK
// ===================================================================

export interface AnnouncerConfig {
  politeness?: 'polite' | 'assertive';
  clearAfter?: number; // milliseconds
}

export function useAnnouncer(config: AnnouncerConfig = {}) {
  const { politeness = 'polite', clearAfter = 5000 } = config;
  const announcerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create announcer element if it doesn't exist
    if (!announcerRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', politeness);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    }

    return () => {
      if (announcerRef.current) {
        document.body.removeChild(announcerRef.current);
        announcerRef.current = null;
      }
    };
  }, [politeness]);

  const announce = useCallback(
    (message: string) => {
      if (!announcerRef.current) return;

      announcerRef.current.textContent = message;

      if (clearAfter > 0) {
        setTimeout(() => {
          if (announcerRef.current) {
            announcerRef.current.textContent = '';
          }
        }, clearAfter);
      }
    },
    [clearAfter]
  );

  return announce;
}

// ===================================================================
// SKIP LINK HOOK
// ===================================================================

export function useSkipLink(targetId: string, label: string = 'Skip to main content') {
  useEffect(() => {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = label;
    skipLink.className = 'skip-link';
    skipLink.style.position = 'absolute';
    skipLink.style.top = '-40px';
    skipLink.style.left = '0';
    skipLink.style.background = '#000';
    skipLink.style.color = '#fff';
    skipLink.style.padding = '8px';
    skipLink.style.zIndex = '100';
    skipLink.style.transition = 'top 0.3s';

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '0';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);

    return () => {
      if (skipLink.parentNode) {
        skipLink.parentNode.removeChild(skipLink);
      }
    };
  }, [targetId, label]);
}

// ===================================================================
// ARIA LABEL GENERATOR
// ===================================================================

export function generateAriaLabel(context: string, details?: Record<string, any>): string {
  let label = context;

  if (details) {
    const detailParts = Object.entries(details)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${key}: ${value}`);

    if (detailParts.length > 0) {
      label += `. ${detailParts.join(', ')}`;
    }
  }

  return label;
}

// ===================================================================
// ACCESSIBLE CHART DESCRIPTION
// ===================================================================

export interface ChartAccessibilityData {
  type: string;
  title: string;
  description?: string;
  data: Array<{
    label: string;
    value: number | string;
  }>;
  summary?: string;
}

export function generateChartDescription(data: ChartAccessibilityData): string {
  const { type, title, description, data: chartData, summary } = data;

  let desc = `${type} chart titled "${title}".`;

  if (description) {
    desc += ` ${description}.`;
  }

  desc += ` The chart contains ${chartData.length} data points.`;

  // Add data summary
  chartData.forEach((point, index) => {
    if (index < 5) { // Limit to first 5 points
      desc += ` ${point.label}: ${point.value}.`;
    }
  });

  if (chartData.length > 5) {
    desc += ` And ${chartData.length - 5} more data points.`;
  }

  if (summary) {
    desc += ` ${summary}`;
  }

  return desc;
}

// ===================================================================
// REDUCED MOTION DETECTION
// ===================================================================

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

// Fix React import
import React from 'react';
