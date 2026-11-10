import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import {
  authenticate,
  authorizeProjectMember,
  authorizeEntityProjectMember,
  authorize,
  requireMfaCompleted,
} from '../middleware/auth';
import { validate, paginationSchema } from '../middleware/validation';
import * as auditController from '../controllers/auditController';

const router = Router();

router.use(authenticate);

// Global search must be registered before /:id
router.get(
  '/search/global',
  authorize('owner'),
  asyncHandler(auditController.searchGlobalAuditLogs)
);

router.get(
  '/project/:projectId',
  authorizeProjectMember('auditor', 'projectId'),
  validate(paginationSchema, 'query'),
  asyncHandler(auditController.getProjectAuditLogs)
);

router.get(
  '/project/:projectId/summary',
  authorizeProjectMember('auditor', 'projectId'),
  asyncHandler(auditController.getAuditSummary)
);

router.post(
  '/project/:projectId/export',
  authorizeProjectMember('auditor', 'projectId'),
  requireMfaCompleted,
  asyncHandler(auditController.exportAuditLogs)
);

router.get(
  '/project/:projectId/filter',
  authorizeProjectMember('auditor', 'projectId'),
  asyncHandler(auditController.filterAuditLogs)
);

router.get(
  '/:id',
  authorizeEntityProjectMember('audit_logs', 'id', 'auditor'),
  asyncHandler(auditController.getAuditLog)
);

export default router;
