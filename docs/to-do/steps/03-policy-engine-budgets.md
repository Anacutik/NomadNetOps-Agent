# Step 03: Policy engine, risk tiers, budgets

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 03 (Policy engine, risk tiers, budgets) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/03-policy-engine-budgets.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents). Build on the existing packages/policy code.
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-03-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** a deterministic gatekeeper that decides allow, ask or deny before every action.

## Scope
Risk tiers 0 to 3, rule evaluation, permissions, untrusted-input rule, budgets (scope and period), important-task behaviour, kill switch.

## Tasks
1. Tool manifest schema with risk tier per tool and argument rules.
2. Rule engine (pure functions, no model calls) returning `allow | ask | deny` plus rule id and reason.
3. Hard rules that cannot be configured away: tier 3 always asks; unknown actions are tier 3; Nomad never pays.
4. Untrusted-input taint tracking: actions derived from untrusted content at tier 2 or higher need approval.
5. Budget service: scopes (global, task, task type, key), periods (run, day, week, month), soft 80% warning, hard stop.
6. Important-task behaviour at the limit: pause and ask; otherwise stop and notify.
7. Currency: charged currency plus an estimated user currency.
8. Kill switch: stop a run, a task or everything.
9. Policy explanation text (plain language) for the Why panel.
10. Property-based tests and a red-team test pack.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| Rule language | Code only, small declarative DSL | Typed code first, DSL later |
| Time zones for periods | UTC, user local | User local, shown clearly |
| Exchange rates | Daily rate from a public source, user-set | Daily rate, labelled as estimate |
| Approval expiry | 12h (Decided for paused tasks), per-action | 12h default, shorter for risky actions |

## Dependencies
Step 01.

## Acceptance
- No code path executes a tool without a `policy.decided` event. Fuzz tests cannot make a tier 3 action run without an approval.

## Phone note
Approvals and kill switch must be reachable in two taps on the phone.
