/**
 * Audit Controller Unit Tests
 * Tests getProjectAuditLogs, getAuditSummary, exportAuditLogs, getAuditLog,
 * getAuditRetentionInfo, filterAuditLogs, searchAuditLogs
 */
import { Request, Response } from 'express';

jest.mock('../../src/config/database', () => ({
  db: { query: jest.fn() },
  pool: { connect: jest.fn() },
}));

jest.mock('../../src/config/env', () => ({
  config: {
    audit: { retentionDays: 365 },
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('mock-audit-id'),
}));

jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn().mockReturnValue({}),
    json_to_sheet: jest.fn().mockReturnValue({ '!cols': [] }),
    book_append_sheet: jest.fn(),
  },
  write: jest.fn().mockReturnValue(Buffer.from('excel-data')),
}));

import { db } from '../../src/config/database';
import {
  getProjectAuditLogs, getAuditSummary, exportAuditLogs,
  getAuditLog, getAuditRetentionInfo, filterAuditLogs, searchAuditLogs,
} from '../../src/controllers/auditController';

const mockDb = db as jest.Mocked<typeof db>;

const mockAuditRow = {
  id: 'aud-1', user_id: 'user-1', user_name: 'Test', user_email: 'a@b.com',
  project_id: 'proj-1', action: 'CREATE', entity_type: 'project',
  entity_id: 'proj-1', details: { name: 'Test' },
  ip_address: '127.0.0.1', user_agent: 'test-agent',
  created_at: new Date('2025-01-15T12:00:00Z'),
};

describe('Audit Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {}, params: { projectId: 'proj-1' }, query: {},
      user: { id: 'user-1', userId: 'user-1', email: 'a@b.com', role: 'owner', name: 'Test', signatureAuthorized: false } as any,
    };
    res = {
      status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(), send: jest.fn(),
    };
  });

  // ===================== GET PROJECT AUDIT LOGS =====================
  describe('getProjectAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      req.query = { page: '1', limit: '10' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockAuditRow, { ...mockAuditRow, id: 'aud-2', action: 'UPDATE' }], rowCount: 2 });

      await getProjectAuditLogs(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'aud-1', action: 'CREATE' }),
        ]),
        pagination: expect.objectContaining({ total: 2 }),
      });
    });

    it('should filter by action, entityType, userId, date range', async () => {
      req.query = {
        action: 'CREATE', entityType: 'project', userId: 'user-1',
        startDate: '2025-01-01', endDate: '2025-12-31',
      };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockAuditRow], rowCount: 1 });

      await getProjectAuditLogs(req as Request, res as Response);

      const querySQL = (mockDb.query as jest.Mock).mock.calls[0][0];
      expect(querySQL).toContain('action');
      expect(querySQL).toContain('entity_type');
      expect(querySQL).toContain('user_id');
      expect(querySQL).toContain('created_at >=');
      expect(querySQL).toContain('created_at <=');
    });
  });

  // ===================== GET AUDIT SUMMARY =====================
  describe('getAuditSummary', () => {
    it('should return audit summary with stats', async () => {
      req.query = { days: '30' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ action: 'CREATE', count: '10' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ entity_type: 'project', count: '8' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ name: 'Test', email: 'a@b.com', count: '5' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ date: '2025-01-15', count: '3' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '50' }], rowCount: 1 });

      await getAuditSummary(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          period: expect.objectContaining({ days: 30 }),
          total: 50,
          byAction: expect.any(Array),
          byEntityType: expect.any(Array),
          topUsers: expect.any(Array),
          dailyActivity: expect.any(Array),
        }),
      });
    });
  });

  // ===================== EXPORT AUDIT LOGS =====================
  describe('exportAuditLogs', () => {
    it('should export as CSV', async () => {
      req.query = { format: 'csv' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAuditRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ name: 'Sugar Factory' }], rowCount: 1 });

      await exportAuditLogs(req as Request, res as Response);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.send).toHaveBeenCalled();
    });

    it('should export as Excel (XLSX)', async () => {
      req.query = { format: 'xlsx' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAuditRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ name: 'Sugar Factory' }], rowCount: 1 });

      await exportAuditLogs(req as Request, res as Response);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.send).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      req.query = { format: 'csv', startDate: '2025-01-01', endDate: '2025-06-30' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAuditRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ name: 'Factory' }], rowCount: 1 });

      await exportAuditLogs(req as Request, res as Response);

      const querySQL = (mockDb.query as jest.Mock).mock.calls[0][0];
      expect(querySQL).toContain('created_at >=');
      expect(querySQL).toContain('created_at <=');
    });
  });

  // ===================== GET SINGLE AUDIT LOG =====================
  describe('getAuditLog', () => {
    it('should return a single audit log', async () => {
      req.params = { id: 'aud-1' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [mockAuditRow], rowCount: 1 });

      await getAuditLog(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 'aud-1', action: 'CREATE' }),
      });
    });

    it('should throw NotFoundError', async () => {
      req.params = { id: 'gone' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(getAuditLog(req as Request, res as Response))
        .rejects.toThrow('Audit log not found');
    });
  });

  // ===================== AUDIT RETENTION INFO =====================
  describe('getAuditRetentionInfo', () => {
    it('should return retention stats', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1000' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '50' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ created_at: new Date('2024-01-01') }], rowCount: 1 });

      await getAuditRetentionInfo(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          retentionDays: 365,
          totalLogs: 1000,
          expiredLogs: 50,
          oldestLog: expect.any(String),
        }),
      });
    });

    it('should handle empty audit log table', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await getAuditRetentionInfo(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          totalLogs: 0,
          expiredLogs: 0,
          oldestLog: null,
        }),
      });
    });
  });

  // ===================== FILTER AUDIT LOGS =====================
  describe('filterAuditLogs', () => {
    it('should filter by action and entity type', async () => {
      req.query = { action: 'CREATE', entityType: 'activity' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockAuditRow], rowCount: 1 });

      await filterAuditLogs(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        pagination: expect.objectContaining({ total: 3 }),
      });
    });

    it('should filter by date range', async () => {
      req.query = { startDate: '2025-01-01', endDate: '2025-06-30' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockAuditRow], rowCount: 1 });

      await filterAuditLogs(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        pagination: expect.any(Object),
      });
    });
  });

  // ===================== SEARCH AUDIT LOGS =====================
  describe('searchAuditLogs', () => {
    it('should search across all projects', async () => {
      req.params = {};
      req.query = { query: 'sugar', page: '1', limit: '10' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ ...mockAuditRow, project_name: 'Sugar Factory' }], rowCount: 1,
        });

      await searchAuditLogs(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ projectName: 'Sugar Factory' }),
        ]),
        pagination: expect.objectContaining({ total: 2 }),
      });
    });

    it('should filter by all parameters', async () => {
      req.query = {
        query: 'test', action: 'CREATE', entityType: 'project',
        userId: 'user-1', projectId: 'proj-1',
        startDate: '2025-01-01', endDate: '2025-12-31',
      };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...mockAuditRow, project_name: 'Test' }], rowCount: 1 });

      await searchAuditLogs(req as Request, res as Response);

      const querySQL = (mockDb.query as jest.Mock).mock.calls[0][0];
      expect(querySQL).toContain('ILIKE');
      expect(querySQL).toContain('action');
      expect(querySQL).toContain('entity_type');
      expect(querySQL).toContain('user_id');
      expect(querySQL).toContain('project_id');
    });
  });
});
