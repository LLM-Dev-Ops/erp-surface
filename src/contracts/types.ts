/**
 * erp-surface Contract Type Definitions
 *
 * These types define the surface contracts that other platform
 * repositories consume. erp-surface OWNS these definitions.
 *
 * Consumers:
 * - LLM-Test-Bench: Uses SurfaceContract for benchmark scenarios
 * - LLM-Observatory: Uses ObservableEvent for telemetry
 * - LLM-Shield: Uses ContractSchema for policy validation
 * - LLM-Sentinel: Uses BehavioralModel for anomaly baselines
 * - LLM-Memory-Graph: Uses InteractionContext for lineage
 * - Platform Core: Uses SurfaceBinding for orchestration
 */

// =============================================================================
// CORE SURFACE TYPES
// =============================================================================

/**
 * Unique identifier for a surface contract
 */
export type SurfaceId = `surface:${string}`;

/**
 * Version following semantic versioning
 */
export type SurfaceVersion = `${number}.${number}.${number}`;

/**
 * Surface contract status in lifecycle
 */
export type SurfaceStatus =
  | 'draft'      // Under development, not consumable
  | 'published'  // Active and consumable
  | 'deprecated' // Marked for removal, migration required
  | 'archived';  // No longer consumable

// =============================================================================
// SURFACE CONTRACT
// =============================================================================

/**
 * Core surface contract definition
 *
 * A surface contract is an immutable specification that defines:
 * - What inputs a surface accepts
 * - What outputs a surface produces
 * - What behaviors are expected
 * - What events are observable
 */
export interface SurfaceContract {
  /** Unique surface identifier */
  readonly id: SurfaceId;

  /** Human-readable name */
  readonly name: string;

  /** Contract version (semantic) */
  readonly version: SurfaceVersion;

  /** Current lifecycle status */
  readonly status: SurfaceStatus;

  /** Input schema definition */
  readonly inputSchema: ContractSchema;

  /** Output schema definition */
  readonly outputSchema: ContractSchema;

  /** Expected behavioral patterns */
  readonly behavioralModel: BehavioralModel;

  /** Observable event definitions */
  readonly observableEvents: readonly ObservableEvent[];

  /** Benchmark scenarios for Test-Bench */
  readonly benchmarkScenarios: readonly BenchmarkScenario[];

  /** Security boundaries for Shield */
  readonly securityBoundaries: readonly SecurityBoundary[];

  /** Telemetry emission points for Observatory */
  readonly telemetryPoints: readonly TelemetryPoint[];

  /** Context emission patterns for Memory-Graph */
  readonly contextEmissions: readonly ContextEmission[];

  /** Orchestration bindings for Platform Core */
  readonly orchestrationBindings: readonly OrchestrationBinding[];

  /** Contract metadata */
  readonly metadata: ContractMetadata;
}

// =============================================================================
// CONTRACT SCHEMA (for LLM-Shield)
// =============================================================================

/**
 * Schema definition for contract validation
 *
 * LLM-Shield consumes these schemas to enforce policies.
 * erp-surface OWNS the schema definition.
 * LLM-Shield OWNS the enforcement.
 */
export interface ContractSchema {
  /** Schema identifier */
  readonly schemaId: string;

  /** JSON Schema compatible type */
  readonly type: SchemaType;

  /** Property definitions */
  readonly properties: Readonly<Record<string, SchemaProperty>>;

  /** Required property names */
  readonly required: readonly string[];

  /** Validation rules (Shield enforces these) */
  readonly validationRules: readonly ValidationRule[];

  /** Allowed patterns (Shield matches against these) */
  readonly allowedPatterns: readonly AllowedPattern[];
}

export type SchemaType =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null';

export interface SchemaProperty {
  readonly type: SchemaType;
  readonly description: string;
  readonly constraints?: PropertyConstraints;
}

export interface PropertyConstraints {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly pattern?: string;
  readonly enum?: readonly unknown[];
}

export interface ValidationRule {
  readonly ruleId: string;
  readonly expression: string;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

export interface AllowedPattern {
  readonly patternId: string;
  readonly regex: string;
  readonly description: string;
}

// =============================================================================
// BEHAVIORAL MODEL (for LLM-Sentinel)
// =============================================================================

/**
 * Behavioral model specification
 *
 * LLM-Sentinel consumes these models for anomaly detection.
 * erp-surface OWNS the model definition.
 * LLM-Sentinel OWNS the detection.
 */
export interface BehavioralModel {
  /** Model identifier */
  readonly modelId: string;

  /** Expected behavior patterns */
  readonly expectedBehaviors: readonly ExpectedBehavior[];

  /** Baseline patterns for comparison */
  readonly baselinePatterns: readonly BaselinePattern[];

  /** Normal operating ranges */
  readonly normalRanges: readonly NormalRange[];

  /** Execution patterns for Platform Core */
  readonly executionPatterns: readonly ExecutionPattern[];

