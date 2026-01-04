/**
 * Trace Schema for ERP Surface Contracts
 *
 * Defines trace structures for deterministic replay and benchmarking.
 * Supports composition with LLM-Test-Bench for benchmark scenarios.
 */

import { UUID, CorrelationId, SemanticVersion } from '../../common/types/identity';
import { Timestamp } from '../../common/types/temporal';
import { EventEnvelope, OperationalMode } from '../../common/events/event-envelope';
import { SurfaceError } from '../../common/errors/error-types';

/** Trace identifier */
export type TraceId = string;

/** Trace entry type */
export type TraceEntryType =
  | 'OPERATION_START'
  | 'OPERATION_END'
  | 'STATE_CHANGE'
  | 'EVENT_EMITTED'
  | 'ERROR_OCCURRED'
  | 'CHECKPOINT';

/** Base trace entry */
export interface TraceEntry {
  /** Unique entry identifier */
  readonly entryId: UUID;

  /** Entry type discriminator */
  readonly entryType: TraceEntryType;

  /** Sequence number within trace */
  readonly sequenceNumber: number;

  /** Timestamp of entry (injectable for replay) */
  readonly timestamp: Timestamp;

  /** Relative time from trace start in milliseconds */
  readonly relativeTimeMs: number;
}

/** Operation start entry */
export interface OperationStartEntry extends TraceEntry {
  readonly entryType: 'OPERATION_START';
  readonly surface: string;
  readonly operation: string;
  readonly input: unknown;
  readonly inputHash: string;
}

/** Operation end entry */
export interface OperationEndEntry extends TraceEntry {
  readonly entryType: 'OPERATION_END';
  readonly surface: string;
  readonly operation: string;
  readonly output: unknown;
  readonly outputHash: string;
  readonly durationMs: number;
  readonly success: boolean;
}

/** State change entry */
export interface StateChangeEntry extends TraceEntry {
  readonly entryType: 'STATE_CHANGE';
  readonly entityType: string;
  readonly entityId: string;
  readonly previousState: string;
  readonly newState: string;
  readonly trigger: string;
}

/** Event emitted entry */
export interface EventEmittedEntry extends TraceEntry {
  readonly entryType: 'EVENT_EMITTED';
  readonly event: EventEnvelope;
}

/** Error occurred entry */
export interface ErrorOccurredEntry extends TraceEntry {
  readonly entryType: 'ERROR_OCCURRED';
  readonly error: SurfaceError;
  readonly recoverable: boolean;
}

/** Checkpoint entry for replay synchronization */
export interface CheckpointEntry extends TraceEntry {
  readonly entryType: 'CHECKPOINT';
  readonly checkpointId: string;
  readonly stateSnapshot: Record<string, unknown>;
}

/** Union type for all trace entries */
export type AnyTraceEntry =
  | OperationStartEntry
  | OperationEndEntry
  | StateChangeEntry
  | EventEmittedEntry
  | ErrorOccurredEntry
  | CheckpointEntry;

/** Trace metadata */
export interface TraceMetadata {
  /** Trace identifier */
  readonly traceId: TraceId;

  /** Trace name/description */
  readonly name: string;

  /** Trace version */
  readonly version: SemanticVersion;

  /** Surface being traced */
  readonly surface: string;

  /** Surface version */
  readonly surfaceVersion: SemanticVersion;

  /** Operational mode during capture */
  readonly mode: OperationalMode;

  /** Trace capture start time */
  readonly capturedAt: Timestamp;

  /** Total duration of trace in milliseconds */
  readonly durationMs: number;

  /** Number of entries in trace */
  readonly entryCount: number;

  /** Tags for categorization */
  readonly tags: string[];
}

/** Complete trace structure */
export interface Trace {
  /** Trace metadata */
  readonly metadata: TraceMetadata;

  /** Root correlation ID */
  readonly correlationId: CorrelationId;

  /** Initial state snapshot */
  readonly initialState: Record<string, unknown>;

  /** Final state snapshot */
  readonly finalState: Record<string, unknown>;

  /** Ordered trace entries */
  readonly entries: AnyTraceEntry[];

  /** Expected events (for replay verification) */
  readonly expectedEvents: string[];

  /** Verification checksum */
  readonly checksum: string;
}

/** Trace capture context */
export interface TraceCaptureContext {
  /** Trace being captured */
  readonly traceId: TraceId;

  /** Capture start time */
  readonly startTime: Timestamp;

  /** Current sequence number */
  sequenceNumber: number;

  /** Accumulated entries */
  entries: AnyTraceEntry[];
}

