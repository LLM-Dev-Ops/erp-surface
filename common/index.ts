/**
 * Common Module Index
 *
 * Re-exports all common types, events, and errors for ERP Surface contracts.
 */

// Types (explicit to avoid conflicts)
export * from './types/monetary';
export * from './types/temporal';
export * from './types/identity';
export {
  Result,
  Success,
  Failure,
  ValidationResult,
  ValidationViolation,  // Only export once
  StateTransitionResult,
  BatchResult,
  Results
} from './types/result';

// Events
export * from './events';

// Errors (excluding ValidationViolation which is already exported from types)
export {
  SurfaceError,
  ValidationError,
  StateError,
  AuthorizationError,
  SystemError,
  ErrorFactory,
  type ErrorCode,
  type RetryHint,
  type ErrorDetails,
  type ErrorType,
  type ValidationErrorType,
  type StateErrorType,
  type AuthorizationErrorType,
  type SystemErrorType
} from './errors/error-types';
export * from './errors/error-catalog';
