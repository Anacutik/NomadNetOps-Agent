# Step 03: Policy engine, risk tiers, budgets

**Status:** done

## Summary
Step 03 continues the work from Step 02. The policy engine is implemented but had remaining lint errors that needed to be fixed.

## Tasks
1. Tool manifest schema with risk tier per tool and argument rules. ✅ done
2. Rule engine (pure functions, no model calls) returning `allow | ask | deny` plus rule id and reason. ✅ done
3. Hard rules that cannot be configured away: tier 3 always asks; unknown actions are tier 3; Nomad never pays. ✅ done
4. Untrusted-input taint tracking: actions derived from untrusted content at tier 2 or higher need approval. ✅ done
5. Budget service: scopes (global, task type, key), periods (run, day, week, month), soft 80% warning, hard stop. ✅ done
6. Important-task behaviour at the limit: pause and ask; otherwise stop and notify. ✅ done
7. Currency: charged currency plus an estimated user currency. ✅ done
8. Kill switch: stop a run, a task or everything. ✅ done
9. Policy explanation text (plain language) for the Why panel. ✅ done
10. Property-based tests and a red-team test pack. ✅ done (49 tests)

## Work done in this step
- Fixed all lint errors in policy package (unused imports/variables, explicit any types)
- Removed duplicate `packages/policy/src/policyEngine.ts` file (code moved to `engine.ts`)
- Added `BudgetCheckResult` type to `types.ts` for proper typing in `checkBudgets`
- Fixed `explain` function reference in `SimplePolicyEngine.explain`
- Removed redundant import in `redteam.test.ts`

## Finalization (2026-11-05)
- Fixed remaining lint errors so `pnpm lint` passes repo-wide: removed unused import in `redteam.test.ts`, unused `_context` params covered by a new `argsIgnorePattern: "^_"` rule in `eslint.config.mjs`, and pre-existing unused imports/vars in `packages/core` (`eventLogVerification.ts`, `eventLogWriter.ts`, `exportTools.ts`), plus added `cause` to the JSON parse error in `exportTools.ts`.

## Verification
- Tests: 49/49 passed
- Build: Passed (`pnpm run build`)
- Typecheck: Passed (`pnpm run typecheck`)
- Lint: Passed repo-wide (`pnpm lint`), including previously pre-existing core package errors (fixed 2026-11-05)

## Left over / follow-ups
- None for policy package

## Docs updated
- [x] Step file (Status updated to done)
- [x] docs/STATUS.md (Step 03 marked done with update date)
- [ ] PLAN.md (no change needed)
- [ ] docs/to-do/extensive-plan.md (no change needed)

## Open questions
None
