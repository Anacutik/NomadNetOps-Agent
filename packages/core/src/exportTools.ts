import { EventSchema, ExportedEventLogSchema, type Event, type EventLogHeader } from './eventSchema.js';
import { verifyEventLog, type VerificationResult } from './eventLogVerification.js';

export interface ExportOptions {
  includeHeader?: boolean;
  format?: 'json' | 'ndjson';
  compress?: boolean;
}

export interface ImportOptions {
  validate?: boolean;
}

export async function exportEvents(
  events: Event[],
  options: ExportOptions = {}
): Promise<string> {
  const { includeHeader = true, format = 'json', compress = false } = options;

  if (events.length === 0) {
    return format === 'ndjson' ? '' : JSON.stringify({ header: createHeader(events), events: [] }, null, 2);
  }

  if (format === 'ndjson') {
    return events.map(e => JSON.stringify(e)).join('\n');
  }

  const data = includeHeader
    ? { header: createHeader(events), events }
    : { events };

  return JSON.stringify(data, null, 2);
}

export async function importEvents(
  data: string,
  options: ImportOptions = {}
): Promise<Event[]> {
  const { validate = true } = options;

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }

  let events: Event[];
  if (Array.isArray(parsed)) {
    events = parsed;
  } else if (parsed && typeof parsed === 'object' && 'events' in parsed) {
    const obj = parsed as { events: unknown[] };
    if (Array.isArray(obj.events)) {
      events = obj.events as Event[];
    } else {
      throw new Error('Invalid format: events property is not an array');
    }
  } else {
    throw new Error('Invalid format: expected array of events or object with events property');
  }

  if (validate) {
    const result = await verifyEventLog(events);
    if (!result.valid) {
      throw new Error(`Validation failed: ${result.errors.map(e => e.message).join(', ')}`);
    }
  }

  return events;
}

export function createHeader(events: Event[]): EventLogHeader {
  const head = events.length > 0 ? events[events.length - 1] : null;
  return {
    version: '1.0.0',
    createdAt: events.length > 0 ? events[0].timestamp : Date.now(),
    headHash: head ? head.hash : '',
    algorithm: 'SHA-256'
  };
}

export function countEventsInFile(events: Event[]): number {
  return events.length;
}

export function extractEvents(events: Event[], options: { start?: number; end?: number; limit?: number } = {}): Event[] {
  let result = [...events];
  
  if (options.start !== undefined) {
    result = result.filter(e => e.timestamp >= options.start);
  }
  if (options.end !== undefined) {
    result = result.filter(e => e.timestamp < options.end);
  }

  if (options.limit !== undefined && options.limit > 0) {
    result = result.slice(0, options.limit);
  }

  return result;
}

export function mergeEventFiles(fileEvents: Event[][]): { events: Event[] } {
  const allEvents: Event[] = [];
  for (const events of fileEvents) {
    allEvents.push(...events);
  }

  allEvents.sort((a, b) => a.timestamp - b.timestamp);

  return { events: allEvents };
}

export async function createSnapshot(events: Event[]): Promise<{ hash: string; eventCount: number }> {
  const header = createHeader(events);
  const data = { header, events };
  const content = JSON.stringify(data, null, 2);

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(content));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    hash,
    eventCount: events.length
  };
}
