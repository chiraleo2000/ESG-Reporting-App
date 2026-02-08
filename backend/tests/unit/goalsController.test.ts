/**
 * ESG Goals Controller Unit Tests
 * Tests CRUD operations, progress tracking, and summary endpoints
 */
import { Request, Response } from 'express';

// Mock database
jest.mock('../../src/config/database', () => ({
  db: {
    query: jest.fn(),
  },
  pool: {
    connect: jest.fn(),
  },
}));

// Mock redis
jest.mock('../../src/config/redis', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: {
      userProjects: (userId: string) => `user:${userId}:projects`,
      project: (projectId: string) => `project:${projectId}`,
    },
  },
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  cacheDel: jest.fn(),
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock helpers
jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('mock-goal-id'),
  roundTo: jest.fn((n: number, decimals: number) => Number(n.toFixed(decimals))),
}));

import { db } from '../../src/config/database';
import {
  createGoal,
  getGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  updateGoalProgress,
  getGoalsSummary,
  bulkUpdateProgress,
} from '../../src/controllers/goalsController';

const mockDb = db as jest.Mocked<typeof db>;

describe('ESG Goals Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        name: 'Test User',
      } as any,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  // =============================================
  // CREATE GOAL
  // =============================================
  describe('createGoal', () => {
    it('should create a new ESG goal successfully', async () => {
      mockRequest.params = { projectId: 'proj-1' };
      mockRequest.body = {
        name: 'Reduce Emissions 50%',
        description: 'Company-wide emissions reduction goal',
        category: 'emission_reduction',
        targetType: 'absolute',
        scope: 'all',
        baselineValue: 1000,
        baselineYear: 2023,
        targetValue: 500,
        targetYear: 2030,
        targetUnit: 'tCO2e',
        priority: 'high',
        sbtiAligned: true,
        parisAligned: true,
      };

      const mockGoalRow = {
        id: 'mock-goal-id',
        project_id: 'proj-1',
        name: 'Reduce Emissions 50%',
        description: 'Company-wide emissions reduction goal',
        category: 'emission_reduction',
        target_type: 'absolute',
        scope: 'all',
        baseline_value: '1000',
        baseline_year: 2023,
        target_value: '500',
        target_year: 2030,
        target_unit: 'tCO2e',
        current_value: '1000',
        progress_percentage: '0',
        estimated_cost: null,
        actual_cost: null,
        cost_currency: 'USD',
        estimated_savings: null,
        actual_savings: null,
        roi_percentage: null,
        status: 'active',
        priority: 'high',
        assigned_to: null,
        aligned_standards: [],
        sbti_aligned: true,
        paris_aligned: true,
        milestones: [],
        notes: null,
        metadata: {},
        created_by: 'user-123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock INSERT query (goal creation)
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockGoalRow], rowCount: 1 })
        // Mock audit log INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await createGoal(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'mock-goal-id',
          name: 'Reduce Emissions 50%',
          category: 'emission_reduction',
          targetType: 'absolute',
          baselineValue: 1000,
          targetValue: 500,
          status: 'active',
          priority: 'high',
          sbtiAligned: true,
          parisAligned: true,
        }),
      });
    });

    it('should reject goal creation without required fields', async () => {
      mockRequest.params = { projectId: 'proj-1' };
      mockRequest.body = { description: 'No name provided' };

      await expect(
        createGoal(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Name, baseline year, and target year are required');
    });

    it('should reject goal with target year before baseline year', async () => {
      mockRequest.params = { projectId: 'proj-1' };
      mockRequest.body = {
        name: 'Bad Goal',
        baselineYear: 2030,
        targetYear: 2023,
      };

      await expect(
        createGoal(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Target year must be after baseline year');
    });
  });

  // =============================================
  // GET GOALS
  // =============================================
  describe('getGoals', () => {
    it('should return paginated goals for a project', async () => {
      mockRequest.params = { projectId: 'proj-1' };
      mockRequest.query = { page: '1', limit: '10' };

      const mockGoals = [
        {
          id: 'goal-1', project_id: 'proj-1', name: 'Goal A',
          description: null, category: 'emission_reduction', target_type: 'absolute',
          scope: 'scope1', baseline_value: '100', baseline_year: 2023,
          target_value: '50', target_year: 2030, target_unit: 'tCO2e',
          current_value: '80', progress_percentage: '40',
          estimated_cost: null, actual_cost: null, cost_currency: 'USD',
          estimated_savings: null, actual_savings: null, roi_percentage: null,
          status: 'at_risk', priority: 'high', assigned_to: null,
          assigned_to_name: null, aligned_standards: [], sbti_aligned: false,
          paris_aligned: false, milestones: [], notes: null, metadata: {},
          created_by: 'user-1', created_by_name: 'Admin', created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: mockGoals, rowCount: 1 });

      await getGoals(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'goal-1', name: 'Goal A' }),
        ]),
        pagination: expect.objectContaining({
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        }),
      });
    });

    it('should filter goals by status', async () => {
      mockRequest.params = { projectId: 'proj-1' };
      mockRequest.query = { status: 'active' };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await getGoals(mockRequest as Request, mockResponse as Response);

      // Verify the WHERE clause includes status filter
      const countCall = (mockDb.query as jest.Mock).mock.calls[0];
      expect(countCall[0]).toContain('status = $2');
      expect(countCall[1]).toContain('active');
    });

    it('should filter goals by category and scope', async () => {
      mockRequest.params = { projectId: 'proj-1' };
      mockRequest.query = { category: 'energy_efficiency', scope: 'scope2' };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await getGoals(mockRequest as Request, mockResponse as Response);

      const countCall = (mockDb.query as jest.Mock).mock.calls[0];
      expect(countCall[0]).toContain('category = $2');
      expect(countCall[0]).toContain('scope = $3');
    });
  });

  // =============================================
  // GET SINGLE GOAL
  // =============================================
  describe('getGoal', () => {
    it('should return a single goal by ID', async () => {
      mockRequest.params = { projectId: 'proj-1', goalId: 'goal-1' };

      const mockGoal = {
        id: 'goal-1', project_id: 'proj-1', name: 'Test Goal',
        description: 'Test', category: 'emission_reduction', target_type: 'absolute',
        scope: 'all', baseline_value: '100', baseline_year: 2023,
        target_value: '50', target_year: 2030, target_unit: 'tCO2e',
        current_value: '75', progress_percentage: '50',
        estimated_cost: '10000', actual_cost: null, cost_currency: 'USD',
        estimated_savings: '5000', actual_savings: null, roi_percentage: null,
        status: 'on_track', priority: 'high', assigned_to: null,
        assigned_to_name: null, aligned_standards: ['eu_cbam'],
        sbti_aligned: true, paris_aligned: true, milestones: [],
        notes: null, metadata: {}, created_by: 'user-1',
        created_by_name: 'Admin', created_at: new Date(), updated_at: new Date(),
      };

      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockGoal], rowCount: 1,
      });

      await getGoal(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'goal-1',
          name: 'Test Goal',
          progressPercentage: 50,
          estimatedCost: 10000,
        }),
      });
    });

    it('should throw NotFoundError for non-existent goal', async () => {
      mockRequest.params = { projectId: 'proj-1', goalId: 'nonexistent' };

      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        getGoal(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('ESG goal not found');
    });
  });

  // =============================================
  // UPDATE GOAL
  // =============================================
  describe('updateGoal', () => {
    it('should update goal fields', async () => {
      mockRequest.params = { projectId: 'proj-1', goalId: 'goal-1' };
      mockRequest.body = { name: 'Updated Goal', status: 'on_track', priority: 'high' };

      const updatedGoal = {
        id: 'goal-1', project_id: 'proj-1', name: 'Updated Goal',
        description: null, category: 'emission_reduction', target_type: 'absolute',
        scope: 'all', baseline_value: '100', baseline_year: 2023,
        target_value: '50', target_year: 2030, target_unit: 'tCO2e',
        current_value: '75', progress_percentage: '50',
        estimated_cost: null, actual_cost: null, cost_currency: 'USD',
        estimated_savings: null, actual_savings: null, roi_percentage: null,
        status: 'on_track', priority: 'high', assigned_to: null,
        aligned_standards: [], sbti_aligned: false, paris_aligned: false,
        milestones: [], notes: null, metadata: {},
        created_by: 'user-1', created_at: new Date(), updated_at: new Date(),
      };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [updatedGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit log

      await updateGoal(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ name: 'Updated Goal', status: 'on_track' }),
      });
    });

    it('should reject update with no valid fields', async () => {
      mockRequest.params = { projectId: 'proj-1', goalId: 'goal-1' };
      mockRequest.body = { invalidField: 'nope' };

      await expect(
        updateGoal(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('No valid fields to update');
    });

    it('should throw NotFoundError when goal does not exist', async () => {
      mockRequest.params = { projectId: 'proj-1', goalId: 'nonexistent' };
      mockRequest.body = { name: 'Won\'t work' };

      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        updateGoal(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('ESG goal not found');
    });

    it('should auto-calculate progress when currentValue is updated', async () => {
      mockRequest.params = { projectId: 'proj-1', goalId: 'goal-1' };
      mockRequest.body = { currentValue: 60 };

      const updatedGoal = {
        id: 'goal-1', project_id: 'proj-1', name: 'Test Goal',
        description: null, category: 'emission_reduction', target_type: 'absolute',
        scope: 'all', baseline_value: '100', baseline_year: 2023,
        target_value: '50', target_year: 2030, target_unit: 'tCO2e',
        current_value: '60', progress_percentage: '80',
        estimated_cost: null, actual_cost: null, cost_currency: 'USD',
        estimated_savings: null, actual_savings: null, roi_percentage: null,
        status: 'on_track', priority: 'medium', assigned_to: null,
        aligned_standards: [], sbti_aligned: false, paris_aligned: false,
        milestones: [], notes: null, metadata: {},
        created_by: 'user-1', created_at: new Date(), updated_at: new Date(),
      };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [updatedGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await updateGoal(mockRequest as Request, mockResponse as Response);

      // Verify the UPDATE SQL includes progress_percentage CASE expression
      const updateCall = (mockDb.query as jest.Mock).mock.calls[0];
      expect(updateCall[0]).toContain('progress_percentage');
      expect(updateCall[0]).toContain('CASE');
    });
  });

  // =============================================
  // DELETE GOAL
  // =============================================
  describe('deleteGoal', () => {
    it('should delete a goal successfully', async () => {
      mockRequest.params = { projectId: 'proj-1', goalId: 'goal-1' };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'goal-1', name: 'Test Goal' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit log

      await deleteGoal(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'ESG goal deleted successfully',
      });
    });

    it('should throw NotFoundError for non-existent goal', async () => {
      mockRequest.params = { projectId: 'proj-1', goalId: 'nonexistent' };

      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        deleteGoal(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('ESG goal not found');
    });
  });

  // =============================================
  // UPDATE GOAL PROGRESS
  // =============================================
  describe('updateGoalProgress', () => {
    it('should calculate and update progress from emissions data', async () => {
      mockRequest.params = { projectId: 'proj-1', goalId: 'goal-1' };

      const mockGoal = {
        id: 'goal-1', scope: 'scope1', target_unit: 'tCO2e',
        baseline_value: '100', target_value: '50', target_type: 'absolute',
        status: 'active',
      };

      (mockDb.query as jest.Mock)
        // Get goal
        .mockResolvedValueOnce({ rows: [mockGoal], rowCount: 1 })
        // Get current emissions (75000 kg = 75 tonnes)
        .mockResolvedValueOnce({ rows: [{ total: '75000' }], rowCount: 1 })
        // Update goal
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        // Audit log
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await updateGoalProgress(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          goalId: 'goal-1',
          currentValue: 75,
          baselineValue: 100,
          targetValue: 50,
        }),
      });
    });

    it('should throw NotFoundError for non-existent goal', async () => {
      mockRequest.params = { projectId: 'proj-1', goalId: 'nonexistent' };

      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        updateGoalProgress(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('ESG goal not found');
    });

    it('should filter emissions by scope when goal has specific scope', async () => {
      mockRequest.params = { projectId: 'proj-1', goalId: 'goal-1' };

      const mockGoal = {
        id: 'goal-1', scope: 'scope2', target_unit: 'tCO2e',
        baseline_value: '200', target_value: '100', target_type: 'absolute',
        status: 'active',
      };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total: '150000' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await updateGoalProgress(mockRequest as Request, mockResponse as Response);

      // Verify scope filter was added to emissions query
      const emissionsCall = (mockDb.query as jest.Mock).mock.calls[1];
      expect(emissionsCall[0]).toContain('scope = $2');
      expect(emissionsCall[1]).toContain('scope2');
    });

    it('should handle percentage target type correctly', async () => {
      mockRequest.params = { projectId: 'proj-1', goalId: 'goal-1' };

      const mockGoal = {
        id: 'goal-1', scope: 'all', target_unit: 'tCO2e',
        baseline_value: '100', target_value: '30', target_type: 'percentage',
        status: 'active',
      };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total: '80000' }], rowCount: 1 }) // 80t
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await updateGoalProgress(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          goalId: 'goal-1',
          currentValue: 80,
        }),
      });
    });
  });

  // =============================================
  // GOALS SUMMARY
  // =============================================
  describe('getGoalsSummary', () => {
    it('should return comprehensive summary for a project', async () => {
      mockRequest.params = { projectId: 'proj-1' };

      (mockDb.query as jest.Mock)
        // Status summary
        .mockResolvedValueOnce({
          rows: [
            { status: 'active', count: '3', avg_progress: '25.5' },
            { status: 'on_track', count: '2', avg_progress: '72.0' },
          ],
          rowCount: 2,
        })
        // Category summary
        .mockResolvedValueOnce({
          rows: [{ category: 'emission_reduction', count: '4', avg_progress: '45.0' }],
          rowCount: 1,
        })
        // Scope summary
        .mockResolvedValueOnce({
          rows: [
            { scope: 'scope1', count: '2', avg_progress: '30.0' },
            { scope: 'scope2', count: '3', avg_progress: '55.0' },
          ],
          rowCount: 2,
        })
        // Financial summary
        .mockResolvedValueOnce({
          rows: [{
            cost_currency: 'USD',
            total_estimated_cost: '50000',
            total_actual_cost: '25000',
            total_estimated_savings: '100000',
            total_actual_savings: '40000',
          }],
          rowCount: 1,
        })
        // Overall summary
        .mockResolvedValueOnce({
          rows: [{
            total_goals: '5',
            avg_progress: '42.5',
            achieved: '0',
            on_track: '2',
            at_risk: '1',
            behind: '2',
            sbti_aligned: '3',
            paris_aligned: '2',
          }],
          rowCount: 1,
        });

      await getGoalsSummary(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          overall: expect.objectContaining({
            totalGoals: 5,
            averageProgress: 42.5,
            onTrack: 2,
            atRisk: 1,
            behind: 2,
            sbtiAligned: 3,
            parisAligned: 2,
          }),
          byStatus: expect.arrayContaining([
            expect.objectContaining({ status: 'active', count: 3 }),
          ]),
          byCategory: expect.arrayContaining([
            expect.objectContaining({ category: 'emission_reduction', count: 4 }),
          ]),
          byScope: expect.arrayContaining([
            expect.objectContaining({ scope: 'scope1', count: 2 }),
          ]),
          financial: expect.arrayContaining([
            expect.objectContaining({
              currency: 'USD',
              estimatedCost: 50000,
              actualCost: 25000,
            }),
          ]),
        },
      });
    });
  });

  // =============================================
  // BULK UPDATE PROGRESS
  // =============================================
  describe('bulkUpdateProgress', () => {
    it('should update progress for all active goals', async () => {
      mockRequest.params = { projectId: 'proj-1' };

      const mockGoals = [
        {
          id: 'goal-1', name: 'Goal A', scope: 'scope1',
          target_unit: 'tCO2e', baseline_value: '100', target_value: '50',
          target_type: 'absolute', status: 'active',
        },
        {
          id: 'goal-2', name: 'Goal B', scope: 'all',
          target_unit: 'tCO2e', baseline_value: '200', target_value: '100',
          target_type: 'absolute', status: 'active',
        },
      ];

      (mockDb.query as jest.Mock)
        // Get active goals
        .mockResolvedValueOnce({ rows: mockGoals, rowCount: 2 })
        // Goal 1: emissions query
        .mockResolvedValueOnce({ rows: [{ total: '70000' }], rowCount: 1 })
        // Goal 1: update
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        // Goal 2: emissions query
        .mockResolvedValueOnce({ rows: [{ total: '150000' }], rowCount: 1 })
        // Goal 2: update
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        // Audit log
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await bulkUpdateProgress(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          summary: expect.objectContaining({
            total: 2,
            updated: 2,
            failed: 0,
          }),
        }),
      });
    });

    it('should handle errors for individual goals gracefully', async () => {
      mockRequest.params = { projectId: 'proj-1' };

      const mockGoals = [
        {
          id: 'goal-1', name: 'Goal A', scope: 'scope1',
          target_unit: 'tCO2e', baseline_value: '100', target_value: '50',
          target_type: 'absolute', status: 'active',
        },
      ];

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockGoals, rowCount: 1 })
        // Emissions query fails
        .mockRejectedValueOnce(new Error('DB query failed'))
        // Audit log
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await bulkUpdateProgress(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ id: 'goal-1', error: 'DB query failed' }),
          ]),
          summary: expect.objectContaining({ total: 1, updated: 0, failed: 1 }),
        }),
      });
    });

    it('should skip cancelled and achieved goals', async () => {
      mockRequest.params = { projectId: 'proj-1' };

      // Returns no goals (all are cancelled/achieved)
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit log

      await bulkUpdateProgress(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          summary: expect.objectContaining({ total: 0, updated: 0, failed: 0 }),
        }),
      });
    });
  });
});
