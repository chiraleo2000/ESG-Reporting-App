import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorizeProjectOwner } from '../middleware/auth';
import { 
  validate, 
  serpAPILookupSchema, 
  gridEFOverrideSchema,
  precursorFactorOverrideSchema,
  yearSchema,
  countryCodeSchema 
} from '../middleware/validation';
import * as emissionFactorController from '../controllers/emissionFactorController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// SERPAPI LOOKUPS
// ============================================================================

// Lookup emission factor via SERPAPI
router.post(
  '/serpapi/lookup',
  validate(serpAPILookupSchema),
  asyncHandler(emissionFactorController.serpAPILookup)
);

// ============================================================================
// GRID EMISSION FACTORS
// ============================================================================

// Get grid EF for a country and year
router.get(
  '/grid/:country/:year',
  asyncHandler(emissionFactorController.getGridEF)
);

// Get grid EF history for a country
router.get(
  '/grid/history/:country',
  asyncHandler(emissionFactorController.getGridEFHistory)
);

// Override grid EF for a project
router.put(
  '/grid/override',
  validate(gridEFOverrideSchema),
  asyncHandler(emissionFactorController.overrideGridEF)
);

// Delete grid EF override
router.delete(
  '/grid/override/:projectId/:country',
  asyncHandler(emissionFactorController.deleteGridEFOverride)
);

// ============================================================================
// PRECURSOR FACTORS
// ============================================================================

// Get default precursor factors
router.get(
  '/precursor/defaults',
  asyncHandler(emissionFactorController.getPrecursorDefaults)
);

// Get precursor factors for a project
router.get(
  '/precursor/:projectId',
  authorizeProjectOwner('projectId'),
  asyncHandler(emissionFactorController.getProjectPrecursorFactors)
);

// Override precursor factor for a project
router.put(
  '/precursor/override',
  validate(precursorFactorOverrideSchema),
  asyncHandler(emissionFactorController.overridePrecursorFactor)
);

// Delete precursor factor override
router.delete(
  '/precursor/override/:projectId/:materialType/:productionRoute',
  asyncHandler(emissionFactorController.deletePrecursorOverride)
);

// ============================================================================
// STANDARD EMISSION FACTORS
// ============================================================================

// Get all emission factors for a standard
router.get(
  '/standard/:standard',
  asyncHandler(emissionFactorController.getStandardEFs)
);

// Search emission factors
router.get(
  '/search',
  asyncHandler(emissionFactorController.searchEmissionFactors)
);

export default router;
