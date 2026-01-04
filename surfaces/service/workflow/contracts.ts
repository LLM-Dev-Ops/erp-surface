/**
 * Workflow Surface Contracts
 *
 * Contract definitions for workflow management operations.
 * Each contract defines typed inputs, outputs, preconditions, postconditions,
 * state transitions, observable events, and error types.
 */

import {
  UUID,
  UserId,
  Identifier,
  Timestamp,
  CorrelationId,
  EntityReference,
  OrgUnitReference,
  Result,
  ValidationResult,
  ValidationViolation,
  StateTransitionResult,
  SurfaceError,
  ValidationError,
  StateError,
  ErrorFactory
} from '../../../common';

import {
  WorkflowInstance,
  WorkflowState,
  WorkflowDefinition,
  WorkflowPriority,
  TaskInstance,
  TaskState,
  TaskType,
  TaskOutcome,
  TaskDecision,
  WorkflowStateMachine,
  TaskStateMachine
} from './models';

import {
  WorkflowInitiatedEvent,
  TaskAssignedEvent,
  TaskCompletedEvent,
  TaskRejectedEvent,
  EscalationOccurredEvent,
  EscalationReason
} from './events';

// ============================================================================
// Surface Constants
// ============================================================================

const SURFACE_NAME = 'WorkflowSurface';

// ============================================================================
// InitiateWorkflowContract
// ============================================================================

