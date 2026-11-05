# Step 07: Desktop app (port the prototype)

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 07 (Desktop app, port the prototype) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/07-desktop-app.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents). Use the clickable prototype in prototype/index.html as the visual reference.
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-07-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** turn the clickable prototype into the real React and Tauri app on top of Core.

## Scope
Three-column layout, adjustable overview widgets, sidebar and module settings, Master AI panel, Settings, agents library, task detail and builder, agenda, Why log, tools.

## Tasks
1. Design system: tokens from the prototype, accessible components (WCAG 2.2 AA), i18n (English, Dutch) with RTL support.
2. Shell: Tauri app, Core as a local daemon, lock screen with 2FA.
3. Port views: Overview widgets, Agents, Agenda, Activity, Why log, Tools, Settings (Master AI, models, library, tasks, menu and modules).
4. Builder boxes with user-adjustable layout; locked Approval box.
5. Master AI layout and menu intents with Undo.
6. Model library UI: live OpenRouter catalogue, details and current prices, favourites to the top, filters; never display a hard-coded model count.
7. Responsive layout shared with the phone web view (see step 08).
8. Usability tests with non-coders; fix the top 10 issues.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| UI state | Redux, Zustand, signals | Zustand plus event-derived queries |
| Component base | Radix, custom | Radix primitives with our tokens |
| Layout persistence | Local, synced | Synced (encrypted) so phone and desktop agree, with per-device overrides |
| Plain-language copy | Written by us, AI-assisted | Written by us, reviewed with users |

## Dependencies
Steps 01 to 05 (use mocks for the rest).

## Acceptance
- A new user creates, runs and approves a task in under 10 minutes. Keyboard and screen-reader pass.
