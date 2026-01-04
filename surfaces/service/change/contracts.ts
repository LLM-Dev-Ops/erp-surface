/**
 * Change Surface Contracts
 *
 * Contract definitions for change management operations.
 * Each contract defines typed inputs, outputs, preconditions, postconditions,
 * state transitions, observable events, and error types.
 */

import {
  UUID,
  UserId,
  ChangeNumber,
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
  ChangeRequest,
  ChangeState,
  ChangeType,
  RiskAssessment,
  ImpactAssessment,
  ImplementationPlan,
  ApprovalRecord,
  ApprovalStatus,
  ApproverRole,
  ChangeReview,
  ChangeStateMachine
} from './models';

// ============================================================================
// Surface Constants
// ============================================================================

const SURFACE_NAME = 'ChangeSurface';

// ============================================================================
// Event Types (Forward Declaration)
// ============================================================================

/** Change created event */
export interface ChangeCreatedEvent {
  readonly eventType: 'CHANGE_CREATED';
  readonly changeId: UUID;
  readonly changeNumber: ChangeNumber;
  readonly type: ChangeType;
  readonly title: string;
  readonly requestedBy: UserId;
}

/** Change approved event */
export interface ChangeApprovedEvent {
  readonly eventType: 'CHANGE_APPROVED';
  readonly changeId: UUID;
  readonly changeNumber: ChangeNumber;
  readonly approvedBy: UserId;
  readonly approverRole: ApproverRole;
}

/** Change implemented event */
export interface ChangeImplementedEvent {
  readonly eventType: 'CHANGE_IMPLEMENTED';
  readonly changeId: UUID;
  readonly changeNumber: ChangeNumber;
  readonly successful: boolean;
  readonly actualDurationMs: number;
}

/** Change reviewed event */
export interface ChangeReviewedEvent {
  readonly eventType: 'CHANGE_REVIEWED';
  readonly changeId: UUID;
  readonly changeNumber: ChangeNumber;
  readonly successful: boolean;
  readonly reviewedBy: UserId;
}

// ============================================================================
// CreateChangeRequestContract
// ============================================================================

