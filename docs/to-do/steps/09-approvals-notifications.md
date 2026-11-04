# Step 09: Approval inbox, notifications, paused tasks

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 09 (Approval inbox, notifications, paused tasks) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/09-approvals-notifications.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents). Paused tasks: try to reach the user on all channels, wait 12 hours, then abort with a report (time, reason, logic, consequences).
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-09-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** make human approval fast, clear and safe on every device.

## Scope
Approval inbox, plain-language approval cards, notification routing, the 12-hour pause policy, abort report.

## Tasks
1. Approval card: what, why, risk tier, cost, data involved, source of any untrusted input, undo info.
2. Actions: approve, reject, change then approve, ask the Master AI why.
3. Notification routing: push and email together; escalation if no reply.
4. Paused tasks: wait 12 hours, then abort and write a report (time, reason, logic, consequences).
5. Important-task budget pause: ask for a decision when a limit is reached.
6. Batch approval for low-risk repeats with a clear scope, never for tier 3.
7. Do-not-disturb hours that delay notices but never auto-approve.
8. Accessibility and a plain "what happens if I do nothing" line on every card.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| Delegation (partner approves) | None, trusted contacts | Later; requires 2FA for the delegate |
| Escalation | Repeat push, email, SMS | Push then email; no SMS |
| Standing approvals | Never, time-limited | Time-limited and scoped, never for tier 3 money or deletion |

## Dependencies
Steps 03, 08.

## Acceptance
- A paused test task aborts after 12 hours with a correct report. No path approves automatically.
