# NomadNetOps: Technical design (v0.1)

Status: draft for discussion. Decisions marked **Decided** come from the product owner; items marked **Recommend** are my proposals with pros and cons. Open items are collected in section 14 and in the step plans under [to-do/](to-do/extensive-plan.md).

## 1. Invariants (rules the whole system must keep)

1. **Privacy first.** All stored user data is encrypted. All user access uses 2FA. No opt-out. (Decided)
2. **The model never enforces rules.** A deterministic policy engine decides what may run. (Decided in principle)
3. **Consequential actions always need human approval:** sending, publishing, spending, changing account settings, deleting data, health or legal decisions. Nomad never moves money. (Decided)
4. **Nothing happens invisibly.** Every decision, tool call, cost and input becomes an event in the log. (Decided)
5. **Untrusted input stays data.** Emails, documents, web pages and tool output are never treated as instructions. (Decided)
6. **Phone-first.** Every core flow (capture, approve, review, pause or stop) must work on a phone. (Decided)
7. **Local-first, cloud by opt-in.** (Decided)

## 2. System overview and deployment

```
Phone app (iOS/Android)        Desktop app (Tauri)        Web (later)
        \                           |                         /
         \__ end-to-end encrypted channel via Relay _________/
                                    |
                              Nomad Core  (same code everywhere)
   Event log | Policy engine | Agent runtime | Model gateway | MCP host | Vault
```

**Nomad Core** is one TypeScript service that can run in three places:

| Where Core runs | Pros | Cons |
|---|---|---|
| A. User's desktop | Data never leaves the machine. Free to run. | Stops when the laptop sleeps. Phone cannot reach it unless the desktop is on. |
| B. Home server or small always-on device | Always on, still user-owned. | Needs setup. Not for non-technical users. |
| C. Managed cloud instance (single-tenant per user) | Always on, phone works anywhere, easy for non-coders. | User must trust the host. Needs strong isolation and encryption. Costs money to run. |

**Recommend:** support A and C from the start, B later. Default for a non-coder: C, with data encrypted under keys the user holds (see section 6). Default for a privacy purist: A.

**Relay:** a small cloud service that passes end-to-end encrypted messages between phone and Core (push notifications, approvals, quick capture). It sees only ciphertext and minimal routing metadata.

**Phone app options:**

| Option | Pros | Cons |
|---|---|---|
| React Native + shared TypeScript packages | Native feel, push, share-sheet, voice, biometrics. Reuses TypeScript. | Second UI codebase. |
| Tauri mobile | One UI codebase with desktop. | Younger, weaker on push and share-sheet. |
| PWA only | Fastest to ship. | Limited iOS push and background, weaker share-sheet. |

**Recommend:** a PWA for week-one capture and approvals, then React Native as the real phone app. Because the owner wants phone control as a flagship feature, the phone app moves from Phase 4 to Phase 2 (see the roadmap).

## 3. Data model (local SQLite, encrypted; Postgres in cloud)

Core tables (all rows carry `id`, `created_at`, `updated_at`, `owner_id`):

| Table | Purpose | Key fields |
|---|---|---|
| `events` | Append-only log, the source of truth | `seq`, `run_id`, `type`, `actor`, `payload` (encrypted JSON), `prev_hash`, `hash` |
| `runs` | One execution of an assistant | `assistant_id`, `assistant_version`, `status`, `risk_max`, `cost_usd`, `started_at`, `ended_at` |
| `assistants` | Assistant files (versioned) | `name`, `version`, `definition` |
| `approvals` | Pending and decided approvals | `run_id`, `action`, `risk_tier`, `status`, `decided_by`, `expires_at` |
| `budgets` | Caps by scope and period | `scope` (global, task, task type, key), `period`, `limit_usd`, `hard` |
| `secrets_meta` | Key names and rules, not the secrets | `provider`, `scope`, `key_ref`, `limit_hint` |
| `documents` | Secretary files | `path_enc`, `kind`, `extracted` (encrypted), `source` |
| `bills`, `finance_entries` | Finances | amount, currency, due, status, category, source |
| `notes` | Ideas inbox | `text`, `kind`, `topic`, `status`, `route` |
| `brand_baselines` | Designer baseline | colours, fonts, tone, version |
| `devices` | Trusted devices | `public_key`, `wrapped_data_key`, `last_seen`, `revoked_at` |

### Event envelope

```json
{
  "seq": 1842, "run_id": "r_91", "ts": "2026-11-02T21:30:00Z",
  "type": "tool.requested",
  "actor": "agent:researcher",
  "payload": { "tool": "web.fetch", "args_ref": "blob_77", "risk": 1 },
  "kind": "fact",
  "prev_hash": "ab12...", "hash": "cd34..."
}
```

