/**
 * Query Service
 *
 * Handles execution of SQL queries and data transformations
 * Supports parameterized queries and query caching
 */

import { CacheService } from './cacheService';

// ===================================================================
// QUERY SERVICE
// ===================================================================

export interface QueryResult {
  rows: any[];
  rowCount: number;
  fields: QueryField[];
  executionTime: number;
}

export interface QueryField {
  name: string;
  type: string;
}

export class QueryService {
  private cacheService: CacheService;
  private usePostgres: boolean = process.env.USE_POSTGRES === 'true';
  private queryCache: boolean = process.env.QUERY_CACHE_ENABLED === 'true';

  constructor() {
    this.cacheService = new CacheService();

    if (this.usePostgres) {
      // In production: Initialize PostgreSQL connection pool
      console.log('QueryService initialized (PostgreSQL connection would be established here)');
    } else {
      console.log('QueryService initialized with mock query execution');
    }
  }

  /**
   * Execute a SQL query with optional parameters
   */
  async execute(
    query: string,
    parameters?: Record<string, any>
  ): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      // Replace parameters in query
      const processedQuery = this.replaceParameters(query, parameters);

      // Check cache if enabled
      if (this.queryCache) {
        const cacheKey = this.generateCacheKey(processedQuery);
        const cached = await this.cacheService.get<QueryResult>(cacheKey);

        if (cached) {
          console.log(`[QueryService] Cache hit for query: ${processedQuery.substring(0, 50)}...`);
          return cached;
        }
      }

      // Execute query
      const result = await this.executeQuery(processedQuery);

      const executionTime = Date.now() - startTime;

      const queryResult: QueryResult = {
        ...result,
        executionTime,
      };

      // Cache result if enabled
      if (this.queryCache) {
        const cacheKey = this.generateCacheKey(processedQuery);
        await this.cacheService.set(cacheKey, queryResult, 300); // 5 minutes TTL
      }

      console.log(
        `[QueryService] Executed query in ${executionTime}ms, returned ${queryResult.rowCount} rows`
      );

      return queryResult;
    } catch (error: any) {
      console.error('[QueryService] Query execution failed:', error);
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Execute a query and return only the rows
   */
  async query<T = any>(
    query: string,
    parameters?: Record<string, any>
  ): Promise<T[]> {
    const result = await this.execute(query, parameters);
    return result.rows as T[];
  }

  /**
   * Execute a query and return a single row
   */
  async queryOne<T = any>(
    query: string,
    parameters?: Record<string, any>
  ): Promise<T | null> {
    const result = await this.execute(query, parameters);
    return result.rows.length > 0 ? (result.rows[0] as T) : null;
  }

  /**
   * Execute a query and return a single value
   */
  async queryScalar<T = any>(
    query: string,
    parameters?: Record<string, any>
  ): Promise<T | null> {
    const result = await this.execute(query, parameters);

    if (result.rows.length === 0) {
      return null;
    }

    const firstRow = result.rows[0];
    const firstKey = Object.keys(firstRow)[0];

    return firstRow[firstKey] as T;
  }

  /**
   * Validate SQL query syntax
   */
  async validateQuery(query: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Basic SQL injection checks
      const dangerousPatterns = [
        /;\s*(drop|delete|truncate|alter|create)\s+/i,
        /--/,
        /\/\*/,
        /xp_/i,
        /exec(\s|\()/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(query)) {
          return {
            valid: false,
            error: 'Query contains potentially dangerous SQL statements',
          };
        }
      }

      // In production: Use EXPLAIN to validate query
      // await this.executeQuery(`EXPLAIN ${query}`);

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Get query execution plan (for optimization)
   */
  async explainQuery(query: string): Promise<any> {
    if (this.usePostgres) {
      // In production: PostgreSQL EXPLAIN ANALYZE
      // const result = await this.executeQuery(`EXPLAIN ANALYZE ${query}`);
      // return result.rows;
      return [];
    }

    return [];
  }

  /**
   * Invalidate query cache
   */
  async invalidateCache(pattern?: string): Promise<void> {
    if (pattern) {
      await this.cacheService.invalidate(`query:${pattern}`);
    } else {
      await this.cacheService.invalidate('query:*');
    }
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  /**
   * Execute the actual query against the database
   */
  private async executeQuery(query: string): Promise<Omit<QueryResult, 'executionTime'>> {
    if (this.usePostgres) {
      // In production: Execute against PostgreSQL
      // const pool = await this.getConnectionPool();
      // const result = await pool.query(query);
      // return {
      //   rows: result.rows,
      //   rowCount: result.rowCount || 0,
      //   fields: result.fields.map(f => ({ name: f.name, type: f.dataTypeID.toString() })),
      // };
    }

    // Mock data for development
    return this.executeMockQuery(query);
  }

  /**
   * Execute a mock query (for development/testing)
   */
  private async executeMockQuery(query: string): Promise<Omit<QueryResult, 'executionTime'>> {
    console.log(`[QueryService] Executing mock query: ${query.substring(0, 100)}...`);

    // Generate mock data based on query type
    const queryLower = query.toLowerCase();

    if (queryLower.includes('select')) {
      // Return mock SELECT results
      const mockRows = [
        { id: 1, name: 'Sample 1', value: 100, date: new Date() },
        { id: 2, name: 'Sample 2', value: 200, date: new Date() },
        { id: 3, name: 'Sample 3', value: 150, date: new Date() },
      ];

      return {
        rows: mockRows,
        rowCount: mockRows.length,
        fields: [
          { name: 'id', type: 'integer' },
          { name: 'name', type: 'text' },
          { name: 'value', type: 'numeric' },
          { name: 'date', type: 'timestamp' },
        ],
      };
    }

    if (
      queryLower.includes('insert') ||
      queryLower.includes('update') ||
      queryLower.includes('delete')
    ) {
      // Return mock DML results
      return {
        rows: [],
        rowCount: 1,
        fields: [],
      };
    }

    // Default empty result
    return {
      rows: [],
      rowCount: 0,
      fields: [],
    };
  }

  /**
   * Replace named parameters in query with values
   */
  private replaceParameters(query: string, parameters?: Record<string, any>): string {
    if (!parameters) {
      return query;
    }

    let processedQuery = query;

    for (const [key, value] of Object.entries(parameters)) {
      const paramPattern = new RegExp(`:${key}\\b`, 'g');
      const escapedValue = this.escapeValue(value);
      processedQuery = processedQuery.replace(paramPattern, escapedValue);
    }

    return processedQuery;
  }

  /**
   * Escape a value for SQL injection prevention
   */
  private escapeValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }

    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }

    if (Array.isArray(value)) {
      return `(${value.map((v) => this.escapeValue(v)).join(', ')})`;
    }

    // String value - escape single quotes
    const stringValue = String(value).replace(/'/g, "''");
    return `'${stringValue}'`;
  }

  /**
   * Generate cache key for a query
   */
  private generateCacheKey(query: string): string {
    // Create a hash of the query for cache key
    const hash = this.simpleHash(query);
    return `query:${hash}`;
  }

  /**
   * Simple string hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    if (this.usePostgres) {
      // In production: Close PostgreSQL connection pool
      // await this.pool.end();
      console.log('QueryService connections closed');
    }
  }
}

// Export singleton instance
export const queryService = new QueryService();
