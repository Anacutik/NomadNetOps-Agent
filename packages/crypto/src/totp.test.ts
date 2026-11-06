import { beforeAll, describe, expect, it } from 'vitest';
import { ensureReady } from './primitives.js';
import {
  decodeBase32,
  encodeBase32,
  generateTotpEnrollment,
  hotp,
  totpAt,
  totpUri,
  verifyTotp,
} from './totp.js';

// RFC 6238 appendix B, SHA-256 column, 8 digits.
// Secret: ASCII "12345678901234567890123456789012" (32 bytes).
const RFC_SECRET = new TextEncoder().encode('12345678901234567890123456789012');

const RFC_VECTORS: Array<{ timeSec: number; code: string }> = [
  { timeSec: 59, code: '46119246' },
  { timeSec: 1111111109, code: '68084774' },
  { timeSec: 1111111111, code: '67062674' },
  { timeSec: 1234567890, code: '91819424' },
  { timeSec: 2000000000, code: '90698825' },
  { timeSec: 20000000000, code: '77737706' },
];

describe('TOTP (RFC 6238, HMAC-SHA-256)', () => {
  beforeAll(async () => {
    await ensureReady();
  });

  it('matches the RFC 6238 SHA-256 test vectors', () => {
    for (const { timeSec, code } of RFC_VECTORS) {
      const counter = Math.floor(timeSec / 30);
      expect(hotp(RFC_SECRET, counter, 8)).toBe(code);
    }
  });

  it('verifies codes within one time step of drift', () => {
    const enrollment = generateTotpEnrollment();
    const secret = decodeBase32(enrollment.secretBase32);
    const now = 59_000;
    const current = hotp(secret, Math.floor(now / 1000 / 30), 6);
    expect(verifyTotp(enrollment, current, { now }).ok).toBe(true);
    // One step in the past/future still verifies with window 1.
    expect(verifyTotp(enrollment, hotp(secret, 1, 6), { now }).ok).toBe(true);
    expect(verifyTotp(enrollment, hotp(secret, 3, 6), { now }).ok).toBe(false);
  });

  it('rejects malformed codes', () => {
    const enrollment = generateTotpEnrollment();
    expect(verifyTotp(enrollment, 'abc123', { now: 0 }).ok).toBe(false);
    expect(verifyTotp(enrollment, '12345', { now: 0 }).ok).toBe(false);
    expect(verifyTotp(enrollment, '1234567', { now: 0 }).ok).toBe(false);
    expect(verifyTotp(enrollment, '', { now: 0 }).ok).toBe(false);
  });

  it('supports replay protection via minCounter', () => {
    const enrollment = generateTotpEnrollment();
    const secret = decodeBase32(enrollment.secretBase32);
    const counter = 100;
    const code = hotp(secret, counter, 6);
    const nowMs = counter * 30_000;
    const first = verifyTotp(enrollment, code, { now: nowMs });
    expect(first.ok).toBe(true);
    expect(first.matchedCounter).toBe(counter);
    // Replay at a later time within the window: refused by minCounter.
    const replay = verifyTotp(enrollment, code, { now: nowMs + 10_000, minCounter: counter });
    expect(replay.ok).toBe(false);
  });

  it('produces otpauth URIs for authenticator apps', () => {
    const enrollment = generateTotpEnrollment();
    const uri = totpUri(enrollment, 'alice@example.com', 'NomadNetOps');
    expect(uri.startsWith('otpauth://totp/NomadNetOps%3Aalice%40example.com?')).toBe(true);
    expect(uri).toContain('algorithm=SHA256');
    expect(uri).toContain(`digits=${enrollment.digits}`);
    expect(uri).toContain(`secret=${enrollment.secretBase32}`);
  });

  it('round-trips base32', () => {
    const enrollment = generateTotpEnrollment();
    const decoded = decodeBase32(enrollment.secretBase32);
    expect(encodeBase32(decoded)).toBe(enrollment.secretBase32);
    expect(decoded).toHaveLength(20);
  });

  it('generates the same code within a time step and a different one after', () => {
    const enrollment = generateTotpEnrollment();
    expect(totpAt(enrollment, 0)).toBe(totpAt(enrollment, 29_999));
    expect(totpAt(enrollment, 0)).not.toBe(totpAt(enrollment, 30_000));
  });
});
