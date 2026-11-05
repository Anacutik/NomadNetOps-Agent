import { Budget, BudgetState, Period, Decision } from './types.js';

export interface BudgetContext {
  currentSpent: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface BudgetCheckResult {
  allowed: boolean;
  decision: Decision;
  remaining: number;
  percentageUsed: number;
  warning: boolean;
  stopped: boolean;
  budget?: Budget;
}

export function checkBudget(
  budget: Budget,
  context: BudgetContext,
  currentCost: number
): BudgetCheckResult {
  const { limitUsd, hard, warningThreshold = 0.8 } = budget;
  
  const projectedSpent = context.currentSpent + currentCost;
  const percentageUsed = (projectedSpent / limitUsd) * 100;
  const remaining = limitUsd - projectedSpent;
  
  const warning = percentageUsed >= warningThreshold * 100;
  const stopped = projectedSpent > limitUsd && hard;
  
  let decision: Decision = 'allow';
  if (stopped) {
    decision = 'deny';
  } else if (warning) {
    decision = 'ask';
  }
  
  return {
    allowed: !stopped,
    decision,
    remaining: Math.max(0, remaining),
    percentageUsed,
    warning,
    stopped,
    budget,
  };
}

export function checkAllBudgets(
  budgets: readonly Budget[],
  context: BudgetContext,
  currentCost: number
): BudgetCheckResult[] {
  return budgets.map((budget) => checkBudget(budget, context, currentCost));
}

export function aggregateBudgetResults(results: BudgetCheckResult[]): {
  allowed: boolean;
  decisions: Decision[];
  warnings: boolean;
  stopped: boolean;
  maxTier: number;
} {
  const allowed = results.every((r) => r.allowed);
  const decisions = results.map((r) => r.decision);
  const warnings = results.some((r) => r.warning);
  const stopped = results.some((r) => r.stopped);
  const maxTier = Math.max(...results.map((r) => (r.decision === 'ask' ? 3 : r.decision === 'deny' ? 3 : 0)), 0);
  
  return {
    allowed,
    decisions,
    warnings,
    stopped,
    maxTier,
  };
}

export function createBudgetState(
  budget: Budget,
  periodStart: Date = new Date(),
  currentSpent = 0
): BudgetState {
  const { period, limitUsd } = budget;
  const periodEnd = calculatePeriodEnd(periodStart, period);
  
  return {
    currentSpent,
    limit: limitUsd,
    periodStart,
    periodEnd,
    softLimitReached: false,
  };
}

function calculatePeriodEnd(start: Date, period: Period): Date {
  const end = new Date(start);
  
  switch (period) {
    case 'run':
      return new Date(start.getTime() + 24 * 60 * 60 * 1000);
    case 'day':
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    case 'week':
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    case 'month':
      return new Date(start.getFullYear(), start.getMonth() + 1, 1);
    default:
      return end;
  }
}

export function getPeriodLabel(period: Period): string {
  const labels = {
    run: 'This run',
    day: 'Today',
    week: 'This week',
    month: 'This month',
  };
  return labels[period];
}
