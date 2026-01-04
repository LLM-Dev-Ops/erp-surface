/**
 * ERP Surface Core Module
 *
 * This module exports the core abstractions for the erp-surface package:
 * - Conversion Model: Defines how surfaces transition from simulation to execution
 * - Surface Contracts: Immutable specifications that remain constant across modes
 * - Simulation Engine: Provides deterministic, reproducible behavior in simulation mode
 *
 * @module erp-surface/core
 */

// Conversion Model
export {
  // Enums
  ConversionStage,
  BindingType,

  // Stage Ownership
  STAGE_OWNERSHIP,

  // Guarantees
  CONVERSION_GUARANTEES,

  // Validation Criteria
  STAGE_1_VALIDATION_CRITERIA,
  STAGE_2_VALIDATION_CRITERIA,
  STAGE_3_VALIDATION_CRITERIA,

  // Types
  type StageOwnership,
  type BindableSurface,
  type BindingPoint,
  type DataContract,
  type ValidationRule,
  type EventDeclaration,
  type BindabilityValidation,
  type BindabilityIssue,
  type BindingRequirements,
  type GuaranteeVerification,
  type ConversionFlow,
  type TransitionValidation,
  type StageValidationCriteria,
  type ValidationCriterion,
  type RiskMitigation,
  type BindingFailureStrategy,
  type BindingValidationStrategy,
  type RollbackStrategy
} from './conversion/conversion-model';

// Surface Contracts
export {
  // Enums
  InvariantType,

  // Classes
  SurfaceContractBuilder,

  // Functions
  compareContracts,

  // Types
  type SurfaceContract,
  type InputContract,
  type OutputContract,
  type EventContract,
  type EmittedEventSpec,
  type ReceivedEventSpec,
  type Invariant,
  type InvariantVerification,
  type ContractMetadata,
  type ContractDependency,
  type CompatibilityInfo,
  type InputValidationRule,
  type ValidationResult,
  type ValidationError,
  type ContractValidationResult,
  type ContractError,
  type ErrorType,
  type JsonSchema,
  type ContractComparisonResult,
  type ContractDifference
} from './contracts/surface-contract';

// Simulation Engine
export {
  // Classes
  SimulatedSurface,
  DefaultResponseMap,

  // Functions
  runScenario,

  // Types
  type SimulationBehavior,
  type ResponseMap,
  type InputPattern,
  type ErrorSimulationConfig,
  type SimulatedErrorType,
  type SimulationResult,
  type SimulatedError,
  type SimulationObserver,
  type SimulationNotification,
  type SimulationStatistics,
  type SimulationScenario,
  type ScenarioResult
} from './simulation/simulation-engine';
