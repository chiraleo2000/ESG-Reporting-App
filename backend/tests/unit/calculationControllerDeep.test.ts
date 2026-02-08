/**
 * Calculation Controller Deep Tests
 * Covers: calculateBoth, calculatePrecursors, compareYears, and edge cases
 * for full branch coverage on calculationController.ts
 */
import { Request, Response } from 'express';

jest.mock('../../src/config/database', () => ({
  db: { query: jest.fn() },
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
  generateId: jest.fn().mockReturnValue('mock-id'),
  roundTo: jest.fn((n: number, d: number) => Number(n.toFixed(d))),
}));

jest.mock('../../src/services/ghgService', () => ({
  lookupEmissionFactor: jest.fn().mockResolvedValue({ factor: 2.5, source: 'IPCC' }),
  calculatePrecursors: jest.fn().mockResolvedValue(50),
}));

import { db } from '../../src/config/database';
import {
  calculateBoth,
  calculatePrecursors,
  compareYears,
  calculateActivity,
  calculateAllActivities,
  calculateCFP,
  calculateCFO,
  getHotSpots,
  getDataQuality,
  getProjectTotals,
} from '../../src/controllers/calculationController';

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
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

const makeActivity = (overrides: any = {}) => ({
  id: 'act-1', project_id: 'proj-1', name: 'Gen',
  scope: 'scope1', scope3_category: null, activity_type: 'combustion',
  quantity: 1000, unit: 'kg', tier_level: 'tier1',
  calculation_status: 'calculated', total_emissions_kg_co2e: '2500',
  ...overrides,
});

