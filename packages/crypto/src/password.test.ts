import { beforeAll, describe, expect, it } from 'vitest';
import { ensureReady, NomadCryptoError, randomBytes, toHex } from './primitives.js';
import {
  DEFAULT_PASSWORD_STRENGTH,
  passwordParamsFor,
  changePasswordWrap,
  createPasswordRecord,
  derivePasswordKey,
  unwrapDataKeyWithPassword,
  wrapDataKeyWithPassword,
} from './password.js';

describe('password-derived keys (Argon2id)', () => {
  beforeAll(async () => {
    await ensureReady();
  });

  it('derives the same key for the same password, salt and params', () => {
    const record = createPasswordRecord('correct horse battery staple', 'test');
    const a = derivePasswordKey('correct horse battery staple', record);
    const b = derivePasswordKey('correct horse battery staple', record);
    expect(toHex(a)).toBe(toHex(b));
    expect(a).toHaveLength(32);
  });

  it('derives different keys for different passwords and different salts', () => {
    const record1 = createPasswordRecord('alpha', 'test');
    const record2 = createPasswordRecord('alpha', 'test');
    const k1 = toHex(derivePasswordKey('alpha', record1));
    const k2 = toHex(derivePasswordKey('alpha', record2));
    const k3 = toHex(derivePasswordKey('beta', record1));
    expect(k1).not.toBe(k2); // fresh salt per record
    expect(k1).not.toBe(k3);
  });

  it('treats visually identical unicode as equal (NFKC)', () => {
    const record = createPasswordRecord('cafe\u0301', 'test'); // e + combining acute
    const a = toHex(derivePasswordKey('caf\u00e9', record)); // precomposed é
    const b = toHex(derivePasswordKey('cafe\u0301', record));
    expect(a).toBe(b);
  });

  it('wraps and unwraps a data key with a password', () => {
    const dataKey = randomBytes(32);
    const wrap = wrapDataKeyWithPassword(dataKey, 'hunter2 but longer', 'test');
    expect(unwrapDataKeyWithPassword(wrap.envelope, wrap.record, 'hunter2 but longer')).toEqual(dataKey);
  });

  it('rejects the wrong password with decrypt_failed', () => {
    const dataKey = randomBytes(32);
    const wrap = wrapDataKeyWithPassword(dataKey, 'right', 'test');
    try {
      unwrapDataKeyWithPassword(wrap.envelope, wrap.record, 'wrong');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as NomadCryptoError).code).toBe('decrypt_failed');
    }
  });

  it('changes the password: old wrap fails, new wrap works', () => {
    const dataKey = randomBytes(32);
    const first = wrapDataKeyWithPassword(dataKey, 'old password', 'test');
    const second = changePasswordWrap(first.envelope, first.record, 'old password', 'new password', 'test');
    expect(unwrapDataKeyWithPassword(second.envelope, second.record, 'new password')).toEqual(dataKey);
    expect(() =>
      unwrapDataKeyWithPassword(second.envelope, second.record, 'old password'),
    ).toThrow(NomadCryptoError);
    expect(() =>
      unwrapDataKeyWithPassword(first.envelope, first.record, 'new password'),
    ).toThrow(NomadCryptoError);
  });

  it('records the Argon2id algorithm and parameters', () => {
    const record = createPasswordRecord('x', 'test');
    expect(record.algorithm).toBe(passwordParamsFor('test').algorithm);
    expect(record.v).toBe(1);
    expect(record.opsLimit).toBe(1);
  });

  it('exposes production presets mapped to libsodium limits', () => {
    expect(DEFAULT_PASSWORD_STRENGTH).toBe('moderate');
    expect(passwordParamsFor('moderate').memLimit).toBeGreaterThan(passwordParamsFor('interactive').memLimit);
    expect(passwordParamsFor('sensitive').memLimit).toBeGreaterThan(passwordParamsFor('moderate').memLimit);
  });

  it('rejects corrupted records', () => {
    const record = createPasswordRecord('x', 'test');
    expect(() => derivePasswordKey('x', { ...record, v: 7 })).toThrow(NomadCryptoError);
    expect(() => derivePasswordKey('x', { ...record, salt: 'zz' })).toThrow(NomadCryptoError);
  });
});
