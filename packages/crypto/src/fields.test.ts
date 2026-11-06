import { beforeAll, describe, expect, it } from 'vitest';
import { ensureReady, randomBytes, toHex } from './primitives.js';
import { encryptField, decryptField, deriveSqlCipherKey, fieldAad } from './fields.js';
import { SpaceKeys } from './keys.js';

describe('field-level encryption and SQLCipher seam', () => {
  beforeAll(async () => {
    await ensureReady();
  });

  it('round-trips a sensitive field value', () => {
    const key = randomBytes(32);
    const context = { table: 'bills', column: 'amount', rowId: 'row-1' };
    const stored = encryptField(key, context, '1234.56');
    expect(JSON.parse(stored)).toMatchObject({ v: 1 });
    expect(decryptField(key, context, stored)).toBe('1234.56');
  });

  it('binds values to their row: copying ciphertext to another row fails', () => {
    const key = randomBytes(32);
    const stored = encryptField(key, { table: 'bills', column: 'amount', rowId: 'row-1' }, '1234.56');
    expect(() =>
      decryptField(key, { table: 'bills', column: 'amount', rowId: 'row-2' }, stored),
    ).toThrowError(/tampered|wrong key|context/i);
    expect(() =>
      decryptField(key, { table: 'bills', column: 'note', rowId: 'row-1' }, stored),
    ).toThrowError();
  });

  it('derives a stable SQLCipher key that differs from the data key', () => {
    const dataKey = randomBytes(32);
    const pragmaKey = deriveSqlCipherKey(dataKey);
    expect(pragmaKey).toMatch(/^x'[0-9a-f]{64}'$/);
    expect(pragmaKey).not.toContain(toHex(dataKey));
    expect(deriveSqlCipherKey(dataKey)).toBe(pragmaKey);
  });

  it('rejects malformed field contexts', () => {
    expect(() => fieldAad({ table: 'a|b', column: 'c', rowId: 'r' })).toThrowError();
    expect(() => fieldAad({ table: '', column: 'c', rowId: 'r' })).toThrowError();
  });

  it('works with space collection keys end to end', () => {
    const keys = SpaceKeys.create('space-1');
    const documents = keys.collectionKey('documents');
    const stored = encryptField(documents, { table: 'documents', column: 'extracted', rowId: 'd1' }, 'invoice text');
    expect(decryptField(documents, { table: 'documents', column: 'extracted', rowId: 'd1' }, stored)).toBe(
      'invoice text',
    );
    // After rotating the collection key, old values must be re-encrypted by the app;
    // the old key still opens old values, the new key does not.
    const newKeys = SpaceKeys.fromSerialized(keys.serialize(), keys.getDataKey());
    newKeys.rotateCollectionKey('documents');
    expect(() =>
      decryptField(
        newKeys.collectionKey('documents'),
        { table: 'documents', column: 'extracted', rowId: 'd1' },
        stored,
      ),
    ).toThrowError();
  });
});