describe('calculationController – deep coverage', () => {
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.query as jest.Mock).mockReset();
    res = makeRes();
  });

  // ======================== calculateBoth ========================
  describe('calculateBoth', () => {
    it('should calculate both CFP and CFO in one call', async () => {
      const req = makeReq({
        body: {
          productName: 'Steel',
          functionalUnit: 'kg',
          productionVolume: 100,
          organizationName: 'Corp',
          reportingYear: 2025,
        },
      });
      const activities = [
        makeActivity({ scope: 'scope1', total_emissions_kg_co2e: '5000' }),
        makeActivity({ id: 'a2', scope: 'scope2', total_emissions_kg_co2e: '3000' }),
        makeActivity({ id: 'a3', scope: 'scope3', scope3_category: 'purchased_goods', total_emissions_kg_co2e: '2000' }),
      ];
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: activities, rowCount: 3 }) // activities
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT cfp
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT cfo
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // audit CFP
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit CFO

      await calculateBoth(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          cfp: expect.objectContaining({ cfpTotal: expect.any(Number) }),
          cfo: expect.objectContaining({ cfoTotal: expect.any(Number) }),
        }),
      });
    });

    it('should reject when no calculated activities', async () => {
      const req = makeReq({ body: { productName: 'X' } });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(calculateBoth(req as Request, res as Response))
        .rejects.toThrow('No calculated activities found');
    });

    it('should map scope3 categories to lifecycle stages and scope breakdown', async () => {
      const req = makeReq({
        body: { productionVolume: 10, organizationName: 'Test' },
      });
      const activities = [
        makeActivity({ scope: 'scope3', scope3_category: 'upstream_transport', total_emissions_kg_co2e: '100' }),
        makeActivity({ id: 'a2', scope: 'scope3', scope3_category: 'waste', total_emissions_kg_co2e: '200' }),
        makeActivity({ id: 'a3', scope: 'scope3', scope3_category: 'use_of_products', total_emissions_kg_co2e: '300' }),
        makeActivity({ id: 'a4', scope: 'scope3', scope3_category: 'downstream_transport', total_emissions_kg_co2e: '150' }),
        makeActivity({ id: 'a5', scope: 'scope3', scope3_category: 'processing', total_emissions_kg_co2e: '50' }),
        makeActivity({ id: 'a6', scope: 'scope3', scope3_category: 'investments', total_emissions_kg_co2e: '75' }),
        makeActivity({ id: 'a7', scope: 'scope3', scope3_category: 'end_of_life', total_emissions_kg_co2e: '80' }),
        makeActivity({ id: 'a8', scope: 'scope3', scope3_category: null, total_emissions_kg_co2e: '60' }),
      ];
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: activities, rowCount: activities.length })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await calculateBoth(req as Request, res as Response);

      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.success).toBe(true);
      // distribution = upstream_transport(100) + downstream_transport(150) = 250 in CFP
      expect(result.data.cfp.lifecycleStages.distribution).toBe(250);
    });

    it('should use defaults when optional fields are omitted', async () => {
      const req = makeReq({ body: {} });
      const activities = [makeActivity({ scope: 'scope1', total_emissions_kg_co2e: '1000' })];
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: activities, rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await calculateBoth(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      // Defaults: productName 'Product', functionalUnit 'unit'
      expect(data.cfp).toBeDefined();
      expect(data.cfo).toBeDefined();
    });
  });

  // ======================== calculatePrecursors ========================
  describe('calculatePrecursors', () => {
    it('should calculate precursor emissions for materials', async () => {
      const req = makeReq({
        params: {},
        body: {
          materials: ['steel', 'aluminium'],
          productionRoutes: ['BF-BOF', 'smelting'],
          quantities: [1000, 500],
        },
      });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ material_type: 'steel', factor_kg_co2_per_kg: '1.85', source: 'IPCC', production_route: 'BF-BOF' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ material_type: 'aluminium', factor_kg_co2_per_kg: '8.24', source: 'DEFRA', production_route: 'smelting' }], rowCount: 1 });

      await calculatePrecursors(req as Request, res as Response);

      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.success).toBe(true);
      expect(result.data.precursors).toHaveLength(2);
      expect(result.data.precursors[0].factor).toBe(1.85);
      expect(result.data.precursors[1].factor).toBe(8.24);
    });

    it('should use default factor when material not found in DB', async () => {
      const req = makeReq({
        params: {},
        body: { materials: ['unknown_material'], quantities: [100] },
      });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await calculatePrecursors(req as Request, res as Response);

      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.data.precursors[0].factor).toBe(2.0);
      expect(result.data.precursors[0].source).toBe('default_estimate');
    });

    it('should throw when materials array is empty', async () => {
      const req = makeReq({ params: {}, body: { materials: [] } });

      await expect(calculatePrecursors(req as Request, res as Response))
        .rejects.toThrow('Materials array is required');
    });

    it('should throw when materials is missing', async () => {
      const req = makeReq({ params: {}, body: {} });

      await expect(calculatePrecursors(req as Request, res as Response))
        .rejects.toThrow('Materials array is required');
    });

    it('should default productionRoute to "default" and quantity to 1', async () => {
      const req = makeReq({
        params: {},
        body: { materials: ['cement'] },
      });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await calculatePrecursors(req as Request, res as Response);

      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.data.precursors[0].productionRoute).toBe('default');
      expect(result.data.precursors[0].quantity).toBe(1);
      // 1 * 2.0 = 2.0 (default)
      expect(result.data.totalEmissions).toBe(2);
    });
  });

  // ======================== compareYears ========================
  describe('compareYears', () => {
    it('should compare baseline and reporting years', async () => {
      const req = makeReq({ query: { baselineYear: '2023', reportingYear: '2024' } });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ baseline_year: 2023, reporting_year: 2024 }], rowCount: 1,
        }) // project
        .mockResolvedValueOnce({
          rows: [
            { reporting_year: 2023, cfo_total: '10000', scope1_emissions: '5000', scope2_location_emissions: '3000', scope3_upstream_emissions: '1500', scope3_downstream_emissions: '500' },
            { reporting_year: 2024, cfo_total: '8000', scope1_emissions: '4000', scope2_location_emissions: '2500', scope3_upstream_emissions: '1000', scope3_downstream_emissions: '500' },
          ],
          rowCount: 2,
        }); // cfo results

      await compareYears(req as Request, res as Response);

      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.success).toBe(true);
      expect(result.data.comparison.direction).toBe('decrease');
      expect(result.data.comparison.absoluteChange).toBe(-2000);
    });

    it('should throw when project not found', async () => {
      const req = makeReq({ query: {} });
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(compareYears(req as Request, res as Response))
        .rejects.toThrow('Project not found');
    });

    it('should throw when CFO results not found for both years', async () => {
      const req = makeReq({ query: {} });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ baseline_year: 2023, reporting_year: 2024 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(compareYears(req as Request, res as Response))
        .rejects.toThrow('CFO results not found for both baseline and reporting years');
    });

    it('should use project years when query params omitted', async () => {
      const req = makeReq({ query: {} });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ baseline_year: 2022, reporting_year: 2023 }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            { reporting_year: 2022, cfo_total: '5000', scope1_emissions: '3000', scope2_location_emissions: '1000', scope3_upstream_emissions: '500', scope3_downstream_emissions: '500' },
            { reporting_year: 2023, cfo_total: '5000', scope1_emissions: '3000', scope2_location_emissions: '1000', scope3_upstream_emissions: '500', scope3_downstream_emissions: '500' },
          ],
          rowCount: 2,
        });

      await compareYears(req as Request, res as Response);

      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.data.comparison.direction).toBe('unchanged');
      expect(result.data.baselineYear).toBe(2022);
      expect(result.data.reportingYear).toBe(2023);
    });

    it('should report increase direction when emissions rise', async () => {
      const req = makeReq({ query: { baselineYear: '2023', reportingYear: '2024' } });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ baseline_year: 2023, reporting_year: 2024 }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            { reporting_year: 2023, cfo_total: '5000', scope1_emissions: '3000', scope2_location_emissions: '1000', scope3_upstream_emissions: '500', scope3_downstream_emissions: '500' },
            { reporting_year: 2024, cfo_total: '7000', scope1_emissions: '4000', scope2_location_emissions: '2000', scope3_upstream_emissions: '600', scope3_downstream_emissions: '400' },
          ],
          rowCount: 2,
        });

      await compareYears(req as Request, res as Response);

      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.data.comparison.direction).toBe('increase');
      expect(result.data.comparison.absoluteChange).toBe(2000);
    });
  });

  // ======================== Edge cases for existing functions ========================
  describe('calculateActivity – edge cases', () => {
    it('should throw NotFoundError when emission factor ID not found', async () => {
      const req = makeReq({
        params: { projectId: 'proj-1', activityId: 'act-1' },
        body: { emissionFactorId: 'ef-missing' },
      });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [makeActivity()], rowCount: 1 }) // activity found
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // EF not found

      await expect(calculateActivity(req as Request, res as Response))
        .rejects.toThrow('Emission factor not found');
    });

    it('should include precursors for scope3 when requested', async () => {
      const req = makeReq({
        params: { projectId: 'proj-1', activityId: 'act-1' },
        body: { includePrecursors: true },
      });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [makeActivity({ scope: 'scope3' })], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await calculateActivity(req as Request, res as Response);

      const ghgService = require('../../src/services/ghgService');
      expect(ghgService.calculatePrecursors).toHaveBeenCalled();
      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.data.precursorEmissions).toBe(50);
    });
  });

  describe('calculateAllActivities – edge cases', () => {
    it('should include precursors for scope3 activities when flag is set', async () => {
      const req = makeReq({ body: { includePrecursors: true } });
      const activities = [
        makeActivity({ id: 'a1', scope: 'scope3', calculation_status: 'pending', quantity: 100 }),
      ];
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: activities, rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await calculateAllActivities(req as Request, res as Response);

      const ghgService = require('../../src/services/ghgService');
      expect(ghgService.calculatePrecursors).toHaveBeenCalled();
    });

    it('should apply tier2plus multiplier in bulk calculation', async () => {
      const req = makeReq({ body: {} });
      const activities = [
        makeActivity({ id: 'a1', tier_level: 'tier2plus', calculation_status: 'pending', quantity: 100 }),
      ];
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: activities, rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await calculateAllActivities(req as Request, res as Response);

      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.data.summary.calculated).toBe(1);
    });
  });

  describe('calculateCFP – edge cases', () => {
    it('should handle biogenic carbon with includeBiogenic flag', async () => {
      const req = makeReq({
        body: { productName: 'P', functionalUnit: 'kg', productionVolume: 10, includeBiogenic: true },
      });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [makeActivity({ scope: 'scope1', total_emissions_kg_co2e: '500' })],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ biogenic: '50' }], rowCount: 1 }) // biogenic query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await calculateCFP(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.biogenicCarbon).toBe(50);
    });

    it('should handle zero productionVolume (cfpPerUnit = totalEmissions)', async () => {
      const req = makeReq({
        body: { productName: 'P', productionVolume: 0 },
      });
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [makeActivity({ scope: 'scope1', total_emissions_kg_co2e: '1000' })],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await calculateCFP(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.cfpTotal).toBe(data.cfpPerUnit);
    });

    it('should map all scope3 categories to lifecycle stages', async () => {
      const req = makeReq({
        body: { productName: 'P', productionVolume: 1 },
      });
      const activities = [
        makeActivity({ scope: 'scope3', scope3_category: 'purchased_goods', total_emissions_kg_co2e: '100' }),
        makeActivity({ id: 'a2', scope: 'scope3', scope3_category: 'capital_goods', total_emissions_kg_co2e: '200' }),
        makeActivity({ id: 'a3', scope: 'scope3', scope3_category: 'fuel_energy', total_emissions_kg_co2e: '50' }),
        makeActivity({ id: 'a4', scope: 'scope3', scope3_category: 'upstream_transport', total_emissions_kg_co2e: '75' }),
        makeActivity({ id: 'a5', scope: 'scope3', scope3_category: 'downstream_transport', total_emissions_kg_co2e: '80' }),
        makeActivity({ id: 'a6', scope: 'scope3', scope3_category: 'waste', total_emissions_kg_co2e: '60' }),
        makeActivity({ id: 'a7', scope: 'scope3', scope3_category: 'end_of_life', total_emissions_kg_co2e: '40' }),
        makeActivity({ id: 'a8', scope: 'scope3', scope3_category: 'use_of_products', total_emissions_kg_co2e: '90' }),
        makeActivity({ id: 'a9', scope: 'scope3', scope3_category: 'processing', total_emissions_kg_co2e: '30' }),
        makeActivity({ id: 'a10', scope: 'scope3', scope3_category: 'other_default', total_emissions_kg_co2e: '25' }),
      ];
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: activities, rowCount: activities.length })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await calculateCFP(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.lifecycleStages.rawMaterials).toBe(350);   // purchased_goods + capital_goods + fuel_energy
      expect(data.lifecycleStages.distribution).toBe(155);    // upstream + downstream transport
      expect(data.lifecycleStages.endOfLife).toBe(100);       // waste + end_of_life
      expect(data.lifecycleStages.use).toBe(120);             // use_of_products + processing
      expect(data.lifecycleStages.production).toBe(25);       // default bucket
    });
  });

  describe('calculateCFO – scope3 upstream/downstream classification', () => {
    it('should classify upstream vs downstream scope3', async () => {
      const req = makeReq({ body: { organizationName: 'Corp' } });
      const activities = [
        makeActivity({ scope: 'scope3', scope3_category: 'business_travel', total_emissions_kg_co2e: '100' }),
        makeActivity({ id: 'a2', scope: 'scope3', scope3_category: 'employee_commuting', total_emissions_kg_co2e: '50' }),
        makeActivity({ id: 'a3', scope: 'scope3', scope3_category: 'investments', total_emissions_kg_co2e: '200' }),
        makeActivity({ id: 'a4', scope: 'scope3', scope3_category: 'upstream_leased', total_emissions_kg_co2e: '30' }),
      ];
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: activities, rowCount: 4 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await calculateCFO(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      // upstream: business_travel(100)+employee_commuting(50)+upstream_leased(30) = 180
      expect(data.emissions.scope3.upstream).toBe(180);
      // downstream: investments(200)
      expect(data.emissions.scope3.downstream).toBe(200);
    });

    it('should use "other" for null scope3_category', async () => {
      const req = makeReq({ body: { organizationName: 'Corp' } });
      const activities = [
        makeActivity({ scope: 'scope3', scope3_category: null, total_emissions_kg_co2e: '100' }),
      ];
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: activities, rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await calculateCFO(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.emissions.scope3.categoryBreakdown).toHaveProperty('other');
    });
  });

  describe('getHotSpots – edge cases', () => {
    it('should handle zero total emissions gracefully', async () => {
      const req = makeReq();
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // no activities
        .mockResolvedValueOnce({ rows: [{ total: null }], rowCount: 1 }) // null total
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // scope
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // activity type

      await getHotSpots(req as Request, res as Response);

      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.data.totalEmissions).toBe(0);
      expect(result.data.hotSpots).toHaveLength(0);
    });
  });

  describe('getDataQuality – quality ratings', () => {
    it('should rate "excellent" for high quality', async () => {
      const req = makeReq();
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ scope: 'scope1', data_quality_score: 'high', data_source: 'invoice', tier_level: 'tier2', count: '10', total_emissions: '50000' }],
        rowCount: 1,
      });

      await getDataQuality(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.qualityRating).toBe('excellent');
      expect(data.overallScore).toBeGreaterThanOrEqual(0.9);
    });

    it('should rate "needs_improvement" for low quality', async () => {
      const req = makeReq();
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ scope: 'scope1', data_quality_score: 'low', data_source: 'estimate', tier_level: 'tier1', count: '10', total_emissions: '50000' }],
        rowCount: 1,
      });

      await getDataQuality(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.qualityRating).toBe('needs_improvement');
    });

    it('should generate all three recommendation types', async () => {
      const req = makeReq();
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { scope: 'scope1', data_quality_score: 'low', data_source: 'estimate', tier_level: 'tier1', count: '5', total_emissions: '5000' },
          { scope: 'scope2', data_quality_score: 'medium', data_source: 'invoice', tier_level: 'tier1', count: '3', total_emissions: '3000' },
        ],
        rowCount: 2,
      });

      await getDataQuality(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.recommendations).toContain('Consider improving data quality for low-quality activities');
      expect(data.recommendations).toContain('Replace estimated data with measured or invoiced data where possible');
      expect(data.recommendations).toContain('Consider using Tier 2+ calculations for more accurate results');
    });

    it('should handle empty rows (no activities)', async () => {
      const req = makeReq();
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await getDataQuality(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.overallScore).toBe(0);
    });

    it('should rate "moderate" for score ~0.5', async () => {
      const req = makeReq();
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { scope: 'scope1', data_quality_score: 'medium', data_source: 'measured', tier_level: 'tier2', count: '5', total_emissions: '5000' },
          { scope: 'scope2', data_quality_score: 'unknown', data_source: 'estimate', tier_level: 'tier1', count: '5', total_emissions: '5000' },
        ],
        rowCount: 2,
      });

      await getDataQuality(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.qualityRating).toBe('moderate');
    });
  });

  describe('getProjectTotals – edge cases', () => {
    it('should aggregate scope3Categories correctly', async () => {
      const req = makeReq();
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            { scope: 'scope3', scope3_category: 'purchased_goods', activity_count: '2', total_emissions: '1000' },
            { scope: 'scope3', scope3_category: 'waste', activity_count: '1', total_emissions: '500' },
          ],
          rowCount: 2,
        })
        .mockResolvedValueOnce({ rows: [{ pending: '0' }], rowCount: 1 });

      await getProjectTotals(req as Request, res as Response);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data.scope3Categories).toHaveProperty('purchased_goods', 1000);
      expect(data.scope3Categories).toHaveProperty('waste', 500);
      expect(data.scope3).toBe(1500);
      expect(data.totalTonnesCO2e).toBeDefined();
    });
  });
});
