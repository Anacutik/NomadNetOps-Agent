# 0002 A deterministic policy engine enforces rules, not the model

**Status:** Accepted

**Context:** Models can be tricked by prompt injection and can misjudge risk.

**Decision:** Every tool and model call passes a deterministic policy engine returning allow, ask or deny. Tier 3 actions (send, publish, spend, change settings, delete, health or legal decisions) always ask. Unknown actions count as tier 3. Nomad never moves money.

**Consequences:** No tool runs without a `policy.decided` event. The engine is open source and heavily tested (packages/policy).
