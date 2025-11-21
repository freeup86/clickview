/**
 * Natural Language Query (NLQ) Service
 *
 * Enables users to query data using natural language:
 * - OpenAI GPT-4 integration for query understanding
 * - Automatic SQL generation from natural language
 * - Context-aware query interpretation
 * - Visualization recommendation
 * - Query refinement and suggestions
 * - Multi-turn conversation support
 */

import { Configuration, OpenAIApi } from 'openai';
import { Pool } from 'pg';

// ===================================================================
// NLQ SERVICE CLASS
// ===================================================================

export class NLQService {
  private openai: OpenAIApi;
  private pool: Pool;
  private conversationHistory: Map<string, ConversationContext> = new Map();

  constructor(pool: Pool, apiKey?: string) {
    this.pool = pool;

    const configuration = new Configuration({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });

    this.openai = new OpenAIApi(configuration);
  }

  /**
   * Process a natural language query
   */
  public async processQuery(
    query: string,
    options: NLQOptions = {}
  ): Promise<NLQResponse> {
    const startTime = Date.now();

    try {
      // Get conversation context
      const context = this.getOrCreateContext(options.sessionId || 'default');

      // Step 1: Understand the query intent
      const intent = await this.analyzeIntent(query, context);

      // Step 2: Generate SQL query
      const sqlQuery = await this.generateSQL(query, intent, context);

      // Step 3: Execute query if auto-execute is enabled
      let data: any[] = [];
      let executionTime = 0;
      if (options.autoExecute !== false) {
        const execStart = Date.now();
        data = await this.executeQuery(sqlQuery);
        executionTime = Date.now() - execStart;
      }

      // Step 4: Recommend visualization
      const visualization = this.recommendVisualization(intent, data);

      // Step 5: Generate natural language response
      const response = await this.generateResponse(query, data, intent, context);

      // Update conversation context
      context.history.push({
        query,
        intent,
        sqlQuery,
        timestamp: new Date(),
      });

      // Limit history size
      if (context.history.length > 10) {
        context.history.shift();
      }

      return {
        success: true,
        query,
        intent,
        sql: sqlQuery,
        data,
        visualization,
        response,
        confidence: intent.confidence,
        executionTime,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('NLQ processing error:', error);

      return {
        success: false,
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Analyze query intent using GPT-4
   */
  private async analyzeIntent(query: string, context: ConversationContext): Promise<QueryIntent> {
    const prompt = this.buildIntentPrompt(query, context);

    const completion = await this.openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a data analyst assistant. Analyze natural language queries about business data and extract structured intent.
Return JSON with: { "intent": "aggregation|filter|trend|comparison|detail", "entities": ["list"], "timeRange": "period", "metrics": ["list"], "dimensions": ["list"], "confidence": 0-1 }`,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = completion.data.choices[0].message?.content || '{}';

    try {
      const intent = JSON.parse(content);
      return {
        type: intent.intent || 'unknown',
        entities: intent.entities || [],
        timeRange: intent.timeRange,
        metrics: intent.metrics || [],
        dimensions: intent.dimensions || [],
        confidence: intent.confidence || 0.5,
      };
    } catch {
      return {
        type: 'unknown',
        entities: [],
        confidence: 0.3,
      };
    }
  }

  /**
   * Generate SQL from natural language using GPT-4
   */
  private async generateSQL(
    query: string,
    intent: QueryIntent,
    context: ConversationContext
  ): Promise<string> {
    const schema = await this.getSchemaContext();
    const prompt = this.buildSQLPrompt(query, intent, schema, context);

    const completion = await this.openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert SQL developer. Generate PostgreSQL queries from natural language.
Only return the SQL query, no explanations. Use proper PostgreSQL syntax.
Available tables and columns are provided in the context.`,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    let sql = completion.data.choices[0].message?.content || '';

    // Clean up the SQL
    sql = sql.trim();
    sql = sql.replace(/^```sql\n/, '').replace(/\n```$/, ''); // Remove markdown code blocks
    sql = sql.replace(/;$/, ''); // Remove trailing semicolon

    return sql;
  }

  /**
   * Execute SQL query
   */
  private async executeQuery(sql: string): Promise<any[]> {
    // Add safety checks
    const lowerSQL = sql.toLowerCase();
    const dangerousKeywords = ['drop', 'delete', 'truncate', 'insert', 'update', 'alter', 'create'];

    for (const keyword of dangerousKeywords) {
      if (lowerSQL.includes(keyword)) {
        throw new Error(`Query contains dangerous operation: ${keyword}`);
      }
    }

    // Limit result size
    if (!lowerSQL.includes('limit')) {
      sql += ' LIMIT 1000';
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(sql);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Recommend visualization based on data and intent
   */
  private recommendVisualization(intent: QueryIntent, data: any[]): VisualizationRecommendation {
    // Analyze data shape
    const rowCount = data.length;
    const columns = data[0] ? Object.keys(data[0]) : [];
    const numericColumns = columns.filter((col) => typeof data[0]?.[col] === 'number');

    // Recommendation logic
    if (intent.type === 'trend' && intent.timeRange) {
      return {
        type: 'line',
        reason: 'Time series data is best visualized with line charts',
        confidence: 0.9,
        config: {
          xAxis: columns[0], // Assume first column is time
          yAxis: numericColumns,
        },
      };
    }

    if (intent.type === 'comparison' && intent.dimensions.length > 0) {
      return {
        type: 'bar',
        reason: 'Comparisons across categories work well with bar charts',
        confidence: 0.85,
        config: {
          xAxis: intent.dimensions[0],
          yAxis: intent.metrics,
        },
      };
    }

    if (intent.type === 'aggregation' && numericColumns.length === 1) {
      return {
        type: 'metric_card',
        reason: 'Single aggregate value is best shown as a KPI metric card',
        confidence: 0.95,
        config: {
          metric: numericColumns[0],
        },
      };
    }

    if (rowCount > 50 && columns.length > 5) {
      return {
        type: 'table',
        reason: 'Large datasets with many columns are best viewed in tables',
        confidence: 0.8,
        config: {
          columns: columns.slice(0, 10), // Limit columns
        },
      };
    }

    // Default to table
    return {
      type: 'table',
      reason: 'Table view provides complete data visibility',
      confidence: 0.6,
      config: { columns },
    };
  }

  /**
   * Generate natural language response
   */
  private async generateResponse(
    query: string,
    data: any[],
    intent: QueryIntent,
    context: ConversationContext
  ): Promise<string> {
    // Generate summary statistics
    const summary = this.generateDataSummary(data);

    const prompt = `User asked: "${query}"
Data summary: ${summary}
Generate a brief, natural language response (2-3 sentences) explaining what the data shows.`;

    const completion = await this.openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful data analyst. Explain query results in simple, clear language.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return completion.data.choices[0].message?.content || 'Data retrieved successfully.';
  }

  /**
   * Generate data summary for context
   */
  private generateDataSummary(data: any[]): string {
    if (data.length === 0) return 'No data found.';

    const columns = Object.keys(data[0]);
    const numericColumns = columns.filter((col) => typeof data[0][col] === 'number');

    let summary = `Found ${data.length} rows with columns: ${columns.join(', ')}. `;

    // Add statistics for numeric columns
    if (numericColumns.length > 0) {
      const col = numericColumns[0];
      const values = data.map((row) => row[col]).filter((v) => typeof v === 'number');
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      summary += `${col}: avg=${avg.toFixed(2)}, min=${min}, max=${max}`;
    }

    return summary;
  }

  /**
   * Get database schema context
   */
  private async getSchemaContext(): Promise<SchemaContext> {
    // This would query information_schema to get actual table structures
    // For now, return a simplified context
    return {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'uuid', description: 'User ID' },
            { name: 'email', type: 'varchar', description: 'User email' },
            { name: 'created_at', type: 'timestamp', description: 'Account creation date' },
          ],
        },
        {
          name: 'dashboards',
          columns: [
            { name: 'id', type: 'uuid', description: 'Dashboard ID' },
            { name: 'name', type: 'varchar', description: 'Dashboard name' },
            { name: 'created_by', type: 'uuid', description: 'Creator user ID' },
            { name: 'created_at', type: 'timestamp', description: 'Creation date' },
          ],
        },
        // Add more tables as needed
      ],
    };
  }

  /**
   * Build intent analysis prompt
   */
  private buildIntentPrompt(query: string, context: ConversationContext): string {
    let prompt = `Analyze this query: "${query}"`;

    if (context.history.length > 0) {
      const recentQueries = context.history.slice(-3).map((h) => h.query).join(', ');
      prompt += `\n\nRecent queries: ${recentQueries}`;
    }

    return prompt;
  }

  /**
   * Build SQL generation prompt
   */
  private buildSQLPrompt(
    query: string,
    intent: QueryIntent,
    schema: SchemaContext,
    context: ConversationContext
  ): string {
    let prompt = `Generate a PostgreSQL query for: "${query}"

Available tables:
${schema.tables.map((t) => `- ${t.name} (${t.columns.map((c) => `${c.name}: ${c.type}`).join(', ')})`).join('\n')}

Intent: ${intent.type}
Metrics: ${intent.metrics.join(', ') || 'none'}
Dimensions: ${intent.dimensions.join(', ') || 'none'}
`;

    if (intent.timeRange) {
      prompt += `\nTime range: ${intent.timeRange}`;
    }

    return prompt;
  }

  /**
   * Get or create conversation context
   */
  private getOrCreateContext(sessionId: string): ConversationContext {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, {
        sessionId,
        history: [],
        createdAt: new Date(),
      });
    }

    return this.conversationHistory.get(sessionId)!;
  }

