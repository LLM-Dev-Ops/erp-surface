/**
 * General Ledger Observable Events
 *
 * All events emitted by General Ledger surface operations.
 * Events are immutable, typed, and support deterministic replay.
 */

import {
  BaseEvent,
  CorrelatedEvent,
  UUID,
  CorrelationId,
  CausationId,
  Timestamp,
  DocumentNumber,
  AccountNumber,
  CompanyCode,
  FiscalYear,
  FiscalPeriod,
  MonetaryAmount,
  SemanticVersion
} from '../../../common';

import { GENERAL_LEDGER_SURFACE, GENERAL_LEDGER_VERSION } from './contracts';
import { JournalState, DocumentLifecycleState } from './models';

// ============================================================================
// EVENT TYPE CONSTANTS
// ============================================================================

/** General Ledger event types */
export const GLEventType = {
  // Journal Entry Events
  JOURNAL_ENTRY_RECEIVED: 'GL.JOURNAL_ENTRY_RECEIVED',
  VALIDATION_COMPLETED: 'GL.VALIDATION_COMPLETED',
  POSTING_ATTEMPTED: 'GL.POSTING_ATTEMPTED',
  POSTING_COMPLETED: 'GL.POSTING_COMPLETED',
  POSTING_FAILED: 'GL.POSTING_FAILED',

  // Balance Query Events
  BALANCE_QUERY_RECEIVED: 'GL.BALANCE_QUERY_RECEIVED',
  BALANCE_QUERY_COMPLETED: 'GL.BALANCE_QUERY_COMPLETED',

  // State Transition Events
  JOURNAL_STATE_CHANGED: 'GL.JOURNAL_STATE_CHANGED',
  DOCUMENT_LIFECYCLE_CHANGED: 'GL.DOCUMENT_LIFECYCLE_CHANGED',

  // Account Events
  ACCOUNT_BALANCE_UPDATED: 'GL.ACCOUNT_BALANCE_UPDATED'
} as const;

export type GLEventType = typeof GLEventType[keyof typeof GLEventType];

// ============================================================================
// JOURNAL ENTRY EVENTS
// ============================================================================

/** Journal Entry Received event */
export interface JournalEntryReceivedEvent extends CorrelatedEvent {
  readonly eventType: typeof GLEventType.JOURNAL_ENTRY_RECEIVED;
  readonly surface: typeof GENERAL_LEDGER_SURFACE;
  readonly operation: 'PostJournalEntry';

  /** Journal entry details */
  readonly payload: {
    readonly companyCode: CompanyCode;
    readonly documentType: string;
    readonly postingDate: string;
    readonly lineCount: number;
    readonly totalAmount: MonetaryAmount;
    readonly inputHash: string;
  };
}

/** Validation Completed event */
export interface ValidationCompletedEvent extends CorrelatedEvent {
  readonly eventType: typeof GLEventType.VALIDATION_COMPLETED;
  readonly surface: typeof GENERAL_LEDGER_SURFACE;
  readonly operation: 'PostJournalEntry';

  /** Validation result details */
  readonly payload: {
    readonly valid: boolean;
    readonly violationCount: number;
    readonly violations: readonly ValidationViolationDetail[];
    readonly validationDurationMs: number;
  };
}

/** Validation violation detail */
export interface ValidationViolationDetail {
  readonly field: string;
  readonly rule: string;
  readonly message: string;
  readonly severity: 'ERROR' | 'WARNING';
}

/** Posting Attempted event */
export interface PostingAttemptedEvent extends CorrelatedEvent {
  readonly eventType: typeof GLEventType.POSTING_ATTEMPTED;
  readonly surface: typeof GENERAL_LEDGER_SURFACE;
  readonly operation: 'PostJournalEntry';

  /** Posting attempt details */
  readonly payload: {
    readonly companyCode: CompanyCode;
    readonly fiscalYear: FiscalYear;
    readonly fiscalPeriod: FiscalPeriod;
    readonly lineCount: number;
    readonly attemptTimestamp: Timestamp;
  };
}

/** Posting Completed event */
export interface PostingCompletedEvent extends CorrelatedEvent {
  readonly eventType: typeof GLEventType.POSTING_COMPLETED;
  readonly surface: typeof GENERAL_LEDGER_SURFACE;
  readonly operation: 'PostJournalEntry';

  /** Posting result details */
  readonly payload: {
    readonly documentNumber: DocumentNumber;
    readonly companyCode: CompanyCode;
    readonly fiscalYear: FiscalYear;
    readonly fiscalPeriod: FiscalPeriod;
    readonly lineCount: number;
    readonly totalDebits: MonetaryAmount;
    readonly totalCredits: MonetaryAmount;
    readonly postingDurationMs: number;
    readonly affectedAccounts: readonly AccountNumber[];
  };
}

/** Posting Failed event */
export interface PostingFailedEvent extends CorrelatedEvent {
  readonly eventType: typeof GLEventType.POSTING_FAILED;
  readonly surface: typeof GENERAL_LEDGER_SURFACE;
  readonly operation: 'PostJournalEntry';

