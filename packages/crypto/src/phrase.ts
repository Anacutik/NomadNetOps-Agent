// Opt-in recovery phrase (BIP-39, English wordlist). Shown once; Nomad never
// stores it. The phrase derives a wrapper key that can unwrap the data key.
import {
  entropyToMnemonic,
  generateMnemonic,
  mnemonicToSeedSync,
  validateMnemonic,
} from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { normalizeText, NomadCryptoError, sodiumReadyRef } from './primitives.js';
import { open, seal, type EncryptedEnvelope } from './envelope.js';
import { DATA_KEY_CONTEXT, contextBytes } from './keys.js';

export type PhraseStrength = 128 | 256;

/** Context for deriving the wrapper key from a BIP-39 seed. */
export const PHRASE_CONTEXT = 'nomad:wrap:dk:phrase:v1';
/** Constant plaintext used as a phrase-correctness check (envelope round trip). */
const PHRASE_CHECK_PLAINTEXT = 'nomad-recovery-phrase-check';

export function generateRecoveryPhrase(strength: PhraseStrength = 128): string {
  return generateMnemonic(wordlist, strength);
}

export function normalizePhrase(phrase: string): string {
  return normalizeText(phrase)
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .join(' ');
}

export function isValidPhrase(phrase: string): boolean {
  return validateMnemonic(normalizePhrase(phrase), wordlist);
}

/** Derive the 32-byte wrapper key from the phrase (BIP-39 seed, then BLAKE2b). */
export function phraseToKey(phrase: string): Uint8Array {
  if (!isValidPhrase(phrase)) {
    throw new NomadCryptoError('invalid_input', 'Recovery phrase is not a valid BIP-39 phrase');
  }
  const seed = mnemonicToSeedSync(normalizePhrase(phrase));
  const key = sodiumReadyRef().crypto_generichash(32, seed, null);
  seed.fill(0);
  return key;
}

export interface PhraseWrap {
  /** The data key, encrypted under the phrase-derived key. */
  readonly envelope: EncryptedEnvelope;
  /** A known-plaintext envelope so a wrong phrase fails clearly at restore. */
  readonly checkEnvelope: EncryptedEnvelope;
}

export function wrapDataKeyWithPhrase(dataKey: Uint8Array, phrase: string): PhraseWrap {
  const key = phraseToKey(phrase);
  try {
    return {
      envelope: seal(dataKey, key, contextBytes(PHRASE_CONTEXT)),
      checkEnvelope: seal(
        new TextEncoder().encode(PHRASE_CHECK_PLAINTEXT),
        key,
        contextBytes(PHRASE_CONTEXT),
      ),
    };
  } finally {
    key.fill(0);
  }
}

/** Verify a phrase against the check envelope before using it for anything. */
export function verifyPhraseAgainstWrap(phrase: string, wrap: PhraseWrap): boolean {
  let key: Uint8Array;
  try {
    key = phraseToKey(phrase);
  } catch {
    return false;
  }
  try {
    const expected = new TextEncoder().encode(PHRASE_CHECK_PLAINTEXT);
    const opened = open(wrap.checkEnvelope, key, contextBytes(PHRASE_CONTEXT));
    const ok = opened.length === expected.length && opened.every((b, i) => b === expected[i]!);
    opened.fill(0);
    return ok;
  } catch {
    return false;
  } finally {
    key.fill(0);
  }
}

/** Restore the data key from a phrase on a clean device. */
export function unwrapDataKeyWithPhrase(phrase: string, wrap: PhraseWrap): Uint8Array {
  if (!verifyPhraseAgainstWrap(phrase, wrap)) {
    throw new NomadCryptoError('decrypt_failed', 'Recovery phrase does not match this backup');
  }
  const key = phraseToKey(phrase);
  try {
    return open(wrap.envelope, key, contextBytes(PHRASE_CONTEXT));
  } catch {
    throw new NomadCryptoError('decrypt_failed', 'Recovery phrase does not match this backup');
  } finally {
    key.fill(0);
  }
}

/**
 * Transcription check for the "show once, confirm you wrote it down" flow.
 * Returns the indices of words that differ so the UI can point at them.
 */
export function verifyTranscription(shown: string, typed: string): {
  ok: boolean;
  mismatchedWords: number[];
} {
  const shownWords = normalizePhrase(shown).split(' ');
  const typedWords = normalizePhrase(typed).split(' ');
  if (shownWords.length !== typedWords.length) {
    return { ok: false, mismatchedWords: [] };
  }
  const mismatchedWords: number[] = [];
  shownWords.forEach((word, index) => {
    if (word !== typedWords[index]) mismatchedWords.push(index);
  });
  return { ok: mismatchedWords.length === 0, mismatchedWords };
}

/** Entropy-to-phrase helper exposed for deterministic tests and restore tooling. */
export function phraseFromEntropy(entropy: Uint8Array): string {
  return entropyToMnemonic(entropy, wordlist);
}

export { DATA_KEY_CONTEXT };
