# Step 13: Coder helper and Designer

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 13 (Coder helper and Designer) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/13-coder-designer.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents). The Coder helper is an optional module, off by default.
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-13-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** two optional agents: turn app ideas into ready prompts for a coding AI, and design visuals that keep every other agent consistent.

## Coder helper
1. Idea intake from the Ideas module and directly.
2. Analyse the idea, ask up to 7 design questions (each skippable), use the Designer baseline.
3. Write the prompt for Kilo Code, Copilot Chat or any coding AI, with safety rules (small steps, git branch, tests, no destructive commands, no secrets) and include the repository model policy: `qwen/qwen3-coder-next` by default, `qwen/qwen3-coder-30b-a3b-instruct` only for low-risk helper work, `qwen/qwen3-coder-flash` only for genuinely large-context/latency needs, and `qwen/qwen3-coder` 480B only after explicit escalation approval.
4. Optional vetted connector to open VS Code and paste the prompt; never edit code directly.
5. Prompt library and versions; learn from which prompts the user keeps.

## Designer
1. Identity (name, tagline, mood, colours, fonts), contrast check, social, website, app, site map.
2. Baseline: versioned, shared read-only with other agents; changes notify dependent agents.
3. Optional vetted image-generation tool; outputs are labelled as generated.
4. Export: SVG, PNG, design tokens (JSON), and a one-page brand guide.
5. Terrain and building maps: scale, legend and layers.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| Coding AI targets | Kilo Code, Copilot, Cursor, others | Kilo Code and Copilot first, generic fallback |
| Image generator | None, one vetted provider, many | One vetted provider first |
| Licensing of generated images | Warn only, check | Show provider terms and a clear note |
| Baseline format | Own JSON, design tokens standard | W3C design tokens format |
| Module default | On or off | Coder off by default, Designer on |

## Dependencies
Step 05 (runtime); step 06 for connectors.

## Acceptance
- An idea becomes a prompt that, when pasted into a coding AI, starts with a plan and asks before risky steps. A saved baseline changes colours in a Writer output and in a Coder prompt.
