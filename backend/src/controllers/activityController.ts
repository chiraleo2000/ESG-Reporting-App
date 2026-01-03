import { Request, Response } from 'express';
import { db } from '../config/database';
import { redis } from '../config/redis';
import { generateId, convertUnits } from '../utils/helpers';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import type { Activity, EmissionScope, Scope3Category, TierLevel, TierDirection, AuditAction } from '../types';

// Audit log helper
async function logAudit(
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  details: object,
  projectId: string
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, user_id, project_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [generateId(), userId, projectId, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
}

/**
 * Create a new activity
 */
export async function createActivity(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const userId = req.user!.id;
  const {
    name,
    description,
    scope,
    scope3Category,
    activityType,
    quantity,
    unit,
    source,
    tierLevel,
    tierDirection,
    dataSource,
    dataQualityScore,
    metadata,
  } = req.body;

  const activityId = generateId();

  // Validate scope3Category if scope is scope3
  if (scope === 'scope3' && !scope3Category) {
    throw new BadRequestError('scope3Category is required for Scope 3 activities');
  }

  const result = await db.query(
    `INSERT INTO activities (
      id, project_id, name, description, scope, scope3_category,
      activity_type, quantity, unit, source, tier_level, tier_direction,
      data_source, data_quality_score, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      activityId,
      projectId,
      name,
      description || null,
      scope,
      scope3Category || null,
      activityType,
      quantity,
      unit,
      source || null,
      tierLevel || 'tier1',
      tierDirection || 'both',
      dataSource || null,
      dataQualityScore || null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );

  await logAudit(userId, 'CREATE', 'activity', activityId, { name, scope, activityType }, projectId);

  // Clear project cache
  await redis.del(redis.keys.projectActivities(projectId));

  const activity = result.rows[0];

  res.status(201).json({
    success: true,
    data: formatActivity(activity),
  });
}

/**
 * Get all activities for a project
 */
export async function getActivities(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { page = 1, limit = 50, scope, status, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClause = 'WHERE project_id = $1';
  const params: any[] = [projectId];
  let paramIndex = 2;

  if (scope) {
    whereClause += ` AND scope = $${paramIndex}`;
    params.push(scope);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND calculation_status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (search) {
    whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM activities ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get activities
  params.push(Number(limit), offset);
  const result = await db.query(
    `SELECT * FROM activities ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  res.json({
    success: true,
    data: result.rows.map(formatActivity),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

/**
 * Get a single activity
 */
export async function getActivity(req: Request, res: Response): Promise<void> {
  const { projectId, activityId } = req.params;

  const result = await db.query(
    `SELECT * FROM activities WHERE id = $1 AND project_id = $2`,
    [activityId, projectId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Activity not found');
  }

  // Get associated precursor calculations if any
  const precursors = await db.query(
    `SELECT * FROM precursor_calculations WHERE activity_id = $1`,
    [activityId]
  );

  res.json({
    success: true,
    data: {
      ...formatActivity(result.rows[0]),
      precursors: precursors.rows,
    },
  });
}

/**
 * Update an activity
 */
export async function updateActivity(req: Request, res: Response): Promise<void> {
  const { projectId, activityId } = req.params;
  const userId = req.user!.id;
  const updates = req.body;

  // Build dynamic update query
  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const allowedFields = [
    'name', 'description', 'scope', 'scope3_category', 'activity_type',
    'quantity', 'unit', 'source', 'tier_level', 'tier_direction',
    'data_source', 'data_quality_score', 'metadata',
  ];

  const fieldMapping: Record<string, string> = {
    name: 'name',
    description: 'description',
    scope: 'scope',
    scope3Category: 'scope3_category',
    activityType: 'activity_type',
    quantity: 'quantity',
    unit: 'unit',
    source: 'source',
    tierLevel: 'tier_level',
    tierDirection: 'tier_direction',
    dataSource: 'data_source',
    dataQualityScore: 'data_quality_score',
    metadata: 'metadata',
  };

  for (const [key, dbField] of Object.entries(fieldMapping)) {
    if (updates[key] !== undefined) {
      updateFields.push(`${dbField} = $${paramIndex}`);
      params.push(key === 'metadata' ? JSON.stringify(updates[key]) : updates[key]);
      paramIndex++;
    }
  }

  if (updateFields.length === 0) {
    throw new BadRequestError('No valid fields to update');
  }

  // Reset calculation status if quantity or unit changed
  if (updates.quantity !== undefined || updates.unit !== undefined) {
    updateFields.push(`calculation_status = 'pending'`);
    updateFields.push(`total_emissions_kg_co2e = NULL`);
    updateFields.push(`emission_factor_used = NULL`);
  }

  updateFields.push(`updated_at = NOW()`);

  params.push(activityId, projectId);
  const result = await db.query(
    `UPDATE activities SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex} AND project_id = $${paramIndex + 1}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Activity not found');
  }

  await logAudit(userId, 'UPDATE', 'activity', activityId, updates, projectId);
  await redis.del(redis.keys.projectActivities(projectId));

  res.json({
    success: true,
    data: formatActivity(result.rows[0]),
  });
}

/**
 * Delete an activity
 */
export async function deleteActivity(req: Request, res: Response): Promise<void> {
  const { projectId, activityId } = req.params;
  const userId = req.user!.id;

  const result = await db.query(
    `DELETE FROM activities WHERE id = $1 AND project_id = $2 RETURNING id, name`,
    [activityId, projectId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Activity not found');
  }

  await logAudit(userId, 'DELETE', 'activity', activityId, { name: result.rows[0].name }, projectId);
  await redis.del(redis.keys.projectActivities(projectId));

  res.json({
    success: true,
    message: 'Activity deleted successfully',
  });
}

/**
 * Bulk create activities
 */
export async function bulkCreateActivities(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const userId = req.user!.id;
  const { activities } = req.body;

  if (!Array.isArray(activities) || activities.length === 0) {
    throw new BadRequestError('Activities array is required');
  }

  const createdActivities: any[] = [];
  const errors: any[] = [];

  await db.transaction(async (client) => {
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      try {
        const activityId = generateId();
        const result = await client.query(
          `INSERT INTO activities (
            id, project_id, name, description, scope, scope3_category,
            activity_type, quantity, unit, source, tier_level, tier_direction,
            data_source, data_quality_score
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *`,
          [
            activityId,
            projectId,
            activity.name,
            activity.description || null,
            activity.scope,
            activity.scope3Category || null,
            activity.activityType,
            activity.quantity,
            activity.unit,
            activity.source || null,
            activity.tierLevel || 'tier1',
            activity.tierDirection || 'both',
            activity.dataSource || null,
            activity.dataQualityScore || null,
          ]
        );
        createdActivities.push(formatActivity(result.rows[0]));
      } catch (error: any) {
        errors.push({ index: i, activity: activity.name, error: error.message });
      }
    }
  });

  if (createdActivities.length > 0) {
    await logAudit(userId, 'BULK_CREATE', 'activity', null, { count: createdActivities.length }, projectId);
    await redis.del(redis.keys.projectActivities(projectId));
  }

  res.status(201).json({
    success: true,
    data: {
      created: createdActivities,
      errors,
      summary: {
        total: activities.length,
        created: createdActivities.length,
        failed: errors.length,
      },
    },
  });
}

/**
 * Bulk delete activities
 */
export async function bulkDeleteActivities(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const userId = req.user!.id;
  const { activityIds } = req.body;

  if (!Array.isArray(activityIds) || activityIds.length === 0) {
    throw new BadRequestError('Activity IDs array is required');
  }

  const result = await db.query(
    `DELETE FROM activities 
     WHERE project_id = $1 AND id = ANY($2)
     RETURNING id`,
    [projectId, activityIds]
  );

  await logAudit(userId, 'BULK_DELETE', 'activity', null, { count: result.rows.length }, projectId);
  await redis.del(redis.keys.projectActivities(projectId));

  res.json({
    success: true,
    data: {
      deleted: result.rows.length,
      requested: activityIds.length,
    },
  });
}

/**
 * Get activities by scope
 */
export async function getActivitiesByScope(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { scope } = req.query;

  if (!scope) {
    throw new BadRequestError('Scope parameter is required');
  }

  const result = await db.query(
    `SELECT * FROM activities 
     WHERE project_id = $1 AND scope = $2
     ORDER BY created_at DESC`,
    [projectId, scope]
  );

  res.json({
    success: true,
    data: result.rows.map(formatActivity),
  });
}

/**
 * Get activities by Scope 3 category
 */
export async function getActivitiesByCategory(req: Request, res: Response): Promise<void> {
  const { projectId, category } = req.params;

  const result = await db.query(
    `SELECT * FROM activities 
     WHERE project_id = $1 AND scope = 'scope3' AND scope3_category = $2
     ORDER BY created_at DESC`,
    [projectId, category]
  );

  res.json({
    success: true,
    data: result.rows.map(formatActivity),
  });
}

/**
 * Get activity summary for a project
 */
export async function getActivitySummary(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  // Summary by scope
  const scopeSummary = await db.query(
    `SELECT 
       scope,
       COUNT(*) as total_count,
       COUNT(CASE WHEN calculation_status = 'calculated' THEN 1 END) as calculated_count,
       COUNT(CASE WHEN calculation_status = 'pending' THEN 1 END) as pending_count,
       COUNT(CASE WHEN calculation_status = 'error' THEN 1 END) as error_count,
       SUM(total_emissions_kg_co2e) as total_emissions
     FROM activities
     WHERE project_id = $1
     GROUP BY scope`,
    [projectId]
  );

  // Summary by Scope 3 category
  const categorySummary = await db.query(
    `SELECT 
       scope3_category,
       COUNT(*) as total_count,
       SUM(total_emissions_kg_co2e) as total_emissions
     FROM activities
     WHERE project_id = $1 AND scope = 'scope3'
     GROUP BY scope3_category`,
    [projectId]
  );

  // Tier distribution
  const tierDistribution = await db.query(
    `SELECT 
       tier_level,
       tier_direction,
       COUNT(*) as count
     FROM activities
     WHERE project_id = $1
     GROUP BY tier_level, tier_direction`,
    [projectId]
  );

  res.json({
    success: true,
    data: {
      byScope: scopeSummary.rows.map((row) => ({
        scope: row.scope,
        totalCount: parseInt(row.total_count),
        calculatedCount: parseInt(row.calculated_count),
        pendingCount: parseInt(row.pending_count),
        errorCount: parseInt(row.error_count),
        totalEmissions: parseFloat(row.total_emissions) || 0,
      })),
      byCategory: categorySummary.rows.map((row) => ({
        category: row.scope3_category,
        totalCount: parseInt(row.total_count),
        totalEmissions: parseFloat(row.total_emissions) || 0,
      })),
      tierDistribution: tierDistribution.rows.map((row) => ({
        tierLevel: row.tier_level,
        tierDirection: row.tier_direction,
        count: parseInt(row.count),
      })),
    },
  });
}

// Helper function to format activity response
function formatActivity(row: any): any {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    scope: row.scope,
    scope3Category: row.scope3_category,
    activityType: row.activity_type,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
    source: row.source,
    tierLevel: row.tier_level,
    tierDirection: row.tier_direction,
    dataSource: row.data_source,
    dataQualityScore: row.data_quality_score,
    calculationStatus: row.calculation_status,
    totalEmissionsKgCo2e: row.total_emissions_kg_co2e ? parseFloat(row.total_emissions_kg_co2e) : null,
    emissionFactorUsed: row.emission_factor_used,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
