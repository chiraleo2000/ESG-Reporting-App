import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';
import { redisClient as redis, cacheKeys } from '../config/redis';
import { config } from '../config/env';
import {
  generateTokens,
  hashPassword,
  comparePassword,
  verifyRefreshToken,
  persistRefreshToken,
  rotateRefreshToken,
} from '../middleware/auth';
import { generateId } from '../utils/helpers';
import { BadRequestError, UnauthorizedError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import type { UserRole, AuthPayload } from '../types';
import * as mfa from '../services/mfaService';
import { logSecurityEvent } from '../services/auditService';

interface User {
  id: string;
  email: string;
  name: string;
  company: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

function issueSessionTokens(user: User, amr: string[] = ['pwd']) {
  const role = (user.role as string) === 'admin' ? 'owner' : user.role;
  return generateTokens({
    id: user.id,
    userId: user.id,
    email: user.email,
    name: user.name,
    role,
    signatureAuthorized: config.signature.authorizedRoles.includes(role),
    amr,
  });
}

function clientMeta(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || undefined,
    deviceInfo: req.get('user-agent')?.slice(0, 500),
  };
}

async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details: object,
  req?: Request
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        generateId(),
        userId,
        action,
        entityType,
        entityId,
        JSON.stringify(details),
        req?.ip || null,
        req?.get('user-agent') || null,
      ]
    );
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
}

/**
 * Register a new user — role is always forced to viewer (no client escalation)
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name, company } = req.body;

  const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    throw new BadRequestError('User with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const userId = generateId();
  const userRole: UserRole = 'viewer';

  await db.query(
    `INSERT INTO users (id, email, password_hash, name, organization, role)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, email, passwordHash, name, company || null, userRole]
  );

  const user: User = {
    id: userId,
    email,
    name,
    company: company || null,
    role: userRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const { accessToken, refreshToken } = issueSessionTokens(user, ['pwd']);
  await persistRefreshToken(userId, refreshToken, clientMeta(req));
  await logAudit(userId, 'CREATE', 'user', userId, { email, name, role: userRole }, req);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role,
        mfaEnabled: false,
      },
      token: accessToken,
      refreshToken,
    },
  });
}

/**
 * Login user — may return MFA challenge instead of tokens
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const meta = clientMeta(req);

  const result = await db.query(
    `SELECT id, email, password_hash, name, organization, role, created_at, updated_at,
            mfa_enabled, mfa_secret
     FROM users WHERE email = $1 AND is_active = true`,
    [email]
  );

  if (result.rows.length === 0) {
    await logSecurityEvent({
      action: 'auth.login_failed',
      entityType: 'user',
      entityId: null,
      details: { email, reason: 'unknown_user' },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    throw new UnauthorizedError('Invalid email or password');
  }

  const userRow = result.rows[0];
  const isValid = await comparePassword(password, userRow.password_hash);
  if (!isValid) {
    await logSecurityEvent({
      userId: userRow.id,
      action: 'auth.login_failed',
      entityType: 'user',
      entityId: userRow.id,
      details: { email, reason: 'bad_password' },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    throw new UnauthorizedError('Invalid email or password');
  }

  const user: User = {
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    company: userRow.organization,
    role: userRow.role,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
  };

  // MFA enrolled → return short-lived challenge token
  if (userRow.mfa_enabled) {
    const mfaToken = jwt.sign(
      { userId: userRow.id, type: 'mfa_challenge' },
      config.jwt.secret,
      { expiresIn: '5m' }
    );

    await logAudit(userRow.id, 'auth.mfa_challenge', 'user', userRow.id, { email }, req);

    res.json({
      success: true,
      data: {
        mfaRequired: true,
        mfaToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
    return;
  }

  // High-privilege roles should enroll MFA (soft notice; still allow login)
  const mfaRecommended = mfa.rolesRequiringMfa(userRow.role);

  await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userRow.id]);

  const { accessToken, refreshToken } = issueSessionTokens(user, ['pwd']);
  await persistRefreshToken(userRow.id, refreshToken, meta);
  await logAudit(userRow.id, 'LOGIN', 'user', userRow.id, { email, mfaRecommended }, req);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role,
        mfaEnabled: false,
        mfaRecommended,
      },
      token: accessToken,
      refreshToken,
      mfaRequired: false,
    },
  });
}

/**
 * Verify MFA code (TOTP or backup) after password login challenge
 */
