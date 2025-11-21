/**
 * Higher-Order Component for Drill-Down
 *
 * Wraps chart components with drill-down functionality.
 * Handles click events, parameter extraction, and navigation.
 */

import React, { useCallback } from 'react';
import { useDrillDown } from '../context/DrillDownContext';
import { ChartEvent } from '../types/charts';
import { DrillDownLevel, DrillDownConfig } from '../types/drilldown';
import { extractParameters } from '../utils/drillDownManager';

interface WithDrillDownOptions {
  config: DrillDownConfig;
  widgetId: string;
}

/**
 * HOC that adds drill-down capability to any chart component
 */
export function withDrillDown<P extends { onEvent?: (event: ChartEvent) => void }>(
  WrappedComponent: React.ComponentType<P>,
  options: WithDrillDownOptions
) {
  return function DrillDownEnhancedComponent(props: P) {
    const { drillDown, setConfig, getParameters, getCurrentLevel } = useDrillDown();
    const { config, widgetId } = options;

    // Set configuration on mount
    React.useEffect(() => {
      setConfig(config);
    }, [config, setConfig]);

    // Handle chart click events
    const handleDrillDownEvent = useCallback(
      (event: ChartEvent) => {
        // Call original onEvent if provided
        if (props.onEvent) {
          props.onEvent(event);
        }

        // Only handle click events for drill-down
        if (event.type !== 'click' || !config.enabled) {
          return;
        }

        const currentLevel = getCurrentLevel();
        const nextLevelIndex = currentLevel + 1;

        // Check if we can drill down
        if (nextLevelIndex >= config.levels.length) {
          console.warn('No more drill-down levels available');
          return;
        }

        const nextLevel = config.levels[nextLevelIndex];

        // Extract parameters from clicked data point
        const parameters = extractParameters(
          event.data,
          nextLevel.parameterMapping || {}
        );

        // Drill down to next level
        drillDown(nextLevel, parameters);
      },
      [config, drillDown, getCurrentLevel, props]
    );

    return <WrappedComponent {...props} onEvent={handleDrillDownEvent} />;
  };
}

/**
 * Hook for using drill-down in functional components
 */
export const useDrillDownHandler = (
  config: DrillDownConfig,
  widgetId: string
) => {
  const { drillDown, setConfig, getCurrentLevel } = useDrillDown();

  // Set configuration on mount
  React.useEffect(() => {
    setConfig(config);
  }, [config, setConfig]);

  // Create drill-down handler
  const handleDrillDown = useCallback(
    (dataPoint: any) => {
      if (!config.enabled) return;

      const currentLevel = getCurrentLevel();
      const nextLevelIndex = currentLevel + 1;

      if (nextLevelIndex >= config.levels.length) {
        console.warn('No more drill-down levels available');
        return;
      }

      const nextLevel = config.levels[nextLevelIndex];

      // Extract parameters
      const parameters = extractParameters(
        dataPoint,
        nextLevel.parameterMapping || {}
      );

      // Drill down
      drillDown(nextLevel, parameters);
    },
    [config, drillDown, getCurrentLevel]
  );

  return handleDrillDown;
};

export default withDrillDown;