- `kind` is `fact` (a real call, cost or input) or `explanation` (model-written reasoning, labelled as such because it may not be faithful).
- `hash = H(prev_hash || canonical(event))`. Any edit breaks the chain. Daily chain heads are signed and stored on a second device so tampering is detectable.
- Large payloads (documents, web pages) live in encrypted blobs referenced by id.

### Event types (first set)

`run.started`, `plan.proposed`, `model.requested`, `model.responded` (tokens, cost, model version), `tool.requested`, `policy.decided` (allow, ask, deny, with the rule that fired), `approval.requested`, `approval.decided`, `tool.completed`, `budget.warned`, `budget.stopped`, `run.paused` (reason), `run.aborted` (time, reason, logic, consequences), `run.completed`, `settings.changed`, `layout.changed`, `recovery.attempted`, `auth.login`.

Retention: runs and events kept until the user deletes them; the user can export (JSON and PDF) or delete everything, and deletion is cryptographic (destroy the key).

## 4. Risk tiers and the policy engine

| Tier | Name | Examples | Default rule |
|---|---|---|---|
| 0 | Read | Search, read a file the user granted, summarise | Allow, log |
| 1 | Draft | Write a draft, add to the agenda as a proposal | Allow, log |
| 2 | Reversible change | Create a calendar entry, move a local file, edit a note | Allow if the assistant's setting says so, otherwise ask. Undo offered. |
| 3 | Consequential | Send, publish, spend, change account settings, delete, health or legal decisions | **Always ask the user.** Cannot be turned to auto. |

Unknown or unclassified actions are treated as tier 3.

### Decision flow (runs before every tool call and every model call)

1. Identify the action, its tool and its scope.
2. Classify the risk tier from the tool manifest plus the arguments (rules, not the model).
3. Check the assistant's permissions (tool allow-list, data scopes, domains).
4. Check budgets (see below).
5. Check whether the input that led to this action came from untrusted content. If yes and tier is 2 or higher, require approval and show the source.
6. Return `allow`, `ask` or `deny`. Write `policy.decided` with the rule id.

### Budgets

Scopes: global, per task, per task type, per API key. Periods: run, day, week, month. Each budget has a soft warning level (80%) and a hard stop.

- At the hard stop, **important** tasks pause and ask the user. Other tasks stop and notify. (Decided)
- Shown in the charged currency (USD for OpenRouter) with an estimated local currency. (Decided)
- Where the provider supports it (OpenRouter), a per-key hard limit is also set on the provider side as a second safety net. (Decided)

### Paused and aborted tasks (Decided)

A paused task contacts the user by push and email, waits 12 hours for a reply, then aborts and writes a report: time, reason, logic and consequences.

## 5. Assistant file format

A versioned, human-readable file. Changes are shown as a diff and can be rolled back.

```yaml
nomad: 1
name: Invoice Helper
character: { tone: calm, detail: concise }
goal: Chase unpaid invoices every Friday.
task_type: business/invoices
important: true
model: { mode: auto }          # or { id: "vendor/model", reasoning: medium }
key: default                   # or a named key for this task
budget: { month_usd: 5, hard: true }
tools:
  - id: email.read     # tier 0
  - id: email.send     # tier 3, always asks
data_scopes: [ "mailbox:finance" ]
approvals: { tier2: ask }
success_criteria:
  - Each reminder names the right invoice and amount
schedule: "FRI 16:00"
signed_by: user
```

Third-party assistants and templates are vetted by the Master AI and show a report (what it reads, what it can do, what it costs) before install. (Decided)

## 6. Encryption, keys, 2FA and recovery (Decided: always on)

### Key hierarchy

```
Data Key (DK, random 256-bit, never leaves devices unencrypted)
  |- wraps per-collection keys (documents, finances, notes, events)
  |   |- per-document keys (file-level, so one file can be deleted cryptographically)
DK is itself wrapped separately by:
  1. Password-derived key (Argon2id)
  2. Each trusted device key (stored in Secure Enclave, TPM or OS keychain)
  3. Recovery phrase key (opt-in)
```

- Algorithms: XChaCha20-Poly1305 or AES-256-GCM for data, Argon2id for passwords, X25519 for device pairing, Ed25519 for signatures. Use audited libraries (libsodium), never custom crypto.
- Local database: SQLCipher plus per-record encryption for sensitive fields. Documents: file-level encryption.
- Provider API keys: OS keychain or Secure Enclave; never in the database, never in model context, never in logs.

### 2FA

