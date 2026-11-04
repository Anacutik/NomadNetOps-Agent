# @nomad/policy

The deterministic policy engine. The model never enforces rules; this package classifies
tool calls into risk tiers and returns `allow`, `ask` or `deny`. Unknown actions are tier 3.
