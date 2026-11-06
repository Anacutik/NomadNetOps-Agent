# 2026-11-05: Step 02, security: keys, encryption, 2FA, recovery

**Author:** Kilo (z-ai/glm-5.3-flash via OpenRouter)
**Step file:** docs/to-do/steps/02-security-keys-2fa-recovery.md
**Status after this work:** done (package level; platform adapters deferred to steps 07/08)

## What changed
- Built out `packages/crypto` on libsodium (`libsodium-wrappers-sumo`) plus `@scure/bip39` for the recovery phrase.
- Key hierarchy: per-space Data Key wraps per-collection keys (documents, finances, notes, events); collection keys wrap per-document keys so single documents can be deleted cryptographically. Envelopes are XChaCha20-Poly1305 with AAD context binding and a version field (old versions rejected).
- Spaces (ADR 0003): one Data Key per space, sealed (crypto_box_seal) per member device; roles owner/member/viewer enforced from directory membership only; removing a member rotates the data key AND every collection key so cached old wraps cannot read new data; private spaces of others are invisible in listings; space names stored encrypted.
- Password: Argon2id (crypto_pwhash) with NFKC normalisation, presets interactive/moderate/sensitive (default moderate) plus a test-only preset; password change re-wraps the data key.
- 2FA: TOTP (RFC 6238 over HMAC-SHA-256, arbitrary-length keys via init/update/final), single-use backup codes (keyed BLAKE2b hashes, plaintext shown once), passkey adapter interface with an in-memory implementation; sign-in always requires a second factor; step-up (5 min window) for sensitive actions.
- Recovery phrase: BIP-39 English wordlist, show-once with word-by-word transcription check, phrase-derived wrapper key, restore flow verified against a check envelope.
- Recovery waiting period service: 24h default, user-extendable, cancellable by the owner only, notification hooks for the event log.
- Trusted devices: X25519 + Ed25519 device keypairs, signed QR pairing (`nomad://pair/...`) with invite digest binding and expiry, registry with revoke, data key sealed per device.
- Vault: SecretVault interface with an encrypted vault (values as envelopes under a KDF-derived vault key, ref-bound AAD) and an in-memory vault; PlatformKeychainAdapter seam for the OS keychain in step 07.
- Field-level encryption for sensitive DB columns with table/column/row AAD binding; SQLCipher PRAGMA key derivation (KDF, so the DB key is not the data key) and an EncryptedDatabaseAdapter contract for step 07.
- Cryptographic deletion: destroy space keys (zeroing is best effort in JS; the guarantee is removal of all wrapped copies), destroy per-document keys.
- Security event type catalogue for the event log (auth.login, key.rotated, recovery.*, device.*, secrets.changed, key.destroyed), every event carrying space_id per ADR 0003.
- Follow-up fixes carried from step 03: removed remaining unused imports/vars in core (`eventLogVerification.ts`, `eventLogWriter.ts`, `exportTools.ts` with a `{ cause }` fix) and policy (`engine.ts` unused params, `redteam.test.ts` import); added `.kilo/**` to ESLint ignores because a stale Agent Manager worktree broke tsconfigRootDir detection.

## Files added or changed
- `packages/crypto/src/` — primitives.ts, sodium.ts, envelope.ts, keys.ts, password.ts, spaces.ts, devices.ts, phrase.ts, totp.ts, auth.ts, vault.ts, recovery.ts, deletion.ts, fields.ts, keyutils.ts, events.ts, encoding.ts, version.ts, index.ts
- `packages/crypto/src/*.test.ts` — 13 test files, 115 tests (unit, RFC 6238 SHA-256 vectors, BIP-39 Trezor vectors, red-team suite, end-to-end integration)
- `packages/crypto/package.json` — added libsodium-wrappers-sumo, @scure/bip39; test script now `vitest run`
- `packages/core/src/eventLogVerification.ts`, `eventLogWriter.ts`, `exportTools.ts` — lint fixes
- `packages/policy/src/engine.ts`, `redteam.test.ts` — lint fixes
- `eslint.config.mjs` — ignore `.kilo/**`
- `docs/STATUS.md`, step file 02 and 03, this changelog

## Decisions made
User approved all recommendations and the two new dependencies (libsodium-wrappers-sumo, @scure/bip39) and the "package-level now, adapters later" scope:
- 2FA methods: passkey, TOTP, backup codes; no SMS. TOTP uses SHA-256 (RFC 6238 vectors verified); SHA-1 compat for older authenticator apps can be added later if needed.
- Phrase format: BIP-39 (English wordlist).
- Waiting period: 24h default, user can lengthen (extend only adds time).
- Cloud Core access: session key from device (interfaces here stay device-only; no server built in this step).
- Biometrics: convenience only, never a factor.
- Account server: minimal identity server deferred; this step is device-only with server-ready seams.
- TOTP secret storage: keys are managed per user/device in the service; enrollment secrets live outside the database (vault layer) when persisted.

## Verification
- `pnpm --filter @nomad/crypto run test`: 115/115 passed (13 files), including RFC 6238 SHA-256 vectors, the official BIP-39 Trezor vector, AAD tamper/replay checks and leak scans.
- `pnpm run lint`: exit 0 (after fixing 12 unused-import/var errors across core, policy, crypto).
- `pnpm run typecheck`: 7/7 packages pass.
- `pnpm run test`: 7/7 tasks pass (crypto 115, policy 49).
- `pnpm run build`: 7/7 tasks pass.

## Left over / follow-ups
- Independent external crypto review (task 10): test vectors and red-team checks are done; a human review should happen before launch (mapped to step 16). No critical findings possible to claim without it.
- Real platform adapters: OS keychain (step 07), WebAuthn browser wiring (step 07), SQLCipher binaries (step 07), Secure Enclave (step 08). Interfaces are in place.
- TOTP SHA-1 compatibility for very old authenticator apps, if user research asks for it.
- Server-side pieces (identity, relay, cross-device key sync) belong to steps 08 and 15.

## Docs updated
- [x] Step file (02: status, tasks, notes; 03: closed out as done)
- [x] docs/STATUS.md
- [ ] PLAN.md (no change needed: section 6 already matches what was built)
- [ ] docs/to-do/extensive-plan.md (no order or dependency changes)