/** Trace capture operations */
export const TraceCapture = {
  /** Start a new trace capture */
  start(
    name: string,
    surface: string,
    surfaceVersion: SemanticVersion,
    mode: OperationalMode,
    initialState: Record<string, unknown>,
    correlationId: CorrelationId,
    traceId?: TraceId,
    timestamp?: Timestamp
  ): TraceCaptureContext & { metadata: Partial<TraceMetadata>; initialState: Record<string, unknown>; correlationId: CorrelationId } {
    const id = traceId || generateTraceId();
    const ts = timestamp || new Date().toISOString();

    return {
      traceId: id,
      startTime: ts,
      sequenceNumber: 0,
      entries: [],
      metadata: {
        traceId: id,
        name,
        surface,
        surfaceVersion,
        mode,
        capturedAt: ts
      },
      initialState,
      correlationId
    };
  },

  /** Record operation start */
  recordOperationStart(
    context: TraceCaptureContext,
    surface: string,
    operation: string,
    input: unknown,
    timestamp?: Timestamp
  ): OperationStartEntry {
    const entry: OperationStartEntry = {
      entryId: generateEntryId(),
      entryType: 'OPERATION_START',
      sequenceNumber: context.sequenceNumber++,
      timestamp: timestamp || new Date().toISOString(),
      relativeTimeMs: calculateRelativeTime(context.startTime, timestamp),
      surface,
      operation,
      input,
      inputHash: hashObject(input)
    };
    context.entries.push(entry);
    return entry;
  },

  /** Record operation end */
  recordOperationEnd(
    context: TraceCaptureContext,
    surface: string,
    operation: string,
    output: unknown,
    success: boolean,
    startTime: Timestamp,
    timestamp?: Timestamp
  ): OperationEndEntry {
    const ts = timestamp || new Date().toISOString();
    const entry: OperationEndEntry = {
      entryId: generateEntryId(),
      entryType: 'OPERATION_END',
      sequenceNumber: context.sequenceNumber++,
      timestamp: ts,
      relativeTimeMs: calculateRelativeTime(context.startTime, ts),
      surface,
      operation,
      output,
      outputHash: hashObject(output),
      durationMs: calculateRelativeTime(startTime, ts),
      success
    };
    context.entries.push(entry);
    return entry;
  },

  /** Record state change */
  recordStateChange(
    context: TraceCaptureContext,
    entityType: string,
    entityId: string,
    previousState: string,
    newState: string,
    trigger: string,
    timestamp?: Timestamp
  ): StateChangeEntry {
    const ts = timestamp || new Date().toISOString();
    const entry: StateChangeEntry = {
      entryId: generateEntryId(),
      entryType: 'STATE_CHANGE',
      sequenceNumber: context.sequenceNumber++,
      timestamp: ts,
      relativeTimeMs: calculateRelativeTime(context.startTime, ts),
      entityType,
      entityId,
      previousState,
      newState,
      trigger
    };
    context.entries.push(entry);
    return entry;
  },

  /** Record event emission */
  recordEvent(
    context: TraceCaptureContext,
    event: EventEnvelope,
    timestamp?: Timestamp
  ): EventEmittedEntry {
    const ts = timestamp || new Date().toISOString();
    const entry: EventEmittedEntry = {
      entryId: generateEntryId(),
      entryType: 'EVENT_EMITTED',
      sequenceNumber: context.sequenceNumber++,
      timestamp: ts,
      relativeTimeMs: calculateRelativeTime(context.startTime, ts),
      event
    };
    context.entries.push(entry);
    return entry;
  },

  /** Record error */
  recordError(
    context: TraceCaptureContext,
    error: SurfaceError,
    timestamp?: Timestamp
  ): ErrorOccurredEntry {
    const ts = timestamp || new Date().toISOString();
    const entry: ErrorOccurredEntry = {
      entryId: generateEntryId(),
      entryType: 'ERROR_OCCURRED',
      sequenceNumber: context.sequenceNumber++,
      timestamp: ts,
      relativeTimeMs: calculateRelativeTime(context.startTime, ts),
      error,
      recoverable: error.recoverable
    };
    context.entries.push(entry);
    return entry;
  },

  /** Create checkpoint */
  createCheckpoint(
    context: TraceCaptureContext,
    checkpointId: string,
    stateSnapshot: Record<string, unknown>,
    timestamp?: Timestamp
  ): CheckpointEntry {
    const ts = timestamp || new Date().toISOString();
    const entry: CheckpointEntry = {
      entryId: generateEntryId(),
      entryType: 'CHECKPOINT',
      sequenceNumber: context.sequenceNumber++,
      timestamp: ts,
      relativeTimeMs: calculateRelativeTime(context.startTime, ts),
      checkpointId,
      stateSnapshot
    };
    context.entries.push(entry);
    return entry;
  },

  /** Complete trace capture */
  complete(
    context: TraceCaptureContext & { metadata: Partial<TraceMetadata>; initialState: Record<string, unknown>; correlationId: CorrelationId },
    finalState: Record<string, unknown>,
    tags: string[] = [],
    timestamp?: Timestamp
  ): Trace {
    const ts = timestamp || new Date().toISOString();
    const durationMs = calculateRelativeTime(context.startTime, ts);

    const expectedEvents = context.entries
      .filter((e): e is EventEmittedEntry => e.entryType === 'EVENT_EMITTED')
      .map(e => e.event.eventType);

    const trace: Trace = {
      metadata: {
        traceId: context.traceId,
        name: context.metadata.name || '',
        version: '1.0.0',
        surface: context.metadata.surface || '',
        surfaceVersion: context.metadata.surfaceVersion || '1.0.0',
        mode: context.metadata.mode || 'SIMULATION',
        capturedAt: context.startTime,
        durationMs,
        entryCount: context.entries.length,
        tags
      },
      correlationId: context.correlationId,
      initialState: context.initialState,
      finalState,
      entries: context.entries,
      expectedEvents,
      checksum: calculateChecksum(context.entries)
    };

    return trace;
  }
};

/** Generate trace ID */
const generateTraceId = (): TraceId => {
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/** Generate entry ID */
const generateEntryId = (): UUID => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/** Calculate relative time from start */
const calculateRelativeTime = (startTime: Timestamp, currentTime?: Timestamp): number => {
  const current = currentTime ? new Date(currentTime).getTime() : Date.now();
  return current - new Date(startTime).getTime();
};

/** Hash an object for comparison */
const hashObject = (obj: unknown): string => {
  const str = JSON.stringify(obj, Object.keys(obj as object).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

/** Calculate trace checksum */
const calculateChecksum = (entries: AnyTraceEntry[]): string => {
  const entriesStr = JSON.stringify(entries.map(e => ({
    type: e.entryType,
    seq: e.sequenceNumber
  })));
  return hashObject(entriesStr);
};
