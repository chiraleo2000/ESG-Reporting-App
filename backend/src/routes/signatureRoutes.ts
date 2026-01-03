import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorizeSignature, authorizeProjectOwner } from '../middleware/auth';
import { validate, signReportSchema } from '../middleware/validation';
import * as signatureController from '../controllers/signatureController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Sign a report (requires signature authorization)
router.post(
  '/sign',
  authorizeSignature,
  validate(signReportSchema),
  asyncHandler(signatureController.signReport)
);

// Verify a signature on a report
router.get(
  '/:reportId/verify',
  asyncHandler(signatureController.verifySignature)
);

// Get signatures for a project
router.get(
  '/project/:projectId',
  authorizeProjectOwner('projectId'),
  asyncHandler(signatureController.getProjectSignatures)
);

// Get signature details
router.get(
  '/:id',
  asyncHandler(signatureController.getSignature)
);

// Revoke a signature (if needed)
router.delete(
  '/:id',
  authorizeSignature,
  asyncHandler(signatureController.revokeSignature)
);

export default router;
