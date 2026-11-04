# Step 06: Connectors (MCP) and vetting

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 06 (Connectors (MCP) and vetting) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/06-connectors-vetting.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents). Third-party tools and updates are always vetted by the Master AI, with a report to the user on whether to install.
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-06-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** safe tools, and a Master AI vetting flow for every third-party tool and update.

## Scope
MCP host, manifests, sandboxing, first-party connectors, vetting pipeline and report.

## Tasks
1. MCP host with per-connector process isolation and network allow-lists.
2. Manifest format: tools, risk tier per tool, scopes, domains, publisher, signature.
3. First-party connectors: web search and fetch, PDF reading, email (read, draft), calendar, files.
4. Vetting pipeline: static checks (permission diff, domains, dependencies, vulnerabilities, signature), Master AI analysis, plain-language report with a recommendation.
5. Update flow: updates are vetted again and never install silently.
6. Revocation: uninstall and revoke scopes in one click; remove cached data.
7. Connector contract tests and injection tests (malicious tool output).
8. Mailbox connection (read-only by default) and forwarding address backend for step 10.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| Marketplace | Curated only, open with vetting | Curated first, open with vetting later |
| Sandbox | OS sandbox, containers, WASM | OS sandbox plus containers for code and browser tools |
| Publisher trust | Signature only, reputation score | Signature plus reputation shown in the report |

## Dependencies
Steps 03, 05.

## Acceptance
- A deliberately malicious test connector is blocked or flagged by the vetting report. Tool output containing instructions is never executed.
