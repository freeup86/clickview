/**
 * Drill-Down Context Provider
 *
 * Global state management for multi-level drill-down functionality.
 * Handles navigation, state persistence, and cross-widget drilling.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  DrillDownState,
  DrillDownBreadcrumb,
  DrillDownAction,
  DrillDownLevel,
  DrillDownFilter,
  DrillDownConfig,
} from '../types/drilldown';

interface DrillDownContextValue {
  // Current drill-down state
  state: DrillDownState | null;

  // Actions
  drillDown: (level: DrillDownLevel, parameters: Record<string, any>) => void;
  drillUp: () => void;
  navigateToLevel: (levelIndex: number) => void;
  reset: () => void;

  // State queries
  getCurrentLevel: () => number;
  canDrillDown: () => boolean;
  canDrillUp: () => boolean;
  getBreadcrumbs: () => DrillDownBreadcrumb[];
  getParameters: () => Record<string, any>;
  getFilters: () => DrillDownFilter[];

  // Configuration
  setConfig: (config: DrillDownConfig) => void;
  config: DrillDownConfig | null;
}

const DrillDownContext = createContext<DrillDownContextValue | undefined>(undefined);

interface DrillDownProviderProps {
  children: React.ReactNode;
  persistInUrl?: boolean;
  persistInStorage?: boolean;
  storageKey?: string;
}

export const DrillDownProvider: React.FC<DrillDownProviderProps> = ({
  children,
  persistInUrl = true,
  persistInStorage = true,
  storageKey = 'drilldown-state',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [state, setState] = useState<DrillDownState | null>(null);
  const [config, setConfig] = useState<DrillDownConfig | null>(null);

  // Load state from URL or localStorage on mount
  useEffect(() => {
    // Try URL first
    if (persistInUrl) {
      const drillState = searchParams.get('drill');
      if (drillState) {
        try {
          const parsed = JSON.parse(decodeURIComponent(drillState));
          setState(parsed);
          return;
        } catch (error) {
          console.error('Failed to parse drill-down state from URL:', error);
        }
      }
    }

    // Try localStorage
    if (persistInStorage) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setState(parsed);
        } catch (error) {
          console.error('Failed to parse drill-down state from storage:', error);
        }
      }
    }
  }, [persistInUrl, persistInStorage, storageKey, searchParams]);

  // Persist state changes
  useEffect(() => {
    if (!state) return;

    // Persist to URL
    if (persistInUrl && config?.preserveInUrl !== false) {
      const params = new URLSearchParams(searchParams);
      params.set('drill', encodeURIComponent(JSON.stringify(state)));
      setSearchParams(params, { replace: true });
    }

    // Persist to localStorage
    if (persistInStorage && config?.preserveInStorage !== false) {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [state, persistInUrl, persistInStorage, storageKey, config, searchParams, setSearchParams]);

  /**
   * Drill down to next level
   */
  const drillDown = useCallback(
    (level: DrillDownLevel, parameters: Record<string, any>) => {
      setState((prevState) => {
        const currentLevel = prevState?.currentLevel ?? -1;
        const newLevel = currentLevel + 1;

        // Check max depth
        if (config?.maxDepth && newLevel >= config.maxDepth) {
          console.warn('Maximum drill-down depth reached');
          return prevState;
        }

        // Build filters from parameters
        const filters: DrillDownFilter[] = level.filters || [];
        Object.entries(parameters).forEach(([key, value]) => {
          filters.push({
            field: key,
            operator: 'equals',
            value,
            source: 'parameter',
          });
        });

        // Create breadcrumb
        const breadcrumb: DrillDownBreadcrumb = {
          level: newLevel,
          name: level.name,
          label: level.name,
          parameters,
          filters,
          canNavigateBack: true,
        };

        const newState: DrillDownState = {
          levels: [...(prevState?.levels || []), breadcrumb],
          currentLevel: newLevel,
          parameters: {
            ...(prevState?.parameters || {}),
            ...parameters,
          },
          filters: [...(prevState?.filters || []), ...filters],
          timestamp: new Date(),
        };

        // Trigger callback
        if (config?.onDrillDown) {
          config.onDrillDown(newState);
        }

        return newState;
      });
    },
    [config]
  );

  /**
   * Drill up one level
   */
  const drillUp = useCallback(() => {
    setState((prevState) => {
      if (!prevState || prevState.currentLevel <= 0) {
        return prevState;
      }

      const newLevels = prevState.levels.slice(0, -1);
      const newLevel = prevState.currentLevel - 1;

      // Rebuild parameters and filters from remaining levels
      const parameters: Record<string, any> = {};
      const filters: DrillDownFilter[] = [];

      newLevels.forEach((breadcrumb) => {
        Object.assign(parameters, breadcrumb.parameters);
        filters.push(...breadcrumb.filters);
      });

      const newState: DrillDownState = {
        levels: newLevels,
        currentLevel: newLevel,
        parameters,
        filters,
        timestamp: new Date(),
      };

      // Trigger callback
      if (config?.onDrillUp) {
        config.onDrillUp(newState);
      }

      return newState;
    });
  }, [config]);

  /**
   * Navigate to specific level
   */
  const navigateToLevel = useCallback(
    (levelIndex: number) => {
      setState((prevState) => {
        if (!prevState || levelIndex < 0 || levelIndex >= prevState.levels.length) {
          return prevState;
        }

        const newLevels = prevState.levels.slice(0, levelIndex + 1);

        // Rebuild parameters and filters
        const parameters: Record<string, any> = {};
        const filters: DrillDownFilter[] = [];

        newLevels.forEach((breadcrumb) => {
          Object.assign(parameters, breadcrumb.parameters);
          filters.push(...breadcrumb.filters);
        });

        const newState: DrillDownState = {
          levels: newLevels,
          currentLevel: levelIndex,
          parameters,
          filters,
          timestamp: new Date(),
        };

        return newState;
      });
    },
    []
  );

  /**
   * Reset drill-down state
   */
  const reset = useCallback(() => {
    setState(null);

    // Clear from URL
    if (persistInUrl) {
      const params = new URLSearchParams(searchParams);
      params.delete('drill');
      setSearchParams(params, { replace: true });
    }

    // Clear from localStorage
    if (persistInStorage) {
      localStorage.removeItem(storageKey);
    }

    // Trigger callback
    if (config?.onReset) {
      config.onReset();
    }
  }, [persistInUrl, persistInStorage, storageKey, config, searchParams, setSearchParams]);

  /**
   * Get current level index
   */
  const getCurrentLevel = useCallback(() => {
    return state?.currentLevel ?? -1;
  }, [state]);

  /**
   * Check if can drill down
   */
  const canDrillDown = useCallback(() => {
    if (!state) return true;
    if (config?.maxDepth && state.currentLevel >= config.maxDepth - 1) {
      return false;
    }
    return true;
  }, [state, config]);

  /**
   * Check if can drill up
   */
  const canDrillUp = useCallback(() => {
    return state !== null && state.currentLevel > 0;
  }, [state]);

  /**
   * Get breadcrumbs
   */
  const getBreadcrumbs = useCallback(() => {
    return state?.levels || [];
  }, [state]);

  /**
   * Get current parameters
   */
  const getParameters = useCallback(() => {
    return state?.parameters || {};
  }, [state]);

  /**
   * Get current filters
   */
  const getFilters = useCallback(() => {
    return state?.filters || [];
  }, [state]);

  const value: DrillDownContextValue = {
    state,
    drillDown,
    drillUp,
    navigateToLevel,
    reset,
    getCurrentLevel,
    canDrillDown,
    canDrillUp,
    getBreadcrumbs,
    getParameters,
    getFilters,
    setConfig,
    config,
  };

  return (
    <DrillDownContext.Provider value={value}>
      {children}
    </DrillDownContext.Provider>
  );
};

/**
 * Hook to access drill-down context
 */
export const useDrillDown = (): DrillDownContextValue => {
  const context = useContext(DrillDownContext);
  if (!context) {
    throw new Error('useDrillDown must be used within DrillDownProvider');
  }
  return context;
};

export default DrillDownContext;
