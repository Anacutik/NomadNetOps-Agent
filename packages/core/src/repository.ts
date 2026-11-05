import { EventSchema, computeEventHash, type Event } from './eventSchema.js';
import { EventLogVerifier, type VerificationResult } from './eventLogVerification.js';
import { SCHEMA_VERSION } from './sqliteSchema.js';

export interface EventRepository {
  append(event: Event): Promise<void>;
  get(id: string): Promise<Event | null>;
  getLatest(limit?: number): Promise<Event[]>;
  getByRange(since: number, until?: number, limit?: number): Promise<Event[]>;
  getBySource(sourceId: string, limit?: number): Promise<Event[]>;
  getByType(eventType: string, limit?: number): Promise<Event[]>;
  count(): Promise<number>;
  getHead(): Promise<Event | null>;
  getHeadHash(): Promise<string>;
  verify(): Promise<VerificationResult>;
  export(): Promise<{ header: { version: string; createdAt: number; headHash: string; algorithm: string }; events: Event[] }>;
  clear(): Promise<void>;
}

export class InMemoryEventRepository implements EventRepository {
  private events: Map<string, Event> = new Map();

  async append(event: Event): Promise<void> {
    const headEvent = await this.getHead();
    const previousHash = headEvent ? headEvent.hash : undefined;

    const validatedEvent = EventSchema.parse({
      ...event,
      previousHash,
      hash: await computeEventHash(event)
    });

    this.events.set(validatedEvent.id, validatedEvent);
  }

  async get(id: string): Promise<Event | null> {
    return this.events.get(id) ?? null;
  }

  async getLatest(limit: number = 100): Promise<Event[]> {
    const events = Array.from(this.events.values());
    events.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return events.slice(0, limit);
  }

  async getByRange(since: number, until?: number, limit: number = 100): Promise<Event[]> {
    const events = Array.from(this.events.values())
      .filter(e => (e.timestamp || 0) >= since && (!until || (e.timestamp || 0) < until));
    events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return events.slice(0, limit);
  }

  async getBySource(sourceId: string, limit: number = 100): Promise<Event[]> {
    const events = Array.from(this.events.values())
      .filter(e => e.sourceId === sourceId);
    events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return events.slice(0, limit);
  }

  async getByType(eventType: string, limit: number = 100): Promise<Event[]> {
    const events = Array.from(this.events.values())
      .filter(e => e.eventType === eventType);
    events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return events.slice(0, limit);
  }

  async count(): Promise<number> {
    return this.events.size;
  }

  async getHead(): Promise<Event | null> {
    const events = await this.getLatest(1);
    return events.length > 0 ? events[0] : null;
  }

  async getHeadHash(): Promise<string> {
    const head = await this.getHead();
    return head ? head.hash : '';
  }

  async verify(): Promise<VerificationResult> {
    const events = await this.getLatest(10000);
    const verifier = new EventLogVerifier();
    return verifier.verify(events);
  }

  async export(): Promise<{ header: { version: string; createdAt: number; headHash: string; algorithm: string }; events: Event[] }> {
    const events = await this.getLatest(10000);
    const head = await this.getHead();
    const header = {
      version: SCHEMA_VERSION,
      createdAt: events.length > 0 ? (events[0].timestamp || Date.now()) : Date.now(),
      headHash: head ? head.hash : '',
      algorithm: 'SHA-256'
    };
    return { header, events };
  }

  async clear(): Promise<void> {
    this.events.clear();
  }
}

export interface Source {
  id: string;
  name: string;
  type: string;
  config?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface Run {
  id: string;
  sourceId: string;
  startedAt: number;
  endedAt?: number;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export class InMemorySourceRepository {
  private sources: Map<string, Source> = new Map();

  async save(source: Source): Promise<void> {
    this.sources.set(source.id, source);
  }

  async get(id: string): Promise<Source | null> {
    return this.sources.get(id) ?? null;
  }

  async getAll(): Promise<Source[]> {
    return Array.from(this.sources.values());
  }

  async delete(id: string): Promise<void> {
    this.sources.delete(id);
  }
}

export class InMemoryRunRepository {
  private runs: Map<string, Run> = new Map();

  async save(run: Run): Promise<void> {
    this.runs.set(run.id, run);
  }

  async get(id: string): Promise<Run | null> {
    return this.runs.get(id) ?? null;
  }

  async getBySource(sourceId: string, limit: number = 100): Promise<Run[]> {
    const runs = Array.from(this.runs.values())
      .filter(r => r.sourceId === sourceId);
    runs.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    return runs.slice(0, limit);
  }

  async getAll(limit: number = 100): Promise<Run[]> {
    const runs = Array.from(this.runs.values());
    runs.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    return runs.slice(0, limit);
  }

  async delete(id: string): Promise<void> {
    this.runs.delete(id);
  }
}