/** Input for creating a change request */
export interface CreateChangeRequestInput {
  readonly title: string;
  readonly description: string;
  readonly justification: string;
  readonly type: ChangeType;
  readonly requestedBy: UserId;
  readonly orgUnit: OrgUnitReference;
  readonly affectedCIs?: EntityReference[];
  readonly relatedIncidents?: Identifier[];
  readonly riskAssessment?: Partial<RiskAssessment>;
  readonly impactAssessment?: Partial<ImpactAssessment>;
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Output from creating a change request */
export interface CreateChangeRequestOutput {
  readonly changeRequest: ChangeRequest;
  readonly events: ChangeCreatedEvent[];
}

/** CreateChangeRequest preconditions */
export const CreateChangeRequestPreconditions = {
  /** Validate title is not empty */
  titleNotEmpty(input: CreateChangeRequestInput): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!input.title || input.title.trim().length === 0) {
      violations.push({
        field: 'title',
        rule: 'required',
        message: 'Change request title is required',
        severity: 'ERROR'
      });
    }
    if (input.title && input.title.length > 200) {
      violations.push({
        field: 'title',
        rule: 'maxLength',
        message: 'Change request title must not exceed 200 characters',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Validate description is provided */
  descriptionNotEmpty(input: CreateChangeRequestInput): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!input.description || input.description.trim().length === 0) {
      violations.push({
        field: 'description',
        rule: 'required',
        message: 'Change request description is required',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Validate justification is provided */
  justificationProvided(input: CreateChangeRequestInput): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!input.justification || input.justification.trim().length === 0) {
      violations.push({
        field: 'justification',
        rule: 'required',
        message: 'Business justification is required',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Validate requester exists */
  requesterExists(input: CreateChangeRequestInput, userExists: (id: UserId) => boolean): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!userExists(input.requestedBy)) {
      violations.push({
        field: 'requestedBy',
        rule: 'exists',
        message: 'Requester user does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Validate all preconditions */
  validateAll(
    input: CreateChangeRequestInput,
    userExists: (id: UserId) => boolean
  ): ValidationResult {
    const allViolations: ValidationViolation[] = [
      ...this.titleNotEmpty(input).violations,
      ...this.descriptionNotEmpty(input).violations,
      ...this.justificationProvided(input).violations,
      ...this.requesterExists(input, userExists).violations
    ];
    return { valid: allViolations.length === 0, violations: allViolations };
  }
};

/** CreateChangeRequest postconditions */
export const CreateChangeRequestPostconditions = {
  /** Verify change is in DRAFT state */
  changeInDraftState(output: CreateChangeRequestOutput): boolean {
    return output.changeRequest.state === 'DRAFT';
  },

  /** Verify change number is assigned */
  changeNumberAssigned(output: CreateChangeRequestOutput): boolean {
    return output.changeRequest.changeNumber !== undefined &&
           output.changeRequest.changeNumber.length > 0;
  },

  /** Verify created event is emitted */
  createdEventEmitted(output: CreateChangeRequestOutput): boolean {
    return output.events.some(e => e.eventType === 'CHANGE_CREATED');
  }
};

/** CreateChangeRequest contract */
export interface CreateChangeRequestContract {
  readonly name: 'CreateChangeRequest';
  readonly surface: typeof SURFACE_NAME;
  readonly input: CreateChangeRequestInput;
  readonly output: CreateChangeRequestOutput;
  readonly preconditions: typeof CreateChangeRequestPreconditions;
  readonly postconditions: typeof CreateChangeRequestPostconditions;
  readonly errors: ValidationError;
  readonly events: ChangeCreatedEvent[];
}

// ============================================================================
// ApproveChangeContract
// ============================================================================

/** Input for approving a change */
export interface ApproveChangeInput {
  readonly changeId: UUID;
  readonly approverId: UserId;
  readonly approverRole: ApproverRole;
  readonly decision: ApprovalStatus;
  readonly comments: string;
  readonly conditions?: string[];
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Output from approving a change */
export interface ApproveChangeOutput {
  readonly changeRequest: ChangeRequest;
  readonly approvalRecord: ApprovalRecord;
  readonly stateTransition?: StateTransitionResult<ChangeState>;
  readonly allApprovalsComplete: boolean;
  readonly events: ChangeApprovedEvent[];
}

/** ApproveChange preconditions */
export const ApproveChangePreconditions = {
  /** Change must exist */
  changeExists(changeId: UUID, getChange: (id: UUID) => ChangeRequest | null): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!getChange(changeId)) {
      violations.push({
        field: 'changeId',
        rule: 'exists',
        message: 'Change request does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Change must be in approvable state */
  changeInApprovableState(change: ChangeRequest): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (change.state !== 'SUBMITTED') {
      violations.push({
        field: 'state',
        rule: 'validState',
        message: `Change must be in SUBMITTED state to approve, current state: ${change.state}`,
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Approver is authorized for role */
  approverAuthorized(
    approverId: UserId,
    approverRole: ApproverRole,
    hasRole: (userId: UserId, role: ApproverRole) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!hasRole(approverId, approverRole)) {
      violations.push({
        field: 'approverId',
        rule: 'authorization',
        message: `User is not authorized for role: ${approverRole}`,
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Approver has not already approved */
  approverNotDuplicate(change: ChangeRequest, approverId: UserId): ValidationResult {
    const violations: ValidationViolation[] = [];
    const existingApproval = change.approvals.find(
      a => a.approverId === approverId && a.status !== 'PENDING'
    );
    if (existingApproval) {
      violations.push({
        field: 'approverId',
        rule: 'duplicate',
        message: 'Approver has already submitted a decision',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  }
};

/** ApproveChange postconditions */
export const ApproveChangePostconditions = {
  /** Verify approval record created */
  approvalRecordCreated(output: ApproveChangeOutput): boolean {
    return output.approvalRecord !== undefined;
  },

  /** Verify state transition if all approvals complete */
  stateTransitionIfComplete(output: ApproveChangeOutput): boolean {
    if (output.allApprovalsComplete) {
      return output.changeRequest.state === 'APPROVED' ||
             output.changeRequest.state === 'DRAFT';  // Rejected goes back to draft
    }
    return true;
  },

  /** Verify approved event emitted if approved */
  approvedEventEmitted(output: ApproveChangeOutput, decision: ApprovalStatus): boolean {
    if (decision === 'APPROVED') {
      return output.events.some(e => e.eventType === 'CHANGE_APPROVED');
    }
    return true;
  }
};

/** ApproveChange contract */
export interface ApproveChangeContract {
  readonly name: 'ApproveChange';
  readonly surface: typeof SURFACE_NAME;
  readonly input: ApproveChangeInput;
  readonly output: ApproveChangeOutput;
  readonly preconditions: typeof ApproveChangePreconditions;
  readonly postconditions: typeof ApproveChangePostconditions;
  readonly errors: ValidationError | StateError;
  readonly events: ChangeApprovedEvent[];
}

// ============================================================================
// ImplementChangeContract
// ============================================================================

/** Input for implementing a change */
export interface ImplementChangeInput {
  readonly changeId: UUID;
  readonly implementerId: UserId;
  readonly actualStart: Timestamp;
  readonly stepResults: StepResult[];
  readonly testResults: TestResult[];
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Step result */
export interface StepResult {
  readonly stepNumber: number;
  readonly status: 'COMPLETED' | 'FAILED' | 'SKIPPED';
  readonly notes: string;
  readonly completedAt: Timestamp;
}

/** Test result */
export interface TestResult {
  readonly testId: Identifier;
  readonly status: 'PASSED' | 'FAILED' | 'SKIPPED';
  readonly result: string;
  readonly executedAt: Timestamp;
}

/** Output from implementing a change */
export interface ImplementChangeOutput {
  readonly changeRequest: ChangeRequest;
  readonly stateTransition: StateTransitionResult<ChangeState>;
  readonly implementationSuccessful: boolean;
  readonly rollbackRequired: boolean;
  readonly events: ChangeImplementedEvent[];
}

/** ImplementChange preconditions */
export const ImplementChangePreconditions = {
  /** Change must exist */
  changeExists(changeId: UUID, getChange: (id: UUID) => ChangeRequest | null): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!getChange(changeId)) {
      violations.push({
        field: 'changeId',
        rule: 'exists',
        message: 'Change request does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Change must be scheduled */
  changeIsScheduled(change: ChangeRequest): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (change.state !== 'SCHEDULED') {
      violations.push({
        field: 'state',
        rule: 'validState',
        message: `Change must be in SCHEDULED state to implement, current state: ${change.state}`,
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Implementation plan exists */
  implementationPlanExists(change: ChangeRequest): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!change.implementationPlan) {
      violations.push({
        field: 'implementationPlan',
        rule: 'required',
        message: 'Implementation plan is required before implementation',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Implementer is authorized */
  implementerAuthorized(
    change: ChangeRequest,
    implementerId: UserId,
    hasPermission: (userId: UserId, permission: string) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    const isAssignee = change.assignedTo === implementerId;
    const hasImplementPermission = hasPermission(implementerId, 'change.implement');

    if (!isAssignee && !hasImplementPermission) {
      violations.push({
        field: 'implementerId',
        rule: 'authorization',
        message: 'User is not authorized to implement this change',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  }
};

/** ImplementChange postconditions */
export const ImplementChangePostconditions = {
  /** Verify state is REVIEW after implementation */
  stateIsReview(output: ImplementChangeOutput): boolean {
    return output.changeRequest.state === 'REVIEW';
  },

  /** Verify actual times recorded */
  actualTimesRecorded(output: ImplementChangeOutput): boolean {
    return output.changeRequest.actualStart !== undefined;
  },

  /** Verify implemented event emitted */
  implementedEventEmitted(output: ImplementChangeOutput): boolean {
    return output.events.some(e => e.eventType === 'CHANGE_IMPLEMENTED');
  }
};

/** ImplementChange contract */
export interface ImplementChangeContract {
  readonly name: 'ImplementChange';
  readonly surface: typeof SURFACE_NAME;
  readonly input: ImplementChangeInput;
  readonly output: ImplementChangeOutput;
  readonly preconditions: typeof ImplementChangePreconditions;
  readonly postconditions: typeof ImplementChangePostconditions;
  readonly errors: ValidationError | StateError;
  readonly events: ChangeImplementedEvent[];
}

// ============================================================================
// ReviewChangeContract
// ============================================================================

/** Input for reviewing a change */
export interface ReviewChangeInput {
  readonly changeId: UUID;
  readonly reviewerId: UserId;
  readonly successful: boolean;
  readonly objectiveResults: ObjectiveResult[];
  readonly lessonsLearned: string[];
  readonly recommendations: string[];
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Objective result */
export interface ObjectiveResult {
  readonly objective: string;
  readonly achieved: boolean;
  readonly notes: string;
}

/** Output from reviewing a change */
export interface ReviewChangeOutput {
  readonly changeRequest: ChangeRequest;
  readonly review: ChangeReview;
  readonly stateTransition: StateTransitionResult<ChangeState>;
  readonly events: ChangeReviewedEvent[];
}

/** ReviewChange preconditions */
export const ReviewChangePreconditions = {
  /** Change must exist */
  changeExists(changeId: UUID, getChange: (id: UUID) => ChangeRequest | null): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!getChange(changeId)) {
      violations.push({
        field: 'changeId',
        rule: 'exists',
        message: 'Change request does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Change must be in REVIEW state */
  changeInReviewState(change: ChangeRequest): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (change.state !== 'REVIEW') {
      violations.push({
        field: 'state',
        rule: 'validState',
        message: `Change must be in REVIEW state, current state: ${change.state}`,
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Reviewer has permission */
  reviewerHasPermission(
    reviewerId: UserId,
    hasPermission: (userId: UserId, permission: string) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!hasPermission(reviewerId, 'change.review')) {
      violations.push({
        field: 'reviewerId',
        rule: 'permission',
        message: 'User does not have permission to review changes',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  }
};

/** ReviewChange postconditions */
export const ReviewChangePostconditions = {
  /** Verify change is closed */
  changeIsClosed(output: ReviewChangeOutput): boolean {
    return output.changeRequest.state === 'CLOSED';
  },

  /** Verify review is recorded */
  reviewRecorded(output: ReviewChangeOutput): boolean {
    return output.changeRequest.review !== undefined;
  },

  /** Verify closed timestamp set */
  closedTimestampSet(output: ReviewChangeOutput): boolean {
    return output.changeRequest.closedAt !== undefined;
  },

  /** Verify reviewed event emitted */
  reviewedEventEmitted(output: ReviewChangeOutput): boolean {
    return output.events.some(e => e.eventType === 'CHANGE_REVIEWED');
  }
};

/** ReviewChange contract */
export interface ReviewChangeContract {
  readonly name: 'ReviewChange';
  readonly surface: typeof SURFACE_NAME;
  readonly input: ReviewChangeInput;
  readonly output: ReviewChangeOutput;
  readonly preconditions: typeof ReviewChangePreconditions;
  readonly postconditions: typeof ReviewChangePostconditions;
  readonly errors: ValidationError | StateError;
  readonly events: ChangeReviewedEvent[];
}

// ============================================================================
// Surface Definition
// ============================================================================

/** ChangeSurface contract collection */
export interface ChangeSurface {
  readonly name: typeof SURFACE_NAME;
  readonly version: '1.0.0';
  readonly contracts: {
    readonly CreateChangeRequest: CreateChangeRequestContract;
    readonly ApproveChange: ApproveChangeContract;
    readonly ImplementChange: ImplementChangeContract;
    readonly ReviewChange: ReviewChangeContract;
  };
}

/** Error factory for change surface */
export const ChangeErrorFactory = {
  /** Create change not found error */
  changeNotFound(changeId: UUID, operation: string): ValidationError {
    return ErrorFactory.preconditionViolation(
      SURFACE_NAME,
      operation,
      [{
        field: 'changeId',
        rule: 'exists',
        message: `Change request ${changeId} not found`,
        severity: 'ERROR'
      }]
    );
  },

  /** Create invalid state transition error */
  invalidStateTransition(
    currentState: ChangeState,
    targetState: ChangeState,
    operation: string
  ): StateError {
    return ErrorFactory.invalidTransition(
      SURFACE_NAME,
      operation,
      currentState,
      targetState
    );
  },

  /** Create approval required error */
  approvalRequired(changeId: UUID, operation: string): ValidationError {
    return ErrorFactory.businessRuleViolation(
      SURFACE_NAME,
      operation,
      'approval_required',
      `Change ${changeId} requires approval before proceeding`
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
