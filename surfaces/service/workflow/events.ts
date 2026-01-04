/**
 * Workflow Management Events
 *
 * Observable events for workflow and task lifecycle tracking.
 * All events extend CorrelatedEvent for traceability.
 */

import {
  UUID,
  UserId,
  Identifier,
  Timestamp,
  CorrelationId,
  CausationId,
  SemanticVersion,
  CorrelatedEvent,
  EntityReference
} from '../../../common';

import {
  WorkflowState,
  TaskState,
  TaskType,
  TaskOutcome,
  WorkflowPriority,
  EscalationLevel
} from './models';

// ============================================================================
// Surface Constants
// ============================================================================

const SURFACE_NAME = 'WorkflowSurface';
const SURFACE_VERSION: SemanticVersion = '1.0.0';

// ============================================================================
// Base Workflow Event
// ============================================================================

/** Base workflow event */
interface WorkflowBaseEvent extends CorrelatedEvent {
  readonly surface: typeof SURFACE_NAME;
  readonly workflowId: UUID;
  readonly workflowNumber: string;
}

/** Base task event */
interface TaskBaseEvent extends WorkflowBaseEvent {
  readonly taskId: UUID;
  readonly taskName: string;
}

// ============================================================================
// Workflow Lifecycle Events
// ============================================================================

/** Workflow initiated event */
export interface WorkflowInitiatedEvent extends WorkflowBaseEvent {
  readonly eventType: 'WORKFLOW_INITIATED';
  readonly operation: 'InitiateWorkflow';
  readonly definitionId: UUID;
  readonly subject: EntityReference;
  readonly initiatedBy: UserId;
  readonly priority: WorkflowPriority;
  readonly dueDate?: Timestamp;
  readonly initialTasks: string[];  // Task names
}

/** Workflow started event */
export interface WorkflowStartedEvent extends WorkflowBaseEvent {
  readonly eventType: 'WORKFLOW_STARTED';
  readonly operation: 'StartWorkflow';
  readonly previousState: WorkflowState;
  readonly newState: WorkflowState;
}

/** Workflow completed event */
export interface WorkflowCompletedEvent extends WorkflowBaseEvent {
  readonly eventType: 'WORKFLOW_COMPLETED';
  readonly operation: 'CompleteWorkflow';
  readonly previousState: WorkflowState;
  readonly newState: WorkflowState;
  readonly outcome: WorkflowOutcome;
  readonly completedTasks: number;
  readonly totalTasks: number;
  readonly durationMs: number;
  readonly slaAchieved: boolean;
}

/** Workflow outcome */
export type WorkflowOutcome =
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';

/** Workflow cancelled event */
export interface WorkflowCancelledEvent extends WorkflowBaseEvent {
  readonly eventType: 'WORKFLOW_CANCELLED';
  readonly operation: 'CancelWorkflow';
  readonly previousState: WorkflowState;
  readonly newState: WorkflowState;
  readonly cancelledBy: UserId;
  readonly reason: string;
  readonly pendingTasks: string[];  // Task names that were pending
}

// ============================================================================
// Task Lifecycle Events
// ============================================================================

/** Task assigned event */
export interface TaskAssignedEvent extends TaskBaseEvent {
  readonly eventType: 'TASK_ASSIGNED';
  readonly operation: 'AssignTask';
  readonly previousState: TaskState;
  readonly newState: TaskState;
  readonly taskType: TaskType;
  readonly assignedTo: UserId;
  readonly assignedGroup?: Identifier;
  readonly assignedBy: 'SYSTEM' | UserId;
  readonly dueDate?: Timestamp;
}

/** Task completed event */
export interface TaskCompletedEvent extends TaskBaseEvent {
  readonly eventType: 'TASK_COMPLETED';
  readonly operation: 'CompleteTask';
  readonly previousState: TaskState;
  readonly newState: TaskState;
  readonly taskType: TaskType;
  readonly outcome: TaskOutcome;
  readonly completedBy: UserId;
  readonly durationMs: number;
  readonly nextTasks: string[];  // Names of tasks activated by this completion
}

/** Task rejected event */
export interface TaskRejectedEvent extends TaskBaseEvent {
  readonly eventType: 'TASK_REJECTED';
  readonly operation: 'RejectTask';
  readonly previousState: TaskState;
  readonly newState: TaskState;
  readonly taskType: TaskType;
  readonly rejectedBy: UserId;
  readonly reason: string;
  readonly reassignable: boolean;
}

