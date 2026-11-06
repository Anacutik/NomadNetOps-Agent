# Step 02: Security: keys, encryption, 2FA, recovery

**Status:** done (package level; OS keychain, WebAuthn wiring, SQLCipher binaries and Secure Enclave adapters land with steps 07/08)

## Summary
`packages/crypto` implements the key hierarchy, spaces with per-device key sealing and rotation, password/phrase/device wrapping of the data key, TOTP + backup codes + passkey seam, recovery waiting period, trusted-device QR pairing, encrypted vault, field-level encryption with a SQLCipher contract, and cryptographic deletion. 115 tests pass, including RFC 6238 and BIP-39 vectors and a red-team suite.

## Tasks
0. Spaces: one Data Key per space, wrapped per member device; roles (owner, member, viewer); add and remove members with key rotation; private spaces invisible to others. (done)
1. `packages/crypto` on libsodium: Data Key, collection keys, per-document keys, wrap and unwrap, rotation. (done)
2. SQLCipher integration plus field-level encryption for sensitive columns. (done at contract level: field-level encryption implemented, SQLCipher PRAGMA key derivation and adapter interface provided; real binaries in step 07)
3. Vault for provider API keys (OS keychain, Secure Enclave on phone). (done at interface level: encrypted vault + PlatformKeychainAdapter seam; OS keychain in step 07, Secure Enclave in step 08)
4. Passkeys (WebAuthn), TOTP and backup codes; sign-in and step-up for sensitive actions. (done: TOTP and backup codes fully working; passkey adapter interface + in-memory implementation, browser wiring in step 07)
5. Password-derived key with Argon2id; password change and reset flow (see technical design section 6). (done: Argon2id wrap/change; reset via device or phrase re-wrap; email-verified account reset needs the identity server, step 15)
6. Opt-in recovery phrase: generate, show once, verify the user wrote it, restore flow. (done)
7. Trusted devices: add by QR pairing, revoke, list. (done)
8. Recovery waiting period, cancel by owner, notifications, log events. (done: service with notification hooks; event integration in the runtime step)
9. Cryptographic deletion (destroy keys). (done)
10. Independent crypto review and test vectors. (partially done: RFC 6238 SHA-256 and BIP-39 Trezor vectors pass; independent human review still open, planned before launch in step 16)

## Work done in this step
- Dependencies added with user approval: `libsodium-wrappers-sumo` 0.8.4, `@scure/bip39` 2.4.0 (audited).
- Envelope format `v1` with AAD context binding; wrong context, tampered or downgraded envelopes always fail.
- Spaces: membership-derived roles only (a caller-supplied role can never grant rights — found and fixed via red-team tests); last-owner protection; stale unlocked keys refused for management operations.
- Member removal rotates the data key and all collection keys, so a removed member with cached wrapped keys cannot read anything written afterwards.
- libsodium interop handled through a single `sodium.ts` access point because the wrapper attaches its API only after `ready` resolves and namespace imports give dead snapshots.

## Verification
- Tests: 115/115 in packages/crypto (13 files); repo-wide lint, typecheck, test, build all pass.
- Vectors: RFC 6238 TOTP SHA-256 appendix B (six timestamps); BIP-39 English zero-entropy vector with TREZOR passphrase.

## Left over / follow-ups
- Independent external crypto review (step 16, before launch).
- Platform adapters: OS keychain, WebAuthn browser APIs, SQLCipher binaries (step 07); Secure Enclave (step 08).
- Optional TOTP SHA-1 compatibility for very old authenticator apps.

## Docs updated
- [x] Step file (Status set to done)
- [x] docs/STATUS.md (Step 02 marked done; Next up updated)
- [ ] PLAN.md (no change needed)
- [ ] docs/to-do/extensive-plan.md (no changes)

## Open questions
None (all six design choices resolved with the recommended options, logged in the changelog).