  /** Failure details */
  readonly payload: {
    readonly errorCode: string;
    readonly errorMessage: string;
    readonly recoverable: boolean;
    readonly failedAtStep: string;
    readonly partialDocumentNumber?: DocumentNumber;
  };
}

// ============================================================================
// BALANCE QUERY EVENTS
// ============================================================================

/** Balance Query Received event */
export interface BalanceQueryReceivedEvent extends CorrelatedEvent {
  readonly eventType: typeof GLEventType.BALANCE_QUERY_RECEIVED;
  readonly surface: typeof GENERAL_LEDGER_SURFACE;
  readonly operation: 'GetAccountBalance';

  /** Query details */
  readonly payload: {
    readonly accountNumber: AccountNumber;
    readonly companyCode: CompanyCode;
    readonly fiscalYear: FiscalYear;
    readonly fiscalPeriod: FiscalPeriod;
    readonly balanceType: string;
  };
}

/** Balance Query Completed event */
export interface BalanceQueryCompletedEvent extends CorrelatedEvent {
  readonly eventType: typeof GLEventType.BALANCE_QUERY_COMPLETED;
  readonly surface: typeof GENERAL_LEDGER_SURFACE;
  readonly operation: 'GetAccountBalance';

  /** Query result details */
  readonly payload: {
    readonly accountNumber: AccountNumber;
    readonly balance: MonetaryAmount;
    readonly transactionCount: number;
    readonly queryDurationMs: number;
    readonly cacheHit: boolean;
  };
}

// ============================================================================
// STATE TRANSITION EVENTS
// ============================================================================

/** Journal State Changed event */
export interface JournalStateChangedEvent extends CorrelatedEvent {
  readonly eventType: typeof GLEventType.JOURNAL_STATE_CHANGED;
  readonly surface: typeof GENERAL_LEDGER_SURFACE;
  readonly operation: string;

  /** State change details */
  readonly payload: {
    readonly documentNumber: DocumentNumber;
    readonly previousState: JournalState;
    readonly newState: JournalState;
    readonly trigger: string;
    readonly changedBy: string;
  };
}

/** Document Lifecycle Changed event */
export interface DocumentLifecycleChangedEvent extends CorrelatedEvent {
  readonly eventType: typeof GLEventType.DOCUMENT_LIFECYCLE_CHANGED;
  readonly surface: typeof GENERAL_LEDGER_SURFACE;
  readonly operation: string;

  /** Lifecycle change details */
  readonly payload: {
    readonly documentNumber: DocumentNumber;
    readonly previousState: DocumentLifecycleState;
    readonly newState: DocumentLifecycleState;
    readonly trigger: string;
    readonly metadata?: Record<string, unknown>;
  };
}

// ============================================================================
// ACCOUNT EVENTS
// ============================================================================

/** Account Balance Updated event */
export interface AccountBalanceUpdatedEvent extends CorrelatedEvent {
  readonly eventType: typeof GLEventType.ACCOUNT_BALANCE_UPDATED;
  readonly surface: typeof GENERAL_LEDGER_SURFACE;
  readonly operation: string;

  /** Balance update details */
  readonly payload: {
    readonly accountNumber: AccountNumber;
    readonly companyCode: CompanyCode;
    readonly fiscalYear: FiscalYear;
    readonly fiscalPeriod: FiscalPeriod;
    readonly previousBalance: MonetaryAmount;
    readonly newBalance: MonetaryAmount;
    readonly changeAmount: MonetaryAmount;
    readonly documentNumber: DocumentNumber;
  };
}

// ============================================================================
// EVENT FACTORY
// ============================================================================

