import { Request, Response } from 'express';
import { db } from '../config/database';
import { generateId, roundTo } from '../utils/helpers';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import type { AuditAction } from '../types';

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
 * Create a new ESG goal
 */
export async function createGoal(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const userId = (req.user as { id: string }).id;
  const {
    name,
    description,
    category,
    targetType,
    scope,
    baselineValue,
    baselineYear,
    targetValue,
    targetYear,
    targetUnit,
    estimatedCost,
    costCurrency,
    estimatedSavings,
    priority,
    assignedTo,
    alignedStandards,
    sbtiAligned,
    parisAligned,
    milestones,
    notes,
    metadata,
  } = req.body;

  if (!name || !baselineYear || !targetYear) {
    throw new BadRequestError('Name, baseline year, and target year are required');
  }

  if (targetYear <= baselineYear) {
    throw new BadRequestError('Target year must be after baseline year');
  }

  const goalId = generateId();

  const result = await db.query(
    `INSERT INTO esg_goals (
      id, project_id, name, description, category, target_type, scope,
      baseline_value, baseline_year, target_value, target_year, target_unit,
      current_value, progress_percentage,
      estimated_cost, cost_currency, estimated_savings,
      priority, assigned_to, aligned_standards,
      sbti_aligned, paris_aligned, milestones, notes, metadata,
      status, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::report_standard[], $21, $22, $23, $24, $25, $26, $27)
    RETURNING *`,
    [
      goalId,
      projectId,
      name,
      description || null,
      category || 'emission_reduction',
      targetType || 'absolute',
      scope || 'all',
      baselineValue || 0,
      baselineYear,
      targetValue || 0,
      targetYear,
      targetUnit || 'tCO2e',
      baselineValue || 0, // current_value starts at baseline
      0, // progress starts at 0
      estimatedCost || null,
      costCurrency || 'USD',
      estimatedSavings || null,
      priority || 'medium',
      assignedTo || null,
      alignedStandards || [],
      sbtiAligned || false,
      parisAligned || false,
      milestones ? JSON.stringify(milestones) : '[]',
      notes || null,
      metadata ? JSON.stringify(metadata) : '{}',
      'active',
      userId,
    ]
  );

  await logAudit(userId, 'CREATE', 'esg_goal', goalId, { name, category, targetYear }, projectId);

  const goal = result.rows[0];

  res.status(201).json({
    success: true,
    data: formatGoal(goal),
  });
}

/**
 * Get all ESG goals for a project
 */
export async function getGoals(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { page = 1, limit = 50, status, category, scope } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClause = 'WHERE project_id = $1';
  const params: any[] = [projectId];
  let paramIndex = 2;

  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (category) {
    whereClause += ` AND category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (scope) {
    whereClause += ` AND scope = $${paramIndex}`;
    params.push(scope);
    paramIndex++;
  }

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM esg_goals ${whereClause}`,
    params
  );
  const total = Number.parseInt(countResult.rows[0].count, 10);

  // Get goals
  params.push(Number(limit), offset);
  const result = await db.query(
    `SELECT g.*, u.name as assigned_to_name, c.name as created_by_name
     FROM esg_goals g
     LEFT JOIN users u ON g.assigned_to = u.id
     LEFT JOIN users c ON g.created_by = c.id
     ${whereClause}
     ORDER BY g.priority DESC, g.target_year ASC, g.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  res.json({
    success: true,
    data: result.rows.map(formatGoal),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

/**
 * Get a single ESG goal
 */
export async function getGoal(req: Request, res: Response): Promise<void> {
  const { projectId, goalId } = req.params;

  const result = await db.query(
    `SELECT g.*, u.name as assigned_to_name, c.name as created_by_name
     FROM esg_goals g
     LEFT JOIN users u ON g.assigned_to = u.id
     LEFT JOIN users c ON g.created_by = c.id
     WHERE g.id = $1 AND g.project_id = $2`,
    [goalId, projectId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('ESG goal not found');
  }

  res.json({
    success: true,
    data: formatGoal(result.rows[0]),
  });
}

/**
 * Update an ESG goal
 */
export async function updateGoal(req: Request, res: Response): Promise<void> {
  const { projectId, goalId } = req.params;
  const userId = (req.user as { id: string }).id;
  const updates = req.body;

  // Build dynamic update query
  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const fieldMapping: Record<string, string> = {
    name: 'name',
    description: 'description',
    category: 'category',
    targetType: 'target_type',
    scope: 'scope',
    baselineValue: 'baseline_value',
    baselineYear: 'baseline_year',
    targetValue: 'target_value',
    targetYear: 'target_year',
    targetUnit: 'target_unit',
    currentValue: 'current_value',
    estimatedCost: 'estimated_cost',
    actualCost: 'actual_cost',
    costCurrency: 'cost_currency',
    estimatedSavings: 'estimated_savings',
    actualSavings: 'actual_savings',
    roiPercentage: 'roi_percentage',
    status: 'status',
    priority: 'priority',
    assignedTo: 'assigned_to',
    sbtiAligned: 'sbti_aligned',
    parisAligned: 'paris_aligned',
    notes: 'notes',
  };

  for (const [key, dbField] of Object.entries(fieldMapping)) {
    if (updates[key] !== undefined) {
      updateFields.push(`${dbField} = $${paramIndex}`);
      params.push(updates[key]);
      paramIndex++;
    }
  }

  // Handle special fields
  if (updates.milestones !== undefined) {
    updateFields.push(`milestones = $${paramIndex}`);
    params.push(JSON.stringify(updates.milestones));
    paramIndex++;
  }

  if (updates.alignedStandards !== undefined) {
    updateFields.push(`aligned_standards = $${paramIndex}::report_standard[]`);
    params.push(updates.alignedStandards);
    paramIndex++;
  }

  if (updates.metadata !== undefined) {
    updateFields.push(`metadata = $${paramIndex}`);
    params.push(JSON.stringify(updates.metadata));
    paramIndex++;
  }

  if (updateFields.length === 0) {
    throw new BadRequestError('No valid fields to update');
  }

  // Auto-calculate progress percentage if currentValue is updated
  if (updates.currentValue !== undefined) {
    updateFields.push(`progress_percentage = CASE 
      WHEN baseline_value = target_value THEN 100
      WHEN target_type = 'percentage' THEN LEAST(100, GREATEST(0, $${paramIndex}::numeric))
      ELSE LEAST(100, GREATEST(0, 
        ((baseline_value - $${paramIndex}::numeric) / NULLIF(baseline_value - target_value, 0)) * 100
      ))
    END`);
    params.push(updates.currentValue);
    paramIndex++;
  }

  updateFields.push(`updated_at = NOW()`);

  params.push(goalId, projectId);
  const result = await db.query(
    `UPDATE esg_goals SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex} AND project_id = $${paramIndex + 1}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('ESG goal not found');
  }

  await logAudit(userId, 'UPDATE', 'esg_goal', goalId, updates, projectId);

  res.json({
    success: true,
    data: formatGoal(result.rows[0]),
  });
}

