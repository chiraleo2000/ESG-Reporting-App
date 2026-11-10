/**
 * Anomaly detector thresholds: failed logins, MFA failures, and deduped alerts.
 */
jest.mock('../../src/config/database', () => ({
  db: { query: jest.fn() },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('alert-1'),
}));

import { db } from '../../src/config/database';
import { runAnomalyDetection } from '../../src/services/securityAlertService';

const mockDb = db as jest.Mocked<typeof db>;

function emptyScan() {
  return { rows: [], rowCount: 0 };
}

describe('runAnomalyDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates no alerts when every window is under threshold', async () => {
    (mockDb.query as jest.Mock).mockResolvedValue(emptyScan());

    const result = await runAnomalyDetection();

    expect(result.alertsCreated).toBe(0);
    const sql = (mockDb.query as jest.Mock).mock.calls.map((call) => String(call[0]));
    expect(sql.some((q) => q.includes('INSERT INTO security_alerts'))).toBe(false);
    const exportSql = sql.find((q) => q.includes('export'));
    expect(exportSql).toContain('make_interval');
    expect(exportSql).toMatch(/AND \(\s*action IN/s);
  });

  it('opens a high alert when failed logins reach the threshold', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ ip_address: '203.0.113.9', count: 12 }], rowCount: 1 })
      .mockResolvedValueOnce(emptyScan())
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValue(emptyScan());

    const result = await runAnomalyDetection();

    expect(result.alertsCreated).toBe(1);
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('auth.login_failed'),
      [10, 15]
    );
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO security_alerts'),
      expect.arrayContaining(['failed_login_spike', 'high'])
    );
  });

  it('does not count a duplicate open alert as newly created', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce(emptyScan())
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-9', count: 5 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'existing' }], rowCount: 1 })
      .mockResolvedValue(emptyScan());

    const result = await runAnomalyDetection();

    expect(result.alertsCreated).toBe(0);
    const sql = (mockDb.query as jest.Mock).mock.calls.map((call) => String(call[0]));
    expect(sql.some((q) => q.includes('INSERT INTO security_alerts'))).toBe(false);
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('auth.mfa_failed'),
      [5, 15]
    );
  });
});
