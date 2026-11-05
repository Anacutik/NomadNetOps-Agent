# 2026-11-04: Step 00, name and licence confirmed

**Author:** Kilo Code (qwen/qwen3-coder-next)
**Step file:** docs/to-do/steps/00-foundations.md
**Status after this work:** done

## What changed
- Name confirmed as **NomadNetOps** (user owns domain nomadnetops.com and uses it as umbrella for app projects).
- Licence confirmed as **Apache-2.0 for runtime/policy; closed cloud/teams** (open-core model per PLAN.md section 4).
- Created LICENSE and LICENSE.md files documenting the open/closed boundary.
- Updated step file and STATUS.md to mark step 00 as complete.
- Updated extensive-plan.md to reflect completed design choices.

## Files added or changed
- `LICENSE` (new - Apache 2.0 text)
- `LICENSE.md` (new - with open/closed boundary documentation)
- `docs/STATUS.md` (updated - step 00 status to "done")
- `docs/to-do/steps/00-foundations.md` (updated - mark tasks done)
- `docs/to-do/extensive-plan.md` (updated - mark completed design choices)
- `docs/PHASE0-research.md` (extended - new modules tests)
- `.github/workflows/ci.yml` (updated - CI jobs)

## Decisions made
- **NomadNetOps** name confirmed by user (domain nomadnetops.com owned and used as umbrella).
- **Apache-2.0 open-core** licence confirmed per recommendation:
  - Open source: runtime, policy engine, crypto, UI, desktop/phone shells, relay
  - Closed: cloud hosting, team features, billing, analytics
- User interviews (10-15) deferred as non-blocking for MVP; can be done later for validation.
- PHASE0 research kit extended to test Secretary, Finances, Ideas, Coder helper, and Designer modules.
- CI workflow updated with separate jobs for test, typecheck, lint, e2e, secret scan, and dependency audit.

## Verification
- `pnpm install` exit 0
- `pnpm lint` exit 0
- `pnpm typecheck` exit 0
- `pnpm test` exit 0 (4 policy tests, 4 other packages pass with no tests)
- `pnpm test:e2e` exit 0 (1 prototype test passed)
- `pnpm build` exit 0 (all 8 packages build successfully)

## Left over / follow-ups
- User interviews (10-15) - deferred for later validation phase.
- Make and OpenAI competitor pages still need manual verification.
- CI workflow file at `.github/workflows/ci.yml` (in root, GitHub Actions will run it).

## Docs updated
- [x] Step file
- [x] docs/STATUS.md
- [x] PLAN.md (no change needed)
- [x] docs/to-do/extensive-plan.md

## Step 00 completion checklist
- [x] Monorepo structure with pnpm + Turborepo
- [x] TypeScript strict, ESLint, Prettier, Vitest configured
- [x] CI workflow with tests, type-check, lint, e2e, secret scan, dependency audit
- [x] 4 ADRs for core decisions (privacy, policy engine, spaces, phone-first)
- [x] Competitor teardown first pass complete
- [x] Prototype moved to apps/prototype
- [x] PHASE0 research extended for new modules
- [x] Name confirmed: NomadNetOps
- [x] Licence confirmed: Apache-2.0 open-core (runtime/policy open, cloud/teams closed)
- [x] LICENSE files created
- [x] All packages build and pass lint/typecheck/tests
- [x] Step file and STATUS.md updated
