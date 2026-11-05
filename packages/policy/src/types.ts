export type RiskTier = 0 | 1 | 2 | 3;

export type Decision = 'allow' | 'ask' | 'deny';

export interface PolicyEngine {
  decide(context: PolicyContext): PolicyDecision;
  checkBudgets(context: PolicyContext, cost: number): {
    allowed: boolean;
    results: BudgetCheckResult[];
  };
  explain(decision: PolicyDecision, context: PolicyContext): string;
}

export interface ToolManifestEntry {
  id: string;
  tier: RiskTier;
  description?: string;
  arguments?: Record<string, unknown>;
}

export interface PolicyRule {
  id: string;
  description: string;
  tier: RiskTier;
  condition: (toolId: string, args?: Record<string, unknown>) => boolean;
}

export interface PolicyDecision {
  decision: Decision;
  ruleId: string;
  reason: string;
  tier: RiskTier;
}

export interface UntrustedInputState {
  isTainted: boolean;
  source?: string;
  contentPreview?: string;
}

export interface BudgetScope {
  type: 'global' | 'task' | 'taskType' | 'key';
  id: string;
}

export type Period = 'run' | 'day' | 'week' | 'month';

export interface Budget {
  scope: BudgetScope;
  period: Period;
  limitUsd: number;
  hard: boolean;
  warningThreshold?: number;
}

export interface BudgetState {
  currentSpent: number;
  limit: number;
  periodStart: Date;
  periodEnd: Date;
  softLimitReached: boolean;
}

export interface BudgetCheckResult {
  budgetId: string;
  limit: number;
  spent: number;
  remaining: number;
  warning: boolean;
  stopped: boolean;
  period: Period;
  allowed: boolean;
  decision: Decision;
}

export interface KillSwitchState {
  active: boolean;
  scope: 'run' | 'task' | 'all';
  reason?: string;
  triggeredAt?: Date;
}

export interface PolicyContext {
  spaceId: string;
  userId: string;
  toolManifest: readonly ToolManifestEntry[];
  rules: readonly PolicyRule[];
  budgets: readonly Budget[];
  untrustedInput?: UntrustedInputState;
  isImportantTask?: boolean;
}

export interface PolicyEvent {
  seq: number;
  runId: string;
  timestamp: string;
  type: string;
  actor: string;
  payload: unknown;
  policyDecision: PolicyDecision;
  budgets?: BudgetState[];
}

