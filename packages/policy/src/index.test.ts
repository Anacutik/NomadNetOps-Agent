import { describe, expect, it } from 'vitest';
import { classify, decide } from './index.js';

describe('policy invariants', () => {
  it('treats unknown tools as tier 3', () => {
    expect(classify('mystery.tool', [])).toBe(3);
  });

  it('never allows tier 3 automatically', () => {
    expect(decide(3, 'allow')).toBe('ask');
  });

  it('lets tier 2 follow the setting', () => {
    expect(decide(2, 'allow')).toBe('allow');
    expect(decide(2, 'ask')).toBe('ask');
  });

  it('allows read and draft tiers', () => {
    expect(decide(0, 'ask')).toBe('allow');
    expect(decide(1, 'ask')).toBe('allow');
  });
});
