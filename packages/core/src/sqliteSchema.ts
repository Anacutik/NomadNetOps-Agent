export const SCHEMA_VERSION = '1.0.0';

export const CREATE_EVENTS_TABLE = `
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  previous_hash TEXT,
  hash TEXT NOT NULL,
  signature TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
`;

export const CREATE_EVENT_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_source_id ON events(source_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_hash ON events(hash);
`;

export const CREATE_EVENT_LOG_METADATA_TABLE = `
CREATE TABLE IF NOT EXISTS event_log_metadata (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  head_hash TEXT NOT NULL,
  algorithm TEXT DEFAULT 'SHA-256',
  total_events INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
`;

export const CREATE_SOURCES_TABLE = `
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
`;

export const CREATE_RUNS_TABLE = `
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  status TEXT NOT NULL,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (source_id) REFERENCES sources(id)
);
`;

export const CREATE_RUNS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_runs_source_id ON runs(source_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at);
`;

export const CREATE_BACKUPS_TABLE = `
CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  event_count INTEGER NOT NULL,
  hash TEXT NOT NULL,
  metadata TEXT
);
`;

export const CREATE_BACKUPS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_backups_timestamp ON backups(timestamp);
`;

export const GET_METADATA = `
SELECT * FROM event_log_metadata WHERE id = 1;
`;

export const INSERT_METADATA = `
INSERT OR REPLACE INTO event_log_metadata 
(id, version, created_at, head_hash, algorithm, total_events, updated_at)
VALUES (1, @version, @createdAt, @headHash, @algorithm, @totalEvents, strftime('%s', 'now'));
`;

export const INSERT_EVENT = `
INSERT OR REPLACE INTO events 
(id, timestamp, event_type, source_id, payload, previous_hash, hash, signature)
VALUES (@id, @timestamp, @eventType, @sourceId, @payload, @previousHash, @hash, @signature);
`;

export const BATCH_INSERT_EVENTS = `
INSERT OR REPLACE INTO events 
(id, timestamp, event_type, source_id, payload, previous_hash, hash, signature)
VALUES 
${/* biome-ignore lint/style/useTemplate: dynamic SQL */ ''}
`;

export const GET_EVENTS_BY_RANGE = `
SELECT * FROM events 
WHERE timestamp >= @since AND timestamp < @until
ORDER BY timestamp ASC, created_at ASC
LIMIT @limit;
`;

export const GET_LATEST_EVENTS = `
SELECT * FROM events 
ORDER BY timestamp DESC, created_at DESC
LIMIT @limit;
`;

export const GET_EVENT_BY_ID = `
SELECT * FROM events WHERE id = @id;
`;

export const GET_EVENTS_BY_SOURCE = `
SELECT * FROM events 
WHERE source_id = @sourceId
ORDER BY timestamp ASC, created_at ASC
LIMIT @limit;
`;

export const GET_EVENTS_BY_TYPE = `
SELECT * FROM events 
WHERE event_type = @eventType
ORDER BY timestamp ASC, created_at ASC
LIMIT @limit;
`;

export const COUNT_EVENTS = `
SELECT COUNT(*) as count FROM events;
`;

export const GET_HEAD_EVENT = `
SELECT * FROM events 
ORDER BY timestamp DESC, created_at DESC
LIMIT 1;
`;

export const GET_HEAD_HASH = `
SELECT hash FROM events 
ORDER BY timestamp DESC, created_at DESC
LIMIT 1;
`;

export const DELETE_EVENT = `
DELETE FROM events WHERE id = @id;
`;

export const CLEAR_EVENTS = `
DELETE FROM events;
`;

export const INSERT_SOURCE = `
INSERT OR REPLACE INTO sources 
(id, name, type, config, created_at, updated_at)
VALUES (@id, @name, @type, @config, strftime('%s', 'now'), strftime('%s', 'now'));
`;

export const GET_SOURCES = `
SELECT * FROM sources;
`;

export const GET_SOURCE_BY_ID = `
SELECT * FROM sources WHERE id = @id;
`;

export const INSERT_RUN = `
INSERT INTO runs 
(id, source_id, started_at, ended_at, status, metadata)
VALUES (@id, @sourceId, @startedAt, @endedAt, @status, @metadata);
`;

export const UPDATE_RUN = `
UPDATE runs 
SET ended_at = @endedAt, status = @status, metadata = @metadata
WHERE id = @id;
`;

export const GET_RUNS_BY_SOURCE = `
SELECT * FROM runs 
WHERE source_id = @sourceId
ORDER BY started_at DESC
LIMIT @limit;
`;

export const GET_RUN_BY_ID = `
SELECT * FROM runs WHERE id = @id;
`;

export const INSERT_BACKUP = `
INSERT INTO backups 
(timestamp, file_path, event_count, hash, metadata)
VALUES (@timestamp, @filePath, @eventCount, @hash, @metadata);
`;

export const GET_BACKUPS = `
SELECT * FROM backups 
ORDER BY timestamp DESC
LIMIT @limit;
`;

export const GET_BACKUP_BY_ID = `
SELECT * FROM backups WHERE id = @id;
`;

export const DELETE_OLD_BACKUPS = `
DELETE FROM backups WHERE timestamp < @cutoff;
`;
