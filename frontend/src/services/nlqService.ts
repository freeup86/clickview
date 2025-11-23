/**
 * Natural Language Query (NLQ) Service
 *
 * Converts plain English queries into data visualizations using AI.
 * Supports querying data sources and automatically generating appropriate charts.
 *
 * Part of AI-001 implementation (Phase 5)
 */

import axios from 'axios';
import { ChartType, WidgetConfig } from '../types/charts';

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

export interface NLQRequest {
  query: string;
  context?: {
    availableDataSources?: string[];
    previousQueries?: string[];
    userPreferences?: {
      preferredChartTypes?: ChartType[];
      colorScheme?: string;
    };
  };
}

export interface NLQResponse {
  success: boolean;
  query: string;
  interpretation: string;
  visualization: WidgetConfig;
  confidence: number;
  suggestions?: string[];
  error?: string;
}

export interface QueryIntent {
  action: 'visualize' | 'filter' | 'aggregate' | 'compare' | 'trend';
  entities: string[];
  metrics: string[];
  dimensions: string[];
  timeRange?: {
    start?: string;
    end?: string;
    period?: string;
  };
  chartType?: ChartType;
  filters?: Record<string, any>;
}

export interface DataSourceSchema {
  name: string;
  fields: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    description?: string;
  }>;
  relationships?: Array<{
    field: string;
    relatedSource: string;
    relatedField: string;
  }>;
}

// ===================================================================
// NLQ SERVICE CLASS
// ===================================================================

export class NLQService {
  private apiKey: string;
  private baseURL: string;
  private modelName: string = 'gpt-4';
  private dataSourceSchemas: Map<string, DataSourceSchema> = new Map();

  constructor(apiKey: string, baseURL: string = '/api/nlq') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  /**
   * Register a data source schema
   */
  registerDataSource(schema: DataSourceSchema) {
    this.dataSourceSchemas.set(schema.name, schema);
  }

  /**
   * Process natural language query and generate visualization
   */
  async processQuery(request: NLQRequest): Promise<NLQResponse> {
    try {
      // Step 1: Parse query intent using AI
      const intent = await this.parseQueryIntent(request.query);

      // Step 2: Generate SQL/GraphQL query based on intent
      const dataQuery = await this.generateDataQuery(intent);

      // Step 3: Execute query and fetch data
      const data = await this.executeDataQuery(dataQuery);

      // Step 4: Determine optimal visualization
      const chartType = intent.chartType || this.determineChartType(intent);

      // Step 5: Generate widget configuration
      const visualization = this.generateVisualization(intent, chartType, data);

      return {
        success: true,
        query: request.query,
        interpretation: this.generateInterpretation(intent),
        visualization,
        confidence: this.calculateConfidence(intent),
        suggestions: this.generateSuggestions(intent),
      };
    } catch (error: any) {
      return {
        success: false,
        query: request.query,
        interpretation: '',
        visualization: {} as WidgetConfig,
        confidence: 0,
        error: error.message || 'Failed to process query',
      };
    }
  }

  /**
   * Parse natural language query into structured intent using GPT-4
   */
  private async parseQueryIntent(query: string): Promise<QueryIntent> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = `Parse this query into structured intent: "${query}"`;

    const response = await this.callAI(systemPrompt, userPrompt);

