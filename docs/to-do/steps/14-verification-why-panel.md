# Step 14: Verification, evals and Why panel

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 14 (Verification, evals and Why panel) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/14-verification-why-panel.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents). Keep facts and explanations separate (the event "kind" field).
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-14-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** let users check results and understand every AI choice honestly.

## Scope
Success criteria, automatic checks, second-model review, sampling, regression evals, Why log, honest labelling of explanations.

## Tasks
1. Success-criteria editor in plain language; map to checks.
2. Automatic checks: format, schema, rules, numbers recomputed by code.
3. Optional second-model reviewer with a different model.
4. Sampling: send a percentage of runs to human review.
5. Evals from past runs: "don't do that again" becomes a rule or a test case; run on assistant changes.
6. Why panel: timeline of facts and explanations, labelled as such; alternatives considered; cost and tokens; model version.
7. Expert view: raw events with filtering and export.
8. Phone-friendly Why view.
9. Report generation (PDF and JSON) for audits.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| Explanation honesty | Show model reasoning, show summaries, both | Show facts as ground truth; show model rationale as labelled explanations |
| Reviewer model | Same, different | Different from the worker |
| Eval cost | Always, on change only | On change and weekly sampling |

## Dependencies
Step 05.

## Acceptance
- A user can answer "why did it do that" from the Why panel for any sample run. Regression evals fail when a rule is broken.
