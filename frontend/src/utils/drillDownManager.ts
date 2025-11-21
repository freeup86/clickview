/**
 * Drill-Down Manager
 *
 * Utilities for managing drill-down paths, suggestions, and analytics.
 * Provides smart suggestions based on data context and user behavior.
 */

import {
  DrillDownLevel,
  DrillDownPath,
  DrillDownContext,
  DrillDownSuggestion,
  DrillDownTemplate,
  DrillDownFilter,
  DrillDownState,
} from '../types/drilldown';
import { ChartType } from '../types/charts';

/**
 * Drill-down path builder
 */
export class DrillDownPathBuilder {
  private levels: DrillDownLevel[] = [];
  private currentLevel: number = -1;

  /**
   * Add a drill-down level
   */
  addLevel(level: Partial<DrillDownLevel>): this {
    this.currentLevel++;

    const fullLevel: DrillDownLevel = {
      id: level.id || `level-${this.currentLevel}`,
      name: level.name || `Level ${this.currentLevel + 1}`,
      description: level.description,
      targetType: level.targetType || 'data',
      targetId: level.targetId,
      targetUrl: level.targetUrl,
      dataSource: level.dataSource,
      chartType: level.chartType,
      chartConfig: level.chartConfig,
      parameterMapping: level.parameterMapping || {},
      filters: level.filters || [],
      isDrillable: level.isDrillable !== undefined ? level.isDrillable : true,
      nextLevel: level.nextLevel,
    };

    this.levels.push(fullLevel);
    return this;
  }

  /**
   * Build the drill-down path
   */
  build(): DrillDownPath {
    return {
      id: `path-${Date.now()}`,
      name: `Drill Path`,
      levels: this.levels,
      priority: 100,
    };
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.levels = [];
    this.currentLevel = -1;
    return this;
  }
}

/**
 * Drill-down suggestions engine
 */
export class DrillDownSuggestionsEngine {
  /**
   * Get suggestions for next drill-down level
   */
  static getSuggestions(
    context: DrillDownContext,
    availablePaths: DrillDownPath[]
  ): DrillDownSuggestion[] {
    const suggestions: DrillDownSuggestion[] = [];

    // Filter applicable paths
    const applicablePaths = availablePaths.filter((path) => {
      if (!path.applicableWhen) return true;

      const { chartTypes, dataFields } = path.applicableWhen;

      // Check chart type
      if (chartTypes && !chartTypes.includes(context.sourceChartType)) {
        return false;
      }

      // Check data fields
      if (dataFields) {
        const pointKeys = Object.keys(context.dataPoint);
        const hasRequiredFields = dataFields.every((field) =>
          pointKeys.includes(field)
        );
        if (!hasRequiredFields) return false;
      }

      return true;
    });

    // Generate suggestions from applicable paths
    applicablePaths.forEach((path) => {
      const nextLevelIndex = context.currentState.currentLevel + 1;

      if (nextLevelIndex < path.levels.length) {
        const nextLevel = path.levels[nextLevelIndex];

        suggestions.push({
          level: nextLevel,
          confidence: this.calculateConfidence(context, nextLevel, path),
          reason: this.getReasonForSuggestion(context, nextLevel),
          relevanceScore: path.priority || 100,
        });
      }
    });

    // Sort by confidence and relevance
    suggestions.sort((a, b) => {
      const scoreA = a.confidence * 0.7 + (a.relevanceScore || 0) * 0.3;
      const scoreB = b.confidence * 0.7 + (b.relevanceScore || 0) * 0.3;
      return scoreB - scoreA;
    });

    return suggestions;
  }

