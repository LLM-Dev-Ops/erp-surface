/**
 * Consumer Interface Bindings
 *
 * This module defines the interface contracts that each consumer
 * uses to compose with erp-surface. These are the ONLY ways
 * consumers can interact with erp-surface.
 *
 * CRITICAL BOUNDARIES:
 * - All interfaces are READ-ONLY
 * - No execution logic in erp-surface
 * - No storage logic in erp-surface
 * - Unidirectional data flow only
 */

import type {
  SurfaceContract,
  SurfaceId,
  SurfaceVersion,
  ContractSchema,
  BehavioralModel,
  ObservableEvent,
  InteractionContext,
  BenchmarkScenario,
  SecurityBoundary,
  TelemetryPoint,
  OrchestrationBinding,
  SurfaceBinding,
} from '../contracts/types';

// =============================================================================
// LLM-TEST-BENCH BINDING INTERFACE
// =============================================================================

/**
 * Interface for LLM-Test-Bench composition
 *
 * Test-Bench consumes surface contracts for deterministic benchmarking.
 *
 * BOUNDARY:
 * - erp-surface provides: Contract definitions, benchmark scenarios
 * - Test-Bench provides: Benchmark execution, deterministic replay
 * - erp-surface NEVER: Executes benchmarks, stores results
 * - Test-Bench NEVER: Modifies contracts, authors scenarios
 */
export interface TestBenchBinding {
  /**
   * Surface contract version this binding targets
   */
  readonly surfaceVersion: SurfaceVersion;

  /**
   * Get all benchmark scenarios from a surface
   * Test-Bench uses these for deterministic replay
   */
  readonly scenarios: readonly BenchmarkScenario[];

  /**
   * Input schema for benchmark validation
   * Test-Bench validates inputs before replay
   */
  readonly inputSchema: ContractSchema;

  /**
   * Output schema for result comparison
   * Test-Bench compares outputs against this
   */
  readonly outputSchema: ContractSchema;

  /**
   * Behavioral model for expected behaviors
   * Test-Bench verifies behaviors match
   */
  readonly behavioralModel: BehavioralModel;
}

/**
 * Factory type for creating Test-Bench bindings
 * (Type definition only - no implementation)
 */
export type CreateTestBenchBinding = (surfaceId: SurfaceId) => TestBenchBinding | undefined;

// =============================================================================
// LLM-OBSERVATORY BINDING INTERFACE
// =============================================================================

/**
 * Interface for LLM-Observatory composition
 *
 * Observatory consumes observable events for telemetry collection.
 *
 * BOUNDARY:
 * - erp-surface provides: Event schemas, telemetry points, distributions
 * - Observatory provides: Collection, drift detection, alerting
 * - erp-surface NEVER: Collects telemetry, detects drift
 * - Observatory NEVER: Defines event schemas, modifies distributions
 */
export interface ObservatoryBinding {
  /**
   * Surface contract version this binding targets
   */
  readonly surfaceVersion: SurfaceVersion;

  /**
   * Observable events this surface emits
   * Observatory subscribes to these event types
   */
  readonly observableEvents: readonly ObservableEvent[];

  /**
   * Telemetry emission points
   * Observatory collects from these points
   */
  readonly telemetryPoints: readonly TelemetryPoint[];

  /**
   * Behavioral model for normal ranges
   * Observatory uses for drift baseline
   */
  readonly behavioralModel: BehavioralModel;
}

/**
 * Factory type for creating Observatory bindings
 */
export type CreateObservatoryBinding = (surfaceId: SurfaceId) => ObservatoryBinding | undefined;

// =============================================================================
// LLM-SHIELD BINDING INTERFACE
// =============================================================================

/**
 * Interface for LLM-Shield composition
 *
 * Shield consumes contract schemas for policy enforcement.
 *
 * BOUNDARY:
 * - erp-surface provides: Schemas, validation rules, security boundaries
 * - Shield provides: Policy enforcement, validation execution
 * - erp-surface NEVER: Enforces policies, makes security decisions
 * - Shield NEVER: Authors schemas, defines validation rules
 */
export interface ShieldBinding {
  /**
   * Surface contract version this binding targets
   */
  readonly surfaceVersion: SurfaceVersion;

