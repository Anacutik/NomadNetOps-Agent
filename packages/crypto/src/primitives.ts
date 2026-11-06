// Low-level helpers on top of libsodium. Never invent crypto primitives here.
// All sizes are read lazily: the wrapper defines them only after ready().
import { sodiumRef, type SodiumModule } from './sodium.js';

let readyPromise: Promise<void> | null = null;
let ready = false;

export async function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = sodiumRef().ready.then(() => {
      ready = true;
    });
  }
  await readyPromise;
}

export function isReady(): boolean {
  return ready;
}

export function sodiumReadyRef(): SodiumModule {
  if (!ready) {
    throw new NomadCryptoError('not_ready', 'Call ensureReady() before synchronous crypto');
  }
  return sodiumRef();
}

export function keyBytes(): number {
  return sodiumReadyRef().crypto_aead_xchacha20poly1305_ietf_KEYBYTES;
}

export function nonceBytes(): number {
  return sodiumReadyRef().crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
}

export function saltBytes(): number {
  return sodiumReadyRef().crypto_pwhash_SALTBYTES;
}

export function randomBytes(length: number): Uint8Array {
  return sodiumReadyRef().randombytes_buf(length);
}

/** Base64url without padding (URL-safe for QR codes and URIs). */
export function b64urlEncode(bytes: Uint8Array): string {
  return sodiumReadyRef().to_base64(bytes, sodiumReadyRef().base64_variants.URLSAFE_NO_PADDING);
}

export function b64urlDecode(text: string): Uint8Array {
  try {
    return sodiumReadyRef().from_base64(text, sodiumReadyRef().base64_variants.URLSAFE_NO_PADDING);
  } catch {
    throw new NomadCryptoError('invalid_input', 'Input is not valid base64url');
  }
}

export function toHex(bytes: Uint8Array): string {
  return sodiumReadyRef().to_hex(bytes);
}

export function fromHex(text: string): Uint8Array {
  try {
    return sodiumReadyRef().from_hex(text);
  } catch {
    throw new NomadCryptoError('invalid_input', 'Input is not valid hexadecimal');
  }
}

/** Copy bytes so callers never mutate our internal state through shared buffers. */
export function copyBytes(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length);
  out.set(bytes);
  return out;
}

/** Best-effort zeroization. JavaScript GC may leave copies elsewhere; document this. */
export function wipeBytes(bytes: Uint8Array): void {
  try {
    sodiumReadyRef().memzero(bytes);
  } catch {
    bytes.fill(0);
  }
}

/** Constant-time equality for same-length buffers; length leak is not sensitive here. */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export type NomadCryptoErrorCode =
  | 'decrypt_failed'
  | 'invalid_input'
  | 'invalid_envelope'
  | 'unsupported_version'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'invalid_code'
  | 'signature_invalid'
  | 'expired'
  | 'not_ready';

/** Errors never carry secret material in their message. */
export class NomadCryptoError extends Error {
  readonly code: NomadCryptoErrorCode;

  constructor(code: NomadCryptoErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options ? { cause: options.cause } : undefined);
    this.name = 'NomadCryptoError';
    this.code = code;
  }
}

/** Stable JSON with sorted keys, for signing and digests. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

/** NFKC-normalise a string before feeding it to a KDF, so visually identical inputs match. */
export function normalizeText(input: string): string {
  return input.normalize('NFKC');
}
