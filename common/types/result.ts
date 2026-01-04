/**
 * Result Types for ERP Surface Contracts
 *
 * Discriminated union types for operation results.
 * All operations return Result<T, E> to ensure failure visibility.
 */

import { SurfaceError } from '../errors/error-types';

/** Success result */
export interface Success<T> {
  readonly success: true;
  readonly data: T;
}

/** Failure result */
export interface Failure<E extends SurfaceError = SurfaceError> {
  readonly success: false;
  readonly error: E;
}

/** Result type - discriminated union of Success and Failure */
export type Result<T, E extends SurfaceError = SurfaceError> = Success<T> | Failure<E>;

/** State transition result */
export interface StateTransitionResult<TState> {
  readonly previousState: TState;
  readonly newState: TState;
  readonly transitionId: string;
  readonly timestamp: string;
}

/** Batch operation result */
export interface BatchResult<T, E extends SurfaceError = SurfaceError> {
  readonly totalCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly results: Array<Result<T, E>>;
}

/** Validation result */
export interface ValidationResult {
  readonly valid: boolean;
  readonly violations: ValidationViolation[];
}

/** Validation violation */
export interface ValidationViolation {
  readonly field: string;
  readonly rule: string;
  readonly message: string;
  readonly severity: 'ERROR' | 'WARNING';
}

/** Result factory functions */
export const Results = {
  /** Create a success result */
  success<T>(data: T): Success<T> {
    return { success: true, data };
  },

  /** Create a failure result */
  failure<E extends SurfaceError>(error: E): Failure<E> {
    return { success: false, error };
  },

  /** Check if result is success */
  isSuccess<T, E extends SurfaceError>(result: Result<T, E>): result is Success<T> {
    return result.success === true;
  },

  /** Check if result is failure */
  isFailure<T, E extends SurfaceError>(result: Result<T, E>): result is Failure<E> {
    return result.success === false;
  },

  /** Map success value */
  map<T, U, E extends SurfaceError>(
    result: Result<T, E>,
    fn: (value: T) => U
  ): Result<U, E> {
    if (result.success) {
      return Results.success(fn(result.data));
    }
    return result;
  },

  /** Flat map success value */
  flatMap<T, U, E extends SurfaceError>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>
  ): Result<U, E> {
    if (result.success) {
      return fn(result.data);
    }
    return result;
  },

  /** Get value or default */
  getOrElse<T, E extends SurfaceError>(result: Result<T, E>, defaultValue: T): T {
    if (result.success) {
      return result.data;
    }
    return defaultValue;
  },

  /** Get value or throw */
  getOrThrow<T, E extends SurfaceError>(result: Result<T, E>): T {
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error.message);
  },

  /** Create validation result */
  validation(valid: boolean, violations: ValidationViolation[] = []): ValidationResult {
    return { valid, violations };
  },

  /** Create batch result */
  batch<T, E extends SurfaceError>(results: Array<Result<T, E>>): BatchResult<T, E> {
    const successCount = results.filter(r => r.success).length;
    return {
      totalCount: results.length,
      successCount,
      failureCount: results.length - successCount,
      results
    };
  }
};