/** Task delegated event */
export interface TaskDelegatedEvent extends TaskBaseEvent {
  readonly eventType: 'TASK_DELEGATED';
  readonly operation: 'DelegateTask';
  readonly delegatedFrom: UserId;
  readonly delegatedTo: UserId;
  readonly reason?: string;
}

/** Task reassigned event */
export interface TaskReassignedEvent extends TaskBaseEvent {
  readonly eventType: 'TASK_REASSIGNED';
  readonly operation: 'ReassignTask';
  readonly previousAssignee?: UserId;
  readonly newAssignee: UserId;
  readonly reassignedBy: UserId;
  readonly reason: string;
}

// ============================================================================
// Escalation Events
// ============================================================================

/** Escalation occurred event */
export interface EscalationOccurredEvent extends TaskBaseEvent {
  readonly eventType: 'ESCALATION_OCCURRED';
  readonly operation: 'EscalateTask';
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly escalationReason: EscalationReason;
  readonly triggeredBy: 'SYSTEM' | UserId;
  readonly newAssignee?: UserId;
  readonly notifiedUsers: UserId[];
  readonly notifiedGroups: Identifier[];
  readonly autoAction?: string;
}

/** Escalation reasons */
export type EscalationReason =
  | 'TIMEOUT'
  | 'MANUAL'
  | 'SLA_WARNING'
  | 'SLA_BREACH'
  | 'PRIORITY_CHANGE';

// ============================================================================
// SLA Events
// ============================================================================

/** SLA warning event */
export interface SLAWarningEvent extends WorkflowBaseEvent {
  readonly eventType: 'SLA_WARNING';
  readonly operation: 'MonitorSLA';
  readonly taskId?: UUID;
  readonly taskName?: string;
  readonly warningType: SLAWarningType;
  readonly dueDate: Timestamp;
  readonly remainingMs: number;
  readonly percentComplete: number;
}

/** SLA warning types */
export type SLAWarningType =
  | 'WORKFLOW_DUE_SOON'
  | 'TASK_DUE_SOON'
  | 'APPROACHING_THRESHOLD';

/** SLA breach event */
export interface SLABreachEvent extends WorkflowBaseEvent {
  readonly eventType: 'SLA_BREACH';
  readonly operation: 'MonitorSLA';
  readonly taskId?: UUID;
  readonly taskName?: string;
  readonly breachType: SLABreachType;
  readonly dueDate: Timestamp;
  readonly overageMs: number;
  readonly actionsTaken: string[];
}

/** SLA breach types */
export type SLABreachType =
  | 'WORKFLOW_OVERDUE'
  | 'TASK_OVERDUE';

// ============================================================================
// Comment Events
// ============================================================================

/** Comment added event */
export interface CommentAddedEvent extends TaskBaseEvent {
  readonly eventType: 'COMMENT_ADDED';
  readonly operation: 'AddComment';
  readonly commentId: UUID;
  readonly addedBy: UserId;
  readonly visibility: 'PUBLIC' | 'INTERNAL';
}

// ============================================================================
// Union Types
// ============================================================================

/** All workflow events */
export type WorkflowEvent =
  | WorkflowInitiatedEvent
  | WorkflowStartedEvent
  | WorkflowCompletedEvent
  | WorkflowCancelledEvent
  | TaskAssignedEvent
  | TaskCompletedEvent
  | TaskRejectedEvent
  | TaskDelegatedEvent
  | TaskReassignedEvent
  | EscalationOccurredEvent
  | SLAWarningEvent
  | SLABreachEvent
  | CommentAddedEvent;

// ============================================================================
// Event Factory
// ============================================================================

