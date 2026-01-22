/**
 * ERP Integration Agent Types
 *
 * Type definitions and validation functions for the ERP Integration Agent.
 *
 * @module agents/erp-integration/types
 */

import { createHash } from 'crypto';
import type { UUID } from '../../../common/types/identity';
import type { VendorCoverage, SurfaceDomain } from '../../registry';
import type {
  ErpIntegrationInput,
  ErpIntegrationOutput,
  ErpIntegrationDecisionEvent,
  IntegrationOperationType,
  IntegrationStatus,
  ArtifactOrigin,
  ErpTarget,
  IntegrationOutcome,
  TransmissionResult,
  FailureCode,
} from './contract';
import { AGENT_ID, AGENT_VERSION, DECISION_TYPE, FAILURE_MODES } from './contract';

// =============================================================================
// RE-EXPORTS
// =============================================================================

export type {
  ErpIntegrationInput,
  ErpIntegrationOutput,
  ErpIntegrationDecisionEvent,
  IntegrationOperationType,
  IntegrationStatus,
  ArtifactOrigin,
  ErpTarget,
  IntegrationOutcome,
  TransmissionResult,
  FailureCode,
};

export { AGENT_ID, AGENT_VERSION, DECISION_TYPE, FAILURE_MODES };

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Valid vendors
 */
const VALID_VENDORS: readonly (keyof VendorCoverage)[] = [
  'sap', 'oracle', 'salesforce', 'workday', 'dynamics', 'netsuite', 'servicenow'
];

/**
 * Valid domains
 */
const VALID_DOMAINS: readonly SurfaceDomain[] = [
  'finance', 'procurement', 'hcm', 'supply-chain', 'customer', 'service'
];

/**
 * Valid operations
 */
const VALID_OPERATIONS: readonly IntegrationOperationType[] = [
  'push', 'pull', 'sync', 'validate', 'inspect'
];

/**
 * Valid environments
 */
const VALID_ENVIRONMENTS = ['production', 'staging', 'development', 'sandbox'] as const;

/**
 * Validation error
 */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly value?: unknown;
}

/**
 * Validation result
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

/**
 * Validates the ERP target specification
 */
function validateTarget(target: unknown): readonly ValidationError[] {
  const errors: ValidationError[] = [];

  if (!target || typeof target !== 'object') {
    errors.push({ field: 'target', message: 'Target is required and must be an object' });
    return errors;
  }

  const t = target as Record<string, unknown>;

  if (!t.vendor || !VALID_VENDORS.includes(t.vendor as keyof VendorCoverage)) {
    errors.push({
      field: 'target.vendor',
      message: `Vendor must be one of: ${VALID_VENDORS.join(', ')}`,
      value: t.vendor
    });
  }

  if (!t.entityType || typeof t.entityType !== 'string' || t.entityType.length === 0) {
    errors.push({
      field: 'target.entityType',
      message: 'Entity type is required and must be a non-empty string',
      value: t.entityType
    });
  }

  if (!t.domain || !VALID_DOMAINS.includes(t.domain as SurfaceDomain)) {
    errors.push({
      field: 'target.domain',
      message: `Domain must be one of: ${VALID_DOMAINS.join(', ')}`,
      value: t.domain
    });
  }

  if (!t.environment || !VALID_ENVIRONMENTS.includes(t.environment as typeof VALID_ENVIRONMENTS[number])) {
    errors.push({
      field: 'target.environment',
      message: `Environment must be one of: ${VALID_ENVIRONMENTS.join(', ')}`,
      value: t.environment
    });
  }

  return errors;
}

/**
 * Validates ERP Integration Agent input
 */
