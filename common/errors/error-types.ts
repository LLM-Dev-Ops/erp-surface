/**
 * Error Types for ERP Surface Contracts
 *
 * Hierarchical error types ensuring failure visibility.
 * All errors are typed, observable, and include recovery hints.
 */

/** Error code type */
export type ErrorCode = string;

/** Retry hint for recoverable errors */
export interface RetryHint {
  /** Whether retry is recommended */
  readonly shouldRetry: boolean;

  /** Recommended delay before retry in milliseconds */
  readonly delayMs: number;

  /** Maximum number of retries */
  readonly maxRetries: number;

  /** Whether to use exponential backoff */
  readonly exponentialBackoff: boolean;
}

/** Error details for diagnostics */
export interface ErrorDetails {
  /** Field that caused the error (if applicable) */
  readonly field?: string;

  /** Expected value or constraint */
  readonly expected?: string;

  /** Actual value received */
  readonly actual?: string;

  /** Additional context */
  readonly context?: Record<string, unknown>;
}

/** Base surface error interface */
export interface SurfaceError {
  /** Unique error code */
  readonly errorCode: ErrorCode;

  /** Error type discriminator */
  readonly errorType: ErrorType;

  /** Human-readable error message */
  readonly message: string;

  /** Detailed error information */
  readonly details: ErrorDetails;

  /** Whether the error is recoverable */
  readonly recoverable: boolean;

  /** Retry hint for recoverable errors */
  readonly retryHint: RetryHint | null;

  /** Timestamp of error occurrence */
  readonly timestamp: string;

  /** Surface that generated the error */
  readonly surface: string;

  /** Operation that failed */
  readonly operation: string;
}

/** Error type hierarchy */
export type ErrorType =
  | ValidationErrorType
  | StateErrorType
  | AuthorizationErrorType
  | SystemErrorType;

/** Validation error types */
export type ValidationErrorType =
  | 'PRECONDITION_VIOLATION'
  | 'SCHEMA_VIOLATION'
  | 'BUSINESS_RULE_VIOLATION';

/** State error types */
export type StateErrorType =
  | 'INVALID_TRANSITION'
  | 'CONCURRENCY_CONFLICT'
  | 'STALE_STATE';

/** Authorization error types */
export type AuthorizationErrorType =
  | 'INSUFFICIENT_PERMISSION'
  | 'EXPIRED_AUTHORIZATION';

/** System error types */
export type SystemErrorType =
  | 'UNAVAILABLE'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR';

/** Validation error */
export interface ValidationError extends SurfaceError {
  readonly errorType: ValidationErrorType;
  readonly violations: ValidationViolation[];
}

/** Validation violation detail */
export interface ValidationViolation {
  readonly field: string;
  readonly rule: string;
  readonly message: string;
  readonly severity: 'ERROR' | 'WARNING';
}

/** State error */
export interface StateError extends SurfaceError {
  readonly errorType: StateErrorType;
  readonly currentState: string;
  readonly attemptedTransition: string;
}

/** Authorization error */
export interface AuthorizationError extends SurfaceError {
  readonly errorType: AuthorizationErrorType;
  readonly requiredPermission: string;
}

/** System error */
export interface SystemError extends SurfaceError {
  readonly errorType: SystemErrorType;
}

