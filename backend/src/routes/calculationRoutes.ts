import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorizeProjectMember } from '../middleware/auth';
import {
  validate,
  calculateCFPSchema,
  calculateCFOSchema,
  calculatePrecursorsSchema,
} from '../middleware/validation';
import * as calculationController from '../controllers/calculationController';

const router = Router();

router.use(authenticate);

router.post(
  '/activity/:projectId/:activityId',
  authorizeProjectMember('editor', 'projectId'),
  asyncHandler(calculationController.calculateActivity)
);

router.post(
  '/project/:projectId/all',
  authorizeProjectMember('editor', 'projectId'),
  asyncHandler(calculationController.calculateAllActivities)
);

router.get(
  '/project/:projectId/totals',
  authorizeProjectMember('viewer', 'projectId'),
  asyncHandler(calculationController.getProjectTotals)
);

router.post(
  '/project/:projectId/cfp',
  authorizeProjectMember('editor', 'projectId'),
  validate(calculateCFPSchema),
  asyncHandler(calculationController.calculateCFP)
);

router.post(
  '/project/:projectId/cfo',
  authorizeProjectMember('editor', 'projectId'),
  validate(calculateCFOSchema),
  asyncHandler(calculationController.calculateCFO)
);

router.post(
  '/project/:projectId/both',
  authorizeProjectMember('editor', 'projectId'),
  asyncHandler(calculationController.calculateBoth)
);

router.post(
  '/precursors',
  validate(calculatePrecursorsSchema),
  asyncHandler(calculationController.calculatePrecursors)
);

router.post('/cfp', validate(calculateCFPSchema), asyncHandler(calculationController.calculateCFP));
router.post('/cfo', validate(calculateCFOSchema), asyncHandler(calculationController.calculateCFO));
router.post('/both', asyncHandler(calculationController.calculateBoth));

router.get(
  '/cfp/:projectId',
  authorizeProjectMember('viewer', 'projectId'),
  asyncHandler(calculationController.getCFPResults)
);

router.get(
  '/cfo/:projectId',
  authorizeProjectMember('viewer', 'projectId'),
  asyncHandler(calculationController.getCFOResults)
);

router.get(
  '/hotspots/:projectId',
  authorizeProjectMember('viewer', 'projectId'),
  asyncHandler(calculationController.getHotSpots)
);

router.get(
  '/quality/:projectId',
  authorizeProjectMember('viewer', 'projectId'),
  asyncHandler(calculationController.getDataQuality)
);

export default router;
