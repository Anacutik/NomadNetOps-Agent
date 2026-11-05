# NomadNetOps Agent Configurator: Product & Architecture Plan (draft v0.1)

## 1. Vision
A harness that lets non-coders **automate tasks, configure agents, verify results, and see exactly why an AI did what it did**. Trust and transparency are the product, not a feature.

## 2. Decisions made so far
| Topic | Decision |
|---|---|
| First user | Individuals / solopreneurs automating personal & small-business tasks |
| Delivery | Desktop **and** cloud from day one (shared core) |
| Models | Model-agnostic (OpenAI, Anthropic, Google, local via Ollama), BYO key |
| Engine | Own lightweight agent runtime; tools via MCP |
| Safety | Risk-tiered approval gates |
| Business | Open-core: free local core, paid cloud sync/hosting/teams |
| Builder | Master Chat sidebar + live visual canvas + planner (see 2a) |
| Transparency | Layered log: plain summary + sources, expandable raw steps, "recorded fact" vs "model explanation" labels |
| Scheduling | Cloud runs scheduled jobs (paid); desktop runs only while app is open, with missed-run catch-up |
| Tech stack | **Decided**: TypeScript + React + Tauri; SQLite local / Postgres cloud; Rust/Python sidecars only if needed |
| Connector vetting | Master AI vets every third-party tool and every update, produces a plain-language report with an install/don't-install recommendation; user makes the final call (see 2b) |

### 2a. Builder paradigm (decided): Master Chat + visual canvas
- **Master Chat sidebar** (always present): talks to the user in natural language, creates/edits/monitors all assistants, logs every conversation, and explains/modifies configurations. It can only act through the same policy-checked API as the UI (no hidden powers).
- **Visual canvas** beside the chat: chat changes appear live as linked blocks (Trigger -> Sources -> Steps -> Checks -> Approval -> Output). Users can also drag/edit blocks directly; chat and canvas stay in sync.
- **Settings card per assistant** with visual confirmation: model (presented as "Fast / Balanced / Best" with an advanced picker), reasoning level (slider), max spend (per run/month, with estimate), directions (plain-language, AI-rewritten into a proper prompt behind the scenes and shown side by side), permissions, schedule.
- **Agenda/Planner:** calendar and task-list view of all assistants' planned runs (e.g. "monthly: check government sites for rule changes"), with next-run, last result, cost.
- **Example flow (government rule changes):** user says the goal -> Master Chat asks clarifying questions (which countries/sites, which topics, how to be notified) -> proposes sources + monthly schedule + "summarize changes, cite links, flag what affects me" -> dry-run on last month -> user confirms the visual summary -> runs monthly, report lands in the inbox with source links and a "why this matters" log.

### 2b. Third-party tool vetting (decided: Master AI gatekeeper)
Nothing third-party is installed or updated without a Master AI vetting report.
- **Report contents (plain language):** what it does, who publishes it, permissions requested vs. needed, data it can see/send, network destinations, code/dependency scan results, known vulnerabilities, reputation and age, changes since last version (for updates), and a verdict: **Install / Install with limits / Don't install**, with reasons.
- **Do not rely on the AI alone.** The Master AI's review is paired with deterministic checks (signature/hash verification, dependency audit, static scan, sandbox test run observing network/file behaviour, pinned versions). The AI explains and recommends; the policy engine enforces.
- **Human decides:** the user approves, and a "Don't install" verdict needs an explicit extra confirmation to override.
- **Updates:** pinned by default; an update is diffed against the approved version, re-vetted, and never auto-applied if permissions or network destinations grow. Rollback is always one click.
- **Risk to design for:** the vetting AI can itself be prompt-injected by the tool's own text/code. Mitigations: run the review in an isolated, tool-less model session; treat package content strictly as data; use a second, different model as cross-check for high-risk tools; log the full vetting report in the audit trail.
- **Sandboxing at runtime:** every approved tool runs with only the granted permissions, and violations are blocked and reported.

