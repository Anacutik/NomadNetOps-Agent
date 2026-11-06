// Second-factor service: TOTP, single-use backup codes, passkey (WebAuthn)
// interface. Every sign-in needs a second factor; sensitive actions need a
// fresh step-up verification (design section 6).
import {
  constantTimeEqual,
  NomadCryptoError,
  randomBytes,
  sodiumReadyRef,
} from './primitives.js';
import {
  type TotpEnrollment,
  generateTotpEnrollment,
  totpUri,
  verifyTotp,
} from './totp.js';

export type FactorMethod = 'totp' | 'backup_code' | 'passkey';

export interface PasskeyCredential {
  readonly credentialId: string;
  /** Provider-specific public key material reference (set by the adapter). */
  readonly publicKeyRef: string;
  readonly label: string;
  readonly createdAt: number;
}

/**
 * WebAuthn runs in the browser/OS; the desktop app (step 07) wires a real
 * adapter. This interface is the seam the rest of the code depends on.
 */
export interface PasskeyAdapter {
  register(input: { userId: string; label: string; now?: number }): Promise<PasskeyCredential>;
  authenticate(input: { userId: string; credentialId: string; now?: number }): Promise<{ ok: boolean }>;
}

/** Deterministic in-memory adapter for tests and offline flows. */
export class InMemoryPasskeyAdapter implements PasskeyAdapter {
  private readonly credentials = new Map<string, PasskeyCredential>();

  async register(input: { userId: string; label: string; now?: number }): Promise<PasskeyCredential> {
    const credential: PasskeyCredential = {
      credentialId: `cred-${randomBytes(8).join('')}`,
      publicKeyRef: `sim://${input.userId}`,
      label: input.label,
      createdAt: input.now ?? Date.now(),
    };
    this.credentials.set(credential.credentialId, credential);
    return credential;
  }

  async authenticate(input: { userId: string; credentialId: string }): Promise<{ ok: boolean }> {
    const credential = this.credentials.get(input.credentialId);
    return { ok: credential !== undefined && credential.publicKeyRef === `sim://${input.userId}` };
  }
}

const BACKUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export const BACKUP_CODE_COUNT = 10;

export interface BackupCodeSet {
  /** Keyed BLAKE2b hashes, base64url. Plaintext codes are shown exactly once. */
  readonly hashes: readonly string[];
  /** The plaintext codes, shown once to the user right after generation. */
  readonly plaintextCodes: readonly string[];
}

function backupCodeKey(secret: Uint8Array): Uint8Array {
  return secret;
}

function hashBackupCode(code: string, secret: Uint8Array): string {
  const sodium = sodiumReadyRef();
  const normalized = code.replace(/-/g, '').toUpperCase();
  return sodium.to_base64(
    sodium.crypto_generichash(32, normalized, backupCodeKey(secret)),
    sodium.base64_variants.URLSAFE_NO_PADDING,
  );
}

export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): BackupCodeSet & { secret: Uint8Array } {
  const secret = randomBytes(32);
  const plaintextCodes: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(8);
    let code = '';
    for (const byte of bytes) {
      code += BACKUP_CODE_ALPHABET[byte % BACKUP_CODE_ALPHABET.length];
      if (code.length === 4) code += '-';
    }
    plaintextCodes.push(code);
    hashes.push(hashBackupCode(code, secret));
  }
  return { hashes, plaintextCodes, secret };
}

export interface SecondFactorState {
  totp?: (TotpEnrollment & { confirmed: boolean }) | undefined;
  backupCodes?: { hashes: readonly string[]; secret: Uint8Array } | undefined;
  passkeys: PasskeyCredential[];
}

export const STEP_UP_WINDOW_MS = 5 * 60 * 1000;

/** Actions that always need a fresh second factor (design section 6). */
export const STEP_UP_ACTIONS = [
  'recovery.change',
  'data.export',
  'data.delete_all',
  'device.add',
  'settings.security',
] as const;
export type StepUpAction = (typeof STEP_UP_ACTIONS)[number];

export class SecondFactorService {
  private state: SecondFactorState = { passkeys: [] };
  private lastVerifiedAt = 0;
  private usedTotpCounter = -1;

  constructor(private readonly adapter: PasskeyAdapter = new InMemoryPasskeyAdapter()) {}

  getSnapshot(): SecondFactorState {
    return {
      ...this.state,
      passkeys: [...this.state.passkeys],
    };
  }

  hasSecondFactor(): boolean {
    const s = this.state;
    return (
      (s.totp?.confirmed ?? false) || (s.backupCodes?.hashes.length ?? 0) > 0 || s.passkeys.length > 0
    );
  }

