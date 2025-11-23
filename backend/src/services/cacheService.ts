/**
 * Cache Service
 *
 * Provides caching layer for frequently accessed data
 * Supports both Redis and in-memory caching
 */

import { CacheOptions } from '../types/reports';

// ===================================================================
// CACHE SERVICE
// ===================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private useRedis: boolean = process.env.USE_REDIS === 'true';
  private defaultTTL: number = 300; // 5 minutes in seconds

  constructor() {
    if (this.useRedis) {
      // In production: Initialize Redis connection
      console.log('CacheService initialized (Redis connection would be established here)');
    } else {
      console.log('CacheService initialized with in-memory cache');
    }

    // Start cleanup interval for expired entries
    this.startCleanupInterval();
  }

  /**
   * Set a value in cache
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = this.defaultTTL,
    options?: CacheOptions
  ): Promise<void> {
    const expiresAt = Date.now() + ttl * 1000;
    const tags = options?.tags || [];

    if (this.useRedis) {
      // In production: Redis SET with TTL
      // await this.redisClient.setex(key, ttl, JSON.stringify(value));
      // if (tags.length > 0) {
      //   for (const tag of tags) {
      //     await this.redisClient.sadd(`tag:${tag}`, key);
      //   }
      // }
    } else {
      this.cache.set(key, {
        value,
        expiresAt,
        tags,
      });
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.useRedis) {
      // In production: Redis GET
      // const value = await this.redisClient.get(key);
      // return value ? JSON.parse(value) : null;
      return null;
    }

    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Delete a specific key from cache
   */
  async delete(key: string): Promise<void> {
    if (this.useRedis) {
      // In production: Redis DEL
      // await this.redisClient.del(key);
    } else {
      this.cache.delete(key);
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidate(pattern: string): Promise<void> {
    if (this.useRedis) {
      // In production: Redis KEYS + DEL
      // const keys = await this.redisClient.keys(pattern);
      // if (keys.length > 0) {
      //   await this.redisClient.del(...keys);
      // }
    } else {
      const regex = this.patternToRegex(pattern);

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Invalidate all cache entries with a specific tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    if (this.useRedis) {
      // In production: Redis SMEMBERS + DEL
      // const keys = await this.redisClient.smembers(`tag:${tag}`);
      // if (keys.length > 0) {
      //   await this.redisClient.del(...keys);
      //   await this.redisClient.del(`tag:${tag}`);
      // }
    } else {
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.cache.entries()) {
        if (entry.tags.includes(tag)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Check if a key exists in cache
   */
  async has(key: string): Promise<boolean> {
    if (this.useRedis) {
      // In production: Redis EXISTS
      // const exists = await this.redisClient.exists(key);
      // return exists === 1;
      return false;
    }

    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get or set a value in cache
   * If key exists, return cached value
   * Otherwise, execute callback, cache result, and return
   */
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    ttl: number = this.defaultTTL,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await callback();
    await this.set(key, value, ttl, options);

    return value;
  }

  /**
   * Get multiple keys at once
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (this.useRedis) {
      // In production: Redis MGET
      // const values = await this.redisClient.mget(...keys);
      // return values.map(v => v ? JSON.parse(v) : null);
      return keys.map(() => null);
    }

    return Promise.all(keys.map((key) => this.get<T>(key)));
  }

  /**
   * Set multiple keys at once
   */
  async mset(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    await Promise.all(
      entries.map((entry) =>
        this.set(entry.key, entry.value, entry.ttl || this.defaultTTL)
      )
    );
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (this.useRedis) {
      // In production: Redis FLUSHDB
      // await this.redisClient.flushdb();
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  }> {
    if (this.useRedis) {
      // In production: Redis INFO
      return {
        size: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
      };
    }

    return {
      size: this.cache.size,
      hits: 0, // Would need to track this
      misses: 0, // Would need to track this
      hitRate: 0,
    };
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  /**
   * Convert glob pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  }

  /**
   * Start cleanup interval to remove expired entries
   */
  private startCleanupInterval(): void {
    if (!this.useRedis) {
      setInterval(() => {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, entry] of this.cache.entries()) {
          if (now > entry.expiresAt) {
            expiredKeys.push(key);
          }
        }

        for (const key of expiredKeys) {
          this.cache.delete(key);
        }

        if (expiredKeys.length > 0) {
          console.log(`[Cache] Cleaned up ${expiredKeys.length} expired entries`);
        }
      }, 60000); // Run every minute
    }
  }

  /**
   * Gracefully close cache connections
   */
  async close(): Promise<void> {
    if (this.useRedis) {
      // In production: Close Redis connection
      // await this.redisClient.quit();
      console.log('CacheService closed');
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
