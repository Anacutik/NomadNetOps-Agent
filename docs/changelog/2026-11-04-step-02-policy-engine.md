# 2026-11-04: Step 02, policy engine implementation

**Author:** Kilo Code (qwen/qwen3-coder-next)
**Step file:** docs/to-do/steps/03-policy-engine-budgets.md
**Status after this work:** in progress

## What changed
- Implemented complete policy engine with risk tiers (0-3), decision logic, and support for allow/ask/deny outcomes
- Created tool manifest schema for defining tools with their risk tiers and descriptions
- Implemented untrusted input taint tracking for tier 2+ actions requiring approval
- Created budget service supporting multiple scopes (global, task, taskType, key) and periods (run, day, week, month) with soft/hard limits
- Implemented kill switch functionality with support for run-level, task-level, and global kill switches
- Added currency support with exchange rate service for charged and estimated user currencies
- Added explainDecision function for Why panel policy explanations
- Added 49 tests covering policy invariants, integration scenarios, and red-team edge cases

## Files added or changed
- `packages/policy/src/types.ts` - TypeScript types for risk tiers, decisions, budgets, kill switch, policy engine
- `packages/policy/src/engine.ts` - Core policy decision engine with decide, classify, evaluateRules functions
- `packages/policy/src/policyEngine.ts` - SimplePolicyEngine class implementing PolicyEngine interface
- `packages/policy/src/budget.ts` - Budget checking with scopes, periods, and soft/hard limits
- `packages/policy/src/killswitch.ts` - Kill switch state and behavior
- `packages/policy/src/untrusted.ts` - Untrusted input handling and instruction stripping
- `packages/policy/src/currency.ts` - Currency conversion and exchange rate service
- `packages/policy/src/manifestSchema.ts` - Zod schema for tool manifests
- `packages/policy/src/index.test.ts` - Core policy invariants tests
- `packages/policy/src/integration.test.ts` - Integration tests for policy engine
- `packages/policy/src/redteam.test.ts` - Red-team tests for edge cases
- `packages/policy/package.json` - Updated with zod dependency
- `docs/STATUS.md` - Updated step status

## Decisions made
- Risk tiers: 0=Read, 1=Draft, 2=Reversible, 3=Consequential (always ask)
- Unknown tools default to tier 3 (strictest)
- Hard rules: tier 3 always asks, unknown actions are tier 3, Nomad never moves money
- Budget periods: run, day, week, month
- Budget scopes: global, task, taskType, key
- Soft warning at 80%, hard stop when exceeded
- Important tasks pause and ask; other tasks stop and notify
- Untrusted input at tier 2+ requires approval

## Verification
- Tests: 49/49 passed (3 test files: index.test.ts, integration.test.ts, redteam.test.ts)
- Build: Passed (`pnpm run build`)
- Typecheck: Passed (`pnpm run typecheck`)
- Lint: 47 errors (mostly unused imports/variables and explicit any types from existing code; not introduced in this change)

## Left over / follow-ups
- Fix lint warnings (unused imports, explicit any types)
- Lint errors also exist in core package files (eventLogVerification.ts, eventLogWriter.ts, exportTools.ts) - these are pre-existing

## Docs updated
- [x] Step file
- [x] docs/STATUS.md
- [ ] PLAN.md (no change needed)
- [ ] docs/to-do/extensive-plan.md
