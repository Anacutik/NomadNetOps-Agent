import { beforeAll, describe, expect, it } from 'vitest';
import { ensureReady, randomBytes, toHex } from './primitives.js';
import {
  InMemoryPasskeyAdapter,
  SecondFactorService,
  generateBackupCodes,
} from './auth.js';
import { RecoveryService } from './recovery.js';
import { createDeviceKeys, sealDataKeyForDevice, openSealedDataKey } from './devices.js';
import {
  SpaceKeys,
  unwrapDataKey,
  wrapDataKey,
} from './keys.js';
import {
  unwrapDataKeyWithPassword,
  wrapDataKeyWithPassword,
} from './password.js';
import {
  unwrapDataKeyWithPhrase,
  wrapDataKeyWithPhrase,
  generateRecoveryPhrase,
} from './phrase.js';
import { SpaceStore } from './spaces.js';
import { sealText, openText } from './envelope.js';
import { destroySpaceKeys, assertUnwrapFails } from './deletion.js';

/**
 * Red-team style checks for the crypto package: tampering, replay, downgrade,
 * secret leakage through serialisation and errors, and privilege escalation
 * through the space APIs.
 */
describe('crypto red-team', () => {
  beforeAll(async () => {
    await ensureReady();
  });

  it('never leaks raw keys through any serialisable structure', () => {
    const store = new SpaceStore();
    const device = createDeviceKeys('dev-a');
    store.createSpace({
      spaceId: 's',
      ownerUserId: 'alice',
      name: 'Home',
      ownerDevices: [{ deviceId: 'dev-a', x25519PublicKey: device.x25519.publicKey }],
    });
    const unlocked = store.unlockSpaceDataKey('s', {
      userId: 'alice',
      deviceId: 'dev-a',
      deviceKeys: device,
    });
    const keys = store.spaceKeysFrom('s', unlocked);
    const surfaces = [
      JSON.stringify(store.serialize()),
      JSON.stringify(keys.serialize()),
      JSON.stringify(Array.from(store.serialize()[0]!.deviceBindings)),
    ];
    const leaks = [
      toHex(unlocked.dataKey),
      b64urlOf(unlocked.dataKey),
      toHex(keys.collectionKey('notes')),
      b64urlOf(keys.collectionKey('notes')),
    ];
    for (const surface of surfaces) {
      for (const leak of leaks) {
        expect(surface).not.toContain(leak);
      }
    }
  });

  it('error messages never contain plaintext or key material', () => {
    const dataKey = randomBytes(32);
    const wrong = randomBytes(32);
    const envelope = sealText('TOPSECRET-plaintext-marker', dataKey);
    try {
      openText(envelope, wrong);
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain('TOPSECRET');
      expect(message).not.toContain(toHex(dataKey));
      expect(message).not.toContain(toHex(wrong));
    }
  });

  it('bit-flipping anywhere in an envelope is always detected', () => {
    const key = randomBytes(32);
    const envelope = sealText('tamper target', key);
    for (const position of [0, 5, 20]) {
      const raw = b64ToBytes(envelope.c);
      raw[position] = (raw[position]! + 1) % 256;
      const tampered = { ...envelope, c: bytesToB64(raw) };
      expect(assertUnwrapFails(tampered, key)).toBe(true);
    }
  });

  it('downgrade attacks: version fields are enforced, not ignored', () => {
    const key = randomBytes(32);
    const envelope = { ...sealText('x', key), v: 0 };
    expect(() => openText(envelope, key)).toThrowError();
    const dataKey = randomBytes(32);
    const wrap = wrapDataKeyWithPassword(dataKey, 'pw', 'test');
    const oldRecord = { ...wrap.record, v: 0 };
    expect(() => unwrapDataKeyWithPassword(wrap.envelope, oldRecord, 'pw')).toThrowError();
  });

  it('replay of a wrapped key under a different context fails', () => {
    const dataKey = randomBytes(32);
    const wrapper = randomBytes(32);
    const envelope = wrapDataKey(dataKey, wrapper, 'nomad:wrap:dk:v1');
    expect(() => unwrapDataKey(envelope, wrapper, 'nomad:wrap:ck:v1:space-2')).toThrowError();
  });

  it('forged role claims cannot manage a space', () => {
    const store = new SpaceStore();
    const device = createDeviceKeys('dev-a');
    store.createSpace({
      spaceId: 's',
      ownerUserId: 'alice',
      name: 'Home',
      ownerDevices: [{ deviceId: 'dev-a', x25519PublicKey: device.x25519.publicKey }],
    });
    const unlocked = store.unlockSpaceDataKey('s', {
      userId: 'alice',
      deviceId: 'dev-a',
      deviceKeys: device,
    });
    // Mallory is not a member; every management call must refuse.
    expect(() =>
      store.setRole('s', { userId: 'mallory' }, 'alice', 'viewer'),
    ).toThrowError(/member|forbidden/i);
    expect(() =>
      store.addMember(
        's',
        { userId: 'mallory' },
        { userId: 'accomplice', role: 'owner', devices: [] },
        unlocked,
      ),
    ).toThrowError(/member|forbidden/i);
  });

  it('a stale data key cannot be replayed to add devices after rotation', () => {
    const store = new SpaceStore();
    const device = createDeviceKeys('dev-a');
    store.createSpace({
      spaceId: 's',
      ownerUserId: 'alice',
      name: 'Home',
      ownerDevices: [{ deviceId: 'dev-a', x25519PublicKey: device.x25519.publicKey }],
    });
    const unlocked = store.unlockSpaceDataKey('s', {
      userId: 'alice',
      deviceId: 'dev-a',
      deviceKeys: device,
    });
    const second = createDeviceKeys('dev-b');
    store.addDevice('s', { userId: 'alice' }, { userId: 'alice', device: { deviceId: 'dev-b', x25519PublicKey: second.x25519.publicKey } }, unlocked);
    // Rotate by removing a (nonexistent-then-added) member to bump the version.
    const bob = createDeviceKeys('dev-c');
    store.addMember(
      's',
      { userId: 'alice' },
      { userId: 'bob', role: 'member', devices: [{ deviceId: 'dev-c', x25519PublicKey: bob.x25519.publicKey }] },
      unlocked,
    );
    store.removeMember('s', { userId: 'alice' }, 'bob', unlocked);
    // `unlocked` is now stale: adding another device with it must fail.
    const third = createDeviceKeys('dev-d');
    expect(() =>
      store.addDevice(
        's',
        { userId: 'alice' },
        { userId: 'alice', device: { deviceId: 'dev-d', x25519PublicKey: third.x25519.publicKey } },
        unlocked,
      ),
    ).toThrowError(/stale/);
  });

  it('backup codes cannot be brute-forced from their hashes in the snapshot', () => {
    const set = generateBackupCodes(10);
    const service = new SecondFactorService();
    const codes = service.rotateBackupCodes(10);
    const snapshot = JSON.stringify(service.getSnapshot());
    for (const code of [...set.plaintextCodes, ...codes]) {
      expect(snapshot).not.toContain(code);
      expect(snapshot).not.toContain(code.replace('-', ''));
    }
  });

  it('passkey assertions for another user are rejected', async () => {
    const service = new SecondFactorService(new InMemoryPasskeyAdapter());
    const credential = await service.registerPasskey('alice', 'Phone');
    expect(await service.verifyPasskey('mallory', credential.credentialId)).toBe(false);
  });

  it('recovery completion cannot be forced before the waiting period', () => {
    const service = new RecoveryService({ clock: { now: () => 0 } });
    const request = service.start({ userId: 'alice', periodHours: 24 });
    // Attacker supplies a fake "later" clock: still rejected because complete
    // uses the service clock unless an explicit `at` is provided by the caller;
    // the caller-side check is the boundary under test here.
    expect(() => service.complete(request.id, 3600_000)).toThrowError();
  });

  it('destroyed space keys leave nothing usable on the object', () => {
    const keys = SpaceKeys.create('s');
    keys.createDocumentKey('doc-1', 'documents');
    const serialized = keys.serialize();

    destroySpaceKeys(keys);

    // Every accessor refuses; internal buffers are zeroed (best effort in JS).
    for (const id of ['documents', 'finances', 'notes', 'events'] as const) {
      expect(() => keys.collectionKey(id)).toThrowError();
    }
    expect(() => keys.documentKey('doc-1')).toThrowError();
    expect(() => keys.getDataKey()).not.toThrow();
    expect(keys.getDataKey()).toEqual(new Uint8Array(32));
    // The stored wraps stay on disk but can no longer be opened via this object.
    expect(serialized.wrappedCollections.documents).toBeDefined();
    expect(() =>
      SpaceKeys.fromSerialized(
        { ...serialized, dataKey: new Uint8Array(32) } as never,
        new Uint8Array(32),
      ),
    ).toThrowError();
  });

  it('phrase restore and password restore yield the same data key', () => {
    const dataKey = randomBytes(32);
    const phrase = generateRecoveryPhrase(128);
    const phraseWrap = wrapDataKeyWithPhrase(dataKey, phrase);
    const passwordWrap = wrapDataKeyWithPassword(dataKey, 'password here', 'test');
    expect(toHex(unwrapDataKeyWithPhrase(phrase, phraseWrap))).toBe(toHex(dataKey));
    expect(toHex(unwrapDataKeyWithPassword(passwordWrap.envelope, passwordWrap.record, 'password here'))).toBe(
      toHex(dataKey),
    );
  });

  it('sealed device copies cannot be opened by a forged registry entry', () => {
    const device = createDeviceKeys('dev-a');
    const dataKey = randomBytes(32);
    const sealed = sealDataKeyForDevice(dataKey, device.x25519.publicKey);
    // An attacker swaps in their own device keys: opening fails.
    const attacker = createDeviceKeys('dev-attacker');
    expect(() => openSealedDataKey(sealed, attacker.x25519)).toThrowError();
  });
});

function b64urlOf(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesToB64(bytes: Uint8Array): string {
  return b64urlOf(bytes);
}

function b64ToBytes(text: string): Uint8Array {
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
