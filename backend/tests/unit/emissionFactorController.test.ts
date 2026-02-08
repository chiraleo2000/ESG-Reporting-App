/**
 * EmissionFactorController Unit Tests
 * Covers: searchEmissionFactors, getGridEmissionFactors, getGridEmissionFactor,
 * upsertGridEmissionFactor, deleteGridEmissionFactor, getPrecursorFactors,
 * getPrecursorFactor, upsertPrecursorFactor, deletePrecursorFactor,
 * getStandardEmissionFactors, bulkImportEmissionFactors, serpAPILookup,
 * getGridEF, getGridEFHistory, overrideGridEF, deleteGridEFOverride,
 * getPrecursorDefaults, getProjectPrecursorFactors, overridePrecursorFactor,
 * deletePrecursorOverride, getStandardEFs
 */

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  db: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock('../../src/config/redis', () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('test-id-123'),
  roundTo: jest.fn((n: number) => Math.round(n * 100) / 100),
}));

jest.mock('../../src/services/serpAPIService', () => ({
  searchEmissionFactors: jest.fn().mockResolvedValue([{ factor: 2.5, source: 'test' }]),
}));

import { db } from '../../src/config/database';
import { redisClient as redis } from '../../src/config/redis';
import * as serpAPIService from '../../src/services/serpAPIService';
import {
  searchEmissionFactors,
  getGridEmissionFactors,
  getGridEmissionFactor,
  upsertGridEmissionFactor,
  deleteGridEmissionFactor,
  getPrecursorFactors,
  getPrecursorFactor,
  upsertPrecursorFactor,
  deletePrecursorFactor,
  getStandardEmissionFactors,
  bulkImportEmissionFactors,
  serpAPILookup,
  getGridEF,
  getGridEFHistory,
  overrideGridEF,
  deleteGridEFOverride,
  getPrecursorDefaults,
  getProjectPrecursorFactors,
  overridePrecursorFactor,
  deletePrecursorOverride,
  getStandardEFs,
} from '../../src/controllers/emissionFactorController';

const mockDb = db as jest.Mocked<typeof db>;
const mockRedis = redis as jest.Mocked<typeof redis>;

