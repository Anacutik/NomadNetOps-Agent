import { ToolManifestEntry, RiskTier, PolicyRule, PolicyDecision, Decision, PolicyContext, PolicyEngine, BudgetCheckResult } from './types.js';
import { createBudgetState } from './budget.js';

export function classify(toolId: string, manifest: readonly ToolManifestEntry[]): RiskTier {
  const entry = manifest.find((t) => t.id === toolId);
  if (!entry) return 3;
  return entry.tier;
}

export function evaluateRules(
  toolId: string,
  args?: Record<string, unknown>,
  rules?: readonly PolicyRule[]
): { ruleId: string; tier: RiskTier } | null {
  if (!rules || rules.length === 0) return null;

  const matchedRule = rules.find((rule) => rule.condition(toolId, args));
  if (!matchedRule) return null;

  return { ruleId: matchedRule.id, tier: matchedRule.tier };
}

export function applyHardRules(tier: RiskTier, decision: Decision): Decision {
  if (tier === 3) return 'ask';
  if (decision === 'deny') return 'deny';
  return decision;
}

export function checkUntrustedInput(context: PolicyContext): PolicyDecision | null {
  if (!context.untrustedInput?.isTainted) return null;

  const maxTier = Math.max(...context.toolManifest.map((t) => t.tier), 0);

  if (maxTier >= 2) {
    return {
      decision: 'ask',
      ruleId: 'untrusted-input-tier2+',
      reason: 'Action derived from untrusted input at tier 2 or higher requires approval',
      tier: 3,
    };
  }

  return null;
}

export function decide(context: PolicyContext): PolicyDecision {
  const { toolManifest = [], rules, untrustedInput } = context;

  if (untrustedInput?.isTainted) {
    const untrustedDecision = checkUntrustedInput(context);
    if (untrustedDecision) return untrustedDecision;
  }

  const classifiedTier = classify('unknown.action', toolManifest);

  const ruleMatch = evaluateRules('unknown.action', undefined, rules);
  void ruleMatch;

  const effectiveTier = classifiedTier;

  const baseDecision = getBaseDecision(effectiveTier, context);
  const hardRuleDecision = applyHardRules(effectiveTier, baseDecision);

  const ruleId = ruleMatch?.ruleId || (untrustedInput?.isTainted ? 'untrusted-input' : 'default-classification');
  const reason = getDecisionReason(effectiveTier, hardRuleDecision, context);

  return {
    decision: hardRuleDecision,
    ruleId,
    reason,
    tier: effectiveTier,
  };
}

function getBaseDecision(tier: RiskTier, _context: PolicyContext): Decision {
  if (tier === 3) return 'ask';
  if (tier === 2) return 'ask';
  return 'allow';
}

function getDecisionReason(tier: RiskTier, decision: Decision, context: PolicyContext): string {
  const reasons: string[] = [];

  if (context.untrustedInput?.isTainted) {
    reasons.push('Untrusted input detected');
  }

  if (tier === 3) {
    reasons.push('Tier 3 action: requires approval');
  } else if (tier === 2) {
    reasons.push('Tier 2 action: reversible change');
  } else if (tier === 1) {
    reasons.push('Tier 1 action: draft/creation');
  } else {
    reasons.push('Tier 0 action: read-only');
  }

  if (context.isImportantTask) {
    reasons.push('Important task');
  }

  return reasons.join('. ');
}

export function explainDecision(decision: PolicyDecision, context: PolicyContext): string {
  const decisionText = decision.decision.toUpperCase();
  const tierText = ['READ', 'DRAFT', 'REVERSIBLE', 'CONSEQUENTIAL'][decision.tier];

  let explanation = `[${tierText}] ${decisionText}: ${decision.reason}`;

  if (decision.tier === 3) {
    explanation += ' This is a consequential action that always requires human approval.';
  } else if (decision.tier === 2) {
    explanation += ' This is a reversible change. Approval settings apply.';
  }

  if (context.untrustedInput?.isTainted) {
    explanation += ' Source: ' + (context.untrustedInput.source || 'Unknown');
  }

  return explanation;
}

export class SimplePolicyEngine implements PolicyEngine {
  private static readonly DEFAULT_MANIFEST: readonly ToolManifestEntry[] = [
    { id: 'read.file', tier: 0, description: 'Read a file' },
    { id: 'list.directory', tier: 0, description: 'List directory contents' },
    { id: 'search.text', tier: 0, description: 'Search text content' },
    { id: 'write.draft', tier: 1, description: 'Create or edit draft content' },
    { id: 'update.record', tier: 2, description: 'Update a record' },
    { id: 'send.message', tier: 3, description: 'Send a message' },
    { id: 'publish.content', tier: 3, description: 'Publish content' },
    { id: 'spend.money', tier: 3, description: 'Spending money' },
    { id: 'delete.data', tier: 3, description: 'Delete data' },
  ];

