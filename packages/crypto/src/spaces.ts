// Spaces (ADR 0003): one Data Key per space, wrapped per member device.
// Roles: owner, member, viewer. Removing a member rotates the space data key.
// Private spaces of other users are invisible in listings.
import { NomadCryptoError } from './primitives.js';
import { bytesToB64Url, bytesFromB64Url } from './encoding.js';
import { open, type EncryptedEnvelope, openText, sealText } from './envelope.js';
import {
  COLLECTION_IDS,
  type CollectionId,
  type SerializedSpaceKeys,
  SpaceKeys,
  collectionWrapContext,
  contextBytes,
} from './keys.js';
import {
  openSealedDataKey,
  sealDataKeyForDevice,
  type SealedForDevice,
} from './devices.js';

export type SpaceRole = 'owner' | 'member' | 'viewer';

export type SpaceType = 'personal' | 'shared';

export interface SpaceDeviceBinding {
  readonly userId: string;
  readonly deviceId: string;
  /** Base64url X25519 public key of the device, needed to re-seal on rotation. */
  readonly devicePublicKey: string;
  /** Space data key sealed to this device. */
  readonly sealedDataKey: SealedForDevice;
}

export interface SpaceMemberRecord {
  readonly userId: string;
  readonly role: SpaceRole;
  readonly addedAt: number;
}

export interface SpaceDirectorySnapshot {
  readonly v: number;
  readonly spaceId: string;
  readonly spaceType: SpaceType;
  /** Space name, encrypted under the space data key. */
  readonly nameEnvelope: EncryptedEnvelope;
  readonly wrappedCollections: Readonly<Record<CollectionId, EncryptedEnvelope>>;
  readonly members: readonly SpaceMemberRecord[];
  /** Key material sealed per member device. */
  readonly deviceBindings: readonly SpaceDeviceBinding[];
  readonly keyVersion: number;
  readonly createdAt: number;
}

export interface Actor {
  /** Resolved against the space directory membership; never trusted as input. */
  readonly userId: string;
}

export interface MemberDeviceInput {
  readonly deviceId: string;
  readonly x25519PublicKey: Uint8Array;
}

export interface UnlockedDataKey {
  readonly dataKey: Uint8Array;
  readonly keyVersion: number;
}

const ROLE_RANK: Record<SpaceRole, number> = { viewer: 0, member: 1, owner: 2 };

