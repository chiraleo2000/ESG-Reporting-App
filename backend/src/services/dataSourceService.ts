/**
 * Data Source Service
 * 
 * Manages external data source configurations and orchestrates
 * data synchronization operations.
 */

import { db } from '../config/database';
import { logger } from '../utils/logger';
import { generateId } from '../utils/helpers';
import { 
  createConnector, 
  type ConnectorType, 
  type ConnectorResult, 
  type DataSourceConfig 
} from '../integrations';
import { SyncScheduler } from '../integrations/syncScheduler';

/**
 * Create a new data source configuration
 */
export async function createDataSource(
  projectId: string,
  userId: string,
  data: {
    name: string;
    type: ConnectorType;
    config: Record<string, any>;
    schedule?: string;
    mapping?: Record<string, string>;
  }
): Promise<DataSourceConfig> {
  const id = generateId();
  
  // Validate connector config by testing connection
  const connector = createConnector(data.type);
  let connectionValid = false;
  try {
    connectionValid = await connector.connect(data.config);
    await connector.disconnect();
  } catch (err: any) {
    logger.warn(`Data source connection test failed for ${data.name}: ${err.message}`);
  }

  const dataSource: DataSourceConfig = {
    id,
    name: data.name,
    type: data.type,
    projectId,
    config: data.config,
    schedule: data.schedule,
    mapping: data.mapping || {},
    enabled: true,
    lastSyncStatus: connectionValid ? 'pending' : 'error',
    lastSyncError: connectionValid ? undefined : 'Connection test failed',
  };

  // Store in database
  await db.query(
    `INSERT INTO data_sources (
      id, project_id, name, type, config, schedule, mapping, enabled, 
      last_sync_status, last_sync_error, created_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
    [
      id, projectId, data.name, data.type,
      JSON.stringify(data.config),
      data.schedule || null,
      JSON.stringify(data.mapping || {}),
      true,
      dataSource.lastSyncStatus,
      dataSource.lastSyncError || null,
      userId,
    ]
  );

  // If schedule is set, register with sync scheduler
  if (data.schedule) {
    SyncScheduler.schedule(
      id, data.name, projectId, data.type,
      data.config, data.mapping || {}, data.schedule
    );
  }

  // Audit log
  await logAudit(userId, 'create', 'data_source', id, {
    name: data.name, type: data.type, hasSchedule: !!data.schedule,
  }, projectId);

  return dataSource;
}

export interface DataSourceListOptions {
  page?: number;
  limit?: number;
  type?: string;
  enabled?: boolean;
  search?: string;
  status?: string;
}

/**
 * Redact secrets from connector config before returning to clients
 */
export function redactConfigSecrets(config: Record<string, any> | null | undefined): Record<string, any> {
  if (!config || typeof config !== 'object') return {};
  const secretKeys = [
    'password', 'apiKey', 'api_key', 'token', 'secret', 'accessToken',
    'privateKey', 'private_key', 'sshKey', 'ssh_key', 'clientSecret',
  ];
  const out: Record<string, any> = { ...config };
  for (const key of Object.keys(out)) {
    if (secretKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      const val = String(out[key] ?? '');
      out[key] = val.length > 4 ? `***${val.slice(-4)}` : '***';
    }
  }
  return out;
}

/**
 * Get all data sources for a project (paginated + filtered; secrets redacted)
 */
export async function getDataSources(
  projectId: string,
  options: DataSourceListOptions = {}
): Promise<{ items: DataSourceConfig[]; total: number; page: number; limit: number }> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const offset = (page - 1) * limit;

  const params: any[] = [projectId];
  let where = 'WHERE project_id = $1';
  let idx = 2;

  if (options.type) {
    where += ` AND type = $${idx}`;
    params.push(options.type);
    idx++;
  }
  if (options.enabled !== undefined) {
    where += ` AND enabled = $${idx}`;
    params.push(options.enabled);
    idx++;
  }
  if (options.status) {
    where += ` AND last_sync_status = $${idx}`;
    params.push(options.status);
    idx++;
  }
  if (options.search) {
    where += ` AND name ILIKE $${idx}`;
    params.push(`%${options.search}%`);
    idx++;
  }

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total FROM data_sources ${where}`,
    params
  );
  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT * FROM data_sources ${where}
     ORDER BY created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );

  return {
    items: rows.map((row) => {
      const ds = formatDataSource(row);
      return { ...ds, config: redactConfigSecrets(ds.config) };
    }),
    total: countResult.rows[0].total,
    page,
    limit,
  };
}

/**
 * Get a single data source (secrets redacted on read)
 */
export async function getDataSource(id: string, projectId: string): Promise<DataSourceConfig | null> {
  const row = await db.queryOne(
    `SELECT * FROM data_sources WHERE id = $1 AND project_id = $2`,
    [id, projectId]
  );
  if (!row) return null;
  const ds = formatDataSource(row);
  return { ...ds, config: redactConfigSecrets(ds.config) };
}

/**
 * Internal unredacted fetch for sync/connectors
 */
export async function getDataSourceRaw(id: string, projectId: string): Promise<DataSourceConfig | null> {
  const row = await db.queryOne(
    `SELECT * FROM data_sources WHERE id = $1 AND project_id = $2`,
    [id, projectId]
  );
  return row ? formatDataSource(row) : null;
}

/**
 * Update a data source configuration
 */
