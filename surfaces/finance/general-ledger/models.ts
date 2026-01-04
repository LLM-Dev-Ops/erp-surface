/**
 * General Ledger State Machines and Behavioral Models
 *
 * State machines for journal entries and document lifecycle.
 * All state transitions are observable and deterministic.
 */

import { Timestamp, DocumentNumber, UserId } from '../../../common';

// ============================================================================
// JOURNAL STATE MACHINE
// ============================================================================

/** Journal states */
export const JournalState = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  REJECTED: 'REJECTED'
} as const;

export type JournalState = typeof JournalState[keyof typeof JournalState];

/** Journal state transitions */
export type JournalStateTransition =
  | { from: 'DRAFT'; to: 'POSTED'; trigger: 'POST' }
  | { from: 'DRAFT'; to: 'REJECTED'; trigger: 'REJECT' }
  | { from: 'POSTED'; to: 'DRAFT'; trigger: 'REVERSE' };

/** Valid transitions from each state */
export const JournalStateTransitions: Record<JournalState, JournalState[]> = {
  [JournalState.DRAFT]: [JournalState.POSTED, JournalState.REJECTED],
  [JournalState.POSTED]: [JournalState.DRAFT], // via reversal
  [JournalState.REJECTED]: [] // terminal state
};

/** Journal state machine */
export interface JournalStateMachine {
  /** Current state */
  readonly currentState: JournalState;

  /** Document number */
  readonly documentNumber: DocumentNumber | null;

  /** State history */
  readonly history: readonly JournalStateHistoryEntry[];

  /** Check if transition is valid */
  canTransition(targetState: JournalState): boolean;

  /** Execute transition */
  transition(
    targetState: JournalState,
    trigger: string,
    userId: UserId,
    timestamp: Timestamp
  ): JournalStateMachine;
}

/** State history entry */
export interface JournalStateHistoryEntry {
  readonly fromState: JournalState;
  readonly toState: JournalState;
  readonly trigger: string;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
  readonly reason?: string;
}

/** Create a new journal state machine */
export function createJournalStateMachine(
  initialState: JournalState = JournalState.DRAFT,
  documentNumber: DocumentNumber | null = null
): JournalStateMachine {
  const history: JournalStateHistoryEntry[] = [];

  return {
    currentState: initialState,
    documentNumber,
    history,

    canTransition(targetState: JournalState): boolean {
      return JournalStateTransitions[this.currentState].includes(targetState);
    },

    transition(
      targetState: JournalState,
      trigger: string,
      userId: UserId,
      timestamp: Timestamp
    ): JournalStateMachine {
      if (!this.canTransition(targetState)) {
        throw new Error(
          `Invalid transition from ${this.currentState} to ${targetState}`
        );
      }

      const newHistory: JournalStateHistoryEntry[] = [
        ...this.history,
        {
          fromState: this.currentState,
          toState: targetState,
          trigger,
          userId,
          timestamp
        }
      ];

      return {
        currentState: targetState,
        documentNumber: this.documentNumber,
        history: newHistory,
        canTransition: this.canTransition,
        transition: this.transition
      };
    }
  };
}

// ============================================================================
// DOCUMENT LIFECYCLE STATE MACHINE
// ============================================================================

/** Document lifecycle states */
export const DocumentLifecycleState = {
  CREATED: 'CREATED',
  VALIDATED: 'VALIDATED',
  POSTED: 'POSTED',
  REVERSED: 'REVERSED',
  ARCHIVED: 'ARCHIVED'
} as const;

export type DocumentLifecycleState = typeof DocumentLifecycleState[keyof typeof DocumentLifecycleState];

