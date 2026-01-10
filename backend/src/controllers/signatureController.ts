import { Request, Response } from 'express';
import { db } from '../config/database';
import { config } from '../config/env';
import { generateId } from '../utils/helpers';
import { NotFoundError, BadRequestError, ForbiddenError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import * as signatureService from '../services/signatureService';
import type { AuditAction } from '../types';

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
 * Sign a report
 */
export async function signReport(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const { reportId, signatureType, comments, declarationText } = req.body;

  // Verify user role is authorized for signing
  const authorizedRoles = config.signature.authorizedRoles;
  if (!authorizedRoles.includes(userRole)) {
    throw new ForbiddenError(`Your role (${userRole}) is not authorized to sign reports. Authorized roles: ${authorizedRoles.join(', ')}`);
  }

  // Get report
  const reportResult = await db.query(
    `SELECT r.*, p.name as project_name
     FROM reports r
     JOIN projects p ON r.project_id = p.id
     WHERE r.id = $1`,
    [reportId]
  );

  if (reportResult.rows.length === 0) {
    throw new NotFoundError('Report not found');
  }

  const report = reportResult.rows[0];

  // Check if report is already signed
  if (report.status === 'signed') {
    throw new BadRequestError('Report is already signed');
  }

  // Check if report has validation errors
  if (report.validation_errors && report.validation_errors.length > 0) {
    throw new BadRequestError('Cannot sign a report with validation errors. Please resolve errors first.');
  }

  // Check if standard requires signature (K-ESG, MAFF)
  const standardsRequiringSignature = ['k_esg', 'maff_esg'];
  const requiresSpecialSignature = standardsRequiringSignature.includes(report.standard);

  // Generate signature
  const signatureId = generateId();
  const signatureData = await signatureService.generateSignature(
    userId,
    reportId,
    report.report_data,
    signatureType || 'approval'
  );

  // Save signature
  await db.query(
    `INSERT INTO signatures (
      id, report_id, user_id, signature_type, signature_hash, 
      signature_data, declaration_text, comments
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      signatureId,
      reportId,
      userId,
      signatureType || 'approval',
      signatureData.hash,
      JSON.stringify(signatureData),
      declarationText || getDefaultDeclaration(report.standard),
      comments,
    ]
  );

  // Update report status
  await db.query(
    `UPDATE reports SET 
       status = 'signed',
       signed_at = NOW(),
       signed_by = $1,
       signature_id = $2,
       updated_at = NOW()
     WHERE id = $3`,
    [userId, signatureId, reportId]
  );

  await logAudit(userId, 'SIGN_REPORT', 'signature', signatureId, {
    reportId,
    standard: report.standard,
    signatureType: signatureType || 'approval',
  }, report.project_id);

  res.status(201).json({
    success: true,
    data: {
      id: signatureId,
      reportId,
      signatureType: signatureType || 'approval',
      signatureHash: signatureData.hash,
      signedAt: new Date().toISOString(),
      signedBy: {
        id: userId,
        name: req.user!.name,
        role: userRole,
      },
      verification: {
        valid: true,
        timestamp: new Date().toISOString(),
      },
    },
  });
}

/**
 * Verify a signature
 */
export async function verifySignature(req: Request, res: Response): Promise<void> {
  const { reportId } = req.params;

  // Get report with signature
  const reportResult = await db.query(
    `SELECT r.*, s.id as signature_id, s.signature_hash, s.signature_data,
            s.created_at as signed_at, u.name as signer_name, u.role as signer_role
     FROM reports r
     LEFT JOIN signatures s ON r.signature_id = s.id
     LEFT JOIN users u ON s.user_id = u.id
     WHERE r.id = $1`,
    [reportId]
  );

  if (reportResult.rows.length === 0) {
    throw new NotFoundError('Report not found');
  }

  const report = reportResult.rows[0];

  if (!report.signature_id) {
    res.json({
      success: true,
      data: {
        isSigned: false,
        message: 'Report has not been signed',
      },
    });
    return;
  }

  // Verify signature
  const verification = await signatureService.verifySignature(
    report.signature_hash,
    report.report_data,
    report.signature_data
  );

  res.json({
    success: true,
    data: {
      isSigned: true,
      signatureId: report.signature_id,
      signedAt: report.signed_at,
      signer: {
        name: report.signer_name,
        role: report.signer_role,
      },
      verification: {
        valid: verification.valid,
        timestamp: verification.timestamp,
        message: verification.message,
      },
    },
  });
}

/**
 * Get signatures for a project
 */
export async function getProjectSignatures(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const countResult = await db.query(
    `SELECT COUNT(*) FROM signatures s
     JOIN reports r ON s.report_id = r.id
     WHERE r.project_id = $1`,
    [projectId]
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await db.query(
    `SELECT s.*, r.standard, r.format, u.name as signer_name, u.email as signer_email, u.role as signer_role
     FROM signatures s
     JOIN reports r ON s.report_id = r.id
     JOIN users u ON s.user_id = u.id
     WHERE r.project_id = $1
     ORDER BY s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [projectId, Number(limit), offset]
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      reportId: row.report_id,
      standard: row.standard,
      format: row.format,
      signatureType: row.signature_type,
      signatureHash: row.signature_hash,
      signer: {
        name: row.signer_name,
        email: row.signer_email,
        role: row.signer_role,
      },
      declarationText: row.declaration_text,
      comments: row.comments,
      isRevoked: row.is_revoked,
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
 * Get signature details
 */
export async function getSignature(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const result = await db.query(
    `SELECT s.*, r.standard, r.format, r.project_id,
            u.name as signer_name, u.email as signer_email, u.role as signer_role
     FROM signatures s
     JOIN reports r ON s.report_id = r.id
     JOIN users u ON s.user_id = u.id
     WHERE s.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Signature not found');
  }

  const row = result.rows[0];

  res.json({
    success: true,
    data: {
      id: row.id,
      reportId: row.report_id,
      projectId: row.project_id,
      standard: row.standard,
      format: row.format,
      signatureType: row.signature_type,
      signatureHash: row.signature_hash,
      signer: {
        id: row.user_id,
        name: row.signer_name,
        email: row.signer_email,
        role: row.signer_role,
      },
      declarationText: row.declaration_text,
      comments: row.comments,
      isRevoked: row.is_revoked,
      revokedAt: row.revoked_at,
      revokedReason: row.revoked_reason,
      createdAt: row.created_at,
    },
  });
}

/**
 * Revoke a signature
 */
export async function revokeSignature(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const { reason } = req.body;

  // Get signature
  const signatureResult = await db.query(
    `SELECT s.*, r.project_id, r.status as report_status
     FROM signatures s
     JOIN reports r ON s.report_id = r.id
     WHERE s.id = $1`,
    [id]
  );

  if (signatureResult.rows.length === 0) {
    throw new NotFoundError('Signature not found');
  }

  const signature = signatureResult.rows[0];

  // Check if already revoked
  if (signature.is_revoked) {
    throw new BadRequestError('Signature is already revoked');
  }

  // Verify user is authorized (must be signer or owner)
  if (signature.user_id !== userId && req.user!.role !== 'owner') {
    throw new ForbiddenError('You can only revoke your own signatures');
  }

  // Revoke signature
  await db.query(
    `UPDATE signatures SET
       is_revoked = true,
       revoked_at = NOW(),
       revoked_by = $1,
       revoked_reason = $2
     WHERE id = $3`,
    [userId, reason || 'No reason provided', id]
  );

  // Update report status back to generated
  await db.query(
    `UPDATE reports SET
       status = 'generated',
       signed_at = NULL,
       signed_by = NULL,
       signature_id = NULL,
       updated_at = NOW()
     WHERE id = $1`,
    [signature.report_id]
  );

  await logAudit(userId, 'REVOKE_SIGNATURE', 'signature', id, {
    reportId: signature.report_id,
    reason,
  }, signature.project_id);

  res.json({
    success: true,
    message: 'Signature revoked successfully',
    data: {
      id,
      revokedAt: new Date().toISOString(),
      reason: reason || 'No reason provided',
    },
  });
}

// Helper function to get default declaration text by standard
function getDefaultDeclaration(standard: string): string {
  const declarations: Record<string, string> = {
    eu_cbam: 'I hereby declare that the information provided in this EU CBAM report is accurate and complete to the best of my knowledge.',
    uk_cbam: 'I hereby declare that the information provided in this UK CBAM report is accurate and complete to the best of my knowledge.',
    china_carbon: 'I hereby declare that the information provided in this China Carbon Market report is accurate and complete to the best of my knowledge.',
    k_esg: '본 보고서에 기재된 모든 정보가 정확하고 완전함을 선언합니다. (I hereby declare that all information in this K-ESG report is accurate and complete.)',
    maff_esg: '本報告書に記載された情報が正確かつ完全であることを宣言します。(I hereby declare that the information in this MAFF ESG report is accurate and complete.)',
    thai_esg: 'ข้าพเจ้าขอรับรองว่าข้อมูลในรายงานนี้ถูกต้องและครบถ้วน (I hereby declare that the information in this Thai-ESG report is accurate and complete.)',
  };

  return declarations[standard] || 'I hereby declare that the information provided in this report is accurate and complete to the best of my knowledge.';
}
