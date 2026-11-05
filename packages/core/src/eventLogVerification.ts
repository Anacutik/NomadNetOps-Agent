import { EventSchema, ExportedEventLogSchema, computeEventHash, type Event, type EventLogHeader } from './eventSchema.js';

export interface VerificationResult {
  valid: boolean;
  errors: VerificationError[];
  eventCount: number;
  chainIntegrity: boolean;
}

export interface VerificationError {
  type: 'hash_mismatch' | 'chain_break' | 'schema_validation' | 'duplicate_id' | 'invalid_timestamp';
  eventId: string;
  message: string;
  index?: number;
}

export class EventLogVerifier {
  async verify(events: Event[]): Promise<VerificationResult> {
    const errors: VerificationError[] = [];
    const seenIds = new Set<string>();

    if (events.length === 0) {
      return {
        valid: true,
        errors,
        eventCount: 0,
        chainIntegrity: true
      };
    }

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const index = i;

      if (seenIds.has(event.id)) {
        errors.push({
          type: 'duplicate_id',
          eventId: event.id,
          message: `Duplicate event ID: ${event.id}`
        });
      }
      seenIds.add(event.id);

      const validation = EventSchema.safeParse(event);
      if (!validation.success) {
        errors.push({
          type: 'schema_validation',
          eventId: event.id,
          message: `Schema validation failed: ${validation.error.message}`
        });
        continue;
      }

      const expectedHash = await computeEventHash(event);
      if (event.hash !== expectedHash) {
        errors.push({
          type: 'hash_mismatch',
          eventId: event.id,
          message: `Event hash mismatch. Expected: ${expectedHash}, Got: ${event.hash}`
        });
      }

      if (i > 0) {
        const previousEvent = events[i - 1];
        if (event.previousHash !== previousEvent.hash) {
          errors.push({
            type: 'chain_break',
            eventId: event.id,
            message: `Chain broken at event ${event.id}. Expected previous hash: ${previousEvent.hash}, Got: ${event.previousHash}`
          });
        }
      }

      if (event.timestamp <= 0) {
        errors.push({
          type: 'invalid_timestamp',
          eventId: event.id,
          message: `Invalid timestamp: ${event.timestamp}`
        });
      }
    }

    const chainIntegrity = errors.filter(e => e.type === 'chain_break' || e.type === 'hash_mismatch').length === 0;

    return {
      valid: errors.length === 0,
      errors,
      eventCount: events.length,
      chainIntegrity
    };
  }

  async verifyExportedLog(data: unknown): Promise<VerificationResult> {
    const parseResult = ExportedEventLogSchema.safeParse(data);
    if (!parseResult.success) {
      return {
        valid: false,
        errors: [{
          type: 'schema_validation',
          eventId: 'header',
          message: `Exported log schema validation failed: ${parseResult.error.message}`
        }],
        eventCount: 0,
        chainIntegrity: false
      };
    }

    return this.verify(parseResult.data.events);
  }

  computeHeadHash(events: Event[]): string {
    if (events.length === 0) return '';
    return events[events.length - 1].hash;
  }

  getChainLength(events: Event[]): number {
    return events.length;
  }

  findChainBreaks(events: Event[]): { eventId: string; index: number; expected: string; actual: string | undefined }[] {
    const breaks: { eventId: string; index: number; expected: string; actual: string | undefined }[] = [];

    for (let i = 1; i < events.length; i++) {
      const current = events[i];
      const previous = events[i - 1];

      if (current.previousHash !== previous.hash) {
        breaks.push({
          eventId: current.id,
          index: i,
          expected: previous.hash,
          actual: current.previousHash
        });
      }
    }

    return breaks;
  }
}

export async function verifyEventLog(events: Event[]): Promise<VerificationResult> {
  const verifier = new EventLogVerifier();
  return verifier.verify(events);
}
