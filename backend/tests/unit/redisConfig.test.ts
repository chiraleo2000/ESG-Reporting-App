/**
 * Redis Config Unit Tests
 * Covers: cacheKeys generators, redisClient wrapper, cache object
 */

// Mock ioredis
const mockRedisGet = jest.fn();
const mockRedisSetex = jest.fn();
const mockRedisDel = jest.fn();
const mockRedisKeys = jest.fn();
const mockRedisExists = jest.fn();
const mockRedisMget = jest.fn();
const mockRedisPing = jest.fn();
const mockRedisQuit = jest.fn();
const mockRedisOn = jest.fn();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: mockRedisGet,
    setex: mockRedisSetex,
    del: mockRedisDel,
    keys: mockRedisKeys,
    exists: mockRedisExists,
    mget: mockRedisMget,
    ping: mockRedisPing,
    quit: mockRedisQuit,
    on: mockRedisOn,
  }));
});

jest.mock('../../src/config/env', () => ({
  config: {
    redis: {
      url: 'redis://localhost:6379',
      ttlSeconds: 3600,
    },
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { cache, cacheKeys, redisClient } from '../../src/config/redis';

describe('Redis Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockReset();
    mockRedisSetex.mockReset();
    mockRedisDel.mockReset();
  });

  // ==========================================================================
  // cacheKeys generators
  // ==========================================================================
  describe('cacheKeys', () => {
    it('emissionFactor key', () => {
      expect(cacheKeys.emissionFactor('steel', 'direct', 'tier2', 'EU')).toBe('ef:steel:direct:tier2:EU');
    });

    it('emissionFactor key with defaults', () => {
      expect(cacheKeys.emissionFactor('cement', 'process')).toBe('ef:cement:process:default:global');
    });

    it('gridEF key', () => {
      expect(cacheKeys.gridEF('TH', 2024)).toBe('grid:TH:2024');
    });

    it('serpapi key', () => {
      const key = cacheKeys.serpapi('test query');
      expect(key).toContain('serpapi:');
    });

    it('calculation key', () => {
      expect(cacheKeys.calculation('p-1', 'cfp')).toBe('calc:p-1:cfp');
    });

    it('report key', () => {
      expect(cacheKeys.report('r-1')).toBe('report:r-1');
    });

    it('project key', () => {
      expect(cacheKeys.project('p-1')).toBe('project:p-1');
    });

    it('userProjects key', () => {
      expect(cacheKeys.userProjects('u-1')).toBe('user:u-1:projects');
    });

    it('projectActivities key', () => {
      expect(cacheKeys.projectActivities('p-1')).toBe('project:p-1:activities');
    });

    it('tokenBlacklist key', () => {
      expect(cacheKeys.tokenBlacklist('tok-1')).toBe('blacklist:tok-1');
    });
  });

  // ==========================================================================
  // cache object
  // ==========================================================================
  describe('cache.get', () => {
    it('should return parsed JSON', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify({ value: 42 }));

      const result = await cache.get('test-key');
      expect(result).toEqual({ value: 42 });
    });

    it('should return null when key not found', async () => {
      mockRedisGet.mockResolvedValue(null);

      const result = await cache.get('missing-key');
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockRedisGet.mockRejectedValue(new Error('connection error'));

      const result = await cache.get('key');
      expect(result).toBeNull();
    });
  });

  describe('cache.set', () => {
    it('should set with custom TTL', async () => {
      mockRedisSetex.mockResolvedValue('OK');

      await cache.set('key', { data: 'value' }, 300);

      expect(mockRedisSetex).toHaveBeenCalledWith('key', 300, JSON.stringify({ data: 'value' }));
    });

    it('should set with default TTL', async () => {
      mockRedisSetex.mockResolvedValue('OK');

      await cache.set('key', 'value');

      expect(mockRedisSetex).toHaveBeenCalledWith('key', 3600, JSON.stringify('value'));
    });

    it('should handle set errors gracefully', async () => {
      mockRedisSetex.mockRejectedValue(new Error('write error'));

      await expect(cache.set('key', 'value')).resolves.toBeUndefined();
    });
  });

  describe('cache.del', () => {
    it('should delete a key', async () => {
      mockRedisDel.mockResolvedValue(1);

      await cache.del('key');
      expect(mockRedisDel).toHaveBeenCalledWith('key');
    });

    it('should handle delete errors gracefully', async () => {
      mockRedisDel.mockRejectedValue(new Error('del error'));

      await expect(cache.del('key')).resolves.toBeUndefined();
    });
  });

  describe('cache.delPattern', () => {
    it('should delete matching keys', async () => {
      mockRedisKeys.mockResolvedValue(['key1', 'key2']);
      mockRedisDel.mockResolvedValue(2);

      await cache.delPattern('key*');

      expect(mockRedisKeys).toHaveBeenCalledWith('key*');
      expect(mockRedisDel).toHaveBeenCalledWith('key1', 'key2');
    });

    it('should skip delete when no keys match', async () => {
      mockRedisKeys.mockResolvedValue([]);

      await cache.delPattern('nomatch*');

      expect(mockRedisDel).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedisKeys.mockRejectedValue(new Error('keys error'));
      await expect(cache.delPattern('*')).resolves.toBeUndefined();
    });
  });

  describe('cache.exists', () => {
    it('should return true when key exists', async () => {
      mockRedisExists.mockResolvedValue(1);
      expect(await cache.exists('key')).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedisExists.mockResolvedValue(0);
      expect(await cache.exists('key')).toBe(false);
    });

    it('should return false on error', async () => {
      mockRedisExists.mockRejectedValue(new Error('err'));
      expect(await cache.exists('key')).toBe(false);
    });
  });

  describe('cache.mget', () => {
    it('should return parsed values', async () => {
      mockRedisMget.mockResolvedValue([JSON.stringify({ a: 1 }), null, JSON.stringify({ b: 2 })]);

      const result = await cache.mget(['k1', 'k2', 'k3']);
      expect(result).toEqual([{ a: 1 }, null, { b: 2 }]);
    });

    it('should return nulls on error', async () => {
      mockRedisMget.mockRejectedValue(new Error('mget error'));

      const result = await cache.mget(['k1', 'k2']);
      expect(result).toEqual([null, null]);
    });
  });

  describe('cache.healthCheck', () => {
    it('should return true on successful ping', async () => {
      mockRedisPing.mockResolvedValue('PONG');
      expect(await cache.healthCheck()).toBe(true);
    });

    it('should return false on ping failure', async () => {
      mockRedisPing.mockRejectedValue(new Error('no connection'));
      expect(await cache.healthCheck()).toBe(false);
    });
  });

  describe('cache.close', () => {
    it('should quit redis connection', async () => {
      mockRedisQuit.mockResolvedValue('OK');
      await cache.close();
      expect(mockRedisQuit).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // redisClient wrapper
  // ==========================================================================
  describe('redisClient', () => {
    it('should get parsed value', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify({ v: 1 }));
      const result = await redisClient.get('key');
      expect(result).toEqual({ v: 1 });
    });

    it('should return null on get miss', async () => {
      mockRedisGet.mockResolvedValue(null);
      expect(await redisClient.get('missing')).toBeNull();
    });

    it('should set with custom ttl', async () => {
      mockRedisSetex.mockResolvedValue('OK');
      await redisClient.set('key', 'val', 60);
      expect(mockRedisSetex).toHaveBeenCalledWith('key', 60, JSON.stringify('val'));
    });

    it('should set with default ttl', async () => {
      mockRedisSetex.mockResolvedValue('OK');
      await redisClient.set('key', 'val');
      expect(mockRedisSetex).toHaveBeenCalledWith('key', 3600, JSON.stringify('val'));
    });

    it('should delete key', async () => {
      mockRedisDel.mockResolvedValue(1);
      await redisClient.del('key');
      expect(mockRedisDel).toHaveBeenCalledWith('key');
    });

    it('should setex', async () => {
      mockRedisSetex.mockResolvedValue('OK');
      await redisClient.setex('key', 120, 'value');
      expect(mockRedisSetex).toHaveBeenCalledWith('key', 120, 'value');
    });

    it('should handle get error', async () => {
      mockRedisGet.mockRejectedValue(new Error('err'));
      expect(await redisClient.get('key')).toBeNull();
    });

    it('should handle set error', async () => {
      mockRedisSetex.mockRejectedValue(new Error('err'));
      await expect(redisClient.set('key', 'val')).resolves.toBeUndefined();
    });
  });
});
