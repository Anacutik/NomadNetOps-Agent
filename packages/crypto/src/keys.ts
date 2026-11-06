// Key hierarchy per technical design section 6:
//   Data Key (DK)  ->  wraps per-collection keys  ->  collection keys wrap per-document keys.
// Every collection/document key is stored only as an envelope; raw keys live in memory.
import {
  copyBytes,
  randomBytes,
  wipeBytes,
} from './primitives.js';
import {
  type EncryptedEnvelope,
  open,
  reencrypt,
  seal,
} from './envelope.js';

export const COLLECTION_IDS = ['documents', 'finances', 'notes', 'events'] as const;
export type CollectionId = (typeof COLLECTION_IDS)[number];

export const DATA_KEY_CONTEXT = 'nomad:wrap:dk:v1';
export const collectionWrapContext = (spaceId: string): string => `nomad:wrap:ck:v1:${spaceId}`;
export const documentWrapContext = (collectionId: CollectionId): string => `nomad:wrap:doc:v1:${collectionId}`;

/** Text AAD for envelope contexts. Non-ASCII is not allowed; contexts are internal. */
export function contextBytes(context: string): Uint8Array {
  return new TextEncoder().encode(context);
}

export interface WrappedDocumentKey {
  readonly collectionId: CollectionId;
  readonly envelope: EncryptedEnvelope;
}

/** Serializable hierarchy: raw keys never appear, only envelopes. */
export interface SerializedSpaceKeys {
  readonly v: number;
  readonly spaceId: string;
  readonly keyVersion: number;
  /** Collection keys wrapped under the data key. */
  readonly wrappedCollections: Readonly<Record<CollectionId, EncryptedEnvelope>>;
  /** Per-document keys wrapped under their collection key. */
  readonly wrappedDocuments: Readonly<Record<string, WrappedDocumentKey>>;
}

export class SpaceKeys {
  private readonly spaceId: string;
  private keyVersion: number;
  private dataKey: Uint8Array;
  private readonly collectionKeys = new Map<CollectionId, Uint8Array>();
  private readonly wrappedCollections = new Map<CollectionId, EncryptedEnvelope>();
  private readonly documentKeys = new Map<string, { collectionId: CollectionId; key: Uint8Array }>();
  private readonly wrappedDocuments = new Map<string, WrappedDocumentKey>();

  private constructor(spaceId: string, dataKey: Uint8Array, keyVersion: number) {
    this.spaceId = spaceId;
    this.dataKey = dataKey;
    this.keyVersion = keyVersion;
  }

  /** Generate a fresh hierarchy for a space. */
  static create(spaceId: string): SpaceKeys {
    const dataKey = randomBytes(32);
    const spaceKeys = new SpaceKeys(spaceId, dataKey, 1);
    for (const id of COLLECTION_IDS) {
      const collectionKey = randomBytes(32);
      spaceKeys.collectionKeys.set(id, collectionKey);
      spaceKeys.wrappedCollections.set(
        id,
        seal(collectionKey, dataKey, contextBytes(collectionWrapContext(spaceId))),
      );
    }
    return spaceKeys;
  }

  static fromSerialized(serialized: SerializedSpaceKeys, dataKey: Uint8Array): SpaceKeys {
    if (serialized.v !== 1) {
      throw new Error(`Unsupported space keys version ${String(serialized.v)}`);
    }
    if (dataKey.length !== 32) {
      throw new Error('Data key must be 32 bytes');
    }
    const spaceKeys = new SpaceKeys(serialized.spaceId, copyBytes(dataKey), serialized.keyVersion);
    for (const id of COLLECTION_IDS) {
      const envelope = serialized.wrappedCollections[id];
      if (!envelope) {
        throw new Error(`Serialized keys are missing collection ${id}`);
      }
      const key = open(envelope, dataKey, contextBytes(collectionWrapContext(spaceKeys.spaceId)));
      spaceKeys.collectionKeys.set(id, key);
      spaceKeys.wrappedCollections.set(id, envelope);
    }
    for (const [docRef, wrapped] of Object.entries(serialized.wrappedDocuments)) {
      const collectionKey = spaceKeys.collectionKeys.get(wrapped.collectionId);
      if (!collectionKey) {
        throw new Error(`Serialized keys reference unknown collection ${wrapped.collectionId}`);
      }
      const key = open(wrapped.envelope, collectionKey, contextBytes(documentWrapContext(wrapped.collectionId)));
      spaceKeys.documentKeys.set(docRef, { collectionId: wrapped.collectionId, key });
      spaceKeys.wrappedDocuments.set(docRef, wrapped);
    }
    return spaceKeys;
  }

  get id(): string {
    return this.spaceId;
  }

  get version(): number {
    return this.keyVersion;
  }

  /** The raw data key. Handle with care; never log or serialize it. */
  getDataKey(): Uint8Array {
    return copyBytes(this.dataKey);
  }

  collectionKey(id: CollectionId): Uint8Array {
    const key = this.collectionKeys.get(id);
    if (!key) throw new Error(`No collection key for ${id}`);
    return copyBytes(key);
  }

