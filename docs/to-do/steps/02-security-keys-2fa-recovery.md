# Step 02: Security: keys, encryption, 2FA, recovery

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 02 (Security: keys, encryption, 2FA, recovery) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/02-security-keys-2fa-recovery.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents). Use vetted crypto libraries only; never invent your own primitives.
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-02-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** make "always encrypted, always 2FA, recoverable" real, before any feature stores user data.

## Scope
Key hierarchy, encryption of database, documents and fields, secret vault, 2FA, password reset, recovery phrase, device trust.

## Tasks
0. Spaces: one Data Key per space, wrapped per member device; roles (owner, member, viewer); add and remove members with key rotation; private spaces invisible to others.
1. `packages/crypto` on libsodium: Data Key, collection keys, per-document keys, wrap and unwrap, rotation.
2. SQLCipher integration plus field-level encryption for sensitive columns.
3. Vault for provider API keys (OS keychain, Secure Enclave on phone).
4. Passkeys (WebAuthn), TOTP and backup codes; sign-in and step-up for sensitive actions.
5. Password-derived key with Argon2id; password change and reset flow (see technical design section 6).
6. Opt-in recovery phrase: generate, show once, verify the user wrote it, restore flow.
7. Trusted devices: add by QR pairing, revoke, list.
8. Recovery waiting period, cancel by owner, notifications, log events.
9. Cryptographic deletion (destroy keys).
10. Independent crypto review and test vectors.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| Account server | None (device only) or server with identity | Minimal identity server for email verification and relay, holds no keys |
| 2FA methods | Passkey, TOTP, SMS, hardware key | Passkey, TOTP, backup codes, hardware keys; no SMS |
| Phrase format | BIP-39 words, custom | BIP-39 wordlist (well understood) |
| Waiting period | 24h, 48h, user-set | 24h default, user can lengthen |
| Cloud Core access | Session key from device, server-side KMS | Session key from device (see technical design) |
| Biometrics | Convenience only, or counts as a factor | Convenience only |

## Dependencies
Step 01.

## Acceptance
- Disk dump contains no readable user data. Every sign-in needs a second factor. A full recovery with phrase works on a clean device. Loss without phrase is clearly warned. External review has no critical findings.

## Risks
- Usability: recovery must be understandable to non-coders. Test with real users.
