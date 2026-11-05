import { z } from 'zod';

const EventPayloadSchema = z.record(z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.any()),
  z.record(z.any())
]));

export const EventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number().int().positive(),
  eventType: z.string(),
  sourceId: z.string().uuid(),
  payload: EventPayloadSchema,
  previousHash: z.string().optional(),
  hash: z.string(),
  signature: z.string().optional()
});

export type Event = z.infer<typeof EventSchema>;

export const EventLogHeaderSchema = z.object({
  version: z.string(),
  createdAt: z.number().int().positive(),
  headHash: z.string(),
  algorithm: z.string().optional()
});

export type EventLogHeader = z.infer<typeof EventLogHeaderSchema>;

export const ExportedEventLogSchema = z.object({
  header: EventLogHeaderSchema,
  events: z.array(EventSchema)
});

export type ExportedEventLog = z.infer<typeof ExportedEventLogSchema>;

export async function computeEventHash(event: Omit<Event, 'hash' | 'signature'>): Promise<string> {
  const data = {
    id: event.id,
    timestamp: event.timestamp,
    eventType: event.eventType,
    sourceId: event.sourceId,
    payload: event.payload,
    previousHash: event.previousHash || ''
  };
  const json = JSON.stringify(data, Object.keys(data).sort());
  return hashString(json);
}

export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyEventHash(event: Event): Promise<boolean> {
  return event.hash === await computeEventHash(event);
}

export function verifyChain(previousHash: string | undefined, currentHash: string): boolean {
  if (previousHash === undefined) return true;
  return currentHash === previousHash;
}
