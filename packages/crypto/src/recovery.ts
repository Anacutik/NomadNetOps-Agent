// Recovery waiting period (design section 6): recovery on a new device has a
// cancellable waiting period (default 24h, user can lengthen), notifies all
// devices, and is logged as `recovery.attempted` / `recovery.cancelled`.
import { NomadCryptoError } from './primitives.js';

export const DEFAULT_WAITING_PERIOD_HOURS = 24;

export type RecoveryStatus = 'pending' | 'cancelled' | 'completed';

export interface RecoveryRequest {
  readonly id: string;
  readonly userId: string;
  readonly requestedAt: number;
  /** Ready time in ms; the user may lengthen the period. */
  readonly readyAt: number;
  readonly periodHours: number;
  readonly status: RecoveryStatus;
  readonly cancelledBy?: string | undefined;
  readonly cancelledAt?: number | undefined;
  readonly completedAt?: number | undefined;
}

export interface RecoveryClock {
  now(): number;
}

export class SystemClock implements RecoveryClock {
  now(): number {
    return Date.now();
  }
}

export type RecoveryNotificationType =
  | 'recovery.attempted'
  | 'recovery.cancelled'
  | 'recovery.completed';

export interface RecoveryNotification {
  readonly type: RecoveryNotificationType;
  readonly requestId: string;
  readonly userId: string;
  readonly at: number;
}

export interface RecoveryNotifier {
  notify(notification: RecoveryNotification): void;
}

export interface RecoveryOptions {
  clock?: RecoveryClock;
  notifier?: RecoveryNotifier;
  defaultPeriodHours?: number;
}

export class RecoveryService {
  private readonly requests = new Map<string, RecoveryRequest>();
  private readonly clock: RecoveryClock;
  private readonly notifier: RecoveryNotifier | undefined;
  private readonly defaultPeriodHours: number;
  private nextId = 1;

  constructor(options: RecoveryOptions = {}) {
    this.clock = options.clock ?? new SystemClock();
    this.notifier = options.notifier;
    this.defaultPeriodHours = options.defaultPeriodHours ?? DEFAULT_WAITING_PERIOD_HOURS;
  }

  /** Start a recovery request. Notifies all devices immediately. */
  start(input: { userId: string; periodHours?: number; idPrefix?: string }): RecoveryRequest {
    const now = this.clock.now();
    const periodHours = Math.max(input.periodHours ?? this.defaultPeriodHours, 0);
    const request: RecoveryRequest = {
      id: `${input.idPrefix ?? 'rec'}-${this.nextId++}`,
      userId: input.userId,
      requestedAt: now,
      readyAt: now + periodHours * 3600_000,
      periodHours,
      status: 'pending',
    };
    this.requests.set(request.id, request);
    this.notifier?.notify({ type: 'recovery.attempted', requestId: request.id, userId: request.userId, at: now });
    return request;
  }

  /** Lengthen the waiting period. Only the owner (the user) may do this. */
  extend(requestId: string, actorUserId: string, hours: number): RecoveryRequest {
    const request = this.require(requestId);
    if (request.userId !== actorUserId) {
      throw new NomadCryptoError('forbidden', 'Only the account owner may change the waiting period');
    }
    if (request.status !== 'pending') {
      throw new NomadCryptoError('conflict', 'Recovery request is no longer pending');
    }
    if (hours <= 0) {
      throw new NomadCryptoError('invalid_input', 'Waiting period must be positive');
    }
    const extended: RecoveryRequest = {
      ...request,
      readyAt: request.requestedAt + (request.periodHours + hours) * 3600_000,
      periodHours: request.periodHours + hours,
    };
    this.requests.set(requestId, extended);
    return extended;
  }

  /** Cancel by owner. Any other actor is refused. */
  cancel(requestId: string, actorUserId: string): RecoveryRequest {
    const request = this.require(requestId);
    if (request.userId !== actorUserId) {
      throw new NomadCryptoError('forbidden', 'Only the account owner may cancel a recovery');
    }
    if (request.status !== 'pending') {
      throw new NomadCryptoError('conflict', 'Recovery request is no longer pending');
    }
    const cancelled: RecoveryRequest = {
      ...request,
      status: 'cancelled',
      cancelledBy: actorUserId,
      cancelledAt: this.clock.now(),
    };
    this.requests.set(requestId, cancelled);
    this.notifier?.notify({
      type: 'recovery.cancelled',
      requestId,
      userId: request.userId,
      at: cancelled.cancelledAt ?? 0,
    });
    return cancelled;
  }

  /** Whether the waiting period has passed for a pending request. */
  isReady(requestId: string, at?: number): boolean {
    const request = this.require(requestId);
    if (request.status !== 'pending') return false;
    return (at ?? this.clock.now()) >= request.readyAt;
  }

  /** Complete a recovery. Only allowed once the waiting period has passed. */
  complete(requestId: string, at?: number): RecoveryRequest {
    const request = this.require(requestId);
    if (request.status !== 'pending') {
      throw new NomadCryptoError('conflict', 'Recovery request is no longer pending');
    }
    const now = at ?? this.clock.now();
    if (now < request.readyAt) {
      throw new NomadCryptoError('invalid_code', 'Recovery is still in its waiting period');
    }
    const completed: RecoveryRequest = { ...request, status: 'completed', completedAt: now };
    this.requests.set(requestId, completed);
    this.notifier?.notify({ type: 'recovery.completed', requestId, userId: request.userId, at: now });
    return completed;
  }

  get(requestId: string): RecoveryRequest | undefined {
    return this.requests.get(requestId);
  }

  list(userId?: string): RecoveryRequest[] {
    return [...this.requests.values()].filter((r) => userId === undefined || r.userId === userId);
  }

  private require(requestId: string): RecoveryRequest {
    const request = this.requests.get(requestId);
    if (!request) throw new NomadCryptoError('not_found', 'Recovery request not found');
    return request;
  }
}
