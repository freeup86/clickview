/**
 * Cache Middleware
 *
 * Production-ready caching middleware for API responses
 * with configurable TTL, cache invalidation, and conditional caching.
 */

import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache.service';
import { logger } from '../config/logger';
import crypto from 'crypto';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
  condition?: (req: Request) => boolean;
  invalidateOn?: string[]; // HTTP methods that invalidate cache
  varyBy?: string[]; // Headers to include in cache key
}

const DEFAULT_TTL = 300; // 5 minutes
const CACHE_HEADER = 'X-Cache';

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request, prefix: string, varyBy: string[]): string {
  const parts = [
    prefix,
    req.method,
    req.originalUrl,
  ];

  // Add vary headers to key
  for (const header of varyBy) {
    const value = req.get(header);
    if (value) {
      parts.push(`${header}:${value}`);
    }
  }

  // Add user ID if authenticated
  if (req.user?.id) {
    parts.push(`user:${req.user.id}`);
  }

  // Hash the key to keep it manageable
  const keyString = parts.join('|');
  return crypto.createHash('md5').update(keyString).digest('hex');
}

/**
 * Cache middleware factory
 */
export function cache(options: CacheOptions = {}) {
  const {
    ttl = DEFAULT_TTL,
    keyPrefix = 'api',
    condition = () => true,
    invalidateOn = ['POST', 'PUT', 'PATCH', 'DELETE'],
    varyBy = ['Authorization'],
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip caching for invalidating methods
    if (invalidateOn.includes(req.method)) {
      return next();
    }

    // Skip if condition not met
    if (!condition(req)) {
      return next();
    }

    // Get workspace ID (required for cache)
    const workspaceId = req.params.workspaceId ||
                        req.query.workspaceId as string ||
                        req.user?.workspaceId ||
                        'global';

    const cacheKey = generateCacheKey(req, keyPrefix, varyBy);

    try {
      // Try to get from cache
      const cached = await cacheService.get(workspaceId, cacheKey);

      if (cached) {
        res.setHeader(CACHE_HEADER, 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        res.json(cached);
        return;
      }
    } catch (error) {
      logger.warn('Cache read error', { error, cacheKey });
    }

    // Cache miss - intercept response
    res.setHeader(CACHE_HEADER, 'MISS');
    res.setHeader('X-Cache-Key', cacheKey);

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to cache response
    res.json = function(body: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.set(workspaceId, cacheKey, body, ttl).catch((error) => {
          logger.warn('Cache write error', { error, cacheKey });
        });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Cache invalidation middleware
 * Clears cache when data is modified
 */
export function invalidateCache(patterns: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override to invalidate cache after successful response
    res.json = function(body: any) {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const workspaceId = req.params.workspaceId ||
                            req.query.workspaceId as string ||
                            req.user?.workspaceId ||
                            'global';

        // Invalidate all patterns
        for (const pattern of patterns) {
          cacheService.invalidate(workspaceId, pattern).catch((error) => {
            logger.warn('Cache invalidation error', { error, pattern });
          });
        }
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Specific cache configurations for common use cases
 */
export const cacheConfigs = {
  // Dashboard data - cache for 5 minutes
  dashboard: cache({
    ttl: 300,
    keyPrefix: 'dashboard',
  }),

  // Widget data - cache for 2 minutes
  widget: cache({
    ttl: 120,
    keyPrefix: 'widget',
  }),

  // User data - cache for 10 minutes
  user: cache({
    ttl: 600,
    keyPrefix: 'user',
    varyBy: ['Authorization'],
  }),

  // Static data (lists, spaces) - cache for 30 minutes
  static: cache({
    ttl: 1800,
    keyPrefix: 'static',
  }),

  // Report data - cache for 1 minute
  report: cache({
    ttl: 60,
    keyPrefix: 'report',
  }),

  // Analytics/aggregated data - cache for 15 minutes
  analytics: cache({
    ttl: 900,
    keyPrefix: 'analytics',
  }),
};

/**
 * Cache warming utility
 */
export async function warmCache(
  workspaceId: string,
  keyPrefix: string,
  dataFetcher: () => Promise<any>,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  try {
    const data = await dataFetcher();
    await cacheService.set(workspaceId, keyPrefix, data, ttl);
    logger.info('Cache warmed', { workspaceId, keyPrefix });
  } catch (error) {
    logger.error('Cache warming failed', { error, workspaceId, keyPrefix });
  }
}

export default {
  cache,
  invalidateCache,
  cacheConfigs,
  warmCache,
};
