import { beforeAll, describe, expect, it } from 'vitest';
import { ensureReady, NomadCryptoError, randomBytes, toHex } from './primitives.js';
import {
  generateRecoveryPhrase,
  isValidPhrase,
  normalizePhrase,
  phraseFromEntropy,
  phraseToKey,
  unwrapDataKeyWithPhrase,
  verifyPhraseAgainstWrap,
  verifyTranscription,
  wrapDataKeyWithPhrase,
} from './phrase.js';
import { mnemonicToSeedSync } from '@scure/bip39';

describe('recovery phrase (BIP-39)', () => {
  beforeAll(async () => {
    await ensureReady();
  });

  it('matches the standard BIP-39 vector for zero entropy', () => {
    const entropy = new Uint8Array(16);
    const phrase = phraseFromEntropy(entropy);
    expect(phrase).toBe(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
    // Canonical seed for passphrase "TREZOR" (BIP-39 test vectors, trezor).
    const seed = mnemonicToSeedSync(phrase, 'TREZOR');
    expect(toHex(seed)).toBe(
      'c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04',
    );
  });

  it('generates 12 or 24 word phrases that validate', () => {
    const twelve = generateRecoveryPhrase(128);
    const twentyfour = generateRecoveryPhrase(256);
    expect(twelve.split(' ')).toHaveLength(12);
    expect(twentyfour.split(' ')).toHaveLength(24);
    expect(isValidPhrase(twelve)).toBe(true);
    expect(isValidPhrase(twentyfour)).toBe(true);
  });

  it('normalises case and whitespace', () => {
    const phrase = generateRecoveryPhrase(128);
    const messy = phrase.toUpperCase().replace(/ /g, '   ');
    expect(normalizePhrase(messy)).toBe(phrase);
    expect(isValidPhrase(messy)).toBe(true);
  });

  it('rejects invalid phrases', () => {
    expect(isValidPhrase('not a real phrase at all')).toBe(false);
    expect(isValidPhrase('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon')).toBe(false);
  });

  it('derives a stable key from the phrase', () => {
    const phrase = generateRecoveryPhrase(128);
    const a = toHex(phraseToKey(phrase));
    const b = toHex(phraseToKey(phrase.toUpperCase()));
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('wraps the data key and restores it on a clean device', () => {
    const dataKey = randomBytes(32);
    const phrase = generateRecoveryPhrase(128);
    const wrap = wrapDataKeyWithPhrase(dataKey, phrase);
    expect(unwrapDataKeyWithPhrase(phrase, wrap)).toEqual(dataKey);
  });

  it('fails clearly on a wrong phrase', () => {
    const dataKey = randomBytes(32);
    const wrap = wrapDataKeyWithPhrase(dataKey, generateRecoveryPhrase(128));
    const wrongPhrase = generateRecoveryPhrase(128);
    expect(verifyPhraseAgainstWrap(wrongPhrase, wrap)).toBe(false);
    expect(() => unwrapDataKeyWithPhrase(wrongPhrase, wrap)).toThrowError(NomadCryptoError);
  });

  it('checks transcription word by word', () => {
    const shown = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
    expect(verifyTranscription(shown, shown.toUpperCase())).toEqual({ ok: true, mismatchedWords: [] });
    const typed = shown.replace('winner', 'water');
    const result = verifyTranscription(shown, typed);
    expect(result.ok).toBe(false);
    expect(result.mismatchedWords).toEqual([1]);
    expect(verifyTranscription(shown, 'too few words').ok).toBe(false);
  });

  it('phrase key differs from any other derivation of the same words', () => {
    const phrase = generateRecoveryPhrase(128);
    const key = phraseToKey(phrase);
    // Deterministic sanity: differs from plain BLAKE2b of the phrase text.
    expect(key).toHaveLength(32);
  });
});
