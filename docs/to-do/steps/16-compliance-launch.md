# Step 16: Compliance, threat model, launch

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 16 (Compliance, threat model, launch) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/16-compliance-launch.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents). Legal conclusions need a human lawyer; flag them, do not decide them.
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-16-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** be safe and lawful before real users trust us with their data.

## Tasks
1. Threat model (STRIDE) for Core, relay, phone, cloud, connectors, and the Master AI.
2. External security review and penetration test; fix and retest.
3. GDPR: data map, lawful basis, DPIA, data subject rights (export, delete), processor agreements with model providers, privacy policy in plain language.
4. EU AI Act: transparency notices, human oversight evidence (our approvals and log), risk classification of each module (Secretary legal letters and Finances need care).
5. SOC 2 preparation before team features.
6. Accessibility audit (WCAG 2.2 AA).
7. Beta programme, support process, incident response and status page.
8. Launch checklist, pricing page, docs and tutorials for non-coders.
9. Bug bounty after launch.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| Certifications | GDPR only, plus ISO 27001, SOC 2 | GDPR first; SOC 2 before teams; ISO 27001 later |
| Legal disclaimers | Light, strong | Strong for legal and health content |
| Launch region | Global, EU first | EU first, then wider |

## Dependencies
All previous steps.

## Acceptance
- No open critical or high findings. Legal review done. Beta users can export and delete all data.