/** Factory for creating workflow events */
export const WorkflowEventFactory = {
  /** Create workflow initiated event */
  workflowInitiated(
    eventId: UUID,
    correlationId: CorrelationId,
    timestamp: Timestamp,
    workflowId: UUID,
    workflowNumber: string,
    definitionId: UUID,
    subject: EntityReference,
    initiatedBy: UserId,
    priority: WorkflowPriority,
    initialTasks: string[],
    dueDate?: Timestamp
  ): WorkflowInitiatedEvent {
    return {
      eventId,
      eventType: 'WORKFLOW_INITIATED',
      timestamp,
      surface: SURFACE_NAME,
      operation: 'InitiateWorkflow',
      surfaceVersion: SURFACE_VERSION,
      correlationId,
      causationId: null,
      workflowId,
      workflowNumber,
      definitionId,
      subject,
      initiatedBy,
      priority,
      dueDate,
      initialTasks
    };
  },

  /** Create task assigned event */
  taskAssigned(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    workflowId: UUID,
    workflowNumber: string,
    taskId: UUID,
    taskName: string,
    previousState: TaskState,
    newState: TaskState,
    taskType: TaskType,
    assignedTo: UserId,
    assignedBy: 'SYSTEM' | UserId,
    assignedGroup?: Identifier,
    dueDate?: Timestamp
  ): TaskAssignedEvent {
    return {
      eventId,
      eventType: 'TASK_ASSIGNED',
      timestamp,
      surface: SURFACE_NAME,
      operation: 'AssignTask',
      surfaceVersion: SURFACE_VERSION,
      correlationId,
      causationId,
      workflowId,
      workflowNumber,
      taskId,
      taskName,
      previousState,
      newState,
      taskType,
      assignedTo,
      assignedGroup,
      assignedBy,
      dueDate
    };
  },

  /** Create task completed event */
  taskCompleted(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    workflowId: UUID,
    workflowNumber: string,
    taskId: UUID,
    taskName: string,
    previousState: TaskState,
    newState: TaskState,
    taskType: TaskType,
    outcome: TaskOutcome,
    completedBy: UserId,
    durationMs: number,
    nextTasks: string[]
  ): TaskCompletedEvent {
    return {
      eventId,
      eventType: 'TASK_COMPLETED',
      timestamp,
      surface: SURFACE_NAME,
      operation: 'CompleteTask',
      surfaceVersion: SURFACE_VERSION,
      correlationId,
      causationId,
      workflowId,
      workflowNumber,
      taskId,
      taskName,
      previousState,
      newState,
      taskType,
      outcome,
      completedBy,
      durationMs,
      nextTasks
    };
  },

  /** Create task rejected event */
  taskRejected(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    workflowId: UUID,
    workflowNumber: string,
    taskId: UUID,
    taskName: string,
    previousState: TaskState,
    newState: TaskState,
    taskType: TaskType,
    rejectedBy: UserId,
    reason: string,
    reassignable: boolean
  ): TaskRejectedEvent {
    return {
      eventId,
      eventType: 'TASK_REJECTED',
      timestamp,
      surface: SURFACE_NAME,
      operation: 'RejectTask',
      surfaceVersion: SURFACE_VERSION,
      correlationId,
      causationId,
      workflowId,
      workflowNumber,
      taskId,
      taskName,
      previousState,
      newState,
      taskType,
      rejectedBy,
      reason,
      reassignable
    };
  },

  /** Create workflow completed event */
  workflowCompleted(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    workflowId: UUID,
    workflowNumber: string,
    previousState: WorkflowState,
    newState: WorkflowState,
    outcome: WorkflowOutcome,
    completedTasks: number,
    totalTasks: number,
    durationMs: number,
    slaAchieved: boolean
  ): WorkflowCompletedEvent {
    return {
      eventId,
      eventType: 'WORKFLOW_COMPLETED',
      timestamp,
      surface: SURFACE_NAME,
      operation: 'CompleteWorkflow',
      surfaceVersion: SURFACE_VERSION,
      correlationId,
      causationId,
      workflowId,
      workflowNumber,
      previousState,
      newState,
      outcome,
      completedTasks,
      totalTasks,
      durationMs,
      slaAchieved
    };
  },

  /** Create escalation occurred event */
  escalationOccurred(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    workflowId: UUID,
    workflowNumber: string,
    taskId: UUID,
    taskName: string,
    previousLevel: number,
    newLevel: number,
    escalationReason: EscalationReason,
    triggeredBy: 'SYSTEM' | UserId,
    notifiedUsers: UserId[],
    notifiedGroups: Identifier[],
    newAssignee?: UserId,
    autoAction?: string
  ): EscalationOccurredEvent {
    return {
      eventId,
      eventType: 'ESCALATION_OCCURRED',
      timestamp,
      surface: SURFACE_NAME,
      operation: 'EscalateTask',
      surfaceVersion: SURFACE_VERSION,
      correlationId,
      causationId,
      workflowId,
      workflowNumber,
      taskId,
      taskName,
      previousLevel,
      newLevel,
      escalationReason,
      triggeredBy,
      newAssignee,
      notifiedUsers,
      notifiedGroups,
      autoAction
    };
  }
};