/** Error factory */
export const ErrorFactory = {
  /** Create precondition violation error */
  preconditionViolation(
    surface: string,
    operation: string,
    violations: ValidationViolation[],
    message?: string
  ): ValidationError {
    return {
      errorCode: 'ERR_PRECONDITION_VIOLATION',
      errorType: 'PRECONDITION_VIOLATION',
      message: message || `Precondition violation in ${operation}`,
      details: {
        context: { violationCount: violations.length }
      },
      recoverable: false,
      retryHint: null,
      timestamp: new Date().toISOString(),
      surface,
      operation,
      violations
    };
  },

  /** Create schema violation error */
  schemaViolation(
    surface: string,
    operation: string,
    field: string,
    expected: string,
    actual: string
  ): ValidationError {
    return {
      errorCode: 'ERR_SCHEMA_VIOLATION',
      errorType: 'SCHEMA_VIOLATION',
      message: `Schema violation: field '${field}' expected ${expected}, got ${actual}`,
      details: { field, expected, actual },
      recoverable: false,
      retryHint: null,
      timestamp: new Date().toISOString(),
      surface,
      operation,
      violations: [{
        field,
        rule: 'schema',
        message: `Expected ${expected}, got ${actual}`,
        severity: 'ERROR'
      }]
    };
  },

  /** Create business rule violation error */
  businessRuleViolation(
    surface: string,
    operation: string,
    rule: string,
    message: string,
    details?: ErrorDetails
  ): ValidationError {
    return {
      errorCode: 'ERR_BUSINESS_RULE_VIOLATION',
      errorType: 'BUSINESS_RULE_VIOLATION',
      message,
      details: details || {},
      recoverable: false,
      retryHint: null,
      timestamp: new Date().toISOString(),
      surface,
      operation,
      violations: [{
        field: '',
        rule,
        message,
        severity: 'ERROR'
      }]
    };
  },

  /** Create invalid transition error */
  invalidTransition(
    surface: string,
    operation: string,
    currentState: string,
    attemptedTransition: string
  ): StateError {
    return {
      errorCode: 'ERR_INVALID_TRANSITION',
      errorType: 'INVALID_TRANSITION',
      message: `Invalid state transition from '${currentState}' via '${attemptedTransition}'`,
      details: {
        context: { currentState, attemptedTransition }
      },
      recoverable: false,
      retryHint: null,
      timestamp: new Date().toISOString(),
      surface,
      operation,
      currentState,
      attemptedTransition
    };
  },

  /** Create concurrency conflict error */
  concurrencyConflict(
    surface: string,
    operation: string,
    entityId: string
  ): StateError {
    return {
      errorCode: 'ERR_CONCURRENCY_CONFLICT',
      errorType: 'CONCURRENCY_CONFLICT',
      message: `Concurrency conflict on entity '${entityId}'`,
      details: { context: { entityId } },
      recoverable: true,
      retryHint: {
        shouldRetry: true,
        delayMs: 100,
        maxRetries: 3,
        exponentialBackoff: true
      },
      timestamp: new Date().toISOString(),
      surface,
      operation,
      currentState: 'UNKNOWN',
      attemptedTransition: operation
    };
  },

  /** Create insufficient permission error */
  insufficientPermission(
    surface: string,
    operation: string,
    requiredPermission: string
  ): AuthorizationError {
    return {
      errorCode: 'ERR_INSUFFICIENT_PERMISSION',
      errorType: 'INSUFFICIENT_PERMISSION',
      message: `Insufficient permission: '${requiredPermission}' required`,
      details: { context: { requiredPermission } },
      recoverable: false,
      retryHint: null,
      timestamp: new Date().toISOString(),
      surface,
      operation,
      requiredPermission
    };
  },

  /** Create timeout error */
  timeout(
    surface: string,
    operation: string,
    timeoutMs: number
  ): SystemError {
    return {
      errorCode: 'ERR_TIMEOUT',
      errorType: 'TIMEOUT',
      message: `Operation timed out after ${timeoutMs}ms`,
      details: { context: { timeoutMs } },
      recoverable: true,
      retryHint: {
        shouldRetry: true,
        delayMs: 1000,
        maxRetries: 2,
        exponentialBackoff: true
      },
      timestamp: new Date().toISOString(),
      surface,
      operation
    };
  },

  /** Create internal error */
  internal(
    surface: string,
    operation: string,
    message: string
  ): SystemError {
    return {
      errorCode: 'ERR_INTERNAL',
      errorType: 'INTERNAL_ERROR',
      message,
      details: {},
      recoverable: false,
      retryHint: null,
      timestamp: new Date().toISOString(),
      surface,
      operation
    };
  }
};
