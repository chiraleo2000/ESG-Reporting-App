/**
 * Data Source Routes
 * 
 * Routes for managing external data source connections
 * (REST API, SSH/SFTP, file upload).
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import * as dataSourceController from '../controllers/dataSourceController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Test connection (no project context needed)
router.post(
  '/test-connection',
  authorize('owner', 'director', 'editor'),
  asyncHandler(dataSourceController.testConnection)
);

// Project-scoped data source routes
router.post(
  '/:projectId',
  authorize('owner', 'director', 'editor'),
  asyncHandler(dataSourceController.createDataSource)
);

router.get(
  '/:projectId',
  asyncHandler(dataSourceController.getDataSources)
);

router.get(
  '/:projectId/:id',
  asyncHandler(dataSourceController.getDataSource)
);

router.put(
  '/:projectId/:id',
  authorize('owner', 'director', 'editor'),
  asyncHandler(dataSourceController.updateDataSource)
);

router.delete(
  '/:projectId/:id',
  authorize('owner', 'director'),
  asyncHandler(dataSourceController.deleteDataSource)
);

// Trigger sync
router.post(
  '/:projectId/:id/sync',
  authorize('owner', 'director', 'editor'),
  asyncHandler(dataSourceController.triggerSync)
);

export default router;