  /**
   * Calculate confidence score for a suggestion
   */
  private static calculateConfidence(
    context: DrillDownContext,
    level: DrillDownLevel,
    path: DrillDownPath
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost if data point has required fields
    if (level.parameterMapping) {
      const hasAllParams = Object.values(level.parameterMapping).every(
        (field) => context.dataPoint[field] !== undefined
      );
      if (hasAllParams) confidence += 0.2;
    }

    // Boost if chart type matches
    if (level.chartType === context.sourceChartType) {
      confidence += 0.1;
    }

    // Boost based on path priority
    if (path.priority && path.priority > 100) {
      confidence += Math.min((path.priority - 100) / 100, 0.2);
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Get human-readable reason for suggestion
   */
  private static getReasonForSuggestion(
    context: DrillDownContext,
    level: DrillDownLevel
  ): string {
    const reasons: string[] = [];

    if (level.description) {
      return level.description;
    }

    if (level.targetType === 'dashboard') {
      reasons.push('View related dashboard');
    } else if (level.targetType === 'widget') {
      reasons.push('View detailed widget');
    } else if (level.targetType === 'data') {
      reasons.push('Drill into detailed data');
    }

    // Add context from data point
    if (context.dataPoint.category) {
      reasons.push(`for ${context.dataPoint.category}`);
    }

    return reasons.join(' ') || 'Explore more details';
  }
}

/**
 * Drill-down filter builder
 */
export class FilterBuilder {
  private filters: DrillDownFilter[] = [];

  /**
   * Add an equals filter
   */
  equals(field: string, value: any): this {
    this.filters.push({
      field,
      operator: 'equals',
      value,
      source: 'static',
    });
    return this;
  }

  /**
   * Add an "in" filter
   */
  in(field: string, values: any[]): this {
    this.filters.push({
      field,
      operator: 'in',
      value: values,
      source: 'static',
    });
    return this;
  }

  /**
   * Add a range filter
   */
  between(field: string, min: any, max: any): this {
    this.filters.push({
      field,
      operator: 'between',
      value: [min, max],
      source: 'static',
    });
    return this;
  }

  /**
   * Add a contains filter
   */
  contains(field: string, value: string): this {
    this.filters.push({
      field,
      operator: 'contains',
      value,
      source: 'static',
    });
    return this;
  }

  /**
   * Add a greater than filter
   */
  greaterThan(field: string, value: number): this {
    this.filters.push({
      field,
      operator: 'gt',
      value,
      source: 'static',
    });
    return this;
  }

  /**
   * Add a less than filter
   */
  lessThan(field: string, value: number): this {
    this.filters.push({
      field,
      operator: 'lt',
      value,
      source: 'static',
    });
    return this;
  }

  /**
   * Add filter from parameter
   */
  fromParameter(field: string, parameterName: string): this {
    this.filters.push({
      field,
      operator: 'equals',
      value: `{{${parameterName}}}`, // Template variable
      source: 'parameter',
    });
    return this;
  }

  /**
   * Build filters array
   */
  build(): DrillDownFilter[] {
    return this.filters;
  }

  /**
   * Reset builder
   */
  reset(): this {
    this.filters = [];
    return this;
  }
}

/**
 * Apply filters to data
 */
export const applyFilters = (
  data: any[],
  filters: DrillDownFilter[],
  parameters?: Record<string, any>
): any[] => {
  return data.filter((item) => {
    return filters.every((filter) => {
      let value = filter.value;

      // Resolve parameter values
      if (filter.source === 'parameter' && parameters) {
        const match = String(value).match(/\{\{(.+?)\}\}/);
        if (match) {
          const paramName = match[1];
          value = parameters[paramName];
        }
      }

      const itemValue = item[filter.field];

      switch (filter.operator) {
        case 'equals':
          return itemValue === value;

        case 'in':
          return Array.isArray(value) && value.includes(itemValue);

        case 'between':
          return (
            Array.isArray(value) &&
            itemValue >= value[0] &&
            itemValue <= value[1]
          );

        case 'contains':
          return String(itemValue).includes(String(value));

        case 'startsWith':
          return String(itemValue).startsWith(String(value));

        case 'endsWith':
          return String(itemValue).endsWith(String(value));

        case 'gt':
          return itemValue > value;

        case 'gte':
          return itemValue >= value;

        case 'lt':
          return itemValue < value;

        case 'lte':
          return itemValue <= value;

        default:
          return true;
      }
    });
  });
};

/**
 * Common drill-down templates
 */
export const DrillDownTemplates: Record<string, DrillDownTemplate> = {
  timeSeries: {
    id: 'time-series',
    name: 'Time Series Drill-Down',
    description: 'Drill from year → quarter → month → day → hour',
    category: 'custom',
    levels: [
      {
        name: 'Yearly View',
        chartType: ChartType.LINE,
        isDrillable: true,
      },
      {
        name: 'Quarterly View',
        chartType: ChartType.BAR,
        isDrillable: true,
      },
      {
        name: 'Monthly View',
        chartType: ChartType.LINE,
        isDrillable: true,
      },
      {
        name: 'Daily View',
        chartType: ChartType.AREA,
        isDrillable: true,
      },
      {
        name: 'Hourly View',
        chartType: ChartType.LINE,
        isDrillable: false,
      },
    ],
    variables: [
      {
        name: 'metric',
        type: 'string',
        required: true,
      },
      {
        name: 'dateField',
        type: 'string',
        required: true,
        defaultValue: 'date',
      },
    ],
  },

  geographic: {
    id: 'geographic',
    name: 'Geographic Drill-Down',
    description: 'Drill from country → state/region → city → location',
    category: 'custom',
    levels: [
      {
        name: 'Country View',
        chartType: ChartType.MAP,
        isDrillable: true,
      },
      {
        name: 'State/Region View',
        chartType: ChartType.CHOROPLETH,
        isDrillable: true,
      },
      {
        name: 'City View',
        chartType: ChartType.BAR,
        isDrillable: true,
      },
      {
        name: 'Location View',
        chartType: ChartType.TABLE,
        isDrillable: false,
      },
    ],
    variables: [],
  },

  salesFunnel: {
    id: 'sales-funnel',
    name: 'Sales Funnel Drill-Down',
    description: 'Drill from overview → stage → opportunity → details',
    category: 'sales',
    levels: [
      {
        name: 'Funnel Overview',
        chartType: ChartType.FUNNEL,
        isDrillable: true,
      },
      {
        name: 'Stage Details',
        chartType: ChartType.BAR,
        isDrillable: true,
      },
      {
        name: 'Opportunity List',
        chartType: ChartType.TABLE,
        isDrillable: true,
      },
      {
        name: 'Opportunity Details',
        chartType: ChartType.KPI_CARD,
        isDrillable: false,
      },
    ],
    variables: [],
  },

  productHierarchy: {
    id: 'product-hierarchy',
    name: 'Product Hierarchy Drill-Down',
    description: 'Drill from category → subcategory → product → SKU',
    category: 'operations',
    levels: [
      {
        name: 'Category View',
        chartType: ChartType.TREEMAP,
        isDrillable: true,
      },
      {
        name: 'Subcategory View',
        chartType: ChartType.BAR,
        isDrillable: true,
      },
      {
        name: 'Product View',
        chartType: ChartType.TABLE,
        isDrillable: true,
      },
      {
        name: 'SKU Details',
        chartType: ChartType.METRIC,
        isDrillable: false,
      },
    ],
    variables: [],
  },
};

/**
 * Extract parameters from data point based on mapping
 */
export const extractParameters = (
  dataPoint: any,
  mapping: Record<string, string>
): Record<string, any> => {
  const parameters: Record<string, any> = {};

  Object.entries(mapping).forEach(([paramName, fieldName]) => {
    if (dataPoint[fieldName] !== undefined) {
      parameters[paramName] = dataPoint[fieldName];
    }
  });

  return parameters;
};

/**
 * Build drill-down URL with state
 */
export const buildDrillDownUrl = (
  baseUrl: string,
  state: DrillDownState
): string => {
  const url = new URL(baseUrl, window.location.origin);

  // Add drill state to query params
  url.searchParams.set('drill', encodeURIComponent(JSON.stringify(state)));

  return url.toString();
};

export default {
  DrillDownPathBuilder,
  DrillDownSuggestionsEngine,
  FilterBuilder,
  applyFilters,
  DrillDownTemplates,
  extractParameters,
  buildDrillDownUrl,
};