    try {
      return JSON.parse(response);
    } catch (error) {
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Build system prompt for AI model
   */
  private buildSystemPrompt(): string {
    const schemas = Array.from(this.dataSourceSchemas.values())
      .map(schema => `
        Data Source: ${schema.name}
        Fields: ${schema.fields.map(f => `${f.name} (${f.type})`).join(', ')}
      `)
      .join('\n');

    return `
      You are a data query assistant that converts natural language queries into structured query intents.

      Available Data Sources:
      ${schemas}

      Your response should be a JSON object with this structure:
      {
        "action": "visualize | filter | aggregate | compare | trend",
        "entities": ["entity1", "entity2"],
        "metrics": ["metric1", "metric2"],
        "dimensions": ["dimension1", "dimension2"],
        "timeRange": {
          "start": "ISO date or null",
          "end": "ISO date or null",
          "period": "day | week | month | quarter | year"
        },
        "chartType": "line | bar | pie | scatter | etc.",
        "filters": {}
      }

      Chart Type Selection Rules:
      - Use "line" for trends over time
      - Use "bar" for categorical comparisons
      - Use "pie" for part-to-whole relationships
      - Use "scatter" for correlation analysis
      - Use "heatmap" for 2D density data
      - Use "funnel" for conversion processes
      - Use "gauge" for single KPI metrics

      Respond ONLY with valid JSON, no additional text.
    `;
  }

  /**
   * Call AI model (GPT-4 or backend API)
   */
  private async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      // If using OpenAI directly
      if (this.apiKey.startsWith('sk-')) {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: this.modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 1000,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        return response.data.choices[0].message.content;
      }

      // Otherwise use backend API
      const response = await axios.post(`${this.baseURL}/parse`, {
        system: systemPrompt,
        prompt: userPrompt,
      });

      return response.data.result;
    } catch (error: any) {
      throw new Error(`AI API error: ${error.message}`);
    }
  }

  /**
   * Generate data query (SQL/GraphQL) from intent
   */
  private async generateDataQuery(intent: QueryIntent): Promise<string> {
    // For SQL generation
    const select = intent.metrics.join(', ');
    const from = intent.entities[0] || 'default_table';
    const groupBy = intent.dimensions.length > 0 ? `GROUP BY ${intent.dimensions.join(', ')}` : '';
    const where = this.buildWhereClause(intent.filters, intent.timeRange);

    return `SELECT ${select} FROM ${from} ${where} ${groupBy}`.trim();
  }

  /**
   * Build WHERE clause from filters and time range
   */
  private buildWhereClause(
    filters?: Record<string, any>,
    timeRange?: QueryIntent['timeRange']
  ): string {
    const conditions: string[] = [];

    if (filters) {
      Object.entries(filters).forEach(([field, value]) => {
        if (Array.isArray(value)) {
          conditions.push(`${field} IN (${value.map(v => `'${v}'`).join(', ')})`);
        } else if (typeof value === 'string') {
          conditions.push(`${field} = '${value}'`);
        } else {
          conditions.push(`${field} = ${value}`);
        }
      });
    }

    if (timeRange) {
      if (timeRange.start) {
        conditions.push(`date >= '${timeRange.start}'`);
      }
      if (timeRange.end) {
        conditions.push(`date <= '${timeRange.end}'`);
      }
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  /**
   * Execute data query
   */
  private async executeDataQuery(query: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseURL}/execute`, { query });
      return response.data;
    } catch (error: any) {
      throw new Error(`Query execution error: ${error.message}`);
    }
  }

  /**
   * Determine optimal chart type based on intent
   */
  private determineChartType(intent: QueryIntent): ChartType {
    const { action, metrics, dimensions, timeRange } = intent;

    // Time series data
    if (timeRange || dimensions.some(d => d.toLowerCase().includes('date') || d.toLowerCase().includes('time'))) {
      return ChartType.LINE;
    }

    // Single metric
    if (metrics.length === 1 && dimensions.length === 0) {
      return ChartType.GAUGE;
    }

    // Part-to-whole
    if (action === 'compare' && dimensions.length === 1 && metrics.length === 1) {
      return ChartType.PIE;
    }

    // Categorical comparison
    if (dimensions.length === 1 && metrics.length >= 1) {
      return ChartType.BAR;
    }

    // Correlation analysis
    if (metrics.length === 2 && dimensions.length === 0) {
      return ChartType.SCATTER;
    }

    // Multi-dimensional
    if (dimensions.length === 2 && metrics.length === 1) {
      return ChartType.HEATMAP;
    }

    // Default
    return ChartType.BAR;
  }

  /**
   * Generate widget configuration
   */
  private generateVisualization(
    intent: QueryIntent,
    chartType: ChartType,
    data: any
  ): WidgetConfig {
    const title = this.generateTitle(intent);
    const description = this.generateInterpretation(intent);

    return {
      id: `nlq-${Date.now()}`,
      type: chartType,
      title,
      description,
      dataSource: {
        type: 'static',
        data,
      },
      dataMapping: {
        xField: intent.dimensions[0] || 'category',
        yField: intent.metrics[0] || 'value',
      },
      chartConfig: {
        type: chartType,
        xAxis: {
          label: intent.dimensions[0] || 'Category',
          type: 'category',
        },
        yAxis: {
          label: intent.metrics[0] || 'Value',
          type: 'value',
        },
        animation: {
          enabled: true,
          duration: 1000,
        },
      },
    };
  }

  /**
   * Generate human-readable title
   */
  private generateTitle(intent: QueryIntent): string {
    const metric = intent.metrics[0] || 'Data';
    const dimension = intent.dimensions[0] || '';

    if (dimension) {
      return `${metric} by ${dimension}`;
    }

    return metric;
  }

  /**
   * Generate interpretation text
   */
  private generateInterpretation(intent: QueryIntent): string {
    const action = intent.action.charAt(0).toUpperCase() + intent.action.slice(1);
    const metrics = intent.metrics.join(', ');
    const dimensions = intent.dimensions.join(', ');

    let interpretation = `${action} ${metrics}`;

    if (dimensions) {
      interpretation += ` grouped by ${dimensions}`;
    }

    if (intent.timeRange) {
      if (intent.timeRange.period) {
        interpretation += ` over ${intent.timeRange.period}`;
      }
      if (intent.timeRange.start || intent.timeRange.end) {
        interpretation += ` from ${intent.timeRange.start || 'start'} to ${intent.timeRange.end || 'end'}`;
      }
    }

    return interpretation;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(intent: QueryIntent): number {
    let confidence = 0.5;

    // Increase confidence if we have clear intent
    if (intent.action) confidence += 0.1;
    if (intent.metrics.length > 0) confidence += 0.2;
    if (intent.chartType) confidence += 0.2;

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate query suggestions
   */
  private generateSuggestions(intent: QueryIntent): string[] {
    const suggestions: string[] = [];

    if (intent.metrics.length === 1) {
      suggestions.push(`Compare ${intent.metrics[0]} across different categories`);
    }

    if (intent.dimensions.length === 1) {
      suggestions.push(`Show trend of ${intent.metrics[0]} over time`);
    }

    if (!intent.timeRange) {
      suggestions.push('Filter by date range');
    }

    return suggestions;
  }

  /**
   * Get query history for context
   */
  async getQueryHistory(limit: number = 10): Promise<NLQResponse[]> {
    try {
      const response = await axios.get(`${this.baseURL}/history`, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      return [];
    }
  }
}

// ===================================================================
// CONVENIENCE FUNCTIONS
// ===================================================================

/**
 * Create NLQ service instance
 */
export function createNLQService(apiKey: string, baseURL?: string): NLQService {
  return new NLQService(apiKey, baseURL);
}

/**
 * Quick query - process a single natural language query
 */
export async function quickQuery(
  query: string,
  nlqService: NLQService
): Promise<NLQResponse> {
  return nlqService.processQuery({ query });
}

/**
 * Pre-defined query templates
 */
export const QueryTemplates = {
  salesTrend: 'Show sales trend over the last 30 days',
  topProducts: 'What are the top 10 products by revenue?',
  customerDistribution: 'Show customer distribution by region',
  revenueComparison: 'Compare revenue between this month and last month',
  conversionFunnel: 'Show the conversion funnel from lead to customer',
  performanceKPI: 'What is the current customer satisfaction score?',
};

/**
 * Extract keywords from query for autocomplete
 */
export function extractKeywords(query: string): string[] {
  const keywords = [
    'show', 'display', 'visualize', 'compare', 'trend', 'top', 'bottom',
    'average', 'sum', 'count', 'by', 'over', 'last', 'this', 'previous',
    'sales', 'revenue', 'customers', 'products', 'orders', 'users',
    'day', 'week', 'month', 'quarter', 'year',
  ];

  const queryLower = query.toLowerCase();
  return keywords.filter(keyword => queryLower.includes(keyword));
}