- Required for every sign-in and for sensitive actions (change recovery, export, delete all, add device).
- Methods: **passkeys (WebAuthn)** first, authenticator app (TOTP) second, one-time backup codes as a fallback. SMS is not offered. (Recommend)
- Biometric unlock on the phone is a convenience on top of, not instead of, the second factor.

### Recovery (Decided)

- **Opt-in recovery phrase** (12 to 24 words shown once; Nomad never stores it).
- **Password reset** is possible: account access via verified email plus a second factor; data access via a trusted device or the recovery phrase, which re-wrap the Data Key.
- If password, all devices and phrase are lost, the data cannot be read by anyone, including us. The UI says this at setup and nudges until a phrase or second device exists.
- Recovery on a new device has a cancellable waiting period (for example 24 hours), notifies all devices, and is logged.

### Cloud-run Core (option C) and privacy

A cloud Core needs to read data to work, so it receives a **scoped, revocable session key** from a trusted device, held only in memory of the user's single-tenant instance. The host cannot read stored data without that session key. The user sees exactly what a cloud Core can access and can revoke it at any time. Model providers still receive the prompt content needed for a task; the UI shows what will be sent to which provider before it goes (a "data flow" preview).

## 7. Phone app and sync

- **Capture:** text, voice and share-sheet into Ideas or Secretary (photos of bills and letters). Email-to-self comes first, as it needs no app. (Decided order: email first, then the phone app.)
- **Control:** approvals (approve, reject, change), pause or kill switch, agenda, approvals inbox, quick task box, Master AI chat, budget view, Finances overview.
- **Notifications:** push with no sensitive content in the push payload ("Approval needed"), details after unlock.
- **Offline:** capture works offline and syncs later. Approvals need a connection.
- **Sync:** events and records are encrypted on the device and synced through the relay. Conflict rule: append-only events merge by sequence; editable records use last-writer-wins with a visible history.
- **Pairing:** scan a QR code on a trusted device; keys exchange with X25519; the new device is wrapped into the Data Key.

## 8. Model gateway

- Provider adapters: OpenRouter first (live catalogue, per-key limits), then direct providers and local models (Ollama).
- Coding model policy: `qwen/qwen3-coder-next` is the default implementation model; `qwen/qwen3-coder-30b-a3b-instruct` is for low-risk helper work; `qwen/qwen3-coder-flash` is reserved for genuinely large-context or latency-sensitive work; `qwen/qwen3-coder` (480B A35B) is an explicit escalation/reviewer model. No fallback or escalation is silent.
- Model catalogue refreshed daily when OpenRouter is the provider; favourites shown first; filters for price and task fit; `:free` and `:batch` flagged with drawbacks. (Decided)
- Per-task and per-model settings, reasoning levels, and per-task keys inherit from defaults. (Decided)
- **Auto** uses curated picks. The **Master AI proposes** them; the user approves each change; each change is logged with a reason. (Decided)
- Cost accounting on every response (tokens, price at that moment, model version) written into `model.responded`.
- Runtime defaults include a `$10/month` provider-key hard limit, `$5/month` Nomad development cap and `$0.50-$1.00` per-run cap, all adjustable by the user. Warn at 80%; stop or pause at the hard limit. The runtime must enforce these limits independently of model instructions.
- Data minimisation: strip fields the task does not need before sending.

## 9. Agent runtime

- Planner loop with a step budget, a tool executor, a scheduler, and a verifier.
- Every step is an event; runs can be **replayed** with recorded tool outputs to test changed instructions.
- Success criteria are checked automatically where possible (format, schema, rules) and optionally by a second model; samples go to human review.
- Sandboxing: tools run with scoped permissions; code and browser tools run in isolated containers or OS sandboxes.

## 10. Connectors and vetting (MCP)

- Connectors follow MCP. Each has a manifest: tools, risk tier per tool, data scopes, domains, publisher.
- **Vetting pipeline (Decided):** every third-party tool or update is analysed by the Master AI plus static checks (permissions diff, network domains, known vulnerabilities, signature, publisher reputation). The user receives a plain report with a recommendation (install, install with limits, do not install). Nothing installs or updates silently.
- First-party connectors first (web search and fetch, PDF reading, email, calendar, files) to set the standard.

## 11. Module designs (data touchpoints)

