/**
 * Replay Engine for ERP Surface Contracts
 *
 * Provides deterministic replay of captured traces for benchmarking
 * and verification. Supports composition with LLM-Test-Bench.
 */

import { Trace, AnyTraceEntry, OperationStartEntry, OperationEndEntry, StateChangeEntry, EventEmittedEntry } from './trace-schema';
import { TimestampProvider, createFixedTimestampProvider } from '../../common/types/temporal';
import { CorrelationId } from '../../common/types/identity';
import { Result, Results } from '../../common/types/result';
import { SurfaceError, ErrorFactory } from '../../common/errors/error-types';

/** Replay mode */
export type ReplayMode =
  | 'STRICT'      // Exact match required
  | 'LENIENT'     // Allow minor variations
  | 'VALIDATION'; // Only validate structure

/** Replay result */
export interface ReplayResult {
  /** Whether replay was successful */
  readonly success: boolean;

  /** Trace that was replayed */
  readonly traceId: string;

  /** Number of entries replayed */
  readonly entriesReplayed: number;

  /** Number of entries matched */
  readonly entriesMatched: number;

  /** Variances detected */
  readonly variances: ReplayVariance[];

  /** Total replay duration in milliseconds */
  readonly durationMs: number;

  /** Replay mode used */
  readonly mode: ReplayMode;
}

/** Replay variance */
export interface ReplayVariance {
  /** Entry sequence number */
  readonly sequenceNumber: number;

  /** Entry type */
  readonly entryType: string;

  /** Variance type */
  readonly varianceType: VarianceType;

  /** Expected value */
  readonly expected: unknown;

  /** Actual value */
  readonly actual: unknown;

  /** Severity */
  readonly severity: 'ERROR' | 'WARNING' | 'INFO';
}

/** Variance types */
export type VarianceType =
  | 'MISSING_ENTRY'
  | 'EXTRA_ENTRY'
  | 'OUTPUT_MISMATCH'
  | 'STATE_MISMATCH'
  | 'EVENT_MISMATCH'
  | 'TIMING_VARIANCE'
  | 'ORDER_VARIANCE';

/** Replay context */
export interface ReplayContext {
  /** Trace being replayed */
  readonly trace: Trace;

  /** Replay mode */
  readonly mode: ReplayMode;

  /** Timestamp provider for deterministic time */
  readonly timestampProvider: TimestampProvider;

  /** Current entry index */
  currentIndex: number;

  /** Detected variances */
  variances: ReplayVariance[];

  /** Replay start time */
  readonly startTime: number;
}

/** Surface binding for replay */
export interface ReplaySurfaceBinding<TInput, TOutput> {
  /** Surface name */
  readonly surface: string;

  /** Operation name */
  readonly operation: string;

  /** Execute operation with input */
  execute(input: TInput, correlationId: CorrelationId): Promise<Result<TOutput, SurfaceError>>;
}

