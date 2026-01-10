import { Request, Response } from 'express';
import { db } from '../config/database';
import { redisClient as redis } from '../config/redis';
import { generateId, roundTo } from '../utils/helpers';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import * as reportService from '../services/reportService';
import type { ReportStandard, ReportStatus, AuditAction } from '../types';

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
 * Generate a report for a specific standard
 */
export async function generateReport(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const userId = req.user!.id;
  const { standard, format, options } = req.body;

  // Get project details
  const projectResult = await db.query(
    `SELECT * FROM projects WHERE id = $1`,
    [projectId]
  );

  if (projectResult.rows.length === 0) {
    throw new NotFoundError('Project not found');
  }

  const project = projectResult.rows[0];

  // Check if standard is in project's reporting standards
  if (!project.reporting_standards.includes(standard)) {
    throw new BadRequestError(`Standard ${standard} is not configured for this project`);
  }

  // Check for required data
  const activityCount = await db.query(
    `SELECT COUNT(*) FROM activities WHERE project_id = $1 AND calculation_status = 'calculated'`,
    [projectId]
  );

  if (parseInt(activityCount.rows[0].count) === 0) {
    throw new BadRequestError('No calculated activities found. Please calculate emissions first.');
  }

  // Generate report
  const reportId = generateId();
  const reportData = await reportService.generateReportData(projectId, standard, options);

  // Validate report data against standard requirements
  const validation = await reportService.validateReportData(reportData, standard);
  
  // Check for missing required fields
  if (validation.missingRequired.length > 0) {
    logger.warn(`Report ${reportId} missing required fields:`, validation.missingRequired);
  }

  // Generate file(s)
  const files = await reportService.generateReportFiles(reportData, format || 'pdf', standard);

  // Save report record
  await db.query(
    `INSERT INTO reports (
      id, project_id, standard, format, status, report_data, file_path,
      validation_warnings, validation_errors, generated_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      reportId,
      projectId,
      standard,
      format || 'pdf',
      validation.errors.length > 0 ? 'draft' : 'generated',
      JSON.stringify(reportData),
      files.filePath,
      JSON.stringify(validation.warnings),
      JSON.stringify(validation.errors),
      userId,
    ]
  );

  await logAudit(userId, 'GENERATE_REPORT', 'report', reportId, {
    standard,
    format: format || 'pdf',
    hasWarnings: validation.warnings.length > 0,
    hasErrors: validation.errors.length > 0,
  }, projectId);

  res.status(201).json({
    success: true,
    data: {
      id: reportId,
      standard,
      format: format || 'pdf',
      status: validation.errors.length > 0 ? 'draft' : 'generated',
      validation: {
        warnings: validation.warnings,
        errors: validation.errors,
        missingRequired: validation.missingRequired,
      },
      filePath: files.filePath,
      createdAt: new Date().toISOString(),
    },
  });
}

/**
 * Generate reports for multiple standards (batch)
 */
export async function generateBatchReports(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const userId = req.user!.id;
  const { standards, format, options } = req.body;

  // Get project
  const projectResult = await db.query(
    `SELECT * FROM projects WHERE id = $1`,
    [projectId]
  );

  if (projectResult.rows.length === 0) {
    throw new NotFoundError('Project not found');
  }

  const project = projectResult.rows[0];

  // Validate standards
  const validStandards = standards.filter((s: string) => project.reporting_standards.includes(s));
  const invalidStandards = standards.filter((s: string) => !project.reporting_standards.includes(s));

  if (validStandards.length === 0) {
    throw new BadRequestError('None of the specified standards are configured for this project');
  }

  const results = {
    generated: [] as any[],
    errors: [] as any[],
    warnings: [] as any[],
  };

  // Check for overlapping data requirements
  const overlappingFields = await reportService.getOverlappingFields(validStandards);
  if (Object.keys(overlappingFields.conflicts).length > 0) {
    results.warnings.push({
      type: 'data_conflicts',
      message: 'Some standards have conflicting data requirements',
      details: overlappingFields.conflicts,
    });
  }

  // Generate each report
  for (const standard of validStandards) {
    try {
      const reportId = generateId();
      const reportData = await reportService.generateReportData(projectId, standard, options);
      const validation = await reportService.validateReportData(reportData, standard);
      const files = await reportService.generateReportFiles(reportData, format || 'pdf', standard);

      await db.query(
        `INSERT INTO reports (
          id, project_id, standard, format, status, report_data, file_path,
          validation_warnings, validation_errors, generated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          reportId,
          projectId,
          standard,
          format || 'pdf',
          validation.errors.length > 0 ? 'draft' : 'generated',
          JSON.stringify(reportData),
          files.filePath,
          JSON.stringify(validation.warnings),
          JSON.stringify(validation.errors),
          userId,
        ]
      );

      results.generated.push({
        id: reportId,
        standard,
        status: validation.errors.length > 0 ? 'draft' : 'generated',
        warnings: validation.warnings,
        errors: validation.errors,
      });
    } catch (error: any) {
      results.errors.push({
        standard,
        error: error.message,
      });
    }
  }

  if (invalidStandards.length > 0) {
    results.warnings.push({
      type: 'invalid_standards',
      message: 'Some standards are not configured for this project',
      standards: invalidStandards,
    });
  }

  await logAudit(userId, 'BATCH_GENERATE_REPORT', 'report', null, {
    standards: validStandards,
    generated: results.generated.length,
    errors: results.errors.length,
  }, projectId);

  res.status(201).json({
    success: true,
    data: {
      ...results,
      summary: {
        requested: standards.length,
        generated: results.generated.length,
        failed: results.errors.length,
        warnings: results.warnings.length,
      },
    },
  });
}

