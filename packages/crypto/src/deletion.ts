// Cryptographic deletion: destroy keys so ciphertext everywhere becomes
// unreadable. In JavaScript, zeroization is best-effort (GC copies exist);
// the guarantee comes from removing every wrapped copy and the wrapped keys.
import { wipeBytes } from './primitives.js';
import { type EncryptedEnvelope } from './envelope.js';
import { tryOpenEnvelope } from './keyutils.js';
import { type SpaceKeys } from './keys.js';

export interface DestructionRecord {
  readonly spaceId: string;
  readonly keyVersion: number;
  readonly destroyedAt: number;
  readonly documentRefs: readonly string[];
}

/** Zero a key buffer in place. Best effort; see module note. */
export function destroyKeyBytes(key: Uint8Array): void {
  wipeBytes(key);
}

/**
 * Destroy all raw keys held by a SpaceKeys instance. After this, unwrapping
 * any envelope of the space fails; data on disk stays but is unreadable.
 */
export function destroySpaceKeys(spaceKeys: SpaceKeys, now = Date.now()): DestructionRecord {
  const serialized = spaceKeys.serialize();
  const documentRefs = Object.keys(serialized.wrappedDocuments);
  const keyVersion = serialized.keyVersion;
  spaceKeys.destroy();
  return {
    spaceId: serialized.spaceId,
    keyVersion,
    destroyedAt: now,
    documentRefs,
  };
}

/** Verification helper for tests and the UI: an envelope must no longer open. */
export function assertUnwrapFails(envelope: EncryptedEnvelope, key: Uint8Array, aad?: Uint8Array): boolean {
  return !tryOpenEnvelope(envelope, key, aad);
}
