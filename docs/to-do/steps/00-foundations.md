# Step 00: Foundations

**Status:** in progress

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 00 (Foundations) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/00-foundations.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents).
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-00-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** a repo, tooling and agreed decisions so building can start safely.

## Scope
- Monorepo, CI, coding standards, decision records.
- Competitor teardown and user interviews to validate the design.
- Name, licence and open-source boundary.

## Tasks
1. Create a pnpm + Turborepo monorepo: `packages/core`, `packages/policy`, `packages/crypto`, `packages/ui`, `apps/desktop`, `apps/phone`, `apps/relay`.
2. TypeScript strict, ESLint, Prettier, Vitest, Playwright; CI with tests, type-check, dependency audit and secret scanning.
3. Architecture Decision Records (ADR) folder; write ADRs for each decided item in [TECHNICAL-DESIGN.md](../../TECHNICAL-DESIGN.md).
4. Competitor teardown (Zapier, n8n, Make, Lindy, ChatGPT and Claude agents): approvals, logs, privacy, phone control, price. **Done first pass:** [competitor-teardown.md](../../research/competitor-teardown.md). Make and OpenAI pages could not be fetched, so verify those manually.
5. Run 10 to 15 interviews with the Phase 0 kit, extended for new modules.
6. Choose licence and the open/closed boundary.
7. Move the prototype to `apps/prototype` as the visual reference.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| Monorepo tool | pnpm + Turborepo, Nx | pnpm + Turborepo (simple) |
| Name | NomadNetOps or new | Test 3 names in interviews |
| Licence | Apache-2.0 core, AGPL, source-available | Apache-2.0 for runtime and policy; closed cloud and teams |

## Acceptance
- CI green on an empty skeleton. ADRs written. Teardown and interview summary stored in `docs/research/`.

## Risks
- Spending too long on research. Time-box to 3 weeks.
