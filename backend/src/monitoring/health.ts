/**
 * Health Check System
 *
 * Provides comprehensive health checks for all system components:
 * - Database connectivity
 * - Redis connectivity
 * - External services
 * - System resources
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      responseTime?: number;
      message?: string;
      details?: any;
    };
  };
}

export class HealthCheckService {
  private startTime: number;

  constructor(
    private db: Pool,
    private redis: Redis
  ) {
    this.startTime = Date.now();
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};

    // Check database
    checks.database = await this.checkDatabase();

    // Check Redis
    checks.redis = await this.checkRedis();

    // Check TimescaleDB extensions
    checks.timescaledb = await this.checkTimescaleDB();

    // Check disk space
    checks.disk = await this.checkDiskSpace();

    // Check memory
    checks.memory = this.checkMemory();

    // Check CPU
    checks.cpu = this.checkCPU();

    // Determine overall status
    const status = this.determineOverallStatus(checks);

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks,
    };
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<HealthCheckResult['checks'][string]> {
    const start = Date.now();

    try {
      const result = await this.db.query('SELECT NOW() as time');
      const responseTime = Date.now() - start;

      if (responseTime > 1000) {
        return {
          status: 'warn',
          responseTime,
          message: 'Database response time is slow',
        };
      }

      return {
        status: 'pass',
        responseTime,
        message: 'Database is healthy',
        details: {
          serverTime: result.rows[0].time,
        },
      };
    } catch (error: any) {
      return {
        status: 'fail',
        responseTime: Date.now() - start,
        message: `Database check failed: ${error.message}`,
      };
    }
  }

  /**
   * Check Redis connectivity and performance
   */
  private async checkRedis(): Promise<HealthCheckResult['checks'][string]> {
    const start = Date.now();

    try {
      await this.redis.ping();
      const responseTime = Date.now() - start;

      // Check memory usage
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memoryUsed = memoryMatch ? memoryMatch[1] : 'unknown';

      if (responseTime > 100) {
        return {
          status: 'warn',
          responseTime,
          message: 'Redis response time is slow',
          details: { memoryUsed },
        };
      }

      return {
        status: 'pass',
        responseTime,
        message: 'Redis is healthy',
        details: { memoryUsed },
      };
    } catch (error: any) {
      return {
        status: 'fail',
        responseTime: Date.now() - start,
        message: `Redis check failed: ${error.message}`,
      };
    }
  }

  /**
   * Check TimescaleDB extension
   */
  private async checkTimescaleDB(): Promise<HealthCheckResult['checks'][string]> {
    try {
      const result = await this.db.query(`
        SELECT extname, extversion
        FROM pg_extension
        WHERE extname = 'timescaledb'
      `);

      if (result.rows.length === 0) {
        return {
          status: 'fail',
          message: 'TimescaleDB extension not installed',
        };
      }

      return {
        status: 'pass',
        message: 'TimescaleDB is healthy',
        details: {
          version: result.rows[0].extversion,
        },
      };
    } catch (error: any) {
      return {
        status: 'fail',
        message: `TimescaleDB check failed: ${error.message}`,
      };
    }
  }

  /**
   * Check disk space
   */
  private async checkDiskSpace(): Promise<HealthCheckResult['checks'][string]> {
    try {
      // Query PostgreSQL data directory size
      const result = await this.db.query(`
        SELECT
          pg_database_size(current_database()) as db_size,
          pg_size_pretty(pg_database_size(current_database())) as db_size_pretty
      `);

      const dbSize = parseInt(result.rows[0].db_size, 10);
      const dbSizePretty = result.rows[0].db_size_pretty;

      // Warning if database size > 10GB (configurable)
      const warningThreshold = 10 * 1024 * 1024 * 1024; // 10GB

      if (dbSize > warningThreshold) {
        return {
          status: 'warn',
          message: 'Database size is large',
          details: { size: dbSizePretty },
        };
      }

      return {
        status: 'pass',
        message: 'Disk space is healthy',
        details: { dbSize: dbSizePretty },
      };
    } catch (error: any) {
      return {
        status: 'warn',
        message: `Disk space check failed: ${error.message}`,
      };
    }
  }

  /**
   * Check memory usage
   */
  private checkMemory(): HealthCheckResult['checks'][string] {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    const rssM = Math.round(used.rss / 1024 / 1024);

    const heapUsagePercent = (used.heapUsed / used.heapTotal) * 100;

    if (heapUsagePercent > 90) {
      return {
        status: 'warn',
        message: 'High memory usage',
        details: {
          heapUsed: `${heapUsedMB}MB`,
          heapTotal: `${heapTotalMB}MB`,
          rss: `${rssM}MB`,
          usagePercent: `${heapUsagePercent.toFixed(2)}%`,
        },
      };
    }

    return {
      status: 'pass',
      message: 'Memory usage is healthy',
      details: {
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
        rss: `${rssM}MB`,
        usagePercent: `${heapUsagePercent.toFixed(2)}%`,
      },
    };
  }

  /**
   * Check CPU usage
   */
  private checkCPU(): HealthCheckResult['checks'][string] {
    const cpuUsage = process.cpuUsage();
    const userCPU = cpuUsage.user / 1000000; // Convert to seconds
    const systemCPU = cpuUsage.system / 1000000;

    return {
      status: 'pass',
      message: 'CPU usage recorded',
      details: {
        user: `${userCPU.toFixed(2)}s`,
        system: `${systemCPU.toFixed(2)}s`,
      },
    };
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(
    checks: HealthCheckResult['checks']
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(checks).map((check) => check.status);

    if (statuses.includes('fail')) {
      return 'unhealthy';
    }

    if (statuses.includes('warn')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Readiness check (Kubernetes-style)
   * Returns true if system is ready to serve traffic
   */
  async isReady(): Promise<boolean> {
    try {
      const dbCheck = await this.checkDatabase();
      const redisCheck = await this.checkRedis();

      return dbCheck.status !== 'fail' && redisCheck.status !== 'fail';
    } catch {
      return false;
    }
  }

  /**
   * Liveness check (Kubernetes-style)
   * Returns true if process is alive
   */
  isAlive(): boolean {
    return true; // If this code runs, process is alive
  }
}

/**
 * Health check endpoint handlers
 */
export function createHealthCheckHandlers(healthCheckService: HealthCheckService) {
  return {
    /**
     * GET /health - Comprehensive health check
     */
    health: async (req: Request, res: Response) => {
      try {
        const result = await healthCheckService.performHealthCheck();

        const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;

        res.status(statusCode).json(result);
      } catch (error: any) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message,
        });
      }
    },

    /**
     * GET /health/ready - Readiness probe
     */
    ready: async (req: Request, res: Response) => {
      try {
        const isReady = await healthCheckService.isReady();

        if (isReady) {
          res.status(200).json({ status: 'ready' });
        } else {
          res.status(503).json({ status: 'not ready' });
        }
      } catch (error: any) {
        res.status(503).json({ status: 'not ready', error: error.message });
      }
    },

    /**
     * GET /health/live - Liveness probe
     */
    live: (req: Request, res: Response) => {
      const isAlive = healthCheckService.isAlive();

      if (isAlive) {
        res.status(200).json({ status: 'alive' });
      } else {
        res.status(503).json({ status: 'dead' });
      }
    },
  };
}
