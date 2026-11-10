/**
 * Data Source Routes — authorized by project membership role
 */
import { Router } from 'express';
import {
  authenticate,
  authorizeProjectMember,
  requireMfaCompleted,
} from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { validate, dataSourceFilterSchema } from '../middleware/validation';
import * as dataSourceController from '../controllers/dataSourceController';

const router = Router();

router.use(authenticate);

router.post(
  '/test-connection',
  asyncHandler(dataSourceController.testConnection)
);

router.post(
  '/:projectId',
  authorizeProjectMember('editor', 'projectId'),
  requireMfaCompleted,
  asyncHandler(dataSourceController.createDataSource)
);

router.get(
  '/:projectId',
  authorizeProjectMember('viewer', 'projectId'),
  validate(dataSourceFilterSchema, 'query'),
  asyncHandler(dataSourceController.getDataSources)
);

router.get(
  '/:projectId/:id',
  authorizeProjectMember('viewer', 'projectId'),
  requireMfaCompleted,
  asyncHandler(dataSourceController.getDataSource)
);

router.put(
  '/:projectId/:id',
  authorizeProjectMember('editor', 'projectId'),
  requireMfaCompleted,
  asyncHandler(dataSourceController.updateDataSource)
);

router.delete(
  '/:projectId/:id',
  authorizeProjectMember('director', 'projectId'),
  requireMfaCompleted,
  asyncHandler(dataSourceController.deleteDataSource)
);

router.post(
  '/:projectId/:id/sync',
  authorizeProjectMember('editor', 'projectId'),
  asyncHandler(dataSourceController.triggerSync)
);

export default router;