  /**
   * Input schema for validation
   * Shield validates incoming data against this
   */
  readonly inputSchema: ContractSchema;

  /**
   * Output schema for validation
   * Shield validates outgoing data against this
   */
  readonly outputSchema: ContractSchema;

  /**
   * Security boundaries for policy enforcement
   * Shield enforces these boundaries
   */
  readonly securityBoundaries: readonly SecurityBoundary[];
}

/**
 * Factory type for creating Shield bindings
 */
export type CreateShieldBinding = (surfaceId: SurfaceId) => ShieldBinding | undefined;

// =============================================================================
// LLM-SENTINEL BINDING INTERFACE
// =============================================================================

/**
 * Interface for LLM-Sentinel composition
 *
 * Sentinel consumes behavioral models for anomaly detection.
 *
 * BOUNDARY:
 * - erp-surface provides: Behavioral models, baselines, patterns
 * - Sentinel provides: Anomaly detection, runtime monitoring
 * - erp-surface NEVER: Detects anomalies, monitors runtime
 * - Sentinel NEVER: Defines models, authors baselines
 */
export interface SentinelBinding {
  /**
   * Surface contract version this binding targets
   */
  readonly surfaceVersion: SurfaceVersion;

  /**
   * Behavioral model for anomaly baselines
   * Sentinel compares runtime behavior against this
   */
  readonly behavioralModel: BehavioralModel;

  /**
   * Observable events for monitoring
   * Sentinel monitors these event types
   */
  readonly observableEvents: readonly ObservableEvent[];
}

/**
 * Factory type for creating Sentinel bindings
 */
export type CreateSentinelBinding = (surfaceId: SurfaceId) => SentinelBinding | undefined;

// =============================================================================
// LLM-MEMORY-GRAPH BINDING INTERFACE
// =============================================================================

/**
 * Interface for LLM-Memory-Graph composition
 *
 * Memory-Graph consumes interaction contexts for lineage tracking.
 *
 * BOUNDARY:
 * - erp-surface provides: Context structures, relationship hints
 * - Memory-Graph provides: Lineage tracking, graph storage
 * - erp-surface NEVER: Stores lineage, tracks relationships
 * - Memory-Graph NEVER: Produces context, defines structures
 */
export interface MemoryGraphBinding {
  /**
   * Surface contract version this binding targets
   */
  readonly surfaceVersion: SurfaceVersion;

  /**
   * Interaction context structure
   * Memory-Graph uses for lineage node creation
   */
  readonly interactionContext: InteractionContext;

  /**
   * Context emissions for lineage tracking
   * Memory-Graph tracks these emissions
   */
  readonly contextEmissions: SurfaceContract['contextEmissions'];
}

/**
 * Factory type for creating Memory-Graph bindings
 */
export type CreateMemoryGraphBinding = (surfaceId: SurfaceId) => MemoryGraphBinding | undefined;

// =============================================================================
// PLATFORM CORE BINDING INTERFACE
// =============================================================================

/**
 * Interface for Platform Core composition
 *
 * Platform Core consumes surface contracts for orchestration.
 *
 * BOUNDARY:
 * - erp-surface provides: Surface contracts, orchestration bindings
 * - Platform Core provides: Orchestration, execution, simulation
 * - erp-surface NEVER: Orchestrates agents, controls execution
 * - Platform Core NEVER: Defines surfaces, authors contracts
 */
export interface PlatformCoreBinding {
  /**
   * Full surface binding for orchestration
   */
  readonly surfaceBinding: SurfaceBinding;

  /**
   * Orchestration bindings for agent assignment
   */
  readonly orchestrationBindings: readonly OrchestrationBinding[];

  /**
   * Input schema for simulation inputs
   */
  readonly simulationInputSchema: ContractSchema;

  /**
   * Behavioral model for execution patterns
   */
  readonly behavioralModel: BehavioralModel;
}

/**
 * Factory type for creating Platform Core bindings
 */
export type CreatePlatformCoreBinding = (surfaceId: SurfaceId) => PlatformCoreBinding | undefined;

// =============================================================================
// UNIFIED BINDING FACTORY
// =============================================================================

