// Secure data handling: key hierarchy, encryption, spaces, devices, 2FA,
// recovery and vault (libsodium only, per technical design section 6).
export { CRYPTO_VERSION } from './version.js';

export { ensureReady, isReady, randomBytes, b64urlEncode, b64urlDecode, toHex, fromHex, copyBytes, wipeBytes, constantTimeEqual, concatBytes, canonicalJson, normalizeText, NomadCryptoError } from './primitives.js';
export type { NomadCryptoErrorCode } from './primitives.js';
export { keyBytes, nonceBytes, saltBytes } from './primitives.js';

export { ENVELOPE_VERSION, seal, open, sealText, openText, sealJson, openJson, reencrypt } from './envelope.js';
export type { EncryptedEnvelope } from './envelope.js';

export {
  COLLECTION_IDS,
  SpaceKeys,
  wrapDataKey,
  unwrapDataKey,
  DATA_KEY_CONTEXT,
  collectionWrapContext,
  documentWrapContext,
} from './keys.js';
export type { CollectionId, SerializedSpaceKeys, WrappedDocumentKey } from './keys.js';

export {
  passwordParamsFor,
  DEFAULT_PASSWORD_STRENGTH,
  createPasswordRecord,
  derivePasswordKey,
  wrapDataKeyWithPassword,
  unwrapDataKeyWithPassword,
  changePasswordWrap,
} from './password.js';
export type { PasswordStrength, PasswordRecord, PasswordWrap } from './password.js';

export {
  SpaceStore,
  roleAtLeast,
  canWrite,
  canManage,
} from './spaces.js';
export type {
  Actor,
  MemberDeviceInput,
  SpaceDeviceBinding,
  SpaceDirectorySnapshot,
  SpaceMemberRecord,
  SpaceRole,
  SpaceType,
  UnlockedDataKey,
} from './spaces.js';

export {
  createDeviceKeys,
  TrustedDeviceRegistry,
  createPairingInvite,
  parsePairingQr,
  acceptPairing,
  completePairing,
  sealDataKeyForDevice,
  openSealedDataKey,
  digestOf,
  signPayload,
  verifySignedPayload,
} from './devices.js';
export type {
  DeviceKeyPair,
  TrustedDeviceRecord,
  PairingInvite,
  PairingInvitePayload,
  PairingResponsePayload,
  SignedPayload,
  SealedForDevice,
} from './devices.js';

export {
  generateRecoveryPhrase,
  normalizePhrase,
  isValidPhrase,
  phraseToKey,
  wrapDataKeyWithPhrase,
  verifyPhraseAgainstWrap,
  unwrapDataKeyWithPhrase,
  verifyTranscription,
  phraseFromEntropy,
  PHRASE_CONTEXT,
} from './phrase.js';
export type { PhraseStrength, PhraseWrap } from './phrase.js';

export {
  generateTotpEnrollment,
  totpUri,
  hotp,
  totpAt,
  verifyTotp,
  encodeBase32,
  decodeBase32,
  TOTP_PERIOD_SECONDS,
  TOTP_DIGITS,
  TOTP_DEFAULT_WINDOW,
} from './totp.js';
export type { TotpEnrollment, TotpVerificationResult } from './totp.js';

export {
  SecondFactorService,
  InMemoryPasskeyAdapter,
  generateBackupCodes,
  STEP_UP_WINDOW_MS,
  STEP_UP_ACTIONS,
  BACKUP_CODE_COUNT,
} from './auth.js';
export type {
  FactorMethod,
  PasskeyAdapter,
  PasskeyCredential,
  SecondFactorState,
  StepUpAction,
} from './auth.js';

export { InMemoryVault, EncryptedVault, VAULT_CONTEXT } from './vault.js';
export type { SecretVault, PlatformKeychainAdapter } from './vault.js';

export {
  RecoveryService,
  SystemClock,
  DEFAULT_WAITING_PERIOD_HOURS,
} from './recovery.js';
export type {
  RecoveryRequest,
  RecoveryStatus,
  RecoveryClock,
  RecoveryNotification,
  RecoveryNotificationType,
  RecoveryNotifier,
  RecoveryOptions,
} from './recovery.js';

export {
  destroyKeyBytes,
  destroySpaceKeys,
  assertUnwrapFails,
} from './deletion.js';
export type { DestructionRecord } from './deletion.js';

export {
  fieldAad,
  encryptField,
  decryptField,
  deriveSqlCipherKey,
} from './fields.js';
export type {
  FieldContext,
  EncryptedDatabaseAdapter,
  EncryptedDatabaseHandle,
} from './fields.js';

export { SECURITY_EVENT_TYPES, securityEvent } from './events.js';
export type { SecurityEventType, SecurityEvent } from './events.js';
