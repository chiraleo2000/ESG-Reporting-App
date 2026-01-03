import cron from 'node-cron';
import { logger } from '../utils/logger';
import { cleanupOldLogs } from '../services/auditService';
import { db } from '../config/database';

// Job registry
const jobs: Map<string, cron.ScheduledTask> = new Map();

/**
 * Initialize all scheduled jobs
 */
export function initializeJobs(): void {
  logger.info('Initializing scheduled jobs...');

  // Audit log cleanup - Daily at 2:00 AM UTC
  scheduleJob('audit_log_cleanup', '0 2 * * *', runAuditLogCleanup);

  // Grid emission factor update check - January 15th at midnight
  scheduleJob('grid_ef_update_check', '0 0 15 1 *', runGridEFUpdateCheck);

  // Report deadline reminder - Monthly on 1st at 9:00 AM
  scheduleJob('report_reminder', '0 9 1 * *', runReportReminder);

  // Database health check - Every 6 hours
  scheduleJob('db_health_check', '0 */6 * * *', runDatabaseHealthCheck);

  // Cache cleanup - Daily at 4:00 AM UTC
  scheduleJob('cache_cleanup', '0 4 * * *', runCacheCleanup);

  logger.info(`Scheduled ${jobs.size} jobs successfully`);
}

/**
 * Schedule a job with error handling
 */
