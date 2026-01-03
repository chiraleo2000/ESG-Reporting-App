import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorizeProjectOwner } from '../middleware/auth';
import { 
  validate, 
  createActivitySchema, 
  updateActivitySchema,
  activityFilterSchema,
  paginationSchema 
} from '../middleware/validation';
import * as activityController from '../controllers/activityController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create new activity (single or batch)
router.post(
  '/',
  validate(createActivitySchema),
  asyncHandler(activityController.createActivity)
);

// Batch create activities
router.post(
  '/batch',
  asyncHandler(activityController.batchCreateActivities)
);

// Get activities for a project
router.get(
  '/project/:projectId',
  authorizeProjectOwner('projectId'),
  validate(paginationSchema, 'query'),
  validate(activityFilterSchema, 'query'),
  asyncHandler(activityController.getActivities)
);

// Get single activity
router.get(
  '/:id',
  asyncHandler(activityController.getActivity)
);

// Update activity
router.put(
  '/:id',
  validate(updateActivitySchema),
  asyncHandler(activityController.updateActivity)
);

// Delete activity
router.delete(
  '/:id',
  asyncHandler(activityController.deleteActivity)
);

// Batch delete activities
router.post(
  '/batch-delete',
  asyncHandler(activityController.batchDeleteActivities)
);

// Get activity summary by scope/category
router.get(
  '/project/:projectId/summary',
  authorizeProjectOwner('projectId'),
  asyncHandler(activityController.getActivitySummary)
);

export default router;
