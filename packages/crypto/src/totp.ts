// RFC 6238 TOTP over HMAC-SHA-256 (libsodium crypto_auth_hmacsha256).
// SMS is not offered anywhere (ADR 0001); authenticator apps and passkeys are.
import {
  sodiumReadyRef,
  constantTimeEqual,
  NomadCryptoError,
  randomBytes,
} from './primitives.js';

export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;
/** Allow one time step of clock drift in both directions (RFC 6238 section 5.2). */
export const TOTP_DEFAULT_WINDOW = 1;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export interface TotpEnrollment {
  /** Base32 (RFC 4648, no padding) secret, 20 random bytes. */
  readonly secretBase32: string;
  readonly digits: number;
  readonly periodSeconds: number;
  readonly algorithm: 'SHA256';
}

export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let buffer = 0;
  let out = '';
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += BASE32_ALPHABET[(buffer >> bits) & 31];
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

export function decodeBase32(text: string): Uint8Array {
  const clean = text.toUpperCase().replace(/[=\s-]/g, '');
  const out: number[] = [];
  let bits = 0;
  let buffer = 0;
  for (const char of clean) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value < 0) throw new NomadCryptoError('invalid_input', 'Secret is not valid base32');
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

export function generateTotpEnrollment(): TotpEnrollment {
  return {
    secretBase32: encodeBase32(randomBytes(20)),
    digits: TOTP_DIGITS,
    periodSeconds: TOTP_PERIOD_SECONDS,
    algorithm: 'SHA256',
  };
}

/** otpauth:// URI for authenticator apps (SHA-256 is widely supported). */
export function totpUri(enrollment: TotpEnrollment, accountName: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret: enrollment.secretBase32,
    issuer,
    algorithm: enrollment.algorithm,
    digits: String(enrollment.digits),
    period: String(enrollment.periodSeconds),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** RFC 4226 HOTP with HMAC-SHA-256. */
export function hotp(secret: Uint8Array, counter: number, digits: number = TOTP_DIGITS): string {
  const message = new Uint8Array(8);
  // Big-endian 64-bit counter (exact up to 2^53, far beyond any time step).
  let value = counter;
  for (let i = 7; i >= 0; i--) {
    message[i] = value % 256;
    value = Math.floor(value / 256);
  }
  const mac = hmacSha256(secret, message);
  const offset = mac[mac.length - 1]! & 0x0f;
  const binary =
    ((mac[offset]! & 0x7f) << 24) |
    ((mac[offset + 1]! & 0xff) << 16) |
    ((mac[offset + 2]! & 0xff) << 8) |
    (mac[offset + 3]! & 0xff);
  const code = binary % 10 ** digits;
  return code.toString().padStart(digits, '0');
}

/**
 * HMAC-SHA-256 with an arbitrary key length (RFC 2104), as TOTP secrets are
 * 20 bytes while libsodium's one-shot crypto_auth_hmacsha256 wants exactly 32.
 */
function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const sodium = sodiumReadyRef();
  const state = sodium.crypto_auth_hmacsha256_init(key);
  sodium.crypto_auth_hmacsha256_update(state, message);
  return sodium.crypto_auth_hmacsha256_final(state) as Uint8Array;
}

export function totpAt(enrollment: TotpEnrollment, timeMs: number): string {
  const counter = Math.floor(timeMs / 1000 / enrollment.periodSeconds);
  return hotp(decodeBase32(enrollment.secretBase32), counter, enrollment.digits);
}

export interface TotpVerificationResult {
  readonly ok: boolean;
  /** The matched time-step counter, for replay protection; undefined when rejected. */
  readonly matchedCounter?: number;
}

/**
 * Verify a TOTP code within `window` steps of `now`. The caller must record
 * `matchedCounter` and refuse counters at or below the last used one, so a
 * code cannot be replayed within its validity window.
 */
export function verifyTotp(
  enrollment: TotpEnrollment,
  code: string,
  options: { now: number; window?: number; minCounter?: number } = { now: Date.now() },
): TotpVerificationResult {
  if (!/^\d+$/.test(code) || code.length !== enrollment.digits) {
    return { ok: false };
  }
  const secret = decodeBase32(enrollment.secretBase32);
  const currentCounter = Math.floor(options.now / 1000 / enrollment.periodSeconds);
  const window = options.window ?? TOTP_DEFAULT_WINDOW;
  for (let offset = -window; offset <= window; offset++) {
    const counter = currentCounter + offset;
    if (counter < 0) continue;
    if (options.minCounter !== undefined && counter <= options.minCounter) continue;
    if (constantTimeEqual(new TextEncoder().encode(hotp(secret, counter, enrollment.digits)), new TextEncoder().encode(code))) {
      return { ok: true, matchedCounter: counter };
    }
  }
  return { ok: false };
}
