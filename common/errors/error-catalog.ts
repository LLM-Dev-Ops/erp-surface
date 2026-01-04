/**
 * Error Catalog for ERP Surface Contracts
 *
 * Comprehensive catalog of all error codes across ERP surfaces.
 * Provides error documentation for LLM-Shield composition.
 */

import { ErrorCode, ErrorType } from './error-types';

/** Error catalog entry */
export interface ErrorCatalogEntry {
  /** Unique error code */
  readonly code: ErrorCode;

  /** Error type */
  readonly type: ErrorType;

  /** Error category */
  readonly category: ErrorCategory;

  /** Human-readable description */
  readonly description: string;

  /** Applicable surfaces */
  readonly surfaces: string[];

  /** Whether error is recoverable */
  readonly recoverable: boolean;

  /** Suggested resolution */
  readonly resolution: string;
}

/** Error category */
export type ErrorCategory =
  | 'VALIDATION'
  | 'STATE'
  | 'AUTHORIZATION'
  | 'SYSTEM'
  | 'BUSINESS';

/** Error catalog - comprehensive list of all error codes */
export const ERROR_CATALOG: Record<ErrorCode, ErrorCatalogEntry> = {
  // Validation Errors
  'ERR_PRECONDITION_VIOLATION': {
    code: 'ERR_PRECONDITION_VIOLATION',
    type: 'PRECONDITION_VIOLATION',
    category: 'VALIDATION',
    description: 'One or more preconditions for the operation were not satisfied',
    surfaces: ['*'],
    recoverable: false,
    resolution: 'Review the preconditions and ensure all required conditions are met before retrying'
  },
  'ERR_SCHEMA_VIOLATION': {
    code: 'ERR_SCHEMA_VIOLATION',
    type: 'SCHEMA_VIOLATION',
    category: 'VALIDATION',
    description: 'Input data does not conform to the expected schema',
    surfaces: ['*'],
    recoverable: false,
    resolution: 'Validate input data against the contract schema before submission'
  },
  'ERR_BUSINESS_RULE_VIOLATION': {
    code: 'ERR_BUSINESS_RULE_VIOLATION',
    type: 'BUSINESS_RULE_VIOLATION',
    category: 'BUSINESS',
    description: 'Operation violates a business rule or constraint',
    surfaces: ['*'],
    recoverable: false,
    resolution: 'Review business rules and adjust the operation accordingly'
  },

  // Finance-specific validation errors
  'ERR_UNBALANCED_ENTRY': {
    code: 'ERR_UNBALANCED_ENTRY',
    type: 'BUSINESS_RULE_VIOLATION',
    category: 'BUSINESS',
    description: 'Journal entry debits do not equal credits',
    surfaces: ['GeneralLedgerSurface'],
    recoverable: false,
    resolution: 'Ensure total debits equal total credits before posting'
  },
  'ERR_INVALID_ACCOUNT': {
    code: 'ERR_INVALID_ACCOUNT',
    type: 'PRECONDITION_VIOLATION',
    category: 'VALIDATION',
    description: 'Account number does not exist in chart of accounts',
    surfaces: ['GeneralLedgerSurface', 'AccountsPayableSurface', 'AccountsReceivableSurface'],
    recoverable: false,
    resolution: 'Verify account number exists in chart of accounts'
  },
  'ERR_CLOSED_PERIOD': {
    code: 'ERR_CLOSED_PERIOD',
    type: 'PRECONDITION_VIOLATION',
    category: 'VALIDATION',
    description: 'Posting date falls within a closed fiscal period',
    surfaces: ['GeneralLedgerSurface', 'AccountsPayableSurface', 'AccountsReceivableSurface'],
    recoverable: false,
    resolution: 'Use a posting date within an open fiscal period or request period reopening'
  },

  // Procurement-specific errors
  'ERR_INVALID_SUPPLIER': {
    code: 'ERR_INVALID_SUPPLIER',
    type: 'PRECONDITION_VIOLATION',
    category: 'VALIDATION',
    description: 'Supplier is not active or does not exist',
    surfaces: ['PurchaseOrderSurface', 'SupplierSurface'],
    recoverable: false,
    resolution: 'Verify supplier is active and approved for ordering'
  },
  'ERR_BUDGET_EXCEEDED': {
    code: 'ERR_BUDGET_EXCEEDED',
    type: 'BUSINESS_RULE_VIOLATION',
    category: 'BUSINESS',
    description: 'Purchase would exceed available budget',
    surfaces: ['PurchaseOrderSurface'],
    recoverable: false,
    resolution: 'Request budget increase or reduce order value'
  },
  'ERR_MATERIAL_NOT_FOUND': {
    code: 'ERR_MATERIAL_NOT_FOUND',
    type: 'PRECONDITION_VIOLATION',
    category: 'VALIDATION',
    description: 'Material/item does not exist in master data',
    surfaces: ['PurchaseOrderSurface', 'InventorySurface'],
    recoverable: false,
    resolution: 'Create material master record or use valid material ID'
  },

  // HCM-specific errors
  'ERR_POSITION_NOT_VACANT': {
    code: 'ERR_POSITION_NOT_VACANT',
    type: 'PRECONDITION_VIOLATION',
    category: 'VALIDATION',
    description: 'Position is already filled',
    surfaces: ['EmployeeSurface'],
    recoverable: false,
    resolution: 'Select a vacant position or terminate current incumbent'
  },
  'ERR_COMPENSATION_OUT_OF_RANGE': {
    code: 'ERR_COMPENSATION_OUT_OF_RANGE',
    type: 'BUSINESS_RULE_VIOLATION',
    category: 'BUSINESS',
    description: 'Compensation is outside the allowed range for the position',
    surfaces: ['EmployeeSurface', 'PayrollSurface'],
    recoverable: false,
    resolution: 'Adjust compensation to fall within position salary range'
  },

  // State Errors
  'ERR_INVALID_TRANSITION': {
    code: 'ERR_INVALID_TRANSITION',
    type: 'INVALID_TRANSITION',
    category: 'STATE',
    description: 'The requested state transition is not allowed from the current state',
    surfaces: ['*'],
    recoverable: false,
    resolution: 'Review the state machine and ensure the transition is valid'
  },
  'ERR_CONCURRENCY_CONFLICT': {
    code: 'ERR_CONCURRENCY_CONFLICT',
    type: 'CONCURRENCY_CONFLICT',
    category: 'STATE',
    description: 'Entity was modified by another operation',
    surfaces: ['*'],
    recoverable: true,
    resolution: 'Refresh entity state and retry the operation'
  },
  'ERR_STALE_STATE': {
    code: 'ERR_STALE_STATE',
    type: 'STALE_STATE',
    category: 'STATE',
    description: 'Entity state is outdated',
    surfaces: ['*'],
    recoverable: true,
    resolution: 'Fetch latest entity state and retry'
  },

  // Authorization Errors
  'ERR_INSUFFICIENT_PERMISSION': {
    code: 'ERR_INSUFFICIENT_PERMISSION',
    type: 'INSUFFICIENT_PERMISSION',
    category: 'AUTHORIZATION',
    description: 'User lacks required permission for the operation',
    surfaces: ['*'],
    recoverable: false,
    resolution: 'Request appropriate permissions from administrator'
  },
  'ERR_EXPIRED_AUTHORIZATION': {
    code: 'ERR_EXPIRED_AUTHORIZATION',
    type: 'EXPIRED_AUTHORIZATION',
    category: 'AUTHORIZATION',
    description: 'Authorization token or session has expired',
    surfaces: ['*'],
    recoverable: true,
    resolution: 'Refresh authorization and retry'
  },

  // System Errors
  'ERR_UNAVAILABLE': {
    code: 'ERR_UNAVAILABLE',
    type: 'UNAVAILABLE',
    category: 'SYSTEM',
    description: 'Service is temporarily unavailable',
    surfaces: ['*'],
    recoverable: true,
    resolution: 'Wait and retry after a delay'
  },
  'ERR_TIMEOUT': {
    code: 'ERR_TIMEOUT',
    type: 'TIMEOUT',
    category: 'SYSTEM',
    description: 'Operation timed out',
    surfaces: ['*'],
    recoverable: true,
    resolution: 'Retry with appropriate timeout settings'
  },
  'ERR_INTERNAL': {
    code: 'ERR_INTERNAL',
    type: 'INTERNAL_ERROR',
    category: 'SYSTEM',
    description: 'An unexpected internal error occurred',
    surfaces: ['*'],
    recoverable: false,
    resolution: 'Contact support with error details and correlation ID'
  }
};

/** Get error catalog entry by code */
export const getErrorEntry = (code: ErrorCode): ErrorCatalogEntry | undefined => {
  return ERROR_CATALOG[code];
};

/** Get all errors for a surface */
export const getErrorsForSurface = (surface: string): ErrorCatalogEntry[] => {
  return Object.values(ERROR_CATALOG).filter(
    entry => entry.surfaces.includes('*') || entry.surfaces.includes(surface)
  );
};

/** Get all recoverable errors */
export const getRecoverableErrors = (): ErrorCatalogEntry[] => {
  return Object.values(ERROR_CATALOG).filter(entry => entry.recoverable);
};

/** Get errors by category */
export const getErrorsByCategory = (category: ErrorCategory): ErrorCatalogEntry[] => {
  return Object.values(ERROR_CATALOG).filter(entry => entry.category === category);
};
