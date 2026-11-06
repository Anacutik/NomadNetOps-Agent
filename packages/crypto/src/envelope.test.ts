import { beforeAll, describe, expect, it } from 'vitest';
import { ensureReady, randomBytes, NomadCryptoError } from './primitives.js';
import {
  ENVELOPE_VERSION,
  open,
  openJson,
  openText,
  reencrypt,
  seal,
  sealJson,
  sealText,
} from './envelope.js';

describe('envelope', () => {
  beforeAll(async () => {
    await ensureReady();
  });

  it('round-trips bytes', () => {
    const key = randomBytes(32);
    const plaintext = randomBytes(100);
    const envelope = seal(plaintext, key);
    expect(open(envelope, key)).toEqual(plaintext);
  });

  it('round-trips text and JSON', () => {
    const key = randomBytes(32);
    const text = 'Hello, private world';
    expect(openText(sealText(text, key), key)).toBe(text);
    expect(openJson<{ a: number }>(sealJson({ a: 1 }, key), key)).toEqual({ a: 1 });
  });

  it('fails with the wrong key', () => {
    const envelope = sealText('secret', randomBytes(32));
    expect(() => open(envelope, randomBytes(32))).toThrowError(NomadCryptoError);
  });

  it('binds to additional data: different AAD fails', () => {
    const key = randomBytes(32);
    const envelope = sealText('secret', key, new TextEncoder().encode('row:1'));
    expect(() =>
      open(envelope, key, new TextEncoder().encode('row:2')),
    ).toThrowError(NomadCryptoError);
    expect(openText(envelope, key, new TextEncoder().encode('row:1'))).toBe('secret');
  });

  it('rejects tampered ciphertext', () => {
    const key = randomBytes(32);
    const envelope = sealText('secret', key);
    const raw = atobLike(envelope.c);
    raw[0] = raw[0]! ^ 1;
    const tampered = { ...envelope, c: btoaLike(raw) };
    expect(() => open(tampered, key)).toThrowError(/tampered|wrong key/i);
  });

  it('rejects tampered nonce', () => {
    const key = randomBytes(32);
    const envelope = sealText('secret', key);
    const nonce = atobLike(envelope.n);
    nonce[0] = nonce[0]! ^ 1;
    const tampered = { ...envelope, n: btoaLike(nonce) };
    expect(() => open(tampered, key)).toThrowError(NomadCryptoError);
  });

  it('rejects unknown envelope versions', () => {
    const key = randomBytes(32);
    const envelope = { ...sealText('secret', key), v: 99 };
    expect(() => open(envelope, key)).toThrowError(NomadCryptoError);
    try {
      open(envelope, key);
    } catch (error) {
      expect((error as NomadCryptoError).code).toBe('unsupported_version');
    }
  });

  it('uses a fresh nonce every time (ciphertexts differ)', () => {
    const key = randomBytes(32);
    const a = sealText('same plaintext', key);
    const b = sealText('same plaintext', key);
    expect(a.c).not.toBe(b.c);
    expect(a.n).not.toBe(b.n);
  });

  it('reencrypts under a new key', () => {
    const oldKey = randomBytes(32);
    const newKey = randomBytes(32);
    const envelope = sealText('rotate me', oldKey);
    const rotated = reencrypt(envelope, oldKey, newKey);
    expect(openText(rotated, newKey)).toBe('rotate me');
    expect(() => open(rotated, oldKey)).toThrowError(NomadCryptoError);
  });

  it('exposes the current envelope version', () => {
    expect(ENVELOPE_VERSION).toBe(1);
  });

  it('rejects malformed envelopes cleanly', () => {
    const key = randomBytes(32);
    expect(() => open({ v: 1, n: '', c: 'x' }, key)).toThrowError(NomadCryptoError);
    expect(() => open({ v: 1, n: '!!!', c: 'x' }, key)).toThrowError(NomadCryptoError);
    expect(() => open(null as unknown as Parameters<typeof open>[0], key)).toThrowError(
      NomadCryptoError,
    );
  });

  it('rejects keys of the wrong length', () => {
    expect(() => sealText('secret', randomBytes(16))).toThrowError(NomadCryptoError);
  });
});

function atobLike(text: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const clean = text.replace(/=+$/, '');
  const out: number[] = [];
  let bits = 0;
  let buffer = 0;
  for (const char of clean) {
    buffer = (buffer << 6) | alphabet.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

function btoaLike(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let out = '';
  let bits = 0;
  let buffer = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      out += alphabet[(buffer >> bits) & 63];
    }
  }
  if (bits > 0) out += alphabet[(buffer << (6 - bits)) & 63];
  return out;
}
