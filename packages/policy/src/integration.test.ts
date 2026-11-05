import { describe, expect, it } from 'vitest';
import { SimplePolicyEngine } from './index.js';
import { checkBudget } from './budget.js';
import { checkKillSwitch, getImportantTaskBehavior } from './killswitch.js';
import { markAsUntrusted, isUntrusted } from './untrusted.js';
import { convertCurrency, formatCurrency, SimpleExchangeRateService } from './currency.js';

describe('policy engine integration', () => {
  it('decides using default manifest (unknown tool = tier 3)', () => {
    const engine = new SimplePolicyEngine();
    const decision = engine.decide({
      spaceId: 'test-space',
      userId: 'user1',
      budgets: [],
      untrustedInput: undefined,
      isImportantTask: false,
    });
    expect(decision.decision).toBe('ask');
    expect(decision.tier).toBe(3);
  });

  it('decides on tier 3 actions', () => {
    const engine = new SimplePolicyEngine();
    const decision = engine.decide({
      spaceId: 'test-space',
      userId: 'user1',
      toolManifest: [{ id: 'send.message', tier: 3 }],
      budgets: [],
      untrustedInput: undefined,
      isImportantTask: false,
    });
    expect(decision.decision).toBe('ask');
    expect(decision.tier).toBe(3);
  });

  it('marks untrusted input at tier 2+ as requiring approval', () => {
    const engine = new SimplePolicyEngine();
    const context = {
      spaceId: 'test-space',
      userId: 'user1',
      toolManifest: [{ id: 'update.record', tier: 2 }],
      budgets: [],
      untrustedInput: markAsUntrusted('email content', 'sender@example.com'),
      isImportantTask: false,
    };

    const decision = engine.decide(context);
    expect(decision.decision).toBe('ask');
    expect(decision.ruleId).toBe('untrusted-input-tier2+');
  });

  it('budget check allows under limit', () => {
    const budget = {
      scope: { type: 'global', id: 'global' },
      period: 'day',
      limitUsd: 100,
      hard: true,
    };

    const result = checkBudget(budget, { currentSpent: 50, periodStart: new Date(), periodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000) }, 10);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(40);
    expect(result.percentageUsed).toBe(60);
  });

  it('budget check stops at hard limit', () => {
    const budget = {
      scope: { type: 'global', id: 'global' },
      period: 'day',
      limitUsd: 100,
      hard: true,
    };

    const result = checkBudget(budget, { currentSpent: 90, periodStart: new Date(), periodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000) }, 20);

    expect(result.stopped).toBe(true);
    expect(result.allowed).toBe(false);
    expect(result.decision).toBe('deny');
  });

  it('budget check warns at 80%', () => {
    const budget = {
      scope: { type: 'global', id: 'global' },
      period: 'day',
      limitUsd: 100,
      hard: true,
    };

    const result = checkBudget(budget, { currentSpent: 80, periodStart: new Date(), periodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000) }, 5);

    expect(result.warning).toBe(true);
    expect(result.decision).toBe('ask');
  });

  it('kill switch stops all operations', () => {
    const killSwitchState = {
      active: true,
      scope: 'all',
      reason: 'maintenance',
      triggeredAt: new Date(),
    };

    const result = checkKillSwitch(killSwitchState, {
      spaceId: 'test',
      userId: 'user',
      activeBudgetStops: 0,
      pendingApprovals: 0,
      currentCost: 0,
    });

    expect(result.active).toBe(true);
    expect(result.action).toBe('stop');
  });

  it('important task pauses at ask decision', () => {
    const behavior = getImportantTaskBehavior('ask', true);
    expect(behavior).toBe('pause');
  });

  it('important task stops at deny decision', () => {
    const behavior = getImportantTaskBehavior('deny', true);
    expect(behavior).toBe('stop');
  });

  it('currency conversion works', () => {
    const result = convertCurrency(100, 'USD', 'EUR', 0.92);
    expect(result.amount).toBe(92);
    expect(result.currency).toBe('EUR');
    expect(result.isEstimated).toBe(true);
  });

  it('currency formatting includes estimation label', () => {
    const formatted = formatCurrency(99.99, 'USD', true);
    expect(formatted).toContain('(estimated)');
  });

  it('exchange rate service caches rates', () => {
    const service = new SimpleExchangeRateService();
    service.setRate('USD', 'EUR', 0.92);

    expect(service.getRate('USD', 'EUR')).toBe(0.92);
    expect(service.getCachedRate('USD', 'EUR')).toBe(0.92);
  });

  it('detects suspicious patterns in untrusted content', () => {
    expect(isUntrusted('javascript:alert(1)')).toBe(true);
    expect(isUntrusted('<script>malware</script>')).toBe(true);
    expect(isUntrusted('normal text')).toBe(false);
  });
});
