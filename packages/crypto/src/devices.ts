// Trusted devices: X25519 + Ed25519 keypairs, QR pairing with signed payloads,
// sealing the space data key for a device, and a trusted-device registry.
import {
  sodiumReadyRef,
  canonicalJson,
  copyBytes,
  NomadCryptoError,
  randomBytes,
} from './primitives.js';
import { bytesFromB64Url, bytesToB64Url } from './encoding.js';

export interface DeviceKeyPair {
  readonly deviceId: string | undefined;
  /** X25519 keypair used for sealing the data key to this device. */
  readonly x25519: { readonly publicKey: Uint8Array; readonly privateKey: Uint8Array };
  /** Ed25519 keypair used for signing pairing payloads and logs. */
  readonly ed25519: { readonly publicKey: Uint8Array; readonly privateKey: Uint8Array };
}

export function createDeviceKeys(deviceId?: string): DeviceKeyPair {
  const sodium = sodiumReadyRef();
  const boxPair = sodium.crypto_box_keypair();
  const signPair = sodium.crypto_sign_keypair();
  return {
    deviceId,
    x25519: { publicKey: boxPair.publicKey, privateKey: boxPair.privateKey },
    ed25519: { publicKey: signPair.publicKey, privateKey: signPair.privateKey },
  };
}

export interface TrustedDeviceRecord {
  readonly deviceId: string;
  readonly name: string;
  readonly userId: string;
  /** Base64url X25519 public key. */
  readonly x25519PublicKey: string;
  /** Base64url Ed25519 public key. */
  readonly ed25519PublicKey: string;
  readonly addedAt: number;
  readonly revokedAt?: number | undefined;
}

export class TrustedDeviceRegistry {
  private readonly devices = new Map<string, TrustedDeviceRecord>();

  trust(record: TrustedDeviceRecord): TrustedDeviceRecord {
    this.devices.set(record.deviceId, record);
    return record;
  }

  get(deviceId: string): TrustedDeviceRecord | undefined {
    return this.devices.get(deviceId);
  }

  require(deviceId: string): TrustedDeviceRecord {
    const record = this.devices.get(deviceId);
    if (!record) throw new NomadCryptoError('not_found', 'Device is not registered');
    return record;
  }

  revoke(deviceId: string, now = Date.now()): TrustedDeviceRecord {
    const record = this.require(deviceId);
    const updated: TrustedDeviceRecord = { ...record, revokedAt: now };
    this.devices.set(deviceId, updated);
    return updated;
  }

  /** Active (non-revoked) devices, newest first. */
  list(userId?: string): TrustedDeviceRecord[] {
    return [...this.devices.values()]
      .filter((d) => d.revokedAt === undefined && (userId === undefined || d.userId === userId))
      .sort((a, b) => b.addedAt - a.addedAt);
  }

  isTrusted(deviceId: string): boolean {
    const record = this.devices.get(deviceId);
    return record !== undefined && record.revokedAt === undefined;
  }
}

// --- Pairing (design section 7: scan a QR code on a trusted device) ---

export interface PairingInvitePayload {
  readonly v: 1;
  readonly kind: 'nomad-pairing-invite';
  readonly inviterDeviceId: string;
  /** Base64url Ed25519 public key of the inviting device. */
  readonly inviterEd25519PublicKey: string;
  readonly spaces: readonly string[];
  readonly nonce: string;
  readonly createdAt: number;
  readonly expiresAt: number;
}

export interface SignedPayload<T> {
  readonly payload: T;
  /** Base64url Ed25519 signature over the canonical JSON of the payload. */
  readonly signature: string;
}

export interface PairingResponsePayload {
  readonly v: 1;
  readonly kind: 'nomad-pairing-response';
  /** Digest of the invite this response answers (binds response to invite). */
  readonly inviteDigest: string;
  readonly responderDeviceId: string;
  readonly responderName: string;
  /** Base64url X25519 public key to seal the data key for. */
  readonly responderX25519PublicKey: string;
  /** Base64url Ed25519 public key for future verification. */
  readonly responderEd25519PublicKey: string;
  readonly nonce: string;
}

export function digestOf(value: unknown): string {
  const sodium = sodiumReadyRef();
  const bytes = new TextEncoder().encode(canonicalJson(value));
  return bytesToB64Url(sodium.crypto_generichash(32, bytes, null));
}

export function signPayload<T>(payload: T, ed25519PrivateKey: Uint8Array): SignedPayload<T> {
  const sodium = sodiumReadyRef();
  const message = new TextEncoder().encode(canonicalJson(payload));
  const signature = sodium.crypto_sign_detached(message, ed25519PrivateKey);
  return { payload, signature: bytesToB64Url(signature) };
}

export function verifySignedPayload<T>(
  signed: SignedPayload<T>,
  ed25519PublicKey: Uint8Array,
): T {
  const sodium = sodiumReadyRef();
  const message = new TextEncoder().encode(canonicalJson(signed.payload));
  const ok = sodium.crypto_sign_verify_detached(
    bytesFromB64Url(signed.signature),
    message,
    ed25519PublicKey,
  );
  if (!ok) {
    throw new NomadCryptoError('signature_invalid', 'Signature verification failed');
  }
  return signed.payload;
}

export interface PairingInvite {
  readonly invite: SignedPayload<PairingInvitePayload>;
  /** `nomad://pair/…` string, suitable for a QR code. */
  readonly qr: string;
}

