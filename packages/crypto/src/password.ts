// Password-derived keys with Argon2id (libsodium crypto_pwhash), plus the
// password change / reset helpers from technical design section 6.
import {
  normalizeText,
  NomadCryptoError,
  randomBytes,
  toHex,
  saltBytes,
  sodiumReadyRef,
} from './primitives.js';
import { type EncryptedEnvelope, open } from './envelope.js';
import { contextBytes, DATA_KEY_CONTEXT, unwrapDataKey, wrapDataKey } from './keys.js';

export type PasswordStrength = 'interactive' | 'moderate' | 'sensitive';

export interface PasswordParams {
  readonly opsLimit: number;
  readonly memLimit: number;
  readonly algorithm: number;
}

/**
 * Presets from libsodium. `interactive` fits a sign-in on a modern laptop,
 * `moderate` is the shipped default for wrapping data keys, `sensitive` is for
 * long-term secrets. `test` exists only for unit tests and must never ship.
 * Read lazily: libsodium defines its constants after ready().
 */
export function passwordParamsFor(strength: PasswordStrength | 'test'): PasswordParams {
  const sodium = sodiumReadyRef();
  switch (strength) {
    case 'interactive':
      return {
        opsLimit: sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        memLimit: sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        algorithm: sodium.crypto_pwhash_ALG_ARGON2ID13,
      };
    case 'sensitive':
      return {
        opsLimit: sodium.crypto_pwhash_OPSLIMIT_SENSITIVE,
        memLimit: sodium.crypto_pwhash_MEMLIMIT_SENSITIVE,
        algorithm: sodium.crypto_pwhash_ALG_ARGON2ID13,
      };
    case 'test':
      return { opsLimit: 1, memLimit: 8192, algorithm: sodium.crypto_pwhash_ALG_ARGON2ID13 };
    case 'moderate':
    default:
      return {
        opsLimit: sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        memLimit: sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        algorithm: sodium.crypto_pwhash_ALG_ARGON2ID13,
      };
  }
}

export const DEFAULT_PASSWORD_STRENGTH: PasswordStrength = 'moderate';

/** Persisted record: enough to re-derive, never enough to leak the password. */
export interface PasswordRecord {
  readonly v: number;
  /** Random salt, hexadecimal. */
  readonly salt: string;
  readonly opsLimit: number;
  readonly memLimit: number;
  readonly algorithm: number;
}

export function createPasswordRecord(
  password: string,
  strength: PasswordStrength = DEFAULT_PASSWORD_STRENGTH,
): PasswordRecord {
  const params = passwordParamsFor(strength);
  const salt = randomBytes(saltBytes());
  derivePasswordKeyWithParams(password, salt, params);
  return {
    v: 1,
    salt: toHex(salt),
    opsLimit: params.opsLimit,
    memLimit: params.memLimit,
    algorithm: params.algorithm,
  };
}

/** Derive a 32-byte key from a password. Same record + same password = same key. */
export function derivePasswordKey(password: string, record: PasswordRecord): Uint8Array {
  if (record.v !== 1) {
    throw new NomadCryptoError('unsupported_version', 'Unsupported password record version');
  }
  let salt: Uint8Array;
  try {
    salt = sodiumReadyRef().from_hex(record.salt);
  } catch {
    throw new NomadCryptoError('invalid_input', 'Password record salt is not valid hexadecimal');
  }
  return derivePasswordKeyWithParams(password, salt, {
    opsLimit: record.opsLimit,
    memLimit: record.memLimit,
    algorithm: record.algorithm,
  });
}

function derivePasswordKeyWithParams(
  password: string,
  salt: Uint8Array,
  params: PasswordParams,
): Uint8Array {
  if (salt.length !== saltBytes()) {
    throw new NomadCryptoError('invalid_input', 'Password salt has the wrong length');
  }
  return sodiumReadyRef().crypto_pwhash(32, normalizeText(password), salt, params.opsLimit, params.memLimit, params.algorithm);
}

export interface PasswordWrap {
  readonly record: PasswordRecord;
  readonly envelope: EncryptedEnvelope;
}

/** Wrap the space data key under a password-derived key. */
export function wrapDataKeyWithPassword(
  dataKey: Uint8Array,
  password: string,
  strength: PasswordStrength = DEFAULT_PASSWORD_STRENGTH,
): PasswordWrap {
  const record = createPasswordRecord(password, strength);
  const key = derivePasswordKey(password, record);
  try {
    return { record, envelope: wrapDataKey(dataKey, key, DATA_KEY_CONTEXT) };
  } finally {
    key.fill(0);
  }
}

/** Unwrap the data key with a password. Wrong password fails with decrypt_failed. */
export function unwrapDataKeyWithPassword(
  envelope: EncryptedEnvelope,
  record: PasswordRecord,
  password: string,
): Uint8Array {
  const key = derivePasswordKey(password, record);
  try {
    return unwrapDataKey(envelope, key, DATA_KEY_CONTEXT);
  } finally {
    key.fill(0);
  }
}

/** Change the password: unwrap with the old one, re-wrap under a new record. */
export function changePasswordWrap(
  envelope: EncryptedEnvelope,
  oldRecord: PasswordRecord,
  oldPassword: string,
  newPassword: string,
  strength: PasswordStrength = DEFAULT_PASSWORD_STRENGTH,
): PasswordWrap {
  const dataKey = unwrapDataKeyWithPassword(envelope, oldRecord, oldPassword);
  try {
    return wrapDataKeyWithPassword(dataKey, newPassword, strength);
  } finally {
    dataKey.fill(0);
  }
}

/** Open an envelope under a freshly derived password key (helper for callers). */
export function openWithPasswordKey<T>(
  envelope: EncryptedEnvelope,
  record: PasswordRecord,
  password: string,
  parse: (bytes: Uint8Array) => T,
): T {
  const key = derivePasswordKey(password, record);
  try {
    return parse(open(envelope, key, contextBytes(DATA_KEY_CONTEXT)));
  } finally {
    key.fill(0);
  }
}
