import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validate, registerSchema, loginSchema, refreshTokenSchema } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import * as authController from '../controllers/authController';

const router = Router();

// Register new user
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(authController.register)
);

// Login
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(authController.login)
);

// Refresh token
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  asyncHandler(authController.refreshToken)
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
  asyncHandler(authController.changePassword)
);

// Logout (invalidate token)
router.post(
  '/logout',
  authenticate,
  asyncHandler(authController.logout)
);

export default router;