export function createPairingInvite(input: {
  inviterDeviceId: string;
  inviterKeys: DeviceKeyPair;
  spaces: readonly string[];
  now?: number;
  ttlMs?: number;
}): PairingInvite {
  const now = input.now ?? Date.now();
  const payload: PairingInvitePayload = {
    v: 1,
    kind: 'nomad-pairing-invite',
    inviterDeviceId: input.inviterDeviceId,
    inviterEd25519PublicKey: bytesToB64Url(input.inviterKeys.ed25519.publicKey),
    spaces: [...input.spaces],
    nonce: bytesToB64Url(randomBytes(16)),
    createdAt: now,
    expiresAt: now + (input.ttlMs ?? 10 * 60 * 1000),
  };
  const invite = signPayload(payload, input.inviterKeys.ed25519.privateKey);
  return { invite, qr: `nomad://pair/${bytesToB64Url(new TextEncoder().encode(canonicalJson(invite)))}` };
}

export function parsePairingQr(qr: string): SignedPayload<PairingInvitePayload> {
  const prefix = 'nomad://pair/';
  if (!qr.startsWith(prefix)) {
    throw new NomadCryptoError('invalid_input', 'Not a Nomad pairing code');
  }
  try {
    const json = new TextDecoder().decode(bytesFromB64Url(qr.slice(prefix.length)));
    const parsed = JSON.parse(json) as SignedPayload<PairingInvitePayload>;
    if (parsed.payload.kind !== 'nomad-pairing-invite' || parsed.payload.v !== 1) {
      throw new NomadCryptoError('unsupported_version', 'Unknown pairing payload');
    }
    return parsed;
  } catch (cause) {
    if (cause instanceof NomadCryptoError) throw cause;
    throw new NomadCryptoError('invalid_input', 'Pairing code is malformed', { cause });
  }
}

export function acceptPairing(
  qr: string,
  responder: { deviceId: string; name: string; keys: DeviceKeyPair },
): { response: SignedPayload<PairingResponsePayload>; invite: SignedPayload<PairingInvitePayload> } {
  const invite = parsePairingQr(qr);
  const inviterPublicKey = bytesFromB64Url(invite.payload.inviterEd25519PublicKey);
  // Verify the invite came from the key it claims: prevents forged invites.
  verifySignedPayload(invite, inviterPublicKey);
  const responsePayload: PairingResponsePayload = {
    v: 1,
    kind: 'nomad-pairing-response',
    inviteDigest: digestOf(invite.payload),
    responderDeviceId: responder.deviceId,
    responderName: responder.name,
    responderX25519PublicKey: bytesToB64Url(responder.keys.x25519.publicKey),
    responderEd25519PublicKey: bytesToB64Url(responder.keys.ed25519.publicKey),
    nonce: bytesToB64Url(randomBytes(16)),
  };
  return { response: signPayload(responsePayload, responder.keys.ed25519.privateKey), invite };
}

/** Verify the response and register the new device as trusted (not yet holding keys). */
export function completePairing(
  invite: SignedPayload<PairingInvitePayload>,
  response: SignedPayload<PairingResponsePayload>,
  registry: TrustedDeviceRegistry,
  input: { userId: string; now?: number },
): TrustedDeviceRecord {
  if (digestOf(invite.payload) !== response.payload.inviteDigest) {
    throw new NomadCryptoError('invalid_input', 'Pairing response answers a different invite');
  }
  const responderEd25519 = bytesFromB64Url(response.payload.responderEd25519PublicKey);
  verifySignedPayload(response, responderEd25519);
  const now = input.now ?? Date.now();
  if (now >= invite.payload.expiresAt) {
    throw new NomadCryptoError('expired', 'Pairing invite has expired');
  }
  const record: TrustedDeviceRecord = {
    deviceId: response.payload.responderDeviceId,
    name: response.payload.responderName,
    userId: input.userId,
    x25519PublicKey: response.payload.responderX25519PublicKey,
    ed25519PublicKey: response.payload.responderEd25519PublicKey,
    addedAt: now,
  };
  return registry.trust(record);
}

// --- Sealing the data key for a device (anonymous sealed box) ---

/** A sealed box for one public key. Carries its ephemeral key inside the ciphertext. */
export interface SealedForDevice {
  readonly v: 1;
  /** Base64url crypto_box_seal ciphertext. */
  readonly c: string;
}

export function sealDataKeyForDevice(dataKey: Uint8Array, x25519PublicKey: Uint8Array): SealedForDevice {
  const sodium = sodiumReadyRef();
  if (x25519PublicKey.length !== sodium.crypto_box_PUBLICKEYBYTES) {
    throw new NomadCryptoError('invalid_input', 'Device public key has the wrong length');
  }
  return { v: 1, c: bytesToB64Url(sodium.crypto_box_seal(dataKey, x25519PublicKey)) };
}

export function openSealedDataKey(
  sealed: SealedForDevice,
  x25519: { publicKey: Uint8Array; privateKey: Uint8Array },
): Uint8Array {
  const sodium = sodiumReadyRef();
  try {
    const opened = sodium.crypto_box_seal_open(
      bytesFromB64Url(sealed.c),
      x25519.publicKey,
      x25519.privateKey,
    );
    return copyBytes(opened);
  } catch {
    throw new NomadCryptoError('decrypt_failed', 'Sealed data key does not belong to this device');
  }
}