/** Replay engine */
export const ReplayEngine = {
  /** Create replay context */
  createContext(
    trace: Trace,
    mode: ReplayMode = 'STRICT'
  ): ReplayContext {
    // Use first entry timestamp for deterministic replay
    const firstTimestamp = trace.entries[0]?.timestamp || trace.metadata.capturedAt;

    return {
      trace,
      mode,
      timestampProvider: createFixedTimestampProvider(firstTimestamp),
      currentIndex: 0,
      variances: [],
      startTime: Date.now()
    };
  },

  /** Replay a trace against a surface binding */
  async replay<TInput, TOutput>(
    trace: Trace,
    binding: ReplaySurfaceBinding<TInput, TOutput>,
    mode: ReplayMode = 'STRICT'
  ): Promise<ReplayResult> {
    const context = ReplayEngine.createContext(trace, mode);
    let entriesMatched = 0;

    // Filter operation entries for this surface
    const operationEntries = trace.entries.filter(
      (e): e is OperationStartEntry | OperationEndEntry =>
        (e.entryType === 'OPERATION_START' || e.entryType === 'OPERATION_END') &&
        e.surface === binding.surface &&
        e.operation === binding.operation
    );

    // Pair start/end entries
    const operationPairs: Array<{ start: OperationStartEntry; end: OperationEndEntry }> = [];
    for (let i = 0; i < operationEntries.length; i += 2) {
      const start = operationEntries[i];
      const end = operationEntries[i + 1];
      if (start?.entryType === 'OPERATION_START' && end?.entryType === 'OPERATION_END') {
        operationPairs.push({ start, end });
      }
    }

    // Replay each operation
    for (const pair of operationPairs) {
      const result = await binding.execute(
        pair.start.input as TInput,
        trace.correlationId
      );

      // Compare results
      if (result.success) {
        const actualHash = hashObject(result.data);
        if (actualHash === pair.end.outputHash) {
          entriesMatched += 2;
        } else if (mode === 'STRICT') {
          context.variances.push({
            sequenceNumber: pair.end.sequenceNumber,
            entryType: 'OPERATION_END',
            varianceType: 'OUTPUT_MISMATCH',
            expected: pair.end.outputHash,
            actual: actualHash,
            severity: 'ERROR'
          });
        } else {
          context.variances.push({
            sequenceNumber: pair.end.sequenceNumber,
            entryType: 'OPERATION_END',
            varianceType: 'OUTPUT_MISMATCH',
            expected: pair.end.outputHash,
            actual: actualHash,
            severity: 'WARNING'
          });
          entriesMatched += 1; // Partial match
        }
      } else {
        if (pair.end.success) {
          context.variances.push({
            sequenceNumber: pair.end.sequenceNumber,
            entryType: 'OPERATION_END',
            varianceType: 'OUTPUT_MISMATCH',
            expected: 'success',
            actual: 'failure',
            severity: 'ERROR'
          });
        } else {
          entriesMatched += 2; // Both failed as expected
        }
      }
    }

    const durationMs = Date.now() - context.startTime;

    return {
      success: context.variances.filter(v => v.severity === 'ERROR').length === 0,
      traceId: trace.metadata.traceId,
      entriesReplayed: operationPairs.length * 2,
      entriesMatched,
      variances: context.variances,
      durationMs,
      mode
    };
  },

  /** Validate trace structure without execution */
  validateStructure(trace: Trace): Result<boolean, SurfaceError> {
    const errors: string[] = [];

    // Validate metadata
    if (!trace.metadata.traceId) {
      errors.push('Missing trace ID');
    }
    if (!trace.metadata.surface) {
      errors.push('Missing surface name');
    }

    // Validate entry sequence
    let expectedSequence = 0;
    for (const entry of trace.entries) {
      if (entry.sequenceNumber !== expectedSequence) {
        errors.push(`Sequence gap at ${expectedSequence}, found ${entry.sequenceNumber}`);
      }
      expectedSequence++;
    }

    // Validate operation pairs
    const operationStack: OperationStartEntry[] = [];
    for (const entry of trace.entries) {
      if (entry.entryType === 'OPERATION_START') {
        operationStack.push(entry);
      } else if (entry.entryType === 'OPERATION_END') {
        const start = operationStack.pop();
        if (!start) {
          errors.push(`Unmatched operation end at sequence ${entry.sequenceNumber}`);
        } else if (start.operation !== entry.operation) {
          errors.push(`Operation mismatch: started ${start.operation}, ended ${entry.operation}`);
        }
      }
    }

    if (operationStack.length > 0) {
      errors.push(`${operationStack.length} unclosed operations`);
    }

    // Validate checksum
    const calculatedChecksum = calculateChecksum(trace.entries);
    if (calculatedChecksum !== trace.checksum) {
      errors.push('Checksum mismatch - trace may be corrupted');
    }

    if (errors.length > 0) {
      return Results.failure(
        ErrorFactory.businessRuleViolation(
          'ReplayEngine',
          'validateStructure',
          'TRACE_VALIDATION',
          `Trace validation failed: ${errors.join('; ')}`
        )
      );
    }

    return Results.success(true);
  },

  /** Compare two traces for equivalence */
  compareTraces(
    trace1: Trace,
    trace2: Trace,
    ignoreTimings: boolean = true
  ): ReplayVariance[] {
    const variances: ReplayVariance[] = [];

    // Compare entry counts
    if (trace1.entries.length !== trace2.entries.length) {
      variances.push({
        sequenceNumber: -1,
        entryType: 'TRACE',
        varianceType: trace1.entries.length > trace2.entries.length ? 'EXTRA_ENTRY' : 'MISSING_ENTRY',
        expected: trace1.entries.length,
        actual: trace2.entries.length,
        severity: 'ERROR'
      });
    }

    // Compare entries
    const minLength = Math.min(trace1.entries.length, trace2.entries.length);
    for (let i = 0; i < minLength; i++) {
      const e1 = trace1.entries[i];
      const e2 = trace2.entries[i];

      // Compare entry types
      if (e1.entryType !== e2.entryType) {
        variances.push({
          sequenceNumber: i,
          entryType: e1.entryType,
          varianceType: 'ORDER_VARIANCE',
          expected: e1.entryType,
          actual: e2.entryType,
          severity: 'ERROR'
        });
        continue;
      }

      // Compare specific entry types
      if (e1.entryType === 'OPERATION_END' && e2.entryType === 'OPERATION_END') {
        if (e1.outputHash !== e2.outputHash) {
          variances.push({
            sequenceNumber: i,
            entryType: 'OPERATION_END',
            varianceType: 'OUTPUT_MISMATCH',
            expected: e1.outputHash,
            actual: e2.outputHash,
            severity: 'ERROR'
          });
        }
      }

      if (e1.entryType === 'STATE_CHANGE' && e2.entryType === 'STATE_CHANGE') {
        if (e1.newState !== e2.newState) {
          variances.push({
            sequenceNumber: i,
            entryType: 'STATE_CHANGE',
            varianceType: 'STATE_MISMATCH',
            expected: e1.newState,
            actual: e2.newState,
            severity: 'ERROR'
          });
        }
      }

      // Compare timings if not ignored
      if (!ignoreTimings && e1.relativeTimeMs !== e2.relativeTimeMs) {
        const variance = Math.abs(e1.relativeTimeMs - e2.relativeTimeMs);
        if (variance > 100) { // 100ms tolerance
          variances.push({
            sequenceNumber: i,
            entryType: e1.entryType,
            varianceType: 'TIMING_VARIANCE',
            expected: e1.relativeTimeMs,
            actual: e2.relativeTimeMs,
            severity: 'WARNING'
          });
        }
      }
    }

    return variances;
  },

  /** Extract events from trace for verification */
  extractEvents(trace: Trace): string[] {
    return trace.entries
      .filter((e): e is EventEmittedEntry => e.entryType === 'EVENT_EMITTED')
      .map(e => e.event.eventType);
  },

  /** Extract state transitions from trace */
  extractStateTransitions(trace: Trace): Array<{ entityType: string; from: string; to: string }> {
    return trace.entries
      .filter((e): e is StateChangeEntry => e.entryType === 'STATE_CHANGE')
      .map(e => ({
        entityType: e.entityType,
        from: e.previousState,
        to: e.newState
      }));
  }
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