  // --- TOTP ---

  startTotpEnrollment(): { enrollment: TotpEnrollment; uri: string } {
    const enrollment = generateTotpEnrollment();
    this.state = { ...this.state, totp: { ...enrollment, confirmed: false } };
    return { enrollment, uri: totpUri(enrollment, 'user@nomad.local', 'NomadNetOps') };
  }

  confirmTotp(code: string, now: number): boolean {
    const totp = this.state.totp;
    if (!totp || totp.confirmed) return false;
    const result = verifyTotp(totp, code, { now });
    if (!result.ok || result.matchedCounter === undefined) return false;
    this.state = { ...this.state, totp: { ...totp, confirmed: true } };
    this.usedTotpCounter = result.matchedCounter;
    this.lastVerifiedAt = now;
    return true;
  }

  verifyTotpCode(code: string, now: number): boolean {
    const totp = this.state.totp;
    if (!totp?.confirmed) return false;
    const result = verifyTotp(totp, code, { now, minCounter: this.usedTotpCounter });
    if (!result.ok || result.matchedCounter === undefined) return false;
    this.usedTotpCounter = result.matchedCounter;
    this.lastVerifiedAt = now;
    return true;
  }

  // --- Backup codes ---

  rotateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
    const set = generateBackupCodes(count);
    this.state = { ...this.state, backupCodes: { hashes: set.hashes, secret: set.secret } };
    return [...set.plaintextCodes];
  }

  verifyBackupCode(code: string, now: number): boolean {
    const backup = this.state.backupCodes;
    if (!backup || backup.hashes.length === 0) return false;
    const hash = hashBackupCode(code, backup.secret);
    const index = backup.hashes.findIndex((h) => constantTimeEqual(new TextEncoder().encode(h), new TextEncoder().encode(hash)));
    if (index < 0) return false;
    // Single use: remove the matched hash.
    const remaining = backup.hashes.filter((_, i) => i !== index);
    this.state = { ...this.state, backupCodes: { hashes: remaining, secret: backup.secret } };
    this.lastVerifiedAt = now;
    return true;
  }

  remainingBackupCodes(): number {
    return this.state.backupCodes?.hashes.length ?? 0;
  }

  // --- Passkeys ---

  async registerPasskey(userId: string, label: string, now?: number): Promise<PasskeyCredential> {
    const credential = await this.adapter.register(
      now === undefined ? { userId, label } : { userId, label, now },
    );
    this.state = { ...this.state, passkeys: [...this.state.passkeys, credential] };
    return credential;
  }

  async verifyPasskey(userId: string, credentialId: string, now?: number): Promise<boolean> {
    const known = this.state.passkeys.some((p) => p.credentialId === credentialId);
    if (!known) return false;
    const result = await this.adapter.authenticate(
      now === undefined ? { userId, credentialId } : { userId, credentialId, now },
    );
    if (result.ok) this.lastVerifiedAt = now ?? Date.now();
    return result.ok;
  }

  // --- Verification and step-up ---

  verifySecondFactor(method: FactorMethod, value: string, now: number): boolean {
    switch (method) {
      case 'totp':
        return this.verifyTotpCode(value, now);
      case 'backup_code':
        return this.verifyBackupCode(value, now);
      case 'passkey':
        throw new NomadCryptoError('invalid_input', 'Use verifyPasskey for passkey checks');
      default: {
        const exhaustive: never = method;
        throw new NomadCryptoError('invalid_input', `Unknown factor method ${String(exhaustive)}`);
      }
    }
  }

  /** Sign-in rule: a second factor is always required (no opt-out, ADR 0001). */
  requireSecondFactorForSignIn(): void {
    if (!this.hasSecondFactor()) {
      throw new NomadCryptoError('forbidden', 'Enroll a second factor before signing in');
    }
  }

  /**
   * Step-up for sensitive actions: a verification must have happened within
   * STEP_UP_WINDOW_MS. Returns false when the user must re-verify.
   */
  stepUpOk(action: StepUpAction, now: number): { ok: boolean; reason?: string } {
    void action;
    if (!this.hasSecondFactor()) {
      return { ok: false, reason: 'No second factor enrolled' };
    }
    if (now - this.lastVerifiedAt > STEP_UP_WINDOW_MS) {
      return { ok: false, reason: 'Second factor verification is too old; re-verify' };
    }
    return { ok: true };
  }

  lastVerifiedTimestamp(): number {
    return this.lastVerifiedAt;
  }
}
