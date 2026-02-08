/**
 * Calculation Controller Unit Tests
 * Tests single calc, bulk calc, CFP, CFO, totals, hotspots, data quality
 */
import { Request, Response } from 'express';

jest.mock('../../src/config/database', () => ({
  db: { query: jest.fn() },
  pool: { connect: jest.fn() },
}));

jest.mock('../../src/config/redis', () => ({
  redisClient: {
    get: jest.fn(), set: jest.fn(), del: jest.fn(),
    keys: { project: (id: string) => `project:${id}` },
  },
}));

jest.mock('../../src/config/env', () => ({
  config: {
    tier2PlusMultiplier: 1.05,
    signature: { authorizedRoles: ['owner', 'director'] },
    audit: { retentionDays: 365 },
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('mock-calc-id'),
  roundTo: jest.fn((n: number, d: number) => Number(n.toFixed(d))),
}));

jest.mock('../../src/services/ghgService', () => ({
  lookupEmissionFactor: jest.fn().mockResolvedValue({ factor: 2.6501, source: 'IPCC 2006' }),
  calculatePrecursors: jest.fn().mockResolvedValue(100),
}));

import { db } from '../../src/config/database';
import {
  calculateActivity, calculateAllActivities,
  calculateCFP, calculateCFO, getProjectTotals,
  getHotSpots, getDataQuality, getCFPResults, getCFOResults,
} from '../../src/controllers/calculationController';

const mockDb = db as jest.Mocked<typeof db>;

const makeCalcActivity = (overrides: any = {}) => ({
  id: 'act-1', project_id: 'proj-1', name: 'Diesel Gen',
  scope: 'scope1', scope3_category: null, activity_type: 'stationary_combustion',
  quantity: '5000', unit: 'liters', tier_level: 'tier1',
  calculation_status: 'pending', total_emissions_kg_co2e: null,
  ...overrides,
});

describe('Calculation Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Fully reset the db.query mock to prevent leaked mockResolvedValueOnce from previous tests
    (mockDb.query as jest.Mock).mockReset();
    // Re-establish default mocks that may have been consumed
    const ghg = require('../../src/services/ghgService');
    ghg.lookupEmissionFactor.mockResolvedValue({ factor: 2.6501, source: 'IPCC 2006' });
    ghg.calculatePrecursors.mockResolvedValue(100);
    req = {
      body: {}, params: { projectId: 'proj-1' }, query: {},
      user: { id: 'user-1', userId: 'user-1', email: 'a@b.com', role: 'owner', name: 'Test', signatureAuthorized: false } as any,
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  // ===================== CALCULATE SINGLE ACTIVITY =====================
  describe('calculateActivity', () => {
    it('should calculate emissions for an activity', async () => {
      req.params = { projectId: 'proj-1', activityId: 'act-1' };
      req.body = {};
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [makeCalcActivity()], rowCount: 1 }) // GET activity
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await calculateActivity(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          activityId: 'act-1',
          emissionFactor: 2.6501,
          totalEmissionsKgCo2e: expect.any(Number),
        }),
      });
    });

    it('should throw NotFoundError for missing activity', async () => {
      req.params = { projectId: 'proj-1', activityId: 'gone' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(calculateActivity(req as Request, res as Response))
        .rejects.toThrow('Activity not found');
    });

    it('should use custom emission factor when provided', async () => {
      req.params = { projectId: 'proj-1', activityId: 'act-1' };
      req.body = { customEmissionFactor: 3.0 };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [makeCalcActivity()], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await calculateActivity(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ emissionFactor: 3.0, emissionFactorSource: 'custom' }),
      });
    });

    it('should apply tier2plus multiplier', async () => {
      req.params = { projectId: 'proj-1', activityId: 'act-1' };
      req.body = { tierLevel: 'tier2plus' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [makeCalcActivity()], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await calculateActivity(req as Request, res as Response);

      // 5000 * 2.6501 * 1.05 = 13912.5525
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ tierLevel: 'tier2plus' }),
      });
    });

    it('should use emission factor by ID when provided', async () => {
      req.params = { projectId: 'proj-1', activityId: 'act-1' };
      req.body = { emissionFactorId: 'ef-1' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [makeCalcActivity()], rowCount: 1 }) // activity
        .mockResolvedValueOnce({ rows: [{ id: 'ef-1', factor_value: '2.5', source: 'DEFRA' }], rowCount: 1 }) // EF
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await calculateActivity(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ emissionFactor: 2.5, emissionFactorSource: 'DEFRA' }),
      });
    });
  });

  // ===================== CALCULATE ALL =====================
  describe('calculateAllActivities', () => {
    it('should calculate all pending activities', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            makeCalcActivity({ id: 'act-1' }),
            makeCalcActivity({ id: 'act-2', name: 'LPG Boiler', quantity: '1000' }),
          ],
          rowCount: 2,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE act-1
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE act-2
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await calculateAllActivities(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          summary: expect.objectContaining({ calculated: 2, errors: 0 }),
        }),
      });
    });

    it('should handle calculation errors gracefully', async () => {
      const ghgService = require('../../src/services/ghgService');
      ghgService.lookupEmissionFactor
        .mockResolvedValueOnce({ factor: 2.6501, source: 'IPCC' })
        .mockRejectedValueOnce(new Error('Factor not found'));

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [makeCalcActivity({ id: 'act-1' }), makeCalcActivity({ id: 'act-2' })],
          rowCount: 2,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE success
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE error
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await calculateAllActivities(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          summary: expect.objectContaining({ calculated: 1, errors: 1 }),
        }),
      });
    });
  });

  // ===================== CALCULATE CFP =====================
  describe('calculateCFP', () => {
    it('should calculate carbon footprint of product', async () => {
      req.body = { productName: 'Steel Rod', functionalUnit: 'tonne', productionVolume: 100 };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            makeCalcActivity({ scope: 'scope1', total_emissions_kg_co2e: '5000', calculation_status: 'calculated' }),
            makeCalcActivity({ id: 'act-2', scope: 'scope2', total_emissions_kg_co2e: '3000', calculation_status: 'calculated' }),
          ],
          rowCount: 2,
        })
        .mockResolvedValueOnce({ rows: [{ biogenic: null }], rowCount: 1 }) // biogenic
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT cfp
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await calculateCFP(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          productName: 'Steel Rod',
          cfpTotal: expect.any(Number),
          cfpPerUnit: expect.any(Number),
        }),
      });
    });

    it('should reject when no calculated activities', async () => {
      req.body = { productName: 'Test' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(calculateCFP(req as Request, res as Response))
        .rejects.toThrow('No calculated activities found');
    });
  });

  // ===================== CALCULATE CFO =====================
  describe('calculateCFO', () => {
    it('should calculate carbon footprint of organization', async () => {
      req.body = { organizationName: 'ESG Corp', reportingYear: 2025 };
      const calcActivities = [
        { ...makeCalcActivity(), scope: 'scope1', total_emissions_kg_co2e: '5000', calculation_status: 'calculated' },
        { ...makeCalcActivity({ id: 'a2' }), scope: 'scope2', total_emissions_kg_co2e: '3000', calculation_status: 'calculated' },
        { ...makeCalcActivity({ id: 'a3' }), scope: 'scope3', scope3_category: 'purchased_goods', total_emissions_kg_co2e: '2000', calculation_status: 'calculated' },
      ];
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: calcActivities, rowCount: 3 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT cfo
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await calculateCFO(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          organizationName: 'ESG Corp',
          cfoTotal: expect.any(Number),
          emissions: expect.objectContaining({
            scope1: expect.any(Number),
          }),
        }),
      });
    });

    it('should reject when no calculated activities', async () => {
      req.body = { organizationName: 'Corp' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(calculateCFO(req as Request, res as Response))
        .rejects.toThrow('No calculated activities found');
    });
  });

  // ===================== GET PROJECT TOTALS =====================
  describe('getProjectTotals', () => {
    it('should return emissions totals by scope', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            { scope: 'scope1', scope3_category: null, activity_count: '5', total_emissions: '5000.0000' },
            { scope: 'scope2', scope3_category: null, activity_count: '3', total_emissions: '3000.0000' },
            { scope: 'scope3', scope3_category: 'purchased_goods', activity_count: '2', total_emissions: '2000.0000' },
          ],
          rowCount: 3,
        })
        .mockResolvedValueOnce({ rows: [{ pending: '1' }], rowCount: 1 });

      await getProjectTotals(req as Request, res as Response);

      const call = (res.json as jest.Mock).mock.calls[0][0];
      expect(call.success).toBe(true);
      expect(call.data.scope1).toBe(5000);
      expect(call.data.scope2).toBe(3000);
      expect(call.data.scope3).toBe(2000);
      expect(call.data.total).toBe(10000);
      expect(call.data.pendingActivities).toBe(1);
      expect(call.data.activityCount).toBe(10);
    });
  });

  // ===================== GET HOTSPOTS =====================
  describe('getHotSpots', () => {
    it('should return emission hotspots', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 'act-1', name: 'Diesel', scope: 'scope1', scope3_category: null, activity_type: 'stationary_combustion', total_emissions_kg_co2e: '5000', quantity: '5000', unit: 'liters' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ total: '10000' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ scope: 'scope1', total: '5000' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ activity_type: 'stationary_combustion', total: '5000' }], rowCount: 1 });

      await getHotSpots(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          hotSpots: expect.any(Array),
          byScope: expect.any(Array),
          byActivityType: expect.any(Array),
          totalEmissions: expect.any(Number),
        }),
      });
    });
  });

  // ===================== GET DATA QUALITY =====================
  describe('getDataQuality', () => {
    it('should return data quality assessment', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { scope: 'scope1', data_quality_score: 'high', data_source: 'invoice', tier_level: 'tier1', count: '3', total_emissions: '5000' },
          { scope: 'scope2', data_quality_score: 'medium', data_source: 'estimate', tier_level: 'tier1', count: '2', total_emissions: '3000' },
        ],
        rowCount: 2,
      });

      await getDataQuality(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          overallScore: expect.any(Number),
          qualityRating: expect.any(String),
          breakdown: expect.any(Object),
          recommendations: expect.any(Array),
        }),
      });
    });
  });

  // ===================== GET CFP/CFO RESULTS =====================
  describe('getCFPResults', () => {
    it('should return CFP results', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'cfp-1', product_name: 'Steel', functional_unit: 'tonne',
          production_volume: '100', allocation_method: 'mass',
          raw_materials_emissions: '2000', production_emissions: '5000',
          distribution_emissions: '1000', use_emissions: '0', end_of_life_emissions: '500',
          cfp_total: '8500', cfp_per_unit: '85', biogenic_carbon: '0',
          created_at: new Date(),
        }],
        rowCount: 1,
      });

      await getCFPResults(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([expect.objectContaining({
          productName: 'Steel', cfpTotal: 8500,
          lifecycleStages: expect.objectContaining({ production: 5000 }),
        })]),
      });
    });
  });

  describe('getCFOResults', () => {
    it('should return CFO results', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'cfo-1', organization_name: 'ESG Corp', reporting_year: 2025,
          consolidation_method: 'operational_control', operational_boundary: 'all',
          scope1_emissions: '5000', scope2_location_emissions: '3000',
          scope2_market_emissions: '0', scope3_upstream_emissions: '2000',
          scope3_downstream_emissions: '500', scope3_category_breakdown: {},
          cfo_total: '10500', created_at: new Date(),
        }],
        rowCount: 1,
      });

      await getCFOResults(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([expect.objectContaining({
          organizationName: 'ESG Corp', cfoTotal: 10500,
          emissions: expect.objectContaining({ scope1: 5000 }),
        })]),
      });
    });
  });
});
