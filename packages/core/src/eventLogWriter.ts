import { EventSchema, EventLogHeaderSchema, computeEventHash, type Event, type EventLogHeader } from './eventSchema.js';

export interface EventLogWriter {
  append(event: Event): Promise<void>;
  getHead(): Promise<Event | null>;
  getHeadHash(): Promise<string>;
  getEvents(beforeTimestamp?: number, limit?: number): Promise<Event[]>;
  export(): Promise<{ header: EventLogHeader; events: Event[] }>;
  verify(): Promise<boolean>;
  close(): Promise<void>;
}

export interface FileEventLogWriterOptions {
  basePath: string;
  filename?: string;
}

export class FileEventLogWriter implements EventLogWriter {
  private filePath: string;
  private events: Event[] = [];
  private closed = false;

  constructor(options: FileEventLogWriterOptions) {
    this.filePath = `${options.basePath}/${options.filename || 'events.json'}`;
  }

  async append(event: Event): Promise<void> {
    if (this.closed) {
      throw new Error('Event log is closed');
    }

    const head = this.events.length > 0 ? this.events[this.events.length - 1] : null;
    const previousHash = head ? head.hash : undefined;

    const validatedEvent = EventSchema.parse({
      ...event,
      previousHash,
      hash: await computeEventHash(event)
    });

    this.events.push(validatedEvent);
    await this.#save();
  }

  async getHead(): Promise<Event | null> {
    if (this.events.length === 0) {
      return null;
    }
    return this.events[this.events.length - 1];
  }

  async getHeadHash(): Promise<string> {
    const head = await this.getHead();
    return head ? head.hash : '';
  }

  async getEvents(beforeTimestamp?: number, limit?: number): Promise<Event[]> {
    let filtered = this.events;
    if (beforeTimestamp) {
      filtered = filtered.filter(e => e.timestamp < beforeTimestamp);
    }
    if (limit && limit > 0) {
      filtered = filtered.slice(-limit);
    }
    return filtered;
  }

  async export(): Promise<{ header: EventLogHeader; events: Event[] }> {
    const head = await this.getHead();
    const header: EventLogHeader = {
      version: '1.0.0',
      createdAt: this.events.length > 0 ? this.events[0].timestamp : Date.now(),
      headHash: head ? head.hash : '',
      algorithm: 'SHA-256'
    };
    return { header, events: [...this.events] };
  }

  async verify(): Promise<boolean> {
    if (this.events.length === 0) return true;

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      const expectedHash = await computeEventHash(event);
      if (event.hash !== expectedHash) return false;

      if (i > 0) {
        const previousEvent = this.events[i - 1];
        if (event.previousHash !== previousEvent.hash) return false;
      }
    }

    return true;
  }

  async close(): Promise<void> {
    this.closed = true;
    await this.#save();
  }

  async #save(): Promise<void> {
    const data = await this.export();
    throw new Error('File write not supported in browser environment');
  }
}

export interface MemoryEventLogWriterOptions {
  maxSize?: number;
}

export class MemoryEventLogWriter implements EventLogWriter {
  private events: Event[] = [];
  private maxSize: number | undefined;

  constructor(options: MemoryEventLogWriterOptions = {}) {
    this.maxSize = options.maxSize;
  }

  async append(event: Event): Promise<void> {
    const head = this.events.length > 0 ? this.events[this.events.length - 1] : null;
    const previousHash = head ? head.hash : undefined;

    const validatedEvent = EventSchema.parse({
      ...event,
      previousHash,
      hash: await computeEventHash(event)
    });

    this.events.push(validatedEvent);
    if (this.maxSize && this.events.length > this.maxSize) {
      this.events.shift();
    }
  }

  async getHead(): Promise<Event | null> {
    if (this.events.length === 0) {
      return null;
    }
    return this.events[this.events.length - 1];
  }

  async getHeadHash(): Promise<string> {
    const head = await this.getHead();
    return head ? head.hash : '';
  }

  async getEvents(beforeTimestamp?: number, limit?: number): Promise<Event[]> {
    let filtered = this.events;
    if (beforeTimestamp) {
      filtered = filtered.filter(e => e.timestamp < beforeTimestamp);
    }
    if (limit && limit > 0) {
      filtered = filtered.slice(-limit);
    }
    return filtered;
  }

  async export(): Promise<{ header: EventLogHeader; events: Event[] }> {
    const head = await this.getHead();
    const header: EventLogHeader = {
      version: '1.0.0',
      createdAt: this.events.length > 0 ? this.events[0].timestamp : Date.now(),
      headHash: head ? head.hash : '',
      algorithm: 'SHA-256'
    };
    return { header, events: [...this.events] };
  }

  async verify(): Promise<boolean> {
    if (this.events.length === 0) return true;

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      const expectedHash = await computeEventHash(event);
      if (event.hash !== expectedHash) return false;

      if (i > 0) {
        const previousEvent = this.events[i - 1];
        if (event.previousHash !== previousEvent.hash) return false;
      }
    }

    return true;
  }

  async close(): Promise<void> {
    // No-op for memory writer
  }
}
