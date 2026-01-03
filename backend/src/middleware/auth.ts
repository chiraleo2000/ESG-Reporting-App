import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { AuthPayload, UserRole } from '../types';
import { logger } from '../utils/logger';

// Simplified User type for token generation
interface TokenUser {
  id: string;
  email: string;
  name: string;
  company: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid authentication token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Authentication token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Optional authentication - attaches user if token present, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;
      req.user = decoded;
    }

    next();
  } catch {
    // Ignore token errors for optional auth
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Signature authorization middleware - checks if user can sign documents
 */
export const authorizeSignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (!req.user.signatureAuthorized) {
    return next(new ForbiddenError('Not authorized to sign documents'));
  }

  const authorizedRoles = config.signature.authorizedRoles;
  if (!authorizedRoles.includes(req.user.role)) {
    return next(new ForbiddenError('Your role is not authorized to sign documents'));
  }

  next();
};

/**
 * Project ownership middleware - ensures user owns the project
 */
export const authorizeProjectOwner = (projectIdParam: string = 'projectId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      const projectId = req.params[projectIdParam] || req.body.projectId;
      
      if (!projectId) {
        return next(new ForbiddenError('Project ID required'));
      }

      // Import here to avoid circular dependency
      const { db } = await import('../config/database');
      
      const project = await db.queryOne(
        'SELECT user_id FROM projects WHERE id = $1 AND deleted_at IS NULL',
        [projectId]
      );

      if (!project) {
        return next(new ForbiddenError('Project not found'));
      }

      if (project.user_id !== req.user.userId) {
        // Check if user has viewer/editor access (for future collaboration feature)
        return next(new ForbiddenError('Not authorized to access this project'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Generate JWT tokens
 */
export const generateTokens = (payload: AuthPayload) => {
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  const refreshToken = jwt.sign(
    { userId: payload.userId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): { userId: string } => {
  const decoded = jwt.verify(token, config.jwt.secret) as any;
  
  if (decoded.type !== 'refresh') {
    throw new UnauthorizedError('Invalid refresh token');
  }

  return { userId: decoded.userId };
};

/**
 * Generate a single JWT token for a user
 */
export const generateToken = (user: TokenUser): string => {
  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    signatureAuthorized: config.signature.authorizedRoles.includes(user.role),
  };
  
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare a plain text password with a hashed password
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
