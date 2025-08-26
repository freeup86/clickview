import { createClient, RedisClientType } from 'redis';
import { query } from '../config/database';
import { logger } from '../config/logger';

export class CacheService {
  private redisClient: RedisClientType | null = null;
  private useRedis: boolean = false;
  private inMemoryCache: Map<string, { data: any; expiresAt: Date }> = new Map();

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    if (process.env.REDIS_URL) {
      try {
        this.redisClient = createClient({
          url: process.env.REDIS_URL
        });
        
        this.redisClient.on('error', (err) => {
          logger.error('Redis Client Error', err);
          this.useRedis = false;
        });

        await this.redisClient.connect();
        this.useRedis = true;
        logger.info('Redis cache initialized');
      } catch (error) {
        logger.warn('Redis initialization failed, falling back to database cache', error);
        this.useRedis = false;
      }
    }
  }

  async get(workspaceId: string, key: string): Promise<any | null> {
    const cacheKey = `${workspaceId}:${key}`;

    // Try Redis first
    if (this.useRedis && this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.error('Redis get error', error);
      }
    }

    // Check in-memory cache
    const inMemory = this.inMemoryCache.get(cacheKey);
    if (inMemory && inMemory.expiresAt > new Date()) {
      return inMemory.data;
    } else if (inMemory) {
      this.inMemoryCache.delete(cacheKey);
    }

    // Try database cache
    try {
      const result = await query(
        `SELECT data FROM cached_data 
         WHERE workspace_id = $1 AND cache_key = $2 AND expires_at > NOW()`,
        [workspaceId, key]
      );
      
      if (result.rows.length > 0) {
        const data = result.rows[0].data;
        // Store in memory for faster access
        this.inMemoryCache.set(cacheKey, {
          data,
          expiresAt: new Date(Date.now() + 60000) // 1 minute in-memory cache
        });
        return data;
      }
    } catch (error) {
      logger.error('Database cache get error', error);
    }

    return null;
  }

  async set(
    workspaceId: string, 
    key: string, 
    data: any, 
    ttlSeconds: number = 300
  ): Promise<void> {
    const cacheKey = `${workspaceId}:${key}`;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    // Store in Redis if available
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.setEx(
          cacheKey,
          ttlSeconds,
          JSON.stringify(data)
        );
      } catch (error) {
        logger.error('Redis set error', error);
      }
    }

    // Store in memory
    this.inMemoryCache.set(cacheKey, { data, expiresAt });

    // Store in database
    try {
      await query(
        `INSERT INTO cached_data (workspace_id, cache_key, data_type, data, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (workspace_id, cache_key) 
         DO UPDATE SET data = $4, expires_at = $5, created_at = NOW()`,
        [workspaceId, key, 'json', JSON.stringify(data), expiresAt]
      );
    } catch (error) {
      logger.error('Database cache set error', error);
    }
  }

  async invalidate(workspaceId: string, pattern?: string): Promise<void> {
    // Clear from Redis
    if (this.useRedis && this.redisClient) {
      try {
        if (pattern) {
          const keys = await this.redisClient.keys(`${workspaceId}:${pattern}*`);
          if (keys.length > 0) {
            await this.redisClient.del(keys);
          }
        } else {
          const keys = await this.redisClient.keys(`${workspaceId}:*`);
          if (keys.length > 0) {
            await this.redisClient.del(keys);
          }
        }
      } catch (error) {
        logger.error('Redis invalidate error', error);
      }
    }

    // Clear from memory
    const prefix = pattern ? `${workspaceId}:${pattern}` : `${workspaceId}:`;
    for (const key of this.inMemoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.inMemoryCache.delete(key);
      }
    }

    // Clear from database
    try {
      if (pattern) {
        await query(
          `DELETE FROM cached_data 
           WHERE workspace_id = $1 AND cache_key LIKE $2`,
          [workspaceId, `${pattern}%`]
        );
      } else {
        await query(
          `DELETE FROM cached_data WHERE workspace_id = $1`,
          [workspaceId]
        );
      }
    } catch (error) {
      logger.error('Database cache invalidate error', error);
    }
  }

  async cleanExpired(): Promise<void> {
    // Clean in-memory cache
    const now = new Date();
    for (const [key, value] of this.inMemoryCache.entries()) {
      if (value.expiresAt <= now) {
        this.inMemoryCache.delete(key);
      }
    }

    // Clean database cache
    try {
      await query(`DELETE FROM cached_data WHERE expires_at < NOW()`);
    } catch (error) {
      logger.error('Failed to clean expired cache', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

export const cacheService = new CacheService();