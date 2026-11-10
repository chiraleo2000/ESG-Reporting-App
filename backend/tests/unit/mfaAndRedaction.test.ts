/**
 * Focused security unit tests: MFA helpers + data-source secret redaction
 */

jest.mock('../../src/config/env', () => ({
  config: {
    mfa: { encryptionKey: 'test-mfa-encryption-key-32chars!!' },
    redis: { ttlSeconds: 60 },
    logging: { level: 'error', format: 'pretty' },
    isDevelopment: false,
    isProduction: false,
    isTest: true,
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/database', () => ({
  db: { query: jest.fn(), queryOne: jest.fn() },
}));

jest.mock('../../src/config/redis', () => ({
  redisClient: { set: jest.fn(), del: jest.fn(), keys: {} },
}));

jest.mock('../../src/integrations', () => ({
  createConnector: jest.fn(),
}));

jest.mock('../../src/integrations/syncScheduler', () => ({
  SyncScheduler: { schedule: jest.fn(), stop: jest.fn(), stage: jest.fn(), execute: jest.fn() },
}));

import {
  encryptSecret,
  decryptSecret,
  verifyTotp,
  generateMfaSecret,
  generateBackupCodes,
  consumeBackupCode,
  rolesRequiringMfa,
} from '../../src/services/mfaService';
import { authenticator } from 'otplib';
import { redactConfigSecrets } from '../../src/services/dataSourceService';

describe('MFA service', () => {
  it('encrypts and decrypts secrets round-trip', () => {
    const secret = generateMfaSecret();
    const enc = encryptSecret(secret);
    expect(enc).not.toEqual(secret);
    expect(decryptSecret(enc)).toEqual(secret);
  });

  it('verifies a valid TOTP code', () => {
    const secret = generateMfaSecret();
    const token = authenticator.generate(secret);
    expect(verifyTotp(secret, token)).toBe(true);
    expect(verifyTotp(secret, '000000')).toBe(false);
  });

  it('generates and consumes backup codes once', async () => {
    const { plain, hashed } = await generateBackupCodes(2);
    expect(plain).toHaveLength(2);
    expect(hashed).toHaveLength(2);
    const first = await consumeBackupCode(plain[0], hashed);
    expect(first.valid).toBe(true);
    expect(first.remaining).toHaveLength(1);
    const again = await consumeBackupCode(plain[0], first.remaining);
    expect(again.valid).toBe(false);
  });

  it('requires MFA for owner/director/admin', () => {
    expect(rolesRequiringMfa('owner')).toBe(true);
    expect(rolesRequiringMfa('director')).toBe(true);
    expect(rolesRequiringMfa('admin')).toBe(true);
    expect(rolesRequiringMfa('editor')).toBe(false);
    expect(rolesRequiringMfa('viewer')).toBe(false);
  });
});

describe('Data source secret redaction', () => {
  it('masks password and apiKey leaving last4', () => {
    const redacted = redactConfigSecrets({
      baseUrl: 'https://api.example.com',
      apiKey: 'abcd1234secret',
      password: 'SuperSecret1!',
      username: 'svc',
    });
    expect(redacted.baseUrl).toBe('https://api.example.com');
    expect(redacted.username).toBe('svc');
    expect(redacted.apiKey).toBe('***cret');
    expect(redacted.password).toBe('***et1!');
    expect(redacted.apiKey).not.toContain('abcd1234');
  });
});
