# 2026-11-02: Step 00, monorepo scaffold and research

**Author:** GitHub Copilot
**Step file:** docs/to-do/steps/00-foundations.md
**Status after this work:** in progress

## What changed
- pnpm monorepo with `@nomad/policy` (4 tests), placeholder `@nomad/core` and `@nomad/crypto`.
- Four ADRs, ESLint, CI workflow file, AI working rules, status and changelog folders.
- Competitor teardown first pass.

## Files added or changed
- `package.json`, `pnpm-workspace.yaml` (`allowBuilds` for esbuild), `turbo.json`, `tsconfig.base.json`, `eslint.config.mjs`
- `.github/workflows/ci.yml`, `packages/*`, `docs/adr/*`, `docs/research/competitor-teardown.md`
- `docs/AI-WORKFLOW.md`, `docs/STATUS.md`, `docs/changelog/*`

## Decisions made
- pnpm 12 needs `allowBuilds` (not `onlyBuiltDependencies`) to clear `ERR_PNPM_IGNORED_BUILDS`.

## Verification
- `pnpm install` exit 0; `pnpm lint`, `pnpm test` pass.

## Left over / follow-ups
- Playwright, prototype move to `apps/prototype`, extend `PHASE0-research.md`, move CI file to git root, name and licence decisions.

## Docs updated
- [x] Step file
- [x] docs/STATUS.md
- [x] PLAN.md (no change needed)
- [x] docs/to-do/extensive-plan.md (no change needed)
