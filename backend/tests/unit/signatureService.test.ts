/**
 * Signature Service Unit Tests
 * Tests generateSignature, verifySignature, validateSigningAuthority, generateCertificateData
 */
import * as crypto from 'crypto';

jest.mock('../../src/config/database', () => ({
  db: { query: jest.fn() },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { db } from '../../src/config/database';
import {
  generateSignature, verifySignature, validateSigningAuthority,
  generateCertificateData, createAuditRecord,
} from '../../src/services/signatureService';

const mockDb = db as jest.Mocked<typeof db>;

describe('Signature Service', () => {
  beforeEach(() => jest.clearAllMocks());

  // ===================== GENERATE SIGNATURE =====================
  describe('generateSignature', () => {
    it('should generate a valid signature with hash', async () => {
      const result = await generateSignature('user-1', 'rpt-1', { data: 'test' }, 'approval');

      expect(result).toEqual(expect.objectContaining({
        hash: expect.any(String),
        contentHash: expect.any(String),
        algorithm: 'sha256',
        version: '1.0',
        payload: expect.objectContaining({
          reportId: 'rpt-1',
          userId: 'user-1',
          signatureType: 'approval',
          nonce: expect.any(String),
        }),
      }));
      expect(result.hash.length).toBe(64); // SHA-256 hex = 64 chars
    });

    it('should produce different signatures for different data', async () => {
      const sig1 = await generateSignature('user-1', 'rpt-1', { a: 1 }, 'approval');
      const sig2 = await generateSignature('user-1', 'rpt-1', { a: 2 }, 'approval');

      expect(sig1.contentHash).not.toBe(sig2.contentHash);
    });

    it('should produce different nonces each time', async () => {
      const sig1 = await generateSignature('user-1', 'rpt-1', { data: 'same' }, 'approval');
      const sig2 = await generateSignature('user-1', 'rpt-1', { data: 'same' }, 'approval');

      expect(sig1.payload.nonce).not.toBe(sig2.payload.nonce);
      expect(sig1.hash).not.toBe(sig2.hash);
    });
  });

  // ===================== VERIFY SIGNATURE =====================
  describe('verifySignature', () => {
    it('should return valid for unmodified report', async () => {
      const reportData = { data: 'original' };
      const sig = await generateSignature('user-1', 'rpt-1', reportData, 'approval');

      const result = await verifySignature(sig.hash, reportData, sig);

      expect(result.valid).toBe(true);
      expect(result.message).toContain('verified successfully');
    });

    it('should detect modified report data', async () => {
      const originalData = { data: 'original' };
      const sig = await generateSignature('user-1', 'rpt-1', originalData, 'approval');

      const modifiedData = { data: 'tampered' };
      const result = await verifySignature(sig.hash, modifiedData, sig);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('modified since signing');
    });

    it('should handle string signature data', async () => {
      const reportData = { data: 'test' };
      const sig = await generateSignature('user-1', 'rpt-1', reportData, 'approval');

      const result = await verifySignature(sig.hash, reportData, JSON.stringify(sig));

      expect(result.valid).toBe(true);
    });

    it('should handle verification errors gracefully', async () => {
      const result = await verifySignature('invalid', {}, 'not-json{{{');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('failed due to an error');
    });
  });

  // ===================== VALIDATE SIGNING AUTHORITY =====================
  describe('validateSigningAuthority', () => {
    it('should authorize owner for any standard', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ role: 'owner', user_role: 'owner' }], rowCount: 1,
      });

      const result = await validateSigningAuthority('user-1', 'proj-1', 'eu_cbam');

      expect(result.authorized).toBe(true);
    });

    it('should reject non-member', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await validateSigningAuthority('ghost', 'proj-1', 'eu_cbam');

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('not a member');
    });

    it('should reject viewer for strict standards (k_esg)', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ role: 'viewer', user_role: 'viewer' }], rowCount: 1,
      });

      const result = await validateSigningAuthority('user-2', 'proj-1', 'k_esg');

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('requires signing by');
    });

    it('should reject viewer for non-strict standard', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ role: 'viewer', user_role: 'viewer' }], rowCount: 1,
      });

      const result = await validateSigningAuthority('user-2', 'proj-1', 'eu_cbam');

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('signing authority');
    });

    it('should authorize director for MAFF ESG', async () => {
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ role: 'director', user_role: 'director' }], rowCount: 1,
      });

      const result = await validateSigningAuthority('user-1', 'proj-1', 'maff_esg');

      expect(result.authorized).toBe(true);
    });
  });

  // ===================== GENERATE CERTIFICATE DATA =====================
  describe('generateCertificateData', () => {
    it('should generate complete certificate', () => {
      const sigData = {
        hash: 'abc123', contentHash: 'def456',
        payload: { reportId: 'rpt-1', userId: 'user-1', contentHash: 'def456', signatureType: 'approval', timestamp: '2025-01-01', nonce: 'xyz' },
        algorithm: 'sha256', version: '1.0',
      };

      const cert = generateCertificateData(
        'sig-1', sigData,
        { name: 'Owner', email: 'o@t.com', role: 'owner' },
        { standard: 'eu_cbam', reportingYear: 2025 },
      );

      expect(cert).toEqual(expect.objectContaining({
        certificateId: 'sig-1',
        signatureHash: 'abc123',
        signer: expect.objectContaining({ name: 'Owner' }),
        report: expect.objectContaining({ standard: 'eu_cbam' }),
        verification: expect.objectContaining({ algorithm: 'sha256' }),
      }));
    });
  });

  // ===================== CREATE AUDIT RECORD =====================
  describe('createAuditRecord', () => {
    it('should create audit record for sign action', () => {
      const sigData = {
        hash: 'abc123', contentHash: 'def456',
        payload: { reportId: 'rpt-1', userId: 'user-1', contentHash: 'def456', signatureType: 'approval', timestamp: '2025-01-01', nonce: 'xyz' },
        algorithm: 'sha256', version: '1.0',
      };

      const record = createAuditRecord(sigData, 'user-1', 'rpt-1', 'sign');

      expect(record).toEqual(expect.objectContaining({
        action: 'sign',
        userId: 'user-1',
        reportId: 'rpt-1',
        signatureHash: 'abc123',
        metadata: expect.objectContaining({ algorithm: 'sha256' }),
      }));
    });

    it('should create audit record for revoke action', () => {
      const sigData = {
        hash: 'abc123', contentHash: 'def456',
        payload: { reportId: 'rpt-1', userId: 'user-1', contentHash: 'def456', signatureType: 'approval', timestamp: '2025-01-01', nonce: 'xxx' },
        algorithm: 'sha256', version: '1.0',
      };

      const record = createAuditRecord(sigData, 'user-1', 'rpt-1', 'revoke');

      expect(record.action).toBe('revoke');
    });
  });
});
