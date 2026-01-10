import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorizeProjectOwner } from '../middleware/auth';
import { 
  validate, 
  calculateCFPSchema, 
  calculateCFOSchema,
  calculatePrecursorsSchema 
} from '../middleware/validation';
import * as calculationController from '../controllers/calculationController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Calculate single activity
router.post(
  '/activity/:projectId/:activityId',
  authorizeProjectOwner('projectId'),
  asyncHandler(calculationController.calculateActivity)
);

// Calculate all pending activities for a project
router.post(
  '/project/:projectId/all',
  authorizeProjectOwner('projectId'),
  asyncHandler(calculationController.calculateAllActivities)
);

// Get project emission totals
router.get(
  '/project/:projectId/totals',
  authorizeProjectOwner('projectId'),
  asyncHandler(calculationController.getProjectTotals)
);

// Calculate CFP (Carbon Footprint Product)
router.post(
  '/project/:projectId/cfp',
  authorizeProjectOwner('projectId'),
  validate(calculateCFPSchema),
  asyncHandler(calculationController.calculateCFP)
);

// Calculate CFO (Carbon Footprint Organization)
router.post(
  '/project/:projectId/cfo',
  authorizeProjectOwner('projectId'),
  validate(calculateCFOSchema),
  asyncHandler(calculationController.calculateCFO)
);

// Calculate both CFP and CFO
router.post(
  '/project/:projectId/both',
  authorizeProjectOwner('projectId'),
  asyncHandler(calculationController.calculateBoth)
);

// Calculate precursor emissions (for CBAM)
router.post(
  '/precursors',
  validate(calculatePrecursorsSchema),
  asyncHandler(calculationController.calculatePrecursors)
);

// Legacy routes (backward compatibility)
router.post('/cfp', validate(calculateCFPSchema), asyncHandler(calculationController.calculateCFP));
router.post('/cfo', validate(calculateCFOSchema), asyncHandler(calculationController.calculateCFO));
router.post('/both', asyncHandler(calculationController.calculateBoth));

// Get CFP results for a project
router.get(
  '/cfp/:projectId',
  authorizeProjectOwner('projectId'),
  asyncHandler(calculationController.getCFPResults)
);

// Get CFO results for a project
router.get(
  '/cfo/:projectId',
  authorizeProjectOwner('projectId'),
  asyncHandler(calculationController.getCFOResults)
);

// Get hot spots analysis
router.get(
  '/hotspots/:projectId',
  authorizeProjectOwner('projectId'),
  asyncHandler(calculationController.getHotSpots)
);

// Get data quality score
router.get(
  '/quality/:projectId',
  authorizeProjectOwner('projectId'),
  asyncHandler(calculationController.getDataQuality)
);

export default router;
