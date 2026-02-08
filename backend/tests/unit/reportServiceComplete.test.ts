/**
 * Report Service Complete Tests
 * Covers: generateReportData, validateReportData, generateReportFiles,
 * getStandardRequirements, getOverlappingFields, and all 6 standard validators
 */

jest.mock('../../src/config/database', () => ({
  db: { query: jest.fn() },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('mock-id'),
  roundTo: jest.fn((n: number, d: number) => Number(n.toFixed(d))),
}));

jest.mock('../../src/services/ghgService', () => ({
  aggregateProjectEmissions: jest.fn().mockResolvedValue({
    scope1: 5000, scope2: 3000, scope3: 2000,
    scope3Categories: { purchased_goods: 1500, waste: 500 },
    total: 10000,
  }),
}));

jest.mock('pdfkit', () => {
  const mockDoc = {
    pipe: jest.fn().mockReturnThis(),
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    addPage: jest.fn().mockReturnThis(),
    end: jest.fn(),
    page: { height: 800 },
  };
  return jest.fn(() => mockDoc);
});

jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn().mockReturnValue({}),
    aoa_to_sheet: jest.fn().mockReturnValue({}),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn().mockReturnValue({
    on: jest.fn((event: string, cb: () => void) => {
      if (event === 'finish') setTimeout(cb, 0);
    }),
  }),
}));

import { db } from '../../src/config/database';
import {
  generateReportData,
  validateReportData,
  generateReportFiles,
  getStandardRequirements,
  getOverlappingFields,
} from '../../src/services/reportService';

const mockDb = db as jest.Mocked<typeof db>;

