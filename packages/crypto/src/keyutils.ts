// Small shared helpers between modules that need "try to open an envelope"
// without duplicating error handling.
import { open, type EncryptedEnvelope } from './envelope.js';

export function tryOpenEnvelope(
  envelope: EncryptedEnvelope,
  key: Uint8Array,
  aad?: Uint8Array,
): Uint8Array | undefined {
  try {
    return open(envelope, key, aad);
  } catch {
    return undefined;
  }
}