export function roleAtLeast(role: SpaceRole, minimum: SpaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function canWrite(role: SpaceRole): boolean {
  return roleAtLeast(role, 'member');
}

export function canManage(role: SpaceRole): boolean {
  return role === 'owner';
}

function nameContext(spaceId: string): Uint8Array {
  return contextBytes(`nomad:space-name:v1:${spaceId}`);
}

export class SpaceStore {
  private readonly directories = new Map<string, SpaceDirectorySnapshot>();

  /** Create a space with one owner. Returns the directory and an unlocked SpaceKeys. */
  createSpace(input: {
    spaceId: string;
    ownerUserId: string;
    name: string;
    spaceType?: SpaceType;
    ownerDevices?: readonly MemberDeviceInput[];
    now?: number;
  }): { directory: SpaceDirectorySnapshot; keys: SpaceKeys } {
    if (this.directories.has(input.spaceId)) {
      throw new NomadCryptoError('conflict', 'Space already exists');
    }
    const keys = SpaceKeys.create(input.spaceId);
    const dataKey = keys.getDataKey();
    const createdAt = input.now ?? Date.now();
    const bindings: SpaceDeviceBinding[] = (input.ownerDevices ?? []).map((device) => ({
      userId: input.ownerUserId,
      deviceId: device.deviceId,
      devicePublicKey: bytesToB64Url(device.x25519PublicKey),
      sealedDataKey: sealDataKeyForDevice(dataKey, device.x25519PublicKey),
    }));
    const directory: SpaceDirectorySnapshot = {
      v: 1,
      spaceId: input.spaceId,
      spaceType: input.spaceType ?? 'personal',
      nameEnvelope: sealText(input.name, dataKey, nameContext(input.spaceId)),
      wrappedCollections: { ...keys.serialize().wrappedCollections },
      members: [{ userId: input.ownerUserId, role: 'owner', addedAt: createdAt }],
      deviceBindings: bindings,
      keyVersion: 1,
      createdAt,
    };
    this.directories.set(input.spaceId, directory);
    return { directory, keys };
  }

  get(spaceId: string): SpaceDirectorySnapshot | undefined {
    return this.directories.get(spaceId);
  }

  require(spaceId: string): SpaceDirectorySnapshot {
    const directory = this.directories.get(spaceId);
    if (!directory) throw new NomadCryptoError('not_found', 'Space not found');
    return directory;
  }

  /**
   * Spaces visible to a user: their own personal spaces and every shared space
   * they are a member of. Private spaces of other members never appear.
   */
  listVisibleSpaces(userId: string): SpaceDirectorySnapshot[] {
    const visible: SpaceDirectorySnapshot[] = [];
    for (const directory of this.directories.values()) {
      if (directory.spaceType === 'personal') {
        if (directory.members.length === 1 && directory.members[0]!.userId === userId) {
          visible.push(directory);
        }
        continue;
      }
      if (directory.members.some((m) => m.userId === userId)) {
        visible.push(directory);
      }
    }
    return visible;
  }

  /** Add a member (owner only) and seal the space data key for their devices. */
  addMember(
    spaceId: string,
    actor: Actor,
    member: { userId: string; role: SpaceRole; devices: readonly MemberDeviceInput[]; now?: number },
    unlocked: UnlockedDataKey,
  ): SpaceDirectorySnapshot {
    const directory = this.require(spaceId);
    requireRole(directory, actor, 'owner');
    if (unlocked.keyVersion !== directory.keyVersion) {
      throw new NomadCryptoError('conflict', 'Unlocked data key is stale; reload the space');
    }
    if (directory.members.some((m) => m.userId === member.userId)) {
      throw new NomadCryptoError('conflict', 'User is already a member of this space');
    }
    const bindings = member.devices.map((device) => ({
      userId: member.userId,
      deviceId: device.deviceId,
      devicePublicKey: bytesToB64Url(device.x25519PublicKey),
      sealedDataKey: sealDataKeyForDevice(unlocked.dataKey, device.x25519PublicKey),
    }));
    const updated: SpaceDirectorySnapshot = {
      ...directory,
      members: [
        ...directory.members,
        { userId: member.userId, role: member.role, addedAt: member.now ?? Date.now() },
      ],
      deviceBindings: [...directory.deviceBindings, ...bindings],
    };
    this.directories.set(spaceId, updated);
    return updated;
  }

  /**
   * Remove a member (owner only) and rotate the space data key: every
   * remaining device is re-sealed under a fresh key. New data is unreadable to
   * the removed member; data they already saw cannot be taken back (design 15.1).
   * Returns the old raw key so the caller can zero it.
   */
  removeMember(
    spaceId: string,
    actor: Actor,
    removedUserId: string,
    unlocked: UnlockedDataKey,
  ): { directory: SpaceDirectorySnapshot; rotatedKeys: SpaceKeys; oldDataKey: Uint8Array } {
    const directory = this.require(spaceId);
    requireRole(directory, actor, 'owner');
    if (unlocked.keyVersion !== directory.keyVersion) {
      throw new NomadCryptoError('conflict', 'Unlocked data key is stale; reload the space');
    }
    const membership = directory.members.find((m) => m.userId === removedUserId);
    if (!membership) throw new NomadCryptoError('not_found', 'User is not a member of this space');
    const remainingMembers = directory.members.filter((m) => m.userId !== removedUserId);
    if (membership.role === 'owner' && !remainingMembers.some((m) => m.role === 'owner')) {
      throw new NomadCryptoError('conflict', 'Cannot remove the last owner; promote another member first');
    }
    const oldDataKey = unlocked.dataKey;
    const rotatedKeys = SpaceKeys.fromSerialized(
      {
        v: 1,
        spaceId,
        keyVersion: directory.keyVersion,
        wrappedCollections: { ...directory.wrappedCollections },
        wrappedDocuments: {},
      },
      oldDataKey,
    );
    // Rotate data key and every collection key: a removed member who cached
    // old wrapped keys cannot read anything written after the removal.
    rotatedKeys.rotateAll();
    const newDataKey = rotatedKeys.getDataKey();
    const remainingBindings = directory.deviceBindings
      .filter((b) => b.userId !== removedUserId)
      .map((b) => ({
        userId: b.userId,
        deviceId: b.deviceId,
        devicePublicKey: b.devicePublicKey,
        sealedDataKey: sealDataKeyForDevice(newDataKey, bytesFromB64Url(b.devicePublicKey)),
      }));
    const updated: SpaceDirectorySnapshot = {
      ...directory,
      wrappedCollections: { ...rotatedKeys.serialize().wrappedCollections },
      members: remainingMembers,
      deviceBindings: remainingBindings,
      keyVersion: directory.keyVersion + 1,
    };
    this.directories.set(spaceId, updated);
    return { directory: updated, rotatedKeys, oldDataKey };
  }

  setRole(spaceId: string, actor: Actor, targetUserId: string, role: SpaceRole): SpaceDirectorySnapshot {
    const directory = this.require(spaceId);
    requireRole(directory, actor, 'owner');
    if (!directory.members.some((m) => m.userId === targetUserId)) {
      throw new NomadCryptoError('not_found', 'User is not a member of this space');
    }
    const members = directory.members.map((m) => (m.userId === targetUserId ? { ...m, role } : m));
    if (role !== 'owner' && !members.some((m) => m.role === 'owner')) {
      throw new NomadCryptoError('conflict', 'Cannot demote the last owner');
    }
    const updated: SpaceDirectorySnapshot = { ...directory, members };
    this.directories.set(spaceId, updated);
    return updated;
  }

  /** Pair a device for a member; the member themself or an owner may do this. */
  addDevice(
    spaceId: string,
    actor: Actor,
    target: { userId: string; device: MemberDeviceInput },
    unlocked: UnlockedDataKey,
  ): SpaceDirectorySnapshot {
    const directory = this.require(spaceId);
    const membership = directory.members.find((m) => m.userId === target.userId);
    if (!membership) throw new NomadCryptoError('not_found', 'User is not a member of this space');
    const actorRole = roleOf(directory, actor.userId);
    const isSelf = actor.userId === target.userId;
    if (!isSelf && !canManage(actorRole)) {
      throw new NomadCryptoError('forbidden', 'Only the member or an owner may add a device');
    }
    if (unlocked.keyVersion !== directory.keyVersion) {
      throw new NomadCryptoError('conflict', 'Unlocked data key is stale; reload the space');
    }
    if (directory.deviceBindings.some((b) => b.deviceId === target.device.deviceId)) {
      throw new NomadCryptoError('conflict', 'Device is already paired with this space');
    }
    const binding: SpaceDeviceBinding = {
      userId: target.userId,
      deviceId: target.device.deviceId,
      devicePublicKey: bytesToB64Url(target.device.x25519PublicKey),
      sealedDataKey: sealDataKeyForDevice(unlocked.dataKey, target.device.x25519PublicKey),
    };
    const updated: SpaceDirectorySnapshot = {
      ...directory,
      deviceBindings: [...directory.deviceBindings, binding],
    };
    this.directories.set(spaceId, updated);
    return updated;
  }

  /** Revoke a device: its sealed data key copy is removed. */
  revokeDevice(spaceId: string, actor: Actor, deviceId: string): SpaceDirectorySnapshot {
    const directory = this.require(spaceId);
    const binding = directory.deviceBindings.find((b) => b.deviceId === deviceId);
    if (!binding) throw new NomadCryptoError('not_found', 'Device is not paired with this space');
    const actorRole = roleOf(directory, actor.userId);
    const isSelf = actor.userId === binding.userId;
    if (!isSelf && !canManage(actorRole)) {
      throw new NomadCryptoError('forbidden', 'Only the device owner or an owner may revoke a device');
    }
    const updated: SpaceDirectorySnapshot = {
      ...directory,
      deviceBindings: directory.deviceBindings.filter((b) => b.deviceId !== deviceId),
    };
    this.directories.set(spaceId, updated);
    return updated;
  }

  /**
   * Unwrap the space data key for a device. The device must have a sealed copy
   * and prove possession of its X25519 private key. Membership is checked.
   */
  unlockSpaceDataKey(
    spaceId: string,
    who: { userId: string; deviceId: string; deviceKeys: { x25519: { publicKey: Uint8Array; privateKey: Uint8Array } } },
  ): UnlockedDataKey {
    const directory = this.require(spaceId);
    if (!directory.members.some((m) => m.userId === who.userId)) {
      throw new NomadCryptoError('forbidden', 'Not a member of this space');
    }
    const binding = directory.deviceBindings.find(
      (b) => b.deviceId === who.deviceId && b.userId === who.userId,
    );
    if (!binding) throw new NomadCryptoError('not_found', 'Device is not paired with this space');
    const dataKey = openSealedDataKey(binding.sealedDataKey, who.deviceKeys.x25519);
    // Verify against the stored collection wraps: proves this is the current key.
    const probe = directory.wrappedCollections[COLLECTION_IDS[0]!];
    if (!probe) throw new NomadCryptoError('invalid_envelope', 'Space has no collection keys');
    try {
      open(probe, dataKey, contextBytes(collectionWrapContext(spaceId)));
    } catch {
      throw new NomadCryptoError('conflict', 'Paired data key is out of date; reload the space');
    }
    return { dataKey, keyVersion: directory.keyVersion };
  }

  /** Rename a space (member or owner; the name is stored encrypted). */
  renameSpace(
    spaceId: string,
    actor: Actor,
    name: string,
    unlocked: UnlockedDataKey,
  ): SpaceDirectorySnapshot {
    const directory = this.require(spaceId);
    requireRole(directory, actor, 'member');
    if (unlocked.keyVersion !== directory.keyVersion) {
      throw new NomadCryptoError('conflict', 'Unlocked data key is stale; reload the space');
    }
    const updated: SpaceDirectorySnapshot = {
      ...directory,
      nameEnvelope: sealText(name, unlocked.dataKey, nameContext(spaceId)),
    };
    this.directories.set(spaceId, updated);
    return updated;
  }

  spaceName(spaceId: string, unlocked: UnlockedDataKey): string {
    const directory = this.require(spaceId);
    return openText(directory.nameEnvelope, unlocked.dataKey, nameContext(spaceId));
  }

  /** Full serializable keys for a space, given an unlocked data key. */
  spaceKeysFrom(spaceId: string, unlocked: UnlockedDataKey): SpaceKeys {
    const directory = this.require(spaceId);
    if (unlocked.keyVersion !== directory.keyVersion) {
      throw new NomadCryptoError('conflict', 'Unlocked data key is stale; reload the space');
    }
    const serialized: SerializedSpaceKeys = {
      v: 1,
      spaceId,
      keyVersion: directory.keyVersion,
      wrappedCollections: { ...directory.wrappedCollections },
      wrappedDocuments: {},
    };
    return SpaceKeys.fromSerialized(serialized, unlocked.dataKey);
  }

  serialize(): SpaceDirectorySnapshot[] {
    return [...this.directories.values()];
  }
}

function roleOf(directory: SpaceDirectorySnapshot, userId: string): SpaceRole {
  const membership = directory.members.find((m) => m.userId === userId);
  if (!membership) throw new NomadCryptoError('forbidden', 'Not a member of this space');
  return membership.role;
}

function requireRole(directory: SpaceDirectorySnapshot, actor: Actor, minimum: SpaceRole): void {
  // Roles always come from the membership list; a caller-supplied role is
  // never trusted (red-team rule: forged claims must not grant rights).
  const role = roleOf(directory, actor.userId);
  if (!roleAtLeast(role, minimum)) {
    throw new NomadCryptoError('forbidden', `Requires ${minimum} role`);
  }
}
