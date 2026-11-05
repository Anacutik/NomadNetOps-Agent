# Step 03: Policy engine, risk tiers, budgets

**Status:** in progress

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

## Verification
- Tests: 49/49 passed
- Build: Passed (`pnpm run build`)
- Typecheck: Passed (`pnpm run typecheck`)
- Lint: All policy package errors fixed (core package has pre-existing errors in other files)

## Left over / follow-ups
- None for policy package

## Docs updated
- [x] Step file (Status updated to in progress)
- [x] docs/STATUS.md (Step 03 marked in progress with update date)
- [ ] PLAN.md (no change needed)
- [ ] docs/to-do/extensive-plan.md

## Open questions
None
