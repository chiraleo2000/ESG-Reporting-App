import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  mfaVerifySchema,
  mfaConfirmSchema,
  mfaDisableSchema,
  passwordPolicySchema,
} from '../middleware/validation';
import { authenticate, requireMfaCompleted } from '../middleware/auth';
import { authRateLimiter, mfaRateLimiter } from '../middleware/rateLimit';
import * as authController from '../controllers/authController';
import { z } from 'zod';

const router = Router();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordPolicySchema,
});

// Register new user
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  asyncHandler(authController.register)
);

// Login
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(authController.login)
);

// MFA login verify
router.post(
  '/mfa/verify',
  mfaRateLimiter,
  validate(mfaVerifySchema),
  asyncHandler(authController.verifyMfaLogin)
);

// Refresh token
router.post(
  '/refresh',
  authRateLimiter,
  validate(refreshTokenSchema),
  asyncHandler(authController.refreshToken)
);

// MFA enrollment
router.post(
  '/mfa/setup',
  authenticate,
  asyncHandler(authController.setupMfa)
);

router.post(
  '/mfa/confirm',
  authenticate,
  mfaRateLimiter,
  validate(mfaConfirmSchema),
  asyncHandler(authController.confirmMfa)
);

router.post(
  '/mfa/disable',
  authenticate,
  mfaRateLimiter,
  validate(mfaDisableSchema),
  asyncHandler(authController.disableMfa)
);

router.post(
  '/mfa/backup-codes',
  authenticate,
  requireMfaCompleted,
  asyncHandler(authController.regenerateBackupCodes)
);

// Get current user profile
router.get(
  '/me',
  authenticate,
  asyncHandler(authController.getCurrentUser)
);

// Update current user profile
router.put(
  '/me',
  authenticate,
  asyncHandler(authController.updateProfile)
);

// Change password
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword)
);

// Logout (invalidate token)
router.post(
  '/logout',
  authenticate,
  asyncHandler(authController.logout)
);

export default router;