### 2c. Settings architecture (decided)
Settings follow an **inheritance model**: Global defaults -> Master AI -> per assistant -> per task. Anything left on "default" follows the level above, and the UI always shows the effective value and where it comes from.
- **Master AI:** name, tone, level of detail, proactivity, language, audience (beginner/expert), free-text extra instructions, live preview of the personality. Its own model, thinking depth, monthly cap and key. Its powers are limited to the same policy-checked API as the user, and it never sees API keys.
- **Models & keys:** per provider (OpenAI, Anthropic, Google, local Ollama) a default key with Test & save; keys live in the OS secure vault (cloud: KMS), shown only as masked, never in assistant files, logs or model context. Fast/Balanced/Best mapping to provider+model (auto-updated with notice, or pinned). Global monthly cap and a fallback rule (pause and ask / fallback model / stop).
- **Assistants & tasks:** "Use default settings" toggle; otherwise override model, thinking depth, spend cap, API key (default / another saved key / task-only key), approval level, and a separate checker model (a different provider is recommended for important work).
- **Chat parity:** every setting can also be changed by asking the Master AI, with a visual confirmation before it applies.
- **Open issues:** per-task keys increase the secrets surface (need rotation reminders and revoke-all); budget caps must be enforced by the runtime, not by the model; settings changes are audit-logged and versioned with rollback.

### 2d. OpenRouter-first model access, library, budgets (decided)
- **OpenRouter as the primary provider:** one key gives access to the live catalogue of models OpenRouter lists; the count changes and is never hard-coded. Direct OpenAI/Anthropic/Google keys and local Ollama remain supported.
- **Coding model defaults:** use `qwen/qwen3-coder-next` for normal implementation work, `qwen/qwen3-coder-30b-a3b-instruct` for low-risk helper work, `qwen/qwen3-coder-flash` only when its large context or latency is needed, and `qwen/qwen3-coder` (480B A35B) for explicit security/architecture escalation or final review. Escalation and fallback require user-visible approval and are logged.
- **Model library** (Settings): live list from OpenRouter's public models endpoint (no key needed to browse). Search, filter (provider, free, tools, reasoning, images, long context, max price), sort (newest, name, price, context), detail panel (description, price in/out/cached per 1M tokens, example cost of a typical run, context window, max answer length, modalities, reasoning levels, tool support), and a **shortlist** (star). Shortlisted models appear first in every model picker. "Use for: Master AI / Fast / Balanced / Best / a specific task" buttons.
- **Keys with hard limits:** OpenRouter keys can carry their own spending limit with a daily/weekly/monthly reset. Nomad shows each key's limit and usage, and treats it as a second safety net behind its own budgets. Two ways to get a key per task: paste one manually, or (optional) provide an OpenRouter **management key** so Nomad creates, limits, monitors and revokes per-task keys automatically (the API supports a limit, a reset period and an expiry per key). The management key never reaches a model, and is stored like any other secret.
- **Budgets per task and period:** each assistant/task can have several limits at once (per run, per day, per week, per month), plus the global monthly cutoff. The runtime estimates cost before each step (using live prices) and stops or pauses at the earliest limit that would be exceeded.
- **Decided (currency):** amounts are shown in the *charged* currency (USD for OpenRouter) with a calculated estimate in the user's own currency next to it (daily exchange rate, labelled as an estimate; offline fallback rates are flagged). Budgets and limits are enforced in USD.
- **Decided (at a limit):** a task flagged **Important** (checkbox in the task creator and in task settings) pauses and asks the user how much extra to allow; other tasks stop and notify. Global default: "important tasks ask, others stop", overridable per task. A paused task never spends beyond the limit while waiting. Important tasks also get a suggestion for a second checker model.
- **Decided (Fast/Balanced/Best):** user-defined. Each level maps to any model from the shortlist (or "Auto": Nomad recommends and announces changes). Shortlisted models are pinned to the top of the library and of every model picker; the picker also has "Browse the model library".
- **Decided (library filtering):** opens pre-filtered by a **"Suited for"** preset (everyday, long documents/web research, Master AI, cheap high-volume, hard problems) that sets price cap, tool support, reasoning, long-context and sort, all visible and editable. Presets exclude free models. A **version type** filter separates Standard (default), `:free`, `:batch`, `~` aliases and other suffixes. Each non-standard type shows a warning: free (prompts may be logged or used for training, rate limits, can vanish, not for private data or important tasks), batch (answers arrive later), alias (model behind it can change between runs).
- **Decided (freshness):** when OpenRouter is enabled as a provider, model data refreshes automatically every day (plus "Refresh now"); the app shows what changed (new models, price changes, removed models) and warns when a shortlisted model disappears. Runtime still re-checks the live price before each run.
- **Decided (Auto):** "Auto" uses **Nomad's own curated picks**, never OpenRouter rankings. The user is told before a pick changes. Still to define: how the picks are chosen, tested and updated (idea: a regularly re-run public benchmark on our own task types).
- **Decided (paused tasks):** a paused task notifies the user by **push and email** (both on by default, at least one must stay on), reminds at the halfway point and 1 hour before the end, and waits **12 hours** (configurable 1-48 h). With no reply it aborts and writes an **abort report** to the Inbox: *when* (paused/aborted times), *why* (which limit), *logic* (important task, who was contacted when, no reply), *consequences* (what was done and not done, who is affected, whether anything needs undoing, when it can resume) and one-click options (run the rest with extra budget, raise limit, open full log). A paused task spends nothing while waiting.

