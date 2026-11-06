import { beforeAll, describe, expect, it } from 'vitest';
import { ensureReady, NomadCryptoError, randomBytes } from './primitives.js';
import { EncryptedVault, InMemoryVault } from './vault.js';

describe('vault for provider API keys', () => {
  beforeAll(async () => {
    await ensureReady();
  });

  it('stores and returns secrets by reference', async () => {
    const vault = new InMemoryVault();
    await vault.put('openrouter:default', 'sk-or-v1-abc');
    expect(await vault.get('openrouter:default')).toBe('sk-or-v1-abc');
    expect(await vault.has('openrouter:default')).toBe(true);
    expect(await vault.refs()).toEqual(['openrouter:default']);
    await vault.delete('openrouter:default');
    expect(await vault.has('openrouter:default')).toBe(false);
  });

  it('fails cleanly on missing secrets', async () => {
    const vault = new InMemoryVault();
    await expect(vault.get('missing')).rejects.toThrowError(NomadCryptoError);
  });

  it('encrypts values at rest under a derived vault key', async () => {
    const dataKey = randomBytes(32);
    const vault = new EncryptedVault(EncryptedVault.vaultKeyFromDataKey(dataKey), 'space-1');
    await vault.put('openrouter:default', 'sk-or-v1-secret-value');
    const stored = vault.exportEnvelopes()['openrouter:default'] ?? '';
    expect(stored).not.toContain('sk-or-v1-secret-value');
    expect(JSON.parse(stored)).toMatchObject({ v: 1 });
    expect(await vault.get('openrouter:default')).toBe('sk-or-v1-secret-value');
  });

  it('binds entries to their reference: swapping refs fails', async () => {
    const dataKey = randomBytes(32);
    const vault = new EncryptedVault(EncryptedVault.vaultKeyFromDataKey(dataKey), 'space-1');
    await vault.put('key-a', 'secret-a');
    const envelopeA = JSON.parse(vault.exportEnvelopes()['key-a']!) as never;
    const forged = new EncryptedVault(EncryptedVault.vaultKeyFromDataKey(dataKey), 'space-1');
    // Inject A's envelope under B's ref: the AAD binding must reject it.
    const entries = (forged as unknown as { entries: Map<string, never> }).entries;
    entries.set('key-b', envelopeA);
    await expect(forged.get('key-b')).rejects.toThrowError(NomadCryptoError);
  });

  it('a different space id cannot open another space vault entries', async () => {
    const dataKey = randomBytes(32);
    const key = EncryptedVault.vaultKeyFromDataKey(dataKey);
    const vaultA = new EncryptedVault(key, 'space-a');
    await vaultA.put('ref', 'secret');
    const stolen = JSON.parse(vaultA.exportEnvelopes()['ref']!) as never;
    const vaultB = new EncryptedVault(key, 'space-b');
    const entries = (vaultB as unknown as { entries: Map<string, never> }).entries;
    entries.set('ref', stolen);
    await expect(vaultB.get('ref')).rejects.toThrowError(NomadCryptoError);
  });

  it('refs() lists references only, never values', async () => {
    const vault = new EncryptedVault(EncryptedVault.vaultKeyFromDataKey(randomBytes(32)), 's');
    await vault.put('a', 'one');
    await vault.put('b', 'two');
    const refs = await vault.refs();
    expect(refs.sort()).toEqual(['a', 'b']);
  });
});
