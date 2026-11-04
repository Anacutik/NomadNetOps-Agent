# Step 12: Ideas

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 12 (Ideas) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/12-ideas.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents). Use the working Ideas view in prototype/index.html (#notes) as the behaviour reference.
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-12-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** write any thought on the phone in a few words; Nomad sorts it and works it out with options.

## Scope
Capture, sorting, clarifying questions, option research (best quality, best budget, best DIY, best middle), reminder tasks, buy or order options, handoff to the Coder helper.

## Tasks
1. Capture channels: email-to-self (first), phone app, share-sheet, voice, widget.
2. Sorting model: classify into compare options, needs a question, reminder task, coder, and "just keep"; always show how it was read; user can change it; learn from corrections.
3. Clarifying questions: generate 1 to 3 quick-answer questions from the idea (for example "improve 12v circuit": engine, car battery, leisure battery, solar panel).
4. Research runs: search the web through first-party connectors, collect candidates, score on quality, price, DIY difficulty and fit; produce the four picks with sources and reasons.
5. Reminder tasks: agenda item with daily reminders until done; snooze, done, convert to compare.
6. Buy or order: where to buy; compare shops and prices; any order is tier 3 and needs approval.
7. Projects: group related ideas (for example "camper") with shared notes and budget.
8. Review mode: weekly "what to do with these ideas" digest.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| Shopping links | Plain links, affiliate | Plain links; any affiliate model must be disclosed and opt-in |
| Source quality | Any web, trusted list | Prefer primary sources and show the source type |
| Geographic shops | Country setting, location | Country setting; location only on request |
| Idea retention | Forever, auto-archive | Auto-archive after 90 days of no activity, user-editable |
| Research depth | Quick, deep | Quick by default, "go deeper" on request (costs shown) |

## Dependencies
Steps 05, 08.

## Acceptance
- The five owner examples (ventilation, 12v circuit, screenwash, rainwater tanks, fishing line) behave as described in PLAN.md section 2o with sources shown.
