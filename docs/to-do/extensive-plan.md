# Extensive plan: what to build, in order

Source of truth for design: [PLAN.md](../../PLAN.md) and [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md). Current build state: [STATUS.md](../STATUS.md). Each step below has its own plan in [steps/](steps/). Each step plan lists scope, tasks, remaining design choices (with a recommendation), dependencies and acceptance criteria.

## How to read this

- **Working one step at a time with an AI (Kilo Code etc.):** open a step file and copy its "Prompt for Kilo Code" block. Rules for every AI are in [AI-WORKFLOW.md](../AI-WORKFLOW.md). Progress is tracked in [STATUS.md](../STATUS.md) and each piece of work leaves an entry in [changelog/](../changelog/). Every step file also has a `Status` line; keep it in sync with the table below when a step changes.

- **Phone-first** is a hard requirement: every step that has a user-facing flow must say how it works on the phone.
- **Privacy first**: no step is done until its data is encrypted and its access is behind 2FA.
- **Approval rule**: no step may add an action in risk tier 3 that skips approval.

## Order and dependencies

| # | Step | Plan | Depends on | Size |
|---|---|---|---|---|
| 00 | Foundations: repo, tooling, decisions, research | [00](steps/00-foundations.md) | none | S |
| 01 | Event log and data layer | [01](steps/01-event-log-data-layer.md) | 00 | M |
| 02 | Security: keys, encryption, 2FA, recovery | [02](steps/02-security-keys-2fa-recovery.md) | 01 | L |
| 03 | Policy engine, risk tiers, budgets | [03](steps/03-policy-engine-budgets.md) | 01 | M |
| 04 | Model gateway, keys, Auto picks | [04](steps/04-model-gateway.md) | 02, 03 | L |
| 05 | Agent runtime and assistant file | [05](steps/05-agent-runtime.md) | 03, 04 | L |
| 06 | Connectors (MCP) and vetting | [06](steps/06-connectors-vetting.md) | 03, 05 | L |
| 07 | Desktop app: port the prototype | [07](steps/07-desktop-app.md) | 01-05 | L |
| 08 | Phone app, relay and sync | [08](steps/08-phone-relay-sync.md) | 02, 07 | XL |
| 09 | Approval inbox, notifications, paused tasks | [09](steps/09-approvals-notifications.md) | 03, 08 | M |
| 10 | Secretary and mail intake | [10](steps/10-secretary.md) | 06, 09 | L |
| 11 | Finances | [11](steps/11-finances.md) | 10 | M |
| 12 | Ideas | [12](steps/12-ideas.md) | 05, 08 | M |
| 13 | Coder helper and Designer | [13](steps/13-coder-designer.md) | 05 | M |
| 14 | Verification, evals and Why panel | [14](steps/14-verification-why-panel.md) | 05 | L |
| 15 | Cloud Core, accounts, billing | [15](steps/15-cloud-accounts-billing.md) | 02, 08 | XL |
| 16 | Compliance, threat model, launch | [16](steps/16-compliance-launch.md) | all | L |

Size: S under 2 weeks, M 2 to 4, L 4 to 8, XL 8 or more (one small team).

## Milestones

1. **M1: Walking skeleton (steps 00 to 05):** one assistant runs a read-only task with a logged, hash-chained trail, encrypted storage, budgets and approvals enforced by the policy engine. Command line or minimal UI.
2. **M2: Desktop alpha (07, 06 first-party, 14 basics):** non-coders can create a task, see the Why panel, approve actions.
3. **M3: Phone beta (08, 09, 12):** capture ideas, approve and pause from the phone. Email-to-self capture.
4. **M4: Modules (10, 11, 13):** Secretary, Finances, Coder helper, Designer.
5. **M5: Cloud and launch (15, 16).**

## Cross-cutting design choices still open

| Topic | Options | Recommend | Decide at |
|---|---|---|---|
| Product name and brand | Keep NomadNetOps, or rename | Test with users in step 00 | 00 |
| Pricing | Free tier + subscription, usage-based, one-time desktop licence | Free local use with BYO keys, paid for cloud Core, sync and teams | 15 |
| Open-source scope | Open-core, fully open | Open runtime, policy engine, relay and connectors; closed cloud and teams features | 00 |
| Languages | English first, then Dutch and others | i18n from day one, English and Dutch first | 07 |
| Document retention | User-defined, default 7 years for bills and letters, 1 year for others | Per-type default, always user-editable | 10 |
| Official-letter analysis | Generic, per-country packs | Generic first, then country packs (NL, then EU) | 10 |
| Bank connection providers | Per region aggregators | Decide at step 11 phase 3 | 11 |
| Compliance targets | GDPR, EU AI Act, SOC 2 | GDPR from day one, EU AI Act transparency, SOC 2 before teams | 16 |

## Research tasks that run alongside

- Competitor teardown: Zapier, n8n, Make, Lindy, ChatGPT and Claude agents (focus: transparency, approvals, privacy, phone control). Part of step 00.
- 10 to 15 user interviews using [PHASE0-research.md](../PHASE0-research.md); extend the kit with tasks for categories, abort report, Secretary, Ideas, Coder helper, Designer, Finances and the phone.
