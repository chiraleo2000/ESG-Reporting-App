import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ValidationError } from './errorHandler';

/**
 * Validation middleware factory
 * Creates middleware that validates request body, params, or query against a Zod schema
 */
export const validate = (
  schema: ZodSchema,
  source: 'body' | 'params' | 'query' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        throw new ValidationError('Validation failed', errors);
      }

      // Replace the source data with the parsed (and potentially transformed) data
      req[source] = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Date validation
export const dateSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid date format',
});

// Year validation (1990 to current year + 10)
export const yearSchema = z.coerce
  .number()
  .int()
  .min(1990, 'Year must be 1990 or later')
  .max(new Date().getFullYear() + 10, 'Year too far in the future');

// Country code validation (ISO 3166-1 alpha-2)
export const countryCodeSchema = z
  .string()
  .length(2)
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Invalid country code');

// Email validation
export const emailSchema = z.string().email('Invalid email format');

// ============================================================================
// PROJECT VALIDATION SCHEMAS
// ============================================================================

const projectBaseSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  companyName: z.string().min(1).max(255),
  companySize: z.enum(['small', 'medium', 'large', 'enterprise']),
  sector: z.string().min(1).max(100),
  baselineYear: yearSchema,
  reportingYear: yearSchema,
  countries: z.array(countryCodeSchema).min(1),
  standardsSelected: z.array(z.enum([
    'EU_CBAM', 'UK_CBAM', 'CHINA_CARBON', 'JAPAN_MAFF', 'KOREA_KESG', 'THAILAND_ESG'
  ])).min(1),
  cfpMode: z.boolean().default(true),
  cfoMode: z.boolean().default(true),
});

export const createProjectSchema = projectBaseSchema.refine((data) => data.baselineYear <= data.reportingYear, {
  message: 'Baseline year must be less than or equal to reporting year',
  path: ['baselineYear'],
});

export const updateProjectSchema = projectBaseSchema.partial();

// ============================================================================
// ACTIVITY VALIDATION SCHEMAS
// ============================================================================

export const createActivitySchema = z.object({
  projectId: uuidSchema,
  date: dateSchema,
  scope: z.enum(['scope1', 'scope2', 'scope3']),
  category: z.string().min(1).max(100),
  tier: z.enum(['tier1', 'tier2', 'tier2_plus']).optional(),
  direction: z.enum(['upstream', 'downstream']).optional(),
  activityType: z.string().min(1).max(100),
  activityDescription: z.string().max(500).optional(),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1).max(50),
  region: z.string().min(1).max(100),
  country: countryCodeSchema,
  materialType: z.string().max(100).optional(),
  productionRoute: z.string().max(100).optional(),
  emissionFactor: z.coerce.number().positive().optional(),
  emissionFactorSource: z.string().max(255).optional(),
  emissionFactorUnit: z.string().max(50).optional(),
  baselineYear: yearSchema,
  reportingYear: yearSchema,
  notes: z.string().max(1000).optional(),
});

export const updateActivitySchema = createActivitySchema.partial().omit({ projectId: true });

export const activityFilterSchema = z.object({
  scope: z.enum(['scope1', 'scope2', 'scope3']).optional(),
  category: z.string().optional(),
  tier: z.enum(['tier1', 'tier2', 'tier2_plus']).optional(),
  direction: z.enum(['upstream', 'downstream']).optional(),
  region: z.string().optional(),
  country: countryCodeSchema.optional(),
  materialType: z.string().optional(),
  productionRoute: z.string().optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
  baselineYear: yearSchema.optional(),
  reportingYear: yearSchema.optional(),
});

// ============================================================================
// CALCULATION VALIDATION SCHEMAS
// ============================================================================

export const calculateCFPSchema = z.object({
  projectId: uuidSchema,
  productId: z.string().optional(),
  productionQuantity: z.coerce.number().positive().optional(),
  productionUnit: z.string().optional(),
});

export const calculateCFOSchema = z.object({
  projectId: uuidSchema,
  organizationId: z.string().optional(),
});

export const calculatePrecursorsSchema = z.object({
  projectId: uuidSchema,
  goods: z.array(z.object({
    material: z.enum(['cement', 'iron_steel', 'aluminium', 'fertilizers', 'hydrogen', 'electricity']),
    productionRoute: z.string(),
    quantity: z.coerce.number().positive(),
  })).min(1),
});

// ============================================================================
// REPORT VALIDATION SCHEMAS
// ============================================================================

export const batchReportSchema = z.object({
  projectId: uuidSchema,
  standards: z.array(z.enum([
    'EU_CBAM', 'UK_CBAM', 'CHINA_CARBON', 'JAPAN_MAFF', 'KOREA_KESG', 'THAILAND_ESG'
  ])).min(1),
  formats: z.array(z.enum(['pdf', 'xlsx'])).min(1),
  includeAuditTrail: z.boolean().default(false),
  signatureRequired: z.boolean().default(false),
});

// ============================================================================
// EMISSION FACTOR VALIDATION SCHEMAS
// ============================================================================

export const serpAPILookupSchema = z.object({
  material: z.string().min(1),
  category: z.string().min(1),
  tier: z.enum(['tier1', 'tier2', 'tier2_plus']).optional(),
  region: z.string().optional(),
  country: countryCodeSchema.optional(),
});

export const gridEFOverrideSchema = z.object({
  projectId: uuidSchema,
  country: countryCodeSchema,
  factor: z.coerce.number().positive().max(10),
  renewablePercentage: z.coerce.number().min(0).max(100).optional(),
  fossilPercentage: z.coerce.number().min(0).max(100).optional(),
  nuclearPercentage: z.coerce.number().min(0).max(100).optional(),
}).refine((data) => {
  if (data.renewablePercentage !== undefined && 
      data.fossilPercentage !== undefined && 
      data.nuclearPercentage !== undefined) {
    const total = data.renewablePercentage + data.fossilPercentage + data.nuclearPercentage;
    return Math.abs(total - 100) < 0.01; // Allow small floating point error
  }
  return true;
}, {
  message: 'Renewable, fossil, and nuclear percentages must sum to 100',
});

export const precursorFactorOverrideSchema = z.object({
  projectId: uuidSchema,
  materialType: z.enum(['cement', 'iron_steel', 'aluminium', 'fertilizers', 'hydrogen', 'electricity']),
  productionRoute: z.string().min(1),
  factor: z.coerce.number().positive().max(100),
  year: yearSchema,
});

// ============================================================================
// SIGNATURE VALIDATION SCHEMAS
// ============================================================================

export const signReportSchema = z.object({
  reportId: uuidSchema,
  signerName: z.string().min(1).max(255),
  signerTitle: z.string().min(1).max(255),
  signerOrganization: z.string().min(1).max(255),
});

// ============================================================================
// AUTH VALIDATION SCHEMAS
// ============================================================================

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(6).max(100),
  name: z.string().min(1).max(255),
  company: z.string().max(255).optional(),
  role: z.enum(['owner', 'director', 'auditor', 'editor', 'viewer', 'operator']).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
