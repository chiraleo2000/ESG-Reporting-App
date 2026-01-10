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

// Create new activity (single or batch) - legacy route
router.post(
  '/',
  validate(createActivitySchema),
  asyncHandler(activityController.createActivity)
);

// Create activity for a specific project
router.post(
  '/project/:projectId',
  authorizeProjectOwner('projectId'),
  validate(createActivitySchema),
  asyncHandler(activityController.createActivityForProject)
);

// Batch create activities
router.post(
  '/batch',
  asyncHandler(activityController.bulkCreateActivities)
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
  asyncHandler(activityController.bulkDeleteActivities)
);

// Get activity summary by scope/category
router.get(
  '/project/:projectId/summary',
  authorizeProjectOwner('projectId'),
  asyncHandler(activityController.getActivitySummary)
);

// Export activities to CSV
router.get(
  '/project/:projectId/export',
  authorizeProjectOwner('projectId'),
  asyncHandler(activityController.exportActivities)
);

export default router;
