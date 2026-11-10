import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.isProduction ? 500 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts' },
});

export const mfaRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many MFA attempts' },
});