export async function verifyMfaLogin(req: Request, res: Response): Promise<void> {
  const { mfaToken, code } = req.body;
  const meta = clientMeta(req);

  let challenge: { userId: string; type: string };
  try {
    challenge = jwt.verify(mfaToken, config.jwt.secret) as any;
    if (challenge.type !== 'mfa_challenge') {
      throw new Error('bad type');
    }
  } catch {
    throw new UnauthorizedError('Invalid or expired MFA token');
  }

  const result = await db.query(
    `SELECT id, email, name, organization, role, created_at, updated_at,
            mfa_enabled, mfa_secret, mfa_backup_codes
     FROM users WHERE id = $1 AND is_active = true`,
    [challenge.userId]
  );

  if (result.rows.length === 0 || !result.rows[0].mfa_enabled) {
    throw new UnauthorizedError('MFA not available');
  }

  const userRow = result.rows[0];
  const secret = mfa.decryptSecret(userRow.mfa_secret);
  let ok = mfa.verifyTotp(secret, code);

  if (!ok) {
    const codes: string[] = Array.isArray(userRow.mfa_backup_codes)
      ? userRow.mfa_backup_codes
      : JSON.parse(userRow.mfa_backup_codes || '[]');
    const consumed = await mfa.consumeBackupCode(code, codes);
    if (consumed.valid) {
      ok = true;
      await db.query(
        `UPDATE users SET mfa_backup_codes = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(consumed.remaining), userRow.id]
      );
    }
  }

  if (!ok) {
    await logSecurityEvent({
      userId: userRow.id,
      action: 'auth.mfa_failed',
      entityType: 'user',
      entityId: userRow.id,
      details: { reason: 'invalid_code' },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    throw new UnauthorizedError('Invalid MFA code');
  }

  await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userRow.id]);

  const user: User = {
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    company: userRow.organization,
    role: userRow.role,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
  };

  const { accessToken, refreshToken } = issueSessionTokens(user, ['pwd', 'otp']);
  await persistRefreshToken(userRow.id, refreshToken, meta);
  await logAudit(userRow.id, 'LOGIN', 'user', userRow.id, { mfa: true }, req);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role,
        mfaEnabled: true,
      },
      token: accessToken,
      refreshToken,
      mfaRequired: false,
    },
  });
}

/**
 * Begin MFA setup — returns otpauth URI / secret for authenticator apps
 */
export async function setupMfa(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const result = await db.query(
    `SELECT email, mfa_enabled FROM users WHERE id = $1`,
    [userId]
  );
  if (result.rows.length === 0) throw new NotFoundError('User not found');
  if (result.rows[0].mfa_enabled) {
    throw new BadRequestError('MFA is already enabled');
  }

  const secret = mfa.generateMfaSecret();
  const encrypted = mfa.encryptSecret(secret);
  const otpauthUrl = mfa.buildOtpauthUri(secret, result.rows[0].email);

  await db.query(
    `UPDATE users SET mfa_secret = $1, updated_at = NOW() WHERE id = $2`,
    [encrypted, userId]
  );

  res.json({
    success: true,
    data: {
      secret,
      otpauthUrl,
    },
  });
}

/**
 * Confirm MFA enrollment with a valid TOTP code; returns backup codes once
 */
export async function confirmMfa(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { code } = req.body;

  const result = await db.query(
    `SELECT mfa_secret, mfa_enabled FROM users WHERE id = $1`,
    [userId]
  );
  if (result.rows.length === 0) throw new NotFoundError('User not found');
  if (result.rows[0].mfa_enabled) throw new BadRequestError('MFA is already enabled');
  if (!result.rows[0].mfa_secret) throw new BadRequestError('Call MFA setup first');

  const secret = mfa.decryptSecret(result.rows[0].mfa_secret);
  if (!mfa.verifyTotp(secret, code)) {
    throw new BadRequestError('Invalid verification code');
  }

  const { plain, hashed } = await mfa.generateBackupCodes();
  await db.query(
    `UPDATE users
     SET mfa_enabled = true, mfa_backup_codes = $1, mfa_verified_at = NOW(), updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(hashed), userId]
  );

  await logAudit(userId, 'auth.mfa_enabled', 'user', userId, {}, req);

  res.json({
    success: true,
    data: {
      mfaEnabled: true,
      backupCodes: plain,
    },
  });
}

/**
 * Disable MFA (password + current TOTP/backup required)
 */
export async function disableMfa(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { password, code } = req.body;

  const result = await db.query(
    `SELECT password_hash, mfa_enabled, mfa_secret, mfa_backup_codes, role
     FROM users WHERE id = $1`,
    [userId]
  );
  if (result.rows.length === 0) throw new NotFoundError('User not found');
  const row = result.rows[0];
  if (!row.mfa_enabled) throw new BadRequestError('MFA is not enabled');

  if (!(await comparePassword(password, row.password_hash))) {
    throw new BadRequestError('Current password is incorrect');
  }

  const secret = mfa.decryptSecret(row.mfa_secret);
  let ok = mfa.verifyTotp(secret, code);
  if (!ok) {
    const codes: string[] = Array.isArray(row.mfa_backup_codes)
      ? row.mfa_backup_codes
      : JSON.parse(row.mfa_backup_codes || '[]');
    const consumed = await mfa.consumeBackupCode(code, codes);
    ok = consumed.valid;
  }
  if (!ok) throw new BadRequestError('Invalid MFA code');

  await db.query(
    `UPDATE users
     SET mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = '[]',
         mfa_verified_at = NULL, updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );

  await logAudit(userId, 'auth.mfa_disabled', 'user', userId, {}, req);

  res.json({ success: true, message: 'MFA disabled' });
}

/**
 * Regenerate backup codes (requires authenticated MFA-completed session)
 */
export async function regenerateBackupCodes(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const amr = req.user!.amr || [];
  if (!amr.includes('otp')) {
    throw new ForbiddenError('MFA verification required');
  }

  const result = await db.query(
    `SELECT mfa_enabled FROM users WHERE id = $1`,
    [userId]
  );
  if (!result.rows[0]?.mfa_enabled) throw new BadRequestError('MFA is not enabled');

  const { plain, hashed } = await mfa.generateBackupCodes();
  await db.query(
    `UPDATE users SET mfa_backup_codes = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(hashed), userId]
  );

  res.json({ success: true, data: { backupCodes: plain } });
}

