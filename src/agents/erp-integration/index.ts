/**
 * ERP Integration Agent
 *
 * AGENT CLASSIFICATION: ENTERPRISE SYSTEM INTEGRATION
 *
 * PURPOSE:
 * Translate approved Agentics platform artifacts into enterprise ERP-compatible
 * representations and synchronize them with external systems of record in a
 * controlled, auditable manner.
 *
 * SCOPE:
 * - Normalize Agentics outputs into ERP schemas
 * - Push approved records to ERP systems
 * - Pull limited reference metadata when requested
 * - Emit integration outcome DecisionEvents
 *
 * DECISION TYPE: erp_integration
 *
 * @module agents/erp-integration
 */

// Contract and types
export {
  AGENT_ID,
  AGENT_VERSION,
  DECISION_TYPE,
  FAILURE_MODES,
  INPUT_VALIDATION_RULES,
  VERSIONING_RULES,
  type ErpIntegrationInput,
  type ErpIntegrationOutput,
  type ErpIntegrationDecisionEvent,
  type IntegrationOperationType,
  type IntegrationStatus,
  type ArtifactOrigin,
  type ErpTarget,
  type IntegrationOutcome,
  type TransmissionResult,
  type FailureCode,
  type CliContract,
} from './contract';

// Types and validation
export {
  validateInput,
  isValidInput,
  computeInputsHash,
  buildOutput,
  buildDecisionEvent,
  buildConstraints,
  IntegrationError,
  createError,
  type ValidationError,
  type ValidationResult,
  type BuildOutputOptions,
} from './types';

// Confidence calculation
export {
  calculateConfidence,
  explainConfidence,
  meetsProductionThreshold,
  meetsStagingThreshold,
  type ConfidenceContext,
} from './confidence';

// Mapping and transmission
export {
  mapToErpPayload,
  mapFromErpResponse,
  transmitToErp,
  pullFromErp,
  validateMapping,
  inspectErpEndpoint,
  processBatch,
  type TransmissionContext,
} from './mapper';

// Event emission
export {
  DecisionEventEmitter,
  getEmitter,
  emitDecisionEvent,
  type EmitterConfig,
  type TelemetryEvent,
} from './emitter';

// Executor
export {
  ErpIntegrationExecutor,
  getExecutor,
  execute,
  dryRun,
  validate,
  type ExecutorOptions,
  type ExecutionResult,
} from './executor';

// Platform Registration
export {
  AGENT_REGISTRATION,
  ENDPOINT_REGISTRATION,
  CLI_REGISTRATION,
  COMPOSITION_INTERFACES,
  VERIFICATION_CHECKLIST,
  SMOKE_TEST_COMMANDS,
} from './registration';
