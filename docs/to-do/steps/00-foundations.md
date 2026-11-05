# Step 00: Foundations

**Status:** done

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
1. Create a pnpm + Turborepo monorepo: `packages/core`, `packages/policy`, `packages/crypto`, `packages/ui`, `apps/desktop`, `apps/phone`, `apps/relay`. (done)
2. TypeScript strict, ESLint, Prettier, Vitest, Playwright; CI with tests, type-check, dependency audit and secret scanning. (done - CI workflow created, all tools configured, tests passing)
3. Architecture Decision Records (ADR) folder; write ADRs for each decided item in [TECHNICAL-DESIGN.md](../../TECHNICAL-DESIGN.md). (done - 4 ADRs created and accepted)
4. Competitor teardown (Zapier, n8n, Make, Lindy, ChatGPT and Claude agents): approvals, logs, privacy, phone control, price. **Done first pass:** [competitor-teardown.md](../../research/competitor-teardown.md). Make and OpenAI pages could not be fetched, so verify those manually. (done)
5. Run 10 to 15 interviews with the Phase 0 kit, extended for new modules. (pending - needs user participation; not blocking for MVP)
6. Choose licence and the open/closed boundary. (done - Apache-2.0 for runtime/policy, closed cloud/teams)
7. Move the prototype to `apps/prototype` as the visual reference. (done)

## Remaining design choices
None remaining. NomadNetOps name and Apache-2.0 open-core licence confirmed.

## Acceptance
- CI green on an empty skeleton. ADRs written. Teardown stored in `docs/research/`. PHASE0 research extended for new modules.
- Name and licence confirmed.
- **Pending:** User interviews (10-15) - not blocking for MVP, can be done later for validation.

## Risks
- Spending too long on research. Time-box to 3 weeks.
