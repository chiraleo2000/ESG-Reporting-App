import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { AuthPayload, UserRole } from '../types';
import { logger } from '../utils/logger';
import { redis, cacheKeys } from '../config/redis';

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

export type ProjectRole = UserRole | 'admin';

const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  auditor: 2,
  editor: 3,
  director: 4,
  owner: 5,
  admin: 5,
};

export function roleAtLeast(role: string | undefined, minRole: ProjectRole): boolean {
  const actual = ROLE_RANK[role || ''] ?? 0;
  const required = ROLE_RANK[minRole] ?? 99;
  return actual >= required;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      projectRole?: ProjectRole;
      projectId?: string;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token and Redis blacklist
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];

    // Reject blacklisted (logged-out) tokens when Redis is available
    try {
      const blacklisted = await redis.exists(cacheKeys.tokenBlacklist(token));
      if (blacklisted === 1) {
        throw new UnauthorizedError('Token has been revoked');
      }
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      logger.warn('Redis blacklist check failed; continuing authentication');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;
    const role = decoded.role === ('admin' as UserRole) ? 'owner' : decoded.role;

    req.user = {
      ...decoded,
      role,
      signatureAuthorized: decoded.signatureAuthorized || config.signature.authorizedRoles.includes(role),
      amr: decoded.amr,
    };

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
      try {
        const blacklisted = await redis.exists(cacheKeys.tokenBlacklist(token));
        if (blacklisted === 1) {
          return next();
        }
      } catch {
        // ignore redis errors for optional auth
      }
      const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;
      req.user = decoded;
    }

    next();
  } catch {
    next();
  }
};

/**
 * Role-based authorization middleware (global JWT role)
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
 * Require MFA completion (amr includes otp) for sensitive owner/director ops
 */
export const requireMfaCompleted = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  const needsMfa =
    roleAtLeast(req.user.role, 'director') ||
    roleAtLeast(req.projectRole || '', 'director');

  if (!needsMfa) {
    return next();
  }

  const amr = req.user.amr || [];
  if (!amr.includes('otp')) {
    return next(new ForbiddenError('MFA verification required for this operation'));
  }

  next();
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
 * Resolve project membership role for a user
 */
export async function getProjectMembership(
  projectId: string,
  userId: string
): Promise<{ role: ProjectRole } | null> {
  const { db } = await import('../config/database');

  // Global admin/owner users retain elevated access when they are members;
  // membership row is still required to prevent cross-tenant IDOR.
  const membership = await db.queryOne(
    `SELECT role FROM project_members
     WHERE project_id = $1 AND user_id = $2 AND is_active = true`,
    [projectId, userId]
  );

  if (!membership) {
    return null;
  }

  const role = membership.role === 'admin' ? 'owner' : membership.role;
  return { role };
}

/**
 * Project membership middleware with minimum role hierarchy:
 * viewer < auditor < editor < director < owner/admin
 */
