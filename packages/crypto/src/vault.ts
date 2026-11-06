// Vault for provider API keys. Secrets never go in the database, never enter
// model context, never appear in logs (design section 6). This module exposes
// the interface; the desktop app (step 07) plugs in the OS keychain adapter.
import { sodiumReadyRef } from './primitives.js';
import { NomadCryptoError } from './primitives.js';
import { open, seal, type EncryptedEnvelope } from './envelope.js';
import { contextBytes } from './keys.js';

export interface SecretVault {
  put(ref: string, secret: string): Promise<void>;
  get(ref: string): Promise<string>;
  has(ref: string): Promise<boolean>;
  delete(ref: string): Promise<boolean>;
  /** Metadata only: references, never values. */
  refs(): Promise<string[]>;
}

/** OS keychain adapter seam (Secure Enclave on phone, step 08). */
export interface PlatformKeychainAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<boolean>;
}

export const VAULT_CONTEXT = 'nomad:vault:v1';

/** In-memory vault for tests and ephemeral use. */
export class InMemoryVault implements SecretVault {
  private readonly secrets = new Map<string, string>();

  async put(ref: string, secret: string): Promise<void> {
    this.secrets.set(ref, secret);
  }

  async get(ref: string): Promise<string> {
    const secret = this.secrets.get(ref);
    if (secret === undefined) throw new NomadCryptoError('not_found', 'Secret not found');
    return secret;
  }

  async has(ref: string): Promise<boolean> {
    return this.secrets.has(ref);
  }

  async delete(ref: string): Promise<boolean> {
    return this.secrets.delete(ref);
  }

  async refs(): Promise<string[]> {
    return [...this.secrets.keys()];
  }
}

/** Storage-agnostic encrypted vault: values are envelopes under the vault key. */
export class EncryptedVault implements SecretVault {
  private readonly entries = new Map<string, EncryptedEnvelope>();

  constructor(
    private readonly vaultKey: Uint8Array,
    private readonly spaceId: string,
  ) {}

  /** Derive a dedicated vault key from the space data key (vault key ≠ data key). */
  static vaultKeyFromDataKey(dataKey: Uint8Array): Uint8Array {
    return sodiumReadyRef().crypto_kdf_derive_from_key(32, 1, 'vaultkey', dataKey);
  }

  async put(ref: string, secret: string): Promise<void> {
    this.entries.set(
      ref,
      seal(new TextEncoder().encode(secret), this.vaultKey, this.contextFor(ref)),
    );
  }

  async get(ref: string): Promise<string> {
    const envelope = this.entries.get(ref);
    if (!envelope) throw new NomadCryptoError('not_found', 'Secret not found');
    const bytes = open(envelope, this.vaultKey, this.contextFor(ref));
    const text = new TextDecoder().decode(bytes);
    bytes.fill(0);
    return text;
  }

  async has(ref: string): Promise<boolean> {
    return this.entries.has(ref);
  }

  async delete(ref: string): Promise<boolean> {
    return this.entries.delete(ref);
  }

  /** References only. Values never leave get(). */
  async refs(): Promise<string[]> {
    return [...this.entries.keys()];
  }

  /** Export envelopes for backup; still encrypted, safe to store anywhere. */
  exportEnvelopes(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [ref, envelope] of this.entries) {
      out[ref] = JSON.stringify(envelope);
    }
    return out;
  }

  private contextFor(ref: string): Uint8Array {
    return contextBytes(`${VAULT_CONTEXT}:${this.spaceId}:${ref}`);
  }
}
