/**
 * Activity Controller Unit Tests
 * Tests CRUD, bulk operations, scope filtering, summary, export
 */
import { Request, Response } from 'express';

jest.mock('../../src/config/database', () => ({
  db: {
    query: jest.fn(),
    transaction: jest.fn(async (fn: any) => {
      const client = { query: jest.fn() };
      return fn(client);
    }),
  },
  pool: { connect: jest.fn() },
}));

jest.mock('../../src/config/redis', () => ({
  redisClient: {
    get: jest.fn(), set: jest.fn(), del: jest.fn().mockResolvedValue(1),
    keys: {
      projectActivities: (id: string) => `project:${id}:activities`,
      userProjects: (id: string) => `user:${id}:projects`,
      project: (id: string) => `project:${id}`,
    },
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('mock-activity-id'),
  convertUnits: jest.fn((val: number) => val),
}));

import { db } from '../../src/config/database';
import {
  createActivity, getActivities, getActivity, updateActivity,
  deleteActivity, bulkCreateActivities, bulkDeleteActivities,
  getActivitiesByScope, getActivitySummary, exportActivities,
  createActivityForProject,
} from '../../src/controllers/activityController';

const mockDb = db as jest.Mocked<typeof db>;

const makeActivityRow = (overrides: any = {}) => ({
  id: 'act-1', project_id: 'proj-1', name: 'Diesel Generator',
  description: null, scope: 'scope1', scope3_category: null,
  activity_type: 'stationary_combustion', activity_data: 5000,
  activity_unit: 'liters', quantity: '5000', unit: 'liters',
  source: 'IPCC', tier_level: 'tier1', tier_direction: 'both',
  data_source: 'invoice', data_quality_score: 'high',
  calculation_status: 'pending', total_emissions_kg_co2e: null,
  emission_factor_used: null, metadata: null,
  created_at: new Date(), updated_at: new Date(),
  ...overrides,
});

describe('Activity Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {}, params: { projectId: 'proj-1' }, query: {},
      user: { id: 'user-1', userId: 'user-1', email: 'a@b.com', role: 'editor', name: 'Ed', signatureAuthorized: false } as any,
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), setHeader: jest.fn(), send: jest.fn() };
  });

  // ===================== CREATE ACTIVITY =====================
  describe('createActivity', () => {
    it('should create a new activity', async () => {
      req.body = { name: 'Diesel Gen', scope: 'scope1', activityType: 'stationary_combustion', quantity: 5000, unit: 'liters', year: 2025 };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [makeActivityRow()], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await createActivity(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ name: 'Diesel Generator', scope: 'scope1' }),
      });
    });

    it('should require scope3Category for scope3 activities', async () => {
      req.body = { name: 'Transport', scope: 'scope3', activityType: 'upstream_transport', quantity: 100, unit: 'tonne-km' };

      await expect(createActivity(req as Request, res as Response))
        .rejects.toThrow('scope3Category is required for Scope 3 activities');
    });

    it('should allow scope3 activity with category', async () => {
      req.body = { name: 'Transport', scope: 'scope3', scope3Category: 'upstream_transport', activityType: 'upstream_transport', quantity: 100, unit: 'tonne-km' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [makeActivityRow({ scope: 'scope3', scope3_category: 'upstream_transport' })], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await createActivity(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ===================== GET ACTIVITIES =====================
  describe('getActivities', () => {
    it('should return paginated activities', async () => {
      req.query = { page: '1', limit: '10' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [makeActivityRow(), makeActivityRow({ id: 'act-2', name: 'Electricity' })], rowCount: 2 });

      await getActivities(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        pagination: expect.objectContaining({ total: 2 }),
      });
    });

    it('should filter by scope', async () => {
      req.query = { scope: 'scope2' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await getActivities(req as Request, res as Response);

      const countCall = (mockDb.query as jest.Mock).mock.calls[0];
      expect(countCall[0]).toContain('scope = $2');
    });

    it('should filter by search term', async () => {
      req.query = { search: 'diesel' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [makeActivityRow()], rowCount: 1 });

      await getActivities(req as Request, res as Response);

      const countCall = (mockDb.query as jest.Mock).mock.calls[0];
      expect(countCall[0]).toContain('ILIKE');
    });
  });

  // ===================== GET SINGLE ACTIVITY =====================
  describe('getActivity', () => {
    it('should return activity with precursors', async () => {
      req.params = { projectId: 'proj-1', activityId: 'act-1' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [makeActivityRow()], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // precursors

      await getActivity(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 'act-1', precursors: [] }),
      });
    });

    it('should throw NotFoundError for missing activity', async () => {
      req.params = { projectId: 'proj-1', activityId: 'nonexistent' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(getActivity(req as Request, res as Response))
        .rejects.toThrow('Activity not found');
    });
  });

  // ===================== UPDATE ACTIVITY =====================
  describe('updateActivity', () => {
    it('should update activity fields', async () => {
      req.params = { projectId: 'proj-1', activityId: 'act-1' };
      req.body = { name: 'Updated', quantity: 3000 };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [makeActivityRow({ name: 'Updated', quantity: '3000' })], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await updateActivity(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ name: 'Updated' }),
      });
    });

    it('should reject update with no valid fields', async () => {
      req.params = { projectId: 'proj-1', activityId: 'act-1' };
      req.body = { invalidField: 'nope' };

      await expect(updateActivity(req as Request, res as Response))
        .rejects.toThrow('No valid fields to update');
    });

    it('should throw NotFoundError for non-existent activity', async () => {
      req.params = { projectId: 'proj-1', activityId: 'nonexistent' };
      req.body = { name: 'Test' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(updateActivity(req as Request, res as Response))
        .rejects.toThrow('Activity not found');
    });

    it('should reset calculation status when quantity changes', async () => {
      req.params = { projectId: 'proj-1', activityId: 'act-1' };
      req.body = { quantity: 9999 };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [makeActivityRow({ quantity: '9999', calculation_status: 'pending' })], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await updateActivity(req as Request, res as Response);

      const updateCall = (mockDb.query as jest.Mock).mock.calls[0];
      expect(updateCall[0]).toContain("calculation_status = 'pending'");
    });
  });

  // ===================== DELETE ACTIVITY =====================
  describe('deleteActivity', () => {
    it('should delete an activity', async () => {
      req.params = { projectId: 'proj-1', activityId: 'act-1' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'act-1', name: 'Diesel' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await deleteActivity(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Activity deleted successfully' });
    });

    it('should throw NotFoundError for non-existent activity', async () => {
      req.params = { projectId: 'proj-1', activityId: 'gone' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(deleteActivity(req as Request, res as Response))
        .rejects.toThrow('Activity not found');
    });
  });

  // ===================== BULK CREATE =====================
  describe('bulkCreateActivities', () => {
    it('should bulk create activities', async () => {
      req.body = {
        activities: [
          { name: 'Act1', scope: 'scope1', activityType: 'stationary_combustion', quantity: 100, unit: 'liters' },
          { name: 'Act2', scope: 'scope2', activityType: 'purchased_electricity', quantity: 500, unit: 'kWh' },
        ],
      };

      // Mock the transaction to call the function with a mock client
      (mockDb.transaction as jest.Mock).mockImplementation(async (fn: any) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [makeActivityRow({ name: 'Act1' })], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [makeActivityRow({ id: 'act-2', name: 'Act2', scope: 'scope2' })], rowCount: 1 }),
        };
        return fn(client);
      });
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 }); // audit

      await bulkCreateActivities(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          summary: expect.objectContaining({ total: 2, created: 2, failed: 0 }),
        }),
      });
    });

    it('should reject empty activities array', async () => {
      req.body = { activities: [] };
      await expect(bulkCreateActivities(req as Request, res as Response))
        .rejects.toThrow('Activities array is required');
    });
  });

  // ===================== BULK DELETE =====================
  describe('bulkDeleteActivities', () => {
    it('should bulk delete activities', async () => {
      req.body = { activityIds: ['act-1', 'act-2'] };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'act-1' }, { id: 'act-2' }], rowCount: 2 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await bulkDeleteActivities(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { deleted: 2, requested: 2 },
      });
    });

    it('should reject empty IDs array', async () => {
      req.body = { activityIds: [] };
      await expect(bulkDeleteActivities(req as Request, res as Response))
        .rejects.toThrow('Activity IDs array is required');
    });
  });

  // ===================== ACTIVITIES BY SCOPE =====================
  describe('getActivitiesByScope', () => {
    it('should return activities filtered by scope', async () => {
      req.query = { scope: 'scope1' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [makeActivityRow()], rowCount: 1 });

      await getActivitiesByScope(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([expect.objectContaining({ scope: 'scope1' })]),
      });
    });

    it('should require scope parameter', async () => {
      req.query = {};
      await expect(getActivitiesByScope(req as Request, res as Response))
        .rejects.toThrow('Scope parameter is required');
    });
  });

  // ===================== ACTIVITY SUMMARY =====================
  describe('getActivitySummary', () => {
    it('should return summary grouped by scope, category, and tier', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ scope: 'scope1', total_count: '5', calculated_count: '3', pending_count: '2', error_count: '0', total_emissions: '1000' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ scope3_category: 'purchased_goods', total_count: '2', total_emissions: '500' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ tier_level: 'tier1', tier_direction: 'both', count: '5' }], rowCount: 1 });

      await getActivitySummary(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          byScope: expect.any(Array),
          byCategory: expect.any(Array),
          tierDistribution: expect.any(Array),
        }),
      });
    });
  });

  // ===================== CREATE FOR PROJECT =====================
  describe('createActivityForProject', () => {
    it('should verify project exists before creating', async () => {
      req.body = { name: 'Test', scope: 'scope1', activityType: 'mobile_combustion', quantity: 100, unit: 'km' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'proj-1' }], rowCount: 1 }) // project check
        .mockResolvedValueOnce({ rows: [makeActivityRow({ name: 'Test' })], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await createActivityForProject(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should throw NotFoundError for missing project', async () => {
      req.body = { name: 'Test', scope: 'scope1', activityType: 'mobile_combustion', quantity: 100, unit: 'km' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(createActivityForProject(req as Request, res as Response))
        .rejects.toThrow('Project not found');
    });
  });

  // ===================== EXPORT ACTIVITIES =====================
  describe('exportActivities', () => {
    it('should export activities as CSV', async () => {
      req.query = { format: 'csv' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [makeActivityRow()],
        rowCount: 1,
      });

      await exportActivities(req as Request, res as Response);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.send).toHaveBeenCalled();
    });

    it('should export as JSON when format is not csv', async () => {
      req.query = { format: 'json' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [makeActivityRow()], rowCount: 1 });

      await exportActivities(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        exportedAt: expect.any(String),
        total: 1,
      });
    });
  });
});