// Helper functions
function mockRequest(overrides: any = {}): any {
  return {
    params: {},
    query: {},
    body: {},
    user: { id: 'user-1', userId: 'user-1', role: 'owner', email: 'test@test.com', name: 'Test' },
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

describe('EmissionFactor Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.query as jest.Mock).mockReset();
    (mockRedis.get as jest.Mock).mockResolvedValue(null);
  });

  // ==========================================================================
  // searchEmissionFactors
  // ==========================================================================
  describe('searchEmissionFactors', () => {
    it('should search emission factors using SERPAPI', async () => {
      const req = mockRequest({ query: { activityType: 'diesel', unit: 'l', region: 'EU' } });
      const res = mockResponse();

      await searchEmissionFactors(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, cached: false })
      );
    });

    it('should return cached results', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify([{ factor: 2.5 }]));
      const req = mockRequest({ query: { activityType: 'diesel' } });
      const res = mockResponse();

      await searchEmissionFactors(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, cached: true })
      );
    });

    it('should throw BadRequestError when activityType is missing', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();

      await expect(searchEmissionFactors(req, res)).rejects.toThrow('Activity type is required');
    });
  });

  // ==========================================================================
  // getGridEmissionFactors
  // ==========================================================================
  describe('getGridEmissionFactors', () => {
    it('should return paginated grid emission factors', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id: 'gef-1', region: 'Thailand', country: 'TH', grid_name: 'PEA',
            year: 2024, factor_kg_co2_per_kwh: '0.4561', source: 'EGAT',
            valid_from: null, valid_to: null, created_at: new Date(),
          }],
          rowCount: 1,
        });

      const req = mockRequest({ query: { page: 1, limit: 10 } });
      const res = mockResponse();

      await getGridEmissionFactors(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        pagination: expect.objectContaining({ total: 5 }),
      }));
    });

    it('should filter by region and year', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const req = mockRequest({ query: { region: 'Thailand', year: '2024' } });
      const res = mockResponse();

      await getGridEmissionFactors(req, res);

      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // getGridEmissionFactor
  // ==========================================================================
  describe('getGridEmissionFactor', () => {
    it('should return a specific grid emission factor', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'gef-1', region: 'Thailand', country: 'TH', grid_name: 'PEA',
          year: 2024, factor_kg_co2_per_kwh: '0.4561', source: 'EGAT',
          valid_from: null, valid_to: null,
        }],
        rowCount: 1,
      });

      const req = mockRequest({ params: { region: 'Thailand', year: '2024' } });
      const res = mockResponse();

      await getGridEmissionFactor(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ region: 'Thailand', factorKgCo2PerKwh: 0.4561 }),
      }));
    });

    it('should throw NotFoundError when not found', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const req = mockRequest({ params: { region: 'Mars', year: '2024' } });
      const res = mockResponse();

      await expect(getGridEmissionFactor(req, res)).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // upsertGridEmissionFactor
  // ==========================================================================
  describe('upsertGridEmissionFactor', () => {
    it('should create a new grid emission factor', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // existing check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // insert
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit log

      const req = mockRequest({
        body: { region: 'Thailand', country: 'TH', gridName: 'PEA', year: 2024, factorKgCo2PerKwh: 0.4561, source: 'EGAT' },
      });
      const res = mockResponse();

      await upsertGridEmissionFactor(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Grid emission factor created',
      }));
    });

    it('should update an existing grid emission factor', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'existing-id' }], rowCount: 1 }) // existing
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({
        body: { region: 'Thailand', year: 2024, factorKgCo2PerKwh: 0.46 },
      });
      const res = mockResponse();

      await upsertGridEmissionFactor(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Grid emission factor updated',
      }));
    });
  });

  // ==========================================================================
  // deleteGridEmissionFactor
  // ==========================================================================
  describe('deleteGridEmissionFactor', () => {
    it('should delete a grid emission factor', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ region: 'TH', year: 2024 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({ params: { id: 'gef-1' } });
      const res = mockResponse();

      await deleteGridEmissionFactor(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true, message: 'Grid emission factor deleted successfully',
      }));
    });

    it('should throw NotFoundError when not found', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const req = mockRequest({ params: { id: 'nonexistent' } });
      const res = mockResponse();

      await expect(deleteGridEmissionFactor(req, res)).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // getPrecursorFactors
  // ==========================================================================
  describe('getPrecursorFactors', () => {
    it('should return paginated precursor factors', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id: 'pf-1', material_type: 'cement', production_route: 'dry',
            factor_kg_co2_per_kg: '0.525', source: 'IPCC', notes: '', is_default: true, created_at: new Date(),
          }],
          rowCount: 1,
        });

      const req = mockRequest({ query: { page: 1, limit: 10 } });
      const res = mockResponse();

      await getPrecursorFactors(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        pagination: expect.objectContaining({ total: 3 }),
      }));
    });

    it('should filter by material and productionRoute', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const req = mockRequest({ query: { material: 'steel', productionRoute: 'electric_arc' } });
      const res = mockResponse();

      await getPrecursorFactors(req, res);

      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // getPrecursorFactor
  // ==========================================================================
  describe('getPrecursorFactor', () => {
    it('should return a single precursor factor', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'pf-1', material_type: 'cement', production_route: 'dry',
          factor_kg_co2_per_kg: '0.525', source: 'IPCC', notes: 'test', is_default: true,
        }],
        rowCount: 1,
      });

      const req = mockRequest({ params: { material: 'cement', route: 'dry' } });
      const res = mockResponse();

      await getPrecursorFactor(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ materialType: 'cement' }),
      }));
    });

    it('should throw NotFoundError', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const req = mockRequest({ params: { material: 'unobtanium', route: 'magic' } });
      const res = mockResponse();

      await expect(getPrecursorFactor(req, res)).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // upsertPrecursorFactor
  // ==========================================================================
  describe('upsertPrecursorFactor', () => {
    it('should create a new precursor factor', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({
        body: { materialType: 'cement', productionRoute: 'dry', factorKgCo2PerKg: 0.525, source: 'IPCC' },
      });
      const res = mockResponse();

      await upsertPrecursorFactor(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should update an existing precursor factor', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'existing' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({
        body: { materialType: 'cement', productionRoute: 'dry', factorKgCo2PerKg: 0.55 },
      });
      const res = mockResponse();

      await upsertPrecursorFactor(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ==========================================================================
  // deletePrecursorFactor
  // ==========================================================================
  describe('deletePrecursorFactor', () => {
    it('should delete a precursor factor', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ material_type: 'cement', production_route: 'dry' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({ params: { id: 'pf-1' } });
      const res = mockResponse();

      await deletePrecursorFactor(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should throw NotFoundError', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const req = mockRequest({ params: { id: 'none' } });
      const res = mockResponse();

      await expect(deletePrecursorFactor(req, res)).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // getStandardEmissionFactors
  // ==========================================================================
  describe('getStandardEmissionFactors', () => {
    it('should return standard emission factors', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'ef-1', category: 'fuel', activity_type: 'diesel', scope: 'scope1',
          unit: 'l', factor_value: '2.68', factor_unit: 'kgCO2e/l', source: 'IPCC',
          region: 'global', year: 2024, notes: '',
        }],
        rowCount: 1,
      });

      const req = mockRequest({ query: {} });
      const res = mockResponse();

      await getStandardEmissionFactors(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should filter by category and scope', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const req = mockRequest({ query: { category: 'fuel', scope: 'scope1' } });
      const res = mockResponse();

      await getStandardEmissionFactors(req, res);

      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // bulkImportEmissionFactors
  // ==========================================================================
  describe('bulkImportEmissionFactors', () => {
    it('should import grid emission factors', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // existing check
          .mockResolvedValueOnce({ rows: [], rowCount: 1 }), // insert
      };
      (mockDb.transaction as jest.Mock).mockImplementation(async (cb) => cb(mockClient));
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({
        body: {
          type: 'grid',
          factors: [{ region: 'Thailand', country: 'TH', year: 2024, factorKgCo2PerKwh: 0.46, source: 'EGAT' }],
        },
      });
      const res = mockResponse();

      await bulkImportEmissionFactors(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should import precursor factors', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id: 'ex' }], rowCount: 1 }) // existing
          .mockResolvedValueOnce({ rows: [], rowCount: 1 }), // update
      };
      (mockDb.transaction as jest.Mock).mockImplementation(async (cb) => cb(mockClient));
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({
        body: {
          type: 'precursor',
          factors: [{ materialType: 'cement', productionRoute: 'dry', factorKgCo2PerKg: 0.53, source: 'IPCC' }],
        },
      });
      const res = mockResponse();

      await bulkImportEmissionFactors(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should import standard emission factors', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
      };
      (mockDb.transaction as jest.Mock).mockImplementation(async (cb) => cb(mockClient));
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({
        body: {
          type: 'standard',
          factors: [{ category: 'fuel', activityType: 'diesel', scope: 'scope1', unit: 'l', factorValue: 2.68, factorUnit: 'kgCO2e', source: 'IPCC', region: 'global', year: 2024 }],
        },
      });
      const res = mockResponse();

      await bulkImportEmissionFactors(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should reject empty factors array', async () => {
      const req = mockRequest({ body: { factors: [], type: 'grid' } });
      const res = mockResponse();

      await expect(bulkImportEmissionFactors(req, res)).rejects.toThrow(/required/i);
    });
  });

  // ==========================================================================
  // serpAPILookup
  // ==========================================================================
  describe('serpAPILookup', () => {
    it('should search via SERPAPI', async () => {
      const req = mockRequest({ body: { query: 'diesel emission factor' } });
      const res = mockResponse();

      await serpAPILookup(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, cached: false }));
    });

    it('should return cached results', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify([{ factor: 2.68 }]));
      const req = mockRequest({ body: { activityType: 'diesel' } });
      const res = mockResponse();

      await serpAPILookup(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ cached: true }));
    });

    it('should throw BadRequestError when no query or activityType', async () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();

      await expect(serpAPILookup(req, res)).rejects.toThrow(/required/i);
    });
  });

  // ==========================================================================
  // getGridEF / getGridEFHistory
  // ==========================================================================
  describe('getGridEF', () => {
    it('should return grid EF for country and year', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'gef-1', country: 'TH', region: 'Thailand', grid_name: 'PEA',
          year: 2024, factor_kg_co2_per_kwh: '0.4561', source: 'EGAT', valid_from: null, valid_to: null,
        }],
        rowCount: 1,
      });

      const req = mockRequest({ params: { country: 'TH', year: '2024' } });
      const res = mockResponse();

      await getGridEF(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should throw NotFoundError', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const req = mockRequest({ params: { country: 'XX', year: '2024' } });
      const res = mockResponse();

      await expect(getGridEF(req, res)).rejects.toThrow(/not found/i);
    });
  });

  describe('getGridEFHistory', () => {
    it('should return grid EF history for a country', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [
          { id: '1', country: 'TH', region: 'Thailand', grid_name: 'PEA', year: 2024, factor_kg_co2_per_kwh: '0.46', source: 'EGAT', valid_from: null, valid_to: null },
          { id: '2', country: 'TH', region: 'Thailand', grid_name: 'PEA', year: 2023, factor_kg_co2_per_kwh: '0.47', source: 'EGAT', valid_from: null, valid_to: null },
        ],
        rowCount: 2,
      });

      const req = mockRequest({ params: { country: 'TH' } });
      const res = mockResponse();

      await getGridEFHistory(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.arrayContaining([expect.objectContaining({ year: 2024 })]),
      }));
    });
  });

  // ==========================================================================
  // overrideGridEF / deleteGridEFOverride
  // ==========================================================================
  describe('overrideGridEF', () => {
    it('should create a new grid EF override', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // no existing
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // insert
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({
        body: { projectId: 'p-1', country: 'TH', year: 2024, factorKgCo2PerKwh: 0.40, source: 'custom', justification: 'test' },
      });
      const res = mockResponse();

      await overrideGridEF(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should update an existing grid EF override', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'ov-1' }], rowCount: 1 }) // existing
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // update

      const req = mockRequest({
        body: { projectId: 'p-1', country: 'TH', year: 2024, factorKgCo2PerKwh: 0.38 },
      });
      const res = mockResponse();

      await overrideGridEF(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Grid EF override updated',
      }));
    });
  });

  describe('deleteGridEFOverride', () => {
    it('should delete a grid EF override', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'ov-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({ params: { projectId: 'p-1', country: 'TH' } });
      const res = mockResponse();

      await deleteGridEFOverride(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should throw NotFoundError', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const req = mockRequest({ params: { projectId: 'p-1', country: 'XX' } });
      const res = mockResponse();

      await expect(deleteGridEFOverride(req, res)).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // getPrecursorDefaults / getProjectPrecursorFactors
  // ==========================================================================
  describe('getPrecursorDefaults', () => {
    it('should return default precursor factors', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'pf-1', material_type: 'cement', production_route: 'dry',
          factor_kg_co2_per_kg: '0.525', source: 'IPCC', notes: '',
        }],
        rowCount: 1,
      });

      const req = mockRequest();
      const res = mockResponse();

      await getPrecursorDefaults(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getProjectPrecursorFactors', () => {
    it('should merge defaults with project overrides', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: 'pf-1', material_type: 'cement', production_route: 'dry',
            factor_kg_co2_per_kg: '0.525', source: 'IPCC',
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{
            material_type: 'cement', production_route: 'dry',
            factor_kg_co2_per_kg: '0.50', source: 'custom', id: 'ov-1', justification: 'test',
          }],
          rowCount: 1,
        });

      const req = mockRequest({ params: { projectId: 'p-1' } });
      const res = mockResponse();

      await getProjectPrecursorFactors(req, res);

      const data = res.json.mock.calls[0][0].data;
      expect(data[0].isOverridden).toBe(true);
      expect(data[0].factorKgCo2PerKg).toBe(0.5);
    });

    it('should return defaults when no overrides', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 'pf-1', material_type: 'cement', production_route: 'dry', factor_kg_co2_per_kg: '0.525', source: 'IPCC' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const req = mockRequest({ params: { projectId: 'p-1' } });
      const res = mockResponse();

      await getProjectPrecursorFactors(req, res);

      const data = res.json.mock.calls[0][0].data;
      expect(data[0].isOverridden).toBe(false);
    });
  });

  // ==========================================================================
  // overridePrecursorFactor / deletePrecursorOverride
  // ==========================================================================
  describe('overridePrecursorFactor', () => {
    it('should create a new precursor override', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({
        body: { projectId: 'p-1', materialType: 'cement', productionRoute: 'dry', factorKgCo2PerKg: 0.50 },
      });
      const res = mockResponse();

      await overridePrecursorFactor(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should update existing precursor override', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'ov-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const req = mockRequest({
        body: { projectId: 'p-1', materialType: 'cement', productionRoute: 'dry', factorKgCo2PerKg: 0.48 },
      });
      const res = mockResponse();

      await overridePrecursorFactor(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Precursor factor override updated',
      }));
    });
  });

  describe('deletePrecursorOverride', () => {
    it('should delete a precursor override', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'ov-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      const req = mockRequest({ params: { projectId: 'p-1', materialType: 'cement', productionRoute: 'dry' } });
      const res = mockResponse();

      await deletePrecursorOverride(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should throw NotFoundError', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const req = mockRequest({ params: { projectId: 'p-1', materialType: 'x', productionRoute: 'y' } });
      const res = mockResponse();

      await expect(deletePrecursorOverride(req, res)).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // getStandardEFs
  // ==========================================================================
  describe('getStandardEFs', () => {
    it('should return emission factors by standard', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'ef-1', category: 'fuel', activity_type: 'diesel', scope: 'scope1',
          unit: 'l', factor_value: '2.68', factor_unit: 'kgCO2e', source: 'IPCC',
          region: 'EU', year: 2024, notes: '',
        }],
        rowCount: 1,
      });

      const req = mockRequest({ params: { standard: 'IPCC' } });
      const res = mockResponse();

      await getStandardEFs(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
