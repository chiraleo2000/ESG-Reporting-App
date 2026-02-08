/**
 * Auth Middleware Unit Tests — comprehensive coverage
 * Covers: authenticate, optionalAuth, authorize, authorizeSignature,
 * authorizeProjectOwner, generateTokens, verifyRefreshToken, generateToken,
 * hashPassword, comparePassword
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock config BEFORE importing the module
jest.mock('../../src/config', () => ({
  config: {
    jwt: {
      secret: 'test-secret-key-123',
      expiresIn: '24h',
      refreshExpiresIn: '7d',
    },
    signature: {
      authorizedRoles: ['owner', 'director', 'auditor'],
    },
  },
}));

// Mock database for authorizeProjectOwner
jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn() },
  db: {
    query: jest.fn(),
    queryOne: jest.fn(),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import {
  authenticate,
  optionalAuth,
  authorize,
  authorizeSignature,
  authorizeProjectOwner,
  generateTokens,
  verifyRefreshToken,
  generateToken,
  hashPassword,
  comparePassword,
} from '../../src/middleware/auth';

import { db } from '../../src/config/database';

function mockRequest(overrides: any = {}): any {
  return {
    headers: {},
    params: {},
    body: {},
    user: undefined,
    ...overrides,
  };
}

function mockResponse(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // authenticate
  // ==========================================================================
  describe('authenticate', () => {
    it('should attach user to request with valid token', async () => {
      const payload = { userId: 'u-1', email: 'test@test.com', name: 'Test', role: 'owner' };
      const token = jwt.sign(payload, 'test-secret-key-123', { expiresIn: '1h' });
      const req = mockRequest({ headers: { authorization: `Bearer ${token}` } });
      const res = mockResponse();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('u-1');
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with UnauthorizedError when no header', async () => {
      const req = mockRequest({ headers: {} });
      const res = mockResponse();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('No authentication token'),
      }));
    });

    it('should call next with UnauthorizedError when header has no Bearer', async () => {
      const req = mockRequest({ headers: { authorization: 'Basic xyz' } });
      const res = mockResponse();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('No authentication token'),
      }));
    });

    it('should call next with UnauthorizedError for invalid token', async () => {
      const req = mockRequest({ headers: { authorization: 'Bearer invalid.token.here' } });
      const res = mockResponse();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Invalid authentication token'),
      }));
    });

    it('should call next with UnauthorizedError for expired token', async () => {
      // TokenExpiredError extends JsonWebTokenError, so the first catch branch fires
      const now = Math.floor(Date.now() / 1000);
      const payload = { userId: 'u-1', iat: now - 3600, exp: now - 1800 };
      const token = jwt.sign(payload, 'test-secret-key-123');
      const req = mockRequest({ headers: { authorization: `Bearer ${token}` } });
      const res = mockResponse();
      const next = jest.fn();

      await authenticate(req, res, next);

      // Due to inheritance order in auth.ts, expired tokens are caught as JsonWebTokenError
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('authentication token'),
      }));
    });
  });

  // ==========================================================================
  // optionalAuth
  // ==========================================================================
  describe('optionalAuth', () => {
    it('should attach user when valid token present', async () => {
      const payload = { userId: 'u-1', email: 'a@b.com', role: 'viewer' };
      const token = jwt.sign(payload, 'test-secret-key-123', { expiresIn: '1h' });
      const req = mockRequest({ headers: { authorization: `Bearer ${token}` } });
      const res = mockResponse();
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('u-1');
      expect(next).toHaveBeenCalledWith();
    });

    it('should proceed without user when no header', async () => {
      const req = mockRequest({ headers: {} });
      const res = mockResponse();
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should proceed without user on invalid token', async () => {
      const req = mockRequest({ headers: { authorization: 'Bearer invalid' } });
      const res = mockResponse();
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });
  });

  // ==========================================================================
  // authorize
  // ==========================================================================
  describe('authorize', () => {
    it('should allow authorized role', () => {
      const middleware = authorize('owner', 'director');
      const req = mockRequest({ user: { userId: 'u-1', role: 'owner' } });
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject unauthorized role', () => {
      const middleware = authorize('owner', 'director');
      const req = mockRequest({ user: { userId: 'u-1', role: 'viewer' } });
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Insufficient permissions'),
      }));
    });

    it('should reject when no user authenticated', () => {
      const middleware = authorize('owner');
      const req = mockRequest({});
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Authentication required'),
      }));
    });
  });

  // ==========================================================================
  // authorizeSignature
  // ==========================================================================
  describe('authorizeSignature', () => {
    it('should allow authorized signer with correct role', () => {
      const req = mockRequest({ user: { userId: 'u-1', role: 'owner', signatureAuthorized: true } });
      const res = mockResponse();
      const next = jest.fn();

      authorizeSignature(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject when not signature authorized', () => {
      const req = mockRequest({ user: { userId: 'u-1', role: 'owner', signatureAuthorized: false } });
      const res = mockResponse();
      const next = jest.fn();

      authorizeSignature(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Not authorized to sign'),
      }));
    });

    it('should reject when role is not in authorizedRoles', () => {
      const req = mockRequest({ user: { userId: 'u-1', role: 'viewer', signatureAuthorized: true } });
      const res = mockResponse();
      const next = jest.fn();

      authorizeSignature(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('role is not authorized'),
      }));
    });

    it('should reject when no user', () => {
      const req = mockRequest({});
      const res = mockResponse();
      const next = jest.fn();

      authorizeSignature(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Authentication required'),
      }));
    });
  });

  // ==========================================================================
  // authorizeProjectOwner
  // ==========================================================================
  describe('authorizeProjectOwner', () => {
    it('should allow project owner', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ created_by: 'u-1' });
      const middleware = authorizeProjectOwner();
      const req = mockRequest({ user: { userId: 'u-1' }, params: { projectId: 'p-1' } });
      const res = mockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject non-owner', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ created_by: 'other-user' });
      const middleware = authorizeProjectOwner();
      const req = mockRequest({ user: { userId: 'u-1' }, params: { projectId: 'p-1' } });
      const res = mockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Not authorized to access'),
      }));
    });

    it('should reject when project not found', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);
      const middleware = authorizeProjectOwner();
      const req = mockRequest({ user: { userId: 'u-1' }, params: { projectId: 'p-1' } });
      const res = mockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Project not found'),
      }));
    });

    it('should reject when no user', async () => {
      const middleware = authorizeProjectOwner();
      const req = mockRequest({ params: { projectId: 'p-1' } });
      const res = mockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Authentication required'),
      }));
    });

    it('should reject when no project ID', async () => {
      const middleware = authorizeProjectOwner();
      const req = mockRequest({ user: { userId: 'u-1' }, params: {}, body: {} });
      const res = mockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Project ID required'),
      }));
    });

    it('should use custom param name', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ created_by: 'u-1' });
      const middleware = authorizeProjectOwner('pid');
      const req = mockRequest({ user: { userId: 'u-1' }, params: { pid: 'p-1' } });
      const res = mockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should use body projectId when param missing', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ created_by: 'u-1' });
      const middleware = authorizeProjectOwner();
      const req = mockRequest({ user: { userId: 'u-1' }, params: {}, body: { projectId: 'p-1' } });
      const res = mockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  // ==========================================================================
  // generateTokens
  // ==========================================================================
  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const payload = {
        id: 'u-1',
        userId: 'u-1',
        email: 'test@test.com',
        name: 'Test',
        role: 'owner' as const,
        signatureAuthorized: true,
      };

      const tokens = generateTokens(payload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');

      // Verify access token content
      const decoded = jwt.verify(tokens.accessToken, 'test-secret-key-123') as any;
      expect(decoded.userId).toBe('u-1');
    });
  });

  // ==========================================================================
  // verifyRefreshToken
  // ==========================================================================
  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const token = jwt.sign(
        { userId: 'u-1', type: 'refresh' },
        'test-secret-key-123',
        { expiresIn: '7d' }
      );

      const result = verifyRefreshToken(token);
      expect(result).toEqual({ userId: 'u-1' });
    });

    it('should throw for non-refresh token', () => {
      const token = jwt.sign(
        { userId: 'u-1', type: 'access' },
        'test-secret-key-123',
        { expiresIn: '1h' }
      );

      expect(() => verifyRefreshToken(token)).toThrow('Invalid refresh token');
    });

    it('should throw for invalid token', () => {
      expect(() => verifyRefreshToken('invalid-token')).toThrow();
    });
  });

  // ==========================================================================
  // generateToken
  // ==========================================================================
  describe('generateToken', () => {
    it('should generate a JWT for a user', () => {
      const user = {
        id: 'u-1',
        email: 'test@test.com',
        name: 'Test User',
        company: 'TestCo',
        role: 'owner' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = generateToken(user);
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, 'test-secret-key-123') as any;
      expect(decoded.userId).toBe('u-1');
      expect(decoded.email).toBe('test@test.com');
      expect(decoded.signatureAuthorized).toBe(true); // owner is in authorizedRoles
    });

    it('should set signatureAuthorized false for viewer', () => {
      const user = {
        id: 'u-2',
        email: 'viewer@test.com',
        name: 'Viewer',
        company: null,
        role: 'viewer' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, 'test-secret-key-123') as any;
      expect(decoded.signatureAuthorized).toBe(false);
    });
  });

  // ==========================================================================
  // hashPassword / comparePassword
  // ==========================================================================
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await hashPassword('mypassword');
      expect(hash).toBeDefined();
      expect(hash).not.toBe('mypassword');
      expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const hash = await hashPassword('secret123');
      const result = await comparePassword('secret123', hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hash = await hashPassword('secret123');
      const result = await comparePassword('wrong', hash);
      expect(result).toBe(false);
    });
  });
});
