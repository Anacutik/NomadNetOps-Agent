# 2026-11-04: Step 00, CI workflow and PHASE0 extension

**Author:** Kilo Code (qwen/qwen3-coder-next)
**Step file:** docs/to-do/steps/00-foundations.md
**Status after this work:** in progress

## What changed
- Created CI workflow file at `.github/workflows/ci.yml` with tests, type-check, lint, e2e, secret scan, and dependency audit jobs.
- Extended PHASE0 research kit to include Secretary, Finances, Ideas, Coder helper, and Designer modules.
- Updated step file with completed tasks and status.

## Files added or changed
- `.github/workflows/ci.yml` (new)
- `docs/PHASE0-research.md` (extended)
- `docs/STATUS.md` (updated)
- `docs/to-do/steps/00-foundations.md` (updated)

## Decisions made
- CI workflow uses pnpm 12 and Node 22 to match project requirements.
- PHASE0 research now tests 10 tasks covering all 5 modules (Secretary, Finances, Ideas, Coder, Designer) in addition to the original 5.
- Added module adoption metrics to PHASE0 targets (what % of users actually use each new module).
- Recommendations: Already using NomadNetOps name and Apache-2.0 licence in codebase; user should confirm or decide otherwise.

## Verification
- `pnpm install` exit 0
- `pnpm lint` exit 0
- `pnpm typecheck` exit 0
- `pnpm test` exit 0 (4 policy tests, 4 other packages pass with no tests)
- `pnpm test:e2e` exit 0 (1 prototype test passed)
- `pnpm build` exit 0 (all 8 packages build successfully)

## Left over / follow-ups
- User interviews (10-15) need to be scheduled and conducted.
- Name and licence confirmation: currently using NomadNetOps/Apache-2.0 in codebase, but user should formally confirm or choose alternatives.
- Move CI workflow file from docs folder to git root `.github/workflows/` (needs to be in root for GitHub Actions to run).
- Make and OpenAI competitor pages still need manual verification.

## Docs updated
- [x] Step file
- [x] docs/STATUS.md
- [x] PLAN.md (no change needed)
- [x] docs/to-do/extensive-plan.md (no change needed)