### 2e. Task types (decided)
Five categories with subcategories, used in the task creator and the "Task types" gallery:
1. **Research and information** (10), 2. **Communication and content** (11), 3. **Planning and personal organization** (11), 4. **Business and workflow operations** (12), 5. **Software, data, and technical support** (12).
- A task can pick several subcategories. Each subcategory carries **consequence flags**: sends messages, publishes, spends money, changes settings, changes records/files/code, deletes data. Flags drive the approval defaults ("asks before sending"), and a suggestion to mark the task **Important**.
- Each category suggests a model filter ("Suited for" preset): Research to long documents, Communication and Planning/Business to everyday, Software to hard problems. Shown as a suggestion that opens the library, never forced.
- **Hard rule:** actions with real consequences (sending, publishing, spending, changing account settings, deleting data, health or legal decisions) always pause for human approval, whatever the task settings.
- Phase 0 to validate: do non-coders find their task in this taxonomy, or do they prefer to describe it in chat?
- **Risks:** OpenRouter's list changes daily and some entries are variants (":batch", ":free", "~" aliases), so the library must group variants and handle models that disappear (fallback plus notice). Prices shown are indicative, the runtime must re-check at run time. Free models may log prompts; the library should show data-policy hints before a user sends private data. Runtime defaults are a `$10/month` provider-key cap, `$5/month` Nomad development cap and `$0.50-$1.00` per-run cap, all user-adjustable, with an 80% warning and hard stop/pause.

### 2f. Interface layout (decided, from the user's mock-up)
Three columns: **left sidebar** (Overview, Agents, Task types, Agenda, Activity, Why log, Tools, Settings, plan and spend card), **main view**, and a **Master AI panel** on the right with context-aware suggestion buttons and a message box.
- **Overview dashboard:** greeting, "Create a task", today's agenda, agent status, recent activity, spending. Also a **quick task box**.
- **Everything optional and adjustable:** each main-view widget and input box (quick task box included) can be shown or hidden, resized (small, wide, full) and reordered. The Master AI panel and its message box can be hidden too ("Customize this page"). Choices are remembered per device, with a reset. Principle: a non-coder starts with a calm default and a power user can trim or extend it.
- **Agent library:** cards per agent (Researcher, Writer, Scheduler, Data Assistant) with capabilities, availability and "Assign task".
- **Task builder:** numbered step cards (goal, inputs, instructions, connectors, approval, test run) with Test run and Save task. The Master AI fills the steps from chat.
- **Agenda:** week calendar colour-coded by agent, plus a list view. Items open the **task detail and approval** page (summary, connected tools, run history, output preview, Approve / Edit / Cancel).
- To validate in Phase 0: do people prefer the dashboard, the chat panel or the quick box as their starting point?

- **Master AI organizes the layout (decided):** the user can say "simplify this page", "focus on spending", "hide agent status and make the agenda full width", "add a budget box", or press a suggestion. The Master AI changes only layout (never data or permissions), says exactly what it changed, and offers **Undo**. Works on the dashboard and in the task builder.
- **Box-based task builder (decided):** each step is a box that can be shown or hidden, made wide, edited in place, dragged (by its grip) or moved with buttons. Optional boxes: Budget, Notes, Deadline. **Approval is locked on** and cannot be hidden, by the user or the Master AI.

