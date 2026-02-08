/**
 * FileController Unit Tests
 * Covers: uploadFile, getFiles, downloadFile, deleteFile, parseExcelActivities,
 * importExcelActivities, exportActivitiesToExcel, getActivityTemplate,
 * getProjectFiles, getFile, downloadTemplate, reparseFile
 */

jest.mock('../../src/config/database', () => ({
  db: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('test-file-id'),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  renameSync: jest.fn(),
  unlinkSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('{"test": true}'),
}));

jest.mock('xlsx', () => ({
  readFile: jest.fn().mockReturnValue({
    SheetNames: ['Sheet1'],
    Sheets: { Sheet1: {} },
  }),
  utils: {
    sheet_to_json: jest.fn().mockReturnValue([
      { Name: 'Test Activity', Scope: 'scope1', Quantity: 100, Unit: 'kWh', 'Activity Type': 'purchased_electricity' },
    ]),
    book_new: jest.fn().mockReturnValue({}),
    json_to_sheet: jest.fn().mockReturnValue({ '!cols': [] }),
    book_append_sheet: jest.fn(),
  },
  write: jest.fn().mockReturnValue(Buffer.from('test')),
}));

import { db } from '../../src/config/database';
import * as fs from 'fs';
import {
  uploadFile,
  getFiles,
  downloadFile,
  deleteFile,
  parseExcelActivities,
  importExcelActivities,
  exportActivitiesToExcel,
  getActivityTemplate,
  getProjectFiles,
  getFile,
  downloadTemplate,
  reparseFile,
} from '../../src/controllers/fileController';

const mockDb = db as jest.Mocked<typeof db>;

function mockRequest(overrides: any = {}): any {
  return {
    params: {},
    query: {},
    body: {},
    user: { id: 'user-1', userId: 'user-1', role: 'owner' },
    file: undefined,
    ...overrides,
  };
}

function mockResponse(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.download = jest.fn().mockReturnValue(res);
  return res;
}