  /**
   * Clear conversation history
   */
  public clearHistory(sessionId?: string): void {
    if (sessionId) {
      this.conversationHistory.delete(sessionId);
    } else {
      this.conversationHistory.clear();
    }
  }

  /**
   * Get query suggestions based on context
   */
  public async getSuggestions(context?: string): Promise<string[]> {
    // TODO: Generate suggestions based on available data and common queries
    return [
      'Show me total revenue this month',
      'What are the top 10 customers by sales?',
      'Compare revenue by region',
      'Show user growth trend over last 6 months',
      'Which dashboards are most popular?',
    ];
  }
}

// ===================================================================
// TYPES
// ===================================================================

export interface NLQOptions {
  sessionId?: string;
  autoExecute?: boolean;
  maxResults?: number;
}

export interface NLQResponse {
  success: boolean;
  query: string;
  intent?: QueryIntent;
  sql?: string;
  data?: any[];
  visualization?: VisualizationRecommendation;
  response?: string;
  confidence?: number;
  executionTime?: number;
  totalTime: number;
  error?: string;
  suggestions?: string[];
}

export interface QueryIntent {
  type: 'aggregation' | 'filter' | 'trend' | 'comparison' | 'detail' | 'unknown';
  entities: string[];
  timeRange?: string;
  metrics: string[];
  dimensions: string[];
  confidence: number;
}

export interface VisualizationRecommendation {
  type: string;
  reason: string;
  confidence: number;
  config: Record<string, any>;
}

export interface ConversationContext {
  sessionId: string;
  history: Array<{
    query: string;
    intent: QueryIntent;
    sqlQuery: string;
    timestamp: Date;
  }>;
  createdAt: Date;
}

export interface SchemaContext {
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      description?: string;
    }>;
  }>;
}
