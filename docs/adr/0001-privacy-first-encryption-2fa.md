# 0001 Privacy first: always encrypted, always 2FA, recoverable

**Status:** Accepted (product owner, 2026-11-02)

**Context:** Users hand Nomad documents, bills, mail and finances. Privacy outranks every other goal.

**Decision:** All stored user data is encrypted. All user access uses 2FA (passkeys, authenticator app, backup codes; no SMS). No opt-out. Recovery exists: password reset plus an opt-in recovery phrase. If password, devices and phrase are all lost, data is unreadable to everyone.

**Consequences:** Crypto and security (step 02) come before any feature stores data. Cloud hosts cannot read data at rest. Recovery UX must be tested with non-coders. Details: docs/TECHNICAL-DESIGN.md section 6.
