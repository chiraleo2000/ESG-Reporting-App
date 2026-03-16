/**
 * GHG Service Integration Tests — actual exported functions
 * Covers: lookupEmissionFactor, getGridEmissionFactor, calculatePrecursors,
 * calculateScope2MarketBased, getCBAMEmissionFactors, aggregateProjectEmissions
 */

// Mock dependencies BEFORE imports
jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
  db: { query: jest.fn(), queryOne: jest.fn() },
}));

jest.mock('../../src/config/redis', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  },
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('test-uuid'),
  roundTo: jest.fn((num: number, decimals: number) => {
    const f = Math.pow(10, decimals);
    return Math.round(num * f) / f;
  }),
}));

import { db } from '../../src/config/database';
import { redis } from '../../src/config/redis';
import { logger } from '../../src/utils/logger';
import {
  lookupEmissionFactor,
  getGridEmissionFactor,
  calculatePrecursors,
  calculateScope2MarketBased,
  getCBAMEmissionFactors,
  aggregateProjectEmissions,
} from '../../src/services/ghgService';

const mockDb = db as jest.Mocked<typeof db>;
const mockRedis = redis as jest.Mocked<typeof redis>;

describe('GHG Service — Exported Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.query as jest.Mock).mockReset();
    (mockRedis.get as jest.Mock).mockReset();
    (mockRedis.setex as jest.Mock).mockReset();
  });

  // ==========================================================================
  // lookupEmissionFactor
  // ==========================================================================
  describe('lookupEmissionFactor', () => {
    it('should return cached emission factor if available', async () => {
      const cached = JSON.stringify({ factor: 2.68, source: 'custom' });
      (mockRedis.get as jest.Mock).mockResolvedValue(cached);

      const result = await lookupEmissionFactor('stationary_combustion', 'diesel_l', 'scope1');

      expect(result).toEqual({ factor: 2.68, source: 'custom' });
      expect(mockRedis.get).toHaveBeenCalledWith('ef:stationary_combustion:diesel_l');
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return database factor if not cached', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{ factor_value: '3.14', source: 'ipcc_2023' }],
        rowCount: 1,
      });

      const result = await lookupEmissionFactor('mobile_combustion', 'petrol_l', 'scope1');

      expect(result).toEqual({ factor: 3.14, source: 'ipcc_2023' });
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should fall back to default factors when no cache or DB entry', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await lookupEmissionFactor('stationary_combustion', 'diesel_l', 'scope1');

      expect(result).toEqual({ factor: 2.68, source: 'default' });
    });

    it('should return estimate when no factor found anywhere', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await lookupEmissionFactor('unknown_activity', 'unknown_unit', 'scope1');

      expect(result).toEqual({ factor: 1, source: 'estimate' });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle purchased electricity kwh default factor', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await lookupEmissionFactor('purchased_electricity', 'kwh', 'scope2');
      expect(result).toEqual({ factor: 0.42, source: 'default' });
    });

    it('should handle business travel km_air factor', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await lookupEmissionFactor('business_travel', 'km_air', 'scope3');
      expect(result).toEqual({ factor: 0.195, source: 'default' });
    });

    it('should handle process emissions cement_tonne factor', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await lookupEmissionFactor('process_emissions', 'cement_tonne', 'scope1');
      expect(result).toEqual({ factor: 525, source: 'default' });
    });

    it('should handle fugitive emissions refrigerant factor', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await lookupEmissionFactor('fugitive_emissions', 'refrigerant_r410a_kg', 'scope1');
      expect(result).toEqual({ factor: 2088, source: 'default' });
    });

    it('should handle waste kg_landfill factor', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await lookupEmissionFactor('waste', 'kg_landfill', 'scope3');
      expect(result).toEqual({ factor: 0.58, source: 'default' });
    });

    it('should handle natural_gas_m3 default factor', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await lookupEmissionFactor('stationary_combustion', 'natural_gas_m3', 'scope1');
      expect(result).toEqual({ factor: 2.02, source: 'default' });
    });

    it('should handle purchased_steam kwh factor', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await lookupEmissionFactor('purchased_steam', 'kwh', 'scope2');
      expect(result).toEqual({ factor: 0.19, source: 'default' });
    });

    it('should handle purchased_cooling kwh factor', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await lookupEmissionFactor('purchased_cooling', 'kwh', 'scope2');
      expect(result).toEqual({ factor: 0.15, source: 'default' });
    });

    it('should handle employee_commuting km factor', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await lookupEmissionFactor('employee_commuting', 'km', 'scope3');
      expect(result).toEqual({ factor: 0.17, source: 'default' });
    });

    it('should handle upstream_transport tonne_km factor', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await lookupEmissionFactor('upstream_transport', 'tonne_km', 'scope3');
      expect(result).toEqual({ factor: 0.1, source: 'default' });
    });

    it('should handle capital_goods usd factor', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await lookupEmissionFactor('capital_goods', 'usd', 'scope3');
      expect(result).toEqual({ factor: 0.5, source: 'default' });
    });
  });

  // ==========================================================================
  // getGridEmissionFactor
  // ==========================================================================
  describe('getGridEmissionFactor', () => {
    it('should return cached grid emission factor', async () => {
      const cached = JSON.stringify({ factor: 0.456, source: 'egat_2024' });
      (mockRedis.get as jest.Mock).mockResolvedValue(cached);

      const result = await getGridEmissionFactor('Thailand', 2024);

      expect(result).toEqual({ factor: 0.456, source: 'egat_2024' });
      expect(mockRedis.get).toHaveBeenCalledWith('grid_ef:Thailand:2024');
    });

    it('should return DB grid factor when not cached', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ factor_kg_co2_per_kwh: '0.4561', source: 'egat' }],
        rowCount: 1,
      });

      const result = await getGridEmissionFactor('Thailand', 2024);
      expect(result).toEqual({ factor: 0.4561, source: 'egat' });
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should fall back to previous year when current year not found', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [{ factor_kg_co2_per_kwh: '0.45', source: 'egat', year: 2023 }],
          rowCount: 1,
        });

      const result = await getGridEmissionFactor('Thailand', 2024);
      expect(result).toEqual({ factor: 0.45, source: 'egat (2023)' });
      expect(logger.info).toHaveBeenCalled();
    });

    it('should return global average when no factor found', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await getGridEmissionFactor('UnknownRegion', 2024);
      expect(result).toEqual({ factor: 0.42, source: 'global_average' });
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // calculatePrecursors
  // ==========================================================================
  describe('calculatePrecursors', () => {
    it('should return 0 when no precursor factors found', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await calculatePrecursors('act-1', 'cement', 100, 'kg');
      expect(result).toBe(0);
    });

    it('should calculate precursor emissions for kg', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ factor_kg_co2_per_kg: '0.525', material_type: 'clinker', production_route: 'dry_process' }],
          rowCount: 1,
        })
        .mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await calculatePrecursors('act-1', 'cement', 100, 'kg');
      expect(result).toBe(52.5);
    });

    it('should convert tonnes to kg for calculation', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ factor_kg_co2_per_kg: '0.525', material_type: 'clinker', production_route: 'dry' }],
          rowCount: 1,
        })
        .mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await calculatePrecursors('act-1', 'cement', 1, 'tonnes');
      expect(result).toBe(525);
    });

    it('should convert grams to kg', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ factor_kg_co2_per_kg: '1.0', material_type: 'mat', production_route: 'r' }],
          rowCount: 1,
        })
        .mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await calculatePrecursors('act-1', 'test', 5000, 'g');
      expect(result).toBe(5);
    });

    it('should sum multiple precursor factors', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            { factor_kg_co2_per_kg: '0.5', material_type: 'iron_ore', production_route: 'bof' },
            { factor_kg_co2_per_kg: '0.3', material_type: 'coke', production_route: 'bof' },
          ],
          rowCount: 2,
        })
        .mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await calculatePrecursors('act-1', 'steel', 100, 'kg');
      expect(result).toBe(80);
    });

    it('should save precursor calculation to database', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ factor_kg_co2_per_kg: '0.525', material_type: 'clinker', production_route: 'dry' }],
          rowCount: 1,
        })
        .mockResolvedValue({ rows: [], rowCount: 0 });

      await calculatePrecursors('act-1', 'cement', 10, 'kg');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO precursor_calculations'),
        expect.arrayContaining(['test-uuid', 'act-1', 'clinker'])
      );
    });
  });

  // ==========================================================================
  // calculateScope2MarketBased
  // ==========================================================================
  describe('calculateScope2MarketBased', () => {
    it('should calculate with single PPA covering all kwh', async () => {
      const instruments = [{ type: 'ppa' as const, quantityKwh: 1000, emissionFactor: 0.05, supplier: 'Solar' }];
      const result = await calculateScope2MarketBased(1000, instruments);
      expect(result).toEqual({ emissions: 50, source: 'market_based' });
    });

    it('should use residual mix for uncovered electricity', async () => {
      const instruments = [{ type: 'rec' as const, quantityKwh: 500, emissionFactor: 0 }];
      const result = await calculateScope2MarketBased(1000, instruments);
      expect(result).toEqual({ emissions: 210, source: 'market_based' });
    });

    it('should handle multiple instruments', async () => {
      const instruments = [
        { type: 'ppa' as const, quantityKwh: 300, emissionFactor: 0.02 },
        { type: 'rec' as const, quantityKwh: 400, emissionFactor: 0 },
      ];
      const result = await calculateScope2MarketBased(1000, instruments);
      // 300*0.02 + 400*0 + 300*0.42 = 6 + 0 + 126 = 132
      expect(result).toEqual({ emissions: 132, source: 'market_based' });
    });

    it('should handle empty instruments list', async () => {
      const result = await calculateScope2MarketBased(1000, []);
      expect(result).toEqual({ emissions: 420, source: 'market_based' });
    });

    it('should handle zero electricity', async () => {
      const result = await calculateScope2MarketBased(0, []);
      expect(result).toEqual({ emissions: 0, source: 'market_based' });
    });

    it('should cap at total kwh when instrument exceeds', async () => {
      const instruments = [{ type: 'ppa' as const, quantityKwh: 5000, emissionFactor: 0.05 }];
      const result = await calculateScope2MarketBased(1000, instruments);
      expect(result).toEqual({ emissions: 50, source: 'market_based' });
    });
  });

  // ==========================================================================
  // getCBAMEmissionFactors
  // ==========================================================================
  describe('getCBAMEmissionFactors', () => {
    it('should return country-specific factors from database', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{ direct_emissions: '0.55', indirect_emissions: '0.06', precursor_emissions: '0.01' }],
        rowCount: 1,
      });

      const result = await getCBAMEmissionFactors('cement', 'DE');
      expect(result).toEqual({
        directEmissions: 0.55, indirectEmissions: 0.06, precursorEmissions: 0.01, source: 'cbam_DE',
      });
    });

    it('should return default factors for cement', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await getCBAMEmissionFactors('cement', 'XX');
      expect(result.directEmissions).toBe(0.525);
    });

    it('should return default factors for iron_steel', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await getCBAMEmissionFactors('iron_steel', 'CN');
      expect(result.directEmissions).toBe(1.85);
    });

    it('should return default factors for aluminum', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await getCBAMEmissionFactors('aluminum', 'RU');
      expect(result.indirectEmissions).toBe(8.5);
    });

    it('should return default factors for electricity', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await getCBAMEmissionFactors('electricity', 'UK');
      expect(result.indirectEmissions).toBe(0.42);
    });

    it('should return default factors for hydrogen', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await getCBAMEmissionFactors('hydrogen', 'JP');
      expect(result.directEmissions).toBe(9);
    });

    it('should return generic defaults for unknown category', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await getCBAMEmissionFactors('unknown_goods', 'XX');
      expect(result.directEmissions).toBe(1);
      expect(result.source).toBe('cbam_default');
    });
  });

  // ==========================================================================
  // aggregateProjectEmissions
  // ==========================================================================
  describe('aggregateProjectEmissions', () => {
    it('should aggregate emissions by scope', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [
          { scope: 'scope1', scope3_category: null, total: '100.5' },
          { scope: 'scope2', scope3_category: null, total: '200.3' },
          { scope: 'scope3', scope3_category: 'business_travel', total: '50.2' },
          { scope: 'scope3', scope3_category: 'waste', total: '25.1' },
        ],
        rowCount: 4,
      });

      const result = await aggregateProjectEmissions('proj-1');
      expect(result.scope1).toBe(100.5);
      expect(result.scope2).toBe(200.3);
      expect(result.scope3).toBe(75.3);
      expect(result.total).toBe(376.1);
      expect(result.scope3Categories).toEqual({ business_travel: 50.2, waste: 25.1 });
    });

    it('should return zeros when no activities found', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await aggregateProjectEmissions('empty-proj');
      expect(result).toEqual({ scope1: 0, scope2: 0, scope3: 0, scope3Categories: {}, total: 0 });
    });

    it('should handle NaN total values gracefully', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [
          { scope: 'scope1', scope3_category: null, total: 'not_a_number' },
          { scope: 'scope2', scope3_category: null, total: '100' },
        ],
        rowCount: 2,
      });
      const result = await aggregateProjectEmissions('proj-1');
      expect(result.scope1).toBe(0);
      expect(result.scope2).toBe(100);
    });

    it('should handle scope3 without category', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{ scope: 'scope3', scope3_category: null, total: '75' }],
        rowCount: 1,
      });
      const result = await aggregateProjectEmissions('proj-1');
      expect(result.scope3).toBe(75);
      expect(result.scope3Categories).toEqual({});
    });
  });
});