### 2g. Secretary (decided)
A drop zone (drag and drop, file picker, or paste) for bills, letters, emails and appointment cards.
- **Appointments** go onto the agenda after one confirmation.
- **Bills:** amount, due date and sender are extracted; Nomad keeps an open-total, sets a reminder N days before (1/3/7, user choice), and the user marks it paid. **Nomad never pays**; paying is always a consequential action needing the user.
- **Official letters and emails:** summary, rule change, what you must do, possible consequences, key dates (quoted lines labelled *Recorded fact*, the "what it means for you" labelled *AI explanation*), then saved as a report with a deadline reminder.
- **Everything is confirmed, then logged** in a Secretary log. Unknown documents are never guessed: Nomad asks.
- **Documents are untrusted input:** instructions written inside a letter or email are never followed (prompt-injection defence); they are only read as content.
- Prototype note: text files are really parsed (patterns for dates, amounts, senders); PDFs and photos use example readings. The real app uses the Master AI plus optional local OCR for privacy.
- **Decided (storage):** documents are stored **local-only by default**; cloud storage is an explicit opt-in per user.
- **Decided (mail intake):** both ways are supported and the user chooses in Settings: a **private forwarding address** (simple, no account access) and a **mailbox connection** (a vetted connector with read-only scope by default). Either way, mail content is untrusted input.
- **Decided (money):** bills do not feed the task spending view. Instead a separate **Finances** module combines bills, expenses and (later) bank statements into one overview: upcoming bills, paid or open, monthly totals. Step 1: bills and manual entries from the Secretary. Step 2: import of bank statement files (CSV/OFX). Step 3 (later, opt-in): a live bank connection through a regulated provider (read-only). Nomad never moves money; payments stay with the user.
- **To decide:** retention period for documents, multiple languages, which bank-connection providers per region, and the encryption model for stored documents.

### 2h. Customizable menu and modules (decided, prototyped)
- The sidebar is configurable in Settings → "Menu & modules": show or hide and reorder items. Overview and Settings are locked on.
- Optional modules: **Coder helper** (off by default, since it is not for everyone), Secretary, Designer, Task types, and others. The Master AI can change the menu by command ("hide the secretary", "turn on the coder helper") and always offers Undo. It changes layout and menus only, never data or permissions.

### 2i. Coder helper (decided, prototyped)
- An agent for people who have app or website ideas all day. Quick capture (phone-friendly) into an idea list, then the helper analyses the idea and asks up to 7 design questions (audience, type, must-haves, out of scope, look and feel, data and privacy, technology, "done means"). Every question can be skipped ("You decide").
- Output is a ready-to-paste prompt for **Kilo Code in VS Code** (Architect then Code mode), GitHub Copilot Chat or any coding AI. The prompt includes safety rules: restate the goal, small steps on a git branch, tests, no destructive commands or installs without asking, no hard-coded secrets.
- It can use the saved Designer baseline for look and feel. It never edits code itself. Later: an optional vetted connector that opens VS Code.

### 2j. Designer agent (decided, prototyped)
- Designs visual identity, social sets, website and app layouts, and site or terrain maps. Inputs: name, tagline, mood (with colour suggestions), four colours, headline font. Includes a contrast (WCAG) check.
- **Save as baseline**: other agents (Writer, Secretary, Coder helper) follow it so identity stays consistent. SVG export. The prototype draws sketches only; a real image generator is a later vetted tool.

### 2k. Finances module (decided, prototyped)
- Separate from the AI-task spending view. Combines bills confirmed in the Secretary (open bills, overdue flag), manual entries (spent or received), and imported bank statements (CSV preview first, duplicates skipped, nothing added until confirmed). Shows spent, received, balance, open bills, spending per category and an entries list, per period (this month, last month, all time).
- Read and count only: Nomad never moves money. Later steps: OFX import, then an opt-in read-only live bank connection through a regulated provider.
- Prototype stores data in the browser; the real app stores it encrypted (see 2m).

### 2l. Curated Auto model picks (decided)
- "Auto" uses Nomad's own curated picks. The **Master AI proposes** the picks and changes to them (based on task type, price, quality and reliability), and you approve each change. Every change is logged with its reason in the Why log.

### 2m. Privacy and security baseline (decided, non-negotiable)
- **User data privacy outranks every other goal and feature.**
- All stored documents and all user information are **always encrypted** (at rest and in transit). No opt-out.
- **2FA is always required** for user access. No opt-out.
- Consequences for the design: local-first storage (cloud only by explicit opt-in), per-user encryption keys, secrets in the OS keychain, no use of user data for training, minimal data sent to model providers (and shown to the user before sending), full export and delete rights.
- To decide: 2FA methods in detail (authenticator app and passkeys first; SMS discouraged).

