// Shared byte-encoding helpers used across the crypto package.
import { b64urlDecode, b64urlEncode } from './primitives.js';

export function bytesToB64Url(bytes: Uint8Array): string {
  return b64urlEncode(bytes);
}

export function bytesFromB64Url(text: string): Uint8Array {
  return b64urlDecode(text);
}