  /** Context patterns for Memory-Graph */
  readonly contextPatterns: readonly ContextPattern[];
}

export interface ExpectedBehavior {
  readonly behaviorId: string;
  readonly description: string;
  readonly conditions: readonly BehaviorCondition[];
  readonly outcomes: readonly BehaviorOutcome[];
}

export interface BehaviorCondition {
  readonly field: string;
  readonly operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'matches';
  readonly value: unknown;
}

export interface BehaviorOutcome {
  readonly outcomeId: string;
  readonly probability: number;
  readonly description: string;
}

export interface BaselinePattern {
  readonly patternId: string;
  readonly metricName: string;
  readonly expectedValue: number;
  readonly standardDeviation: number;
  readonly sampleSize: number;
}

export interface NormalRange {
  readonly rangeId: string;
  readonly metricName: string;
  readonly minimum: number;
  readonly maximum: number;
  readonly unit: string;
}

export interface ExecutionPattern {
  readonly patternId: string;
  readonly sequence: readonly ExecutionStep[];
  readonly expectedDuration: DurationRange;
}

export interface ExecutionStep {
  readonly stepId: string;
  readonly action: string;
  readonly expectedDuration: DurationRange;
}

export interface DurationRange {
  readonly minimum: number;
  readonly maximum: number;
  readonly unit: 'ms' | 's' | 'm';
}

export interface ContextPattern {
  readonly patternId: string;
  readonly contextType: string;
  readonly expectedFields: readonly string[];
  readonly retentionHint: 'ephemeral' | 'session' | 'persistent';
}

// =============================================================================
// OBSERVABLE EVENT (for LLM-Observatory)
// =============================================================================

/**
 * Observable event definition
 *
 * LLM-Observatory consumes these events for telemetry.
 * erp-surface OWNS the event schema definition.
 * LLM-Observatory OWNS the collection and analysis.
 */
export interface ObservableEvent {
  /** Event type identifier */
  readonly eventType: string;

  /** Event schema */
  readonly schema: EventSchema;

  /** Normal distribution parameters */
  readonly normalDistributions: readonly NormalDistribution[];

  /** Emission frequency hints */
  readonly frequencyHint: FrequencyHint;
}

export interface EventSchema {
  readonly fields: readonly EventField[];
  readonly required: readonly string[];
}

export interface EventField {
  readonly name: string;
  readonly type: SchemaType;
  readonly description: string;
}

export interface NormalDistribution {
  readonly fieldName: string;
  readonly mean: number;
  readonly standardDeviation: number;
}

export interface FrequencyHint {
  readonly expectedPerMinute: number;
  readonly burstThreshold: number;
}

// =============================================================================
// INTERACTION CONTEXT (for LLM-Memory-Graph)
// =============================================================================

/**
 * Interaction context structure
 *
 * LLM-Memory-Graph consumes these contexts for lineage tracking.
 * erp-surface OWNS the context production.
 * LLM-Memory-Graph OWNS the lineage storage.
 */
export interface InteractionContext {
  /** Context identifier */
  readonly contextId: string;

  /** Context structure definition */
  readonly structure: ContextStructure;

  /** Relationship hints for graph construction */
  readonly relationshipHints: readonly RelationshipHint[];
}

export interface ContextStructure {
  readonly fields: readonly ContextField[];
  readonly nestedContexts: readonly NestedContext[];
}

export interface ContextField {
  readonly name: string;
  readonly type: SchemaType;
  readonly lineageRelevant: boolean;
}

export interface NestedContext {
  readonly name: string;
  readonly structure: ContextStructure;
  readonly cardinality: 'one' | 'many';
}

export interface RelationshipHint {
  readonly relationshipType: string;
  readonly sourceField: string;
  readonly targetContextType: string;
}

// =============================================================================
// CONTEXT EMISSION
// =============================================================================

export interface ContextEmission {
  readonly emissionId: string;
  readonly contextType: string;
  readonly triggerCondition: string;
  readonly contextTemplate: InteractionContext;
}

// =============================================================================
// BENCHMARK SCENARIO (for LLM-Test-Bench)
// =============================================================================

/**
 * Benchmark scenario definition
 *
 * LLM-Test-Bench consumes these scenarios for deterministic replay.
 * erp-surface OWNS the scenario definition.
 * LLM-Test-Bench OWNS the execution.
 */
export interface BenchmarkScenario {
  /** Scenario identifier */
  readonly scenarioId: string;

  /** Scenario description */
  readonly description: string;

  /** Input fixtures for replay */
  readonly inputFixtures: readonly InputFixture[];

  /** Expected outputs for comparison */
  readonly expectedOutputs: readonly ExpectedOutput[];

