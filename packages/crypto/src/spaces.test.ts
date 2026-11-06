import { beforeAll, describe, expect, it } from 'vitest';
import { ensureReady, NomadCryptoError, randomBytes, wipeBytes } from './primitives.js';
import { createDeviceKeys, openSealedDataKey, sealDataKeyForDevice } from './devices.js';
import { open, openText, sealText } from './envelope.js';
import {
  SpaceKeys,
  collectionWrapContext,
  contextBytes,
} from './keys.js';
import {
  SpaceStore,
  canManage,
  canWrite,
  roleAtLeast,
} from './spaces.js';

describe('spaces', () => {
  beforeAll(async () => {
    await ensureReady();
  });

  it('creates a space with an owner and an encrypted name', () => {
    const store = new SpaceStore();
    const ownerDevice = createDeviceKeys('dev-owner');
    const { directory, keys } = store.createSpace({
      spaceId: 'space-1',
      ownerUserId: 'alice',
      name: 'Household',
      spaceType: 'shared',
      ownerDevices: [{ deviceId: 'dev-owner', x25519PublicKey: ownerDevice.x25519.publicKey }],
    });
    expect(directory.members).toEqual([
      { userId: 'alice', role: 'owner', addedAt: directory.createdAt },
    ]);
    expect(directory.keyVersion).toBe(1);
    const unlocked = store.unlockSpaceDataKey('space-1', {
      userId: 'alice',
      deviceId: 'dev-owner',
      deviceKeys: ownerDevice,
    });
    expect(store.spaceName('space-1', unlocked)).toBe('Household');
    expect(keys.collectionKey('documents')).toHaveLength(32);
  });

  it('adds a member whose device can unlock the data key', () => {
    const store = new SpaceStore();
    const ownerDevice = createDeviceKeys('dev-owner');
    store.createSpace({
      spaceId: 's',
      ownerUserId: 'alice',
      name: 'Home',
      ownerDevices: [{ deviceId: 'dev-owner', x25519PublicKey: ownerDevice.x25519.publicKey }],
    });
    const unlocked = store.unlockSpaceDataKey('s', {
      userId: 'alice',
      deviceId: 'dev-owner',
      deviceKeys: ownerDevice,
    });
    const bobDevice = createDeviceKeys('dev-bob');
    store.addMember(
      's',
      { userId: 'alice' },
      {
        userId: 'bob',
        role: 'member',
        devices: [{ deviceId: 'dev-bob', x25519PublicKey: bobDevice.x25519.publicKey }],
      },
      unlocked,
    );
    const bobUnlock = store.unlockSpaceDataKey('s', {
      userId: 'bob',
      deviceId: 'dev-bob',
      deviceKeys: bobDevice,
    });
    expect(bobUnlock.keyVersion).toBe(1);
    expect(bobUnlock.dataKey).toEqual(unlocked.dataKey);
  });

  it('a non-member cannot unlock the space data key', () => {
    const store = new SpaceStore();
    const ownerDevice = createDeviceKeys('dev-owner');
    store.createSpace({
      spaceId: 's',
      ownerUserId: 'alice',
      name: 'Home',
      ownerDevices: [{ deviceId: 'dev-owner', x25519PublicKey: ownerDevice.x25519.publicKey }],
    });
    const malloryDevice = createDeviceKeys('dev-mallory');
    expect(() =>
      store.unlockSpaceDataKey('s', {
        userId: 'mallory',
        deviceId: 'dev-mallory',
        deviceKeys: malloryDevice,
      }),
    ).toThrowError(NomadCryptoError);
  });

  it('role gates: viewer cannot manage, member can write, owner can manage', () => {
    expect(canWrite('viewer')).toBe(false);
    expect(canWrite('member')).toBe(true);
    expect(canManage('member')).toBe(false);
    expect(canManage('owner')).toBe(true);
    expect(roleAtLeast('owner', 'member')).toBe(true);
    expect(roleAtLeast('viewer', 'member')).toBe(false);
  });

  it('only the owner can add or remove members', () => {
    const store = new SpaceStore();
    const ownerDevice = createDeviceKeys('dev-owner');
    store.createSpace({
      spaceId: 's',
      ownerUserId: 'alice',
      name: 'Home',
      ownerDevices: [{ deviceId: 'dev-owner', x25519PublicKey: ownerDevice.x25519.publicKey }],
    });
    const unlocked = store.unlockSpaceDataKey('s', {
      userId: 'alice',
      deviceId: 'dev-owner',
      deviceKeys: ownerDevice,
    });
    const bobDevice = createDeviceKeys('dev-bob');
    store.addMember(
      's',
      { userId: 'alice' },
      {
        userId: 'bob',
        role: 'viewer',
        devices: [{ deviceId: 'dev-bob', x25519PublicKey: bobDevice.x25519.publicKey }],
      },
      unlocked,
    );
    const carolDevice = createDeviceKeys('dev-carol');
    expect(() =>
      store.addMember(
        's',
        { userId: 'bob' },
        {
          userId: 'carol',
          role: 'member',
          devices: [{ deviceId: 'dev-carol', x25519PublicKey: carolDevice.x25519.publicKey }],
        },
        unlocked,
      ),
    ).toThrowError(/owner/i);
  });

  it('removing a member rotates the data key; the removed member cannot unlock or read new wraps', () => {
    const store = new SpaceStore();
    const ownerDevice = createDeviceKeys('dev-owner');
    store.createSpace({
      spaceId: 's',
      ownerUserId: 'alice',
      name: 'Home',
      ownerDevices: [{ deviceId: 'dev-owner', x25519PublicKey: ownerDevice.x25519.publicKey }],
    });
    const unlocked = store.unlockSpaceDataKey('s', {
      userId: 'alice',
      deviceId: 'dev-owner',
      deviceKeys: ownerDevice,
    });
    const bobDevice = createDeviceKeys('dev-bob');
    store.addMember(
      's',
      { userId: 'alice' },
      {
        userId: 'bob',
        role: 'member',
        devices: [{ deviceId: 'dev-bob', x25519PublicKey: bobDevice.x25519.publicKey }],
      },
      unlocked,
    );
    const bobOldKey = store.unlockSpaceDataKey('s', {
      userId: 'bob',
      deviceId: 'dev-bob',
      deviceKeys: bobDevice,
    });

    const result = store.removeMember('s', { userId: 'alice' }, 'bob', unlocked);
    expect(result.directory.keyVersion).toBe(2);
    expect(result.directory.members.map((m) => m.userId)).toEqual(['alice']);
    wipeBytes(result.oldDataKey);

    // Bob's device binding is gone.
    expect(() =>
      store.unlockSpaceDataKey('s', { userId: 'bob', deviceId: 'dev-bob', deviceKeys: bobDevice }),
    ).toThrowError(NomadCryptoError);

    // Bob's old data key cannot open the new collection wraps.
    const directory = store.require('s');
    const probe = directory.wrappedCollections.documents!;
    expect(() =>
      open(probe, bobOldKey.dataKey, contextBytes(collectionWrapContext('s'))),
    ).toThrowError(NomadCryptoError);

    // The owner unlocks with the rotated key and the collections still open.
    const freshUnlock = store.unlockSpaceDataKey('s', {
      userId: 'alice',
      deviceId: 'dev-owner',
      deviceKeys: ownerDevice,
    });
    expect(freshUnlock.keyVersion).toBe(2);
    const keys = store.spaceKeysFrom('s', freshUnlock);
    const note = sealText('after rotation', keys.collectionKey('notes'));
    expect(openText(note, keys.collectionKey('notes'))).toBe('after rotation');
  });

  it('cannot remove the last owner', () => {
    const store = new SpaceStore();
    const ownerDevice = createDeviceKeys('dev-owner');
    store.createSpace({
      spaceId: 's',
      ownerUserId: 'alice',
      name: 'Home',
      ownerDevices: [{ deviceId: 'dev-owner', x25519PublicKey: ownerDevice.x25519.publicKey }],
    });
    const unlocked = store.unlockSpaceDataKey('s', {
      userId: 'alice',
      deviceId: 'dev-owner',
      deviceKeys: ownerDevice,
    });
    expect(() => store.removeMember('s', { userId: 'alice' }, 'alice', unlocked)).toThrowError(
      /last owner/,
    );
  });

  it('lists only visible spaces; private spaces of others are invisible', () => {
    const store = new SpaceStore();
    const aliceDevice = createDeviceKeys('dev-alice');
    const bobDevice = createDeviceKeys('dev-bob');
    store.createSpace({
      spaceId: 'alice-private',
      ownerUserId: 'alice',
      name: 'Alice private',
      ownerDevices: [{ deviceId: 'dev-alice', x25519PublicKey: aliceDevice.x25519.publicKey }],
    });
    store.createSpace({ spaceId: 'bob-private', ownerUserId: 'bob', name: 'Bob private' });
    store.createSpace({
      spaceId: 'household',
      ownerUserId: 'alice',
      name: 'Household',
      spaceType: 'shared',
      ownerDevices: [{ deviceId: 'dev-alice', x25519PublicKey: aliceDevice.x25519.publicKey }],
    });
    const unlocked = store.unlockSpaceDataKey('household', {
      userId: 'alice',
      deviceId: 'dev-alice',
      deviceKeys: aliceDevice,
    });
    store.addMember(
      'household',
      { userId: 'alice' },
      {
        userId: 'bob',
        role: 'member',
        devices: [{ deviceId: 'dev-bob', x25519PublicKey: bobDevice.x25519.publicKey }],
      },
      unlocked,
    );
    // Bob sees his own private space plus the shared household, never
    // Alice's private space.
    expect(store.listVisibleSpaces('bob').map((d) => d.spaceId).sort()).toEqual([
      'bob-private',
      'household',
    ]);
    expect(store.listVisibleSpaces('alice').map((d) => d.spaceId).sort()).toEqual([
      'alice-private',
      'household',
    ]);
    expect(store.listVisibleSpaces('mallory')).toEqual([]);
  });

  it('revoking a device removes its sealed key copy', () => {
    const store = new SpaceStore();
    const ownerDevice = createDeviceKeys('dev-owner');
    const secondDevice = createDeviceKeys('dev-second');
    store.createSpace({
      spaceId: 's',
      ownerUserId: 'alice',
      name: 'Home',
      ownerDevices: [
        { deviceId: 'dev-owner', x25519PublicKey: ownerDevice.x25519.publicKey },
        { deviceId: 'dev-second', x25519PublicKey: secondDevice.x25519.publicKey },
      ],
    });
    store.revokeDevice('s', { userId: 'alice' }, 'dev-second');
    expect(() =>
      store.unlockSpaceDataKey('s', {
        userId: 'alice',
        deviceId: 'dev-second',
        deviceKeys: secondDevice,
      }),
    ).toThrowError(NomadCryptoError);
    expect(
      store.unlockSpaceDataKey('s', {
        userId: 'alice',
        deviceId: 'dev-owner',
        deviceKeys: ownerDevice,
      }).keyVersion,
    ).toBe(1);
  });

  it('stale unlocked keys are refused for management operations', () => {
    const store = new SpaceStore();
    const ownerDevice = createDeviceKeys('dev-owner');
    store.createSpace({
      spaceId: 's',
      ownerUserId: 'alice',
      name: 'Home',
      ownerDevices: [{ deviceId: 'dev-owner', x25519PublicKey: ownerDevice.x25519.publicKey }],
    });
    const unlocked = store.unlockSpaceDataKey('s', {
      userId: 'alice',
      deviceId: 'dev-owner',
      deviceKeys: ownerDevice,
    });
    const bobDevice = createDeviceKeys('dev-bob');
    store.addMember(
      's',
      { userId: 'alice' },
      {
        userId: 'bob',
        role: 'member',
        devices: [{ deviceId: 'dev-bob', x25519PublicKey: bobDevice.x25519.publicKey }],
      },
      unlocked,
    );
    store.removeMember('s', { userId: 'alice' }, 'bob', unlocked);
    const carolDevice = createDeviceKeys('dev-carol');
    expect(() =>
      store.addMember(
        's',
        { userId: 'alice' },
        {
          userId: 'carol',
          role: 'member',
          devices: [{ deviceId: 'dev-carol', x25519PublicKey: carolDevice.x25519.publicKey }],
        },
        unlocked,
      ),
    ).toThrowError(/stale/);
  });

  it('device sealing round-trips', () => {
    const device = createDeviceKeys('dev-x');
    const dataKey = randomBytes(32);
    const sealedKey = sealDataKeyForDevice(dataKey, device.x25519.publicKey);
    expect(openSealedDataKey(sealedKey, device.x25519)).toEqual(dataKey);
    const other = createDeviceKeys('dev-y');
    expect(() => openSealedDataKey(sealedKey, other.x25519)).toThrowError(NomadCryptoError);
  });

  it('restores full space keys from a serialized directory plus unlocked data key', () => {
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
    const original = SpaceKeys.create('s2');
    expect(keys.collectionKey('events')).not.toEqual(original.collectionKey('events'));
  });
});
