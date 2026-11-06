import { describe, expect, it } from 'vitest';
import { NomadCryptoError } from './primitives.js';
import {
  DEFAULT_WAITING_PERIOD_HOURS,
  RecoveryService,
  type RecoveryNotification,
} from './recovery.js';

function fixedClock(start: number) {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('recovery waiting period', () => {
  it('starts with the default 24h period and notifies devices', () => {
    const notifications: RecoveryNotification[] = [];
    const service = new RecoveryService({
      clock: fixedClock(0),
      notifier: { notify: (n) => notifications.push(n) },
    });
    const request = service.start({ userId: 'alice' });
    expect(request.periodHours).toBe(DEFAULT_WAITING_PERIOD_HOURS);
    expect(request.status).toBe('pending');
    expect(service.isReady(request.id)).toBe(false);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.type).toBe('recovery.attempted');
  });

  it('is not ready before the period and ready after', () => {
    const clock = fixedClock(0);
    const service = new RecoveryService({ clock });
    const request = service.start({ userId: 'alice', periodHours: 24 });
    clock.advance(23 * 3600_000);
    expect(service.isReady(request.id)).toBe(false);
    clock.advance(1 * 3600_000);
    expect(service.isReady(request.id)).toBe(true);
    expect(() => service.complete(request.id)).not.toThrow();
    expect(service.get(request.id)?.status).toBe('completed');
  });

  it('refuses completion during the waiting period', () => {
    const clock = fixedClock(0);
    const service = new RecoveryService({ clock });
    const request = service.start({ userId: 'alice', periodHours: 24 });
    clock.advance(3600_000);
    expect(() => service.complete(request.id)).toThrowError(NomadCryptoError);
  });

  it('can be cancelled by the owner at any time', () => {
    const clock = fixedClock(0);
    const notifications: RecoveryNotification[] = [];
    const service = new RecoveryService({
      clock,
      notifier: { notify: (n) => notifications.push(n) },
    });
    const request = service.start({ userId: 'alice' });
    const cancelled = service.cancel(request.id, 'alice');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelledBy).toBe('alice');
    expect(notifications.map((n) => n.type)).toEqual(['recovery.attempted', 'recovery.cancelled']);
    expect(service.isReady(request.id)).toBe(false);
    expect(() => service.complete(request.id)).toThrowError(NomadCryptoError);
  });

  it('refuses cancellation by anyone other than the owner', () => {
    const clock = fixedClock(0);
    const service = new RecoveryService({ clock });
    const request = service.start({ userId: 'alice' });
    expect(() => service.cancel(request.id, 'mallory')).toThrowError(/owner/i);
  });

  it('lets the owner lengthen the period, never shorten below the original', () => {
    const clock = fixedClock(0);
    const service = new RecoveryService({ clock });
    const request = service.start({ userId: 'alice', periodHours: 24 });
    const extended = service.extend(request.id, 'alice', 24);
    expect(extended.periodHours).toBe(48);
    clock.advance(24 * 3600_000);
    expect(service.isReady(request.id)).toBe(false);
    clock.advance(24 * 3600_000);
    expect(service.isReady(request.id)).toBe(true);
    // Non-owner cannot extend.
    expect(() => service.extend(request.id, 'mallory', 1)).toThrowError(/owner/i);
  });

  it('refuses unknown requests and double completion', () => {
    const service = new RecoveryService({ clock: fixedClock(0) });
    expect(() => service.isReady('nope')).toThrowError(NomadCryptoError);
    const request = service.start({ userId: 'alice', periodHours: 0 });
    service.complete(request.id);
    expect(() => service.complete(request.id)).toThrowError(/no longer pending/);
    expect(() => service.cancel(request.id, 'alice')).toThrowError(/no longer pending/);
  });

  it('lists requests per user', () => {
    const service = new RecoveryService({ clock: fixedClock(0) });
    service.start({ userId: 'alice' });
    service.start({ userId: 'bob' });
    expect(service.list('alice')).toHaveLength(1);
    expect(service.list()).toHaveLength(2);
  });
});
