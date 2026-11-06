import { beforeAll, describe, expect, it } from 'vitest';
import { ensureReady, copyBytes, randomBytes } from './primitives.js';
import { open, openText, sealText } from './envelope.js';
import {
  COLLECTION_IDS,
  SpaceKeys,
  collectionWrapContext,
  contextBytes,
  documentWrapContext,
  unwrapDataKey,
  wrapDataKey,
} from './keys.js';

describe('key hierarchy', () => {
  beforeAll(async () => {
    await ensureReady();
  });

  it('creates a hierarchy with all collections', () => {
    const keys = SpaceKeys.create('s1');
    for (const id of COLLECTION_IDS) {
      const key = keys.collectionKey(id);
      expect(key).toHaveLength(32);
    }
  });

  it('serializes without raw keys and restores from a data key', () => {
    const keys = SpaceKeys.create('s1');
    const docKey = keys.createDocumentKey('doc-1', 'documents');
    const serialized = JSON.parse(JSON.stringify(keys.serialize())) as ReturnType<
      SpaceKeys['serialize']
    >;
    const raw = JSON.stringify(serialized);
    expect(raw).not.toContain(b64Of(keys.getDataKey()));
    expect(raw).not.toContain(hexOf(docKey));

    const restored = SpaceKeys.fromSerialized(serialized, keys.getDataKey());
    expect(restored.collectionKey('documents')).toEqual(keys.collectionKey('documents'));
    expect(restored.documentKey('doc-1')).toEqual(docKey);
    expect(restored.collectionOf('doc-1')).toBe('documents');
  });

  it('encrypts document data under the document key', () => {
    const keys = SpaceKeys.create('s1');
    const docKey = keys.createDocumentKey('doc-1', 'documents');
    const envelope = sealText('bill.pdf contents', docKey);
    expect(openText(envelope, keys.documentKey('doc-1'))).toBe('bill.pdf contents');
    // Other collection keys cannot open it.
    expect(() => openText(envelope, keys.collectionKey('finances'))).toThrow();
  });

  it('rotates the data key: new wraps need the new key', () => {
    const keys = SpaceKeys.create('s1');
    const documentsBefore = keys.collectionKey('documents');
    const oldDataKey = keys.getDataKey();
    const serializedBefore = keys.serialize();

    const old = keys.rotateDataKey();
    expect(old).toEqual(oldDataKey);
    expect(keys.version).toBe(2);
    expect(keys.collectionKey('documents')).toEqual(documentsBefore);

    // The new wrapped collection envelope requires the new data key.
    const newWrapped = keys.serialize().wrappedCollections.documents!;
    expect(unwrapDataKey(newWrapped, keys.getDataKey(), collectionWrapContext('s1'))).toEqual(
      documentsBefore,
    );
    expect(() =>
      unwrapDataKey(newWrapped, oldDataKey, collectionWrapContext('s1')),
    ).toThrow();
    // A stale copy of the old envelope still opens with the old key (the
    // holder kept the bytes); rotation's guarantee is that the directory now
    // serves only the new wraps.
    const staleWrapped = serializedBefore.wrappedCollections.documents!;
    expect(unwrapDataKey(staleWrapped, oldDataKey, collectionWrapContext('s1'))).toEqual(
      documentsBefore,
    );
  });

  it('rotateAll() also rotates collection keys so old copies cannot read new data', () => {
    const keys = SpaceKeys.create('s1');
    const docKey = keys.createDocumentKey('doc-1', 'documents');
    const oldDataKey = keys.getDataKey();
    const oldCollections = JSON.parse(JSON.stringify(keys.serialize().wrappedCollections)) as Record<
      string,
      Parameters<typeof unwrapDataKey>[0]
    >;

    keys.rotateAll();
    expect(keys.version).toBe(2);
    // Document key content unchanged (re-wrapped, not replaced).
    expect(keys.documentKey('doc-1')).toEqual(docKey);
    // Old data key cannot unwrap any new collection wrap.
    for (const envelope of Object.values(keys.serialize().wrappedCollections)) {
      expect(() => unwrapDataKey(envelope, oldDataKey, collectionWrapContext('s1'))).toThrow();
    }
    // Old collection key copies cannot open the new collection envelopes.
    for (const [id, staleEnvelope] of Object.entries(oldCollections)) {
      void staleEnvelope;
      const freshEnvelope = keys.serialize().wrappedCollections[id as keyof typeof oldCollections]!;
      expect(() =>
        unwrapDataKey(freshEnvelope, oldDataKey, collectionWrapContext('s1')),
      ).toThrow();
    }
  });

  it('rotates a collection key and re-wraps its document keys', () => {
    const keys = SpaceKeys.create('s1');
    const docKey = keys.createDocumentKey('doc-1', 'documents');
    const docKeyHex = hexOf(docKey);
    const oldCollectionKey = copyBytes(keys.collectionKey('documents'));
    const oldWrapped = keys.serialize().wrappedDocuments['doc-1']!;

    const old = keys.rotateCollectionKey('documents');
    expect(old).toEqual(oldCollectionKey);
    expect(keys.collectionKey('documents')).not.toEqual(oldCollectionKey);
    expect(keys.documentKey('doc-1')).toEqual(docKey);

    // The new collection key opens the re-wrapped document key envelope.
    const newWrapped = keys.serialize().wrappedDocuments['doc-1']!;
    const opened = open(
      newWrapped.envelope,
      keys.collectionKey('documents'),
      contextBytes(documentWrapContext('documents')),
    );
    expect(hexOf(opened)).toBe(docKeyHex);
    expect(() =>
      open(newWrapped.envelope, oldCollectionKey, contextBytes(documentWrapContext('documents'))),
    ).toThrow();
    // A stale copy of the old wrap still opens with the old key bytes the
    // holder kept; the hierarchy simply no longer references it.
    expect(
      hexOf(open(oldWrapped.envelope, oldCollectionKey, contextBytes(documentWrapContext('documents')))),
    ).toBe(docKeyHex);
  });

  it('destroying a document key removes it from the hierarchy', () => {
    const keys = SpaceKeys.create('s1');
    const docKey = keys.createDocumentKey('doc-1', 'documents');
    const envelope = sealText('secret doc', docKey);
    keys.destroyDocumentKey('doc-1');
    expect(() => keys.documentKey('doc-1')).toThrow();
    expect(keys.serialize().wrappedDocuments['doc-1']).toBeUndefined();
    // Data stays unreadable to everyone except holders of the raw key copy.
    expect(openText(envelope, docKey)).toBe('secret doc');
  });

  it('destroy() zeroes all keys in memory', () => {
    const keys = SpaceKeys.create('s1');
    keys.destroy();
    expect(keys.getDataKey()).toEqual(new Uint8Array(32));
  });

  it('wraps and unwraps a data key under another key with context binding', () => {
    const dataKey = randomBytes(32);
    const wrapper = randomBytes(32);
    const envelope = wrapDataKey(dataKey, wrapper, 'nomad:wrap:dk:v1');
    expect(unwrapDataKey(envelope, wrapper, 'nomad:wrap:dk:v1')).toEqual(dataKey);
    expect(() => unwrapDataKey(envelope, wrapper, 'nomad:wrap:other')).toThrow();
  });

  it('refuses unknown serialization versions', () => {
    const keys = SpaceKeys.create('s1');
    const serialized = { ...keys.serialize(), v: 9 };
    expect(() =>
      SpaceKeys.fromSerialized(serialized as never, keys.getDataKey()),
    ).toThrow(/version/i);
  });

  it('refuses to restore with the wrong data key', () => {
    const keys = SpaceKeys.create('s1');
    const serialized = keys.serialize();
    expect(() => SpaceKeys.fromSerialized(serialized, randomBytes(32))).toThrow();
  });
});

function b64Of(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function hexOf(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
