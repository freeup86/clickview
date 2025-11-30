/**
 * Database Query Optimization Service
 * Implements PERF-002: Query profiling, optimization, and monitoring
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../config/logger';
import { metricsRegistry, businessMetrics } from '../monitoring/metrics';

// Query profiling configuration
const SLOW_QUERY_THRESHOLD_MS = 100;
const QUERY_SAMPLE_RATE = 0.1; // 10% of queries are profiled

export interface QueryProfile {
  query: string;
  params: any[];
  duration: number;
  rowCount: number;
  timestamp: Date;
  caller?: string;
  planAnalysis?: QueryPlan;
}

export interface QueryPlan {
  planType: string;
  estimatedRows: number;
  actualRows: number;
  scanType: string;
  indexUsed?: string;
  cost: number;
  suggestions: string[];
}

export interface OptimizationSuggestion {
  query: string;
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImprovement: string;
}

export class DatabaseOptimizer {
  private pool: Pool;
  private readPool?: Pool;
  private queryProfiles: QueryProfile[] = [];
  private slowQueries: Map<string, QueryProfile[]> = new Map();
  private readonly maxProfiles = 10000;

  constructor(pool: Pool, readPool?: Pool) {
    this.pool = pool;
    this.readPool = readPool;
  }

  /**
   * Execute query with profiling
   */
  async query<T = any>(
    sql: string,
    params?: any[],
    options: { useRead?: boolean; profile?: boolean } = {}
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const shouldProfile = options.profile ?? Math.random() < QUERY_SAMPLE_RATE;

    const pool = options.useRead && this.readPool ? this.readPool : this.pool;

    try {
      const result = await pool.query(sql, params);
      const duration = Date.now() - startTime;

      // Track metrics
      businessMetrics.trackDatabaseQuery(this.getQueryType(sql), duration);

      // Profile slow queries
      if (duration > SLOW_QUERY_THRESHOLD_MS || shouldProfile) {
        this.recordQueryProfile({
          query: sql,
          params: params || [],
          duration,
          rowCount: result.rowCount || 0,
          timestamp: new Date(),
          caller: this.getCallerInfo(),
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Query failed', { sql, duration, error });
      throw error;
    }
  }

  /**
   * Execute read-only query on read replica
   */
  async readQuery<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    return this.query(sql, params, { useRead: true });
  }

  /**
   * Analyze query execution plan
   */
  async analyzeQuery(sql: string, params?: any[]): Promise<QueryPlan> {
    const explainSql = `EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`;

    try {
      const result = await this.pool.query(explainSql, params);
      const plan = result.rows[0]['QUERY PLAN'][0];

      return this.parseQueryPlan(plan);
    } catch (error) {
      logger.error('Failed to analyze query', { sql, error });
      throw error;
    }
  }

  /**
   * Get optimization suggestions for a query
   */
  async getOptimizationSuggestions(sql: string, params?: any[]): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    try {
      const plan = await this.analyzeQuery(sql, params);

      // Check for sequential scans on large tables
      if (plan.scanType === 'Seq Scan' && plan.actualRows > 1000) {
        suggestions.push({
          query: sql,
          issue: 'Sequential scan on large table',
          suggestion: `Add an index on the columns used in WHERE clause`,
          priority: 'high',
          estimatedImprovement: '10-100x faster',
        });
      }

      // Check for missing indexes
      if (!plan.indexUsed && plan.actualRows > 100) {
        suggestions.push({
          query: sql,
          issue: 'No index used',
          suggestion: 'Create a covering index for this query pattern',
          priority: 'medium',
          estimatedImprovement: '5-50x faster',
        });
      }

      // Check for high cost queries
      if (plan.cost > 10000) {
        suggestions.push({
          query: sql,
          issue: 'High query cost',
          suggestion: 'Consider query restructuring or materialized views',
          priority: 'medium',
          estimatedImprovement: 'Variable',
        });
      }

      // Check for large row estimates vs actual
      if (plan.estimatedRows > 0 && plan.actualRows > plan.estimatedRows * 10) {
        suggestions.push({
          query: sql,
          issue: 'Inaccurate row estimates',
          suggestion: 'Run ANALYZE on the affected tables',
          priority: 'low',
          estimatedImprovement: 'Improved query planning',
        });
      }

    } catch (error) {
      logger.error('Failed to generate suggestions', { sql, error });
    }

    return suggestions;
  }

  /**
   * Get slow query report
   */
  getSlowQueryReport(limit: number = 20): QueryProfile[] {
    const profiles = Array.from(this.slowQueries.values())
      .flat()
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);

    return profiles;
  }

  /**
   * Get query statistics
   */
  getQueryStats(): QueryStats {
    const allProfiles = Array.from(this.slowQueries.values()).flat();

    if (allProfiles.length === 0) {
      return {
        totalQueries: 0,
        avgDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        slowQueryCount: 0,
        slowQueryRate: 0,
      };
    }

    const durations = allProfiles.map((p) => p.duration).sort((a, b) => a - b);
    const slowQueries = durations.filter((d) => d > SLOW_QUERY_THRESHOLD_MS);

    return {
      totalQueries: allProfiles.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50Duration: this.percentile(durations, 50),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      slowQueryCount: slowQueries.length,
      slowQueryRate: slowQueries.length / allProfiles.length,
    };
  }

  /**
   * Check for N+1 query patterns
   */
  detectN1Patterns(): N1Pattern[] {
    const patterns: N1Pattern[] = [];
    const queryGroups = new Map<string, QueryProfile[]>();

    // Group similar queries
    for (const profile of this.queryProfiles) {
      const normalized = this.normalizeQuery(profile.query);
      const group = queryGroups.get(normalized) || [];
      group.push(profile);
      queryGroups.set(normalized, group);
    }

    // Detect N+1 patterns (many similar queries in quick succession)
    for (const [query, profiles] of queryGroups) {
      if (profiles.length > 10) {
        const timeWindow = profiles[profiles.length - 1].timestamp.getTime() -
                          profiles[0].timestamp.getTime();

        if (timeWindow < 1000) { // Within 1 second
          patterns.push({
            query,
            count: profiles.length,
            timeWindowMs: timeWindow,
            suggestion: 'Consider using DataLoader or batch queries',
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Create recommended indexes based on query patterns
   */
  async suggestIndexes(): Promise<IndexSuggestion[]> {
    const suggestions: IndexSuggestion[] = [];

    // Analyze slow queries for missing indexes
    const slowQueries = this.getSlowQueryReport(50);

    for (const profile of slowQueries) {
      try {
        const plan = await this.analyzeQuery(profile.query, profile.params);

        if (plan.scanType === 'Seq Scan' || !plan.indexUsed) {
          const columns = this.extractWhereColumns(profile.query);
          const table = this.extractTableName(profile.query);

          if (table && columns.length > 0) {
            suggestions.push({
              table,
              columns,
              indexType: columns.length === 1 ? 'btree' : 'composite',
              createStatement: this.generateCreateIndexStatement(table, columns),
              estimatedImprovement: 'High',
            });
          }
        }
      } catch (error) {
        // Skip queries that can't be analyzed
      }
    }

    // Deduplicate suggestions
    return this.deduplicateSuggestions(suggestions);
  }

  /**
   * Run database health check
   */
  async runHealthCheck(): Promise<DatabaseHealth> {
    const health: DatabaseHealth = {
      isHealthy: true,
      issues: [],
      metrics: {},
    };

    try {
      // Check connection pool
      const poolStatus = await this.pool.query('SELECT 1');
      health.metrics.connectionStatus = 'connected';

      // Check table bloat
      const bloatResult = await this.pool.query(`
        SELECT
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size,
          COALESCE(n_dead_tup, 0) as dead_tuples
        FROM pg_stat_user_tables
        ORDER BY n_dead_tup DESC
        LIMIT 10
      `);

      for (const row of bloatResult.rows) {
        if (row.dead_tuples > 10000) {
          health.issues.push({
            type: 'bloat',
            severity: 'warning',
            table: row.tablename,
            message: `Table ${row.tablename} has ${row.dead_tuples} dead tuples. Consider VACUUM.`,
          });
        }
      }

      // Check index usage
      const unusedIndexes = await this.pool.query(`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
          AND indexname NOT LIKE '%_pkey'
      `);

      for (const row of unusedIndexes.rows) {
        health.issues.push({
          type: 'unused_index',
          severity: 'info',
          table: row.tablename,
          message: `Index ${row.indexname} on ${row.tablename} has never been used.`,
        });
      }

      // Check cache hit ratio
      const cacheRatio = await this.pool.query(`
        SELECT
          sum(blks_hit)::float / NULLIF(sum(blks_hit) + sum(blks_read), 0) as cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database()
      `);

      const ratio = parseFloat(cacheRatio.rows[0]?.cache_hit_ratio || 0);
      health.metrics.cacheHitRatio = ratio;

      if (ratio < 0.95) {
        health.issues.push({
          type: 'cache',
          severity: 'warning',
          message: `Cache hit ratio is ${(ratio * 100).toFixed(2)}%. Should be > 95%.`,
        });
        health.isHealthy = false;
      }

      // Check long-running queries
      const longQueries = await this.pool.query(`
        SELECT
          pid,
          now() - pg_stat_activity.query_start AS duration,
          query,
          state
        FROM pg_stat_activity
        WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
          AND state != 'idle'
      `);

      for (const row of longQueries.rows) {
        health.issues.push({
          type: 'long_running_query',
          severity: 'warning',
          message: `Query running for ${row.duration}: ${row.query.substring(0, 100)}...`,
        });
      }

      health.isHealthy = health.issues.filter((i) => i.severity === 'error').length === 0;

    } catch (error) {
      health.isHealthy = false;
      health.issues.push({
        type: 'connection',
        severity: 'error',
        message: `Database connection failed: ${error}`,
      });
    }

    return health;
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private recordQueryProfile(profile: QueryProfile): void {
    // Store in memory (with limit)
    this.queryProfiles.push(profile);
    if (this.queryProfiles.length > this.maxProfiles) {
      this.queryProfiles.shift();
    }

    // Track slow queries separately
    if (profile.duration > SLOW_QUERY_THRESHOLD_MS) {
      const normalized = this.normalizeQuery(profile.query);
      const existing = this.slowQueries.get(normalized) || [];
      existing.push(profile);

      // Keep only last 100 instances of each slow query
      if (existing.length > 100) {
        existing.shift();
      }
      this.slowQueries.set(normalized, existing);

      // Log slow query
      logger.warn('Slow query detected', {
        query: profile.query.substring(0, 200),
        duration: profile.duration,
        rowCount: profile.rowCount,
      });
    }
  }

  private parseQueryPlan(plan: any): QueryPlan {
    const nodeType = plan['Node Type'] || 'Unknown';
    const scanType = nodeType.includes('Scan') ? nodeType : 'Unknown';

    return {
      planType: nodeType,
      estimatedRows: plan['Plan Rows'] || 0,
      actualRows: plan['Actual Rows'] || 0,
      scanType,
      indexUsed: plan['Index Name'],
      cost: plan['Total Cost'] || 0,
      suggestions: [],
    };
  }

  private getQueryType(sql: string): string {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  private getCallerInfo(): string {
    const stack = new Error().stack || '';
    const lines = stack.split('\n');
    // Skip first 3 lines (Error, this method, caller)
    return lines[4]?.trim() || 'unknown';
  }

  private normalizeQuery(sql: string): string {
    // Replace parameter values with placeholders
    return sql
      .replace(/\$\d+/g, '$?')
      .replace(/'[^']*'/g, "'?'")
      .replace(/\d+/g, '?')
      .trim();
  }

  private extractWhereColumns(sql: string): string[] {
    const columns: string[] = [];
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/is);

    if (whereMatch) {
      const whereClause = whereMatch[1];
      const columnMatches = whereClause.match(/(\w+)\s*[=<>]/g);

      if (columnMatches) {
        for (const match of columnMatches) {
          const column = match.replace(/\s*[=<>].*/, '').trim();
          if (!columns.includes(column)) {
            columns.push(column);
          }
        }
      }
    }

    return columns;
  }

  private extractTableName(sql: string): string | null {
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    return fromMatch ? fromMatch[1] : null;
  }

  private generateCreateIndexStatement(table: string, columns: string[]): string {
    const indexName = `idx_${table}_${columns.join('_')}`;
    return `CREATE INDEX ${indexName} ON ${table} (${columns.join(', ')});`;
  }

  private deduplicateSuggestions(suggestions: IndexSuggestion[]): IndexSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter((s) => {
      const key = `${s.table}:${s.columns.join(',')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private percentile(sorted: number[], p: number): number {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}

// ===================================================================
// TYPES
// ===================================================================

export interface QueryStats {
  totalQueries: number;
  avgDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  slowQueryCount: number;
  slowQueryRate: number;
}

export interface N1Pattern {
  query: string;
  count: number;
  timeWindowMs: number;
  suggestion: string;
}

export interface IndexSuggestion {
  table: string;
  columns: string[];
  indexType: string;
  createStatement: string;
  estimatedImprovement: string;
}

export interface DatabaseHealth {
  isHealthy: boolean;
  issues: HealthIssue[];
  metrics: Record<string, any>;
}

export interface HealthIssue {
  type: string;
  severity: 'info' | 'warning' | 'error';
  table?: string;
  message: string;
}

// Export factory function
export function createDatabaseOptimizer(pool: Pool, readPool?: Pool): DatabaseOptimizer {
  return new DatabaseOptimizer(pool, readPool);
}