| Module | Inputs | Outputs | Safety notes |
|---|---|---|---|
| Secretary | Files, forwarded mail, mailbox (read-only by default) | Agenda items, bills, summaries of official letters, log | Documents are untrusted; extraction yields structured fields shown for confirmation; storage local-first and encrypted |
| Finances | Confirmed bills, manual entries, CSV/OFX, later a read-only bank connection | Overview, categories, due and overdue | Read and count only; never moves money |
| Ideas | Quick capture, email-to-self, voice | Compare options (quality, budget, DIY, middle), reminder tasks, handoff to Coder | Search is tier 0; buying or ordering is tier 3 |
| Coder helper | Ideas, design answers, Designer baseline | Prompt for Kilo Code, Copilot Chat or any coding AI | Never edits code itself |
| Designer | Brief, mood, colours, fonts | Identity, social, web, app and map sketches, baseline, SVG | Baseline is shared read-only with other agents |

## 12. Prompt-injection and data-leak defences

- Separate instruction channel (system, user) from data channel (documents, mail, web); data is wrapped and labelled.
- Instructions found in data are ignored and flagged to the user.
- Any tier 2 or 3 action whose reasoning chain touched untrusted content requires approval and shows the source.
- Secrets never enter the model context. Outbound network access per tool is allow-listed.
- Regular red-team tests are part of CI (see the verification step plan).

## 13. Quality and observability

- Test layers: unit (policy rules, hash chain, crypto round trips), contract (connectors), scenario (end-to-end runs with recorded model outputs), red-team (injection suites), accessibility (WCAG 2.2 AA).
- Privacy-preserving telemetry only, opt-in, no content.

## 14. Open technical decisions (with a recommendation)

| # | Question | Options | Recommend |
|---|---|---|---|
| 1 | Where the default Core runs | Desktop, home server, managed cloud | Desktop and managed cloud from day one |
| 2 | Phone technology | PWA, React Native, Tauri mobile | PWA first, React Native next |
| 3 | Relay hosting | Self-hosted, our cloud, hybrid | Our cloud with open-source relay so users can self-host |
| 4 | Local DB | SQLite with SQLCipher, or encrypted files | SQLite with SQLCipher |
| 5 | Chain anchoring | Local only, second device, public timestamping | Second device first |
| 6 | Crypto library | libsodium, WebCrypto only | libsodium for core, WebCrypto in browsers |
| 7 | Monorepo tooling | pnpm workspaces, Nx, Turborepo | pnpm workspaces with Turborepo |
| 8 | License | Open-core, fully open, source-available | Open-core with open runtime and policy engine |
| 9 | Bank connection (later) | Regional aggregators | Decide per region when Finances step 3 starts |

## 15. Additional decisions (added after gap review)

### 15.1 Households and shared spaces (Decided)
- Data lives in **spaces**: each person has a private space, and any group (for example a household) can have shared spaces. Every record, event, document and budget belongs to exactly one space (`space_id`).
- Each space has its own Data Key. A member receives the space key wrapped for their own devices. Removing a member rotates the space key and re-wraps for the remaining members; new data is unreadable to the removed member, and the UI says that data they already saw cannot be taken back.
- Roles per space: **owner, member, viewer**. Approvals for a shared task can require one named approver or any member. Tier 3 approvals always need a human member with their own 2FA; they can never be approved by another assistant.
- Private spaces are never visible to other members, including the owner of a shared space. Assistants run inside one space and can only read other spaces through an explicit, logged, revocable grant.
- Each member sets their own modules and menu, layout, Master AI character and notification rules (per-person settings, not per-space).
- Budgets and keys can be per space or per person. Finances has a private view and a shared household view.
- Impact: tables get `space_id`; the policy engine checks the space and role; sync and the relay route by space; recovery is per person, and each space key can be recovered through any member's trusted device.

### 15.2 Backups (Proposed)
Encrypted backups to a destination the user picks (external drive, their own cloud storage, or ours). Backups are encrypted with the space keys, so the destination learns nothing. Restore works with a trusted device or the recovery phrase. The app warns when no backup exists for local-only data.

### 15.3 Master AI limits (Proposed)
The Master AI has its own model setting and its own budget line, shown separately. It may change layout, menus and modules (with Undo) and propose Auto picks and vetting verdicts. It can never change permissions, keys, approvals, budgets or recovery settings, and it can never approve anything.

### 15.4 Travel and weak connections (Proposed)
Offline mode: capture, agenda and reading work without signal. Captures queue and sync later. Approvals wait safely (a pending approval never expires into approval; the 12-hour rule only leads to an abort). A low-data mode limits sync and attachments.

### 15.5 Smaller items (Proposed)
- Provider outages and retired models: fall back within the user's approved list, notify and log.
- Digital legacy: the user may name a trusted person who can request access, with a long waiting period and notification to the user.
- Notification overload: quiet hours, daily digest, per-space rules. Quiet hours never auto-approve.
- Legal and health content: clear "not professional advice" notices and a prompt to check an official source.
- Working name NomadNetOps and Apache-2.0 for the open parts, to be revisited at step 00.
