/**
 * Cache Service Unit Tests
 * Tests for PERF-001 implementation
 */

import { CacheService } from '../../services/cache.service';

// Mock dependencies
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
  })),
}));

jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = require('../../config/database').query;

    // Reset environment
    delete process.env.REDIS_URL;

    // Create fresh instance
    cacheService = new CacheService();
  });

  afterEach(async () => {
    await cacheService.disconnect();
  });

  describe('get', () => {
    it('should return null when cache is empty', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await cacheService.get('workspace-123', 'test-key');

      expect(result).toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT data FROM cached_data'),
        ['workspace-123', 'test-key']
      );
    });

    it('should return cached data from database', async () => {
      const cachedData = { foo: 'bar' };
      mockQuery.mockResolvedValueOnce({
        rows: [{ data: cachedData }],
      });

      const result = await cacheService.get('workspace-123', 'test-key');

      expect(result).toEqual(cachedData);
    });

    it('should use in-memory cache for subsequent requests', async () => {
      const cachedData = { foo: 'bar' };
      mockQuery.mockResolvedValueOnce({
        rows: [{ data: cachedData }],
      });

      // First call - loads from database
      await cacheService.get('workspace-123', 'test-key');

      // Second call - should use in-memory cache
      const result = await cacheService.get('workspace-123', 'test-key');

      expect(result).toEqual(cachedData);
      // Should only have queried database once
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const result = await cacheService.get('workspace-123', 'test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store data in in-memory cache', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const data = { test: 'data' };
      await cacheService.set('workspace-123', 'test-key', data, 300);

      // Verify data is in cache
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No DB cache
      const result = await cacheService.get('workspace-123', 'test-key');

      expect(result).toEqual(data);
    });

    it('should store data in database cache', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const data = { test: 'data' };
      await cacheService.set('workspace-123', 'test-key', data, 300);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO cached_data'),
        expect.arrayContaining(['workspace-123', 'test-key'])
      );
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        cacheService.set('workspace-123', 'test-key', { test: 'data' }, 300)
      ).resolves.not.toThrow();
    });

    it('should use default TTL if not specified', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await cacheService.set('workspace-123', 'test-key', { test: 'data' });

      // Data should be cached with default TTL (300 seconds)
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('invalidate', () => {
    it('should invalidate cache for workspace', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      // First, set some data
      await cacheService.set('workspace-123', 'key1', { data: 1 });
      await cacheService.set('workspace-123', 'key2', { data: 2 });

      // Clear mocks to check invalidation calls
      mockQuery.mockClear();

      // Invalidate all workspace cache
      await cacheService.invalidate('workspace-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM cached_data WHERE workspace_id'),
        ['workspace-123']
      );
    });

    it('should invalidate cache with pattern', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await cacheService.invalidate('workspace-123', 'dashboard:');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('cache_key LIKE'),
        ['workspace-123', 'dashboard:%']
      );
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        cacheService.invalidate('workspace-123')
      ).resolves.not.toThrow();
    });
  });

  describe('cleanExpired', () => {
    it('should remove expired entries from in-memory cache', async () => {
      // Access private inMemoryCache via type casting
      const service = cacheService as any;

      // Add expired entry manually
      const expiredKey = 'workspace-123:expired-key';
      service.inMemoryCache.set(expiredKey, {
        data: { test: 'expired' },
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });

      // Add valid entry
      const validKey = 'workspace-123:valid-key';
      service.inMemoryCache.set(validKey, {
        data: { test: 'valid' },
        expiresAt: new Date(Date.now() + 60000), // 1 minute from now
      });

      mockQuery.mockResolvedValue({ rows: [] });
      await cacheService.cleanExpired();

      expect(service.inMemoryCache.has(expiredKey)).toBe(false);
      expect(service.inMemoryCache.has(validKey)).toBe(true);
    });

    it('should clean expired entries from database', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await cacheService.cleanExpired();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM cached_data WHERE expires_at < NOW()')
      );
    });
  });

  describe('disconnect', () => {
    it('should disconnect without error', async () => {
      await expect(cacheService.disconnect()).resolves.not.toThrow();
    });
  });
});

describe('CacheService with Redis', () => {
  let cacheService: CacheService;
  let mockRedisClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Enable Redis
    process.env.REDIS_URL = 'redis://localhost:6379';

    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      get: jest.fn(),
      setEx: jest.fn(),
      keys: jest.fn(),
      del: jest.fn(),
    };

    const redis = require('redis');
    redis.createClient.mockReturnValue(mockRedisClient);
  });

  afterEach(async () => {
    delete process.env.REDIS_URL;
    if (cacheService) {
      await cacheService.disconnect();
    }
  });

  it('should try Redis first when available', async () => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ cached: 'data' }));

    cacheService = new CacheService();

    // Wait for Redis initialization
    await new Promise(resolve => setTimeout(resolve, 100));

    const result = await cacheService.get('workspace-123', 'test-key');

    expect(result).toEqual({ cached: 'data' });
  });

  it('should fall back to database when Redis fails', async () => {
    mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

    const mockQuery = require('../../config/database').query;
    mockQuery.mockResolvedValue({ rows: [{ data: { db: 'data' } }] });

    cacheService = new CacheService();

    await new Promise(resolve => setTimeout(resolve, 100));

    const result = await cacheService.get('workspace-123', 'test-key');

    expect(result).toEqual({ db: 'data' });
  });
});
