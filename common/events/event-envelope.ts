/**
 * Event Envelope for ERP Surface Contracts
 *
 * Standard envelope wrapping all surface events for platform composition.
 * Provides consistent metadata for LLM-Observatory and LLM-Memory-Graph.
 */

import { UUID, CorrelationId, CausationId, SemanticVersion } from '../types/identity';
import { Timestamp } from '../types/temporal';
import { BaseEvent } from './base-event';

/** Operational mode indicator */
export type OperationalMode = 'SIMULATION' | 'EXECUTION';

/** Trace context for distributed tracing */
export interface TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId: string | null;
  readonly sampled: boolean;
}

/** Event metadata */
export interface EventMetadata {
  /** Trace context for distributed tracing */
  readonly traceContext: TraceContext;

  /** Operational mode (simulation or execution) */
  readonly sourceMode: OperationalMode;

  /** Surface version */
  readonly surfaceVersion: SemanticVersion;

  /** Schema version for the event payload */
  readonly schemaVersion: SemanticVersion;

  /** Additional context tags */
  readonly tags: Record<string, string>;
}

/** Event envelope wrapping all surface events */
export interface EventEnvelope<T extends BaseEvent = BaseEvent> {
  /** Unique envelope identifier */
  readonly envelopeId: UUID;

  /** Correlation ID for request tracing */
  readonly correlationId: CorrelationId;

  /** Causation ID linking to parent event */
  readonly causationId: CausationId | null;

  /** Envelope creation timestamp */
  readonly timestamp: Timestamp;

  /** Surface that emitted this event */
  readonly surface: string;

  /** Operation that triggered this event */
  readonly operation: string;

  /** Event type discriminator */
  readonly eventType: string;

  /** Event payload */
  readonly payload: T;

  /** Event metadata */
  readonly metadata: EventMetadata;
}

/** Create default trace context */
export const createTraceContext = (
  traceId?: string,
  spanId?: string,
  parentSpanId?: string | null
): TraceContext => ({
  traceId: traceId || generateTraceId(),
  spanId: spanId || generateSpanId(),
  parentSpanId: parentSpanId ?? null,
  sampled: true
});

/** Generate trace ID */
const generateTraceId = (): string => {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

/** Generate span ID */
const generateSpanId = (): string => {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

/** Event envelope factory */
export const EnvelopeFactory = {
  /** Create event envelope */
  create<T extends BaseEvent>(
    event: T,
    correlationId: CorrelationId,
    causationId: CausationId | null,
    traceContext: TraceContext,
    sourceMode: OperationalMode,
    surfaceVersion: SemanticVersion,
    schemaVersion: SemanticVersion,
    tags: Record<string, string> = {},
    envelopeId?: UUID,
    timestamp?: Timestamp
  ): EventEnvelope<T> {
    return {
      envelopeId: envelopeId || generateEnvelopeId(),
      correlationId,
      causationId,
      timestamp: timestamp || new Date().toISOString(),
      surface: event.surface,
      operation: event.operation,
      eventType: event.eventType,
      payload: event,
      metadata: {
        traceContext,
        sourceMode,
        surfaceVersion,
        schemaVersion,
        tags
      }
    };
  },

  /** Create child envelope (continues trace) */
  createChild<T extends BaseEvent>(
    event: T,
    parentEnvelope: EventEnvelope,
    envelopeId?: UUID,
    timestamp?: Timestamp
  ): EventEnvelope<T> {
    const childTraceContext: TraceContext = {
      traceId: parentEnvelope.metadata.traceContext.traceId,
      spanId: generateSpanId(),
      parentSpanId: parentEnvelope.metadata.traceContext.spanId,
      sampled: parentEnvelope.metadata.traceContext.sampled
    };

    return EnvelopeFactory.create(
      event,
      parentEnvelope.correlationId,
      parentEnvelope.envelopeId,
      childTraceContext,
      parentEnvelope.metadata.sourceMode,
      parentEnvelope.metadata.surfaceVersion,
      parentEnvelope.metadata.schemaVersion,
      parentEnvelope.metadata.tags,
      envelopeId,
      timestamp
    );
  }
};

/** Generate envelope ID */
const generateEnvelopeId = (): UUID => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