describe('File Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.query as jest.Mock).mockReset();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  // ==========================================================================
  // uploadFile
  // ==========================================================================
  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // insert
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({
        params: { projectId: 'p-1' },
        file: { originalname: 'data.xlsx', path: '/tmp/data.xlsx', mimetype: 'application/xlsx', size: 1024 },
      });
      const res = mockResponse();

      await uploadFile(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ originalName: 'data.xlsx' }),
      }));
    });

    it('should throw BadRequestError when no file provided', async () => {
      const req = mockRequest({ params: { projectId: 'p-1' } });
      const res = mockResponse();

      await expect(uploadFile(req, res)).rejects.toThrow(/No file provided/i);
    });
  });

  // ==========================================================================
  // getFiles
  // ==========================================================================
  describe('getFiles', () => {
    it('should return all files for a project', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'f-1', original_name: 'data.xlsx', mime_type: 'application/xlsx',
          size: 1024, uploaded_by_name: 'Test User', created_at: new Date(),
        }],
        rowCount: 1,
      });

      const req = mockRequest({ params: { projectId: 'p-1' } });
      const res = mockResponse();

      await getFiles(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.arrayContaining([expect.objectContaining({ originalName: 'data.xlsx' })]),
      }));
    });
  });

  // ==========================================================================
  // downloadFile
  // ==========================================================================
  describe('downloadFile', () => {
    it('should download a file', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'f-1', stored_name: 'stored.xlsx', original_name: 'data.xlsx', project_id: 'p-1' }],
        rowCount: 1,
      });

      const req = mockRequest({ params: { projectId: 'p-1', fileId: 'f-1' } });
      const res = mockResponse();

      await downloadFile(req, res);

      expect(res.download).toHaveBeenCalled();
    });

    it('should throw NotFoundError for missing file record', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const req = mockRequest({ params: { projectId: 'p-1', fileId: 'f-999' } });
      const res = mockResponse();

      await expect(downloadFile(req, res)).rejects.toThrow(/not found/i);
    });

    it('should throw NotFoundError when file missing on disk', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{ stored_name: 'gone.xlsx', original_name: 'data.xlsx' }],
        rowCount: 1,
      });
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const req = mockRequest({ params: { projectId: 'p-1', fileId: 'f-1' } });
      const res = mockResponse();

      await expect(downloadFile(req, res)).rejects.toThrow(/not found on disk/i);
    });
  });

  // ==========================================================================
  // deleteFile
  // ==========================================================================
  describe('deleteFile', () => {
    it('should delete a file', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 'f-1', stored_name: 'stored.xlsx', original_name: 'data.xlsx' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({ params: { projectId: 'p-1', fileId: 'f-1' } });
      const res = mockResponse();

      await deleteFile(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true, message: 'File deleted successfully',
      }));
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should throw NotFoundError', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const req = mockRequest({ params: { projectId: 'p-1', fileId: 'none' } });
      const res = mockResponse();

      await expect(deleteFile(req, res)).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // parseExcelActivities
  // ==========================================================================
  describe('parseExcelActivities', () => {
    it('should parse Excel file and return activities', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'f-1', stored_name: 'data.xlsx', project_id: 'p-1' }],
        rowCount: 1,
      });

      const req = mockRequest({ params: { projectId: 'p-1', fileId: 'f-1' } });
      const res = mockResponse();

      await parseExcelActivities(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          summary: expect.objectContaining({ total: 1, valid: 1 }),
        }),
      }));
    });

    it('should throw NotFoundError for missing file', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const req = mockRequest({ params: { projectId: 'p-1', fileId: 'none' } });
      const res = mockResponse();

      await expect(parseExcelActivities(req, res)).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // importExcelActivities
  // ==========================================================================
  describe('importExcelActivities', () => {
    it('should import activities from parsed data', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ id: 'a-1', name: 'Activity' }], rowCount: 1 }),
      };
      (mockDb.transaction as jest.Mock).mockImplementation(async (cb) => cb(mockClient));
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({
        params: { projectId: 'p-1' },
        body: {
          activities: [{ name: 'Test', scope: 'scope1', activityType: 'stationary_combustion', quantity: 100, unit: 'kWh' }],
        },
      });
      const res = mockResponse();

      await importExcelActivities(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should reject empty activities array', async () => {
      const req = mockRequest({ params: { projectId: 'p-1' }, body: { activities: [] } });
      const res = mockResponse();

      await expect(importExcelActivities(req, res)).rejects.toThrow(/required/i);
    });
  });

  // ==========================================================================
  // exportActivitiesToExcel
  // ==========================================================================
  describe('exportActivitiesToExcel', () => {
    it('should export activities as Excel', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            name: 'Act1', description: '', scope: 'scope1', scope3_category: null,
            activity_type: 'fuel', quantity: 100, unit: 'l', source: 'test',
            tier_level: 'tier1', tier_direction: 'both', calculation_status: 'calculated',
            total_emissions_kg_co2e: 268, emission_factor_used: 2.68, data_source: 'invoice',
            data_quality_score: 1, created_at: new Date(), updated_at: new Date(),
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ name: 'Test Project' }], rowCount: 1 });

      const req = mockRequest({ params: { projectId: 'p-1' }, query: {} });
      const res = mockResponse();

      await exportActivitiesToExcel(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', expect.stringContaining('spreadsheetml'));
      expect(res.send).toHaveBeenCalled();
    });

    it('should filter by scope', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ name: 'Test' }], rowCount: 1 });

      const req = mockRequest({ params: { projectId: 'p-1' }, query: { scope: 'scope1' } });
      const res = mockResponse();

      await exportActivitiesToExcel(req, res);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND scope = $2'),
        expect.arrayContaining(['p-1', 'scope1'])
      );
    });
  });

  // ==========================================================================
  // getActivityTemplate
  // ==========================================================================
  describe('getActivityTemplate', () => {
    it('should return an Excel template', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await getActivityTemplate(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('template'));
      expect(res.send).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getProjectFiles
  // ==========================================================================
  describe('getProjectFiles', () => {
    it('should return project files with parse status', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'f-1', original_name: 'data.xlsx', stored_name: 'stored.xlsx',
          mime_type: 'application/xlsx', size: 1024, uploaded_by_name: 'User',
          parse_status: 'success', parse_error: null, created_at: new Date(),
        }],
        rowCount: 1,
      });

      const req = mockRequest({ params: { projectId: 'p-1' } });
      const res = mockResponse();

      await getProjectFiles(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.arrayContaining([expect.objectContaining({ parseStatus: 'success' })]),
      }));
    });
  });

  // ==========================================================================
  // getFile
  // ==========================================================================
  describe('getFile', () => {
    it('should return single file info', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'f-1', project_id: 'p-1', project_name: 'Test Project',
          original_name: 'data.xlsx', stored_name: 'stored.xlsx',
          mime_type: 'application/xlsx', size: 1024, uploaded_by_name: 'User',
          parse_status: 'success', parse_error: null, parsed_data: null,
          created_at: new Date(), updated_at: new Date(),
        }],
        rowCount: 1,
      });

      const req = mockRequest({ params: { id: 'f-1' } });
      const res = mockResponse();

      await getFile(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ projectName: 'Test Project' }),
      }));
    });

    it('should throw NotFoundError', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const req = mockRequest({ params: { id: 'none' } });
      const res = mockResponse();

      await expect(getFile(req, res)).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // downloadTemplate
  // ==========================================================================
  describe('downloadTemplate', () => {
    it('should download xlsx template', async () => {
      const req = mockRequest({ params: { format: 'xlsx' } });
      const res = mockResponse();

      await downloadTemplate(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', expect.stringContaining('spreadsheetml'));
      expect(res.send).toHaveBeenCalled();
    });

    it('should download csv template', async () => {
      const req = mockRequest({ params: { format: 'csv' } });
      const res = mockResponse();

      await downloadTemplate(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.send).toHaveBeenCalled();
    });

    it('should download json template', async () => {
      const req = mockRequest({ params: { format: 'json' } });
      const res = mockResponse();

      await downloadTemplate(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it('should reject invalid format', async () => {
      const req = mockRequest({ params: { format: 'pdf' } });
      const res = mockResponse();

      await expect(downloadTemplate(req, res)).rejects.toThrow(/Invalid format/i);
    });
  });

  // ==========================================================================
  // reparseFile
  // ==========================================================================
  describe('reparseFile', () => {
    it('should re-parse an xlsx file successfully', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 'f-1', project_id: 'p-1', stored_name: 'data.xlsx', original_name: 'data.xlsx' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({ params: { id: 'f-1' } });
      const res = mockResponse();

      await reparseFile(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true, message: 'File re-parsed successfully',
      }));
    });

    it('should re-parse a json file', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 'f-1', project_id: 'p-1', stored_name: 'data.json', original_name: 'data.json' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const req = mockRequest({ params: { id: 'f-1' } });
      const res = mockResponse();

      await reparseFile(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should throw NotFoundError for missing file record', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const req = mockRequest({ params: { id: 'none' } });
      const res = mockResponse();

      await expect(reparseFile(req, res)).rejects.toThrow(/not found/i);
    });

    it('should throw NotFoundError when file missing from disk', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'f-1', project_id: 'p-1', stored_name: 'gone.xlsx', original_name: 'gone.xlsx' }],
        rowCount: 1,
      });
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const req = mockRequest({ params: { id: 'f-1' } });
      const res = mockResponse();

      await expect(reparseFile(req, res)).rejects.toThrow(/not found/i);
    });
  });
});
