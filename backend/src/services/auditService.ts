import { db } from '../config/database';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';
import { logger } from '../utils/logger';

// 7-year retention period in days
const RETENTION_DAYS = 2555;
const CACHE_TTL = 300; // 5 minutes

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  projectId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, any>,
  ipAddress?: string
): Promise<string> {
  const result = await db.query(
    `INSERT INTO audit_logs (
      project_id, user_id, action, entity_type, entity_id, 
      details, ip_address, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id`,
    [projectId, userId, action, entityType, entityId, JSON.stringify(details), ipAddress]
  );

  // Invalidate cache
  await cacheDel(`audit:project:${projectId}:*`);

  logger.info('Audit log created', {
    auditId: result.rows[0].id,
    projectId,
    action,
    entityType,
    entityId,
  });

  return result.rows[0].id;
}

/**
 * Get audit logs for a project with filtering
 */
export async function getAuditLogs(
  projectId: string,
  options: AuditLogQueryOptions = {}
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const {
    page = 1,
    limit = 50,
    startDate,
    endDate,
    userId,
    action,
    entityType,
    search,
  } = options;

  const offset = (page - 1) * limit;
  const params: any[] = [projectId];
  let paramIndex = 2;

  let whereClause = 'WHERE al.project_id = $1';

  if (startDate) {
    whereClause += ` AND al.created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND al.created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  if (userId) {
    whereClause += ` AND al.user_id = $${paramIndex}`;
    params.push(userId);
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

  if (search) {
    whereClause += ` AND (
      al.action ILIKE $${paramIndex} OR 
      al.entity_type ILIKE $${paramIndex} OR
      al.details::text ILIKE $${paramIndex}
    )`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Count total
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`,
    params
  );

  // Get logs
  params.push(limit, offset);
  const result = await db.query(
    `SELECT 
      al.id,
      al.project_id,
      al.user_id,
      u.name as user_name,
      u.email as user_email,
      al.action,
      al.entity_type,
      al.entity_id,
      al.details,
      al.ip_address,
      al.created_at
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ${whereClause}
    ORDER BY al.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  return {
    logs: result.rows,
    total: parseInt(countResult.rows[0].total),
  };
}

/**
 * Get audit log summary statistics
 */
export async function getAuditSummary(
  projectId: string,
  startDate?: string,
  endDate?: string
): Promise<AuditSummary> {
  const cacheKey = `audit:summary:${projectId}:${startDate || 'all'}:${endDate || 'all'}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const params: any[] = [projectId];
  let dateFilter = '';
  let paramIndex = 2;

  if (startDate) {
    dateFilter += ` AND created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    dateFilter += ` AND created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  // Action counts
  const actionCountsResult = await db.query(
    `SELECT action, COUNT(*) as count
     FROM audit_logs
     WHERE project_id = $1 ${dateFilter}
     GROUP BY action
     ORDER BY count DESC`,
    params
  );

  // Entity type counts
  const entityCountsResult = await db.query(
    `SELECT entity_type, COUNT(*) as count
     FROM audit_logs
     WHERE project_id = $1 ${dateFilter}
     GROUP BY entity_type
     ORDER BY count DESC`,
    params
  );

  // User activity
  const userActivityResult = await db.query(
    `SELECT 
      al.user_id,
      u.name as user_name,
      COUNT(*) as action_count
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     WHERE al.project_id = $1 ${dateFilter}
     GROUP BY al.user_id, u.name
     ORDER BY action_count DESC
     LIMIT 10`,
    params
  );

  // Daily activity (last 30 days)
  const dailyActivityResult = await db.query(
    `SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
     FROM audit_logs
     WHERE project_id = $1 
       AND created_at >= NOW() - INTERVAL '30 days'
     GROUP BY DATE(created_at)
     ORDER BY date DESC`,
    [projectId]
  );

  // Total count
  const totalResult = await db.query(
    `SELECT COUNT(*) as total FROM audit_logs WHERE project_id = $1 ${dateFilter}`,
    params
  );

  const summary: AuditSummary = {
    totalLogs: parseInt(totalResult.rows[0].total),
    actionCounts: actionCountsResult.rows.reduce((acc, row) => {
      acc[row.action] = parseInt(row.count);
      return acc;
    }, {}),
    entityCounts: entityCountsResult.rows.reduce((acc, row) => {
      acc[row.entity_type] = parseInt(row.count);
      return acc;
    }, {}),
    topUsers: userActivityResult.rows.map(row => ({
      userId: row.user_id,
      userName: row.user_name,
      actionCount: parseInt(row.action_count),
    })),
    dailyActivity: dailyActivityResult.rows.map(row => ({
      date: row.date,
      count: parseInt(row.count),
    })),
    period: {
      start: startDate || 'all-time',
      end: endDate || 'now',
    },
  };

  await cacheSet(cacheKey, JSON.stringify(summary), CACHE_TTL);
  return summary;
}

/**
 * Search audit logs with full-text search
 */
export async function searchAuditLogs(
  projectId: string,
  searchQuery: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  // Build search pattern
  const searchPattern = `%${searchQuery}%`;

  const countResult = await db.query(
    `SELECT COUNT(*) as total
     FROM audit_logs al
     WHERE al.project_id = $1
       AND (
         al.action ILIKE $2 OR
         al.entity_type ILIKE $2 OR
         al.entity_id ILIKE $2 OR
         al.details::text ILIKE $2
       )`,
    [projectId, searchPattern]
  );

  const result = await db.query(
    `SELECT 
      al.id,
      al.project_id,
      al.user_id,
      u.name as user_name,
      u.email as user_email,
      al.action,
      al.entity_type,
      al.entity_id,
      al.details,
      al.ip_address,
      al.created_at
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.project_id = $1
      AND (
        al.action ILIKE $2 OR
        al.entity_type ILIKE $2 OR
        al.entity_id ILIKE $2 OR
        al.details::text ILIKE $2
      )
    ORDER BY al.created_at DESC
    LIMIT $3 OFFSET $4`,
    [projectId, searchPattern, limit, offset]
  );

  return {
    logs: result.rows,
    total: parseInt(countResult.rows[0].total),
  };
}

/**
 * Export audit logs to CSV format
 */
export async function exportToCSV(
  projectId: string,
  options: AuditLogQueryOptions = {}
): Promise<string> {
  const { logs } = await getAuditLogs(projectId, { ...options, limit: 10000 });

  const headers = [
    'ID',
    'Timestamp',
    'User ID',
    'User Name',
    'User Email',
    'Action',
    'Entity Type',
    'Entity ID',
    'IP Address',
    'Details',
  ];

  const rows = logs.map(log => [
    log.id,
    log.created_at,
    log.user_id,
    log.user_name || '',
    log.user_email || '',
    log.action,
    log.entity_type,
    log.entity_id,
    log.ip_address || '',
    JSON.stringify(log.details).replace(/"/g, '""'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Get retention policy information
 */
export function getRetentionInfo(): RetentionInfo {
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - RETENTION_DAYS);

  return {
    retentionDays: RETENTION_DAYS,
    retentionYears: 7,
    oldestRetainedDate: retentionDate.toISOString(),
    policy: 'Audit logs are retained for 7 years (2555 days) as per regulatory requirements',
    autoCleanup: true,
    cleanupSchedule: 'Daily at 02:00 UTC',
  };
}

/**
 * Cleanup old audit logs beyond retention period
 * Should be called by a scheduled job
 */
export async function cleanupOldLogs(): Promise<CleanupResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  try {
    // Count logs to be deleted
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM audit_logs WHERE created_at < $1`,
      [cutoffDate]
    );

    const toDelete = parseInt(countResult.rows[0].count);

    if (toDelete === 0) {
      return {
        success: true,
        deletedCount: 0,
        cutoffDate: cutoffDate.toISOString(),
        message: 'No logs to cleanup',
      };
    }

    // Delete in batches to avoid long locks
    const batchSize = 10000;
    let totalDeleted = 0;

    while (totalDeleted < toDelete) {
      const deleteResult = await db.query(
        `DELETE FROM audit_logs 
         WHERE id IN (
           SELECT id FROM audit_logs 
           WHERE created_at < $1 
           LIMIT $2
         )`,
        [cutoffDate, batchSize]
      );

      totalDeleted += deleteResult.rowCount || 0;

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('Audit log cleanup completed', {
      deletedCount: totalDeleted,
      cutoffDate: cutoffDate.toISOString(),
    });

    return {
      success: true,
      deletedCount: totalDeleted,
      cutoffDate: cutoffDate.toISOString(),
      message: `Successfully deleted ${totalDeleted} audit logs older than ${cutoffDate.toISOString()}`,
    };
  } catch (error) {
    logger.error('Audit log cleanup failed:', error);
    return {
      success: false,
      deletedCount: 0,
      cutoffDate: cutoffDate.toISOString(),
      message: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get audit trail for a specific entity
 */
export async function getEntityAuditTrail(
  entityType: string,
  entityId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM audit_logs WHERE entity_type = $1 AND entity_id = $2`,
    [entityType, entityId]
  );

  const result = await db.query(
    `SELECT 
      al.id,
      al.project_id,
      al.user_id,
      u.name as user_name,
      u.email as user_email,
      al.action,
      al.entity_type,
      al.entity_id,
      al.details,
      al.ip_address,
      al.created_at
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.entity_type = $1 AND al.entity_id = $2
    ORDER BY al.created_at DESC
    LIMIT $3 OFFSET $4`,
    [entityType, entityId, limit, offset]
  );

  return {
    logs: result.rows,
    total: parseInt(countResult.rows[0].total),
  };
}

// Type definitions
interface AuditLogQueryOptions {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  search?: string;
}

interface AuditLogEntry {
  id: string;
  project_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

interface AuditSummary {
  totalLogs: number;
  actionCounts: Record<string, number>;
  entityCounts: Record<string, number>;
  topUsers: Array<{
    userId: string;
    userName: string;
    actionCount: number;
  }>;
  dailyActivity: Array<{
    date: string;
    count: number;
  }>;
  period: {
    start: string;
    end: string;
  };
}

interface RetentionInfo {
  retentionDays: number;
  retentionYears: number;
  oldestRetainedDate: string;
  policy: string;
  autoCleanup: boolean;
  cleanupSchedule: string;
}

interface CleanupResult {
  success: boolean;
  deletedCount: number;
  cutoffDate: string;
  message: string;
}
