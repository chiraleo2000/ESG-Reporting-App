import { Request, Response } from 'express';
import { db } from '../config/database';
import { config } from '../config/env';
import { generateId } from '../utils/helpers';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import * as XLSX from 'xlsx';

/**
 * Get audit logs for a project
 */
export async function getProjectAuditLogs(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { 
    page = 1, 
    limit = 50, 
    action, 
    entityType, 
    userId, 
    startDate, 
    endDate 
  } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClause = 'WHERE project_id = $1';
  const params: any[] = [projectId];
  let paramIndex = 2;

  if (action) {
    whereClause += ` AND action = $${paramIndex}`;
    params.push(action);
    paramIndex++;
  }

  if (entityType) {
    whereClause += ` AND entity_type = $${paramIndex}`;
    params.push(entityType);
    paramIndex++;
  }

  if (userId) {
    whereClause += ` AND user_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }

  if (startDate) {
    whereClause += ` AND created_at >= $${paramIndex}`;
    params.push(new Date(startDate as string));
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND created_at <= $${paramIndex}`;
    params.push(new Date(endDate as string));
    paramIndex++;
  }

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get logs
  params.push(Number(limit), offset);
  const result = await db.query(
    `SELECT al.*, u.name as user_name, u.email as user_email
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

/**
 * Get audit log summary for a project
 */
export async function getAuditSummary(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - Number(days));

  // Actions summary
  const actionsSummary = await db.query(
    `SELECT action, COUNT(*) as count
     FROM audit_logs
     WHERE project_id = $1 AND created_at >= $2
     GROUP BY action
     ORDER BY count DESC`,
    [projectId, startDate]
  );

  // Entity types summary
  const entitySummary = await db.query(
    `SELECT entity_type, COUNT(*) as count
     FROM audit_logs
     WHERE project_id = $1 AND created_at >= $2
     GROUP BY entity_type
     ORDER BY count DESC`,
    [projectId, startDate]
  );

  // Top users
  const userSummary = await db.query(
    `SELECT u.name, u.email, COUNT(*) as count
     FROM audit_logs al
     JOIN users u ON al.user_id = u.id
     WHERE al.project_id = $1 AND al.created_at >= $2
     GROUP BY u.id, u.name, u.email
     ORDER BY count DESC
     LIMIT 10`,
    [projectId, startDate]
  );

  // Daily activity
  const dailyActivity = await db.query(
    `SELECT DATE(created_at) as date, COUNT(*) as count
     FROM audit_logs
     WHERE project_id = $1 AND created_at >= $2
     GROUP BY DATE(created_at)
     ORDER BY date`,
    [projectId, startDate]
  );

  // Total count
  const totalResult = await db.query(
    `SELECT COUNT(*) FROM audit_logs WHERE project_id = $1 AND created_at >= $2`,
    [projectId, startDate]
  );

  res.json({
    success: true,
    data: {
      period: {
        days: Number(days),
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      total: parseInt(totalResult.rows[0].count),
      byAction: actionsSummary.rows.map((row) => ({
        action: row.action,
        count: parseInt(row.count),
      })),
      byEntityType: entitySummary.rows.map((row) => ({
        entityType: row.entity_type,
        count: parseInt(row.count),
      })),
      topUsers: userSummary.rows.map((row) => ({
        name: row.name,
        email: row.email,
        count: parseInt(row.count),
      })),
      dailyActivity: dailyActivity.rows.map((row) => ({
        date: row.date,
        count: parseInt(row.count),
      })),
    },
  });
}

/**
 * Export audit logs
 */
export async function exportAuditLogs(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { format = 'xlsx', startDate, endDate } = req.query;

  let whereClause = 'WHERE project_id = $1';
  const params: any[] = [projectId];
  let paramIndex = 2;

  if (startDate) {
    whereClause += ` AND created_at >= $${paramIndex}`;
    params.push(new Date(startDate as string));
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND created_at <= $${paramIndex}`;
    params.push(new Date(endDate as string));
    paramIndex++;
  }

  const result = await db.query(
    `SELECT al.*, u.name as user_name, u.email as user_email
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ${whereClause}
     ORDER BY al.created_at DESC`,
    params
  );

  // Get project name for filename
  const projectResult = await db.query(
    `SELECT name FROM projects WHERE id = $1`,
    [projectId]
  );
  const projectName = projectResult.rows[0]?.name || 'project';
  const safeProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];

  if (format === 'csv') {
    // Generate CSV
    const headers = [
      'ID', 'User', 'Email', 'Action', 'Entity Type', 'Entity ID', 
      'Details', 'IP Address', 'User Agent', 'Created At'
    ];
    const rows = result.rows.map((row) => [
      row.id,
      row.user_name,
      row.user_email,
      row.action,
      row.entity_type,
      row.entity_id,
      JSON.stringify(row.details),
      row.ip_address,
      row.user_agent,
      row.created_at.toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c || ''}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}_audit_logs_${timestamp}.csv"`);
    res.send(csv);
  } else {
    // Generate Excel
    const excelData = result.rows.map((row) => ({
      ID: row.id,
      User: row.user_name,
      Email: row.user_email,
      Action: row.action,
      'Entity Type': row.entity_type,
      'Entity ID': row.entity_id,
      Details: JSON.stringify(row.details),
      'IP Address': row.ip_address,
      'User Agent': row.user_agent,
      'Created At': row.created_at.toISOString(),
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    worksheet['!cols'] = [
      { wch: 36 }, // ID
      { wch: 20 }, // User
      { wch: 30 }, // Email
      { wch: 20 }, // Action
      { wch: 15 }, // Entity Type
      { wch: 36 }, // Entity ID
      { wch: 50 }, // Details
      { wch: 15 }, // IP Address
      { wch: 50 }, // User Agent
      { wch: 25 }, // Created At
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}_audit_logs_${timestamp}.xlsx"`);
    res.send(buffer);
  }
}

/**
 * Get audit log by ID
 */
export async function getAuditLog(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const result = await db.query(
    `SELECT al.*, u.name as user_name, u.email as user_email
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     WHERE al.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Audit log not found');
  }

  const row = result.rows[0];

  res.json({
    success: true,
    data: {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      projectId: row.project_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    },
  });
}

/**
 * Get audit retention info
 */
export async function getAuditRetentionInfo(req: Request, res: Response): Promise<void> {
  const retentionDays = config.audit.retentionDays;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // Count total logs
  const totalResult = await db.query(`SELECT COUNT(*) FROM audit_logs`);

  // Count logs that would be deleted
  const expiredResult = await db.query(
    `SELECT COUNT(*) FROM audit_logs WHERE created_at < $1`,
    [cutoffDate]
  );

  // Get oldest log
  const oldestResult = await db.query(
    `SELECT created_at FROM audit_logs ORDER BY created_at ASC LIMIT 1`
  );

  res.json({
    success: true,
    data: {
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      totalLogs: parseInt(totalResult.rows[0].count),
      expiredLogs: parseInt(expiredResult.rows[0].count),
      oldestLog: oldestResult.rows[0]?.created_at?.toISOString() || null,
    },
  });
}

/**
 * Filter audit logs by action type for a specific project
 */
export async function filterAuditLogs(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { action, entityType, startDate, endDate, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClause = 'WHERE al.project_id = $1';
  const params: any[] = [projectId];
  let paramIndex = 2;

  if (action) {
    whereClause += ` AND al.action = $${paramIndex}`;
    params.push(action);
    paramIndex++;
  }

  if (entityType) {
    whereClause += ` AND al.entity_type = $${paramIndex}`;
    params.push(entityType);
    paramIndex++;
  }

  if (startDate) {
    whereClause += ` AND al.created_at >= $${paramIndex}`;
    params.push(new Date(startDate as string));
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND al.created_at <= $${paramIndex}`;
    params.push(new Date(endDate as string));
    paramIndex++;
  }

  // Get count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM audit_logs al ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get results
  const queryParams = [...params, Number(limit), offset];
  const result = await db.query(
    `SELECT al.*, u.name as user_name, u.email as user_email
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    queryParams
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      projectId: row.project_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      details: row.details,
      createdAt: row.created_at,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

/**
 * Search audit logs across all projects (admin only)
 */
export async function searchAuditLogs(req: Request, res: Response): Promise<void> {
  const { 
    query, 
    action, 
    entityType, 
    userId, 
    projectId,
    startDate, 
    endDate,
    page = 1,
    limit = 50
  } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (query) {
    whereClause += ` AND (
      al.details::text ILIKE $${paramIndex} OR
      al.entity_id ILIKE $${paramIndex} OR
      u.name ILIKE $${paramIndex} OR
      u.email ILIKE $${paramIndex}
    )`;
    params.push(`%${query}%`);
    paramIndex++;
  }

  if (action) {
    whereClause += ` AND al.action = $${paramIndex}`;
    params.push(action);
    paramIndex++;
  }

  if (entityType) {
    whereClause += ` AND al.entity_type = $${paramIndex}`;
    params.push(entityType);
    paramIndex++;
  }

  if (userId) {
    whereClause += ` AND al.user_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }

  if (projectId) {
    whereClause += ` AND al.project_id = $${paramIndex}`;
    params.push(projectId);
    paramIndex++;
  }

  if (startDate) {
    whereClause += ` AND al.created_at >= $${paramIndex}`;
    params.push(new Date(startDate as string));
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND al.created_at <= $${paramIndex}`;
    params.push(new Date(endDate as string));
    paramIndex++;
  }

  // Get count
  const countParams = [...params];
  const countResult = await db.query(
    `SELECT COUNT(*) FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${whereClause}`,
    countParams
  );
  const total = parseInt(countResult.rows[0].count);

  // Get results
  params.push(Number(limit), offset);
  const result = await db.query(
    `SELECT al.*, u.name as user_name, u.email as user_email, p.name as project_name
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     LEFT JOIN projects p ON al.project_id = p.id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      projectId: row.project_id,
      projectName: row.project_name,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}
