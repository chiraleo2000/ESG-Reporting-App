/**
 * TOTP MFA helpers (6-digit, 30s window) using otplib + hashed backup codes.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { config } from '../config/env';

authenticator.options = { digits: 6, step: 30, window: 1 };

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  return Buffer.from(config.mfa.encryptionKey.padEnd(32, '0').slice(0, 32));
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
}

export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpauthUri(secret: string, email: string): string {
  return authenticator.keyuri(email, 'ESG Reporting', secret);
}

export function verifyTotp(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token: token.replace(/\s/g, ''), secret });
  } catch {
    return false;
  }
}

export async function generateBackupCodes(count = 8): Promise<{ plain: string[]; hashed: string[] }> {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex');
    plain.push(code);
    hashed.push(await bcrypt.hash(code, 10));
  }
  return { plain, hashed };
}

export async function consumeBackupCode(
  presented: string,
  hashedCodes: string[]
): Promise<{ valid: boolean; remaining: string[] }> {
  const remaining: string[] = [];
  let valid = false;
  for (const hash of hashedCodes) {
    if (!valid && (await bcrypt.compare(presented, hash))) {
      valid = true;
      continue;
    }
    remaining.push(hash);
  }
  return { valid, remaining };
}

export function rolesRequiringMfa(role: string): boolean {
  return ['owner', 'director', 'admin'].includes(role);
}
