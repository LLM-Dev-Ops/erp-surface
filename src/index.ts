/**
 * ERP Surface
 *
 * A surface abstraction layer for ERP systems that enables:
 * - Simulation mode with deterministic, reproducible behavior
 * - Execution binding (FUTURE) without surface redesign
 * - Contract immutability across all conversion stages
 *
 * CONVERSION MODEL:
 *
 * Stage 1: Surface Definition (erp-surface owns)
 *   - Define behavioral model
 *   - Specify input/output contracts
 *   - Declare observable events
 *
 * Stage 2: Simulation Mode (erp-surface + Platform Core)
 *   - Operate with simulated behaviors
 *   - Deterministic, reproducible responses
 *   - Full observability for testing
 *
 * Stage 3: Execution Binding (FUTURE, NOT erp-surface)
 *   - Binding layer connects surface to actual ERP systems
 *   - Surface contract remains unchanged
 *   - Only the backing implementation changes
 *
 * VENDOR COVERAGE:
 * - SAP S/4HANA
 * - Oracle Financials / Oracle ERP Cloud
 * - Salesforce
 * - Workday
 * - Microsoft Dynamics 365
 * - NetSuite
 * - ServiceNow
 *
 * @module erp-surface
 */

// =============================================================================
// CORE MODULES
// =============================================================================

// Re-export all core modules (conversion, contracts, simulation)
export * from './core';

// =============================================================================
// CONTRACT TYPES (explicit re-exports to avoid conflicts)
// =============================================================================

// Re-export contract type definitions that don't conflict with core
export type {
  SurfaceId,
  SurfaceVersion,
  SurfaceStatus,
  ContractSchema,
  SchemaType,
  SchemaProperty,
  PropertyConstraints,
  AllowedPattern,
  BehavioralModel,
  ExpectedBehavior,
  BehaviorCondition,
  BehaviorOutcome,
  BaselinePattern,
  NormalRange,
  ExecutionPattern,
  ExecutionStep,
  DurationRange,
  ContextPattern,
  ObservableEvent,
  EventSchema as ContractEventSchema,
  EventField,
  NormalDistribution,
  FrequencyHint,
  InteractionContext,
  ContextStructure,
  ContextField,
  NestedContext,
  ContextEmission,
  BenchmarkScenario,
  InputFixture,
  ExpectedOutput,
  OutputTolerances,
  BoundaryCondition,
  InputRange,
  SecurityBoundary,
  AccessLevel,
  DataClassification,
  AllowedOperation,
  OperationCondition,
  TelemetryPoint,
  TelemetryLocation,
  TelemetryMetric,
  SamplingHint,
  OrchestrationBinding,
  ExecutionConstraints,
  LifecycleHook,
  DeprecationNotice,
  SurfaceBinding
} from './contracts/types';

// =============================================================================
// SURFACE REGISTRY
// =============================================================================

// Re-export surface registry
export {
  SurfaceRegistry,
  registry,
  registerAllSurfaces,
  type SurfaceRegistration,
  type SurfaceDomain,
  type VendorCoverage,
  type OperationRegistration,
  type RegistryEntry,
  type DeprecationInfo,
  type RegistryStatistics
} from './registry';

// =============================================================================
// PLATFORM COMPOSITION INTERFACES
// =============================================================================

// Re-export composition interfaces for platform consumers
export {
  // Test-Bench Composition
  type TestBenchComposition,
  type SurfaceContract as TestBenchSurfaceContract,
  type OperationContract,
  type Fixture,
  type TraceSchema,
  type ValidationResult as CompositionValidationResult,

  // Observatory Composition
  type ObservatoryComposition,
  type EventSchema,
  type SchemaField,
  type BehavioralBaseline,
  type EventCatalogEntry,

  // Shield Composition
  type ShieldComposition,
  type ValidationSchema,
  type AuthorizationBoundary,
  type SensitiveFieldMarker,

  // Sentinel Composition
  type SentinelComposition,
  type StateMachineDefinition,
  type StateTransitionDef,
  type TimingBoundary,
  type FrequencyPattern,

  // Memory-Graph Composition
  type MemoryGraphComposition,
  type CorrelationStructure,
  type PropagationRule,
  type RelationshipHint as CompositionRelationshipHint,
  type CardinalityRule,

  // Platform Core Composition
  type PlatformCoreComposition,
  type BindingInterface,
  type BindingMethod,
  type LifecycleEvent,

  // Factory
  CompositionFactory
} from './composition';

// =============================================================================
// CONSUMER ACCESS PATTERNS
// =============================================================================

// Re-export consumer access patterns
export {
  type SurfaceRegistry as SurfaceRegistryInterface,
  type SurfaceCatalog,
  type TestBenchAccess,
  type ObservatoryAccess,
  type ShieldAccess,
  type SentinelAccess,
  type MemoryGraphAccess,
  type PlatformCoreAccess,
  type CompositionVerification,
  type BoundaryCheck,
  type BoundaryViolation
} from './surfaces';

// =============================================================================
// BINDING INTERFACES
// =============================================================================

// Re-export binding interfaces for Platform Core
export * from './bindings/consumer-interfaces';
