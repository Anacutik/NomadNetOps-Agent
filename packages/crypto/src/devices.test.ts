import { beforeAll, describe, expect, it } from 'vitest';
import { ensureReady, NomadCryptoError, randomBytes, toHex } from './primitives.js';
import {
  TrustedDeviceRegistry,
  acceptPairing,
  completePairing,
  createDeviceKeys,
  createPairingInvite,
  parsePairingQr,
  sealDataKeyForDevice,
  openSealedDataKey,
} from './devices.js';

describe('trusted devices and pairing', () => {
  beforeAll(async () => {
    await ensureReady();
  });

  it('creates X25519 and Ed25519 keypairs', () => {
    const device = createDeviceKeys('dev-1');
    expect(device.x25519.publicKey).toHaveLength(32);
    expect(device.x25519.privateKey).toHaveLength(32);
    expect(device.ed25519.publicKey).toHaveLength(32);
    expect(device.ed25519.privateKey).toHaveLength(64);
    expect(device.deviceId).toBe('dev-1');
  });

  it('runs the full pairing flow: invite, QR, accept, complete', () => {
    const inviter = createDeviceKeys('dev-phone');
    const responder = createDeviceKeys('dev-laptop');
    const registry = new TrustedDeviceRegistry();
    const { invite, qr } = createPairingInvite({
      inviterDeviceId: 'dev-phone',
      inviterKeys: inviter,
      spaces: ['space-1'],
      now: 1000,
      ttlMs: 60_000,
    });
    expect(qr.startsWith('nomad://pair/')).toBe(true);

    const { response } = acceptPairing(qr, {
      deviceId: 'dev-laptop',
      name: 'Laptop',
      keys: responder,
    });
    const record = completePairing(invite, response, registry, { userId: 'alice', now: 2000 });
    expect(record.deviceId).toBe('dev-laptop');
    expect(registry.isTrusted('dev-laptop')).toBe(true);
    expect(registry.list('alice')).toHaveLength(1);
  });

  it('parses a QR code back to the invite payload', () => {
    const inviter = createDeviceKeys('dev-phone');
    const { qr } = createPairingInvite({
      inviterDeviceId: 'dev-phone',
      inviterKeys: inviter,
      spaces: ['space-1'],
    });
    const parsed = parsePairingQr(qr);
    expect(parsed.payload.kind).toBe('nomad-pairing-invite');
    expect(parsed.payload.spaces).toEqual(['space-1']);
  });

  it('rejects a tampered invite signature', () => {
    const inviter = createDeviceKeys('dev-phone');
    const { invite } = createPairingInvite({
      inviterDeviceId: 'dev-phone',
      inviterKeys: inviter,
      spaces: ['space-1'],
    });
    const tampered = {
      ...invite,
      payload: { ...invite.payload, spaces: ['evil-space'] },
    };
    const tamperedQr = `nomad://pair/${Buffer.from(JSON.stringify(tampered)).toString('base64url')}`;
    const responder = createDeviceKeys('dev-laptop');
    expect(() =>
      acceptPairing(tamperedQr, { deviceId: 'dev-laptop', name: 'Laptop', keys: responder }),
    ).toThrowError();
  });

  it('rejects a response that answers a different invite', () => {
    const inviter = createDeviceKeys('dev-phone');
    const responder = createDeviceKeys('dev-laptop');
    const first = createPairingInvite({
      inviterDeviceId: 'dev-phone',
      inviterKeys: inviter,
      spaces: ['space-1'],
    });
    const second = createPairingInvite({
      inviterDeviceId: 'dev-phone',
      inviterKeys: inviter,
      spaces: ['space-2'],
    });
    const { response } = acceptPairing(first.qr, {
      deviceId: 'dev-laptop',
      name: 'Laptop',
      keys: responder,
    });
    const registry = new TrustedDeviceRegistry();
    expect(() =>
      completePairing(second.invite, response, registry, { userId: 'alice' }),
    ).toThrowError(/different invite/);
  });

  it('rejects an expired invite', () => {
    const inviter = createDeviceKeys('dev-phone');
    const responder = createDeviceKeys('dev-laptop');
    const { invite, qr } = createPairingInvite({
      inviterDeviceId: 'dev-phone',
      inviterKeys: inviter,
      spaces: ['space-1'],
      now: 1000,
      ttlMs: 1000,
    });
    const { response } = acceptPairing(qr, {
      deviceId: 'dev-laptop',
      name: 'Laptop',
      keys: responder,
    });
    const registry = new TrustedDeviceRegistry();
    expect(() =>
      completePairing(invite, response, registry, { userId: 'alice', now: 5000 }),
    ).toThrowError(NomadCryptoError);
    try {
      completePairing(invite, response, registry, { userId: 'alice', now: 5000 });
    } catch (error) {
      expect((error as NomadCryptoError).code).toBe('expired');
    }
  });

  it('seals the data key for a device and only that device can open it', () => {
    const device = createDeviceKeys('dev-1');
    const other = createDeviceKeys('dev-2');
    const dataKey = randomBytes(32);
    const sealed = sealDataKeyForDevice(dataKey, device.x25519.publicKey);
    expect(toHex(openSealedDataKey(sealed, device.x25519))).toBe(toHex(dataKey));
    expect(() => openSealedDataKey(sealed, other.x25519)).toThrowError(NomadCryptoError);
  });

  it('revokes devices and refuses revoked ones', () => {
    const registry = new TrustedDeviceRegistry();
    registry.trust({
      deviceId: 'dev-1',
      name: 'Phone',
      userId: 'alice',
      x25519PublicKey: 'a',
      ed25519PublicKey: 'b',
      addedAt: 1,
    });
    expect(registry.isTrusted('dev-1')).toBe(true);
    registry.revoke('dev-1', 10);
    expect(registry.isTrusted('dev-1')).toBe(false);
    expect(registry.list('alice')).toHaveLength(0);
    expect(registry.get('dev-1')?.revokedAt).toBe(10);
  });

  it('reuses the sealed-data-key seam across devices without leaking into errors', () => {
    const device = createDeviceKeys('dev-1');
    const sealed = sealDataKeyForDevice(randomBytes(32), device.x25519.publicKey);
    try {
      openSealedDataKey(sealed, createDeviceKeys('dev-other').x25519);
    } catch (error) {
      expect((error as Error).message).not.toMatch(/[A-Za-z0-9_-]{40,}/);
    }
  });
});
