import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorizeProjectOwner, authorize } from '../middleware/auth';
import { validate, paginationSchema } from '../middleware/validation';
import * as auditController from '../controllers/auditController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get audit logs for a project
router.get(
  '/project/:projectId',
  authorizeProjectOwner('projectId'),
  validate(paginationSchema, 'query'),
  asyncHandler(auditController.getProjectAuditLogs)
);

// Get audit log summary for a project
router.get(
  '/project/:projectId/summary',
  authorizeProjectOwner('projectId'),
  asyncHandler(auditController.getAuditSummary)
);

// Export audit logs for a project
router.post(
  '/project/:projectId/export',
  authorizeProjectOwner('projectId'),
  asyncHandler(auditController.exportAuditLogs)
);

// Get single audit log entry
router.get(
  '/:id',
  asyncHandler(auditController.getAuditLog)
);

// Filter audit logs by action type
router.get(
  '/project/:projectId/filter',
  authorizeProjectOwner('projectId'),
  asyncHandler(auditController.filterAuditLogs)
);

export default router;
