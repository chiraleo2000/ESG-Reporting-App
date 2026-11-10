import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import {
  authenticate,
  authorizeProjectMember,
  authorizeEntityProjectMember,
  authorizeSignature,
  requireMfaCompleted,
} from '../middleware/auth';
import { validate, batchReportSchema, paginationSchema } from '../middleware/validation';
import * as reportController from '../controllers/reportController';

const router = Router();

router.use(authenticate);

router.post(
  '/generate',
  asyncHandler(reportController.generateReport)
);

router.post(
  '/batch-generate',
  validate(batchReportSchema),
  asyncHandler(reportController.batchGenerateReports)
);

router.get(
  '/batch/:batchId/status',
  asyncHandler(reportController.getBatchStatus)
);

router.get(
  '/batch/:batchId/manifest',
  asyncHandler(reportController.getBatchManifest)
);

router.get(
  '/project/:projectId',
  authorizeProjectMember('viewer', 'projectId'),
  validate(paginationSchema, 'query'),
  asyncHandler(reportController.getProjectReports)
);

router.get(
  '/:id',
  authorizeEntityProjectMember('reports', 'id', 'viewer'),
  asyncHandler(reportController.getReport)
);

router.get(
  '/:id/download',
  authorizeEntityProjectMember('reports', 'id', 'viewer'),
  requireMfaCompleted,
  asyncHandler(reportController.downloadReport)
);

router.delete(
  '/:id',
  authorizeEntityProjectMember('reports', 'id', 'editor'),
  asyncHandler(reportController.deleteReport)
);

export default router;
