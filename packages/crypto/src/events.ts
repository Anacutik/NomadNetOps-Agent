// Security event types for the event log (design section 3). Every event
// carries a `space_id` (ADR 0003). Integration with the core event writers
// happens in the runtime/app steps; this module fixes names and payloads.
export const SECURITY_EVENT_TYPES = [
  'auth.login',
  'auth.stepup',
  'device.added',
  'device.revoked',
  'key.rotated',
  'recovery.attempted',
  'recovery.cancelled',
  'recovery.completed',
  'secrets.changed',
  'settings.changed',
  'key.destroyed',
] as const;

export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

export interface SecurityEvent<TPayload = Record<string, unknown>> {
  readonly type: SecurityEventType;
  readonly spaceId: string;
  readonly userId: string;
  readonly ts: number;
  readonly payload: TPayload;
}

export function securityEvent<TPayload>(
  type: SecurityEventType,
  who: { spaceId: string; userId: string },
  payload: TPayload,
  ts?: number,
): SecurityEvent<TPayload> {
  return {
    type,
    spaceId: who.spaceId,
    userId: who.userId,
    ts: ts ?? Date.now(),
    payload,
  };
}
