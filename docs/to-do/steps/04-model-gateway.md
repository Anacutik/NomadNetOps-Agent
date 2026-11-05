# Step 04: Model gateway, keys, Auto picks

**Status:** not started

## Prompt for Kilo Code (copy this whole block)
```text
You are working on NomadNetOps. Do step 04 (Model gateway, keys, Auto picks) and nothing else.
1. Read docs/AI-WORKFLOW.md first and follow it exactly. Then read docs/STATUS.md, PLAN.md, docs/TECHNICAL-DESIGN.md, docs/adr/, docs/to-do/steps/04-model-gateway.md and the latest docs/changelog/ entries.
2. Check the Dependencies section of the step file; every dependency must be "done" in docs/STATUS.md. If not, stop and tell me.
3. Ask me any open design choice (one question at a time, with a recommendation) before building. If I do not answer, use the recommendation and log it.
4. Build the tasks in order. Respect the hard rules in docs/AI-WORKFLOW.md (privacy, tier 3 approvals, space_id, untrusted documents). Never put real API keys in code, tests or logs.
5. Make pnpm lint, typecheck, test and build pass. Do not commit.
6. Before finishing, update: this step file (Status line, mark tasks "(done)", notes), docs/STATUS.md, PLAN.md (only if affected), docs/to-do/extensive-plan.md, and add a new docs/changelog/YYYY-MM-DD-step-04-<title>.md from docs/changelog/_TEMPLATE.md.
7. Report what you did, what is left, and what you recommend next.
```

**Goal:** talk to many models safely, with per-task settings, per-task keys, cost accounting and a curated Auto mode.

## Scope
Provider adapters (OpenRouter first), BYOK, model catalogue, favourites, filters, per-task and per-model settings with inheritance, Auto picks proposed by the Master AI. Default coding model: `qwen/qwen3-coder-next`; cheap helper: `qwen/qwen3-coder-30b-a3b-instruct`; large-context option: `qwen/qwen3-coder-flash`; explicit escalation/reviewer: `qwen/qwen3-coder` (480B A35B).

## Tasks
1. Adapter interface; OpenRouter adapter; Ollama adapter; one direct provider adapter.
2. Streaming, retries, timeouts, fallbacks.
3. Cost accounting on every response, written to `model.responded`.
4. Catalogue sync daily when OpenRouter is the provider; cache live price and capability fields; do not hard-code catalogue counts or prices.
5. Favourites, filters (price, task fit, context, `:batch`, `:free` with drawbacks).
6. Settings inheritance: global default, task type, task, per-model; reasoning levels.
7. Per-task API keys via the vault; set provider-side limits where supported.
8. Auto: curated picks per task type; Master AI proposes changes with reasons; user approves; log changes.
9. Data minimisation and a "what will be sent to which provider" preview.
10. Provider-failure handling that never silently changes a model without user-visible notice and a `model.responded` record.
11. Model policy and budget guardrails: standard variants by default, no free variants for private data, explicit approval for escalation/fallback, provider key hard limit, Nomad global cap, per-run cap, 80% warning and hard stop/pause.

## Remaining design choices
| Choice | Options | Recommend |
|---|---|---|
| How Auto picks are scored | Price, quality benchmarks, user ratings, mix | Mix of benchmark, price and the user's own approval history |
| Fallback behaviour | Silent, ask, notify | Fallback within the approved list, notify and log |
| Provider keys for free tier | Our proxy, BYOK only | BYOK only at first |
| Local models | Ollama only, more runtimes | Ollama first |

## Dependencies
Steps 02 (vault), 03 (budgets).

## Acceptance
- A task runs on two different providers. Costs match provider invoices within 1%. Auto change proposals appear and need approval.
