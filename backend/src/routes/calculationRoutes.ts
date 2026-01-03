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

// Calculate CFP (Carbon Footprint Product)
router.post(
  '/cfp',
  validate(calculateCFPSchema),
  asyncHandler(calculationController.calculateCFP)
);

// Calculate CFO (Carbon Footprint Organization)
router.post(
  '/cfo',
  validate(calculateCFOSchema),
  asyncHandler(calculationController.calculateCFO)
);

// Calculate both CFP and CFO
router.post(
  '/both',
  asyncHandler(calculationController.calculateBoth)
);

// Calculate precursor emissions (for CBAM)
router.post(
  '/precursors',
  validate(calculatePrecursorsSchema),
  asyncHandler(calculationController.calculatePrecursors)
);

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
