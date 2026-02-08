/**
 * Report Controller Complete Tests
 * Covers all 14+ exported functions in reportController.ts
 */
import { Request, Response } from 'express';

jest.mock('../../src/config/database', () => ({
  db: { query: jest.fn() },
}));

jest.mock('../../src/config/redis', () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
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
  generateReportData: jest.fn().mockResolvedValue({
    project: { id: 'proj-1', name: 'Test' },
    emissions: { scope1: 1000, scope2: 500, scope3: 200, total: 1700 },
  }),
  validateReportData: jest.fn().mockResolvedValue({
    valid: true,
    warnings: [],
    errors: [],
    missingRequired: [],
    completeness: 100,
  }),
  generateReportFiles: jest.fn().mockResolvedValue({
    filePath: '/reports/test.pdf',
    files: ['/reports/test.pdf'],
  }),
  getOverlappingFields: jest.fn().mockResolvedValue({ common: [], conflicts: {} }),
  getStandardRequirements: jest.fn().mockResolvedValue({
    requiredFields: ['project.name'],
    optionalFields: ['standardSpecific.cnCode'],
    sections: ['organization', 'emissions'],
  }),
}));

import { db } from '../../src/config/database';
import { redisClient as redis } from '../../src/config/redis';
import * as reportService from '../../src/services/reportService';
import {
  generateReport,
  generateBatchReports,
  getReports,
  getReport,
  downloadReport,
  updateReportStatus,
  regenerateReport,
  deleteReport,
  previewReport,
  getReportRequirements,
  batchGenerateReports,
  getBatchStatus,
  getBatchManifest,
  getProjectReports,
} from '../../src/controllers/reportController';

const mockDb = db as jest.Mocked<typeof db>;

function makeReq(overrides: any = {}): Partial<Request> {
  return {
    body: {},
    params: { projectId: 'proj-1' },
    query: {},
    user: { id: 'user-1', userId: 'user-1', email: 'a@b.com', role: 'owner', name: 'Test', signatureAuthorized: false } as any,
    ...overrides,
  };
}

function makeRes(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    download: jest.fn(),
  };
}

const reportRow = (overrides: any = {}) => ({
  id: 'rep-1',
  project_id: 'proj-1',
  standard: 'eu_cbam',
  format: 'pdf',
  status: 'generated',
  report_data: '{}',
  file_path: '/reports/test.pdf',
  validation_warnings: [],
  validation_errors: [],
  generated_by: 'user-1',
  generated_by_name: 'Test User',
  signed_at: null,
  signed_by: null,
  signed_by_name: null,
  batch_id: null,
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
  ...overrides,
});

const projectRow = (overrides: any = {}) => ({
  id: 'proj-1',
  name: 'Test Project',
  company: 'Test Corp',
  reporting_standards: ['eu_cbam', 'uk_cbam', 'k_esg'],
  ...overrides,
});

