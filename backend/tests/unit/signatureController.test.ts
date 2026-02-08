/**
 * Signature Controller Unit Tests
 * Tests signReport, verifySignature, getProjectSignatures, getSignature, revokeSignature
 */
import { Request, Response } from 'express';

jest.mock('../../src/config/database', () => ({
  db: { query: jest.fn() },
  pool: { connect: jest.fn() },
}));

jest.mock('../../src/config/redis', () => ({
  redisClient: { get: jest.fn(), set: jest.fn(), del: jest.fn(), keys: {} },
}));

jest.mock('../../src/config/env', () => ({
  config: {
    signature: { authorizedRoles: ['owner', 'director'] },
    audit: { retentionDays: 365 },
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('mock-sig-id'),
}));

jest.mock('../../src/services/signatureService', () => ({
  generateSignature: jest.fn().mockResolvedValue({ hash: 'sha256-abc123', data: {} }),
  verifySignature: jest.fn().mockResolvedValue({ valid: true, timestamp: new Date().toISOString(), message: 'OK' }),
}));

import { db } from '../../src/config/database';
import {
  signReport, verifySignature, getProjectSignatures, getSignature, revokeSignature,
} from '../../src/controllers/signatureController';

const mockDb = db as jest.Mocked<typeof db>;

describe('Signature Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {}, params: {}, query: {},
      user: { id: 'user-1', userId: 'user-1', email: 'owner@test.com', role: 'owner', name: 'Owner', signatureAuthorized: false } as any,
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  // ===================== SIGN REPORT =====================
  describe('signReport', () => {
    const mockReport = {
      id: 'rpt-1', project_id: 'proj-1', project_name: 'Sugar Factory',
      standard: 'eu_cbam', report_data: { content: 'report' },
      status: 'generated', validation_errors: null,
    };

    it('should sign a report successfully', async () => {
      req.body = { reportId: 'rpt-1', signatureType: 'approval', comments: 'Approved' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockReport], rowCount: 1 }) // GET report
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT signature
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE report
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await signReport(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          reportId: 'rpt-1',
          signatureHash: 'sha256-abc123',
          signedBy: expect.objectContaining({ id: 'user-1', role: 'owner' }),
        }),
      });
    });

    it('should reject unauthorized role', async () => {
      req.user = { id: 'user-2', userId: 'user-2', email: 'v@t.com', role: 'viewer', name: 'V', signatureAuthorized: false } as any;
      req.body = { reportId: 'rpt-1' };

      await expect(signReport(req as Request, res as Response))
        .rejects.toThrow(/not authorized to sign/);
    });

    it('should reject already signed report', async () => {
      req.body = { reportId: 'rpt-1' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ ...mockReport, status: 'signed' }], rowCount: 1 });

      await expect(signReport(req as Request, res as Response))
        .rejects.toThrow('Report is already signed');
    });

    it('should reject report with validation errors', async () => {
      req.body = { reportId: 'rpt-1' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...mockReport, validation_errors: ['Missing scope1'] }], rowCount: 1,
      });

      await expect(signReport(req as Request, res as Response))
        .rejects.toThrow('Cannot sign a report with validation errors');
    });

    it('should throw NotFoundError for missing report', async () => {
      req.body = { reportId: 'gone' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(signReport(req as Request, res as Response))
        .rejects.toThrow('Report not found');
    });
  });

  // ===================== VERIFY SIGNATURE =====================
  describe('verifySignature', () => {
    it('should return valid verification for signed report', async () => {
      req.params = { reportId: 'rpt-1' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'rpt-1', signature_id: 'sig-1', signature_hash: 'sha256-abc',
          signature_data: '{}', report_data: {}, signed_at: new Date(),
          signer_name: 'Owner', signer_role: 'owner',
        }],
        rowCount: 1,
      });

      await verifySignature(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          isSigned: true,
          verification: expect.objectContaining({ valid: true }),
        }),
      });
    });

    it('should return isSigned=false for unsigned report', async () => {
      req.params = { reportId: 'rpt-2' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'rpt-2', signature_id: null }], rowCount: 1,
      });

      await verifySignature(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ isSigned: false }),
      });
    });

    it('should throw NotFoundError', async () => {
      req.params = { reportId: 'gone' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(verifySignature(req as Request, res as Response))
        .rejects.toThrow('Report not found');
    });
  });

  // ===================== GET PROJECT SIGNATURES =====================
  describe('getProjectSignatures', () => {
    it('should return paginated signatures', async () => {
      req.params = { projectId: 'proj-1' };
      req.query = { page: '1', limit: '10' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id: 'sig-1', report_id: 'rpt-1', standard: 'eu_cbam', format: 'pdf',
            signature_type: 'approval', signature_hash: 'sha256-abc',
            signer_name: 'Owner', signer_email: 'o@t.com', signer_role: 'owner',
            declaration_text: 'I declare...', comments: null, is_revoked: false,
            created_at: new Date(),
          }],
          rowCount: 1,
        });

      await getProjectSignatures(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ signatureType: 'approval', signer: expect.objectContaining({ name: 'Owner' }) }),
        ]),
        pagination: expect.objectContaining({ total: 1 }),
      });
    });
  });

  // ===================== GET SIGNATURE =====================
  describe('getSignature', () => {
    it('should return signature details', async () => {
      req.params = { id: 'sig-1' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'sig-1', report_id: 'rpt-1', project_id: 'proj-1', user_id: 'user-1',
          standard: 'eu_cbam', format: 'pdf', signature_type: 'approval',
          signature_hash: 'sha256-abc', signer_name: 'Owner',
          signer_email: 'o@t.com', signer_role: 'owner',
          declaration_text: 'I declare...', comments: null,
          is_revoked: false, revoked_at: null, revoked_reason: null,
          created_at: new Date(),
        }],
        rowCount: 1,
      });

      await getSignature(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'sig-1',
          signer: expect.objectContaining({ id: 'user-1' }),
        }),
      });
    });

    it('should throw NotFoundError', async () => {
      req.params = { id: 'gone' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(getSignature(req as Request, res as Response))
        .rejects.toThrow('Signature not found');
    });
  });

  // ===================== REVOKE SIGNATURE =====================
  describe('revokeSignature', () => {
    const mockSig = {
      id: 'sig-1', report_id: 'rpt-1', project_id: 'proj-1',
      user_id: 'user-1', is_revoked: false, report_status: 'signed',
    };

    it('should revoke a signature', async () => {
      req.params = { id: 'sig-1' };
      req.body = { reason: 'Data error' };
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockSig], rowCount: 1 }) // GET signature
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE sig
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE report
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

      await revokeSignature(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Signature revoked successfully',
        data: expect.objectContaining({ reason: 'Data error' }),
      });
    });

    it('should reject already revoked signature', async () => {
      req.params = { id: 'sig-1' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ ...mockSig, is_revoked: true }], rowCount: 1 });

      await expect(revokeSignature(req as Request, res as Response))
        .rejects.toThrow('Signature is already revoked');
    });

    it('should reject unauthorized user', async () => {
      req.params = { id: 'sig-1' };
      req.user = { id: 'user-3', userId: 'user-3', email: 'x@t.com', role: 'viewer', name: 'V', signatureAuthorized: false } as any;
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [mockSig], rowCount: 1 });

      await expect(revokeSignature(req as Request, res as Response))
        .rejects.toThrow('You can only revoke your own signatures');
    });

    it('should throw NotFoundError', async () => {
      req.params = { id: 'gone' };
      (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(revokeSignature(req as Request, res as Response))
        .rejects.toThrow('Signature not found');
    });
  });
});