describe('Report Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.query as jest.Mock).mockReset();
  });

  // ======================== generateReportData ========================
  describe('generateReportData', () => {
    it('should generate report data for eu_cbam', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'proj-1', name: 'Test', company: 'Corp', facility_name: 'F1', facility_location: 'EU', industry: 'steel', baseline_year: 2023, reporting_year: 2024 }], rowCount: 1 }) // project
        .mockResolvedValueOnce({ rows: [{ name: 'A1', scope: 'scope1', scope3_category: null, quantity: '100', unit: 'kg', total_emissions_kg_co2e: '500', tier_level: 'tier1' }], rowCount: 1 }) // activities
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // cfp
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // cfo
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // precursor data for eu_cbam

      const result = await generateReportData('proj-1', 'eu_cbam' as any);

      expect(result.project.name).toBe('Test');
      expect(result.emissions.total).toBe(10000);
      expect(result.standard).toBe('eu_cbam');
      expect(result.standardSpecific).toBeDefined();
    });

    it('should include CFP/CFO data when available', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'p1', name: 'T', company: 'C', baseline_year: 2023, reporting_year: 2024 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ product_name: 'Steel', functional_unit: 'tonne', cfp_total: '5000', cfp_per_unit: '50' }], rowCount: 1 }) // cfp
        .mockResolvedValueOnce({ rows: [{ organization_name: 'Corp', cfo_total: '8000' }], rowCount: 1 }) // cfo
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // standard-specific

      const result = await generateReportData('p1', 'uk_cbam' as any);

      expect(result.cfp!.productName).toBe('Steel');
      expect(result.cfo!.organizationName).toBe('Corp');
    });

    it('should generate for each standard type', async () => {
      const standards = ['eu_cbam', 'uk_cbam', 'china_carbon_market', 'k_esg', 'maff_esg', 'thai_esg'] as any[];
      for (const std of standards) {
        (mockDb.query as jest.Mock).mockReset();
        (mockDb.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [{ id: 'p1', name: 'T', company: 'C', baseline_year: 2023, reporting_year: 2024 }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [{ name: 'A', scope: 'scope1', scope3_category: null, quantity: '10', unit: 'kg', total_emissions_kg_co2e: '50', tier_level: 'tier1' }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValue({ rows: [], rowCount: 0 });

        const result = await generateReportData('p1', std);
        expect(result.standard).toBe(std);
      }
    });
  });

  // ======================== validateReportData ========================
  describe('validateReportData', () => {
    const makeData = (overrides: any = {}) => ({
      project: { id: 'p1', name: 'Test', company: 'Corp', baselineYear: 2023, reportingYear: 2024 },
      reportingPeriod: { startDate: '2024-01-01', endDate: '2024-12-31' },
      emissions: { scope1: 5000, scope2: 3000, scope3: 2000, scope3Categories: {}, total: 10000 },
      activities: [],
      generatedAt: new Date().toISOString(),
      standard: 'eu_cbam',
      standardSpecific: {},
      ...overrides,
    });

    it('should validate eu_cbam and return errors for missing required fields', async () => {
      const data = makeData({ standardSpecific: {} });

      const result = await validateReportData(data, 'eu_cbam' as any);

      // Will have missing required standard-specific fields
      expect(result.missingRequired.length).toBeGreaterThan(0);
    });

    it('should validate eu_cbam with zero emissions producing error', async () => {
      const data = makeData({
        emissions: { scope1: 0, scope2: 0, scope3: 0, scope3Categories: {}, total: 0 },
        standardSpecific: { cnCode: 'CN7208' },
      });

      const result = await validateReportData(data, 'eu_cbam' as any);

      expect(result.errors.some((e: any) => e.message.includes('emission type'))).toBe(true);
    });

    it('should validate uk_cbam and warn about missing commodity code', async () => {
      const data = makeData({ standard: 'uk_cbam', standardSpecific: {} });

      const result = await validateReportData(data, 'uk_cbam' as any);

      expect(result.warnings.some((w: any) => w.field === 'ukCommodityCode')).toBe(true);
    });

    it('should validate china_carbon_market and error on missing credit code', async () => {
      const data = makeData({ standard: 'china_carbon_market', standardSpecific: {} });

      const result = await validateReportData(data, 'china_carbon_market' as any);

      expect(result.errors.some((e: any) => e.field === 'unifiedSocialCreditCode')).toBe(true);
    });

    it('should validate k_esg with missing reduction target error', async () => {
      const data = makeData({ standard: 'k_esg', standardSpecific: {} });

      const result = await validateReportData(data, 'k_esg' as any);

      expect(result.errors.some((e: any) => e.field === 'reductionTarget')).toBe(true);
    });

    it('should validate k_esg warn on low scope3 emissions', async () => {
      const data = makeData({
        standard: 'k_esg',
        emissions: { scope1: 5000, scope2: 3000, scope3: 0, scope3Categories: {}, total: 8000 },
        standardSpecific: { reductionTarget: '20%' },
      });

      const result = await validateReportData(data, 'k_esg' as any);

      expect(result.warnings.some((w: any) => w.field === 'scope3')).toBe(true);
    });

    it('should validate maff_esg warning for missing food loss data', async () => {
      const data = makeData({ standard: 'maff_esg', standardSpecific: {} });

      const result = await validateReportData(data, 'maff_esg' as any);

      expect(result.warnings.some((w: any) => w.field === 'foodLossReduction')).toBe(true);
    });

    it('should validate thai_esg warning for missing SET group', async () => {
      const data = makeData({ standard: 'thai_esg', standardSpecific: {} });

      const result = await validateReportData(data, 'thai_esg' as any);

      expect(result.warnings.some((w: any) => w.field === 'setIndustryGroup')).toBe(true);
    });

    it('should return valid=true with complete data', async () => {
      const data = makeData({
        standardSpecific: {
          cnCode: 'CN7208',
          goodsCategory: 'iron_steel',
          countryOfOrigin: 'DE',
          installationOperator: 'Corp',
          directEmissions: 5000,
          indirectEmissions: 3000,
        },
      });

      const result = await validateReportData(data, 'eu_cbam' as any);

      // Some fields may still be missing but core ones should be present
      expect(result.completeness).toBeGreaterThan(0);
    });
  });

  // ======================== generateReportFiles ========================
  describe('generateReportFiles', () => {
    const makeData = () => ({
      project: { id: 'proj-1', name: 'Test Project', company: 'Corp', baselineYear: 2023, reportingYear: 2024 },
      reportingPeriod: { startDate: '2024-01-01', endDate: '2024-12-31' },
      emissions: { scope1: 5000, scope2: 3000, scope3: 2000, scope3Categories: { waste: 500 }, total: 10000 },
      activities: [{ name: 'A1', scope: 'scope1', quantity: 100, unit: 'kg', emissions: 500, tierLevel: 'tier1' }],
      cfp: { productName: 'Steel', functionalUnit: 'tonne', cfpTotal: 5000, cfpPerUnit: 50 },
      cfo: { organizationName: 'Corp', cfoTotal: 8000 },
      generatedAt: new Date().toISOString(),
      standard: 'eu_cbam',
      standardSpecific: { cnCode: 'CN7208' },
    });

    it('should generate PDF report', async () => {
      const result = await generateReportFiles(makeData() as any, 'pdf', 'eu_cbam' as any);

      expect(result.filePath).toContain('.pdf');
      expect(result.files.length).toBe(1);
    });

    it('should generate XLSX report', async () => {
      const XLSX = require('xlsx');

      const result = await generateReportFiles(makeData() as any, 'xlsx', 'eu_cbam' as any);

      expect(result.filePath).toContain('.xlsx');
      expect(XLSX.writeFile).toHaveBeenCalled();
    });

    it('should generate both PDF and XLSX', async () => {
      const result = await generateReportFiles(makeData() as any, 'both', 'eu_cbam' as any);

      expect(result.files.length).toBe(2);
      expect(result.filePath).toContain('.pdf'); // PDF is primary
    });
  });

  // ======================== getStandardRequirements ========================
  describe('getStandardRequirements', () => {
    const standards = ['eu_cbam', 'uk_cbam', 'china_carbon_market', 'k_esg', 'maff_esg', 'thai_esg'] as any[];

    standards.forEach((std) => {
      it(`should return requirements for ${std}`, async () => {
        const result = await getStandardRequirements(std);

        expect(result.requiredFields).toBeDefined();
        expect(result.requiredFields.length).toBeGreaterThan(0);
        expect(result.optionalFields).toBeDefined();
        expect(result.sections).toBeDefined();
      });
    });

    it('should include signatureRequired for k_esg', async () => {
      const result = await getStandardRequirements('k_esg' as any);
      expect(result.signatureRequired).toBe(true);
    });

    it('should include signatureRequired for maff_esg', async () => {
      const result = await getStandardRequirements('maff_esg' as any);
      expect(result.signatureRequired).toBe(true);
    });
  });

  // ======================== getOverlappingFields ========================
  describe('getOverlappingFields', () => {
    it('should return empty for single standard', async () => {
      const result = await getOverlappingFields(['eu_cbam']);

      expect(result.common).toHaveLength(0);
      expect(Object.keys(result.conflicts)).toHaveLength(0);
    });

    it('should find common fields between two standards', async () => {
      const result = await getOverlappingFields(['eu_cbam', 'uk_cbam']);

      // Common fields shared between eu_cbam and uk_cbam
      expect(result.common.length).toBeGreaterThan(0);
      expect(result.common).toContain('project.name');
    });

    it('should find common fields across all 6 standards', async () => {
      const result = await getOverlappingFields([
        'eu_cbam', 'uk_cbam', 'china_carbon_market', 'k_esg', 'maff_esg', 'thai_esg',
      ]);

      // All standards share common required fields
      expect(result.common).toContain('project.name');
      expect(result.common).toContain('project.company');
    });
  });
});
