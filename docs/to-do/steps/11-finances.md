# Step 11: Finances

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 11 (Finances) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/11-finances.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents). Nomad never moves money.
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-11-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** one honest overview of bills, spending and income, separate from AI task costs.

## Scope
Entries, bills, categories, periods, CSV and OFX import, later a read-only bank connection.

## Phases
1. **Bills and manual entries** (prototyped): confirmed bills, manual spent or received, categories, periods.
2. **Statement import**: CSV and OFX, preview, duplicate detection, mapping of columns, rules for categories.
3. **Live bank connection (opt-in, read-only)**: regulated provider; real-time tracking; reconcile bills with payments automatically (propose, user confirms).

## Tasks
1. Data model: entries, bills, categories, rules, accounts; multi-currency with the date's rate.
2. Category rules and learning from user corrections.
3. Reconciliation: match a bank payment to a bill and propose "mark as paid".
4. Overview: spent, received, balance, open and overdue bills, trends, budgets per category.
5. Alerts: bill due, unusual charge, budget category over.
6. Export (CSV and PDF) for taxes.
7. Phase 3: provider selection per region, consent flow, revocation, token vault.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| Bank providers | Aggregators by region (for example PSD2 providers in the EU) | Pick per region in phase 3; start with EU |
| Multi-currency | Single, per-entry | Per-entry with the date's rate |
| Savings goals | Out of scope, later | Later |
| Tax features | None, export only | Export only; no tax advice |

## Rules
Nomad only reads and counts. It never initiates payments or transfers.

## Dependencies
Step 10.

## Acceptance
- Import a statement of 200 lines in under 5 seconds with correct duplicate handling. Balances equal the source totals.
