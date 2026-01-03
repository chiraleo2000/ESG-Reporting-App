import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorizeProjectOwner, authorizeSignature } from '../middleware/auth';
import { validate, batchReportSchema, paginationSchema } from '../middleware/validation';
import * as reportController from '../controllers/reportController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Generate single report
router.post(
  '/generate',
  asyncHandler(reportController.generateReport)
);

// Batch generate reports (multiple standards)
router.post(
  '/batch-generate',
  validate(batchReportSchema),
  asyncHandler(reportController.batchGenerateReports)
);

// Get batch status
router.get(
  '/batch/:batchId/status',
  asyncHandler(reportController.getBatchStatus)
);

// Get batch manifest (list of reports)
router.get(
  '/batch/:batchId/manifest',
  asyncHandler(reportController.getBatchManifest)
);

// Get reports for a project
router.get(
  '/project/:projectId',
  authorizeProjectOwner('projectId'),
  validate(paginationSchema, 'query'),
  asyncHandler(reportController.getProjectReports)
);

// Get single report
router.get(
  '/:id',
  asyncHandler(reportController.getReport)
);

// Download report
router.get(
  '/:id/download',
  asyncHandler(reportController.downloadReport)
);

// Delete report
router.delete(
  '/:id',
  asyncHandler(reportController.deleteReport)
);

export default router;
