/**
 * Database Config Unit Tests
 * Covers: db.query, db.queryOne, db.transaction, db.healthCheck, db.close, db.end
 */

// Mock pg module
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockRelease = jest.fn();
const mockEnd = jest.fn();
const mockOn = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    connect: mockConnect,
    end: mockEnd,
    on: mockOn,
  })),
}));

jest.mock('../../src/config/env', () => ({
  config: {
    database: {
      url: 'postgresql://postgres:postgres123@localhost:5434/esg_reporting',
      poolMin: 2,
      poolMax: 10,
    },
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { db, pool } from '../../src/config/database';

describe('Database Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockConnect.mockReset();
  });

  // ==========================================================================
  // db.query
  // ==========================================================================
  describe('db.query', () => {
    it('should execute a query and return rows', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

      const result = await db.query('SELECT * FROM users WHERE id = $1', ['u-1']);

      expect(result.rows).toEqual([{ id: 1 }]);
      expect(result.rowCount).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', ['u-1']);
    });

    it('should handle query with no params', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await db.query('SELECT 1');

      expect(result.rows).toEqual([]);
    });

    it('should throw on query error', async () => {
      mockQuery.mockRejectedValue(new Error('connection refused'));

      await expect(db.query('SELECT 1')).rejects.toThrow('connection refused');
    });

    it('should handle null rowCount', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: null });

      const result = await db.query('INSERT INTO users VALUES ($1)', ['u-1']);
      expect(result.rowCount).toBe(0);
    });
  });

  // ==========================================================================
  // db.queryOne
  // ==========================================================================
  describe('db.queryOne', () => {
    it('should return first row', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'u-1', name: 'Test' }], rowCount: 1 });

      const result = await db.queryOne('SELECT * FROM users WHERE id = $1', ['u-1']);

      expect(result).toEqual({ id: 'u-1', name: 'Test' });
    });

    it('should return null when no rows', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await db.queryOne('SELECT * FROM users WHERE id = $1', ['nonexistent']);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // db.transaction
  // ==========================================================================
  describe('db.transaction', () => {
    it('should commit on success', async () => {
      const clientQuery = jest.fn().mockResolvedValue({ rows: [] });
      const mockClient = { query: clientQuery, release: mockRelease };
      mockConnect.mockResolvedValue(mockClient);

      const result = await db.transaction(async (client) => {
        await client.query('INSERT INTO users VALUES ($1)', ['u-1']);
        return 'done';
      });

      expect(result).toBe('done');
      expect(clientQuery).toHaveBeenCalledWith('BEGIN');
      expect(clientQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const clientQuery = jest.fn().mockResolvedValue({ rows: [] });
      const mockClient = { query: clientQuery, release: mockRelease };
      mockConnect.mockResolvedValue(mockClient);

      await expect(
        db.transaction(async () => {
          throw new Error('transaction error');
        })
      ).rejects.toThrow('transaction error');

      expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // db.healthCheck
  // ==========================================================================
  describe('db.healthCheck', () => {
    it('should return true on success', async () => {
      mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const result = await db.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false on failure', async () => {
      mockQuery.mockRejectedValue(new Error('connection refused'));

      const result = await db.healthCheck();
      expect(result).toBe(false);
    });

    it('should return false on timeout', async () => {
      mockQuery.mockImplementation(() => new Promise((r) => setTimeout(r, 5000)));

      const result = await db.healthCheck();
      expect(result).toBe(false);
    }, 10000);
  });

  // ==========================================================================
  // db.close / db.end
  // ==========================================================================
  describe('db.close', () => {
    it('should close the pool', async () => {
      mockEnd.mockResolvedValue(undefined);
      await db.close();
      expect(mockEnd).toHaveBeenCalled();
    });
  });

  describe('db.end', () => {
    it('should end the pool', async () => {
      mockEnd.mockResolvedValue(undefined);
      await db.end();
      expect(mockEnd).toHaveBeenCalled();
    });
  });
});