### 2n. Account and data recovery (decided)
- **Opt-in recovery phrase** (a 12 to 24 word phrase shown once at setup, which the user stores offline). It can unlock the data key if all devices are lost. Nomad never sees or stores it.
- **Password recovery is possible**, in two parts. (1) *Account access:* reset through a verified email plus a second factor (passkey, authenticator app or one-time backup codes). (2) *Data access:* the data key is wrapped separately for the password, for each trusted device and for the recovery phrase. A password reset re-wraps the key from a trusted device or the recovery phrase.
- **Honest limit, stated in the UI:** if a user loses the password, every trusted device and has no recovery phrase, the account can be reset but the old encrypted data cannot be read by anyone, including us. The setup flow nudges every user to save a phrase or add a second device, and the Overview shows a reminder until they do.
- Recovery attempts are logged, trigger a notification on every trusted device, and new-device access after a recovery has a waiting period (for example 24 hours) that can be cancelled by the real owner.

### 2o. Ideas module (decided, prototyped)
- A quick-capture inbox (phone first) for any thought, for example "camper ventilation roof". The AI sorts each idea and shows **how it read it**; the user can change the category.
- Four routes: (1) **Compare options**: the AI researches and reports **best quality, best budget, best do-it-yourself and best middle choice**, with sources and reasoning, plus the option families (for ventilation: electric, passive, manual). (2) **Needs a question**: ambiguous ideas ("improve 12v circuit", "buy better fishingwire") get one clarifying question with quick answers before any search. (3) **Reminder task**: small jobs ("add screenwash to van") become an Agenda task with a daily reminder until marked done. (4) **Coder helper**: app or website ideas are handed over.
- Optional per idea: show where to buy or order (shops, prices). Searching only reads. Buying or ordering always needs approval.
- Prototype note: it shows the search plan only; the real app performs the search and cites sources. The Overview "Idea box" widget saves into Ideas.
- To decide: sorting accuracy and learning from user corrections, voice capture, and how long ideas are kept.

### 2p. Phone-first (decided)
- Most screen time is on the phone, so controlling Nomad from the phone is a flagship feature: capture, approve, pause or stop, agenda, chat, budgets and finances overview.
- Order: **email-to-self first** (needs no app), then a phone app (PWA first, then React Native), with share-sheet, voice and camera capture. Push messages carry no sensitive content.
- The phone talks to Nomad Core through an end-to-end encrypted relay. For always-on use, Core can also run as a managed single-tenant cloud instance (opt-in). See [docs/TECHNICAL-DESIGN.md](docs/TECHNICAL-DESIGN.md) sections 2 and 7.

### 2q. Technical design and build plan
- Technical design (event log, risk tiers, policy engine, assistant file, keys and recovery, phone, models, connectors): [docs/TECHNICAL-DESIGN.md](docs/TECHNICAL-DESIGN.md).
- Step-by-step build plan with remaining design choices: [docs/to-do/extensive-plan.md](docs/to-do/extensive-plan.md) and one plan per step in [docs/to-do/steps/](docs/to-do/steps).

## 3. Design principles
1. **Plain language first.** No jargon: "Assistants", "Tasks", "Rules", "Activity", not "prompts", "tools", "traces". Advanced view is one click away.
2. **Nothing happens invisibly.** Every decision, tool call, cost and input is logged and explainable.
3. **Safe by default.** Least privilege, dry-run before real run, easy undo/kill switch.
4. **Verifiable.** Every run has success criteria the user can see and check.
5. **Portable & owned.** Data local by default; agents export as open files; no lock-in.
6. **Accessible & global.** WCAG 2.2 AA, i18n/RTL from day one, low-bandwidth tolerant.

## 4. Core user journeys
1. **Describe -> Build:** user states a goal in words; the app proposes an assistant (instructions, tools, schedule, rules) and explains it in plain language; user edits visually.
2. **Test -> Trust:** dry-run on sample data showing exactly what would happen; approve.
3. **Run -> Review:** schedule/trigger; results land in an inbox with Approve / Reject / Fix.
4. **Understand:** click any outcome to see a readable "why" timeline.
5. **Improve:** feedback ("don't do that again") becomes a rule or an eval case.