/**
 * Unified interface for all consumer bindings
 *
 * This interface provides a single entry point for all consumers
 * to create their specific bindings.
 */
export interface BindingFactory {
  /**
   * Create binding for LLM-Test-Bench
   */
  readonly forTestBench: CreateTestBenchBinding;

  /**
   * Create binding for LLM-Observatory
   */
  readonly forObservatory: CreateObservatoryBinding;

  /**
   * Create binding for LLM-Shield
   */
  readonly forShield: CreateShieldBinding;

  /**
   * Create binding for LLM-Sentinel
   */
  readonly forSentinel: CreateSentinelBinding;

  /**
   * Create binding for LLM-Memory-Graph
   */
  readonly forMemoryGraph: CreateMemoryGraphBinding;

  /**
   * Create binding for Platform Core
   */
  readonly forPlatformCore: CreatePlatformCoreBinding;
}

// =============================================================================
// COMPOSITION GUARANTEES
// =============================================================================

/**
 * Composition guarantee verification type
 *
 * Used to verify that composition boundaries are maintained.
 */
export interface CompositionGuarantee {
  /** Guarantee identifier */
  readonly guaranteeId: string;

  /** What erp-surface provides */
  readonly provides: readonly string[];

  /** What erp-surface never does */
  readonly neverDoes: readonly string[];

  /** What consumer provides */
  readonly consumerProvides: readonly string[];

  /** What consumer never does */
  readonly consumerNeverDoes: readonly string[];
}

/**
 * All composition guarantees defined
 */
export const COMPOSITION_GUARANTEES: readonly CompositionGuarantee[] = [
  {
    guaranteeId: 'G1-DEFINITION-VS-EXECUTION',
    provides: ['surface definitions', 'contract schemas', 'behavioral models'],
    neverDoes: ['execute surfaces', 'run benchmarks', 'process requests'],
    consumerProvides: ['execution runtime', 'benchmark execution', 'request processing'],
    consumerNeverDoes: ['define surfaces', 'author contracts', 'modify schemas'],
  },
  {
    guaranteeId: 'G2-SCHEMA-VS-ENFORCEMENT',
    provides: ['validation schemas', 'security boundaries', 'allowed patterns'],
    neverDoes: ['enforce policies', 'make security decisions', 'block requests'],
    consumerProvides: ['policy enforcement', 'security decisions', 'access control'],
    consumerNeverDoes: ['author schemas', 'define boundaries', 'create patterns'],
  },
  {
    guaranteeId: 'G3-MODEL-VS-DETECTION',
    provides: ['behavioral models', 'baseline patterns', 'normal ranges'],
    neverDoes: ['detect anomalies', 'monitor runtime', 'generate alerts'],
    consumerProvides: ['anomaly detection', 'runtime monitoring', 'alert generation'],
    consumerNeverDoes: ['define models', 'author baselines', 'set ranges'],
  },
  {
    guaranteeId: 'G4-EVENT-VS-OBSERVATION',
    provides: ['event schemas', 'telemetry points', 'distribution hints'],
    neverDoes: ['collect telemetry', 'detect drift', 'store metrics'],
    consumerProvides: ['telemetry collection', 'drift detection', 'metric storage'],
    consumerNeverDoes: ['define events', 'author schemas', 'modify points'],
  },
  {
    guaranteeId: 'G5-CONTEXT-VS-LINEAGE',
    provides: ['context structures', 'relationship hints', 'emission patterns'],
    neverDoes: ['track lineage', 'store graphs', 'maintain relationships'],
    consumerProvides: ['lineage tracking', 'graph storage', 'relationship management'],
    consumerNeverDoes: ['produce context', 'define structures', 'author hints'],
  },
  {
    guaranteeId: 'G6-CONTRACT-VS-ORCHESTRATION',
    provides: ['surface contracts', 'orchestration bindings', 'execution constraints'],
    neverDoes: ['orchestrate agents', 'control lifecycle', 'manage execution'],
    consumerProvides: ['agent orchestration', 'lifecycle control', 'execution management'],
    consumerNeverDoes: ['define contracts', 'author bindings', 'set constraints'],
  },
] as const;
