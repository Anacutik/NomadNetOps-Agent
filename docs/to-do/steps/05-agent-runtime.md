# Step 05: Agent runtime and assistant file

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 05 (Agent runtime and assistant file) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/05-agent-runtime.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents).
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-05-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** run assistants from a versioned file, with every step logged and gated.

## Scope
Assistant file format, planner loop, tool executor, scheduler, verifier hooks, replay, character settings.

## Tasks
1. Assistant file schema (see technical design section 5), validation, versioning, diff and rollback.
2. Planner loop with step budget and stop conditions.
3. Tool executor calling the policy engine before every call.
4. Scheduler: cron-like, event triggers (email, file, webhook), runs while the app is closed where Core runs (see step 15).
5. Character settings for the Master AI (tone, detail) and per assistant.
6. Master AI: creates assistants from plain words, explains them, proposes layout and menu changes (layout and menus only, never data or permissions), offers Undo.
7. Task types: the five categories and sub-categories from the product owner's list.
8. Dry-run mode: show what would happen without side effects.
9. Replay with recorded tool outputs.
10. Paused and aborted flow with the 12-hour wait and the abort report.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| Planner style | Single loop, planner plus executor, graph | Planner plus executor with a step budget |
| Memory | None, per-assistant notes, shared | Per-assistant inspectable notes, user-editable |
| File format | YAML, JSON | YAML for humans, JSON schema for validation |
| Multi-agent | Single agent per task, teams of agents | Single agent per task first |

## Dependencies
Steps 03, 04.

## Acceptance
- A read-only assistant runs on schedule with full event trail; dry-run produces no side effects; replay reproduces the same decisions.