## 5. Key features
- **Assistant builder:** goal, knowledge, permissions, triggers (schedule, email, file, webhook, manual), templates gallery.
- **Connectors:** MCP-based marketplace (email, calendar, files, browser, spreadsheets, Slack, etc.) with permission scopes per connector.
- **Approval inbox:** risk tiers (Read / Reversible write / Irreversible or money / Public-facing); thresholds configurable per assistant.
- **Decision log ("Why panel"):** structured, human-readable reasoning summaries, alternatives considered, tools called, inputs/outputs, cost, tokens, model version. Raw trace available for experts. Note: store model-produced rationale as *explanations*, labelled as such, plus hard facts (actual calls/data) that are ground truth.
- **Verification:** success criteria checklist, automatic checks (format, schema, rules), optional second-model reviewer, sampling-based human review, regression "evals" built from past runs.
- **Cost & limits:** budgets per run/day, alerts, hard stops.
- **Memory:** inspectable, editable, deletable.
- **Audit/export:** tamper-evident log (hash-chained), export to PDF/JSON.
- **Collaboration (paid):** share assistants, roles, team audit.

## 6. Architecture (high level)
```
UI (React + TypeScript, shared)
  |-- Desktop shell (Tauri)      |-- Web (cloud)
Core service API (local daemon / cloud service, same code)
  |-- Agent runtime: planner loop, tool executor, policy engine, scheduler
  |-- Model gateway: provider adapters, retries, cost accounting, local models
  |-- MCP host: connector sandboxing, permission scopes
  |-- Policy engine: risk classification, approvals, budgets
  |-- Trace store: append-only events (SQLite local / Postgres cloud)
  |-- Secrets vault: OS keychain local / KMS cloud
  |-- Sync layer (paid): E2E-encrypted optional
```
- **Language:** TypeScript end to end (core, UI) for speed of iteration; Rust only in Tauri shell. Revisit if runtime perf demands.
- **Event-sourced runs:** every step is an immutable event; UI timelines, audit, replay and evals all derive from it.
- **Replay/Simulate:** re-run a past run with recorded tool outputs to test changed instructions.
- **Agent definition format:** versioned, human-readable YAML/JSON ("assistant file") with diff view and rollback.
- **Sandboxing:** tools run with scoped permissions; browser/code tools in isolated containers or OS sandbox.

## 7. Security & privacy
- Prompt-injection defenses: treat tool/web content as untrusted data; separate instruction vs data channels; policy engine (not the model) enforces permissions.
- Secrets never enter model context.
- Local-first; cloud is opt-in; clear data-flow diagram shown to users ("this goes to provider X").
- Threat model and external review before public launch.

## 8. Roadmap
- **Phase 0 (2-3 wks), in progress:** discovery. Research kit: [docs/PHASE0-research.md](docs/PHASE0-research.md) (screener, 45-min script, success targets). Clickable prototype: [prototype/index.html](prototype/index.html) (Master Chat, plan canvas, settings card, agenda, inbox, Why panel, tool-vetting verdicts). Still to do: 10-15 interviews, competitor teardown (Zapier, n8n, Make, Lindy, Claude/ChatGPT agents), then revise screens.
- **Phase 1 (MVP):** runtime, 2 providers + Ollama, 5 first-party connectors (web search/fetch, PDF reading, email, calendar, files; built and vetted in-house, they set the standard for third-party ones), builder, run log + Why panel, approval inbox, vetting-report flow, desktop app.
- **Phase 2:** phone beta (PWA, then app; approvals, capture, pause), verification/evals, budgets, templates gallery, cloud Core and sync.
- **Phase 3:** teams, marketplace, scheduling at scale, enterprise controls.
- **Phase 4:** i18n expansion, community ecosystem, live bank connection.

## 9. Success metrics
Time to first working automation (<10 min), % runs approved without edits, % users who open the Why panel and understand (survey), incidents of unsafe actions (target 0), weekly retention.

## 10. Open questions (to discuss next)
1. Builder paradigm: chat-first, visual flow canvas, form/wizard, or hybrid?
2. How to present reasoning honestly (model self-explanations are not always faithful)?
3. Connector strategy: curated vs open MCP; trust/vetting of third-party connectors.
4. Cloud + local: where do assistants run when the laptop is asleep?
5. Name/brand: "NomadNetOps" scope and positioning.
6. Compliance targets (GDPR, SOC2) and EU AI Act transparency obligations.
7. Tech stack confirmation (TypeScript/Tauri/React).