  /** Create and wrap a per-document key so one document can be deleted cryptographically. */
  createDocumentKey(docRef: string, collectionId: CollectionId): Uint8Array {
    if (this.documentKeys.has(docRef)) {
      throw new Error(`Document key already exists for ${docRef}`);
    }
    const collectionKey = this.requireCollectionKey(collectionId);
    const key = randomBytes(32);
    this.documentKeys.set(docRef, { collectionId, key });
    this.wrappedDocuments.set(docRef, {
      collectionId,
      envelope: seal(key, collectionKey, contextBytes(documentWrapContext(collectionId))),
    });
    return copyBytes(key);
  }

  documentKey(docRef: string): Uint8Array {
    const entry = this.documentKeys.get(docRef);
    if (!entry) throw new Error(`No document key for ${docRef}`);
    return copyBytes(entry.key);
  }

  collectionOf(docRef: string): CollectionId {
    const entry = this.documentKeys.get(docRef);
    if (!entry) throw new Error(`No document key for ${docRef}`);
    return entry.collectionId;
  }

  /** Cryptographic deletion of one document: destroy its key. */
  destroyDocumentKey(docRef: string): void {
    const entry = this.documentKeys.get(docRef);
    if (!entry) return;
    wipeBytes(entry.key);
    this.documentKeys.delete(docRef);
    this.wrappedDocuments.delete(docRef);
  }

  /**
   * Rotate the data key: every collection key is re-wrapped under the new data
   * key. Data encrypted under collection/document keys does not need to be
   * re-encrypted. Returns the old key so the caller can zero it.
   */
  rotateDataKey(): Uint8Array {
    const newKey = randomBytes(32);
    const oldKey = this.dataKey;
    for (const id of COLLECTION_IDS) {
      const envelope = this.wrappedCollections.get(id);
      const key = this.collectionKeys.get(id);
      if (!envelope || !key) continue;
      this.wrappedCollections.set(
        id,
        reencrypt(envelope, oldKey, newKey, contextBytes(collectionWrapContext(this.spaceId))),
      );
    }
    this.dataKey = newKey;
    this.keyVersion += 1;
    return oldKey;
  }

  /**
   * Rotate everything: data key AND every collection key. Used when a member
   * is removed: even if they cached the old wrapped collection keys, those
   * opens fail for everything written after rotation. Document keys are
   * re-wrapped, so existing document data stays readable for remaining members.
   */
  rotateAll(): void {
    this.rotateDataKey();
    for (const id of COLLECTION_IDS) {
      if (this.collectionKeys.has(id)) this.rotateCollectionKey(id);
    }
  }

  /**
   * Rotate a collection key: document keys are re-wrapped under the new
   * collection key; document data itself can stay where it is.
   * Returns the old key so the caller can zero it.
   */
  rotateCollectionKey(id: CollectionId): Uint8Array {
    const oldKey = this.requireCollectionKey(id);
    const newKey = randomBytes(32);
    for (const [docRef, entry] of this.documentKeys) {
      if (entry.collectionId !== id) continue;
      const wrapped = this.wrappedDocuments.get(docRef);
      if (!wrapped) continue;
      this.wrappedDocuments.set(docRef, {
        collectionId: id,
        envelope: reencrypt(wrapped.envelope, oldKey, newKey, contextBytes(documentWrapContext(id))),
      });
    }
    this.collectionKeys.set(id, newKey);
    this.wrappedCollections.set(
      id,
      seal(newKey, this.dataKey, contextBytes(collectionWrapContext(this.spaceId))),
    );
    return oldKey;
  }

  serialize(): SerializedSpaceKeys {
    const collections: Record<string, EncryptedEnvelope> = {};
    for (const id of COLLECTION_IDS) {
      const envelope = this.wrappedCollections.get(id);
      if (envelope) collections[id] = envelope;
    }
    const documents: Record<string, WrappedDocumentKey> = {};
    for (const [docRef, wrapped] of this.wrappedDocuments) {
      documents[docRef] = wrapped;
    }
    return {
      v: 1,
      spaceId: this.spaceId,
      keyVersion: this.keyVersion,
      wrappedCollections: collections as Record<CollectionId, EncryptedEnvelope>,
      wrappedDocuments: documents,
    };
  }

  /** Best-effort zeroization of all raw keys held in memory. */
  destroy(): void {
    wipeBytes(this.dataKey);
    for (const key of this.collectionKeys.values()) wipeBytes(key);
    for (const entry of this.documentKeys.values()) wipeBytes(entry.key);
    this.collectionKeys.clear();
    this.documentKeys.clear();
    this.wrappedCollections.clear();
    this.wrappedDocuments.clear();
  }

  private requireCollectionKey(id: CollectionId): Uint8Array {
    const key = this.collectionKeys.get(id);
    if (!key) throw new Error(`No collection key for ${id}`);
    return key;
  }
}

/** Wrap a data key under another 32-byte key with a purpose-specific context. */
export function wrapDataKey(dataKey: Uint8Array, wrapperKey: Uint8Array, context: string): EncryptedEnvelope {
  return seal(dataKey, wrapperKey, contextBytes(context));
}

/** Unwrap a data key. Fails cleanly (no key material in errors) when wrong. */
export function unwrapDataKey(envelope: EncryptedEnvelope, wrapperKey: Uint8Array, context: string): Uint8Array {
  return open(envelope, wrapperKey, contextBytes(context));
}
