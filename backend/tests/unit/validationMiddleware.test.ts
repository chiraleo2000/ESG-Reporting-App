/**
 * Validation Middleware Unit Tests — comprehensive coverage
 * Covers: validate middleware factory + all Zod schemas
 */

import { validate } from '../../src/middleware/validation';
import {
  paginationSchema,
  createProjectSchema,
  updateProjectSchema,
  createActivitySchema,
  updateActivitySchema,
  activityFilterSchema,
  calculateCFPSchema,
  calculateCFOSchema,
  calculatePrecursorsSchema,
  batchReportSchema,
  serpAPILookupSchema,
  gridEFOverrideSchema,
  precursorFactorOverrideSchema,
  signReportSchema,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../../src/middleware/validation';

function mockRequest(overrides: any = {}): any {
  return {
    body: {},
    params: {},
    query: {},
    ...overrides,
  };
}

function mockResponse(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Validation Middleware', () => {
  // ==========================================================================
  // validate factory
  // ==========================================================================
  describe('validate()', () => {
    it('should call next on valid body', () => {
      const middleware = validate(loginSchema, 'body');
      const req = mockRequest({ body: { email: 'a@b.com', password: '123' } });
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.email).toBe('a@b.com');
    });

    it('should call next with ValidationError on invalid body', () => {
      const middleware = validate(loginSchema, 'body');
      const req = mockRequest({ body: { email: 'not-email' } });
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Validation failed',
      }));
    });

    it('should validate query params', () => {
      const middleware = validate(paginationSchema, 'query');
      const req = mockRequest({ query: { page: '2', limit: '10' } });
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query.page).toBe(2);
      expect(req.query.limit).toBe(10);
    });

    it('should apply defaults from pagination schema', () => {
      const middleware = validate(paginationSchema, 'query');
      const req = mockRequest({ query: {} });
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(20);
      expect(req.query.sortOrder).toBe('desc');
    });
  });

  // ==========================================================================
  // paginationSchema
  // ==========================================================================
  describe('paginationSchema', () => {
    it('should parse valid pagination', () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 50, sortBy: 'name', sortOrder: 'asc' });
      expect(result.success).toBe(true);
    });

    it('should coerce string numbers', () => {
      const result = paginationSchema.safeParse({ page: '3', limit: '25' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(25);
      }
    });

    it('should reject page < 1', () => {
      const result = paginationSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject limit > 100', () => {
      const result = paginationSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // createProjectSchema
  // ==========================================================================
  describe('createProjectSchema', () => {
    const validProject = {
      name: 'Test Project',
      baselineYear: 2020,
      reportingYear: 2024,
    };

    it('should accept valid project data', () => {
      const result = createProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it('should reject when baselineYear > reportingYear', () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        baselineYear: 2025,
        reportingYear: 2020,
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid reporting standards', () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        reportingStandards: ['eu_cbam', 'uk_cbam'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid reporting standards', () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        reportingStandards: ['invalid_standard'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const result = createProjectSchema.safeParse({ ...validProject, name: '' });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // updateProjectSchema
  // ==========================================================================
  describe('updateProjectSchema', () => {
    it('should accept partial project data', () => {
      const result = updateProjectSchema.safeParse({ name: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = updateProjectSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // createActivitySchema
  // ==========================================================================
  describe('createActivitySchema', () => {
    const validActivity = {
      name: 'Diesel Generator',
      scope: 'scope1',
      activityType: 'stationary_combustion',
      quantity: 100,
      unit: 'liters',
    };

    it('should accept valid activity', () => {
      const result = createActivitySchema.safeParse(validActivity);
      expect(result.success).toBe(true);
    });

    it('should reject invalid scope', () => {
      const result = createActivitySchema.safeParse({ ...validActivity, scope: 'scope4' });
      expect(result.success).toBe(false);
    });

    it('should reject zero quantity', () => {
      const result = createActivitySchema.safeParse({ ...validActivity, quantity: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative quantity', () => {
      const result = createActivitySchema.safeParse({ ...validActivity, quantity: -5 });
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const result = createActivitySchema.safeParse({
        ...validActivity,
        description: 'A test activity',
        scope3Category: 'business_travel',
        tierLevel: 'tier2',
        tierDirection: 'upstream',
        dataQualityScore: 4,
      });
      expect(result.success).toBe(true);
    });

    it('should default tierLevel to tier1', () => {
      const result = createActivitySchema.safeParse(validActivity);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tierLevel).toBe('tier1');
      }
    });
  });

  // ==========================================================================
  // activityFilterSchema
  // ==========================================================================
  describe('activityFilterSchema', () => {
    it('should accept valid filters', () => {
      const result = activityFilterSchema.safeParse({ scope: 'scope1', status: 'calculated' });
      expect(result.success).toBe(true);
    });

    it('should accept empty filters', () => {
      const result = activityFilterSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid scope filter', () => {
      const result = activityFilterSchema.safeParse({ scope: 'scope4' });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // calculateCFPSchema / calculateCFOSchema / calculatePrecursorsSchema
  // ==========================================================================
  describe('calculateCFPSchema', () => {
    it('should accept valid data', () => {
      const result = calculateCFPSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        productionQuantity: 1000,
        productionUnit: 'tonnes',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = calculateCFPSchema.safeParse({ projectId: 'not-uuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('calculateCFOSchema', () => {
    it('should accept valid data', () => {
      const result = calculateCFOSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('calculatePrecursorsSchema', () => {
    it('should accept valid goods array', () => {
      const result = calculatePrecursorsSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        goods: [
          { material: 'cement', productionRoute: 'dry_process', quantity: 100 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty goods array', () => {
      const result = calculatePrecursorsSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        goods: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid material', () => {
      const result = calculatePrecursorsSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        goods: [{ material: 'plastic', productionRoute: 'any', quantity: 10 }],
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // batchReportSchema
  // ==========================================================================
  describe('batchReportSchema', () => {
    it('should accept valid batch report', () => {
      const result = batchReportSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        standards: ['EU_CBAM'],
        formats: ['pdf'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty standards', () => {
      const result = batchReportSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        standards: [],
        formats: ['pdf'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty formats', () => {
      const result = batchReportSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        standards: ['EU_CBAM'],
        formats: [],
      });
      expect(result.success).toBe(false);
    });

    it('should default includeAuditTrail to false', () => {
      const result = batchReportSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        standards: ['EU_CBAM'],
        formats: ['xlsx'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeAuditTrail).toBe(false);
      }
    });
  });

  // ==========================================================================
  // serpAPILookupSchema
  // ==========================================================================
  describe('serpAPILookupSchema', () => {
    it('should accept valid lookup', () => {
      const result = serpAPILookupSchema.safeParse({ material: 'steel', category: 'direct' });
      expect(result.success).toBe(true);
    });

    it('should reject empty material', () => {
      const result = serpAPILookupSchema.safeParse({ material: '', category: 'direct' });
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const result = serpAPILookupSchema.safeParse({
        material: 'cement',
        category: 'process',
        tier: 'tier2',
        region: 'EU',
        country: 'DE',
      });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // gridEFOverrideSchema
  // ==========================================================================
  describe('gridEFOverrideSchema', () => {
    it('should accept valid override', () => {
      const result = gridEFOverrideSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        country: 'TH',
        factor: 0.456,
      });
      expect(result.success).toBe(true);
    });

    it('should reject factor > 10', () => {
      const result = gridEFOverrideSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        country: 'TH',
        factor: 11,
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid energy mix percentages summing to 100', () => {
      const result = gridEFOverrideSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        country: 'TH',
        factor: 0.5,
        renewablePercentage: 20,
        fossilPercentage: 60,
        nuclearPercentage: 20,
      });
      expect(result.success).toBe(true);
    });

    it('should reject percentages not summing to 100', () => {
      const result = gridEFOverrideSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        country: 'TH',
        factor: 0.5,
        renewablePercentage: 20,
        fossilPercentage: 60,
        nuclearPercentage: 10, // sums to 90
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // precursorFactorOverrideSchema
  // ==========================================================================
  describe('precursorFactorOverrideSchema', () => {
    it('should accept valid precursor override', () => {
      const result = precursorFactorOverrideSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        materialType: 'cement',
        productionRoute: 'dry_process',
        factor: 0.525,
        year: 2024,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid material type', () => {
      const result = precursorFactorOverrideSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        materialType: 'plastic',
        productionRoute: 'test',
        factor: 1.0,
        year: 2024,
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // signReportSchema
  // ==========================================================================
  describe('signReportSchema', () => {
    it('should accept valid sign report data', () => {
      const result = signReportSchema.safeParse({
        reportId: '550e8400-e29b-41d4-a716-446655440000',
        signerName: 'John Director',
        signerTitle: 'CEO',
        signerOrganization: 'TestCo Ltd',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing signer fields', () => {
      const result = signReportSchema.safeParse({
        reportId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Auth schemas
  // ==========================================================================
  describe('registerSchema', () => {
    it('should accept valid registration', () => {
      const result = registerSchema.safeParse({
        email: 'new@user.com',
        password: 'strong123',
        name: 'New User',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'not-email',
        password: '123456',
        name: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = registerSchema.safeParse({
        email: 'a@b.com',
        password: '12345',
        name: 'Test',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login', () => {
      const result = loginSchema.safeParse({ email: 'a@b.com', password: 'pass' });
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({ email: 'a@b.com', password: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('refreshTokenSchema', () => {
    it('should accept valid token', () => {
      const result = refreshTokenSchema.safeParse({ refreshToken: 'some-token-string' });
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const result = refreshTokenSchema.safeParse({ refreshToken: '' });
      expect(result.success).toBe(false);
    });
  });
});
