/**
 * Workflow Management Models
 *
 * State machines and domain models for workflow management.
 * Vendor-neutral types supporting approval workflows, task routing, and escalation.
 */

import {
  UUID,
  Identifier,
  UserId,
  Timestamp,
  DurationMs,
  EntityReference,
  OrgUnitReference
} from '../../../common';

// ============================================================================
// Workflow State Machine
// ============================================================================

/** Workflow lifecycle states */
export type WorkflowState =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

/** Valid workflow state transitions */
export const WorkflowStateTransitions: Record<WorkflowState, WorkflowState[]> = {
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

/** Check if a workflow state transition is valid */
export const isValidWorkflowTransition = (
  from: WorkflowState,
  to: WorkflowState
): boolean => {
  return WorkflowStateTransitions[from].includes(to);
};

// ============================================================================
// Task State Machine
// ============================================================================

/** Task lifecycle states */
export type TaskState =
  | 'PENDING'
  | 'ASSIGNED'
  | 'COMPLETED'
  | 'REJECTED';

/** Valid task state transitions */
export const TaskStateTransitions: Record<TaskState, TaskState[]> = {
  PENDING: ['ASSIGNED'],
  ASSIGNED: ['COMPLETED', 'REJECTED', 'PENDING'],
  COMPLETED: [],
  REJECTED: ['PENDING']  // Can be reassigned after rejection
};

/** Check if a task state transition is valid */
export const isValidTaskTransition = (
  from: TaskState,
  to: TaskState
): boolean => {
  return TaskStateTransitions[from].includes(to);
};

// ============================================================================
// Workflow Types
// ============================================================================

/** Workflow types */
export type WorkflowType =
  | 'APPROVAL'
  | 'REVIEW'
  | 'MULTI_STEP'
  | 'PARALLEL'
  | 'SEQUENTIAL';

/** Workflow execution mode */
export type ExecutionMode =
  | 'SEQUENTIAL'  // Tasks execute one after another
  | 'PARALLEL'    // Tasks can execute simultaneously
  | 'CONDITIONAL'; // Task execution depends on conditions

// ============================================================================
// Workflow Definition
// ============================================================================

/** Workflow definition (template) */
export interface WorkflowDefinition {
  readonly definitionId: UUID;
  readonly name: string;
  readonly description: string;
  readonly type: WorkflowType;
  readonly executionMode: ExecutionMode;
  readonly taskDefinitions: TaskDefinition[];
  readonly transitions: WorkflowTransition[];
  readonly escalationPolicy?: EscalationPolicy;
  readonly slaPolicy?: SLAPolicy;
  readonly active: boolean;
  readonly version: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

/** Task definition within a workflow */
export interface TaskDefinition {
  readonly taskDefinitionId: Identifier;
  readonly name: string;
  readonly description: string;
  readonly taskType: TaskType;
  readonly assignmentRule: AssignmentRule;
  readonly requiredApprovals: number;
  readonly timeoutMs?: DurationMs;
  readonly formSchema?: Record<string, unknown>;
  readonly instructions?: string;
  readonly order: number;
}

/** Task types */
export type TaskType =
  | 'APPROVAL'
  | 'REVIEW'
  | 'ACTION'
  | 'NOTIFICATION'
  | 'DECISION';

/** Assignment rules */
export interface AssignmentRule {
  readonly ruleType: AssignmentRuleType;
  readonly assignees?: UserId[];
  readonly roleId?: Identifier;
  readonly groupId?: Identifier;
  readonly expression?: string;  // For dynamic assignment
}

/** Assignment rule types */
export type AssignmentRuleType =
  | 'SPECIFIC_USER'
  | 'ROLE'
  | 'GROUP'
  | 'ROUND_ROBIN'
  | 'LEAST_LOADED'
  | 'EXPRESSION';

/** Workflow transition */
export interface WorkflowTransition {
  readonly transitionId: Identifier;
  readonly fromTaskId: Identifier | null;  // null = start
  readonly toTaskId: Identifier | null;    // null = end
  readonly condition?: TransitionCondition;
}

/** Transition condition */
export interface TransitionCondition {
  readonly conditionType: ConditionType;
  readonly expression: string;
  readonly parameters?: Record<string, unknown>;
}

/** Condition types */
export type ConditionType =
  | 'ALWAYS'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPRESSION'
  | 'THRESHOLD';

// ============================================================================
// Workflow Instance
// ============================================================================

/** Workflow instance (running workflow) */
export interface WorkflowInstance {
  readonly id: UUID;
  readonly workflowNumber: string;
  readonly definitionId: UUID;
  readonly state: WorkflowState;
  readonly subject: EntityReference;
  readonly initiatedBy: UserId;
  readonly orgUnit: OrgUnitReference;
  readonly tasks: TaskInstance[];
  readonly currentTaskIds: Identifier[];
  readonly completedTaskIds: Identifier[];
  readonly variables: Record<string, unknown>;
  readonly startedAt?: Timestamp;
  readonly completedAt?: Timestamp;
  readonly cancelledAt?: Timestamp;
  readonly cancellationReason?: string;
  readonly dueDate?: Timestamp;
  readonly priority: WorkflowPriority;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
}

/** Workflow priority */
export type WorkflowPriority =
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'URGENT';

/** Task instance (running task) */
export interface TaskInstance {
  readonly id: UUID;
  readonly taskDefinitionId: Identifier;
  readonly state: TaskState;
  readonly name: string;
  readonly description: string;
  readonly taskType: TaskType;
  readonly assignedTo?: UserId;
  readonly assignedGroup?: Identifier;
  readonly decision?: TaskDecision;
  readonly formData?: Record<string, unknown>;
  readonly comments: TaskComment[];
  readonly dueDate?: Timestamp;
  readonly startedAt?: Timestamp;
  readonly completedAt?: Timestamp;
  readonly escalatedAt?: Timestamp;
  readonly escalationLevel: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

/** Task decision */
export interface TaskDecision {
  readonly outcome: TaskOutcome;
  readonly decidedBy: UserId;
  readonly decidedAt: Timestamp;
  readonly reason?: string;
  readonly delegatedTo?: UserId;
}

/** Task outcomes */
export type TaskOutcome =
  | 'APPROVED'
  | 'REJECTED'
  | 'DELEGATED'
  | 'COMPLETED'
  | 'ESCALATED';

/** Task comment */
export interface TaskComment {
  readonly commentId: UUID;
  readonly content: string;
  readonly createdBy: UserId;
  readonly createdAt: Timestamp;
  readonly visibility: CommentVisibility;
}

/** Comment visibility */
export type CommentVisibility =
  | 'PUBLIC'
  | 'INTERNAL';

// ============================================================================
// Escalation
// ============================================================================

/** Escalation policy */
export interface EscalationPolicy {
  readonly policyId: Identifier;
  readonly levels: EscalationLevel[];
  readonly maxEscalations: number;
  readonly finalAction: FinalEscalationAction;
}

/** Escalation level */
export interface EscalationLevel {
  readonly level: number;
  readonly triggerAfterMs: DurationMs;
  readonly assignTo: AssignmentRule;
  readonly notifyUsers: UserId[];
  readonly notifyGroups: Identifier[];
}

/** Final escalation action */
export type FinalEscalationAction =
  | 'AUTO_APPROVE'
  | 'AUTO_REJECT'
  | 'NOTIFY_ADMIN'
  | 'SUSPEND';

// ============================================================================
// SLA
// ============================================================================

/** SLA policy */
export interface SLAPolicy {
  readonly policyId: Identifier;
  readonly completionTimeMs: DurationMs;
  readonly warningThresholdPercent: number;
  readonly breachActions: SLABreachAction[];
}

/** SLA breach action */
export interface SLABreachAction {
  readonly actionType: SLAActionType;
  readonly notifyUsers: UserId[];
  readonly notifyGroups: Identifier[];
}

/** SLA action types */
export type SLAActionType =
  | 'NOTIFY'
  | 'ESCALATE'
  | 'AUTO_APPROVE'
  | 'SUSPEND';

// ============================================================================
// State Machine Operations
// ============================================================================

/** Workflow state machine */
export const WorkflowStateMachine = {
  /** Get valid transitions from current state */
  getValidTransitions(state: WorkflowState): WorkflowState[] {
    return WorkflowStateTransitions[state];
  },

  /** Check if transition is valid */
  canTransition(from: WorkflowState, to: WorkflowState): boolean {
    return isValidWorkflowTransition(from, to);
  },

  /** Get terminal states */
  getTerminalStates(): WorkflowState[] {
    return ['COMPLETED', 'CANCELLED'];
  },

  /** Check if state is terminal */
  isTerminal(state: WorkflowState): boolean {
    return state === 'COMPLETED' || state === 'CANCELLED';
  },

  /** Get initial state */
  getInitialState(): WorkflowState {
    return 'PENDING';
  }
};

/** Task state machine */
export const TaskStateMachine = {
  /** Get valid transitions from current state */
  getValidTransitions(state: TaskState): TaskState[] {
    return TaskStateTransitions[state];
  },

  /** Check if transition is valid */
  canTransition(from: TaskState, to: TaskState): boolean {
    return isValidTaskTransition(from, to);
  },

  /** Get terminal states */
  getTerminalStates(): TaskState[] {
    return ['COMPLETED', 'REJECTED'];
  },

  /** Check if state is terminal */
  isTerminal(state: TaskState): boolean {
    return state === 'COMPLETED' || state === 'REJECTED';
  },

  /** Get initial state */
  getInitialState(): TaskState {
    return 'PENDING';
  }
};
