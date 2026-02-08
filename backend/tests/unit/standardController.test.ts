/**
 * StandardController Unit Tests
 * Covers: getSupportedStandards, getStandardDetails, getStandardRequirements,
 * getStandardOverlap, getStandardConfig, updateStandardConfig
 */

jest.mock('../../src/config/database', () => ({
  db: { query: jest.fn() },
}));

import { db } from '../../src/config/database';
import {
  getSupportedStandards,
  getStandardDetails,
  getStandardRequirements,
  getStandardOverlap,
  getStandardConfig,
  updateStandardConfig,
} from '../../src/controllers/standardController';

const mockDb = db as jest.Mocked<typeof db>;

function mockRequest(overrides: any = {}): any {
  return { params: {}, query: {}, body: {}, user: { id: 'u-1', role: 'owner' }, ...overrides };
}

function mockResponse(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Standard Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.query as jest.Mock).mockReset();
  });

  // ==========================================================================
  // getSupportedStandards
  // ==========================================================================
  describe('getSupportedStandards', () => {
    it('should return all 6 supported standards', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await getSupportedStandards(req, res);

      const data = res.json.mock.calls[0][0];
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(6);

      const ids = data.data.map((s: any) => s.id);
      expect(ids).toContain('eu_cbam');
      expect(ids).toContain('uk_cbam');
      expect(ids).toContain('china_carbon_market');
      expect(ids).toContain('k_esg');
      expect(ids).toContain('maff_esg');
      expect(ids).toContain('thai_esg');
    });

    it('should include essential fields for each standard', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await getSupportedStandards(req, res);

      const std = res.json.mock.calls[0][0].data[0];
      expect(std).toHaveProperty('id');
      expect(std).toHaveProperty('name');
      expect(std).toHaveProperty('fullName');
      expect(std).toHaveProperty('region');
      expect(std).toHaveProperty('authority');
      expect(std).toHaveProperty('requiresSignature');
    });
  });

  // ==========================================================================
  // getStandardDetails
  // ==========================================================================
  describe('getStandardDetails', () => {
    it('should return EU CBAM details', async () => {
      const req = mockRequest({ params: { standardId: 'eu_cbam' } });
      const res = mockResponse();

      await getStandardDetails(req, res);

      const data = res.json.mock.calls[0][0].data;
      expect(data.id).toBe('eu_cbam');
      expect(data.name).toBe('EU CBAM');
      expect(data.supportedScopes).toContain('scope1');
      expect(data.requiredFields).toContain('company_name');
      expect(data.uniqueFields).toContain('cn_code');
    });

    it('should return K-ESG with signature requirements', async () => {
      const req = mockRequest({ params: { standardId: 'k_esg' } });
      const res = mockResponse();

      await getStandardDetails(req, res);

      const data = res.json.mock.calls[0][0].data;
      expect(data.requiresSignature).toBe(true);
      expect(data.signatureRequirements).toBeDefined();
      expect(data.signatureRequirements.authorizedRoles).toContain('director');
    });

    it('should throw NotFoundError for unknown standard', async () => {
      const req = mockRequest({ params: { standardId: 'unknown_standard' } });
      const res = mockResponse();

      await expect(getStandardDetails(req, res)).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // getStandardRequirements
  // ==========================================================================
  describe('getStandardRequirements', () => {
    it('should return requirements with sections for thai_esg', async () => {
      const req = mockRequest({ params: { standardId: 'thai_esg' } });
      const res = mockResponse();

      await getStandardRequirements(req, res);

      const data = res.json.mock.calls[0][0].data;
      expect(data.standardId).toBe('thai_esg');
      expect(data.sections).toBeInstanceOf(Array);
      expect(data.sections.length).toBeGreaterThan(4); // common + standard-specific

      const sectionIds = data.sections.map((s: any) => s.id);
      expect(sectionIds).toContain('organization');
      expect(sectionIds).toContain('emissions');
      expect(sectionIds).toContain('water');
      expect(sectionIds).toContain('set_disclosure');
    });

    it('should return requirements for MAFF ESG with declaration section', async () => {
      const req = mockRequest({ params: { standardId: 'maff_esg' } });
      const res = mockResponse();

      await getStandardRequirements(req, res);

      const data = res.json.mock.calls[0][0].data;
      const sectionIds = data.sections.map((s: any) => s.id);
      expect(sectionIds).toContain('declaration');
      expect(sectionIds).toContain('agriculture');
    });

    it('should throw NotFoundError for unknown standard', async () => {
      const req = mockRequest({ params: { standardId: 'nonexistent' } });
      const res = mockResponse();

      await expect(getStandardRequirements(req, res)).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // getStandardOverlap
  // ==========================================================================
  describe('getStandardOverlap', () => {
    it('should calculate overlap between EU and UK CBAM', async () => {
      const req = mockRequest({ params: { standard1: 'eu_cbam', standard2: 'uk_cbam' } });
      const res = mockResponse();

      await getStandardOverlap(req, res);

      const data = res.json.mock.calls[0][0].data;
      expect(data.overlap).toBeDefined();
      expect(data.overlap.percentage).toBeGreaterThan(0);
      expect(data.overlap.commonRequiredFields).toBeInstanceOf(Array);
      expect(data.uniqueTo).toBeDefined();
      expect(data.compatibility.canShareData).toBeDefined();
    });

    it('should return workflow recommendation for EU CBAM and UK CBAM', async () => {
      const req = mockRequest({ params: { standard1: 'eu_cbam', standard2: 'uk_cbam' } });
      const res = mockResponse();

      await getStandardOverlap(req, res);

      const data = res.json.mock.calls[0][0].data;
      expect(data.compatibility.recommendedWorkflow).toContain('CBAM');
    });

    it('should throw NotFoundError for invalid standard1', async () => {
      const req = mockRequest({ params: { standard1: 'invalid', standard2: 'eu_cbam' } });
      const res = mockResponse();

      await expect(getStandardOverlap(req, res)).rejects.toThrow(/not found/i);
    });

    it('should throw NotFoundError for invalid standard2', async () => {
      const req = mockRequest({ params: { standard1: 'eu_cbam', standard2: 'invalid' } });
      const res = mockResponse();

      await expect(getStandardOverlap(req, res)).rejects.toThrow(/not found/i);
    });

    it('should calculate overlap between K-ESG and MAFF ESG', async () => {
      const req = mockRequest({ params: { standard1: 'k_esg', standard2: 'maff_esg' } });
      const res = mockResponse();

      await getStandardOverlap(req, res);

      const data = res.json.mock.calls[0][0].data;
      expect(data.overlap.percentage).toBeGreaterThanOrEqual(0);
      expect(data.compatibility.recommendedWorkflow).toBeDefined();
    });
  });

  // ==========================================================================
  // getStandardConfig
  // ==========================================================================
  describe('getStandardConfig', () => {
    it('should return standard config with custom settings', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{ settings: { custom: true }, overrides: {}, updated_at: new Date() }],
        rowCount: 1,
      });

      const req = mockRequest({ params: { standardId: 'eu_cbam' } });
      const res = mockResponse();

      await getStandardConfig(req, res);

      const data = res.json.mock.calls[0][0].data;
      expect(data.id).toBe('eu_cbam');
      expect(data.customSettings).toEqual({ custom: true });
    });

    it('should return base config when no custom config exists', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const req = mockRequest({ params: { standardId: 'eu_cbam' } });
      const res = mockResponse();

      await getStandardConfig(req, res);

      const data = res.json.mock.calls[0][0].data;
      expect(data.id).toBe('eu_cbam');
      expect(data.customSettings).toEqual({});
    });

    it('should throw NotFoundError for unknown standard', async () => {
      const req = mockRequest({ params: { standardId: 'nonexistent' } });
      const res = mockResponse();

      await expect(getStandardConfig(req, res)).rejects.toThrow(/not found/i);
    });
  });

  // ==========================================================================
  // updateStandardConfig
  // ==========================================================================
  describe('updateStandardConfig', () => {
    it('should upsert standard configuration', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 });

      const req = mockRequest({
        params: { standardId: 'thai_esg' },
        body: { settings: { autoCalculate: true }, overrides: { scope3: false } },
      });
      const res = mockResponse();

      await updateStandardConfig(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Standard configuration updated',
        data: expect.objectContaining({ standardId: 'thai_esg' }),
      }));
    });

    it('should throw NotFoundError for unknown standard', async () => {
      const req = mockRequest({ params: { standardId: 'fake' }, body: { settings: {} } });
      const res = mockResponse();

      await expect(updateStandardConfig(req, res)).rejects.toThrow(/not found/i);
    });
  });
});