export async function updateDataSource(
  id: string,
  projectId: string,
  userId: string,
  data: Partial<{
    name: string;
    config: Record<string, any>;
    schedule: string;
    mapping: Record<string, string>;
    enabled: boolean;
  }>
): Promise<DataSourceConfig | null> {
  const existing = await getDataSourceRaw(id, projectId);
  if (!existing) return null;

  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    values.push(data.name);
    paramIndex++;
  }
  if (data.config !== undefined) {
    updates.push(`config = $${paramIndex}`);
    values.push(JSON.stringify(data.config));
    paramIndex++;
  }
  if (data.schedule !== undefined) {
    updates.push(`schedule = $${paramIndex}`);
    values.push(data.schedule);
    paramIndex++;
  }
  if (data.mapping !== undefined) {
    updates.push(`mapping = $${paramIndex}`);
    values.push(JSON.stringify(data.mapping));
    paramIndex++;
  }
  if (data.enabled !== undefined) {
    updates.push(`enabled = $${paramIndex}`);
    values.push(data.enabled);
    paramIndex++;
  }

  if (updates.length === 0) return existing;

  updates.push(`updated_at = NOW()`);
  values.push(id, projectId);

  const result = await db.queryOne(
    `UPDATE data_sources SET ${updates.join(', ')} 
     WHERE id = $${paramIndex} AND project_id = $${paramIndex + 1}
     RETURNING *`,
    values
  );

  if (!result) return null;

  // Update sync schedule if changed
  const updated = formatDataSource(result);
  if (data.schedule !== undefined || data.enabled !== undefined) {
    SyncScheduler.stop(id);
    if (updated.enabled && updated.schedule) {
      SyncScheduler.schedule(
        id, updated.name, projectId, updated.type,
        updated.config, updated.mapping || {}, updated.schedule
      );
    }
  }

  await logAudit(userId, 'update', 'data_source', id, {
    fields: Object.keys(data),
  }, projectId);

  return { ...updated, config: redactConfigSecrets(updated.config) };
}

/**
 * Delete a data source
 */
export async function deleteDataSource(
  id: string,
  projectId: string,
  userId: string
): Promise<boolean> {
  SyncScheduler.stop(id);
  
  const result = await db.query(
    `DELETE FROM data_sources WHERE id = $1 AND project_id = $2`,
    [id, projectId]
  );

  if (result.rowCount > 0) {
    await logAudit(userId, 'delete', 'data_source', id, {}, projectId);
    return true;
  }
  return false;
}

/**
 * Trigger an immediate sync for a data source
 */
export async function triggerSync(
  id: string,
  projectId: string,
  userId: string
): Promise<ConnectorResult> {
  const dataSource = await getDataSourceRaw(id, projectId);
  if (!dataSource) {
    return {
      success: false,
      recordsProcessed: 0,
      recordsFailed: 0,
      errors: [{ message: 'Data source not found' }],
    };
  }

  if (dataSource.enabled && dataSource.schedule) {
    SyncScheduler.schedule(
      id, dataSource.name, projectId, dataSource.type,
      dataSource.config, dataSource.mapping || {}, dataSource.schedule
    );
  } else {
    SyncScheduler.stage(
      id, dataSource.name, projectId, dataSource.type,
      dataSource.config, dataSource.mapping || {}
    );
  }

  const result = await SyncScheduler.execute(id);

  // Update last sync info
  await db.query(
    `UPDATE data_sources SET 
       last_sync_at = NOW(), 
       last_sync_status = $1, 
       last_sync_error = $2,
       updated_at = NOW()
     WHERE id = $3`,
    [
      result.success ? 'success' : 'error',
      result.errors.length > 0 ? result.errors[0].message : null,
      id,
    ]
  );

  // Re-register with original schedule if any
  if (dataSource.schedule && dataSource.enabled) {
    SyncScheduler.schedule(
      id, dataSource.name, projectId, dataSource.type,
      dataSource.config, dataSource.mapping || {}, dataSource.schedule
    );
  } else {
    SyncScheduler.stop(id);
  }

  await logAudit(userId, 'data_sync', 'data_source', id, {
    result: { processed: result.recordsProcessed, failed: result.recordsFailed },
  }, projectId);

  return result;
}

/**
 * Test a data source connection without saving
 */
export async function testConnection(
  type: ConnectorType,
  config: Record<string, any>
): Promise<{ success: boolean; message: string }> {
  try {
    const connector = createConnector(type);
    const connected = await connector.connect(config);
    await connector.disconnect();
    
    return {
      success: connected,
      message: connected ? 'Connection successful' : 'Connection failed',
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Connection error: ${error.message}`,
    };
  }
}

// Helper functions

function formatDataSource(row: any): DataSourceConfig {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    projectId: row.project_id,
    config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
    schedule: row.schedule,
    mapping: typeof row.mapping === 'string' ? JSON.parse(row.mapping) : row.mapping,
    enabled: row.enabled,
    lastSyncAt: row.last_sync_at,
    lastSyncStatus: row.last_sync_status,
    lastSyncError: row.last_sync_error,
  };
}

async function logAudit(
  userId: string, action: string, entityType: string,
  entityId: string, details: any, projectId: string
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, project_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [generateId(), userId, action, entityType, entityId, JSON.stringify(details), projectId]
    );
  } catch (err) {
    logger.warn('Audit log failed:', err);
  }
}
