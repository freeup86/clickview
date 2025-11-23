/**
 * Redis Configuration and Security
 *
 * Secure Redis connection with authentication, TLS, and best practices
 */

import { RedisOptions } from 'ioredis';
import Redis from 'ioredis';
import { logger } from './logger';

// Redis connection configuration
export const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),

  // Authentication
  password: process.env.REDIS_PASSWORD,
  username: process.env.REDIS_USERNAME, // Redis 6.0+ ACL support

  // Database selection
  db: parseInt(process.env.REDIS_DB || '0'),

  // TLS/SSL Configuration (required in production)
  tls: process.env.REDIS_TLS === 'true' ? {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    ca: process.env.REDIS_CA_CERT,
    cert: process.env.REDIS_CLIENT_CERT,
    key: process.env.REDIS_CLIENT_KEY,
  } : undefined,

  // Connection options
  connectTimeout: 10000, // 10 seconds
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },

  // Reconnection
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,

  // Timeouts
  commandTimeout: 5000, // 5 seconds max per command

  // Connection pool
  lazyConnect: false,
  keepAlive: 30000, // 30 seconds

  // Sentinel configuration (for high availability)
  sentinels: process.env.REDIS_SENTINELS ?
    JSON.parse(process.env.REDIS_SENTINELS).map((s: string) => {
      const [host, port] = s.split(':');
      return { host, port: parseInt(port) };
    }) : undefined,
  sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD,
  name: process.env.REDIS_SENTINEL_NAME || 'mymaster',

  // Cluster configuration (for horizontal scaling)
  // Use this OR sentinels, not both
  // cluster: process.env.REDIS_CLUSTER === 'true',
};

/**
 * Create Redis client with security and monitoring
 */
export function createRedisClient(): Redis {
  const client = new Redis(redisConfig);

  // Connection events
  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('ready', () => {
    logger.info('Redis client ready');
  });

  client.on('error', (error) => {
    logger.error('Redis client error', { error: error.message });
  });

  client.on('close', () => {
    logger.warn('Redis connection closed');
  });

  client.on('reconnecting', (delay: number) => {
    logger.info(`Redis reconnecting in ${delay}ms`);
  });

  // Security validation
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.REDIS_PASSWORD) {
      logger.error('REDIS_PASSWORD not set in production!');
      throw new Error('Redis password required in production');
    }

    if (process.env.REDIS_TLS !== 'true') {
      logger.warn('Redis TLS not enabled in production - highly recommended!');
    }
  }

  return client;
}

/**
 * Redis connection pool for multiple clients
 */
class RedisPool {
  private clients: Map<string, Redis> = new Map();

  getClient(name: string = 'default'): Redis {
    if (!this.clients.has(name)) {
      const client = createRedisClient();
      this.clients.set(name, client);
    }
    return this.clients.get(name)!;
  }

  async closeAll(): Promise<void> {
    const promises = Array.from(this.clients.values()).map(client => client.quit());
    await Promise.all(promises);
    this.clients.clear();
    logger.info('All Redis connections closed');
  }
}

export const redisPool = new RedisPool();

/**
 * Redis security best practices checker
 */
export function validateRedisSecurityConfig(): string[] {
  const warnings: string[] = [];

  if (!process.env.REDIS_PASSWORD) {
    warnings.push('No Redis password configured - authentication disabled');
  }

  if (process.env.REDIS_TLS !== 'true' && process.env.NODE_ENV === 'production') {
    warnings.push('Redis TLS not enabled in production');
  }

  if (!process.env.REDIS_USERNAME && process.env.REDIS_PASSWORD) {
    warnings.push('Using default Redis user - consider ACL configuration');
  }

  if (!process.env.REDIS_SENTINELS && process.env.NODE_ENV === 'production') {
    warnings.push('Redis Sentinel not configured - no high availability');
  }

  return warnings;
}

/**
 * Cache key prefix to avoid collisions
 */
export const CACHE_PREFIXES = {
  SESSION: 'session:',
  USER: 'user:',
  PERMISSION: 'permission:',
  ABAC_POLICY: 'abac:',
  RATE_LIMIT: 'ratelimit:',
  TEMP_TOKEN: 'token:',
  CACHE: 'cache:',
} as const;

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 3600,          // 1 hour
  DAY: 86400,          // 24 hours
  WEEK: 604800,        // 7 days
  SESSION: 1800,       // 30 minutes
  PERMISSION: 300,     // 5 minutes
  ABAC_POLICY: 300,    // 5 minutes
} as const;

/**
 * Safe Redis operations with error handling
 */
export async function safeRedisGet(client: Redis, key: string): Promise<string | null> {
  try {
    return await client.get(key);
  } catch (error) {
    logger.error('Redis GET error', { key, error });
    return null;
  }
}

export async function safeRedisSet(
  client: Redis,
  key: string,
  value: string,
  ttl?: number
): Promise<boolean> {
  try {
    if (ttl) {
      await client.setex(key, ttl, value);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (error) {
    logger.error('Redis SET error', { key, error });
    return false;
  }
}

export async function safeRedisDel(client: Redis, key: string): Promise<boolean> {
  try {
    await client.del(key);
    return true;
  } catch (error) {
    logger.error('Redis DEL error', { key, error });
    return false;
  }
}

/**
 * Health check for Redis
 */
export async function redisHealthCheck(client: Redis): Promise<boolean> {
  try {
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return false;
  }
}

export default {
  redisConfig,
  createRedisClient,
  redisPool,
  validateRedisSecurityConfig,
  CACHE_PREFIXES,
  CACHE_TTL,
  safeRedisGet,
  safeRedisSet,
  safeRedisDel,
  redisHealthCheck,
};
