/**
 * Validation Middleware Unit Tests
 */
import { z } from 'zod';

// Import validation schemas
import {
  registerSchema,
  loginSchema,
  createProjectSchema,
  updateProjectSchema,
  createActivitySchema,
  updateActivitySchema,
} from '../../src/middleware/validation';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate a valid registration request', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        organization: 'Test Company',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Password123!',
        name: 'Test User',
        organization: 'Test Company',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
        organization: 'Test Company',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123!',
        organization: 'Test Company',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate a valid login request', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing email', () => {
      const invalidData = {
        password: 'Password123!',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const invalidData = {
        email: 'test@example.com',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createProjectSchema', () => {
    it('should validate a valid project creation request', () => {
      const validData = {
        name: 'Test Project',
        description: 'A test project description',
        baselineYear: 2024,
        reportingYear: 2025,
        reportingStandards: ['eu_cbam'],
      };

      const result = createProjectSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        name: 'Test Project',
      };

      const result = createProjectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid baseline year', () => {
      const invalidData = {
        name: 'Test Project',
        baselineYear: 2026,
        reportingYear: 2025, // baseline > reporting
        reportingStandards: ['eu_cbam'],
      };

      const result = createProjectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createActivitySchema', () => {
    it('should validate a valid activity creation request', () => {
      const validData = {
        name: 'Electricity Usage',
        description: 'Monthly electricity consumption',
        scope: 'scope2',
        activityType: 'stationary_combustion',
        quantity: 1000,
        unit: 'kWh',
      };

      const result = createActivitySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid scope', () => {
      const invalidData = {
        name: 'Test Activity',
        scope: 'scope5', // Invalid scope
        activityType: 'stationary_combustion',
        quantity: 1000,
        unit: 'kWh',
      };

      const result = createActivitySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject zero quantity', () => {
      const invalidData = {
        name: 'Test Activity',
        scope: 'scope1',
        activityType: 'stationary_combustion',
        quantity: 0, // Must be positive
        unit: 'kWh',
      };

      const result = createActivitySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateActivitySchema', () => {
    it('should validate partial updates', () => {
      const validData = {
        quantity: 2000,
      };

      const result = updateActivitySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow empty update', () => {
      const validData = {};

      const result = updateActivitySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
