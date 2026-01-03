import { Request, Response } from 'express';
import { db } from '../config/database';
import { redis } from '../config/redis';
import { config } from '../config/env';
import { generateToken, hashPassword, comparePassword } from '../middleware/auth';
import { generateId } from '../utils/helpers';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import type { UserRole } from '../types';

// User type for auth operations (matches token generation)
interface User {
  id: string;
  email: string;
  name: string;
  company: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Audit log helper
async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details: object
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [generateId(), userId, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
}

/**
 * Register a new user
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name, company, role } = req.body;

  // Check if user already exists
  const existingUser = await db.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new BadRequestError('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const userId = generateId();
  const userRole: UserRole = role || 'viewer';

  await db.query(
    `INSERT INTO users (id, email, password_hash, name, organization, role)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, email, passwordHash, name, company || null, userRole]
  );

  // Generate token
  const user: User = {
    id: userId,
    email,
    name,
    company: company || null,
    role: userRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const token = generateToken(user);

  // Audit log
  await logAudit(userId, 'CREATE', 'user', userId, { email, name, role: userRole });

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role,
      },
      token,
    },
  });
}

/**
 * Login user
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  // Get user
  const result = await db.query(
    `SELECT id, email, password_hash, name, organization, role, created_at, updated_at
     FROM users WHERE email = $1 AND is_active = true`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const userRow = result.rows[0];

  // Verify password
  const isValid = await comparePassword(password, userRow.password_hash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Update last login
  await db.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [userRow.id]
  );

  // Generate token
  const user: User = {
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    company: userRow.organization,
    role: userRow.role,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
  };

  const token = generateToken(user);

  // Audit log
  await logAudit(userRow.id, 'LOGIN', 'user', userRow.id, { email });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role,
      },
      token,
    },
  });
}

/**
 * Logout user (invalidate token)
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    // Add token to blacklist in Redis with expiry matching JWT expiry (24 hours default)
    const expiresIn = 86400; // 24 hours in seconds
    await redis.set(redis.keys.tokenBlacklist(token), '1', expiresIn);
  }

  if (req.user) {
    await logAudit(req.user.userId, 'LOGOUT', 'user', req.user.userId, {});
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
    `SELECT id, email, name, company, role, created_at, updated_at, last_login
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
    `UPDATE users SET name = COALESCE($1, name), company = COALESCE($2, company), updated_at = NOW()
     WHERE id = $3
     RETURNING id, email, name, company, role, created_at, updated_at`,
    [name, company, userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const user = result.rows[0];

  await logAudit(userId, 'UPDATE', 'user', userId, { name, company });

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      role: user.role,
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

  // Get current password hash
  const result = await db.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  // Verify current password
  const isValid = await comparePassword(currentPassword, result.rows[0].password_hash);
  if (!isValid) {
    throw new BadRequestError('Current password is incorrect');
  }

  // Hash new password and update
  const newPasswordHash = await hashPassword(newPassword);
  await db.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [newPasswordHash, userId]
  );

  await logAudit(userId, 'UPDATE', 'user', userId, { action: 'password_change' });

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

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM users ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get users
  params.push(Number(limit), offset);
  const result = await db.query(
    `SELECT id, email, name, company, role, is_active, created_at, last_login
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
  const { id } = req.params;
  const { role, isActive } = req.body;

  const result = await db.query(
    `UPDATE users 
     SET role = COALESCE($1, role), 
         is_active = COALESCE($2, is_active),
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, email, name, company, role, is_active, created_at, updated_at`,
    [role, isActive, id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  await logAudit(req.user!.id, 'UPDATE', 'user', id, { role, isActive });

  res.json({
    success: true,
    data: result.rows[0],
  });
}

/**
 * Refresh token
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const token = generateToken(user);

  res.json({
    success: true,
    data: { token },
  });
}