  decide(context: PolicyContext): PolicyDecision {
    const { toolManifest = SimplePolicyEngine.DEFAULT_MANIFEST, untrustedInput } = context;

    if (untrustedInput?.isTainted) {
      const untrustedDecision = this.checkUntrustedInput(context);
      if (untrustedDecision) return untrustedDecision;
    }

    const effectiveTier = this.getClassifyTool('unknown.action', toolManifest);

    const baseDecision = this.getBaseDecision(effectiveTier, context);
    const decision = this.applyHardRules(effectiveTier, baseDecision);

    const ruleId = untrustedInput?.isTainted ? 'untrusted-input' : 'default-classification';
    const reason = this.getDecisionReason(effectiveTier, decision, context);

    return {
      decision,
      ruleId,
      reason,
      tier: effectiveTier,
    };
  }

  checkBudgets(context: PolicyContext, cost: number): {
    allowed: boolean;
    results: BudgetCheckResult[];
  } {
    const { budgets } = context;

    if (!budgets || budgets.length === 0) {
      return { allowed: true, results: [] };
    }

    const periodStart = new Date();

    const results = budgets.map((budget) => {
      const state = createBudgetState(budget, periodStart);
      const decision: Decision = (state.currentSpent + cost) > budget.limitUsd && budget.hard ? 'deny' : (state.currentSpent / budget.limitUsd) >= 0.8 ? 'ask' : 'allow';
      return {
        budgetId: `${budget.scope.type}:${budget.scope.id}:${budget.period}`,
        limit: budget.limitUsd,
        spent: state.currentSpent,
        remaining: budget.limitUsd - state.currentSpent,
        warning: (state.currentSpent / budget.limitUsd) >= 0.8,
        stopped: (state.currentSpent + cost) > budget.limitUsd && budget.hard,
        period: budget.period,
        allowed: !((state.currentSpent + cost) > budget.limitUsd && budget.hard),
        decision,
      };
    });

    const aggregate = this.aggregateBudgetResults(results);

    return {
      allowed: !aggregate.stopped,
      results,
    };
  }

  explain(decision: PolicyDecision, context: PolicyContext): string {
    return explainDecision(decision, context);
  }

  private getClassifyTool(toolId: string, manifest: readonly ToolManifestEntry[]): RiskTier {
    const entry = manifest.find((t) => t.id === toolId);
    return entry ? entry.tier : 3;
  }

  private getBaseDecision(tier: RiskTier, _context: PolicyContext): Decision {
    if (tier === 3) return 'ask';
    if (tier === 2) return 'ask';
    return 'allow';
  }

  private applyHardRules(tier: RiskTier, decision: Decision): Decision {
    if (tier === 3) return 'ask';
    return decision;
  }

  private getDecisionReason(tier: RiskTier, decision: Decision, context: PolicyContext): string {
    const reasons: string[] = [];

    if (context.untrustedInput?.isTainted) {
      reasons.push('Untrusted input detected');
    }

    if (tier === 3) {
      reasons.push('Tier 3 action: requires approval');
    } else if (tier === 2) {
      reasons.push('Tier 2 action: reversible change');
    } else if (tier === 1) {
      reasons.push('Tier 1 action: draft/creation');
    } else {
      reasons.push('Tier 0 action: read-only');
    }

    if (context.isImportantTask) {
      reasons.push('Important task');
    }

    return reasons.join('. ');
  }

  private checkUntrustedInput(context: PolicyContext): PolicyDecision | null {
    if (!context.untrustedInput?.isTainted) return null;

    const maxTier = Math.max(...context.toolManifest.map((t) => t.tier), 0);

    if (maxTier >= 2) {
      return {
        decision: 'ask',
        ruleId: 'untrusted-input-tier2+',
        reason: 'Action derived from untrusted input at tier 2 or higher requires approval',
        tier: 3,
      };
    }

    return null;
  }

  private aggregateBudgetResults(results: { allowed?: boolean; decision?: Decision; warning?: boolean; stopped?: boolean }[]): {
    allowed: boolean;
    decisions: Decision[];
    warnings: boolean;
    stopped: boolean;
    maxTier: number;
  } {
    const allowed = results.every((r) => r.allowed !== false);
    const decisions = results.map((r) => (r.stopped ? 'deny' : r.warning ? 'ask' : 'allow'));
    const warnings = results.some((r) => r.warning);
    const stopped = results.some((r) => r.stopped);
    const maxTier = Math.max(...decisions.map((d) => (d === 'deny' ? 3 : 0)), 0);

    return {
      allowed,
      decisions,
      warnings,
      stopped,
      maxTier,
    };
  }
}

export const policyEngine = new SimplePolicyEngine();
