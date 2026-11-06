// Authenticated encryption envelopes. One format for everything we store or send.
import { b64urlDecode, b64urlEncode, NomadCryptoError, sodiumReadyRef } from './primitives.js';

/** Binary envelope version. Bump on breaking format changes; old versions are rejected. */
export const ENVELOPE_VERSION = 1;

export interface EncryptedEnvelope {
  readonly v: number;
  /** Base64url nonce (24 bytes for XChaCha20-Poly1305). */
  readonly n: string;
  /** Base64url ciphertext with the 16-byte Poly1305 tag appended. */
  readonly c: string;
}

/**
 * Encrypt bytes with XChaCha20-Poly1305 (libsodium). The optional `aad` is
 * authenticated but not encrypted: use it to bind an envelope to its context
 * (table, column, row, key purpose). Decrypting with different AAD always fails.
 */
export function seal(
  plaintext: Uint8Array,
  key: Uint8Array,
  aad?: Uint8Array,
): EncryptedEnvelope {
  const sodium = sodiumReadyRef();
  if (key.length !== sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES) {
    throw new NomadCryptoError('invalid_input', 'Encryption key has the wrong length');
  }
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    aad ?? null,
    null,
    nonce,
    key,
  );
  return { v: ENVELOPE_VERSION, n: b64urlEncode(nonce), c: b64urlEncode(ciphertext) };
}

export function open(
  envelope: EncryptedEnvelope,
  key: Uint8Array,
  aad?: Uint8Array,
): Uint8Array {
  const sodium = sodiumReadyRef();
  assertEnvelopeShape(envelope);
  let nonce: Uint8Array;
  let ciphertext: Uint8Array;
  try {
    nonce = b64urlDecode(envelope.n);
    ciphertext = b64urlDecode(envelope.c);
  } catch (cause) {
    if (cause instanceof NomadCryptoError) throw cause;
    throw new NomadCryptoError('invalid_envelope', 'Envelope fields are not valid base64url');
  }
  if (nonce.length !== sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES) {
    throw new NomadCryptoError('invalid_envelope', 'Envelope nonce has the wrong length');
  }
  try {
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      ciphertext,
      aad ?? null,
      nonce,
      key,
    );
  } catch {
    throw new NomadCryptoError(
      'decrypt_failed',
      'Decryption failed: wrong key, tampered data or wrong context',
    );
  }
}

function assertEnvelopeShape(envelope: EncryptedEnvelope): void {
  if (typeof envelope !== 'object' || envelope === null) {
    throw new NomadCryptoError('invalid_envelope', 'Envelope is not an object');
  }
  if (envelope.v !== ENVELOPE_VERSION) {
    throw new NomadCryptoError(
      'unsupported_version',
      `Unsupported envelope version ${String((envelope as { v?: unknown }).v)}`,
    );
  }
  if (
    typeof envelope.n !== 'string' ||
    typeof envelope.c !== 'string' ||
    envelope.n.length === 0 ||
    envelope.c.length === 0
  ) {
    throw new NomadCryptoError('invalid_envelope', 'Envelope is missing nonce or ciphertext');
  }
}

export function sealText(plaintext: string, key: Uint8Array, aad?: Uint8Array): EncryptedEnvelope {
  return seal(new TextEncoder().encode(plaintext), key, aad);
}

export function openText(envelope: EncryptedEnvelope, key: Uint8Array, aad?: Uint8Array): string {
  return new TextDecoder().decode(open(envelope, key, aad));
}

export function sealJson(value: unknown, key: Uint8Array, aad?: Uint8Array): EncryptedEnvelope {
  return sealText(JSON.stringify(value), key, aad);
}

export function openJson<T>(envelope: EncryptedEnvelope, key: Uint8Array, aad?: Uint8Array): T {
  const text = openText(envelope, key, aad);
  try {
    return JSON.parse(text) as T;
  } catch (cause) {
    throw new NomadCryptoError('invalid_input', 'Decrypted payload is not valid JSON', { cause });
  }
}

/** Re-encrypt under a new key. Used by key rotation. */
export function reencrypt(
  envelope: EncryptedEnvelope,
  oldKey: Uint8Array,
  newKey: Uint8Array,
  aad?: Uint8Array,
): EncryptedEnvelope {
  const plaintext = open(envelope, oldKey, aad);
  try {
    return seal(plaintext, newKey, aad);
  } finally {
    plaintext.fill(0);
  }
}
