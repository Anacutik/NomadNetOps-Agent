// Field-level encryption for sensitive database columns, and the SQLCipher
// seam. Real SQLCipher binaries are wired by the desktop app (step 07); this
// module defines the contract and the derived key format.
import { sodiumReadyRef } from './primitives.js';
import { toHex } from './primitives.js';
import { openText, sealText, type EncryptedEnvelope } from './envelope.js';

export interface FieldContext {
  readonly table: string;
  readonly column: string;
  readonly rowId: string;
}

export function fieldAad(context: FieldContext): string {
  // Every part is internal metadata; forbid the separator to keep parsing safe.
  for (const part of [context.table, context.column, context.rowId]) {
    if (part.includes('|') || part.length === 0) {
      throw new Error('Field context parts must be non-empty and contain no pipe characters');
    }
  }
  return `nomad:field:v1|${context.table}|${context.column}|${context.rowId}`;
}

/** Encrypt one field value, bound to its table/column/row. */
export function encryptField(key: Uint8Array, context: FieldContext, plaintext: string): string {
  return JSON.stringify(sealText(plaintext, key, new TextEncoder().encode(fieldAad(context))));
}

/** Decrypt one field value. Copying a value to another row or column fails. */
export function decryptField(key: Uint8Array, context: FieldContext, stored: string): string {
  let envelope: EncryptedEnvelope;
  try {
    envelope = JSON.parse(stored) as EncryptedEnvelope;
  } catch (cause) {
    throw new Error('Stored field value is not a valid envelope', { cause });
  }
  return openText(envelope, key, new TextEncoder().encode(fieldAad(context)));
}

/**
 * SQLCipher PRAGMA key derived from the space data key (vault-style KDF, so
 * the database key is not the data key itself). Format: hex key for
 * `PRAGMA key = "x'<hex>'";`.
 */
export function deriveSqlCipherKey(dataKey: Uint8Array): string {
  const sodium = requireSodium();
  const derived = sodium.crypto_kdf_derive_from_key(32, 3, 'sqlciphk', dataKey);
  const hex = toHex(derived);
  derived.fill(0);
  return `x'${hex}'`;
}

/**
 * Contract for the encrypted local database. The desktop app implements this
 * with SQLCipher (design decision 4: SQLite with SQLCipher); tests can use an
 * in-memory implementation. Field-level encryption above is layered on top
 * for the most sensitive columns.
 */
export interface EncryptedDatabaseAdapter {
  open(path: string, pragmaKey: string): Promise<EncryptedDatabaseHandle>;
}

export interface EncryptedDatabaseHandle {
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

function requireSodium(): typeof import('libsodium-wrappers-sumo') {
  return sodiumReadyRef();
}
