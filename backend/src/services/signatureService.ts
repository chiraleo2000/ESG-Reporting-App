import * as crypto from 'crypto';
import { db } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Generate a digital signature for a report
 */
export async function generateSignature(
  userId: string,
  reportId: string,
  reportData: any,
  signatureType: string
): Promise<SignatureData> {
  // Create hash of report data
  const dataString = JSON.stringify(reportData);
  const contentHash = crypto.createHash('sha256').update(dataString).digest('hex');

  // Create signature payload
  const payload = {
    reportId,
    userId,
    contentHash,
    signatureType,
    timestamp: new Date().toISOString(),
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  // Create signature hash
  const signatureString = JSON.stringify(payload);
  const signatureHash = crypto.createHash('sha256').update(signatureString).digest('hex');

  return {
    hash: signatureHash,
    contentHash,
    payload,
    algorithm: 'sha256',
    version: '1.0',
  };
}

/**
 * Verify a signature against report data
 */
export async function verifySignature(
  signatureHash: string,
  reportData: any,
  signatureData: any
): Promise<VerificationResult> {
  try {
    // Verify content hash matches current report data
    const currentDataString = JSON.stringify(reportData);
    const currentContentHash = crypto.createHash('sha256').update(currentDataString).digest('hex');

    const parsedSignatureData = typeof signatureData === 'string' 
      ? JSON.parse(signatureData) 
      : signatureData;

    if (parsedSignatureData.contentHash !== currentContentHash) {
      return {
        valid: false,
        timestamp: new Date().toISOString(),
        message: 'Report data has been modified since signing',
        details: {
          expectedHash: parsedSignatureData.contentHash,
          currentHash: currentContentHash,
        },
      };
    }

    // Recreate and verify signature hash
    const payloadString = JSON.stringify(parsedSignatureData.payload);
    const expectedHash = crypto.createHash('sha256').update(payloadString).digest('hex');

    if (expectedHash !== signatureHash) {
      return {
        valid: false,
        timestamp: new Date().toISOString(),
        message: 'Signature hash verification failed',
      };
    }

    return {
      valid: true,
      timestamp: new Date().toISOString(),
      message: 'Signature verified successfully',
      details: {
        signedAt: parsedSignatureData.payload?.timestamp,
        signatureType: parsedSignatureData.payload?.signatureType,
      },
    };
  } catch (error) {
    logger.error('Signature verification error:', error);
    return {
      valid: false,
      timestamp: new Date().toISOString(),
      message: 'Signature verification failed due to an error',
    };
  }
}

/**
 * Validate that user is authorized to sign
 */
export async function validateSigningAuthority(
  userId: string,
  projectId: string,
  standard: string
): Promise<{ authorized: boolean; reason?: string }> {
  // Get user role in project
  const memberResult = await db.query(
    `SELECT pm.role, u.role as user_role
     FROM project_members pm
     JOIN users u ON pm.user_id = u.id
     WHERE pm.project_id = $1 AND pm.user_id = $2`,
    [projectId, userId]
  );

  if (memberResult.rows.length === 0) {
    return {
      authorized: false,
      reason: 'User is not a member of this project',
    };
  }

  const { role, user_role } = memberResult.rows[0];

  // Standards requiring specific authorization
  const strictStandards = ['k_esg', 'maff_esg'];
  const authorizedRoles = ['owner', 'director', 'auditor'];

  if (strictStandards.includes(standard)) {
    if (!authorizedRoles.includes(role) && !authorizedRoles.includes(user_role)) {
      return {
        authorized: false,
        reason: `Standard ${standard} requires signing by: ${authorizedRoles.join(', ')}`,
      };
    }
  }

  // Check if user is at least editor level
  const minRoles = ['owner', 'director', 'editor', 'auditor'];
  if (!minRoles.includes(role)) {
    return {
      authorized: false,
      reason: 'User role does not have signing authority',
    };
  }

  return { authorized: true };
}

/**
 * Get signature certificate data for display
 */
export function generateCertificateData(
  signatureId: string,
  signatureData: SignatureData,
  signerInfo: { name: string; email: string; role: string },
  reportInfo: { standard: string; reportingYear: number }
): CertificateData {
  return {
    certificateId: signatureId,
    issueDate: new Date().toISOString(),
    signatureHash: signatureData.hash,
    contentHash: signatureData.contentHash,
    signer: {
      name: signerInfo.name,
      email: signerInfo.email,
      role: signerInfo.role,
    },
    report: {
      standard: reportInfo.standard,
      reportingYear: reportInfo.reportingYear,
    },
    verification: {
      algorithm: signatureData.algorithm,
      version: signatureData.version,
      verificationUrl: `/api/v1/signatures/${signatureId}/verify`,
    },
  };
}

/**
 * Create audit-ready signature record
 */
export function createAuditRecord(
  signatureData: SignatureData,
  userId: string,
  reportId: string,
  action: 'sign' | 'verify' | 'revoke'
): AuditRecord {
  return {
    timestamp: new Date().toISOString(),
    action,
    userId,
    reportId,
    signatureHash: signatureData.hash,
    contentHash: signatureData.contentHash,
    metadata: {
      algorithm: signatureData.algorithm,
      version: signatureData.version,
      nonce: signatureData.payload.nonce,
    },
  };
}

// Type definitions
interface SignatureData {
  hash: string;
  contentHash: string;
  payload: {
    reportId: string;
    userId: string;
    contentHash: string;
    signatureType: string;
    timestamp: string;
    nonce: string;
  };
  algorithm: string;
  version: string;
}

interface VerificationResult {
  valid: boolean;
  timestamp: string;
  message: string;
  details?: Record<string, any>;
}

interface CertificateData {
  certificateId: string;
  issueDate: string;
  signatureHash: string;
  contentHash: string;
  signer: {
    name: string;
    email: string;
    role: string;
  };
  report: {
    standard: string;
    reportingYear: number;
  };
  verification: {
    algorithm: string;
    version: string;
    verificationUrl: string;
  };
}

interface AuditRecord {
  timestamp: string;
  action: 'sign' | 'verify' | 'revoke';
  userId: string;
  reportId: string;
  signatureHash: string;
  contentHash: string;
  metadata: Record<string, any>;
}
