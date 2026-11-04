# Step 01: Event log and data layer

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 01 (Event log and data layer) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/01-event-log-data-layer.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents).
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-01-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** an append-only, hash-chained event log and the core tables, so everything else can be built on facts.

## Scope
Event envelope, hash chain, tables from section 3 of the technical design, blob store, export and verify tools. **Every record and event carries a `space_id`** (private and shared spaces, see technical design 15.1).

## Tasks
1. Define the event schema and types in `packages/core` with runtime validation (Zod).
2. Implement append-only writer with `prev_hash` and `hash` (canonical JSON, SHA-256).
3. Implement `verifyChain()` and a CLI `nomad verify`.
4. SQLite schema and migrations; repository layer; blob store for large payloads.
5. Projections: runs, approvals, costs derived from events.
6. Export to JSON and PDF; delete-everything flow (calls step 02 key destruction).
7. Tests: tamper detection, concurrent writes, projection rebuild.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| Hash anchoring | Local only, second device, public timestamp | Second device (step 08) |
| Payload format | JSON, CBOR | JSON, simple to inspect |
| Projections | Rebuild on demand, materialised | Materialised, rebuildable |
| Schema evolution | Upcasters, versioned types | Versioned types plus upcasters |

## Dependencies
Step 00.

## Acceptance
- Altering any stored event makes `verify` fail. Projections rebuild identically from events. Export round trip passes.

## Phone note
Event sync format must be defined here so step 08 does not need a rewrite.