export function validateInput(input: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: [{ field: 'input', message: 'Input is required and must be an object' }] };
  }

  const i = input as Record<string, unknown>;

  // Validate requestId
  if (!i.requestId || typeof i.requestId !== 'string') {
    errors.push({ field: 'requestId', message: 'Request ID is required', value: i.requestId });
  }

  // Validate correlationId
  if (!i.correlationId || typeof i.correlationId !== 'string' || (i.correlationId as string).length === 0) {
    errors.push({ field: 'correlationId', message: 'Correlation ID is required', value: i.correlationId });
  }

  // Validate operation
  if (!i.operation || !VALID_OPERATIONS.includes(i.operation as IntegrationOperationType)) {
    errors.push({
      field: 'operation',
      message: `Operation must be one of: ${VALID_OPERATIONS.join(', ')}`,
      value: i.operation
    });
  }

  // Validate target
  errors.push(...validateTarget(i.target));

  // Validate artifact (if provided)
  if (i.artifact !== undefined) {
    if (typeof i.artifact !== 'object' || i.artifact === null) {
      errors.push({ field: 'artifact', message: 'Artifact must be an object', value: i.artifact });
    } else {
      const artifact = i.artifact as Record<string, unknown>;
      const validSources = ['agentics-dev-platform', 'enterprise-roi-engine', 'diligence', 'governance'];
      if (!artifact.source || !validSources.includes(artifact.source as string)) {
        errors.push({
          field: 'artifact.source',
          message: `Artifact source must be one of: ${validSources.join(', ')}`,
          value: artifact.source
        });
      }
      if (!artifact.artifactId || typeof artifact.artifactId !== 'string') {
        errors.push({ field: 'artifact.artifactId', message: 'Artifact ID is required', value: artifact.artifactId });
      }
    }
  }

  // Validate timeoutMs (if provided)
  if (i.timeoutMs !== undefined) {
    if (typeof i.timeoutMs !== 'number' || i.timeoutMs < 1000 || i.timeoutMs > 300000) {
      errors.push({
        field: 'timeoutMs',
        message: 'Timeout must be between 1000 and 300000 milliseconds',
        value: i.timeoutMs
      });
    }
  }

  // Operation-specific validations
  const operation = i.operation as IntegrationOperationType;
  if (operation === 'push' || operation === 'sync' || operation === 'validate') {
    if (!i.payload && !i.artifact) {
      errors.push({
        field: 'payload',
        message: `${operation} operation requires either payload or artifact reference`
      });
    }
  }

  if (operation === 'pull') {
    if (!i.query) {
      errors.push({
        field: 'query',
        message: 'Pull operation requires a query'
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Type guard for ErpIntegrationInput
 */
export function isValidInput(input: unknown): input is ErpIntegrationInput {
  return validateInput(input).valid;
}

// =============================================================================
// HASHING
// =============================================================================

/**
 * Computes a SHA-256 hash of the input for integrity verification
 */
export function computeInputsHash(input: ErpIntegrationInput): string {
  const normalized = JSON.stringify({
    requestId: input.requestId,
    correlationId: input.correlationId,
    operation: input.operation,
    target: input.target,
    artifact: input.artifact,
    payload: input.payload,
    query: input.query,
    dryRun: input.dryRun,
  });
  return createHash('sha256').update(normalized).digest('hex');
}

// =============================================================================
// BUILDERS
// =============================================================================

/**
 * Options for building integration output
 */
export interface BuildOutputOptions {
  readonly input: ErpIntegrationInput;
  readonly executionId: UUID;
  readonly status: IntegrationStatus;
  readonly outcome: IntegrationOutcome;
  readonly confidence: number;
  readonly constraintsApplied: readonly string[];
  readonly startTime: number;
}

/**
 * Builds an ErpIntegrationOutput from execution results
 */
export function buildOutput(options: BuildOutputOptions): ErpIntegrationOutput {
  return {
    requestId: options.input.requestId,
    executionId: options.executionId,
    correlationId: options.input.correlationId,
    agentId: AGENT_ID,
    agentVersion: AGENT_VERSION,
    status: options.status,
    outcome: options.outcome,
    confidence: options.confidence,
    constraintsApplied: options.constraintsApplied,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - options.startTime,
  };
}

/**
 * Builds an ErpIntegrationDecisionEvent from input and output
 */
export function buildDecisionEvent(
  input: ErpIntegrationInput,
  output: ErpIntegrationOutput,
  eventId: UUID
): ErpIntegrationDecisionEvent {
  return {
    eventId,
    eventType: 'INTEGRATION_DECISION',
    agent_id: AGENT_ID,
    agent_version: AGENT_VERSION,
    decision_type: DECISION_TYPE,
    inputs_hash: computeInputsHash(input),
    outputs: output,
    confidence: output.confidence,
    constraints_applied: output.constraintsApplied,
    execution_ref: output.correlationId,
    timestamp: output.timestamp,
  };
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Integration error
 */
export class IntegrationError extends Error {
  readonly code: FailureCode;
  readonly recoverable: boolean;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(
    code: FailureCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'IntegrationError';
    this.code = code;

    // Find the failure mode
    const mode = Object.values(FAILURE_MODES).find(m => m.code === code);
    this.recoverable = mode?.recoverable ?? false;
    this.retryable = mode?.retryable ?? false;
    this.details = details;
  }
}

/**
 * Creates an IntegrationError from a failure mode key
 */
export function createError(
  modeKey: keyof typeof FAILURE_MODES,
  details?: Record<string, unknown>
): IntegrationError {
  const mode = FAILURE_MODES[modeKey];
  return new IntegrationError(mode.code, mode.description, details);
}

// =============================================================================
// CONSTRAINTS
// =============================================================================

/**
 * Builds constraints applied list based on input and target
 */
export function buildConstraints(input: ErpIntegrationInput): string[] {
  const constraints: string[] = [];

  // ERP system constraint
  constraints.push(`erp_system:${input.target.vendor}`);

  // Domain constraint
  constraints.push(`domain:${input.target.domain}`);

  // Entity type constraint
  constraints.push(`entity_type:${input.target.entityType}`);

  // Environment constraint
  constraints.push(`environment:${input.target.environment}`);

  // Operation constraint
  constraints.push(`operation:${input.operation}`);

  // Instance constraint (if provided)
  if (input.target.instanceId) {
    constraints.push(`instance:${input.target.instanceId}`);
  }

  // Dry run constraint
  if (input.dryRun) {
    constraints.push('mode:dry_run');
  }

  // Artifact source constraint (if provided)
  if (input.artifact) {
    constraints.push(`artifact_source:${input.artifact.source}`);
    if (input.artifact.governanceApprovalRef) {
      constraints.push(`governance_approval:${input.artifact.governanceApprovalRef}`);
    }
  }

  return constraints;
}
