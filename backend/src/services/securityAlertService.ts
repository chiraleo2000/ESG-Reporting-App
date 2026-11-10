/**
 * Security anomaly detection + alerts
 */
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { generateId } from '../utils/helpers';

export interface SecurityAlert {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  description?: string;
  userId?: string;
  projectId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  resolved: boolean;
  createdAt: string;
}

const THRESHOLDS = {
  failedLogins: { count: 10, windowMinutes: 15 },
  mfaFailures: { count: 5, windowMinutes: 15 },
  accessDenials: { count: 20, windowMinutes: 30 },
  exportSpikes: { count: 10, windowMinutes: 60 },
};

async function createAlert(input: {
  alertType: string;
  severity: string;
  title: string;
  description?: string;
  userId?: string;
  projectId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}): Promise<boolean> {
  // Deduplicate recent similar alerts (same type + user within 30m)
  const existing = await db.query(
    `SELECT id FROM security_alerts
     WHERE alert_type = $1
       AND COALESCE(user_id::text, '') = COALESCE($2, '')
       AND resolved = false
       AND created_at > NOW() - INTERVAL '30 minutes'
     LIMIT 1`,
    [input.alertType, input.userId || null]
  );
  if (existing.rows.length > 0) return false;

  await db.query(
    `INSERT INTO security_alerts (
      id, alert_type, severity, title, description, user_id, project_id, details, ip_address
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      generateId(),
      input.alertType,
      input.severity,
      input.title,
      input.description || null,
      input.userId || null,
      input.projectId || null,
      JSON.stringify(input.details || {}),
      input.ipAddress || null,
    ]
  );
  return true;
}

/**
 * Sliding-window anomaly scan over audit_logs
 */
export async function runAnomalyDetection(): Promise<{ alertsCreated: number }> {
  let alertsCreated = 0;

  try {
    // Failed logins by IP
    const failedLogins = await db.query(
      `SELECT ip_address, COUNT(*)::int AS count
       FROM audit_logs
       WHERE action = 'auth.login_failed'
         AND created_at > NOW() - make_interval(mins => $2::int)
       GROUP BY ip_address
       HAVING COUNT(*) >= $1`,
      [THRESHOLDS.failedLogins.count, THRESHOLDS.failedLogins.windowMinutes]
    );
    for (const row of failedLogins.rows) {
      const created = await createAlert({
        alertType: 'failed_login_spike',
        severity: 'high',
        title: 'Multiple failed login attempts',
        description: `${row.count} failed logins from ${row.ip_address || 'unknown'} in ${THRESHOLDS.failedLogins.windowMinutes}m`,
        details: { count: row.count, ip: row.ip_address },
        ipAddress: row.ip_address,
      });
      if (created) alertsCreated++;
    }

    // MFA failures by user
    const mfaFails = await db.query(
      `SELECT user_id, COUNT(*)::int AS count
       FROM audit_logs
       WHERE action = 'auth.mfa_failed'
         AND created_at > NOW() - make_interval(mins => $2::int)
       GROUP BY user_id
       HAVING COUNT(*) >= $1`,
      [THRESHOLDS.mfaFailures.count, THRESHOLDS.mfaFailures.windowMinutes]
    );
    for (const row of mfaFails.rows) {
      const created = await createAlert({
        alertType: 'mfa_failure_spike',
        severity: 'high',
        title: 'Repeated MFA failures',
        description: `${row.count} MFA failures for user ${row.user_id}`,
        userId: row.user_id,
        details: { count: row.count },
      });
      if (created) alertsCreated++;
    }

    // Cross-project access denials
    const denials = await db.query(
      `SELECT user_id, COUNT(*)::int AS count, COUNT(DISTINCT entity_id)::int AS projects
       FROM audit_logs
       WHERE action = 'auth.access_denied'
         AND created_at > NOW() - make_interval(mins => $2::int)
       GROUP BY user_id
       HAVING COUNT(*) >= $1`,
      [THRESHOLDS.accessDenials.count, THRESHOLDS.accessDenials.windowMinutes]
    );
    for (const row of denials.rows) {
      const created = await createAlert({
        alertType: 'access_denial_spike',
        severity: 'medium',
        title: 'Elevated access denials',
        description: `${row.count} denials across ${row.projects} projects`,
        userId: row.user_id,
        details: { count: row.count, projects: row.projects },
      });
      if (created) alertsCreated++;
    }

    // Bulk export spikes. Time window applies to every action match
    // (AND binds tighter than OR, so the predicate must wrap both branches).
    const exports = await db.query(
      `SELECT user_id, COUNT(*)::int AS count
       FROM audit_logs
       WHERE created_at > NOW() - make_interval(mins => $2::int)
         AND (
           action IN ('data.export', 'EXPORT', 'export')
           OR action ILIKE '%export%'
         )
       GROUP BY user_id
       HAVING COUNT(*) >= $1`,
      [THRESHOLDS.exportSpikes.count, THRESHOLDS.exportSpikes.windowMinutes]
    );
    for (const row of exports.rows) {
      const created = await createAlert({
        alertType: 'export_spike',
        severity: 'medium',
        title: 'Bulk data export activity',
        description: `${row.count} export actions in ${THRESHOLDS.exportSpikes.windowMinutes}m`,
        userId: row.user_id,
        details: { count: row.count },
      });
      if (created) alertsCreated++;
    }

    logger.info('Anomaly detection completed', { alertsCreated });
  } catch (error) {
    logger.error('Anomaly detection failed:', error);
    throw error;
  }

  return { alertsCreated };
}

export async function listAlerts(options: {
  page?: number;
  limit?: number;
  resolved?: boolean;
  severity?: string;
} = {}): Promise<{ alerts: SecurityAlert[]; total: number }> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 50, 100);
  const offset = (page - 1) * limit;
  const params: any[] = [];
  let where = 'WHERE 1=1';
  let idx = 1;

  if (options.resolved !== undefined) {
    where += ` AND resolved = $${idx}`;
    params.push(options.resolved);
    idx++;
  }
  if (options.severity) {
    where += ` AND severity = $${idx}`;
    params.push(options.severity);
    idx++;
  }

  const count = await db.query(`SELECT COUNT(*)::int AS total FROM security_alerts ${where}`, params);
  params.push(limit, offset);
  const result = await db.query(
    `SELECT * FROM security_alerts ${where}
     ORDER BY created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );

  return {
    total: count.rows[0].total,
    alerts: result.rows.map((row) => ({
      id: row.id,
      alertType: row.alert_type,
      severity: row.severity,
      title: row.title,
      description: row.description,
      userId: row.user_id,
      projectId: row.project_id,
      details: row.details,
      ipAddress: row.ip_address,
      resolved: row.resolved,
      createdAt: row.created_at,
    })),
  };
}