/** Document lifecycle transitions */
export type DocumentLifecycleTransition =
  | { from: 'CREATED'; to: 'VALIDATED'; trigger: 'VALIDATION_PASSED' }
  | { from: 'CREATED'; to: 'CREATED'; trigger: 'VALIDATION_FAILED' }
  | { from: 'VALIDATED'; to: 'POSTED'; trigger: 'SUCCESSFUL_POSTING' }
  | { from: 'VALIDATED'; to: 'CREATED'; trigger: 'POSTING_FAILED' }
  | { from: 'POSTED'; to: 'REVERSED'; trigger: 'REVERSAL' }
  | { from: 'POSTED'; to: 'ARCHIVED'; trigger: 'ARCHIVE' }
  | { from: 'REVERSED'; to: 'ARCHIVED'; trigger: 'ARCHIVE' };

/** Valid transitions from each document lifecycle state */
export const DocumentLifecycleTransitions: Record<DocumentLifecycleState, DocumentLifecycleState[]> = {
  [DocumentLifecycleState.CREATED]: [DocumentLifecycleState.VALIDATED, DocumentLifecycleState.CREATED],
  [DocumentLifecycleState.VALIDATED]: [DocumentLifecycleState.POSTED, DocumentLifecycleState.CREATED],
  [DocumentLifecycleState.POSTED]: [DocumentLifecycleState.REVERSED, DocumentLifecycleState.ARCHIVED],
  [DocumentLifecycleState.REVERSED]: [DocumentLifecycleState.ARCHIVED],
  [DocumentLifecycleState.ARCHIVED]: [] // terminal state
};

/** Document lifecycle state machine */
export interface DocumentLifecycleStateMachine {
  /** Current state */
  readonly currentState: DocumentLifecycleState;

  /** Document number */
  readonly documentNumber: DocumentNumber;

  /** Creation timestamp */
  readonly createdAt: Timestamp;

  /** Last state change timestamp */
  readonly lastStateChange: Timestamp;

  /** State history */
  readonly history: readonly DocumentLifecycleHistoryEntry[];

  /** Check if transition is valid */
  canTransition(targetState: DocumentLifecycleState): boolean;

  /** Execute transition */
  transition(
    targetState: DocumentLifecycleState,
    trigger: string,
    userId: UserId,
    timestamp: Timestamp,
    metadata?: Record<string, unknown>
  ): DocumentLifecycleStateMachine;
}

/** Document lifecycle history entry */
export interface DocumentLifecycleHistoryEntry {
  readonly fromState: DocumentLifecycleState;
  readonly toState: DocumentLifecycleState;
  readonly trigger: string;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
  readonly metadata?: Record<string, unknown>;
}

/** Create a new document lifecycle state machine */
export function createDocumentLifecycleStateMachine(
  documentNumber: DocumentNumber,
  createdAt: Timestamp
): DocumentLifecycleStateMachine {
  const history: DocumentLifecycleHistoryEntry[] = [];

  return {
    currentState: DocumentLifecycleState.CREATED,
    documentNumber,
    createdAt,
    lastStateChange: createdAt,
    history,

    canTransition(targetState: DocumentLifecycleState): boolean {
      return DocumentLifecycleTransitions[this.currentState].includes(targetState);
    },

    transition(
      targetState: DocumentLifecycleState,
      trigger: string,
      userId: UserId,
      timestamp: Timestamp,
      metadata?: Record<string, unknown>
    ): DocumentLifecycleStateMachine {
      if (!this.canTransition(targetState)) {
        throw new Error(
          `Invalid document lifecycle transition from ${this.currentState} to ${targetState}`
        );
      }

      const newHistory: DocumentLifecycleHistoryEntry[] = [
        ...this.history,
        {
          fromState: this.currentState,
          toState: targetState,
          trigger,
          userId,
          timestamp,
          metadata
        }
      ];

      return {
        currentState: targetState,
        documentNumber: this.documentNumber,
        createdAt: this.createdAt,
        lastStateChange: timestamp,
        history: newHistory,
        canTransition: this.canTransition,
        transition: this.transition
      };
    }
  };
}

// ============================================================================
// POSTING PERIOD STATE MACHINE
// ============================================================================

/** Posting period states */
export const PostingPeriodState = {
  OPEN: 'OPEN',
  SOFT_CLOSE: 'SOFT_CLOSE',
  HARD_CLOSE: 'HARD_CLOSE',
  YEAR_END: 'YEAR_END'
} as const;

