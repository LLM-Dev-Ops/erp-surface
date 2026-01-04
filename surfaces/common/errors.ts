/**
 * Common Error Types for ERP Surface Contracts
 * Provides standardized error handling across all surface domains
 */

// ============================================================================
// Base Error Types
// ============================================================================

export abstract class SurfaceError extends Error {
  abstract code: string;
  abstract readonly category: ErrorCategory;
  readonly timestamp: string;
  readonly correlationId?: string;

  constructor(message: string, correlationId?: string) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.correlationId = correlationId;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ErrorResponse {
    return {
      code: this.code,
      category: this.category,
      message: this.message,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
    };
  }
}

export type ErrorCategory =
  | 'VALIDATION'
  | 'PRECONDITION'
  | 'POSTCONDITION'
  | 'STATE_TRANSITION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'AUTHORIZATION'
  | 'SYSTEM';

export interface ErrorResponse {
  code: string;
  category: ErrorCategory;
  message: string;
  timestamp: string;
  correlationId?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Validation Errors
// ============================================================================

export class ValidationError extends SurfaceError {
  code = 'VALIDATION_ERROR';
  readonly category: ErrorCategory = 'VALIDATION';
  readonly fieldErrors: FieldError[];

  constructor(message: string, fieldErrors: FieldError[] = [], correlationId?: string) {
    super(message, correlationId);
    this.fieldErrors = fieldErrors;
  }

  override toJSON(): ErrorResponse {
    return {
      ...super.toJSON(),
      details: { fieldErrors: this.fieldErrors },
    };
  }
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
  value?: unknown;
}

// ============================================================================
// Precondition Errors
// ============================================================================

export class PreconditionError extends SurfaceError {
  code = 'PRECONDITION_FAILED';
  readonly category: ErrorCategory = 'PRECONDITION';
  readonly preconditionName: string;

  constructor(preconditionName: string, message: string, correlationId?: string) {
    super(message, correlationId);
    this.preconditionName = preconditionName;
  }

  override toJSON(): ErrorResponse {
    return {
      ...super.toJSON(),
      details: { preconditionName: this.preconditionName },
    };
  }
}

// ============================================================================
// Postcondition Errors
// ============================================================================

export class PostconditionError extends SurfaceError {
  code = 'POSTCONDITION_FAILED';
  readonly category: ErrorCategory = 'POSTCONDITION';
  readonly postconditionName: string;

  constructor(postconditionName: string, message: string, correlationId?: string) {
    super(message, correlationId);
    this.postconditionName = postconditionName;
  }

  override toJSON(): ErrorResponse {
    return {
      ...super.toJSON(),
      details: { postconditionName: this.postconditionName },
    };
  }
}

// ============================================================================
// State Transition Errors
// ============================================================================

export class StateTransitionError extends SurfaceError {
  code = 'INVALID_STATE_TRANSITION';
  readonly category: ErrorCategory = 'STATE_TRANSITION';
  readonly fromState: string;
  readonly toState: string;
  readonly entityType: string;

  constructor(
    entityType: string,
    fromState: string,
    toState: string,
    correlationId?: string
  ) {
    super(
      `Invalid state transition for ${entityType}: cannot transition from ${fromState} to ${toState}`,
      correlationId
    );
    this.entityType = entityType;
    this.fromState = fromState;
    this.toState = toState;
  }

  override toJSON(): ErrorResponse {
    return {
      ...super.toJSON(),
      details: {
        entityType: this.entityType,
        fromState: this.fromState,
        toState: this.toState,
      },
    };
  }
}

// ============================================================================
// Not Found Errors
// ============================================================================

export class NotFoundError extends SurfaceError {
  code = 'ENTITY_NOT_FOUND';
  readonly category: ErrorCategory = 'NOT_FOUND';
  readonly entityType: string;
  readonly entityId: string;

  constructor(entityType: string, entityId: string, correlationId?: string) {
    super(`${entityType} with id '${entityId}' not found`, correlationId);
    this.entityType = entityType;
    this.entityId = entityId;
  }

  override toJSON(): ErrorResponse {
    return {
      ...super.toJSON(),
      details: {
        entityType: this.entityType,
        entityId: this.entityId,
      },
    };
  }
}

// ============================================================================
// Conflict Errors
// ============================================================================

export class ConflictError extends SurfaceError {
  code = 'CONFLICT';
  readonly category: ErrorCategory = 'CONFLICT';
  readonly conflictType: string;

  constructor(conflictType: string, message: string, correlationId?: string) {
    super(message, correlationId);
    this.conflictType = conflictType;
  }

  override toJSON(): ErrorResponse {
    return {
      ...super.toJSON(),
      details: { conflictType: this.conflictType },
    };
  }
}

// ============================================================================
// Authorization Errors
// ============================================================================

export class AuthorizationError extends SurfaceError {
  code = 'AUTHORIZATION_DENIED';
  readonly category: ErrorCategory = 'AUTHORIZATION';
  readonly requiredPermission?: string;
  readonly userId?: string;

  constructor(message: string, requiredPermission?: string, userId?: string, correlationId?: string) {
    super(message, correlationId);
    this.requiredPermission = requiredPermission;
    this.userId = userId;
  }

  override toJSON(): ErrorResponse {
    return {
      ...super.toJSON(),
      details: {
        requiredPermission: this.requiredPermission,
        userId: this.userId,
      },
    };
  }
}

// ============================================================================
// System Errors
// ============================================================================

export class SystemError extends SurfaceError {
  code = 'SYSTEM_ERROR';
  readonly category: ErrorCategory = 'SYSTEM';
  readonly originalError?: Error;

  constructor(message: string, originalError?: Error, correlationId?: string) {
    super(message, correlationId);
    this.originalError = originalError;
  }
}

// ============================================================================
// HCM-Specific Errors
// ============================================================================

export class EmployeeNotFoundError extends NotFoundError {
  constructor(employeeId: string, correlationId?: string) {
    super('Employee', employeeId, correlationId);
    this.code = 'EMPLOYEE_NOT_FOUND';
  }
}

export class PositionNotFoundError extends NotFoundError {
  constructor(positionId: string, correlationId?: string) {
    super('Position', positionId, correlationId);
    this.code = 'POSITION_NOT_FOUND';
  }
}

export class PositionFilledError extends ConflictError {
  readonly positionId: string;

  constructor(positionId: string, correlationId?: string) {
    super('POSITION_FILLED', `Position '${positionId}' is already filled`, correlationId);
    this.code = 'POSITION_ALREADY_FILLED';
    this.positionId = positionId;
  }
}

export class InvalidTerminationError extends PreconditionError {
  constructor(message: string, correlationId?: string) {
    super('ValidTermination', message, correlationId);
    this.code = 'INVALID_TERMINATION';
  }
}

export class PayrollProcessingError extends SystemError {
  constructor(message: string, originalError?: Error, correlationId?: string) {
    super(message, originalError, correlationId);
    this.code = 'PAYROLL_PROCESSING_ERROR';
  }
}

export class BenefitsEnrollmentError extends PreconditionError {
  constructor(message: string, correlationId?: string) {
    super('BenefitsEnrollment', message, correlationId);
    this.code = 'BENEFITS_ENROLLMENT_ERROR';
  }
}

export class TimesheetApprovalError extends PreconditionError {
  constructor(message: string, correlationId?: string) {
    super('TimesheetApproval', message, correlationId);
    this.code = 'TIMESHEET_APPROVAL_ERROR';
  }
}