export async function resolveAlert(alertId: string, resolvedBy: string): Promise<boolean> {
  const result = await db.query(
    `UPDATE security_alerts
     SET resolved = true, resolved_at = NOW(), resolved_by = $2
     WHERE id = $1 AND resolved = false
     RETURNING id`,
    [alertId, resolvedBy]
  );
  return (result.rowCount || 0) > 0;
}

export async function getSecuritySummary(): Promise<{
  unresolved: number;
  bySeverity: Record<string, number>;
  failedAuthLast24h: number;
  sensitiveReadsLast24h: number;
}> {
  const unresolved = await db.query(
    `SELECT COUNT(*)::int AS c FROM security_alerts WHERE resolved = false`
  );
  const bySev = await db.query(
    `SELECT severity, COUNT(*)::int AS c FROM security_alerts WHERE resolved = false GROUP BY severity`
  );
  const failedAuth = await db.query(
    `SELECT COUNT(*)::int AS c FROM audit_logs
     WHERE action IN ('auth.login_failed', 'auth.mfa_failed')
       AND created_at > NOW() - INTERVAL '24 hours'`
  );
  const sensitive = await db.query(
    `SELECT COUNT(*)::int AS c FROM audit_logs
     WHERE action IN ('data_source.read_config', 'sensitive.read', 'data.export', 'member.invite')
       AND created_at > NOW() - INTERVAL '24 hours'`
  );

  const bySeverity: Record<string, number> = {};
  for (const row of bySev.rows) bySeverity[row.severity] = row.c;

  return {
    unresolved: unresolved.rows[0].c,
    bySeverity,
    failedAuthLast24h: failedAuth.rows[0].c,
    sensitiveReadsLast24h: sensitive.rows[0].c,
  };
}