/**
 * Delete an ESG goal
 */
export async function deleteGoal(req: Request, res: Response): Promise<void> {
  const { projectId, goalId } = req.params;
  const userId = (req.user as { id: string }).id;

  const result = await db.query(
    `DELETE FROM esg_goals WHERE id = $1 AND project_id = $2 RETURNING id, name`,
    [goalId, projectId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('ESG goal not found');
  }

  await logAudit(userId, 'DELETE', 'esg_goal', goalId, { name: result.rows[0].name }, projectId);

  res.json({
    success: true,
    message: 'ESG goal deleted successfully',
  });
}

/**
 * Update goal progress (recalculate from actual emissions)
 */
export async function updateGoalProgress(req: Request, res: Response): Promise<void> {
  const { projectId, goalId } = req.params;
  const userId = (req.user as { id: string }).id;

  // Get goal details
  const goalResult = await db.query(
    `SELECT * FROM esg_goals WHERE id = $1 AND project_id = $2`,
    [goalId, projectId]
  );

  if (goalResult.rows.length === 0) {
    throw new NotFoundError('ESG goal not found');
  }

  const goal = goalResult.rows[0];

  // Calculate current emissions based on scope
  let emissionsQuery = `
    SELECT SUM(total_emissions_kg_co2e) as total
    FROM activities
    WHERE project_id = $1 AND calculation_status = 'calculated'
  `;
  const queryParams: any[] = [projectId];

  if (goal.scope && goal.scope !== 'all') {
    emissionsQuery += ` AND scope = $2`;
    queryParams.push(goal.scope);
  }

  const emissionsResult = await db.query(emissionsQuery, queryParams);
  const currentEmissions = Number.parseFloat(emissionsResult.rows[0]?.total) || 0;

  // Convert to target unit (kg to tonnes if needed)
  let currentValue = currentEmissions;
  if (goal.target_unit === 'tCO2e') {
    currentValue = currentEmissions / 1000;
  }

  // Calculate progress
  const baselineValue = Number.parseFloat(goal.baseline_value) || 0;
  const targetValue = Number.parseFloat(goal.target_value) || 0;
  let progressPercentage = 0;

  if (goal.target_type === 'absolute') {
    // For reduction: progress = (baseline - current) / (baseline - target) * 100
    if (baselineValue !== targetValue) {
      progressPercentage = ((baselineValue - currentValue) / (baselineValue - targetValue)) * 100;
    }
  } else if (goal.target_type === 'percentage') {
    // Direct percentage reduction
    if (baselineValue > 0) {
      const reductionPct = ((baselineValue - currentValue) / baselineValue) * 100;
      progressPercentage = (reductionPct / targetValue) * 100;
    }
  }

  progressPercentage = Math.min(100, Math.max(0, roundTo(progressPercentage, 2)));

  // Determine status
  let status = goal.status;
  if (progressPercentage >= 100) {
    status = 'achieved';
  } else if (progressPercentage >= 70) {
    status = 'on_track';
  } else if (progressPercentage >= 40) {
    status = 'at_risk';
  } else if (progressPercentage > 0) {
    status = 'behind';
  }

  // Update goal
  await db.query(
    `UPDATE esg_goals SET
       current_value = $1,
       progress_percentage = $2,
       status = $3,
       updated_at = NOW()
     WHERE id = $4`,
    [roundTo(currentValue, 6), progressPercentage, status, goalId]
  );

  await logAudit(userId, 'UPDATE', 'esg_goal', goalId, {
    action: 'progress_update',
    currentValue: roundTo(currentValue, 6),
    progressPercentage,
    status,
  }, projectId);

  res.json({
    success: true,
    data: {
      goalId,
      currentValue: roundTo(currentValue, 6),
      progressPercentage,
      status,
      baselineValue,
      targetValue,
    },
  });
}

/**
 * Get ESG goals summary for a project
 */
export async function getGoalsSummary(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  // Get summary by status
  const statusSummary = await db.query(
    `SELECT 
       status,
       COUNT(*) as count,
       AVG(progress_percentage) as avg_progress
     FROM esg_goals
     WHERE project_id = $1
     GROUP BY status`,
    [projectId]
  );

  // Get summary by category
  const categorySummary = await db.query(
    `SELECT 
       category,
       COUNT(*) as count,
       AVG(progress_percentage) as avg_progress
     FROM esg_goals
     WHERE project_id = $1
     GROUP BY category`,
    [projectId]
  );

  // Get summary by scope
  const scopeSummary = await db.query(
    `SELECT 
       scope,
       COUNT(*) as count,
       AVG(progress_percentage) as avg_progress
     FROM esg_goals
     WHERE project_id = $1
     GROUP BY scope`,
    [projectId]
  );

  // Get financial summary
  const financialSummary = await db.query(
    `SELECT 
       SUM(estimated_cost) as total_estimated_cost,
       SUM(actual_cost) as total_actual_cost,
       SUM(estimated_savings) as total_estimated_savings,
       SUM(actual_savings) as total_actual_savings,
       cost_currency
     FROM esg_goals
     WHERE project_id = $1
     GROUP BY cost_currency`,
    [projectId]
  );

  // Overall progress
  const overallResult = await db.query(
    `SELECT 
       COUNT(*) as total_goals,
       AVG(progress_percentage) as avg_progress,
       COUNT(CASE WHEN status = 'achieved' THEN 1 END) as achieved,
       COUNT(CASE WHEN status = 'on_track' THEN 1 END) as on_track,
       COUNT(CASE WHEN status = 'at_risk' THEN 1 END) as at_risk,
       COUNT(CASE WHEN status = 'behind' THEN 1 END) as behind,
       COUNT(CASE WHEN sbti_aligned THEN 1 END) as sbti_aligned,
       COUNT(CASE WHEN paris_aligned THEN 1 END) as paris_aligned
     FROM esg_goals
     WHERE project_id = $1`,
    [projectId]
  );

  const overall = overallResult.rows[0];

  res.json({
    success: true,
    data: {
      overall: {
        totalGoals: Number.parseInt(overall.total_goals, 10) || 0,
        averageProgress: roundTo(Number.parseFloat(overall.avg_progress) || 0, 2),
        achieved: Number.parseInt(overall.achieved, 10) || 0,
        onTrack: Number.parseInt(overall.on_track, 10) || 0,
        atRisk: Number.parseInt(overall.at_risk, 10) || 0,
        behind: Number.parseInt(overall.behind, 10) || 0,
        sbtiAligned: Number.parseInt(overall.sbti_aligned, 10) || 0,
        parisAligned: Number.parseInt(overall.paris_aligned, 10) || 0,
      },
      byStatus: statusSummary.rows.map((row) => ({
        status: row.status,
        count: Number.parseInt(row.count, 10),
        avgProgress: roundTo(Number.parseFloat(row.avg_progress) || 0, 2),
      })),
      byCategory: categorySummary.rows.map((row) => ({
        category: row.category,
        count: Number.parseInt(row.count, 10),
        avgProgress: roundTo(Number.parseFloat(row.avg_progress) || 0, 2),
      })),
      byScope: scopeSummary.rows.map((row) => ({
        scope: row.scope,
        count: Number.parseInt(row.count, 10),
        avgProgress: roundTo(Number.parseFloat(row.avg_progress) || 0, 2),
      })),
      financial: financialSummary.rows.map((row) => ({
        currency: row.cost_currency,
        estimatedCost: Number.parseFloat(row.total_estimated_cost) || 0,
        actualCost: Number.parseFloat(row.total_actual_cost) || 0,
        estimatedSavings: Number.parseFloat(row.total_estimated_savings) || 0,
        actualSavings: Number.parseFloat(row.total_actual_savings) || 0,
      })),
    },
  });
}

/**
 * Bulk update goal progress for all goals in a project
 */
export async function bulkUpdateProgress(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const userId = (req.user as { id: string }).id;

  // Get all active goals
  const goalsResult = await db.query(
    `SELECT * FROM esg_goals WHERE project_id = $1 AND status NOT IN ('cancelled', 'achieved')`,
    [projectId]
  );

  const updated: any[] = [];
  const errors: any[] = [];

  for (const goal of goalsResult.rows) {
    try {
      // Calculate current emissions for this goal's scope
      let emissionsQuery = `
        SELECT SUM(total_emissions_kg_co2e) as total
        FROM activities
        WHERE project_id = $1 AND calculation_status = 'calculated'
      `;
      const queryParams: any[] = [projectId];

      if (goal.scope && goal.scope !== 'all') {
        emissionsQuery += ` AND scope = $2`;
        queryParams.push(goal.scope);
      }

      const emissionsResult = await db.query(emissionsQuery, queryParams);
      const currentEmissions = Number.parseFloat(emissionsResult.rows[0]?.total) || 0;

      let currentValue = currentEmissions;
      if (goal.target_unit === 'tCO2e') {
        currentValue = currentEmissions / 1000;
      }

      const baselineValue = Number.parseFloat(goal.baseline_value) || 0;
      const targetValue = Number.parseFloat(goal.target_value) || 0;
      let progressPercentage = 0;

      if (goal.target_type === 'absolute' && baselineValue !== targetValue) {
        progressPercentage = ((baselineValue - currentValue) / (baselineValue - targetValue)) * 100;
      } else if (goal.target_type === 'percentage' && baselineValue > 0) {
        const reductionPct = ((baselineValue - currentValue) / baselineValue) * 100;
        progressPercentage = (reductionPct / targetValue) * 100;
      }

      progressPercentage = Math.min(100, Math.max(0, roundTo(progressPercentage, 2)));

      let status = goal.status;
      if (progressPercentage >= 100) status = 'achieved';
      else if (progressPercentage >= 70) status = 'on_track';
      else if (progressPercentage >= 40) status = 'at_risk';
      else if (progressPercentage > 0) status = 'behind';

      await db.query(
        `UPDATE esg_goals SET current_value = $1, progress_percentage = $2, status = $3, updated_at = NOW() WHERE id = $4`,
        [roundTo(currentValue, 6), progressPercentage, status, goal.id]
      );

      updated.push({ id: goal.id, name: goal.name, progressPercentage, status });
    } catch (error: any) {
      errors.push({ id: goal.id, name: goal.name, error: error.message });
    }
  }

  await logAudit(userId, 'UPDATE', 'esg_goal', null, {
    updated: updated.length,
    errors: errors.length,
  }, projectId);

  res.json({
    success: true,
    data: {
      updated,
      errors,
      summary: {
        total: goalsResult.rows.length,
        updated: updated.length,
        failed: errors.length,
      },
    },
  });
}

// Helper function to format goal response
function formatGoal(row: any): any {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    category: row.category,
    targetType: row.target_type,
    scope: row.scope,
    baselineValue: Number.parseFloat(row.baseline_value) || 0,
    baselineYear: row.baseline_year,
    targetValue: Number.parseFloat(row.target_value) || 0,
    targetYear: row.target_year,
    targetUnit: row.target_unit,
    currentValue: Number.parseFloat(row.current_value) || 0,
    progressPercentage: Number.parseFloat(row.progress_percentage) || 0,
    estimatedCost: row.estimated_cost ? Number.parseFloat(row.estimated_cost) : null,
    actualCost: row.actual_cost ? Number.parseFloat(row.actual_cost) : null,
    costCurrency: row.cost_currency,
    estimatedSavings: row.estimated_savings ? Number.parseFloat(row.estimated_savings) : null,
    actualSavings: row.actual_savings ? Number.parseFloat(row.actual_savings) : null,
    roiPercentage: row.roi_percentage ? Number.parseFloat(row.roi_percentage) : null,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_name || null,
    alignedStandards: row.aligned_standards,
    sbtiAligned: row.sbti_aligned,
    parisAligned: row.paris_aligned,
    milestones: row.milestones || [],
    notes: row.notes,
    metadata: row.metadata || {},
    createdBy: row.created_by,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
