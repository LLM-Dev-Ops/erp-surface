/**
 * Base Event Types for ERP Surface Contracts
 *
 * All surface events extend BaseEvent to ensure observability by default.
 * Events are mode-invariant and support deterministic replay.
 */

import { UUID, CorrelationId, CausationId, SemanticVersion } from '../types/identity';
import { Timestamp } from '../types/temporal';

/** Base event interface - all surface events extend this */
export interface BaseEvent {
  /** Unique event identifier */
  readonly eventId: UUID;

  /** Event type discriminator */
  readonly eventType: string;

  /** Timestamp of event occurrence (injectable for replay) */
  readonly timestamp: Timestamp;

  /** Surface that emitted this event */
  readonly surface: string;

  /** Operation that triggered this event */
  readonly operation: string;

  /** Surface version for compatibility */
  readonly surfaceVersion: SemanticVersion;
}

/** Event with correlation context */
export interface CorrelatedEvent extends BaseEvent {
  /** Correlation ID for request tracing */
  readonly correlationId: CorrelationId;

  /** Causation ID linking to parent event */
  readonly causationId: CausationId | null;
}

/** Operation lifecycle events */
export type OperationEventType =
  | 'OPERATION_RECEIVED'
  | 'VALIDATION_STARTED'
  | 'VALIDATION_COMPLETED'
  | 'VALIDATION_FAILED'
  | 'EXECUTION_STARTED'
  | 'EXECUTION_COMPLETED'
  | 'EXECUTION_FAILED'
  | 'STATE_TRANSITION';

/** Operation received event */
export interface OperationReceivedEvent extends CorrelatedEvent {
  readonly eventType: 'OPERATION_RECEIVED';
  readonly operationName: string;
  readonly inputHash: string;
}

/** Validation completed event */
export interface ValidationCompletedEvent extends CorrelatedEvent {
  readonly eventType: 'VALIDATION_COMPLETED';
  readonly valid: boolean;
  readonly violationCount: number;
}

/** Validation failed event */
export interface ValidationFailedEvent extends CorrelatedEvent {
  readonly eventType: 'VALIDATION_FAILED';
  readonly violations: Array<{
    field: string;
    rule: string;
    message: string;
  }>;
}

/** Execution completed event */
export interface ExecutionCompletedEvent extends CorrelatedEvent {
  readonly eventType: 'EXECUTION_COMPLETED';
  readonly outputHash: string;
  readonly durationMs: number;
}

/** Execution failed event */
export interface ExecutionFailedEvent extends CorrelatedEvent {
  readonly eventType: 'EXECUTION_FAILED';
  readonly errorType: string;
  readonly errorCode: string;
  readonly recoverable: boolean;
}

/** State transition event */
export interface StateTransitionEvent extends CorrelatedEvent {
  readonly eventType: 'STATE_TRANSITION';
  readonly entityType: string;
  readonly entityId: string;
  readonly previousState: string;
  readonly newState: string;
  readonly trigger: string;
}

/** Event factory */
export const EventFactory = {
  /** Create operation received event */
  operationReceived(
    surface: string,
    operation: string,
    correlationId: CorrelationId,
    inputHash: string,
    surfaceVersion: SemanticVersion,
    timestamp: Timestamp,
    eventId: UUID
  ): OperationReceivedEvent {
    return {
      eventId,
      eventType: 'OPERATION_RECEIVED',
      timestamp,
      surface,
      operation,
      surfaceVersion,
      correlationId,
      causationId: null,
      operationName: operation,
      inputHash
    };
  },

  /** Create validation completed event */
  validationCompleted(
    surface: string,
    operation: string,
    correlationId: CorrelationId,
    causationId: CausationId,
    valid: boolean,
    violationCount: number,
    surfaceVersion: SemanticVersion,
    timestamp: Timestamp,
    eventId: UUID
  ): ValidationCompletedEvent {
    return {
      eventId,
      eventType: 'VALIDATION_COMPLETED',
      timestamp,
      surface,
      operation,
      surfaceVersion,
      correlationId,
      causationId,
      valid,
      violationCount
    };
  },

  /** Create state transition event */
  stateTransition(
    surface: string,
    operation: string,
    correlationId: CorrelationId,
    causationId: CausationId,
    entityType: string,
    entityId: string,
    previousState: string,
    newState: string,
    trigger: string,
    surfaceVersion: SemanticVersion,
    timestamp: Timestamp,
    eventId: UUID
  ): StateTransitionEvent {
    return {
      eventId,
      eventType: 'STATE_TRANSITION',
      timestamp,
      surface,
      operation,
      surfaceVersion,
      correlationId,
      causationId,
      entityType,
      entityId,
      previousState,
      newState,
      trigger
    };
  }
};