export const authorizeProjectMember = (
  minRole: ProjectRole = 'viewer',
  projectIdParam: string = 'projectId'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      const projectId =
        (req.params as Record<string, string>)[projectIdParam] ||
        req.body?.projectId ||
        (req.query?.projectId as string | undefined);

      if (!projectId) {
        return next(new ForbiddenError('Project ID required'));
      }

      const membership = await getProjectMembership(projectId, req.user.userId || req.user.id);

      if (!membership) {
        // Log denial for anomaly detection
        try {
          const { logSecurityEvent } = await import('../services/auditService');
          await logSecurityEvent({
            userId: req.user.userId || req.user.id,
            action: 'auth.access_denied',
            entityType: 'project',
            entityId: projectId,
            details: { reason: 'not_a_member', minRole },
            ipAddress: req.ip,
            userAgent: req.get('user-agent') || undefined,
            projectId,
          });
        } catch {
          // non-fatal
        }
        return next(new ForbiddenError('Not authorized to access this project'));
      }

      if (!roleAtLeast(membership.role, minRole)) {
        try {
          const { logSecurityEvent } = await import('../services/auditService');
          await logSecurityEvent({
            userId: req.user.userId || req.user.id,
            action: 'auth.access_denied',
            entityType: 'project',
            entityId: projectId,
            details: { reason: 'insufficient_role', role: membership.role, minRole },
            ipAddress: req.ip,
            userAgent: req.get('user-agent') || undefined,
            projectId,
          });
        } catch {
          // non-fatal
        }
        return next(new ForbiddenError('Insufficient project permissions'));
      }

      req.projectRole = membership.role;
      req.projectId = projectId;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Authorize via an entity's project_id (closes IDOR on /:id routes)
 */
export const authorizeEntityProjectMember = (
  table: string,
  idParam: string = 'id',
  minRole: ProjectRole = 'viewer',
  projectIdColumn: string = 'project_id'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      const entityId = (req.params as Record<string, string>)[idParam];
      if (!entityId) {
        return next(new ForbiddenError('Resource ID required'));
      }

      const allowedTables = new Set([
        'activities',
        'reports',
        'files',
        'audit_logs',
        'data_sources',
        'document_embeddings',
        'grid_ef_overrides',
        'precursor_factor_overrides',
      ]);

      if (!allowedTables.has(table)) {
        return next(new ForbiddenError('Invalid resource type'));
      }

      const { db } = await import('../config/database');
      const row = await db.queryOne(
        `SELECT ${projectIdColumn} AS project_id FROM ${table} WHERE id = $1`,
        [entityId]
      );

      if (!row) {
        return next(new ForbiddenError('Resource not found'));
      }

      // Global (null project) resources — owner/admin JWT only
      if (!row.project_id) {
        if (!roleAtLeast(req.user.role, 'owner')) {
          return next(new ForbiddenError('Not authorized to access this resource'));
        }
        req.projectRole = 'owner';
        return next();
      }

      const membership = await getProjectMembership(row.project_id, req.user.userId || req.user.id);
      if (!membership || !roleAtLeast(membership.role, minRole)) {
        return next(new ForbiddenError('Not authorized to access this resource'));
      }

      req.projectRole = membership.role;
      req.projectId = row.project_id;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * @deprecated Use authorizeProjectMember — kept as owner-level alias
 */
export const authorizeProjectOwner = (projectIdParam: string = 'projectId') =>
  authorizeProjectMember('owner', projectIdParam);

/**
 * Generate JWT tokens (access + refresh with separate secrets)
 */
export const generateTokens = (payload: AuthPayload) => {
  const accessToken = jwt.sign(payload as object, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(
    { userId: payload.userId, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'] }
  );

  return { accessToken, refreshToken };
};

/**
 * Hash a refresh token for DB storage
 */
export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

/**
 * Persist a refresh token and return its hash
 */
export async function persistRefreshToken(
  userId: string,
  refreshToken: string,
  meta?: { ipAddress?: string; deviceInfo?: string }
): Promise<void> {
  const { db } = await import('../config/database');
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + parseDurationMs(config.jwt.refreshExpiresIn));

  await db.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, device_info, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      crypto.randomUUID(),
      userId,
      tokenHash,
      meta?.deviceInfo || null,
      meta?.ipAddress || null,
      expiresAt,
    ]
  );
}

/**
 * Rotate refresh token: revoke old, issue/persist new
 */
export async function rotateRefreshToken(
  presentedToken: string,
  userId: string,
  meta?: { ipAddress?: string; deviceInfo?: string }
): Promise<string> {
  const { db } = await import('../config/database');
  const oldHash = hashToken(presentedToken);

  const existing = await db.queryOne(
    `SELECT id FROM refresh_tokens
     WHERE user_id = $1 AND token_hash = $2
       AND revoked_at IS NULL AND expires_at > NOW()`,
    [userId, oldHash]
  );

  if (!existing) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  await db.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
    [existing.id]
  );

  const payload = { userId, type: 'refresh' };
  const nextToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });

  await persistRefreshToken(userId, nextToken, meta);
  return nextToken;
}

function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = match[2];
  const mult =
    unit === 's' ? 1000 :
    unit === 'm' ? 60_000 :
    unit === 'h' ? 3_600_000 :
    86_400_000;
  return n * mult;
}

/**
 * Verify refresh token (signature + type)
 */
export const verifyRefreshToken = (token: string): { userId: string } => {
  const decoded = jwt.verify(token, config.jwt.refreshSecret) as any;

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
    id: user.id,
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    signatureAuthorized: config.signature.authorizedRoles.includes(user.role),
    amr: ['pwd'],
  };

  return jwt.sign(payload as object, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
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
