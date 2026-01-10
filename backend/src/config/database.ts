import { Pool, PoolConfig } from 'pg';
import { config } from './env';
import { logger } from '../utils/logger';

// Database pool configuration
const poolConfig: PoolConfig = {
  connectionString: config.database.url,
  min: config.database.poolMin,
  max: config.database.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000, // Reduced for faster failure detection
};

// Create database pool
export const pool = new Pool(poolConfig);

// Pool event handlers
pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('error', (err) => {
  logger.error('Database pool error:', err);
});

pool.on('remove', () => {
  logger.debug('Database connection removed from pool');
});

// Database interface type
interface Database {
  query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
  queryOne<T = any>(text: string, params?: any[]): Promise<T | null>;
  transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
  end(): Promise<void>;
}

// Database helper functions
export const db: Database = {
  /**
   * Execute a query with parameters
   */
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug(`Query executed in ${duration}ms`, { text: text.substring(0, 100) });
      return { rows: result.rows as T[], rowCount: result.rowCount || 0 };
    } catch (error) {
      logger.error('Database query error:', { error, text: text.substring(0, 100) });
      throw error;
    }
  },

  /**
   * Get a single row
   */
  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const { rows } = await db.query<T>(text, params);
    return rows[0] || null;
  },

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Check database health
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Add timeout for health check
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database health check timeout')), 3000);
      });
      await Promise.race([pool.query('SELECT 1'), timeoutPromise]);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await pool.end();
    logger.info('Database pool closed');
  },

  /**
   * End connections (alias for close)
   */
  async end(): Promise<void> {
    await pool.end();
    logger.info('Database pool ended');
  },
};

export default db;
