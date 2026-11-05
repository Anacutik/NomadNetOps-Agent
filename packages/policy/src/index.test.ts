import { describe, expect, it } from 'vitest';
import { classify, SimplePolicyEngine } from './index.js';

describe('policy invariants', () => {
  it('treats unknown tools as tier 3', () => {
    expect(classify('mystery.tool', [])).toBe(3);
  });

  it('decide never allows tier 3 automatically', () => {
    const engine = new SimplePolicyEngine();
    const decision = engine.decide({
      spaceId: 'test',
      userId: 'user',
      toolManifest: [{ id: 'send.message', tier: 3 }],
      budgets: [],
    });
    expect(decision.decision).toBe('ask');
    expect(decision.tier).toBe(3);
  });

  it('decide uses default manifest', () => {
    const engine = new SimplePolicyEngine();
    const decision = engine.decide({
      spaceId: 'test',
      userId: 'user',
      budgets: [],
    });
    expect(decision.decision).toBe('ask');
    expect(decision.tier).toBe(3);
  });
});