/**
 * Get all reports for a project
 */
export async function getReports(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { standard, status, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClause = 'WHERE project_id = $1';
  const params: any[] = [projectId];
  let paramIndex = 2;

  if (standard) {
    whereClause += ` AND standard = $${paramIndex}`;
    params.push(standard);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  const countResult = await db.query(
    `SELECT COUNT(*) FROM reports ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  params.push(Number(limit), offset);
  const result = await db.query(
    `SELECT r.*, u.name as generated_by_name
     FROM reports r
     LEFT JOIN users u ON r.generated_by = u.id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      standard: row.standard,
      format: row.format,
      status: row.status,
      validationWarnings: row.validation_warnings,
      validationErrors: row.validation_errors,
      generatedBy: row.generated_by_name,
      signedAt: row.signed_at,
      signedBy: row.signed_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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
 * Get a single report
 */
export async function getReport(req: Request, res: Response): Promise<void> {
  const { projectId, reportId } = req.params;

  const result = await db.query(
    `SELECT r.*, u.name as generated_by_name, s.name as signed_by_name
     FROM reports r
     LEFT JOIN users u ON r.generated_by = u.id
     LEFT JOIN users s ON r.signed_by = s.id
     WHERE r.id = $1 AND r.project_id = $2`,
    [reportId, projectId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Report not found');
  }

  const row = result.rows[0];

  res.json({
    success: true,
    data: {
      id: row.id,
      standard: row.standard,
      format: row.format,
      status: row.status,
      reportData: row.report_data,
      filePath: row.file_path,
      validationWarnings: row.validation_warnings,
      validationErrors: row.validation_errors,
      generatedBy: row.generated_by_name,
      signedAt: row.signed_at,
      signedBy: row.signed_by_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
}

/**
 * Download report file
 */
export async function downloadReport(req: Request, res: Response): Promise<void> {
  const { projectId, reportId } = req.params;

  const result = await db.query(
    `SELECT r.*, p.name as project_name
     FROM reports r
     JOIN projects p ON r.project_id = p.id
     WHERE r.id = $1 AND r.project_id = $2`,
    [reportId, projectId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Report not found');
  }

  const report = result.rows[0];

  if (!report.file_path) {
    throw new BadRequestError('Report file not available');
  }

  // Generate filename
  const safeProjectName = report.project_name.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date(report.created_at).toISOString().split('T')[0];
  const filename = `${safeProjectName}_${report.standard}_${timestamp}.${report.format}`;

  res.download(report.file_path, filename);
}

/**
 * Update report status
 */
export async function updateReportStatus(req: Request, res: Response): Promise<void> {
  const { projectId, reportId } = req.params;
  const userId = req.user!.id;
  const { status } = req.body;

  const result = await db.query(
    `UPDATE reports SET status = $1, updated_at = NOW() 
     WHERE id = $2 AND project_id = $3
     RETURNING *`,
    [status, reportId, projectId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Report not found');
  }

  await logAudit(userId, 'UPDATE_REPORT_STATUS', 'report', reportId, { status }, projectId);

  res.json({
    success: true,
    data: {
      id: result.rows[0].id,
      status: result.rows[0].status,
      updatedAt: result.rows[0].updated_at,
    },
  });
}

/**
 * Regenerate a report
 */
export async function regenerateReport(req: Request, res: Response): Promise<void> {
  const { projectId, reportId } = req.params;
  const userId = req.user!.id;
  const { options } = req.body;

  // Get existing report
  const existingReport = await db.query(
    `SELECT * FROM reports WHERE id = $1 AND project_id = $2`,
    [reportId, projectId]
  );

  if (existingReport.rows.length === 0) {
    throw new NotFoundError('Report not found');
  }

  const report = existingReport.rows[0];

  // Cannot regenerate signed reports
  if (report.status === 'signed') {
    throw new BadRequestError('Cannot regenerate a signed report');
  }

  // Generate new report data
  const reportData = await reportService.generateReportData(projectId, report.standard, options);
  const validation = await reportService.validateReportData(reportData, report.standard);
  const files = await reportService.generateReportFiles(reportData, report.format, report.standard);

  // Update report
  await db.query(
    `UPDATE reports SET
       report_data = $1,
       file_path = $2,
       validation_warnings = $3,
       validation_errors = $4,
       status = $5,
       updated_at = NOW()
     WHERE id = $6`,
    [
      JSON.stringify(reportData),
      files.filePath,
      JSON.stringify(validation.warnings),
      JSON.stringify(validation.errors),
      validation.errors.length > 0 ? 'draft' : 'generated',
      reportId,
    ]
  );

  await logAudit(userId, 'REGENERATE_REPORT', 'report', reportId, {
    standard: report.standard,
  }, projectId);

  res.json({
    success: true,
    data: {
      id: reportId,
      standard: report.standard,
      format: report.format,
      status: validation.errors.length > 0 ? 'draft' : 'generated',
      validation: {
        warnings: validation.warnings,
        errors: validation.errors,
      },
      updatedAt: new Date().toISOString(),
    },
  });
}

/**
 * Delete a report
 */
export async function deleteReport(req: Request, res: Response): Promise<void> {
  const { projectId, reportId } = req.params;
  const userId = req.user!.id;

  // Check if report is signed
  const existingReport = await db.query(
    `SELECT status FROM reports WHERE id = $1 AND project_id = $2`,
    [reportId, projectId]
  );

  if (existingReport.rows.length === 0) {
    throw new NotFoundError('Report not found');
  }

  if (existingReport.rows[0].status === 'signed') {
    throw new BadRequestError('Cannot delete a signed report');
  }

  await db.query(
    `DELETE FROM reports WHERE id = $1 AND project_id = $2`,
    [reportId, projectId]
  );

  await logAudit(userId, 'DELETE', 'report', reportId, {}, projectId);

  res.json({
    success: true,
    message: 'Report deleted successfully',
  });
}

/**
 * Preview report data without generating file
 */
export async function previewReport(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { standard, options } = req.body;

  // Get project
  const projectResult = await db.query(
    `SELECT * FROM projects WHERE id = $1`,
    [projectId]
  );

  if (projectResult.rows.length === 0) {
    throw new NotFoundError('Project not found');
  }

  // Generate report data without file
  const reportData = await reportService.generateReportData(projectId, standard, options);
  const validation = await reportService.validateReportData(reportData, standard);

  res.json({
    success: true,
    data: {
      standard,
      reportData,
      validation: {
        warnings: validation.warnings,
        errors: validation.errors,
        missingRequired: validation.missingRequired,
        completeness: validation.completeness,
      },
    },
  });
}

/**
 * Get report requirements for a standard
 */
export async function getReportRequirements(req: Request, res: Response): Promise<void> {
  const { standard } = req.params;

  const requirements = await reportService.getStandardRequirements(standard as ReportStandard);

  res.json({
    success: true,
    data: requirements,
  });
}

/**
 * Batch generate reports (alias for generateBatchReports for route compatibility)
 */
export async function batchGenerateReports(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { projectId, standards, format, options } = req.body;

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  if (!standards || !Array.isArray(standards) || standards.length === 0) {
    throw new BadRequestError('Standards array is required');
  }

  // Create batch record
  const batchId = generateId();
  const batchStatus = {
    id: batchId,
    projectId,
    standards,
    format: format || 'pdf',
    status: 'processing',
    progress: 0,
    totalReports: standards.length,
    generatedReports: 0,
    errors: [] as any[],
    createdAt: new Date().toISOString(),
  };

  // Store batch status in Redis for tracking
  await redis.set(`batch:${batchId}`, JSON.stringify(batchStatus), 3600); // 1 hour expiry

  // Get project
  const projectResult = await db.query(
    `SELECT * FROM projects WHERE id = $1`,
    [projectId]
  );

  if (projectResult.rows.length === 0) {
    throw new NotFoundError('Project not found');
  }

  const project = projectResult.rows[0];
  const validStandards = standards.filter((s: string) => project.reporting_standards.includes(s));

  const results = {
    generated: [] as any[],
    errors: [] as any[],
  };

  // Generate each report
  for (let i = 0; i < validStandards.length; i++) {
    const standard = validStandards[i];
    try {
      const reportId = generateId();
      const reportData = await reportService.generateReportData(projectId, standard, options);
      const validation = await reportService.validateReportData(reportData, standard);
      const files = await reportService.generateReportFiles(reportData, format || 'pdf', standard);

      await db.query(
        `INSERT INTO reports (
          id, project_id, standard, format, status, report_data, file_path,
          validation_warnings, validation_errors, generated_by, batch_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          reportId, projectId, standard, format || 'pdf',
          validation.errors.length > 0 ? 'draft' : 'generated',
          JSON.stringify(reportData), files.filePath,
          JSON.stringify(validation.warnings), JSON.stringify(validation.errors),
          userId, batchId
        ]
      );

      results.generated.push({ id: reportId, standard });

      // Update batch progress
      batchStatus.generatedReports = i + 1;
      batchStatus.progress = Math.round(((i + 1) / standards.length) * 100);
      await redis.set(`batch:${batchId}`, JSON.stringify(batchStatus), 3600);
    } catch (error: any) {
      results.errors.push({ standard, error: error.message });
      batchStatus.errors.push({ standard, error: error.message });
    }
  }

  // Finalize batch status
  batchStatus.status = results.errors.length === 0 ? 'completed' : 'completed_with_errors';
  batchStatus.progress = 100;
  await redis.set(`batch:${batchId}`, JSON.stringify(batchStatus), 3600);

  await logAudit(userId, 'BATCH_GENERATE_REPORT', 'report', batchId, {
    standards: validStandards,
    generated: results.generated.length,
    errors: results.errors.length,
  }, projectId);

  res.status(201).json({
    success: true,
    data: {
      batchId,
      ...results,
      summary: {
        requested: standards.length,
        generated: results.generated.length,
        failed: results.errors.length,
      },
    },
  });
}

/**
 * Get batch status
 */
export async function getBatchStatus(req: Request, res: Response): Promise<void> {
  const { batchId } = req.params;

  const cached = await redis.get(`batch:${batchId}`);

  if (!cached) {
    // Try to get from database
    const result = await db.query(
      `SELECT batch_id, COUNT(*) as total, 
              SUM(CASE WHEN status != 'error' THEN 1 ELSE 0 END) as completed
       FROM reports WHERE batch_id = $1 GROUP BY batch_id`,
      [batchId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Batch not found');
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        batchId,
        status: 'completed',
        progress: 100,
        totalReports: parseInt(row.total),
        generatedReports: parseInt(row.completed),
      },
    });
    return;
  }

  const batchStatus = JSON.parse(cached);

  res.json({
    success: true,
    data: batchStatus,
  });
}

/**
 * Get batch manifest (list of reports in batch)
 */
export async function getBatchManifest(req: Request, res: Response): Promise<void> {
  const { batchId } = req.params;

  const result = await db.query(
    `SELECT r.id, r.standard, r.format, r.status, r.file_path, r.created_at,
            r.validation_warnings, r.validation_errors, p.name as project_name
     FROM reports r
     JOIN projects p ON r.project_id = p.id
     WHERE r.batch_id = $1
     ORDER BY r.created_at`,
    [batchId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Batch not found or no reports generated');
  }

  res.json({
    success: true,
    data: {
      batchId,
      projectName: result.rows[0].project_name,
      reports: result.rows.map((row) => ({
        id: row.id,
        standard: row.standard,
        format: row.format,
        status: row.status,
        filePath: row.file_path,
        hasWarnings: row.validation_warnings?.length > 0,
        hasErrors: row.validation_errors?.length > 0,
        createdAt: row.created_at,
      })),
      summary: {
        total: result.rows.length,
        generated: result.rows.filter((r) => r.status === 'generated').length,
        draft: result.rows.filter((r) => r.status === 'draft').length,
        signed: result.rows.filter((r) => r.status === 'signed').length,
      },
    },
  });
}

/**
 * Get reports for a project (alias for getReports for route compatibility)
 */
export async function getProjectReports(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { standard, status, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClause = 'WHERE project_id = $1';
  const params: any[] = [projectId];
  let paramIndex = 2;

  if (standard) {
    whereClause += ` AND standard = $${paramIndex}`;
    params.push(standard);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  const countResult = await db.query(
    `SELECT COUNT(*) FROM reports ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  params.push(Number(limit), offset);
  const result = await db.query(
    `SELECT r.*, u.name as generated_by_name
     FROM reports r
     LEFT JOIN users u ON r.generated_by = u.id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      standard: row.standard,
      format: row.format,
      status: row.status,
      validationWarnings: row.validation_warnings,
      validationErrors: row.validation_errors,
      generatedBy: row.generated_by_name,
      signedAt: row.signed_at,
      signedBy: row.signed_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}