/** Factory for creating General Ledger events */
export const GLEventFactory = {
  /** Create Journal Entry Received event */
  journalEntryReceived(
    eventId: UUID,
    correlationId: CorrelationId,
    timestamp: Timestamp,
    payload: JournalEntryReceivedEvent['payload']
  ): JournalEntryReceivedEvent {
    return {
      eventId,
      eventType: GLEventType.JOURNAL_ENTRY_RECEIVED,
      timestamp,
      surface: GENERAL_LEDGER_SURFACE,
      operation: 'PostJournalEntry',
      surfaceVersion: GENERAL_LEDGER_VERSION as SemanticVersion,
      correlationId,
      causationId: null,
      payload
    };
  },

  /** Create Validation Completed event */
  validationCompleted(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    payload: ValidationCompletedEvent['payload']
  ): ValidationCompletedEvent {
    return {
      eventId,
      eventType: GLEventType.VALIDATION_COMPLETED,
      timestamp,
      surface: GENERAL_LEDGER_SURFACE,
      operation: 'PostJournalEntry',
      surfaceVersion: GENERAL_LEDGER_VERSION as SemanticVersion,
      correlationId,
      causationId,
      payload
    };
  },

  /** Create Posting Attempted event */
  postingAttempted(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    payload: PostingAttemptedEvent['payload']
  ): PostingAttemptedEvent {
    return {
      eventId,
      eventType: GLEventType.POSTING_ATTEMPTED,
      timestamp,
      surface: GENERAL_LEDGER_SURFACE,
      operation: 'PostJournalEntry',
      surfaceVersion: GENERAL_LEDGER_VERSION as SemanticVersion,
      correlationId,
      causationId,
      payload
    };
  },

  /** Create Posting Completed event */
  postingCompleted(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    payload: PostingCompletedEvent['payload']
  ): PostingCompletedEvent {
    return {
      eventId,
      eventType: GLEventType.POSTING_COMPLETED,
      timestamp,
      surface: GENERAL_LEDGER_SURFACE,
      operation: 'PostJournalEntry',
      surfaceVersion: GENERAL_LEDGER_VERSION as SemanticVersion,
      correlationId,
      causationId,
      payload
    };
  },

  /** Create Posting Failed event */
  postingFailed(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    payload: PostingFailedEvent['payload']
  ): PostingFailedEvent {
    return {
      eventId,
      eventType: GLEventType.POSTING_FAILED,
      timestamp,
      surface: GENERAL_LEDGER_SURFACE,
      operation: 'PostJournalEntry',
      surfaceVersion: GENERAL_LEDGER_VERSION as SemanticVersion,
      correlationId,
      causationId,
      payload
    };
  },

  /** Create Balance Query Received event */
  balanceQueryReceived(
    eventId: UUID,
    correlationId: CorrelationId,
    timestamp: Timestamp,
    payload: BalanceQueryReceivedEvent['payload']
  ): BalanceQueryReceivedEvent {
    return {
      eventId,
      eventType: GLEventType.BALANCE_QUERY_RECEIVED,
      timestamp,
      surface: GENERAL_LEDGER_SURFACE,
      operation: 'GetAccountBalance',
      surfaceVersion: GENERAL_LEDGER_VERSION as SemanticVersion,
      correlationId,
      causationId: null,
      payload
    };
  },

  /** Create Balance Query Completed event */
  balanceQueryCompleted(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    payload: BalanceQueryCompletedEvent['payload']
  ): BalanceQueryCompletedEvent {
    return {
      eventId,
      eventType: GLEventType.BALANCE_QUERY_COMPLETED,
      timestamp,
      surface: GENERAL_LEDGER_SURFACE,
      operation: 'GetAccountBalance',
      surfaceVersion: GENERAL_LEDGER_VERSION as SemanticVersion,
      correlationId,
      causationId,
      payload
    };
  },

  /** Create Journal State Changed event */
  journalStateChanged(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    operation: string,
    payload: JournalStateChangedEvent['payload']
  ): JournalStateChangedEvent {
    return {
      eventId,
      eventType: GLEventType.JOURNAL_STATE_CHANGED,
      timestamp,
      surface: GENERAL_LEDGER_SURFACE,
      operation,
      surfaceVersion: GENERAL_LEDGER_VERSION as SemanticVersion,
      correlationId,
      causationId,
      payload
    };
  },

  /** Create Document Lifecycle Changed event */
  documentLifecycleChanged(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    operation: string,
    payload: DocumentLifecycleChangedEvent['payload']
  ): DocumentLifecycleChangedEvent {
    return {
      eventId,
      eventType: GLEventType.DOCUMENT_LIFECYCLE_CHANGED,
      timestamp,
      surface: GENERAL_LEDGER_SURFACE,
      operation,
      surfaceVersion: GENERAL_LEDGER_VERSION as SemanticVersion,
      correlationId,
      causationId,
      payload
    };
  },

  /** Create Account Balance Updated event */
  accountBalanceUpdated(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    operation: string,
    payload: AccountBalanceUpdatedEvent['payload']
  ): AccountBalanceUpdatedEvent {
    return {
      eventId,
      eventType: GLEventType.ACCOUNT_BALANCE_UPDATED,
      timestamp,
      surface: GENERAL_LEDGER_SURFACE,
      operation,
      surfaceVersion: GENERAL_LEDGER_VERSION as SemanticVersion,
      correlationId,
      causationId,
      payload
    };
  }
};

// ============================================================================
// EVENT TYPE UNION
// ============================================================================

/** All General Ledger events */
export type GLEvent =
  | JournalEntryReceivedEvent
  | ValidationCompletedEvent
  | PostingAttemptedEvent
  | PostingCompletedEvent
  | PostingFailedEvent
  | BalanceQueryReceivedEvent
  | BalanceQueryCompletedEvent
  | JournalStateChangedEvent
  | DocumentLifecycleChangedEvent
  | AccountBalanceUpdatedEvent;

/** Event type discriminator */
export function isGLEvent(event: BaseEvent): event is GLEvent {
  return event.surface === GENERAL_LEDGER_SURFACE;
}

/** Narrow event by type */
export function narrowGLEvent<T extends GLEvent['eventType']>(
  event: GLEvent,
  eventType: T
): Extract<GLEvent, { eventType: T }> | null {
  if (event.eventType === eventType) {
    return event as Extract<GLEvent, { eventType: T }>;
  }
  return null;
}
