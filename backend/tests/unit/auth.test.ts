/**
 * Auth Middleware Unit Tests
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock modules before importing
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

// Import after mocking
import { 
  hashPassword, 
  comparePassword,
  generateToken,
  generateTokens,
  verifyRefreshToken
} from '../../src/middleware/auth';

describe('Auth Middleware', () => {
  const mockSecret = 'test-jwt-secret-key-for-unit-testing-32chars';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'testPassword123';
      const hashedPassword = '$2a$12$hashedPasswordExample';
      
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      const result = await hashPassword(password);
      
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });

    it('should throw error on hash failure', async () => {
      const password = 'testPassword123';
      
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hash failed'));
      
      await expect(hashPassword(password)).rejects.toThrow('Hash failed');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'testPassword123';
      const hash = '$2a$12$hashedPasswordExample';
      
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      const result = await comparePassword(password, hash);
      
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'wrongPassword';
      const hash = '$2a$12$hashedPasswordExample';
      
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      const result = await comparePassword(password, hash);
      
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'editor' as const,
        name: 'Test User',
        company: 'Test Company',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const expectedToken = 'mock-jwt-token';
      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);
      
      const token = generateToken(user);
      
      expect(jwt.sign).toHaveBeenCalled();
      expect(token).toBe(expectedToken);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const payload = {
        id: 'user-123',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'editor' as const,
        signatureAuthorized: false
      };
      
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      
      const tokens = generateTokens(payload);
      
      expect(tokens.accessToken).toBe('access-token');
      expect(tokens.refreshToken).toBe('refresh-token');
      expect(jwt.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and decode a valid refresh token', () => {
      const mockDecoded = { userId: 'user-123', type: 'refresh' };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      
      const result = verifyRefreshToken('valid-refresh-token');
      
      expect(result).toEqual({ userId: 'user-123' });
    });

    it('should throw error for non-refresh token', () => {
      const mockDecoded = { userId: 'user-123', type: 'access' };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      
      expect(() => verifyRefreshToken('access-token')).toThrow('Invalid refresh token');
    });
  });
});
