import { Request, Response } from 'express';
import { db } from '../config/database';
import { redis } from '../config/redis';
import { generateId } from '../utils/helpers';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import type { Project, ProjectStatus, ReportStandard, AuditAction } from '../types';

// Audit log helper
async function logAudit(
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  details: object,
  projectId?: string
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, user_id, project_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [generateId(), userId, projectId || null, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
}

/**
 * Create a new project
 */
export async function createProject(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const {
    name,
    description,
    company,
    facilityName,
    facilityLocation,
    industry,
    reportingStandards,
    defaultStandard,
    baselineYear,
    reportingYear,
  } = req.body;

  const projectId = generateId();

  const result = await db.query(
    `INSERT INTO projects (
      id, name, description, company, facility_name, facility_location,
      industry, reporting_standards, default_standard, baseline_year, 
      reporting_year, owner_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      projectId,
      name,
      description || null,
      company,
      facilityName || null,
      facilityLocation || null,
      industry || null,
      JSON.stringify(reportingStandards),
      defaultStandard || reportingStandards[0],
      baselineYear,
      reportingYear,
      userId,
    ]
  );

  // Add owner as project member
  await db.query(
    `INSERT INTO project_members (id, project_id, user_id, role)
     VALUES ($1, $2, $3, $4)`,
    [generateId(), projectId, userId, 'owner']
  );

  // Audit log
  await logAudit(userId, 'CREATE', 'project', projectId, { name, company }, projectId);

  // Clear project cache
  await redis.del(redis.keys.userProjects(userId));

  const project = result.rows[0];

  res.status(201).json({
    success: true,
    data: {
      id: project.id,
      name: project.name,
      description: project.description,
      company: project.company,
      facilityName: project.facility_name,
      facilityLocation: project.facility_location,
      industry: project.industry,
      reportingStandards: project.reporting_standards,
      defaultStandard: project.default_standard,
      baselineYear: project.baseline_year,
      reportingYear: project.reporting_year,
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    },
  });
}

/**
 * Get all projects for the current user
 */
export async function getProjects(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { page = 1, limit = 20, status, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  // Check cache first
  const cacheKey = redis.keys.userProjects(userId);
  
  let whereClause = `WHERE pm.user_id = $1`;
  const params: any[] = [userId];
  let paramIndex = 2;

  if (status) {
    whereClause += ` AND p.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (search) {
    whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.company ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM projects p
     JOIN project_members pm ON p.id = pm.project_id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get projects
  params.push(Number(limit), offset);
  const result = await db.query(
    `SELECT p.*, pm.role as user_role
     FROM projects p
     JOIN project_members pm ON p.id = pm.project_id
     ${whereClause}
     ORDER BY p.updated_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  const projects = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    company: row.company,
    facilityName: row.facility_name,
    facilityLocation: row.facility_location,
    industry: row.industry,
    reportingStandards: row.reporting_standards,
    defaultStandard: row.default_standard,
    baselineYear: row.baseline_year,
    reportingYear: row.reporting_year,
    status: row.status,
    userRole: row.user_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  res.json({
    success: true,
    data: projects,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

/**
 * Get a single project by ID
 */
export async function getProject(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  // Project is already loaded by middleware
  const project = (req as any).project;

  // Get project members
  const membersResult = await db.query(
    `SELECT u.id, u.email, u.name, pm.role
     FROM project_members pm
     JOIN users u ON pm.user_id = u.id
     WHERE pm.project_id = $1`,
    [id]
  );

  // Get activity summary
  const activitySummary = await db.query(
    `SELECT 
       scope,
       COUNT(*) as count,
       SUM(CASE WHEN calculation_status = 'calculated' THEN 1 ELSE 0 END) as calculated_count
     FROM activities
     WHERE project_id = $1
     GROUP BY scope`,
    [id]
  );

  res.json({
    success: true,
    data: {
      id: project.id,
      name: project.name,
      description: project.description,
      company: project.company,
      facilityName: project.facility_name,
      facilityLocation: project.facility_location,
      industry: project.industry,
      reportingStandards: project.reporting_standards,
      defaultStandard: project.default_standard,
      baselineYear: project.baseline_year,
      reportingYear: project.reporting_year,
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      members: membersResult.rows,
      activitySummary: activitySummary.rows.reduce(
        (acc, row) => ({
          ...acc,
          [row.scope]: { total: parseInt(row.count), calculated: parseInt(row.calculated_count) },
        }),
        {}
      ),
    },
  });
}

/**
 * Update a project
 */
export async function updateProject(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const {
    name,
    description,
    company,
    facilityName,
    facilityLocation,
    industry,
    reportingStandards,
    defaultStandard,
    baselineYear,
    reportingYear,
    status,
  } = req.body;

  const result = await db.query(
    `UPDATE projects SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       company = COALESCE($3, company),
       facility_name = COALESCE($4, facility_name),
       facility_location = COALESCE($5, facility_location),
       industry = COALESCE($6, industry),
       reporting_standards = COALESCE($7, reporting_standards),
       default_standard = COALESCE($8, default_standard),
       baseline_year = COALESCE($9, baseline_year),
       reporting_year = COALESCE($10, reporting_year),
       status = COALESCE($11, status),
       updated_at = NOW()
     WHERE id = $12
     RETURNING *`,
    [
      name,
      description,
      company,
      facilityName,
      facilityLocation,
      industry,
      reportingStandards ? JSON.stringify(reportingStandards) : null,
      defaultStandard,
      baselineYear,
      reportingYear,
      status,
      id,
    ]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Project not found');
  }

  await logAudit(userId, 'UPDATE', 'project', id, req.body, id);

  // Clear caches
  await redis.del(redis.keys.project(id));
  await redis.del(redis.keys.userProjects(userId));

  const project = result.rows[0];

  res.json({
    success: true,
    data: {
      id: project.id,
      name: project.name,
      description: project.description,
      company: project.company,
      facilityName: project.facility_name,
      facilityLocation: project.facility_location,
      industry: project.industry,
      reportingStandards: project.reporting_standards,
      defaultStandard: project.default_standard,
      baselineYear: project.baseline_year,
      reportingYear: project.reporting_year,
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    },
  });
}

/**
 * Delete a project
 */
export async function deleteProject(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if user is owner
  const memberCheck = await db.query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [id, userId]
  );

  if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'owner') {
    throw new ForbiddenError('Only project owner can delete a project');
  }

  // Soft delete - set status to archived
  await db.query(
    `UPDATE projects SET status = 'archived', updated_at = NOW() WHERE id = $1`,
    [id]
  );

  await logAudit(userId, 'DELETE', 'project', id, {}, id);

  // Clear caches
  await redis.del(redis.keys.project(id));
  await redis.del(redis.keys.userProjects(userId));

  res.json({
    success: true,
    message: 'Project deleted successfully',
  });
}

/**
 * Add a member to a project
 */
export async function addProjectMember(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { email, role } = req.body;
  const userId = req.user!.id;

  // Find user by email
  const userResult = await db.query(
    `SELECT id, email, name FROM users WHERE email = $1`,
    [email]
  );

  if (userResult.rows.length === 0) {
    throw new NotFoundError('User not found with this email');
  }

  const newMember = userResult.rows[0];

  // Check if already a member
  const existingMember = await db.query(
    `SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [id, newMember.id]
  );

  if (existingMember.rows.length > 0) {
    throw new BadRequestError('User is already a member of this project');
  }

  // Add member
  await db.query(
    `INSERT INTO project_members (id, project_id, user_id, role)
     VALUES ($1, $2, $3, $4)`,
    [generateId(), id, newMember.id, role || 'viewer']
  );

  await logAudit(userId, 'ADD_MEMBER', 'project', id, { memberId: newMember.id, role }, id);

  res.status(201).json({
    success: true,
    data: {
      id: newMember.id,
      email: newMember.email,
      name: newMember.name,
      role: role || 'viewer',
    },
  });
}

/**
 * Update a project member's role
 */
export async function updateProjectMember(req: Request, res: Response): Promise<void> {
  const { id, memberId } = req.params;
  const { role } = req.body;
  const userId = req.user!.id;

  // Cannot change owner role
  const existingMember = await db.query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [id, memberId]
  );

  if (existingMember.rows.length === 0) {
    throw new NotFoundError('Member not found');
  }

  if (existingMember.rows[0].role === 'owner') {
    throw new BadRequestError('Cannot change owner role');
  }

  await db.query(
    `UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3`,
    [role, id, memberId]
  );

  await logAudit(userId, 'UPDATE_MEMBER', 'project', id, { memberId, role }, id);

  res.json({
    success: true,
    message: 'Member role updated successfully',
  });
}

/**
 * Remove a member from a project
 */
export async function removeProjectMember(req: Request, res: Response): Promise<void> {
  const { id, memberId } = req.params;
  const userId = req.user!.id;

  // Cannot remove owner
  const existingMember = await db.query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [id, memberId]
  );

  if (existingMember.rows.length === 0) {
    throw new NotFoundError('Member not found');
  }

  if (existingMember.rows[0].role === 'owner') {
    throw new BadRequestError('Cannot remove project owner');
  }

  await db.query(
    `DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [id, memberId]
  );

  await logAudit(userId, 'REMOVE_MEMBER', 'project', id, { memberId }, id);

  res.json({
    success: true,
    message: 'Member removed successfully',
  });
}

/**
 * Get project summary/dashboard data
 */
export async function getProjectSummary(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  // Get emissions summary by scope
  const emissionsByScope = await db.query(
    `SELECT 
       scope,
       SUM(total_emissions_kg_co2e) as total_emissions,
       COUNT(*) as activity_count
     FROM activities
     WHERE project_id = $1 AND calculation_status = 'calculated'
     GROUP BY scope`,
    [id]
  );

  // Get emissions by category (for Scope 3)
  const emissionsByCategory = await db.query(
    `SELECT 
       scope3_category,
       SUM(total_emissions_kg_co2e) as total_emissions,
       COUNT(*) as activity_count
     FROM activities
     WHERE project_id = $1 AND scope = 'scope3' AND calculation_status = 'calculated'
     GROUP BY scope3_category`,
    [id]
  );

  // Get CFP/CFO totals
  const cfpCfoTotals = await db.query(
    `SELECT 
       'CFP' as type,
       SUM(cfp_total) as total
     FROM cfp_results WHERE project_id = $1
     UNION ALL
     SELECT 
       'CFO' as type,
       SUM(cfo_total) as total
     FROM cfo_results WHERE project_id = $1`,
    [id]
  );

  // Get report status
  const reportStatus = await db.query(
    `SELECT 
       standard,
       status,
       COUNT(*) as count
     FROM reports
     WHERE project_id = $1
     GROUP BY standard, status`,
    [id]
  );

  res.json({
    success: true,
    data: {
      emissionsByScope: emissionsByScope.rows.reduce(
        (acc, row) => ({
          ...acc,
          [row.scope]: {
            totalEmissions: parseFloat(row.total_emissions) || 0,
            activityCount: parseInt(row.activity_count),
          },
        }),
        {}
      ),
      emissionsByCategory: emissionsByCategory.rows.map((row) => ({
        category: row.scope3_category,
        totalEmissions: parseFloat(row.total_emissions) || 0,
        activityCount: parseInt(row.activity_count),
      })),
      cfpCfoTotals: cfpCfoTotals.rows.reduce(
        (acc, row) => ({
          ...acc,
          [row.type.toLowerCase()]: parseFloat(row.total) || 0,
        }),
        { cfp: 0, cfo: 0 }
      ),
      reportStatus: reportStatus.rows,
    },
  });
}

/**
 * Clone a project
 */
export async function cloneProject(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, reportingYear } = req.body;
  const userId = req.user!.id;

  const project = (req as any).project;
  const newProjectId = generateId();

  // Create new project
  await db.query(
    `INSERT INTO projects (
      id, name, description, company, facility_name, facility_location,
      industry, reporting_standards, default_standard, baseline_year, 
      reporting_year, owner_id
    )
    SELECT $1, $2, description, company, facility_name, facility_location,
           industry, reporting_standards, default_standard, baseline_year,
           $3, $4
    FROM projects WHERE id = $5`,
    [newProjectId, name || `${project.name} (Copy)`, reportingYear || project.reporting_year + 1, userId, id]
  );

  // Add owner as member
  await db.query(
    `INSERT INTO project_members (id, project_id, user_id, role)
     VALUES ($1, $2, $3, $4)`,
    [generateId(), newProjectId, userId, 'owner']
  );

  // Clone activities if requested
  if (req.body.cloneActivities) {
    await db.query(
      `INSERT INTO activities (
        id, project_id, name, description, scope, scope3_category,
        activity_type, quantity, unit, source, tier_level, tier_direction,
        data_source, data_quality_score
      )
      SELECT 
        gen_random_uuid()::text, $1, name, description, scope, scope3_category,
        activity_type, quantity, unit, source, tier_level, tier_direction,
        data_source, data_quality_score
      FROM activities WHERE project_id = $2`,
      [newProjectId, id]
    );
  }

  await logAudit(userId, 'CLONE', 'project', newProjectId, { sourceProjectId: id }, newProjectId);

  res.status(201).json({
    success: true,
    data: {
      id: newProjectId,
      message: 'Project cloned successfully',
    },
  });
}