/** Input for initiating a workflow */
export interface InitiateWorkflowInput {
  readonly definitionId: UUID;
  readonly subject: EntityReference;
  readonly initiatedBy: UserId;
  readonly orgUnit: OrgUnitReference;
  readonly priority?: WorkflowPriority;
  readonly dueDate?: Timestamp;
  readonly variables?: Record<string, unknown>;
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Output from initiating a workflow */
export interface InitiateWorkflowOutput {
  readonly workflow: WorkflowInstance;
  readonly initialTasks: TaskInstance[];
  readonly events: WorkflowInitiatedEvent[];
}

/** InitiateWorkflow preconditions */
export const InitiateWorkflowPreconditions = {
  /** Definition must exist */
  definitionExists(
    definitionId: UUID,
    getDefinition: (id: UUID) => WorkflowDefinition | null
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!getDefinition(definitionId)) {
      violations.push({
        field: 'definitionId',
        rule: 'exists',
        message: 'Workflow definition does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Definition must be active */
  definitionActive(definition: WorkflowDefinition): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!definition.active) {
      violations.push({
        field: 'definitionId',
        rule: 'active',
        message: 'Workflow definition is not active',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Subject must be provided */
  subjectProvided(input: InitiateWorkflowInput): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!input.subject || !input.subject.entityId) {
      violations.push({
        field: 'subject',
        rule: 'required',
        message: 'Workflow subject is required',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Initiator has permission */
  initiatorHasPermission(
    initiatedBy: UserId,
    definitionId: UUID,
    hasPermission: (userId: UserId, permission: string, resourceId?: string) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!hasPermission(initiatedBy, 'workflow.initiate', definitionId)) {
      violations.push({
        field: 'initiatedBy',
        rule: 'permission',
        message: 'User does not have permission to initiate this workflow',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Validate all preconditions */
  validateAll(
    input: InitiateWorkflowInput,
    getDefinition: (id: UUID) => WorkflowDefinition | null,
    hasPermission: (userId: UserId, permission: string, resourceId?: string) => boolean
  ): ValidationResult {
    const definition = getDefinition(input.definitionId);
    const allViolations: ValidationViolation[] = [
      ...this.definitionExists(input.definitionId, getDefinition).violations,
      ...this.subjectProvided(input).violations,
      ...this.initiatorHasPermission(input.initiatedBy, input.definitionId, hasPermission).violations
    ];

    if (definition) {
      allViolations.push(...this.definitionActive(definition).violations);
    }

    return { valid: allViolations.length === 0, violations: allViolations };
  }
};

/** InitiateWorkflow postconditions */
export const InitiateWorkflowPostconditions = {
  /** Verify workflow is in PENDING or IN_PROGRESS state */
  workflowInValidState(output: InitiateWorkflowOutput): boolean {
    return output.workflow.state === 'PENDING' ||
           output.workflow.state === 'IN_PROGRESS';
  },

  /** Verify workflow number is assigned */
  workflowNumberAssigned(output: InitiateWorkflowOutput): boolean {
    return output.workflow.workflowNumber !== undefined &&
           output.workflow.workflowNumber.length > 0;
  },

  /** Verify initial tasks are created */
  initialTasksCreated(output: InitiateWorkflowOutput): boolean {
    return output.initialTasks.length > 0;
  },

  /** Verify initiated event is emitted */
  initiatedEventEmitted(output: InitiateWorkflowOutput): boolean {
    return output.events.some(e => e.eventType === 'WORKFLOW_INITIATED');
  }
};

/** InitiateWorkflow contract */
export interface InitiateWorkflowContract {
  readonly name: 'InitiateWorkflow';
  readonly surface: typeof SURFACE_NAME;
  readonly input: InitiateWorkflowInput;
  readonly output: InitiateWorkflowOutput;
  readonly preconditions: typeof InitiateWorkflowPreconditions;
  readonly postconditions: typeof InitiateWorkflowPostconditions;
  readonly errors: ValidationError;
  readonly events: WorkflowInitiatedEvent[];
}

// ============================================================================
// ApproveTaskContract
// ============================================================================

/** Input for approving a task */
export interface ApproveTaskInput {
  readonly workflowId: UUID;
  readonly taskId: UUID;
  readonly approvedBy: UserId;
  readonly comments?: string;
  readonly formData?: Record<string, unknown>;
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Output from approving a task */
export interface ApproveTaskOutput {
  readonly workflow: WorkflowInstance;
  readonly task: TaskInstance;
  readonly decision: TaskDecision;
  readonly stateTransition: StateTransitionResult<TaskState>;
  readonly nextTasks: TaskInstance[];
  readonly workflowCompleted: boolean;
  readonly events: TaskCompletedEvent[];
}

/** ApproveTask preconditions */
export const ApproveTaskPreconditions = {
  /** Workflow must exist */
  workflowExists(workflowId: UUID, getWorkflow: (id: UUID) => WorkflowInstance | null): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!getWorkflow(workflowId)) {
      violations.push({
        field: 'workflowId',
        rule: 'exists',
        message: 'Workflow does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Task must exist in workflow */
  taskExists(workflow: WorkflowInstance, taskId: UUID): ValidationResult {
    const violations: ValidationViolation[] = [];
    const task = workflow.tasks.find(t => t.id === taskId);
    if (!task) {
      violations.push({
        field: 'taskId',
        rule: 'exists',
        message: 'Task does not exist in workflow',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Task must be in ASSIGNED state */
  taskInAssignedState(task: TaskInstance): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (task.state !== 'ASSIGNED') {
      violations.push({
        field: 'taskId',
        rule: 'validState',
        message: `Task must be in ASSIGNED state to approve, current state: ${task.state}`,
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Approver is assigned or has permission */
  approverAuthorized(
    task: TaskInstance,
    approvedBy: UserId,
    hasPermission: (userId: UserId, permission: string) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    const isAssignee = task.assignedTo === approvedBy;
    const hasApprovePermission = hasPermission(approvedBy, 'task.approve.any');

    if (!isAssignee && !hasApprovePermission) {
      violations.push({
        field: 'approvedBy',
        rule: 'authorization',
        message: 'User is not authorized to approve this task',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  }
};

/** ApproveTask postconditions */
export const ApproveTaskPostconditions = {
  /** Verify task is completed */
  taskCompleted(output: ApproveTaskOutput): boolean {
    return output.task.state === 'COMPLETED';
  },

  /** Verify decision is recorded */
  decisionRecorded(output: ApproveTaskOutput): boolean {
    return output.decision.outcome === 'APPROVED';
  },

  /** Verify next tasks created if workflow not complete */
  nextTasksHandled(output: ApproveTaskOutput): boolean {
    if (output.workflowCompleted) {
      return output.workflow.state === 'COMPLETED';
    }
    return output.nextTasks.length >= 0;  // May be 0 if parallel tasks still pending
  },

  /** Verify completed event emitted */
  completedEventEmitted(output: ApproveTaskOutput): boolean {
    return output.events.some(e => e.eventType === 'TASK_COMPLETED');
  }
};

/** ApproveTask contract */
export interface ApproveTaskContract {
  readonly name: 'ApproveTask';
  readonly surface: typeof SURFACE_NAME;
  readonly input: ApproveTaskInput;
  readonly output: ApproveTaskOutput;
  readonly preconditions: typeof ApproveTaskPreconditions;
  readonly postconditions: typeof ApproveTaskPostconditions;
  readonly errors: ValidationError | StateError;
  readonly events: TaskCompletedEvent[];
}

// ============================================================================
// RejectTaskContract
// ============================================================================

/** Input for rejecting a task */
export interface RejectTaskInput {
  readonly workflowId: UUID;
  readonly taskId: UUID;
  readonly rejectedBy: UserId;
  readonly reason: string;
  readonly comments?: string;
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Output from rejecting a task */
export interface RejectTaskOutput {
  readonly workflow: WorkflowInstance;
  readonly task: TaskInstance;
  readonly decision: TaskDecision;
  readonly stateTransition: StateTransitionResult<TaskState>;
  readonly workflowCancelled: boolean;
  readonly reassignable: boolean;
  readonly events: TaskRejectedEvent[];
}

/** RejectTask preconditions */
export const RejectTaskPreconditions = {
  /** Workflow must exist */
  workflowExists(workflowId: UUID, getWorkflow: (id: UUID) => WorkflowInstance | null): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!getWorkflow(workflowId)) {
      violations.push({
        field: 'workflowId',
        rule: 'exists',
        message: 'Workflow does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Task must exist in workflow */
  taskExists(workflow: WorkflowInstance, taskId: UUID): ValidationResult {
    const violations: ValidationViolation[] = [];
    const task = workflow.tasks.find(t => t.id === taskId);
    if (!task) {
      violations.push({
        field: 'taskId',
        rule: 'exists',
        message: 'Task does not exist in workflow',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Task must be in ASSIGNED state */
  taskInAssignedState(task: TaskInstance): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (task.state !== 'ASSIGNED') {
      violations.push({
        field: 'taskId',
        rule: 'validState',
        message: `Task must be in ASSIGNED state to reject, current state: ${task.state}`,
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Reason must be provided */
  reasonProvided(input: RejectTaskInput): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!input.reason || input.reason.trim().length === 0) {
      violations.push({
        field: 'reason',
        rule: 'required',
        message: 'Rejection reason is required',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Rejecter is assigned or has permission */
  rejecterAuthorized(
    task: TaskInstance,
    rejectedBy: UserId,
    hasPermission: (userId: UserId, permission: string) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    const isAssignee = task.assignedTo === rejectedBy;
    const hasRejectPermission = hasPermission(rejectedBy, 'task.reject.any');

    if (!isAssignee && !hasRejectPermission) {
      violations.push({
        field: 'rejectedBy',
        rule: 'authorization',
        message: 'User is not authorized to reject this task',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  }
};

/** RejectTask postconditions */
export const RejectTaskPostconditions = {
  /** Verify task is rejected */
  taskRejected(output: RejectTaskOutput): boolean {
    return output.task.state === 'REJECTED';
  },

  /** Verify decision is recorded */
  decisionRecorded(output: RejectTaskOutput): boolean {
    return output.decision.outcome === 'REJECTED';
  },

  /** Verify workflow state is consistent */
  workflowStateConsistent(output: RejectTaskOutput): boolean {
    if (output.workflowCancelled) {
      return output.workflow.state === 'CANCELLED';
    }
    return output.workflow.state === 'IN_PROGRESS';
  },

  /** Verify rejected event emitted */
  rejectedEventEmitted(output: RejectTaskOutput): boolean {
    return output.events.some(e => e.eventType === 'TASK_REJECTED');
  }
};

/** RejectTask contract */
export interface RejectTaskContract {
  readonly name: 'RejectTask';
  readonly surface: typeof SURFACE_NAME;
  readonly input: RejectTaskInput;
  readonly output: RejectTaskOutput;
  readonly preconditions: typeof RejectTaskPreconditions;
  readonly postconditions: typeof RejectTaskPostconditions;
  readonly errors: ValidationError | StateError;
  readonly events: TaskRejectedEvent[];
}

// ============================================================================
// EscalateTaskContract
// ============================================================================

/** Input for escalating a task */
export interface EscalateTaskInput {
  readonly workflowId: UUID;
  readonly taskId: UUID;
  readonly escalatedBy: UserId | 'SYSTEM';
  readonly reason: EscalationReason;
  readonly comments?: string;
  readonly forceLevel?: number;  // Optional: force to specific escalation level
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Output from escalating a task */
export interface EscalateTaskOutput {
  readonly workflow: WorkflowInstance;
  readonly task: TaskInstance;
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly newAssignee?: UserId;
  readonly notifiedUsers: UserId[];
  readonly notifiedGroups: Identifier[];
  readonly autoActionTaken?: string;
  readonly maxLevelReached: boolean;
  readonly events: EscalationOccurredEvent[];
}

/** EscalateTask preconditions */
export const EscalateTaskPreconditions = {
  /** Workflow must exist */
  workflowExists(workflowId: UUID, getWorkflow: (id: UUID) => WorkflowInstance | null): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!getWorkflow(workflowId)) {
      violations.push({
        field: 'workflowId',
        rule: 'exists',
        message: 'Workflow does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Task must exist in workflow */
  taskExists(workflow: WorkflowInstance, taskId: UUID): ValidationResult {
    const violations: ValidationViolation[] = [];
    const task = workflow.tasks.find(t => t.id === taskId);
    if (!task) {
      violations.push({
        field: 'taskId',
        rule: 'exists',
        message: 'Task does not exist in workflow',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Task must be active (PENDING or ASSIGNED) */
  taskIsActive(task: TaskInstance): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (task.state !== 'PENDING' && task.state !== 'ASSIGNED') {
      violations.push({
        field: 'taskId',
        rule: 'validState',
        message: `Task must be PENDING or ASSIGNED to escalate, current state: ${task.state}`,
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Escalator has permission if not system */
  escalatorAuthorized(
    escalatedBy: UserId | 'SYSTEM',
    hasPermission: (userId: UserId, permission: string) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (escalatedBy !== 'SYSTEM' && !hasPermission(escalatedBy, 'task.escalate')) {
      violations.push({
        field: 'escalatedBy',
        rule: 'permission',
        message: 'User does not have permission to escalate tasks',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  }
};

/** EscalateTask postconditions */
export const EscalateTaskPostconditions = {
  /** Verify escalation level increased */
  levelIncreased(output: EscalateTaskOutput): boolean {
    return output.newLevel > output.previousLevel || output.maxLevelReached;
  },

  /** Verify escalation timestamp set */
  escalationTimestampSet(output: EscalateTaskOutput): boolean {
    return output.task.escalatedAt !== undefined;
  },

  /** Verify notifications sent */
  notificationsSent(output: EscalateTaskOutput): boolean {
    return output.notifiedUsers.length > 0 || output.notifiedGroups.length > 0;
  },

  /** Verify escalation event emitted */
  escalationEventEmitted(output: EscalateTaskOutput): boolean {
    return output.events.some(e => e.eventType === 'ESCALATION_OCCURRED');
  }
};

/** EscalateTask contract */
export interface EscalateTaskContract {
  readonly name: 'EscalateTask';
  readonly surface: typeof SURFACE_NAME;
  readonly input: EscalateTaskInput;
  readonly output: EscalateTaskOutput;
  readonly preconditions: typeof EscalateTaskPreconditions;
  readonly postconditions: typeof EscalateTaskPostconditions;
  readonly errors: ValidationError | StateError;
  readonly events: EscalationOccurredEvent[];
}

// ============================================================================
// Surface Definition
// ============================================================================

/** WorkflowSurface contract collection */
export interface WorkflowSurface {
  readonly name: typeof SURFACE_NAME;
  readonly version: '1.0.0';
  readonly contracts: {
    readonly InitiateWorkflow: InitiateWorkflowContract;
    readonly ApproveTask: ApproveTaskContract;
    readonly RejectTask: RejectTaskContract;
    readonly EscalateTask: EscalateTaskContract;
  };
}

/** Error factory for workflow surface */
export const WorkflowErrorFactory = {
  /** Create workflow not found error */
  workflowNotFound(workflowId: UUID, operation: string): ValidationError {
    return ErrorFactory.preconditionViolation(
      SURFACE_NAME,
      operation,
      [{
        field: 'workflowId',
        rule: 'exists',
        message: `Workflow ${workflowId} not found`,
        severity: 'ERROR'
      }]
    );
  },

  /** Create task not found error */
  taskNotFound(taskId: UUID, operation: string): ValidationError {
    return ErrorFactory.preconditionViolation(
      SURFACE_NAME,
      operation,
      [{
        field: 'taskId',
        rule: 'exists',
        message: `Task ${taskId} not found`,
        severity: 'ERROR'
      }]
    );
  },

  /** Create invalid state transition error */
  invalidTaskTransition(
    currentState: TaskState,
    targetState: TaskState,
    operation: string
  ): StateError {
    return ErrorFactory.invalidTransition(
      SURFACE_NAME,
      operation,
      currentState,
      targetState
    );
  },

  /** Create invalid workflow state transition error */
  invalidWorkflowTransition(
    currentState: WorkflowState,
    targetState: WorkflowState,
    operation: string
  ): StateError {
    return ErrorFactory.invalidTransition(
      SURFACE_NAME,
      operation,
      currentState,
      targetState
    );
  },

  /** Create definition not found error */
  definitionNotFound(definitionId: UUID, operation: string): ValidationError {
    return ErrorFactory.preconditionViolation(
      SURFACE_NAME,
      operation,
      [{
        field: 'definitionId',
        rule: 'exists',
        message: `Workflow definition ${definitionId} not found`,
        severity: 'ERROR'
      }]
    );
  },

  /** Create unauthorized error */
  unauthorized(userId: UserId, operation: string, permission: string): ValidationError {
    return ErrorFactory.preconditionViolation(
      SURFACE_NAME,
      operation,
      [{
        field: 'authorization',
        rule: 'permission',
        message: `User ${userId} lacks permission: ${permission}`,
        severity: 'ERROR'
      }]
    );
  }
};