export type PostingPeriodState = typeof PostingPeriodState[keyof typeof PostingPeriodState];

/** Posting period transitions */
export const PostingPeriodTransitions: Record<PostingPeriodState, PostingPeriodState[]> = {
  [PostingPeriodState.OPEN]: [PostingPeriodState.SOFT_CLOSE],
  [PostingPeriodState.SOFT_CLOSE]: [PostingPeriodState.OPEN, PostingPeriodState.HARD_CLOSE],
  [PostingPeriodState.HARD_CLOSE]: [PostingPeriodState.YEAR_END],
  [PostingPeriodState.YEAR_END]: [] // terminal for the year
};

/** Posting period state machine */
export interface PostingPeriodStateMachine {
  /** Current state */
  readonly currentState: PostingPeriodState;

  /** Fiscal year */
  readonly fiscalYear: number;

  /** Fiscal period */
  readonly fiscalPeriod: number;

  /** Check if posting is allowed */
  readonly isPostingAllowed: boolean;

  /** Check if transition is valid */
  canTransition(targetState: PostingPeriodState): boolean;
}

/** Create posting period state machine */
export function createPostingPeriodStateMachine(
  fiscalYear: number,
  fiscalPeriod: number,
  initialState: PostingPeriodState = PostingPeriodState.OPEN
): PostingPeriodStateMachine {
  return {
    currentState: initialState,
    fiscalYear,
    fiscalPeriod,

    get isPostingAllowed(): boolean {
      return this.currentState === PostingPeriodState.OPEN;
    },

    canTransition(targetState: PostingPeriodState): boolean {
      return PostingPeriodTransitions[this.currentState].includes(targetState);
    }
  };
}

// ============================================================================
// STATE MACHINE GUARDS
// ============================================================================

/** Guards for state transitions */
export const StateMachineGuards = {
  /** Check if journal can be posted */
  canPost(machine: JournalStateMachine): boolean {
    return machine.currentState === JournalState.DRAFT;
  },

  /** Check if journal can be rejected */
  canReject(machine: JournalStateMachine): boolean {
    return machine.currentState === JournalState.DRAFT;
  },

  /** Check if journal can be reversed */
  canReverse(machine: JournalStateMachine): boolean {
    return machine.currentState === JournalState.POSTED;
  },

  /** Check if document can be archived */
  canArchive(machine: DocumentLifecycleStateMachine): boolean {
    return (
      machine.currentState === DocumentLifecycleState.POSTED ||
      machine.currentState === DocumentLifecycleState.REVERSED
    );
  }
};

// ============================================================================
// STATE MACHINE ACTIONS
// ============================================================================

/** Actions that can be performed on state machines */
export const StateMachineActions = {
  /** Post a journal entry */
  postJournal(
    machine: JournalStateMachine,
    userId: UserId,
    timestamp: Timestamp
  ): JournalStateMachine {
    if (!StateMachineGuards.canPost(machine)) {
      throw new Error('Journal cannot be posted in current state');
    }
    return machine.transition(JournalState.POSTED, 'POST', userId, timestamp);
  },

  /** Reject a journal entry */
  rejectJournal(
    machine: JournalStateMachine,
    userId: UserId,
    timestamp: Timestamp,
    _reason: string
  ): JournalStateMachine {
    if (!StateMachineGuards.canReject(machine)) {
      throw new Error('Journal cannot be rejected in current state');
    }
    return machine.transition(JournalState.REJECTED, 'REJECT', userId, timestamp);
  },

  /** Reverse a journal entry */
  reverseJournal(
    machine: JournalStateMachine,
    userId: UserId,
    timestamp: Timestamp
  ): JournalStateMachine {
    if (!StateMachineGuards.canReverse(machine)) {
      throw new Error('Journal cannot be reversed in current state');
    }
    return machine.transition(JournalState.DRAFT, 'REVERSE', userId, timestamp);
  }
};
