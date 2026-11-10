import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import {
  authenticate,
  authorizeProjectMember,
  authorizeEntityProjectMember,
  requireMfaCompleted,
} from '../middleware/auth';
import {
  validate,
  createActivitySchema,
  updateActivitySchema,
  activityFilterSchema,
  paginationSchema,
} from '../middleware/validation';
import * as activityController from '../controllers/activityController';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate(createActivitySchema),
  asyncHandler(activityController.createActivity)
);

router.post(
  '/project/:projectId',
  authorizeProjectMember('editor', 'projectId'),
  validate(createActivitySchema),
  asyncHandler(activityController.createActivityForProject)
);

router.post(
  '/batch',
  asyncHandler(activityController.bulkCreateActivities)
);

router.get(
  '/project/:projectId',
  authorizeProjectMember('viewer', 'projectId'),
  validate(paginationSchema, 'query'),
  validate(activityFilterSchema, 'query'),
  asyncHandler(activityController.getActivities)
);

router.get(
  '/project/:projectId/summary',
  authorizeProjectMember('viewer', 'projectId'),
  asyncHandler(activityController.getActivitySummary)
);

router.get(
  '/project/:projectId/export',
  authorizeProjectMember('auditor', 'projectId'),
  requireMfaCompleted,
  asyncHandler(activityController.exportActivities)
);

router.get(
  '/:id',
  authorizeEntityProjectMember('activities', 'id', 'viewer'),
  asyncHandler(activityController.getActivity)
);

router.put(
  '/:id',
  authorizeEntityProjectMember('activities', 'id', 'editor'),
  validate(updateActivitySchema),
  asyncHandler(activityController.updateActivity)
);

router.delete(
  '/:id',
  authorizeEntityProjectMember('activities', 'id', 'editor'),
  asyncHandler(activityController.deleteActivity)
);

router.post(
  '/batch-delete',
  asyncHandler(activityController.bulkDeleteActivities)
);

export default router;
