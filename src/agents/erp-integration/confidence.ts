/**
 * Confidence Calculation for ERP Integration Agent
 *
 * Calculates confidence scores representing data fidelity and integration success.
 *
 * Confidence semantics:
 * - 1.0: Perfect integration - all records transmitted with full fidelity
 * - 0.8-0.99: High confidence - minor warnings or optional field omissions
 * - 0.5-0.79: Medium confidence - partial success or data transformations
 * - 0.0-0.49: Low confidence - significant failures or data loss
 *
 * @module agents/erp-integration/confidence
 */

import type {
  ErpIntegrationInput,
  IntegrationOutcome,
  IntegrationStatus,
  TransmissionResult,
} from './types';

// =============================================================================
// CONFIDENCE FACTORS
// =============================================================================

/**
 * Confidence factor weights
 */
const FACTOR_WEIGHTS = {
  /** Weight for transmission success rate */
  transmissionSuccess: 0.40,
  /** Weight for data completeness */
  dataCompleteness: 0.25,
  /** Weight for schema compliance */
  schemaCompliance: 0.20,
  /** Weight for environment safety */
  environmentSafety: 0.10,
  /** Weight for operation type */
  operationType: 0.05,
} as const;

/**
 * Environment confidence adjustments
 */
const ENVIRONMENT_CONFIDENCE = {
  sandbox: 1.0,      // Full confidence in sandbox
  development: 0.95, // Slight reduction for dev
  staging: 0.90,     // Moderate reduction for staging
  production: 0.85,  // Production has inherent uncertainty
} as const;

/**
 * Operation type confidence base
 */
const OPERATION_CONFIDENCE = {
  inspect: 1.0,   // Inspection is read-only, always high confidence
  pull: 0.95,     // Pull is read-only
  validate: 0.95, // Validation doesn't transmit
  sync: 0.85,     // Sync is bidirectional, more complex
  push: 0.80,     // Push has highest risk
} as const;

// =============================================================================
// CALCULATION
// =============================================================================

/**
 * Confidence calculation context
 */
export interface ConfidenceContext {
  /** Integration input */
  readonly input: ErpIntegrationInput;
  /** Integration outcome */
  readonly outcome: IntegrationOutcome;
  /** Integration status */
  readonly status: IntegrationStatus;
  /** Schema validation passed */
  readonly schemaValid: boolean;
  /** Data completeness (0.0 - 1.0) */
  readonly dataCompleteness: number;
  /** Any warnings during transmission */
  readonly hasWarnings: boolean;
}

/**
 * Calculates the transmission success factor
 */
function calculateTransmissionFactor(outcome: IntegrationOutcome): number {
  if (outcome.recordsProcessed === 0) {
    return 1.0; // No records to process means success
  }

  const successRate = outcome.recordsSucceeded / outcome.recordsProcessed;
  return successRate;
}

/**
 * Calculates the data completeness factor
 */
function calculateCompletenessFactor(
  transmissions: readonly TransmissionResult[],
  dataCompleteness: number
): number {
  // Base completeness
  let factor = dataCompleteness;

  // Reduce for each transmission with warnings
  for (const tx of transmissions) {
    if (tx.warnings && tx.warnings.length > 0) {
      factor -= 0.02 * tx.warnings.length;
    }
  }

  return Math.max(0, Math.min(1, factor));
}

/**
 * Calculates the schema compliance factor
 */
function calculateSchemaFactor(schemaValid: boolean, hasWarnings: boolean): number {
  if (!schemaValid) {
    return 0.0;
  }
  return hasWarnings ? 0.90 : 1.0;
}

/**
 * Calculates the environment safety factor
 */
function calculateEnvironmentFactor(
  environment: 'production' | 'staging' | 'development' | 'sandbox'
): number {
  return ENVIRONMENT_CONFIDENCE[environment];
}

/**
 * Calculates the operation type factor
 */
function calculateOperationFactor(
  operation: 'push' | 'pull' | 'sync' | 'validate' | 'inspect'
): number {
  return OPERATION_CONFIDENCE[operation];
}

/**
 * Calculates the overall confidence score
 *
 * @param context Confidence calculation context
 * @returns Confidence score between 0.0 and 1.0
 */
export function calculateConfidence(context: ConfidenceContext): number {
  const { input, outcome, status, schemaValid, dataCompleteness, hasWarnings } = context;

  // Status-based early returns
  if (status === 'failed') {
    return 0.0;
  }

  if (status === 'timeout') {
    return 0.1; // Timeout gives minimal confidence
  }

  if (status === 'skipped') {
    // Skipped operations (dry run) get high confidence
    return 0.95;
  }

  // Calculate individual factors
  const transmissionFactor = calculateTransmissionFactor(outcome);
  const completenessFactor = calculateCompletenessFactor(
    outcome.transmissions,
    dataCompleteness
  );
  const schemaFactor = calculateSchemaFactor(schemaValid, hasWarnings);
  const environmentFactor = calculateEnvironmentFactor(input.target.environment);
  const operationFactor = calculateOperationFactor(input.operation);

  // Weighted combination
  const confidence =
    transmissionFactor * FACTOR_WEIGHTS.transmissionSuccess +
    completenessFactor * FACTOR_WEIGHTS.dataCompleteness +
    schemaFactor * FACTOR_WEIGHTS.schemaCompliance +
    environmentFactor * FACTOR_WEIGHTS.environmentSafety +
    operationFactor * FACTOR_WEIGHTS.operationType;

  // Apply partial success penalty
  if (status === 'partial_success') {
    return Math.min(confidence, 0.79); // Cap at medium confidence
  }

  // Ensure confidence is in valid range
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Generates a confidence explanation
 */
export function explainConfidence(context: ConfidenceContext): string {
  const confidence = calculateConfidence(context);
  const { input, outcome, status } = context;

  if (status === 'failed') {
    return 'Integration failed - confidence is 0.0';
  }

  if (status === 'timeout') {
    return 'Integration timed out - minimal confidence assigned';
  }

  if (status === 'skipped') {
    return 'Integration skipped (dry run) - high confidence in validation';
  }

  const successRate = outcome.recordsProcessed > 0
    ? (outcome.recordsSucceeded / outcome.recordsProcessed * 100).toFixed(1)
    : '100';

  const explanation = [
    `Confidence: ${(confidence * 100).toFixed(1)}%`,
    `Transmission success: ${successRate}%`,
    `Environment: ${input.target.environment}`,
    `Operation: ${input.operation}`,
  ];

  if (status === 'partial_success') {
    explanation.push(`${outcome.recordsFailed} record(s) failed`);
  }

  return explanation.join(' | ');
}

/**
 * Determines if confidence meets threshold for production
 *
 * Production deployments require minimum 0.85 confidence
 */
export function meetsProductionThreshold(confidence: number): boolean {
  return confidence >= 0.85;
}

/**
 * Determines if confidence meets threshold for staging
 *
 * Staging deployments require minimum 0.70 confidence
 */
export function meetsStagingThreshold(confidence: number): boolean {
  return confidence >= 0.70;
}
