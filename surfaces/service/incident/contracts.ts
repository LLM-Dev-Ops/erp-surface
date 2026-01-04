/**
 * Incident Surface Contracts
 *
 * Contract definitions for incident management operations.
 * Each contract defines typed inputs, outputs, preconditions, postconditions,
 * state transitions, observable events, and error types.
 */

import {
  UUID,
  UserId,
  IncidentNumber,
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
  Incident,
  IncidentState,
  IncidentPriority,
  IncidentCategory,
  IncidentImpact,
  IncidentUrgency,
  ResolutionCode,
  ResolutionInfo,
  IncidentStateMachine
} from './models';

import {
  IncidentCreatedEvent,
  IncidentAssignedEvent,
  IncidentResolvedEvent,
  IncidentClosedEvent
} from './events';

// ============================================================================
// Surface Constants
// ============================================================================

const SURFACE_NAME = 'IncidentSurface';

// ============================================================================
// CreateIncidentContract
// ============================================================================

/** Input for creating an incident */
export interface CreateIncidentInput {
  readonly title: string;
  readonly description: string;
  readonly category: IncidentCategory;
  readonly subcategoryId?: Identifier;
  readonly impact: IncidentImpact;
  readonly urgency: IncidentUrgency;
  readonly reportedBy: UserId;
  readonly affectedService?: EntityReference;
  readonly affectedAsset?: EntityReference;
  readonly orgUnit: OrgUnitReference;
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Output from creating an incident */
export interface CreateIncidentOutput {
  readonly incident: Incident;
  readonly events: IncidentCreatedEvent[];
}

/** CreateIncident preconditions */
export const CreateIncidentPreconditions = {
  /** Validate title is not empty */
  titleNotEmpty(input: CreateIncidentInput): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!input.title || input.title.trim().length === 0) {
      violations.push({
        field: 'title',
        rule: 'required',
        message: 'Incident title is required',
        severity: 'ERROR'
      });
    }
    if (input.title && input.title.length > 200) {
      violations.push({
        field: 'title',
        rule: 'maxLength',
        message: 'Incident title must not exceed 200 characters',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Validate description is provided */
  descriptionNotEmpty(input: CreateIncidentInput): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!input.description || input.description.trim().length === 0) {
      violations.push({
        field: 'description',
        rule: 'required',
        message: 'Incident description is required',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Validate reporter exists */
  reporterExists(input: CreateIncidentInput, userExists: (id: UserId) => boolean): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!userExists(input.reportedBy)) {
      violations.push({
        field: 'reportedBy',
        rule: 'exists',
        message: 'Reporter user does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Validate all preconditions */
  validateAll(
    input: CreateIncidentInput,
    userExists: (id: UserId) => boolean
  ): ValidationResult {
    const allViolations: ValidationViolation[] = [
      ...this.titleNotEmpty(input).violations,
      ...this.descriptionNotEmpty(input).violations,
      ...this.reporterExists(input, userExists).violations
    ];
    return { valid: allViolations.length === 0, violations: allViolations };
  }
};

/** CreateIncident postconditions */
export const CreateIncidentPostconditions = {
  /** Verify incident is in NEW state */
  incidentInNewState(output: CreateIncidentOutput): boolean {
    return output.incident.state === 'NEW';
  },

  /** Verify incident number is assigned */
  incidentNumberAssigned(output: CreateIncidentOutput): boolean {
    return output.incident.incidentNumber !== undefined &&
           output.incident.incidentNumber.length > 0;
  },

  /** Verify SLA times are set */
  slaTimesSet(output: CreateIncidentOutput): boolean {
    return output.incident.sla.responseTargetTime !== undefined &&
           output.incident.sla.resolutionTargetTime !== undefined;
  },

  /** Verify created event is emitted */
  createdEventEmitted(output: CreateIncidentOutput): boolean {
    return output.events.some(e => e.eventType === 'INCIDENT_CREATED');
  }
};

/** CreateIncident contract */
export interface CreateIncidentContract {
  readonly name: 'CreateIncident';
  readonly surface: typeof SURFACE_NAME;
  readonly input: CreateIncidentInput;
  readonly output: CreateIncidentOutput;
  readonly preconditions: typeof CreateIncidentPreconditions;
  readonly postconditions: typeof CreateIncidentPostconditions;
  readonly errors: ValidationError;
  readonly events: IncidentCreatedEvent[];
}

// ============================================================================
// AssignIncidentContract
// ============================================================================

/** Input for assigning an incident */
export interface AssignIncidentInput {
  readonly incidentId: UUID;
  readonly assignTo: UserId;
  readonly assignedGroup?: Identifier;
  readonly assignedBy: UserId;
  readonly notes?: string;
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Output from assigning an incident */
export interface AssignIncidentOutput {
  readonly incident: Incident;
  readonly stateTransition: StateTransitionResult<IncidentState>;
  readonly events: IncidentAssignedEvent[];
}

/** AssignIncident preconditions */
export const AssignIncidentPreconditions = {
  /** Incident must exist */
  incidentExists(incidentId: UUID, getIncident: (id: UUID) => Incident | null): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!getIncident(incidentId)) {
      violations.push({
        field: 'incidentId',
        rule: 'exists',
        message: 'Incident does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Incident must be in assignable state */
  incidentInAssignableState(incident: Incident): ValidationResult {
    const violations: ValidationViolation[] = [];
    const canAssign = IncidentStateMachine.canTransition(incident.state, 'ASSIGNED');
    if (!canAssign) {
      violations.push({
        field: 'state',
        rule: 'validTransition',
        message: `Cannot assign incident in state ${incident.state}`,
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Assignee must exist */
  assigneeExists(assignTo: UserId, userExists: (id: UserId) => boolean): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!userExists(assignTo)) {
      violations.push({
        field: 'assignTo',
        rule: 'exists',
        message: 'Assignee user does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Assigner must have permission */
  assignerHasPermission(
    assignedBy: UserId,
    hasPermission: (userId: UserId, permission: string) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!hasPermission(assignedBy, 'incident.assign')) {
      violations.push({
        field: 'assignedBy',
        rule: 'permission',
        message: 'User does not have permission to assign incidents',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  }
};

/** AssignIncident postconditions */
export const AssignIncidentPostconditions = {
  /** Verify incident is assigned */
  incidentAssigned(output: AssignIncidentOutput): boolean {
    return output.incident.state === 'ASSIGNED';
  },

  /** Verify assignee is set */
  assigneeSet(output: AssignIncidentOutput, expectedAssignee: UserId): boolean {
    return output.incident.assignedTo === expectedAssignee;
  },

  /** Verify state transition recorded */
  stateTransitionRecorded(output: AssignIncidentOutput): boolean {
    return output.stateTransition.newState === 'ASSIGNED';
  },

  /** Verify assigned event emitted */
  assignedEventEmitted(output: AssignIncidentOutput): boolean {
    return output.events.some(e => e.eventType === 'INCIDENT_ASSIGNED');
  }
};

/** AssignIncident contract */
export interface AssignIncidentContract {
  readonly name: 'AssignIncident';
  readonly surface: typeof SURFACE_NAME;
  readonly input: AssignIncidentInput;
  readonly output: AssignIncidentOutput;
  readonly preconditions: typeof AssignIncidentPreconditions;
  readonly postconditions: typeof AssignIncidentPostconditions;
  readonly errors: ValidationError | StateError;
  readonly events: IncidentAssignedEvent[];
}

// ============================================================================
// ResolveIncidentContract
// ============================================================================

/** Input for resolving an incident */
export interface ResolveIncidentInput {
  readonly incidentId: UUID;
  readonly resolutionCode: ResolutionCode;
  readonly resolutionNotes: string;
  readonly resolvedBy: UserId;
  readonly workaround: boolean;
  readonly rootCauseIdentified: boolean;
  readonly knowledgeArticleRef?: Identifier;
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Output from resolving an incident */
export interface ResolveIncidentOutput {
  readonly incident: Incident;
  readonly resolution: ResolutionInfo;
  readonly stateTransition: StateTransitionResult<IncidentState>;
  readonly slaAchieved: boolean;
  readonly events: IncidentResolvedEvent[];
}

/** ResolveIncident preconditions */
export const ResolveIncidentPreconditions = {
  /** Incident must exist */
  incidentExists(incidentId: UUID, getIncident: (id: UUID) => Incident | null): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!getIncident(incidentId)) {
      violations.push({
        field: 'incidentId',
        rule: 'exists',
        message: 'Incident does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Incident must be in resolvable state */
  incidentInResolvableState(incident: Incident): ValidationResult {
    const violations: ValidationViolation[] = [];
    const canResolve = IncidentStateMachine.canTransition(incident.state, 'RESOLVED');
    if (!canResolve) {
      violations.push({
        field: 'state',
        rule: 'validTransition',
        message: `Cannot resolve incident in state ${incident.state}`,
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Resolution notes required */
  resolutionNotesProvided(input: ResolveIncidentInput): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!input.resolutionNotes || input.resolutionNotes.trim().length === 0) {
      violations.push({
        field: 'resolutionNotes',
        rule: 'required',
        message: 'Resolution notes are required',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Resolver must be assigned or have permission */
  resolverAuthorized(
    incident: Incident,
    resolvedBy: UserId,
    hasPermission: (userId: UserId, permission: string) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    const isAssignee = incident.assignedTo === resolvedBy;
    const hasResolvePermission = hasPermission(resolvedBy, 'incident.resolve.any');

    if (!isAssignee && !hasResolvePermission) {
      violations.push({
        field: 'resolvedBy',
        rule: 'authorization',
        message: 'User is not authorized to resolve this incident',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  }
};

/** ResolveIncident postconditions */
export const ResolveIncidentPostconditions = {
  /** Verify incident is resolved */
  incidentResolved(output: ResolveIncidentOutput): boolean {
    return output.incident.state === 'RESOLVED';
  },

  /** Verify resolution info set */
  resolutionInfoSet(output: ResolveIncidentOutput): boolean {
    return output.incident.resolution !== undefined;
  },

  /** Verify SLA status calculated */
  slaStatusCalculated(output: ResolveIncidentOutput): boolean {
    return typeof output.slaAchieved === 'boolean';
  },

  /** Verify resolved event emitted */
  resolvedEventEmitted(output: ResolveIncidentOutput): boolean {
    return output.events.some(e => e.eventType === 'INCIDENT_RESOLVED');
  }
};

/** ResolveIncident contract */
export interface ResolveIncidentContract {
  readonly name: 'ResolveIncident';
  readonly surface: typeof SURFACE_NAME;
  readonly input: ResolveIncidentInput;
  readonly output: ResolveIncidentOutput;
  readonly preconditions: typeof ResolveIncidentPreconditions;
  readonly postconditions: typeof ResolveIncidentPostconditions;
  readonly errors: ValidationError | StateError;
  readonly events: IncidentResolvedEvent[];
}

// ============================================================================
// CloseIncidentContract
// ============================================================================

/** Input for closing an incident */
export interface CloseIncidentInput {
  readonly incidentId: UUID;
  readonly closedBy: UserId;
  readonly closureCode: string;
  readonly closureNotes?: string;
  readonly satisfactionScore?: number;
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Output from closing an incident */
export interface CloseIncidentOutput {
  readonly incident: Incident;
  readonly stateTransition: StateTransitionResult<IncidentState>;
  readonly events: IncidentClosedEvent[];
}

/** CloseIncident preconditions */
export const CloseIncidentPreconditions = {
  /** Incident must exist */
  incidentExists(incidentId: UUID, getIncident: (id: UUID) => Incident | null): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!getIncident(incidentId)) {
      violations.push({
        field: 'incidentId',
        rule: 'exists',
        message: 'Incident does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Incident must be resolved before closing */
  incidentIsResolved(incident: Incident): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (incident.state !== 'RESOLVED') {
      violations.push({
        field: 'state',
        rule: 'validTransition',
        message: 'Incident must be resolved before closing',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Satisfaction score in valid range */
  validSatisfactionScore(input: CloseIncidentInput): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (input.satisfactionScore !== undefined) {
      if (input.satisfactionScore < 1 || input.satisfactionScore > 5) {
        violations.push({
          field: 'satisfactionScore',
          rule: 'range',
          message: 'Satisfaction score must be between 1 and 5',
          severity: 'ERROR'
        });
      }
    }
    return { valid: violations.length === 0, violations };
  },

  /** Closer has permission */
  closerHasPermission(
    closedBy: UserId,
    hasPermission: (userId: UserId, permission: string) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!hasPermission(closedBy, 'incident.close')) {
      violations.push({
        field: 'closedBy',
        rule: 'permission',
        message: 'User does not have permission to close incidents',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  }
};

/** CloseIncident postconditions */
export const CloseIncidentPostconditions = {
  /** Verify incident is closed */
  incidentClosed(output: CloseIncidentOutput): boolean {
    return output.incident.state === 'CLOSED';
  },

  /** Verify closed timestamp set */
  closedTimestampSet(output: CloseIncidentOutput): boolean {
    return output.incident.closedAt !== undefined;
  },

  /** Verify closed event emitted */
  closedEventEmitted(output: CloseIncidentOutput): boolean {
    return output.events.some(e => e.eventType === 'INCIDENT_CLOSED');
  },

  /** Verify state is terminal */
  stateIsTerminal(output: CloseIncidentOutput): boolean {
    return IncidentStateMachine.isTerminal(output.incident.state);
  }
};

/** CloseIncident contract */
export interface CloseIncidentContract {
  readonly name: 'CloseIncident';
  readonly surface: typeof SURFACE_NAME;
  readonly input: CloseIncidentInput;
  readonly output: CloseIncidentOutput;
  readonly preconditions: typeof CloseIncidentPreconditions;
  readonly postconditions: typeof CloseIncidentPostconditions;
  readonly errors: ValidationError | StateError;
  readonly events: IncidentClosedEvent[];
}

// ============================================================================
// Surface Definition
// ============================================================================

/** IncidentSurface contract collection */
export interface IncidentSurface {
  readonly name: typeof SURFACE_NAME;
  readonly version: '1.0.0';
  readonly contracts: {
    readonly CreateIncident: CreateIncidentContract;
    readonly AssignIncident: AssignIncidentContract;
    readonly ResolveIncident: ResolveIncidentContract;
    readonly CloseIncident: CloseIncidentContract;
  };
}

/** Error factory for incident surface */
export const IncidentErrorFactory = {
  /** Create incident not found error */
  incidentNotFound(incidentId: UUID, operation: string): ValidationError {
    return ErrorFactory.preconditionViolation(
      SURFACE_NAME,
      operation,
      [{
        field: 'incidentId',
        rule: 'exists',
        message: `Incident ${incidentId} not found`,
        severity: 'ERROR'
      }]
    );
  },

  /** Create invalid state transition error */
  invalidStateTransition(
    currentState: IncidentState,
    targetState: IncidentState,
    operation: string
  ): StateError {
    return ErrorFactory.invalidTransition(
      SURFACE_NAME,
      operation,
      currentState,
      targetState
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
