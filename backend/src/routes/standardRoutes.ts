import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import * as standardController from '../controllers/standardController';

const router = Router();

// Public routes - get supported standards
router.get(
  '/',
  asyncHandler(standardController.getSupportedStandards)
);

// Get standard details
router.get(
  '/:standardId',
  asyncHandler(standardController.getStandardDetails)
);

// Get standard requirements (fields, sections)
router.get(
  '/:standardId/requirements',
  asyncHandler(standardController.getStandardRequirements)
);

// Get overlapping fields between standards
router.get(
  '/overlap/:standard1/:standard2',
  asyncHandler(standardController.getStandardOverlap)
);

// Protected routes - admin only
router.use(authenticate);

// Get standard configuration
router.get(
  '/:standardId/config',
  authorize(['admin']),
  asyncHandler(standardController.getStandardConfig)
);

// Update standard configuration (admin only)
router.put(
  '/:standardId/config',
  authorize(['admin']),
  asyncHandler(standardController.updateStandardConfig)
);

export default router;