/**
 * Logout user (invalidate token)
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    const expiresIn = 86400;
    await redis.set(cacheKeys.tokenBlacklist(token), '1', expiresIn);
  }

  if (req.user) {
    await logAudit(req.user.userId, 'LOGOUT', 'user', req.user.userId, {}, req);
  }

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}

/**
 * Get current user profile
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const result = await db.query(
    `SELECT id, email, name, organization as company, role, mfa_enabled,
            created_at, updated_at, last_login_at as last_login
     FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const user = result.rows[0];

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      role: user.role,
      mfaEnabled: !!user.mfa_enabled,
      mfaRecommended: mfa.rolesRequiringMfa(user.role) && !user.mfa_enabled,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_login,
    },
  });
}

/**
 * Update user profile
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { name, company } = req.body;

  const result = await db.query(
    `UPDATE users SET name = COALESCE($1, name), organization = COALESCE($2, organization), updated_at = NOW()
     WHERE id = $3
     RETURNING id, email, name, organization as company, role, mfa_enabled, created_at, updated_at`,
    [name, company, userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const user = result.rows[0];
  await logAudit(userId, 'UPDATE', 'user', userId, { name, company }, req);

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      role: user.role,
      mfaEnabled: !!user.mfa_enabled,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
  });
}

/**
 * Change password
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { currentPassword, newPassword } = req.body;

  const result = await db.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const isValid = await comparePassword(currentPassword, result.rows[0].password_hash);
  if (!isValid) {
    throw new BadRequestError('Current password is incorrect');
  }

  const newPasswordHash = await hashPassword(newPassword);
  await db.query(
    'UPDATE users SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW() WHERE id = $2',
    [newPasswordHash, userId]
  );

  await logAudit(userId, 'UPDATE', 'user', userId, { action: 'password_change' }, req);

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
}

/**
 * Get all users (admin only)
 */
export async function getUsers(req: Request, res: Response): Promise<void> {
  const { page = 1, limit = 20, role, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (role) {
    whereClause += ` AND role = $${paramIndex}`;
    params.push(role);
    paramIndex++;
  }

  if (search) {
    whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const countResult = await db.query(
    `SELECT COUNT(*) FROM users ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  params.push(Number(limit), offset);
  const result = await db.query(
    `SELECT id, email, name, organization as company, role, is_active, mfa_enabled,
            created_at, last_login_at as last_login
     FROM users ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

/**
 * Update user (admin only)
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  const { id } = (req.params as Record<string, string>);
  const { role, isActive } = req.body;

  const result = await db.query(
    `UPDATE users 
     SET role = COALESCE($1, role), 
         is_active = COALESCE($2, is_active),
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, email, name, organization as company, role, is_active, created_at, updated_at`,
    [role, isActive, id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  await logAudit(req.user!.id, 'UPDATE', 'user', id, { role, isActive }, req);

  res.json({
    success: true,
    data: result.rows[0],
  });
}

/**
 * Refresh token — verify, rotate, persist
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refreshToken: presented } = req.body as { refreshToken?: string };
  if (!presented) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  let userId: string;
  try {
    userId = verifyRefreshToken(presented).userId;
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const result = await db.query(
    `SELECT id, email, name, organization, role, mfa_enabled
     FROM users WHERE id = $1 AND is_active = true`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const row = result.rows[0];
  let nextRefresh: string;
  try {
    nextRefresh = await rotateRefreshToken(presented, userId, clientMeta(req));
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const amr = row.mfa_enabled ? ['pwd', 'otp'] : ['pwd'];
  const { accessToken } = issueSessionTokens(
    {
      id: row.id,
      email: row.email,
      name: row.name,
      company: row.organization,
      role: row.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    amr
  );

  res.json({
    success: true,
    data: { token: accessToken, refreshToken: nextRefresh },
  });
}

/**
 * Get current user (alias for getProfile)
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  return getProfile(req, res);
}
