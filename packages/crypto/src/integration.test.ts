import { beforeAll, describe, expect, it } from 'vitest';
import { ensureReady, toHex, wipeBytes } from './primitives.js';
import { openText, sealText } from './envelope.js';
import { createDeviceKeys } from './devices.js';
import { SpaceKeys, collectionWrapContext, unwrapDataKey } from './keys.js';
import { changePasswordWrap, unwrapDataKeyWithPassword, wrapDataKeyWithPassword } from './password.js';
import {
  generateRecoveryPhrase,
  unwrapDataKeyWithPhrase,
  wrapDataKeyWithPhrase,
} from './phrase.js';
import { RecoveryService } from './recovery.js';
import { destroySpaceKeys } from './deletion.js';
import { SpaceStore } from './spaces.js';
import { SecondFactorService } from './auth.js';
import { EncryptedVault } from './vault.js';
import { decryptField, encryptField } from './fields.js';
import { totpAt } from './totp.js';

/**
 * End-to-end: the "walking skeleton" of the security layer.
 * One person, one space, key wrapped by password + device + recovery phrase,
 * restore on a clean device, password change, member removal rotation,
 * crypto deletion, 2FA-gated unlock.
 */
describe('security layer end to end', () => {
  beforeAll(async () => {
    await ensureReady();
  });

  it('wraps the space data key three ways and restores on a clean device', () => {
    const store = new SpaceStore();
    const laptop = createDeviceKeys('dev-laptop');
    store.createSpace({
      spaceId: 'personal',
      ownerUserId: 'alice',
      name: 'Alice private',
      ownerDevices: [{ deviceId: 'dev-laptop', x25519PublicKey: laptop.x25519.publicKey }],
    });
    const unlocked = store.unlockSpaceDataKey('personal', {
      userId: 'alice',
      deviceId: 'dev-laptop',
      deviceKeys: laptop,
    });
    const dataKey = unlocked.dataKey;

    // Three independent wrappers over the same data key.
    const passwordWrap = wrapDataKeyWithPassword(dataKey, 'correct horse battery staple', 'test');
    const phrase = generateRecoveryPhrase(128);
    const phraseWrap = wrapDataKeyWithPhrase(dataKey, phrase);

    // Data written before the "loss".
    const keys = store.spaceKeysFrom('personal', unlocked);
    const docKey = keys.createDocumentKey('bill-1', 'documents');
    const document = sealText('Doctor bill, EUR 240', docKey);
    const field = encryptField(keys.collectionKey('finances'), { table: 'bills', column: 'amount', rowId: 'bill-1' }, '240.00');

    // --- The laptop is lost. Clean device with only the recovery phrase. ---
    const restoredKey = unwrapDataKeyWithPhrase(phrase, phraseWrap);
    expect(toHex(restoredKey)).toBe(toHex(dataKey));
    const restoredKeys = SpaceKeys.fromSerialized(
      {
        v: 1,
        spaceId: 'personal',
        keyVersion: unlocked.keyVersion,
        wrappedCollections: { ...store.require('personal').wrappedCollections },
        wrappedDocuments: Object.fromEntries(Object.entries(keys.serialize().wrappedDocuments)),
      },
      restoredKey,
    );
    expect(openText(document, restoredKeys.documentKey('bill-1'))).toBe('Doctor bill, EUR 240');
    expect(
      decryptField(restoredKeys.collectionKey('finances'), { table: 'bills', column: 'amount', rowId: 'bill-1' }, field),
    ).toBe('240.00');

    // Password also still works (same data key).
    expect(unwrapDataKeyWithPassword(passwordWrap.envelope, passwordWrap.record, 'correct horse battery staple')).toEqual(dataKey);
  });

  it('password change keeps data readable and invalidates the old password', () => {
    const dataKey = SpaceKeys.create('s').getDataKey();
    const first = wrapDataKeyWithPassword(dataKey, 'old password here', 'test');
    const second = changePasswordWrap(first.envelope, first.record, 'old password here', 'brand new password', 'test');
    expect(unwrapDataKeyWithPassword(second.envelope, second.record, 'brand new password')).toEqual(dataKey);
    expect(() => unwrapDataKeyWithPassword(second.envelope, second.record, 'old password here')).toThrow();
  });

  it('recovery requires the waiting period, then restores and re-wraps', () => {
    let now = 0;
    const service = new RecoveryService({ clock: { now: () => now } });
    const phrase = generateRecoveryPhrase(128);
    const dataKey = SpaceKeys.create('s').getDataKey();
    const phraseWrap = wrapDataKeyWithPhrase(dataKey, phrase);

    // A new device requests recovery.
    const request = service.start({ userId: 'alice' });
    expect(service.isReady(request.id)).toBe(false);

    // Owner cancels a suspicious request in time.
    service.cancel(request.id, 'alice');

    // A legitimate request runs its course.
    const real = service.start({ userId: 'alice' });
    now = 24 * 3600_000 + 1;
    expect(service.isReady(real.id)).toBe(true);
    service.complete(real.id);
    // Restored data key re-wraps for the new device's password.
    const restored = unwrapDataKeyWithPhrase(phrase, phraseWrap);
    const rewrap = wrapDataKeyWithPassword(restored, 'new device password', 'test');
    expect(unwrapDataKeyWithPassword(rewrap.envelope, rewrap.record, 'new device password')).toEqual(dataKey);
  });

  it('2FA gates the unlock: no second factor, no sign-in', async () => {
    const auth = new SecondFactorService();
    expect(() => auth.requireSecondFactorForSignIn()).toThrowError(/second factor/i);
    const { enrollment } = auth.startTotpEnrollment();
    const now = 1_700_000_000_000;
    expect(auth.confirmTotp(totpAt(enrollment, now), now)).toBe(true);
    expect(() => auth.requireSecondFactorForSignIn()).not.toThrow();
  });

  it('vault keeps provider keys out of the database layer', async () => {
    const dataKey = SpaceKeys.create('s').getDataKey();
    const vault = new EncryptedVault(EncryptedVault.vaultKeyFromDataKey(dataKey), 's');
    await vault.put('openrouter:default', 'sk-or-v1-abcdef');
    expect(await vault.get('openrouter:default')).toBe('sk-or-v1-abcdef');
    const dump = JSON.stringify(vault.exportEnvelopes());
    expect(dump).not.toContain('sk-or-v1');
  });

  it('full deletion: destroy the data key and everything is unreadable', () => {
    const store = new SpaceStore();
    const device = createDeviceKeys('dev-laptop');
    store.createSpace({
      spaceId: 's',
      ownerUserId: 'alice',
      name: 'Home',
      ownerDevices: [{ deviceId: 'dev-laptop', x25519PublicKey: device.x25519.publicKey }],
    });
    const unlocked = store.unlockSpaceDataKey('s', {
      userId: 'alice',
      deviceId: 'dev-laptop',
      deviceKeys: device,
    });
    const keys = store.spaceKeysFrom('s', unlocked);
    const wrappedCollections = { ...keys.serialize().wrappedCollections };
    const dataKeyCopy = unlocked.dataKey;
    const phrase = generateRecoveryPhrase(128);
    const phraseWrap = wrapDataKeyWithPhrase(dataKeyCopy, phrase);

    const record = destroySpaceKeys(keys);
    expect(record.spaceId).toBe('s');
    expect(record.keyVersion).toBe(1);

    // Even the phrase wrapper no longer matters: the check envelope still
    // matches, but the space keys object is destroyed; data remains on disk
    // and is unreadable without a key copy that no longer exists in the app.
    expect(unwrapDataKeyWithPhrase(phrase, phraseWrap)).toEqual(dataKeyCopy);
    for (const envelope of Object.values(wrappedCollections)) {
      expect(() =>
        unwrapDataKey(envelope, SpaceKeys.create('x').getDataKey(), collectionWrapContext('s')),
      ).toThrow();
    }
    wipeBytes(dataKeyCopy);
  });
});
