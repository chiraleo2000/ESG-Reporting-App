/**
 * Sync Scheduler
 * 
 * Manages scheduled data synchronization jobs for external data sources.
 * Uses node-cron to run sync operations on configured schedules.
 */

import * as cron from 'node-cron';
import { logger } from '../utils/logger';
import { createConnector, type ConnectorType, type ConnectorResult } from './index';
import { db } from '../config/database';
import { generateId } from '../utils/helpers';

interface ScheduledSync {
  id: string;
  name: string;
  projectId: string;
  connectorType: ConnectorType;
  config: Record<string, any>;
  mapping: Record<string, string>;
  cronExpression: string;
  task: cron.ScheduledTask | null;
  enabled: boolean;
  lastRunAt?: Date;
  lastRunStatus?: string;
}

const scheduledSyncs = new Map<string, ScheduledSync>();

/**
 * Schedule a new data sync job
 */
export function scheduleSync(
  id: string,
  name: string,
  projectId: string,
  connectorType: ConnectorType,
  config: Record<string, any>,
  mapping: Record<string, string>,
  cronExpression: string
): boolean {
  try {
    if (!cron.validate(cronExpression)) {
      logger.error(`Invalid cron expression: ${cronExpression}`);
      return false;
    }

    // Stop existing schedule if any
    stopSync(id);

    const task = cron.schedule(cronExpression, async () => {
      logger.info(`Running scheduled sync: ${name} (${id})`);
      await executeSyncJob(id);
    }, {
      timezone: 'UTC',
    });

    scheduledSyncs.set(id, {
      id,
      name,
      projectId,
      connectorType,
      config,
      mapping,
      cronExpression,
      task,
      enabled: true,
    });

    logger.info(`Scheduled sync "${name}" with cron: ${cronExpression}`);
    return true;
  } catch (error: any) {
    logger.error(`Failed to schedule sync ${id}:`, error.message);
    return false;
  }
}

/**
 * Execute a sync job immediately
 */
export async function executeSyncJob(id: string): Promise<ConnectorResult> {
  const sync = scheduledSyncs.get(id);
  if (!sync) {
    return {
      success: false,
      recordsProcessed: 0,
      recordsFailed: 0,
      errors: [{ message: `Sync job ${id} not found` }],
    };
  }

  const startTime = Date.now();
  let result: ConnectorResult;

  try {
    // Create connector instance
    const connector = createConnector(sync.connectorType);
    
    // Connect
    const connected = await connector.connect(sync.config);
    if (!connected) {
      throw new Error('Failed to connect to data source');
    }

    // Fetch data
    const rawData = await connector.fetchData(sync.config);
    
    // Apply field mapping
    const mappedData = await connector.parseData(rawData, sync.mapping);
    
    // Validate
    const { valid, errors } = await connector.validate(mappedData);
    
    // Import valid records as activities
    let importedCount = 0;
    for (const record of valid) {
      try {
        await importActivityRecord(sync.projectId, record);
        importedCount++;
      } catch (err: any) {
        errors.push({ message: `Import failed: ${err.message}` });
      }
    }

    // Disconnect
    await connector.disconnect();

    result = {
      success: true,
      recordsProcessed: importedCount,
      recordsFailed: errors.length,
      errors,
    };

    // Update sync status
    sync.lastRunAt = new Date();
    sync.lastRunStatus = 'success';
  } catch (error: any) {
    result = {
      success: false,
      recordsProcessed: 0,
      recordsFailed: 0,
      errors: [{ message: error.message }],
    };
    
    sync.lastRunAt = new Date();
    sync.lastRunStatus = 'error';
    logger.error(`Sync job ${id} failed:`, error.message);
  }

  const duration = Date.now() - startTime;
  logger.info(`Sync job ${id} completed in ${duration}ms: ${result.recordsProcessed} processed, ${result.recordsFailed} failed`);

  // Log to audit trail
  try {
    await db.query(
      `INSERT INTO audit_logs (id, project_id, action, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        generateId(),
        sync.projectId,
        'data_sync',
        'data_source',
        id,
        JSON.stringify({
          syncName: sync.name,
          connectorType: sync.connectorType,
          duration,
          recordsProcessed: result.recordsProcessed,
          recordsFailed: result.recordsFailed,
          success: result.success,
        }),
      ]
    );
  } catch (err) {
    logger.warn('Failed to log sync audit:', err);
  }

  return result;
}

/**
 * Stop a scheduled sync
 */
export function stopSync(id: string): void {
  const sync = scheduledSyncs.get(id);
  if (sync?.task) {
    sync.task.stop();
    sync.enabled = false;
    logger.info(`Stopped sync: ${sync.name} (${id})`);
  }
}

/**
 * Stop all scheduled syncs
 */
export function stopAllSyncs(): void {
  for (const [id] of scheduledSyncs) {
    stopSync(id);
  }
  scheduledSyncs.clear();
}

/**
 * Get sync status
 */
export function getSyncStatus(id: string): ScheduledSync | undefined {
  return scheduledSyncs.get(id);
}

/**
 * Get all sync statuses
 */
export function getAllSyncStatuses(): ScheduledSync[] {
  return Array.from(scheduledSyncs.values()).map(sync => ({
    ...sync,
    task: null, // Don't serialize the cron task
  }));
}

/**
 * Import a single activity record into the database
 */
async function importActivityRecord(projectId: string, record: any): Promise<void> {
  const id = generateId();
  const name = record.name || record.activity_name || record.description || 'Imported Activity';
  const scope = record.scope || record.emission_scope || 'scope_1';
  const activityType = record.activity_type || record.type || 'other';
  const quantity = Number(record.quantity || record.amount || 0);
  const unit = record.unit || record.measurement_unit || 'kg';
  const emissionFactor = record.emission_factor ? Number(record.emission_factor) : null;

  await db.query(
    `INSERT INTO activities (
      id, project_id, name, scope, activity_type, 
      activity_data, unit, emission_factor,
      status, data_quality_score, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
    [
      id,
      projectId,
      name,
      scope,
      activityType,
      quantity,
      unit,
      emissionFactor,
      'pending',
      record.data_quality_score || 3,
    ]
  );
}

export class SyncScheduler {
  static schedule = scheduleSync;
  static execute = executeSyncJob;
  static stop = stopSync;
  static stopAll = stopAllSyncs;
  static getStatus = getSyncStatus;
  static getAllStatuses = getAllSyncStatuses;
}
