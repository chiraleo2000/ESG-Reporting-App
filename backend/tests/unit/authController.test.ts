/**
 * Auth Controller Unit Tests
 * Tests register, login, logout, getProfile, updateProfile,
 * changePassword, getUsers, updateUser, refreshToken, getCurrentUser
 */
import { Request, Response } from 'express';

// Mock database
jest.mock('../../src/config/database', () => ({
  db: { query: jest.fn() },
  pool: { connect: jest.fn() },
}));

// Mock redis
jest.mock('../../src/config/redis', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn(),
    del: jest.fn(),
    keys: {
      tokenBlacklist: (token: string) => `blacklist:${token}`,
      userProjects: (userId: string) => `user:${userId}:projects`,
      project: (id: string) => `project:${id}`,
    },
  },
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Mock helpers
jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('mock-user-id'),
}));

// Mock auth middleware functions
jest.mock('../../src/middleware/auth', () => ({
  generateToken: jest.fn().mockReturnValue('mock-jwt-token'),
  generateTokens: jest.fn().mockReturnValue({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' }),
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  comparePassword: jest.fn(),
}));

import { db } from '../../src/config/database';
import { comparePassword } from '../../src/middleware/auth';
import {
  register, login, logout, getProfile, updateProfile,
  changePassword, getUsers, updateUser, refreshToken, getCurrentUser,
} from '../../src/controllers/authController';

const mockDb = db as jest.Mocked<typeof db>;
const mockCompare = comparePassword as jest.Mock;

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: { id: 'user-123', userId: 'user-123', email: 'test@example.com', role: 'owner', name: 'Test User', signatureAuthorized: false } as any,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  // ===================== REGISTER =====================
  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockRequest.body = { email: 'new@example.com', password: 'Pass123!', name: 'New User', company: 'TestCo' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // check existing
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT user
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit log

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({ email: 'new@example.com', name: 'New User' }),
          token: 'mock-jwt-token',
        }),
      });
    });

    it('should reject duplicate email', async () => {
      mockRequest.body = { email: 'existing@example.com', password: 'Pass123!', name: 'Dup User' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'existing-id' }], rowCount: 1 });

      await expect(register(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('User with this email already exists');
    });

    it('should assign default role viewer when no role specified', async () => {
      mockRequest.body = { email: 'viewer@example.com', password: 'Pass123!', name: 'Viewer' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user: expect.objectContaining({ role: 'viewer' }),
          }),
        })
      );
    });
  });

  // ===================== LOGIN =====================
  describe('login', () => {
    it('should login with valid credentials', async () => {
      mockRequest.body = { email: 'admin@esgdemo.com', password: 'Demo@123' };
      const userRow = {
        id: 'user-1', email: 'admin@esgdemo.com', password_hash: 'hashed',
        name: 'Admin', organization: 'ESG Corp', role: 'owner',
        created_at: new Date(), updated_at: new Date(),
      };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [userRow], rowCount: 1 }) // SELECT user
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE last_login
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit log
      mockCompare.mockResolvedValue(true);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({ email: 'admin@esgdemo.com', role: 'owner' }),
          token: 'mock-jwt-token',
        }),
      });
    });

    it('should reject invalid email', async () => {
      mockRequest.body = { email: 'nonexistent@example.com', password: 'Pass123!' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(login(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Invalid email or password');
    });

    it('should reject wrong password', async () => {
      mockRequest.body = { email: 'admin@esgdemo.com', password: 'wrong' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'u1', email: 'admin@esgdemo.com', password_hash: 'h', name: 'A', organization: 'O', role: 'owner', created_at: new Date(), updated_at: new Date() }],
        rowCount: 1,
      });
      mockCompare.mockResolvedValue(false);

      await expect(login(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Invalid email or password');
    });
  });

  // ===================== LOGOUT =====================
  describe('logout', () => {
    it('should logout and blacklist token', async () => {
      mockRequest.headers = { authorization: 'Bearer my-token' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await logout(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ success: true, message: 'Logged out successfully' });
    });

    it('should handle logout without token gracefully', async () => {
      mockRequest.headers = {};
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await logout(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ success: true, message: 'Logged out successfully' });
    });
  });

  // ===================== GET PROFILE =====================
  describe('getProfile', () => {
    it('should return current user profile', async () => {
      const userRow = {
        id: 'user-123', email: 'test@example.com', name: 'Test', company: 'Corp',
        role: 'owner', created_at: new Date(), updated_at: new Date(), last_login: new Date(),
      };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [userRow], rowCount: 1 });

      await getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 'user-123', email: 'test@example.com' }),
      });
    });

    it('should throw NotFoundError for deleted user', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(getProfile(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('User not found');
    });
  });

  // ===================== UPDATE PROFILE =====================
  describe('updateProfile', () => {
    it('should update name and company', async () => {
      mockRequest.body = { name: 'Updated Name', company: 'New Corp' };
      const updatedRow = {
        id: 'user-123', email: 'test@example.com', name: 'Updated Name',
        company: 'New Corp', role: 'owner', created_at: new Date(), updated_at: new Date(),
      };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit log

      await updateProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ name: 'Updated Name', company: 'New Corp' }),
      });
    });

    it('should throw NotFoundError when user missing', async () => {
      mockRequest.body = { name: 'X' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(updateProfile(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('User not found');
    });
  });

  // ===================== CHANGE PASSWORD =====================
  describe('changePassword', () => {
    it('should change password with correct current password', async () => {
      mockRequest.body = { currentPassword: 'oldPass', newPassword: 'newPass123!' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ password_hash: 'old-hash' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit
      mockCompare.mockResolvedValue(true);

      await changePassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({ success: true, message: 'Password changed successfully' });
    });

    it('should reject wrong current password', async () => {
      mockRequest.body = { currentPassword: 'wrong', newPassword: 'new' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ password_hash: 'h' }], rowCount: 1 });
      mockCompare.mockResolvedValue(false);

      await expect(changePassword(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Current password is incorrect');
    });
  });

  // ===================== GET USERS =====================
  describe('getUsers', () => {
    it('should return paginated user list', async () => {
      mockRequest.query = { page: '1', limit: '10' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            { id: 'u1', email: 'a@b.com', name: 'A', company: 'C', role: 'owner', is_active: true, created_at: new Date(), last_login: null },
            { id: 'u2', email: 'x@y.com', name: 'X', company: 'Y', role: 'viewer', is_active: true, created_at: new Date(), last_login: null },
          ],
          rowCount: 2,
        });

      await getUsers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        pagination: expect.objectContaining({ total: 2 }),
      });
    });

    it('should filter by role', async () => {
      mockRequest.query = { role: 'auditor' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await getUsers(mockRequest as Request, mockResponse as Response);

      const countCall = (mockDb.query as jest.Mock).mock.calls[0];
      expect(countCall[0]).toContain('role = $1');
    });

    it('should search by name or email', async () => {
      mockRequest.query = { search: 'admin' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'admin@test.com', name: 'Admin', company: null, role: 'owner', is_active: true, created_at: new Date(), last_login: null }], rowCount: 1 });

      await getUsers(mockRequest as Request, mockResponse as Response);

      const countCall = (mockDb.query as jest.Mock).mock.calls[0];
      expect(countCall[0]).toContain('ILIKE');
      expect(countCall[1]).toContain('%admin%');
    });
  });

  // ===================== UPDATE USER (ADMIN) =====================
  describe('updateUser', () => {
    it('should update user role and active status', async () => {
      mockRequest.params = { id: 'user-2' };
      mockRequest.body = { role: 'editor', isActive: true };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'user-2', email: 'u@t.com', name: 'U', company: null, role: 'editor', is_active: true, created_at: new Date(), updated_at: new Date() }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await updateUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ role: 'editor' }),
      });
    });

    it('should throw NotFoundError for non-existent user', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockRequest.body = { role: 'viewer' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(updateUser(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('User not found');
    });
  });

  // ===================== REFRESH TOKEN =====================
  describe('refreshToken', () => {
    it('should return new access token', async () => {
      await refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { token: 'new-access-token' },
      });
    });
  });

  // ===================== GET CURRENT USER =====================
  describe('getCurrentUser', () => {
    it('should return current user data', async () => {
      const userRow = {
        id: 'user-123', email: 'test@example.com', name: 'Test', company: 'Corp',
        role: 'owner', created_at: new Date(), updated_at: new Date(), last_login: new Date(),
      };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [userRow], rowCount: 1 });

      await getCurrentUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 'user-123', email: 'test@example.com' }),
      });
    });
  });
});
