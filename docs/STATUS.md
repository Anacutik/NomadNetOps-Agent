# Status

Single place to see where the build stands. Updated by every AI or person who finishes work (see [AI-WORKFLOW.md](AI-WORKFLOW.md)).

| Step | Title | Status | Last update | Summary |
|---|---|---|---|---|
| 00 | Foundations | done | 2026-11-04 | Monorepo, ADRs, ESLint, CI file, competitor teardown, PHASE0 research extended, name (NomadNetOps) and licence (Apache-2.0 open-core) confirmed. |
| 01 | Event log and data layer | done | 2026-11-04 | Zod schemas, FileEventLogWriter, MemoryEventLogWriter, EventLogVerifier, SQLite schema, InMemory repositories, export/import tools. Tests pass. |
| 02 | Security: keys, 2FA, recovery | done | 2026-11-05 | packages/crypto on libsodium: key hierarchy, spaces with per-device sealed keys and rotation, Argon2id password wrap, BIP-39 recovery phrase, TOTP/backup codes/passkey seam, recovery waiting period, QR device pairing, encrypted vault, field-level encryption + SQLCipher contract, crypto deletion. 115 tests incl. RFC 6238 and BIP-39 vectors. |
| 03 | Policy engine, budgets | done | 2026-11-05 | Policy engine, budgets, kill switch, untrusted-input taint, red-team tests (49/49). Follow-up lint fixes in core/policy and ESLint ignores. Lint/typecheck/test/build all pass. |
| 04 | Model gateway | not started | | |
| 05 | Agent runtime | not started | | |
| 06 | Connectors and vetting | not started | | |
| 07 | Desktop app | not started | | |
| 08 | Phone app, relay, sync | not started | | |
| 09 | Approvals and notifications | not started | | |
| 10 | Secretary | not started | | |
| 11 | Finances | not started | | |
| 12 | Ideas | not started | | |
| 13 | Coder helper and Designer | not started | | |
| 14 | Verification and Why panel | not started | | |
| 15 | Cloud Core and billing | not started | | |
| 16 | Compliance and launch | not started | | |

## Next up
- Step 04 (Model gateway, keys, Auto picks) — dependencies 02 and 03 are done.
- After that: Step 05 (Agent runtime and assistant file), which unlocks 07 (Desktop app).
