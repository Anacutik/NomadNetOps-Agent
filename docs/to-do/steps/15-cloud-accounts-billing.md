# Step 15: Cloud Core, accounts, billing

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 15 (Cloud Core, accounts, billing) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/15-cloud-accounts-billing.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents). Managed cloud is opt-in and the cloud Core only gets a scoped, revocable session key.
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-15-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** an always-on option so the phone works anywhere, without giving up privacy.

## Scope
Single-tenant managed Core, account and identity service, session-key access, billing, teams later.

## Tasks
1. Single-tenant Core instances (containers) with isolated storage and network.
2. Identity service: email verification, 2FA enforcement, device registry. It holds no data keys.
3. Session key flow: trusted device grants a revocable, in-memory key to the instance; show exactly what the cloud can access; one-click revoke.
4. Backup and restore with encrypted snapshots.
5. Billing: plans, usage, invoices; no card data stored by us.
6. Data residency options (EU region first).
7. Monitoring without content; incident response plan.
8. Team features later: roles, shared assistants, team audit.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| Hosting | Own cloud, hyperscaler regions | EU-based provider first for GDPR comfort |
| Isolation | Containers, microVMs | microVMs for strong isolation |
| Pricing | Free local plus paid cloud, usage-based | Free local with BYO keys; paid cloud Core and sync |
| Self-host | Supported, not | Supported via the same images |

## Dependencies
Steps 02, 08.

## Acceptance
- The host cannot read user data at rest (tested). Revoking a session key stops the instance from reading data. Restoring from backup works on a clean account.
