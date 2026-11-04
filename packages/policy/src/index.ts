// Policy engine: risk tiers and deterministic allow/ask/deny decisions.
export type RiskTier = 0 | 1 | 2 | 3;
export type Decision = 'allow' | 'ask' | 'deny';

export interface ToolManifestEntry {
  id: string;
  tier: RiskTier;
}

/** Unknown tools are treated as the strictest tier. */
export function classify(toolId: string, manifest: readonly ToolManifestEntry[]): RiskTier {
  return manifest.find((t) => t.id === toolId)?.tier ?? 3;
}

/** Tier 3 can never be automatic; tier 2 follows the assistant's setting. */
export function decide(tier: RiskTier, tier2Setting: 'allow' | 'ask'): Decision {
  if (tier === 3) return 'ask';
  if (tier === 2) return tier2Setting;
  return 'allow';
}