  /** Boundary conditions */
  readonly boundaryConditions: readonly BoundaryCondition[];
}

export interface InputFixture {
  readonly fixtureId: string;
  readonly input: unknown;
  readonly tags: readonly string[];
}

export interface ExpectedOutput {
  readonly outputId: string;
  readonly fixtureId: string;
  readonly expectedResult: unknown;
  readonly tolerances?: OutputTolerances;
}

export interface OutputTolerances {
  readonly numericTolerance?: number;
  readonly stringFuzzyMatch?: boolean;
  readonly ignoreFields?: readonly string[];
}

export interface BoundaryCondition {
  readonly conditionId: string;
  readonly description: string;
  readonly inputRange: InputRange;
  readonly expectedBehavior: string;
}

export interface InputRange {
  readonly field: string;
  readonly minimum?: unknown;
  readonly maximum?: unknown;
}

// =============================================================================
// SECURITY BOUNDARY (for LLM-Shield)
// =============================================================================

/**
 * Security boundary definition
 *
 * LLM-Shield consumes these boundaries for policy enforcement.
 * erp-surface OWNS the boundary definition.
 * LLM-Shield OWNS the enforcement.
 */
export interface SecurityBoundary {
  /** Boundary identifier */
  readonly boundaryId: string;

  /** Boundary description */
  readonly description: string;

  /** Access level required */
  readonly accessLevel: AccessLevel;

  /** Data classification */
  readonly dataClassification: DataClassification;

  /** Allowed operations */
  readonly allowedOperations: readonly AllowedOperation[];
}

export type AccessLevel =
  | 'public'
  | 'authenticated'
  | 'privileged'
  | 'system';

export type DataClassification =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted';

export interface AllowedOperation {
  readonly operationId: string;
  readonly operationType: 'read' | 'write' | 'execute';
  readonly conditions: readonly OperationCondition[];
}

export interface OperationCondition {
  readonly field: string;
  readonly requirement: string;
}

// =============================================================================
// TELEMETRY POINT (for LLM-Observatory)
// =============================================================================

/**
 * Telemetry emission point
 *
 * LLM-Observatory consumes these points for event collection.
 * erp-surface OWNS the point definition.
 * LLM-Observatory OWNS the collection.
 */
export interface TelemetryPoint {
  /** Point identifier */
  readonly pointId: string;

  /** Point location in surface */
  readonly location: TelemetryLocation;

  /** Metrics emitted at this point */
  readonly metrics: readonly TelemetryMetric[];

  /** Sampling configuration hint */
  readonly samplingHint: SamplingHint;
}

export interface TelemetryLocation {
  readonly phase: 'input' | 'processing' | 'output' | 'error';
  readonly component: string;
}

export interface TelemetryMetric {
  readonly metricName: string;
  readonly metricType: 'counter' | 'gauge' | 'histogram' | 'summary';
  readonly unit: string;
}

export interface SamplingHint {
  readonly strategy: 'all' | 'random' | 'adaptive';
  readonly rate?: number;
}

// =============================================================================
// ORCHESTRATION BINDING (for Platform Core)
// =============================================================================

/**
 * Orchestration binding definition
 *
 * Platform Core consumes these bindings for surface execution.
 * erp-surface OWNS the binding definition.
 * Platform Core OWNS the orchestration.
 */
export interface OrchestrationBinding {
  /** Binding identifier */
  readonly bindingId: string;

  /** Agent type this surface binds to */
  readonly agentType: string;

  /** Simulation input schema */
  readonly simulationInputs: ContractSchema;

  /** Execution constraints */
  readonly executionConstraints: ExecutionConstraints;

  /** Lifecycle hooks */
  readonly lifecycleHooks: readonly LifecycleHook[];
}

export interface ExecutionConstraints {
  readonly maxDuration: DurationRange;
  readonly maxRetries: number;
  readonly isolationLevel: 'none' | 'process' | 'container';
}

export interface LifecycleHook {
  readonly hookId: string;
  readonly phase: 'pre-execute' | 'post-execute' | 'on-error';
  readonly eventType: string;
}

// =============================================================================
// CONTRACT METADATA
// =============================================================================

export interface ContractMetadata {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly author: string;
  readonly tags: readonly string[];
  readonly deprecationNotice?: DeprecationNotice;
}

export interface DeprecationNotice {
  readonly message: string;
  readonly replacementSurfaceId?: SurfaceId;
  readonly sunsetDate: string;
}

// =============================================================================
// SURFACE BINDING (Platform Core consumption)
// =============================================================================

/**
 * Surface binding for Platform Core
 *
 * This is what Platform Core receives when binding a surface.
 * All fields are read-only - Platform Core cannot modify.
 */
export interface SurfaceBinding {
  readonly surface: SurfaceContract;
  readonly bindingVersion: SurfaceVersion;
  readonly boundAt: string;
}

// =============================================================================
// EXPORT VERIFICATION
// =============================================================================

/**
 * Type-level verification that all exports are:
 * 1. Read-only (no mutable fields)
 * 2. Schema/type definitions only
 * 3. No runtime logic
 *
 * This file should ONLY contain:
 * - Type definitions
 * - Interface definitions
 * - Type aliases
 *
 * This file should NEVER contain:
 * - Functions
 * - Classes with methods
 * - Runtime logic
 * - Side effects
 */
