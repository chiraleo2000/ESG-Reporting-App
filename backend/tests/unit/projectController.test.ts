/**
 * Project Controller Unit Tests
 * Tests CRUD, members, summary, clone, comparison, calc history, reports
 */
import { Request, Response } from 'express';

jest.mock('../../src/config/database', () => ({
  db: { query: jest.fn() },
  pool: { connect: jest.fn() },
}));

jest.mock('../../src/config/redis', () => ({
  redisClient: {
    get: jest.fn(), set: jest.fn(), del: jest.fn(),
    keys: {
      project: (id: string) => `project:${id}`,
      userProjects: (id: string) => `userProjects:${id}`,
    },
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('mock-proj-id'),
}));

import { db } from '../../src/config/database';
import { redisClient as redis } from '../../src/config/redis';
import {
  createProject, getProjects, getProject, updateProject, deleteProject,
  addProjectMember, updateProjectMember, removeProjectMember,
  getProjectSummary, cloneProject, getProjectComparison,
  getCalculationHistory, getProjectReports,
} from '../../src/controllers/projectController';

const mockDb = db as jest.Mocked<typeof db>;

const mockProject = {
  id: 'proj-1', name: 'Sugar Factory', description: 'Test', organization: 'Corp',
  company: 'Corp', industry: 'manufacturing', country: 'TH', region: 'SEA',
  facility_name: 'Plant A', facility_location: 'Bangkok',
  reporting_standards: ['eu_cbam'], default_standard: 'eu_cbam',
  baseline_year: 2024, reporting_year: 2025, status: 'active',
  standards: ['eu_cbam'], settings: {},
  created_by: 'user-1', created_at: new Date(), updated_at: new Date(),
};

describe('Project Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {}, params: { id: 'proj-1' }, query: {},
      user: { id: 'user-1', userId: 'user-1', email: 'a@b.com', role: 'owner', name: 'Test', signatureAuthorized: false } as any,
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), setHeader: jest.fn(), send: jest.fn() };
  });

  // ===================== CREATE PROJECT =====================
  describe('createProject', () => {
    it('should create a new project and add owner member', async () => {
      req.body = { name: 'New Proj', baselineYear: 2024, reportingYear: 2025, reportingStandards: ['eu_cbam'] };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockProject], rowCount: 1 }) // INSERT project
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT member
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await createProject(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ name: 'Sugar Factory' }),
      });
      expect(redis.del).toHaveBeenCalled();
    });

    it('should set optional fields to null', async () => {
      req.body = { name: 'Min', baselineYear: 2024, reportingYear: 2025 };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ ...mockProject, description: null, organization: null }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await createProject(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ===================== GET PROJECTS =====================
  describe('getProjects', () => {
    it('should return paginated projects', async () => {
      req.query = { page: '1', limit: '10' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockProject, { ...mockProject, id: 'proj-2' }], rowCount: 2 });

      await getProjects(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        pagination: expect.objectContaining({ page: 1, limit: 10, total: 2 }),
      });
    });

    it('should filter by status and search', async () => {
      req.query = { status: 'active', search: 'sugar' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockProject], rowCount: 1 });

      await getProjects(req as Request, res as Response);

      const queryCall = (mockDb.query as jest.Mock).mock.calls[0][0];
      expect(queryCall).toContain('status');
      expect(queryCall).toContain('ILIKE');
    });
  });

  // ===================== GET SINGLE PROJECT =====================
  describe('getProject', () => {
    it('should return project with members and activity summary', async () => {
      (req as any).project = mockProject;
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'a@b.com', name: 'Test', role: 'owner' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ scope: 'scope1', count: '5', calculated_count: '3' }], rowCount: 1 });

      await getProject(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          members: expect.any(Array),
          activitySummary: expect.any(Object),
        }),
      });
    });
  });

  // ===================== UPDATE PROJECT =====================
  describe('updateProject', () => {
    it('should update project fields', async () => {
      req.body = { name: 'Updated Name' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ ...mockProject, name: 'Updated Name' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await updateProject(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ name: 'Updated Name' }),
      });
      expect(redis.del).toHaveBeenCalled();
    });

    it('should throw NotFoundError', async () => {
      req.body = { name: 'X' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(updateProject(req as Request, res as Response))
        .rejects.toThrow('Project not found');
    });
  });

  // ===================== DELETE PROJECT =====================
  describe('deleteProject', () => {
    it('should soft-delete project (archive)', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 }) // member check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE archive
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await deleteProject(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Project deleted successfully' });
    });

    it('should reject non-owner', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ role: 'editor' }], rowCount: 1 });

      await expect(deleteProject(req as Request, res as Response))
        .rejects.toThrow('Only project owner can delete a project');
    });

    it('should reject non-member', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(deleteProject(req as Request, res as Response))
        .rejects.toThrow('Only project owner can delete a project');
    });
  });

  // ===================== ADD MEMBER =====================
  describe('addProjectMember', () => {
    it('should add a new member', async () => {
      req.body = { email: 'new@user.com', role: 'editor' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'user-2', email: 'new@user.com', name: 'New' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // not already member
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await addProjectMember(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ email: 'new@user.com', role: 'editor' }),
      });
    });

    it('should reject duplicate member', async () => {
      req.body = { email: 'existing@user.com' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'user-2', email: 'existing@user.com', name: 'Dup' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'member-1' }], rowCount: 1 }); // already member

      await expect(addProjectMember(req as Request, res as Response))
        .rejects.toThrow('User is already a member of this project');
    });

    it('should reject unknown email', async () => {
      req.body = { email: 'ghost@test.com' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(addProjectMember(req as Request, res as Response))
        .rejects.toThrow('User not found with this email');
    });
  });

  // ===================== UPDATE MEMBER =====================
  describe('updateProjectMember', () => {
    it('should update member role', async () => {
      req.params = { id: 'proj-1', memberId: 'user-2' };
      req.body = { role: 'editor' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ role: 'viewer' }], rowCount: 1 }) // existing
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await updateProjectMember(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Member role updated successfully' });
    });

    it('should reject changing owner role', async () => {
      req.params = { id: 'proj-1', memberId: 'user-1' };
      req.body = { role: 'editor' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 });

      await expect(updateProjectMember(req as Request, res as Response))
        .rejects.toThrow('Cannot change owner role');
    });

    it('should throw NotFoundError for unknown member', async () => {
      req.params = { id: 'proj-1', memberId: 'ghost' };
      req.body = { role: 'editor' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(updateProjectMember(req as Request, res as Response))
        .rejects.toThrow('Member not found');
    });
  });

  // ===================== REMOVE MEMBER =====================
  describe('removeProjectMember', () => {
    it('should remove a member', async () => {
      req.params = { id: 'proj-1', memberId: 'user-2' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ role: 'editor' }], rowCount: 1 }) // existing
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await removeProjectMember(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Member removed successfully' });
    });

    it('should reject removing owner', async () => {
      req.params = { id: 'proj-1', memberId: 'user-1' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 });

      await expect(removeProjectMember(req as Request, res as Response))
        .rejects.toThrow('Cannot remove project owner');
    });
  });

  // ===================== PROJECT SUMMARY =====================
  describe('getProjectSummary', () => {
    it('should return emissions and report summary', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ scope: 'scope1', total_emissions: '5000', activity_count: '3' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // scope3 categories
        .mockResolvedValueOnce({ rows: [{ type: 'CFP', total: '8500' }, { type: 'CFO', total: '10500' }], rowCount: 2 })
        .mockResolvedValueOnce({ rows: [{ standard: 'eu_cbam', status: 'generated', count: '1' }], rowCount: 1 });

      await getProjectSummary(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          emissionsByScope: expect.any(Object),
          emissionsByCategory: expect.any(Array),
          cfpCfoTotals: expect.any(Object),
          reportStatus: expect.any(Array),
        }),
      });
    });
  });

  // ===================== CLONE PROJECT =====================
  describe('cloneProject', () => {
    it('should clone project with activities', async () => {
      (req as any).project = mockProject;
      req.body = { name: 'Cloned', reportingYear: 2026, cloneActivities: true };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT project
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT member
        .mockResolvedValueOnce({ rows: [], rowCount: 5 }) // INSERT activities
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await cloneProject(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ message: 'Project cloned successfully' }),
      });
    });

    it('should clone without activities', async () => {
      (req as any).project = mockProject;
      req.body = { name: 'Clone' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT project
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT member
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await cloneProject(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ===================== PROJECT COMPARISON =====================
  describe('getProjectComparison', () => {
    it('should return comparison data when both years exist', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ baseline_year: 2024, reporting_year: 2025 }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            { reporting_year: 2024, cfo_total: '10000', scope1_emissions: '5000', scope2_location_emissions: '3000', scope3_upstream_emissions: '1000', scope3_downstream_emissions: '1000' },
            { reporting_year: 2025, cfo_total: '9000', scope1_emissions: '4000', scope2_location_emissions: '3000', scope3_upstream_emissions: '1000', scope3_downstream_emissions: '1000' },
          ],
          rowCount: 2,
        });

      await getProjectComparison(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          comparison: expect.objectContaining({
            change: expect.objectContaining({ direction: 'decrease' }),
          }),
          hasBaselineData: true,
          hasReportingData: true,
        }),
      });
    });

    it('should handle missing baseline data', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ baseline_year: 2024, reporting_year: 2025 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await getProjectComparison(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          comparison: null,
          hasBaselineData: false,
          hasReportingData: false,
        }),
      });
    });

    it('should throw NotFoundError for missing project', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(getProjectComparison(req as Request, res as Response))
        .rejects.toThrow('Project not found');
    });
  });

  // ===================== CALCULATION HISTORY =====================
  describe('getCalculationHistory', () => {
    it('should return CFP, CFO and audit history', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'cfp-1', product_name: 'Steel', cfp_total: '8500', cfp_per_unit: '85', created_at: new Date() }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'cfo-1', organization_name: 'Corp', reporting_year: 2025, cfo_total: '10500', created_at: new Date() }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'aud-1', action: 'CALCULATE', entity_type: 'activity', entity_id: 'act-1', details: {}, created_at: new Date() }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ cfp_count: '1', cfo_count: '1' }], rowCount: 1 });

      await getCalculationHistory(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          cfpHistory: expect.any(Array),
          cfoHistory: expect.any(Array),
          auditHistory: expect.any(Array),
        }),
        pagination: expect.any(Object),
      });
    });
  });

  // ===================== PROJECT REPORTS =====================
  describe('getProjectReports', () => {
    it('should return paginated reports', async () => {
      req.query = { page: '1', limit: '10' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            { id: 'rpt-1', standard: 'eu_cbam', format: 'pdf', status: 'generated', generated_by_name: 'Test', created_at: new Date(), updated_at: new Date(), validation_warnings: [], validation_errors: [], signed_at: null, signed_by: null },
            { id: 'rpt-2', standard: 'k_esg', format: 'json', status: 'signed', generated_by_name: 'Test', created_at: new Date(), updated_at: new Date(), validation_warnings: [], validation_errors: [], signed_at: new Date(), signed_by: 'user-1' },
          ],
          rowCount: 2,
        });

      await getProjectReports(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ standard: 'eu_cbam' }),
        ]),
        pagination: expect.objectContaining({ total: 2 }),
      });
    });

    it('should filter by standard and status', async () => {
      req.query = { standard: 'eu_cbam', status: 'generated' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'rpt-1', standard: 'eu_cbam', format: 'pdf', status: 'generated', generated_by_name: 'Test', created_at: new Date(), updated_at: new Date(), validation_warnings: [], validation_errors: [], signed_at: null, signed_by: null }], rowCount: 1 });

      await getProjectReports(req as Request, res as Response);

      const queryCall = (mockDb.query as jest.Mock).mock.calls[0][0];
      expect(queryCall).toContain('standard');
    });
  });
});
