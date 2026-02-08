/**
 * Report Controller Unit Tests
 * Tests generate, batch generate, CRUD, download, preview, status
 */
import { Request, Response } from 'express';

jest.mock('../../src/config/database', () => ({
  db: { query: jest.fn() },
  pool: { connect: jest.fn() },
}));

jest.mock('../../src/config/redis', () => ({
  redisClient: {
    get: jest.fn(), set: jest.fn().mockResolvedValue('OK'), del: jest.fn(),
    keys: { project: (id: string) => `project:${id}` },
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('mock-report-id'),
  roundTo: jest.fn((n: number, d: number) => Number(n.toFixed(d))),
}));

jest.mock('../../src/services/reportService', () => ({
  generateReportData: jest.fn().mockResolvedValue({ project: {}, emissions: {}, standard: 'eu_cbam' }),
  validateReportData: jest.fn().mockResolvedValue({ warnings: [], errors: [], missingRequired: [], completeness: 95 }),
  generateReportFiles: jest.fn().mockResolvedValue({ filePath: '/reports/mock.pdf' }),
  getOverlappingFields: jest.fn().mockResolvedValue({ conflicts: {} }),
  getStandardRequirements: jest.fn().mockResolvedValue({ requiredFields: [], optionalFields: [] }),
}));

import { db } from '../../src/config/database';
import {
  generateReport, getReports, getReport, updateReportStatus,
  deleteReport, previewReport, getReportRequirements,
  generateBatchReports,
} from '../../src/controllers/reportController';

const mockDb = db as jest.Mocked<typeof db>;

describe('Report Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {}, params: { projectId: 'proj-1' }, query: {},
      user: { id: 'user-1', userId: 'user-1', email: 'a@b.com', role: 'owner', name: 'Test', signatureAuthorized: false } as any,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      download: jest.fn(),
    };
  });

  // ===================== GENERATE REPORT =====================
  describe('generateReport', () => {
    it('should generate a report successfully', async () => {
      req.body = { standard: 'eu_cbam', format: 'pdf' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'proj-1', reporting_standards: ['eu_cbam', 'thai_esg'] }], rowCount: 1 }) // project
        .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 }) // activity count
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT report
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await generateReport(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'mock-report-id',
          standard: 'eu_cbam',
          status: 'generated',
        }),
      });
    });

    it('should reject standard not configured for project', async () => {
      req.body = { standard: 'china_carbon_market' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'proj-1', reporting_standards: ['eu_cbam'] }], rowCount: 1 });

      await expect(generateReport(req as Request, res as Response))
        .rejects.toThrow(/not configured for this project/);
    });

    it('should reject when no calculated activities exist', async () => {
      req.body = { standard: 'eu_cbam' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'proj-1', reporting_standards: ['eu_cbam'] }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

      await expect(generateReport(req as Request, res as Response))
        .rejects.toThrow('No calculated activities found');
    });

    it('should throw NotFoundError for missing project', async () => {
      req.body = { standard: 'eu_cbam' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(generateReport(req as Request, res as Response))
        .rejects.toThrow('Project not found');
    });
  });

  // ===================== BATCH GENERATE =====================
  describe('generateBatchReports', () => {
    it('should generate reports for multiple standards', async () => {
      req.body = { standards: ['eu_cbam', 'thai_esg'], format: 'pdf' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'proj-1', reporting_standards: ['eu_cbam', 'thai_esg'] }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // report 1 insert
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // report 2 insert
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await generateBatchReports(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          summary: expect.objectContaining({ requested: 2, generated: 2 }),
        }),
      });
    });

    it('should reject when no valid standards', async () => {
      req.body = { standards: ['nonexistent'] };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'proj-1', reporting_standards: ['eu_cbam'] }], rowCount: 1 });

      await expect(generateBatchReports(req as Request, res as Response))
        .rejects.toThrow('None of the specified standards are configured');
    });
  });

  // ===================== GET REPORTS =====================
  describe('getReports', () => {
    it('should return paginated reports', async () => {
      req.query = { page: '1', limit: '10' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id: 'rpt-1', standard: 'eu_cbam', format: 'pdf', status: 'generated',
            validation_warnings: [], validation_errors: [],
            generated_by_name: 'Admin', signed_at: null, signed_by: null,
            created_at: new Date(), updated_at: new Date(),
          }],
          rowCount: 1,
        });

      await getReports(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([expect.objectContaining({ standard: 'eu_cbam' })]),
        pagination: expect.objectContaining({ total: 1 }),
      });
    });

    it('should filter by standard and status', async () => {
      req.query = { standard: 'thai_esg', status: 'signed' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await getReports(req as Request, res as Response);

      const countCall = (mockDb.query as jest.Mock).mock.calls[0];
      expect(countCall[0]).toContain('standard = $2');
      expect(countCall[0]).toContain('status = $3');
    });
  });

  // ===================== GET SINGLE REPORT =====================
  describe('getReport', () => {
    it('should return a single report', async () => {
      req.params = { projectId: 'proj-1', reportId: 'rpt-1' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'rpt-1', standard: 'eu_cbam', format: 'pdf', status: 'generated',
          report_data: {}, file_path: '/reports/test.pdf',
          validation_warnings: [], validation_errors: [],
          generated_by_name: 'Admin', signed_at: null, signed_by_name: null,
          created_at: new Date(), updated_at: new Date(),
        }],
        rowCount: 1,
      });

      await getReport(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 'rpt-1', standard: 'eu_cbam' }),
      });
    });

    it('should throw NotFoundError for missing report', async () => {
      req.params = { projectId: 'proj-1', reportId: 'nonexistent' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(getReport(req as Request, res as Response))
        .rejects.toThrow('Report not found');
    });
  });

  // ===================== UPDATE STATUS =====================
  describe('updateReportStatus', () => {
    it('should update report status', async () => {
      req.params = { projectId: 'proj-1', reportId: 'rpt-1' };
      req.body = { status: 'submitted' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'rpt-1', status: 'submitted', updated_at: new Date() }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await updateReportStatus(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ status: 'submitted' }),
      });
    });

    it('should throw NotFoundError for missing report', async () => {
      req.params = { projectId: 'proj-1', reportId: 'gone' };
      req.body = { status: 'submitted' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(updateReportStatus(req as Request, res as Response))
        .rejects.toThrow('Report not found');
    });
  });

  // ===================== DELETE REPORT =====================
  describe('deleteReport', () => {
    it('should delete a non-signed report', async () => {
      req.params = { projectId: 'proj-1', reportId: 'rpt-1' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ status: 'generated' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await deleteReport(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Report deleted successfully' });
    });

    it('should reject deletion of signed report', async () => {
      req.params = { projectId: 'proj-1', reportId: 'rpt-signed' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ status: 'signed' }], rowCount: 1 });

      await expect(deleteReport(req as Request, res as Response))
        .rejects.toThrow('Cannot delete a signed report');
    });

    it('should throw NotFoundError for missing report', async () => {
      req.params = { projectId: 'proj-1', reportId: 'gone' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(deleteReport(req as Request, res as Response))
        .rejects.toThrow('Report not found');
    });
  });

  // ===================== PREVIEW REPORT =====================
  describe('previewReport', () => {
    it('should return report data without generating file', async () => {
      req.body = { standard: 'eu_cbam' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'proj-1' }], rowCount: 1 });

      await previewReport(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          standard: 'eu_cbam',
          reportData: expect.any(Object),
          validation: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundError for missing project', async () => {
      req.body = { standard: 'eu_cbam' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(previewReport(req as Request, res as Response))
        .rejects.toThrow('Project not found');
    });
  });

  // ===================== GET REQUIREMENTS =====================
  describe('getReportRequirements', () => {
    it('should return standard requirements', async () => {
      req.params = { standard: 'eu_cbam' };

      await getReportRequirements(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ requiredFields: expect.any(Array) }),
      });
    });
  });
});
