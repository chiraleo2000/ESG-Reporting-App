import Redis from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

// Track if we've already logged the connection failure
let hasLoggedConnectionError = false;

// Create Redis client with limited retry
export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => {
    if (times > 3) {
      if (!hasLoggedConnectionError) {
        logger.warn('Redis connection failed after 3 attempts - disabling Redis');
        hasLoggedConnectionError = true;
      }
      return null; // Stop retrying
    }
    return Math.min(times * 100, 1000);
  },
  lazyConnect: true,
  enableOfflineQueue: false,
});

// Redis event handlers
redis.on('connect', () => {
  logger.info('Redis connected');
  hasLoggedConnectionError = false;
});

redis.on('error', (err) => {
  if (!hasLoggedConnectionError) {
    logger.error('Redis error:', err);
  }
});

redis.on('close', () => {
  if (!hasLoggedConnectionError) {
    logger.warn('Redis connection closed');
  }
});

// Redis helper functions
export const cache = {
  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', { key, error });
      return null;
    }
  },

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.setex(key, config.redis.ttlSeconds, serialized);
      }
    } catch (error) {
      logger.error('Redis set error:', { key, error });
    }
  },

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Redis del error:', { key, error });
    }
  },

  /**
   * Delete keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('Redis delPattern error:', { pattern, error });
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', { key, error });
      return false;
    }
  },

  /**
   * Get multiple values
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await redis.mget(keys);
      return values.map((v) => (v ? JSON.parse(v) : null));
    } catch (error) {
      logger.error('Redis mget error:', { keys, error });
      return keys.map(() => null);
    }
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await redis.quit();
    logger.info('Redis connection closed');
  },

  // Cache key generators
  keys: {
    emissionFactor: (material: string, category: string, tier?: string, region?: string) =>
      `ef:${material}:${category}:${tier || 'default'}:${region || 'global'}`,
    gridEF: (country: string, year: number) => `grid:${country}:${year}`,
    serpapi: (query: string) => `serpapi:${Buffer.from(query).toString('base64')}`,
    calculation: (projectId: string, type: string) => `calc:${projectId}:${type}`,
    report: (reportId: string) => `report:${reportId}`,
  },
};

export default cache;