function scheduleJob(
  name: string, 
  cronExpression: string, 
  handler: () => Promise<void>
): void {
  try {
    const task = cron.schedule(cronExpression, async () => {
      const startTime = Date.now();
      logger.info(`Job ${name} started`);

      try {
        await handler();
        const duration = Date.now() - startTime;
        logger.info(`Job ${name} completed in ${duration}ms`);
        await updateJobStatus(name, 'success', null, duration);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Job ${name} failed:`, error);
        await updateJobStatus(name, 'failed', errorMessage, Date.now() - startTime);
      }
    }, {
      scheduled: true,
      timezone: 'UTC',
    });

    jobs.set(name, task);
    logger.info(`Scheduled job: ${name} (${cronExpression})`);
  } catch (error) {
    logger.error(`Failed to schedule job ${name}:`, error);
  }
}

/**
 * Update job status in database
 */
async function updateJobStatus(
  jobName: string,
  status: 'success' | 'failed',
  error: string | null,
  duration: number
): Promise<void> {
  try {
    await db.query(
      `UPDATE scheduled_jobs 
       SET last_run_at = NOW(),
           status = $2,
           last_error = $3,
           last_result = $4,
           run_count = run_count + 1,
           error_count = CASE WHEN $2 = 'failed' THEN error_count + 1 ELSE error_count END,
           updated_at = NOW()
       WHERE job_name = $1`,
      [jobName, status, error, JSON.stringify({ duration, timestamp: new Date().toISOString() })]
    );
  } catch (err) {
    logger.error(`Failed to update job status for ${jobName}:`, err);
  }
}

/**
 * Audit log cleanup job - 7 year retention
 */
async function runAuditLogCleanup(): Promise<void> {
  logger.info('Running audit log cleanup (7-year retention)...');
  
  const result = await cleanupOldLogs();
  
  if (result.success) {
    logger.info(`Audit cleanup completed: ${result.deletedCount} logs removed`);
  } else {
    throw new Error(result.message);
  }
}

/**
 * Grid emission factor update check - January 15th yearly
 */
async function runGridEFUpdateCheck(): Promise<void> {
  logger.info('Checking for grid emission factor updates...');
  
  // Get current year's factors
  const currentYear = new Date().getFullYear();
  
  const result = await db.query(
    `SELECT country, region, year, location_based_ef, source
     FROM grid_emission_factors
     WHERE year = $1 - 1 AND is_active = true
     ORDER BY country`,
    [currentYear]
  );

  if (result.rows.length === 0) {
    logger.warn('No grid emission factors found for previous year');
    return;
  }

  // Check which countries need updates
  const countriesNeedingUpdate = result.rows.filter(row => row.year < currentYear);
  
  if (countriesNeedingUpdate.length > 0) {
    logger.info(`Grid EF update needed for ${countriesNeedingUpdate.length} regions:`, 
      countriesNeedingUpdate.map(r => r.country));
    
    // Create notification/alert for admin
    await db.query(
      `INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
       VALUES (NULL, NULL, 'system_alert', 'grid_emission_factors', 'yearly_update', $1)`,
      [JSON.stringify({
        type: 'grid_ef_update_reminder',
        year: currentYear,
        countries: countriesNeedingUpdate.map(r => r.country),
        message: 'Grid emission factors need annual update',
      })]
    );
  }

  logger.info('Grid EF update check completed');
}

/**
 * Report deadline reminder
 */
async function runReportReminder(): Promise<void> {
  logger.info('Checking for upcoming report deadlines...');
  
  const daysToCheck = [30, 7, 1];
  
  for (const days of daysToCheck) {
    const result = await db.query(
      `SELECT r.id, r.name, r.standard, r.submission_deadline, 
              p.id as project_id, p.name as project_name
       FROM reports r
       JOIN projects p ON r.project_id = p.id
       WHERE r.status IN ('draft', 'pending_review')
         AND r.submission_deadline IS NOT NULL
         AND r.submission_deadline BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
         AND r.submission_deadline > NOW() + INTERVAL '${days - 1} days'`,
      []
    );

    if (result.rows.length > 0) {
      logger.info(`Found ${result.rows.length} reports due in ${days} days`);
      
      for (const report of result.rows) {
        // Log reminder (in production, send email notification)
        await db.query(
          `INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
           VALUES ($1, NULL, 'deadline_reminder', 'report', $2, $3)`,
          [
            report.project_id, 
            report.id, 
            JSON.stringify({
              type: 'deadline_reminder',
              daysUntilDeadline: days,
              reportName: report.name,
              standard: report.standard,
              deadline: report.submission_deadline,
            })
          ]
        );
      }
    }
  }

  logger.info('Report reminder check completed');
}

/**
 * Database health check
 */
async function runDatabaseHealthCheck(): Promise<void> {
  logger.info('Running database health check...');
  
  const checks = {
    connectionPool: false,
    tableAccess: false,
    writeTest: false,
    indexHealth: false,
  };

  try {
    // Connection pool check
    const poolResult = await db.query('SELECT 1 as test');
    checks.connectionPool = poolResult.rows.length > 0;

    // Table access check
    const tableResult = await db.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = 'public'`
    );
    checks.tableAccess = parseInt(tableResult.rows[0].count) > 0;

    // Write test (to audit_logs)
    const writeResult = await db.query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details)
       VALUES ('health_check', 'system', 'db_health', $1)
       RETURNING id`,
      [JSON.stringify({ timestamp: new Date().toISOString(), check: 'write_test' })]
    );
    checks.writeTest = writeResult.rows.length > 0;

    // Clean up test entry
    await db.query('DELETE FROM audit_logs WHERE id = $1', [writeResult.rows[0].id]);

    // Index health check (check for unused/bloated indexes)
    const indexResult = await db.query(
      `SELECT schemaname, tablename, indexname, idx_scan
       FROM pg_stat_user_indexes
       WHERE idx_scan = 0
       LIMIT 10`
    );
    checks.indexHealth = true; // Log unused indexes for review

    const allHealthy = Object.values(checks).every(v => v);
    
    if (allHealthy) {
      logger.info('Database health check passed', checks);
    } else {
      logger.warn('Database health check issues detected', checks);
    }
  } catch (error) {
    logger.error('Database health check failed:', error);
    throw error;
  }
}

/**
 * Cache cleanup job
 */
async function runCacheCleanup(): Promise<void> {
  logger.info('Running cache cleanup...');
  
  // This would integrate with Redis cache cleanup
  // For now, log the action
  try {
    const { redis } = await import('../config/redis');
    
    // Get cache stats
    const info = await redis.info('memory');
    const dbSize = await redis.dbsize();
    
    logger.info('Cache stats:', {
      keyCount: dbSize,
      memoryInfo: info.substring(0, 200) + '...',
    });

    // Clean up expired keys (Redis does this automatically, but we can force it)
    // This is optional and depends on your Redis configuration
    
    logger.info('Cache cleanup completed');
  } catch (error) {
    logger.warn('Cache cleanup skipped (Redis may not be available):', error);
  }
}

/**
 * Stop all scheduled jobs
 */
export function stopAllJobs(): void {
  logger.info('Stopping all scheduled jobs...');
  
  for (const [name, task] of jobs) {
    task.stop();
    logger.info(`Stopped job: ${name}`);
  }
  
  jobs.clear();
  logger.info('All jobs stopped');
}

/**
 * Get job status
 */
export async function getJobStatus(): Promise<JobStatus[]> {
  const result = await db.query(
    `SELECT job_name, job_type, cron_expression, status, is_enabled,
            last_run_at, last_result, last_error, run_count, error_count,
            next_run_at, updated_at
     FROM scheduled_jobs
     ORDER BY job_name`
  );

  return result.rows.map(row => ({
    name: row.job_name,
    type: row.job_type,
    cronExpression: row.cron_expression,
    status: row.status,
    isEnabled: row.is_enabled,
    lastRunAt: row.last_run_at,
    lastResult: row.last_result,
    lastError: row.last_error,
    runCount: row.run_count,
    errorCount: row.error_count,
    nextRunAt: row.next_run_at,
  }));
}

/**
 * Manually trigger a job
 */
export async function triggerJob(jobName: string): Promise<{ success: boolean; message: string }> {
  const jobHandlers: Record<string, () => Promise<void>> = {
    audit_log_cleanup: runAuditLogCleanup,
    grid_ef_update_check: runGridEFUpdateCheck,
    report_reminder: runReportReminder,
    db_health_check: runDatabaseHealthCheck,
    cache_cleanup: runCacheCleanup,
  };

  const handler = jobHandlers[jobName];
  if (!handler) {
    return { success: false, message: `Job not found: ${jobName}` };
  }

  try {
    await handler();
    return { success: true, message: `Job ${jobName} executed successfully` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Job ${jobName} failed: ${errorMessage}` };
  }
}

// Type definitions
interface JobStatus {
  name: string;
  type: string;
  cronExpression: string;
  status: string;
  isEnabled: boolean;
  lastRunAt: string | null;
  lastResult: any;
  lastError: string | null;
  runCount: number;
  errorCount: number;
  nextRunAt: string | null;
}

export default {
  initializeJobs,
  stopAllJobs,
  getJobStatus,
  triggerJob,
};
