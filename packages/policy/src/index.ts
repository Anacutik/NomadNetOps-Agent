// Policy engine: risk tiers, rule evaluation, budgets, kill switch
export type { RiskTier, Decision, PolicyDecision } from './types.js';
export type { ToolManifestEntry, PolicyRule, UntrustedInputState, BudgetScope, Budget, BudgetState, KillSwitchState, PolicyContext, PolicyEvent } from './types.js';

// Core decision engine
export { decide } from './engine.js';
export { policyEngine, SimplePolicyEngine, classify, evaluateRules, applyHardRules, checkUntrustedInput, explainDecision } from './engine.js';

// Budget service
export { checkBudget, checkAllBudgets, aggregateBudgetResults, createBudgetState, getPeriodLabel } from './budget.js';

// Kill switch
export { checkKillSwitch, shouldPauseForImportantTask, getImportantTaskBehavior, createKillSwitch, activateKillSwitch, deactivateKillSwitch, formatKillSwitchReason, getEscalationPath } from './killswitch.js';

// Untrusted input handling
export { markAsUntrusted, isUntrusted, shouldTaintAction, getUntrustedInputRecommendation, stripInstructionsFromUntrusted, createUntrustedEventMetadata } from './untrusted.js';

// Currency support
export { convertCurrency, formatCurrency, showWithEstimated, estimateUserCost, createCurrencyContext, DEFAULT_RISK_TIER_COSTS, getCostEstimate, calculateTotalCost, ExchangeRateService, SimpleExchangeRateService } from './currency.js';
