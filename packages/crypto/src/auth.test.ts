import { beforeAll, describe, expect, it } from 'vitest';
import { ensureReady } from './primitives.js';
import {
  STEP_UP_ACTIONS,
  STEP_UP_WINDOW_MS,
  SecondFactorService,
} from './auth.js';
import { totpAt } from './totp.js';

describe('second-factor service', () => {
  beforeAll(async () => {
    await ensureReady();
  });

  it('enrolls and confirms TOTP', () => {
    const service = new SecondFactorService();
    const { enrollment, uri } = service.startTotpEnrollment();
    expect(uri).toContain('otpauth://totp/');
    const now = 1_700_000_000_000;
    const code = totpAt(enrollment, now);
    expect(service.confirmTotp(code, now)).toBe(true);
    expect(service.getSnapshot().totp?.confirmed).toBe(true);
  });

  it('refuses sign-in without a second factor (no opt-out)', () => {
    const service = new SecondFactorService();
    expect(() => service.requireSecondFactorForSignIn()).toThrowError(/second factor/i);
  });

  it('verifies TOTP at sign-in and rejects wrong codes', () => {
    const service = new SecondFactorService();
    const { enrollment } = service.startTotpEnrollment();
    const now = 1_700_000_030_000;
    service.confirmTotp(totpAt(enrollment, now), now);
    expect(service.verifyTotpCode(totpAt(enrollment, now + 60_000), now + 60_000)).toBe(true);
    expect(service.verifyTotpCode('000000', now + 120_000)).toBe(false);
  });

  it('blocks TOTP replay of the same time step', () => {
    const service = new SecondFactorService();
    const { enrollment } = service.startTotpEnrollment();
    const now = 1_700_000_000_000;
    const code = totpAt(enrollment, now);
    expect(service.confirmTotp(code, now)).toBe(true);
    // Same code again (within window): refused because the counter was used.
    expect(service.verifyTotpCode(code, now + 5_000)).toBe(false);
  });

  it('issues single-use backup codes and shows them exactly once', () => {
    const service = new SecondFactorService();
    const codes = service.rotateBackupCodes(10);
    expect(codes).toHaveLength(10);
    for (const code of codes) expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    const now = 1000;
    expect(service.verifyBackupCode(codes[0]!, now)).toBe(true);
    // Same code cannot be reused.
    expect(service.verifyBackupCode(codes[0]!, now + 1)).toBe(false);
    expect(service.remainingBackupCodes()).toBe(9);
    // A random valid-format code fails.
    expect(service.verifyBackupCode('ZZZZ-ZZZZ', now)).toBe(false);
  });

  it('registers and verifies passkeys through the adapter', async () => {
    const service = new SecondFactorService();
    const credential = await service.registerPasskey('alice', 'Phone');
    expect(credential.credentialId).toMatch(/^cred-/);
    expect(await service.verifyPasskey('alice', credential.credentialId)).toBe(true);
    expect(await service.verifyPasskey('alice', 'cred-unknown')).toBe(false);
  });

  it('requires a fresh step-up for sensitive actions', async () => {
    const service = new SecondFactorService();
    const { enrollment } = service.startTotpEnrollment();
    const t0 = 1_700_000_000_000;
    service.confirmTotp(totpAt(enrollment, t0), t0);
    for (const action of STEP_UP_ACTIONS) {
      expect(service.stepUpOk(action, t0 + 1000).ok).toBe(true);
    }
    // After the window expires, step-up must be repeated.
    const later = service.stepUpOk('data.export', t0 + STEP_UP_WINDOW_MS + 1);
    expect(later.ok).toBe(false);
    expect(later.reason).toMatch(/re-verify/i);
  });

  it('never exposes backup code plaintext after issuance', () => {
    const service = new SecondFactorService();
    service.rotateBackupCodes();
    const snapshot = JSON.stringify(service.getSnapshot());
    expect(snapshot).not.toMatch(/[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}/);
  });
});