describe('Report Controller', () => {
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.query as jest.Mock).mockReset();
    (redis.get as jest.Mock).mockResolvedValue(null);
    (redis.set as jest.Mock).mockResolvedValue('OK');
    res = makeRes();
  });

  // ==================== generateReport ====================
  describe('generateReport', () => {
    it('should generate a report for a valid standard', async () => {
      const req = makeReq({ body: { standard: 'eu_cbam', format: 'pdf' } });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [projectRow()], rowCount: 1 }) // project
        .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 }) // activity count
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT
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

    it('should throw when project not found', async () => {
      const req = makeReq({ body: { standard: 'eu_cbam' } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(generateReport(req as Request, res as Response))
        .rejects.toThrow('Project not found');
    });

    it('should throw when standard not configured for project', async () => {
      const req = makeReq({ body: { standard: 'thai_esg' } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [projectRow()], rowCount: 1 });

      await expect(generateReport(req as Request, res as Response))
        .rejects.toThrow('Standard thai_esg is not configured for this project');
    });

    it('should throw when no calculated activities', async () => {
      const req = makeReq({ body: { standard: 'eu_cbam' } });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [projectRow()], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

      await expect(generateReport(req as Request, res as Response))
        .rejects.toThrow('No calculated activities found');
    });

    it('should set status to "draft" when validation has errors', async () => {
      const req = makeReq({ body: { standard: 'eu_cbam' } });
      (reportService.validateReportData as jest.Mock).mockResolvedValueOnce({
        valid: false,
        warnings: [],
        errors: [{ field: 'cnCode', message: 'Missing', severity: 'error' }],
        missingRequired: ['standardSpecific.cnCode'],
        completeness: 80,
      });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [projectRow()], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await generateReport(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.status).toBe('draft');
    });

    it('should use "pdf" as default format', async () => {
      const req = makeReq({ body: { standard: 'eu_cbam' } });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [projectRow()], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await generateReport(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.format).toBe('pdf');
    });
  });

  // ==================== generateBatchReports ====================
  describe('generateBatchReports', () => {
    it('should generate reports for multiple valid standards', async () => {
      const req = makeReq({ body: { standards: ['eu_cbam', 'uk_cbam'], format: 'pdf' } });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [projectRow()], rowCount: 1 }) // project
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT eu
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT uk
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await generateBatchReports(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.summary.generated).toBe(2);
    });

    it('should throw when no valid standards', async () => {
      const req = makeReq({ body: { standards: ['thai_esg'] } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [projectRow()], rowCount: 1 });

      await expect(generateBatchReports(req as Request, res as Response))
        .rejects.toThrow('None of the specified standards are configured');
    });

    it('should handle errors in individual report generation', async () => {
      const req = makeReq({ body: { standards: ['eu_cbam', 'uk_cbam'] } });
      (reportService.generateReportData as jest.Mock)
        .mockResolvedValueOnce({ project: { id: 'p', name: 'T' }, emissions: {} })
        .mockRejectedValueOnce(new Error('Generation failed'));
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [projectRow()], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await generateBatchReports(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.summary.generated).toBe(1);
      expect(data.summary.failed).toBe(1);
    });

    it('should include invalid standards warning', async () => {
      const req = makeReq({ body: { standards: ['eu_cbam', 'thai_esg'] } });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [projectRow()], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await generateBatchReports(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.warnings.some((w: any) => w.type === 'invalid_standards')).toBe(true);
    });

    it('should include data conflicts warning', async () => {
      const req = makeReq({ body: { standards: ['eu_cbam', 'uk_cbam'] } });
      (reportService.getOverlappingFields as jest.Mock).mockResolvedValueOnce({
        common: ['project.name'],
        conflicts: { emissionMethod: ['direct', 'embedded'] },
      });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [projectRow()], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await generateBatchReports(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.warnings.some((w: any) => w.type === 'data_conflicts')).toBe(true);
    });
  });

  // ==================== getReports ====================
  describe('getReports', () => {
    it('should return paginated reports', async () => {
      const req = makeReq({ query: { page: '1', limit: '10' } });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [reportRow(), reportRow({ id: 'rep-2' })], rowCount: 2 });

      await getReports(req as Request, res as Response);

      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by standard and status', async () => {
      const req = makeReq({ query: { standard: 'eu_cbam', status: 'generated' } });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [reportRow()], rowCount: 1 });

      await getReports(req as Request, res as Response);

      // Check that query was built with filter params
      const calls = (mockDb.query as jest.Mock).mock.calls;
      expect(calls[0][1]).toContain('eu_cbam');
    });
  });

  // ==================== getReport ====================
  describe('getReport', () => {
    it('should return a single report', async () => {
      const req = makeReq({ params: { projectId: 'proj-1', reportId: 'rep-1' } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [reportRow()], rowCount: 1,
      });

      await getReport(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 'rep-1', standard: 'eu_cbam' }),
      });
    });

    it('should throw when report not found', async () => {
      const req = makeReq({ params: { projectId: 'proj-1', reportId: 'gone' } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(getReport(req as Request, res as Response))
        .rejects.toThrow('Report not found');
    });
  });

  // ==================== downloadReport ====================
  describe('downloadReport', () => {
    it('should download report file', async () => {
      const req = makeReq({ params: { projectId: 'proj-1', reportId: 'rep-1' } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...reportRow(), project_name: 'Test Project' }], rowCount: 1,
      });

      await downloadReport(req as Request, res as Response);

      expect(res.download).toHaveBeenCalledWith(
        '/reports/test.pdf',
        expect.stringContaining('Test_Project_eu_cbam'),
      );
    });

    it('should throw when report not found', async () => {
      const req = makeReq({ params: { projectId: 'proj-1', reportId: 'gone' } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(downloadReport(req as Request, res as Response))
        .rejects.toThrow('Report not found');
    });

    it('should throw when file_path is null', async () => {
      const req = makeReq({ params: { projectId: 'proj-1', reportId: 'rep-1' } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...reportRow(), file_path: null, project_name: 'Test' }], rowCount: 1,
      });

      await expect(downloadReport(req as Request, res as Response))
        .rejects.toThrow('Report file not available');
    });
  });

  // ==================== updateReportStatus ====================
  describe('updateReportStatus', () => {
    it('should update report status', async () => {
      const req = makeReq({
        params: { projectId: 'proj-1', reportId: 'rep-1' },
        body: { status: 'finalized' },
      });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [reportRow({ status: 'finalized', updated_at: new Date() })], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await updateReportStatus(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ status: 'finalized' }),
      });
    });

    it('should throw when report not found', async () => {
      const req = makeReq({
        params: { projectId: 'proj-1', reportId: 'gone' },
        body: { status: 'generated' },
      });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(updateReportStatus(req as Request, res as Response))
        .rejects.toThrow('Report not found');
    });
  });

  // ==================== regenerateReport ====================
  describe('regenerateReport', () => {
    it('should regenerate an existing report', async () => {
      const req = makeReq({ params: { projectId: 'proj-1', reportId: 'rep-1' }, body: {} });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [reportRow()], rowCount: 1 }) // existing
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await regenerateReport(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 'rep-1', status: 'generated' }),
      });
    });

    it('should throw when report not found', async () => {
      const req = makeReq({ params: { projectId: 'proj-1', reportId: 'gone' }, body: {} });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(regenerateReport(req as Request, res as Response))
        .rejects.toThrow('Report not found');
    });

    it('should throw when report is signed', async () => {
      const req = makeReq({ params: { projectId: 'proj-1', reportId: 'rep-1' }, body: {} });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [reportRow({ status: 'signed' })], rowCount: 1,
      });

      await expect(regenerateReport(req as Request, res as Response))
        .rejects.toThrow('Cannot regenerate a signed report');
    });

    it('should set status "draft" when regeneration has validation errors', async () => {
      const req = makeReq({ params: { projectId: 'proj-1', reportId: 'rep-1' }, body: {} });
      (reportService.validateReportData as jest.Mock).mockResolvedValueOnce({
        valid: false, warnings: [], errors: [{ field: 'x', message: 'm', severity: 'error' }],
        missingRequired: ['x'], completeness: 50,
      });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [reportRow()], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await regenerateReport(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.status).toBe('draft');
    });
  });

  // ==================== deleteReport ====================
  describe('deleteReport', () => {
    it('should delete an unsigned report', async () => {
      const req = makeReq({ params: { projectId: 'proj-1', reportId: 'rep-1' } });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ status: 'generated' }], rowCount: 1 }) // check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await deleteReport(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Report deleted successfully',
      });
    });

    it('should throw when report not found', async () => {
      const req = makeReq({ params: { projectId: 'proj-1', reportId: 'gone' } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(deleteReport(req as Request, res as Response))
        .rejects.toThrow('Report not found');
    });

    it('should throw when report is signed', async () => {
      const req = makeReq({ params: { projectId: 'proj-1', reportId: 'rep-1' } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ status: 'signed' }], rowCount: 1 });

      await expect(deleteReport(req as Request, res as Response))
        .rejects.toThrow('Cannot delete a signed report');
    });
  });

  // ==================== previewReport ====================
  describe('previewReport', () => {
    it('should preview report without generating file', async () => {
      const req = makeReq({ body: { standard: 'eu_cbam' } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [projectRow()], rowCount: 1 });

      await previewReport(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          standard: 'eu_cbam',
          reportData: expect.any(Object),
          validation: expect.any(Object),
        }),
      });
      // File generation should not be called
      expect(reportService.generateReportFiles).not.toHaveBeenCalled();
    });

    it('should throw when project not found', async () => {
      const req = makeReq({ body: { standard: 'eu_cbam' } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(previewReport(req as Request, res as Response))
        .rejects.toThrow('Project not found');
    });
  });

  // ==================== getReportRequirements ====================
  describe('getReportRequirements', () => {
    it('should return standard requirements', async () => {
      const req = makeReq({ params: { standard: 'eu_cbam' } });

      await getReportRequirements(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ requiredFields: expect.any(Array) }),
      });
    });
  });

  // ==================== batchGenerateReports ====================
  describe('batchGenerateReports', () => {
    it('should generate batch reports with Redis tracking', async () => {
      const req = makeReq({
        body: { projectId: 'proj-1', standards: ['eu_cbam', 'uk_cbam'], format: 'xlsx' },
      });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [projectRow()], rowCount: 1 }) // project
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT eu
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT uk
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await batchGenerateReports(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.batchId).toBe('mock-report-id');
      expect(data.summary.generated).toBe(2);
      // Redis should have been called
      expect(redis.set).toHaveBeenCalled();
    });

    it('should throw when projectId is missing', async () => {
      const req = makeReq({ body: { standards: ['eu_cbam'] } });

      await expect(batchGenerateReports(req as Request, res as Response))
        .rejects.toThrow('Project ID is required');
    });

    it('should throw when standards is empty', async () => {
      const req = makeReq({ body: { projectId: 'proj-1', standards: [] } });

      await expect(batchGenerateReports(req as Request, res as Response))
        .rejects.toThrow('Standards array is required');
    });

    it('should throw when standards is missing', async () => {
      const req = makeReq({ body: { projectId: 'proj-1' } });

      await expect(batchGenerateReports(req as Request, res as Response))
        .rejects.toThrow('Standards array is required');
    });

    it('should handle errors in individual batch items', async () => {
      const req = makeReq({ body: { projectId: 'proj-1', standards: ['eu_cbam', 'uk_cbam'] } });
      (reportService.generateReportData as jest.Mock)
        .mockResolvedValueOnce({ project: { id: 'p', name: 'T' } })
        .mockRejectedValueOnce(new Error('Failed'));
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [projectRow()], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await batchGenerateReports(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.summary.generated).toBe(1);
      expect(data.summary.failed).toBe(1);
    });
  });

  // ==================== getBatchStatus ====================
  describe('getBatchStatus', () => {
    it('should return cached batch status from Redis', async () => {
      const req = makeReq({ params: { batchId: 'batch-1' } });
      (redis.get as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({ id: 'batch-1', status: 'completed', progress: 100 })
      );

      await getBatchStatus(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ status: 'completed', progress: 100 }),
      });
    });

    it('should fall back to database when not in Redis', async () => {
      const req = makeReq({ params: { batchId: 'batch-1' } });
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ batch_id: 'batch-1', total: '3', completed: '3' }], rowCount: 1,
      });

      await getBatchStatus(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.status).toBe('completed');
      expect(data.progress).toBe(100);
    });

    it('should throw when batch not found anywhere', async () => {
      const req = makeReq({ params: { batchId: 'gone' } });
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(getBatchStatus(req as Request, res as Response))
        .rejects.toThrow('Batch not found');
    });
  });

  // ==================== getBatchManifest ====================
  describe('getBatchManifest', () => {
    it('should return batch manifest with report list', async () => {
      const req = makeReq({ params: { batchId: 'batch-1' } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { id: 'r1', standard: 'eu_cbam', format: 'pdf', status: 'generated', file_path: '/f', created_at: new Date(), validation_warnings: [], validation_errors: [], project_name: 'Test' },
          { id: 'r2', standard: 'uk_cbam', format: 'pdf', status: 'draft', file_path: '/f', created_at: new Date(), validation_warnings: ['w'], validation_errors: ['e'], project_name: 'Test' },
        ],
        rowCount: 2,
      });

      await getBatchManifest(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.batchId).toBe('batch-1');
      expect(data.reports).toHaveLength(2);
      expect(data.summary.generated).toBe(1);
      expect(data.summary.draft).toBe(1);
    });

    it('should throw when batch has no reports', async () => {
      const req = makeReq({ params: { batchId: 'gone' } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(getBatchManifest(req as Request, res as Response))
        .rejects.toThrow('Batch not found or no reports generated');
    });
  });

  // ==================== getProjectReports ====================
  describe('getProjectReports', () => {
    it('should return paginated project reports', async () => {
      const req = makeReq({ query: { page: '1', limit: '5' } });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [reportRow()], rowCount: 1 });

      await getProjectReports(req as Request, res as Response);

      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.pagination).toBeDefined();
      expect(result.data).toHaveLength(1);
    });

    it('should filter by standard and status', async () => {
      const req = makeReq({ query: { standard: 'k_esg', status: 'signed' } });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await getProjectReports(req as Request, res as Response);

      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.data).toHaveLength(0);
    });
  });
});
