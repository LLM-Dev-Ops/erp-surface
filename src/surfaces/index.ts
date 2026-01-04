/**
 * Surface Definitions Index
 *
 * This module exports all surface contract definitions.
 * Consumers import from this module to access surface contracts.
 *
 * OWNERSHIP:
 * - erp-surface OWNS all definitions in this module
 * - Consumers have READ-ONLY access
 * - No runtime logic in this module
 */

// Re-export all contract types
export * from '../contracts/types';

// =============================================================================
// SURFACE REGISTRY TYPE
// =============================================================================

import type {
  SurfaceContract,
  SurfaceId,
  SurfaceVersion,
  SurfaceBinding
} from '../contracts/types';

/**
 * Surface registry for contract lookup
 *
 * This is a read-only registry that consumers can query.
 * erp-surface publishes contracts to this registry.
 * Consumers cannot modify the registry.
 */
export interface SurfaceRegistry {
  /**
   * Get a surface contract by ID
   * Returns undefined if not found
   */
  readonly get: (id: SurfaceId) => SurfaceContract | undefined;

  /**
   * Get a specific version of a surface contract
   * Returns undefined if not found
   */
  readonly getVersion: (id: SurfaceId, version: SurfaceVersion) => SurfaceContract | undefined;

  /**
   * List all available surface IDs
   * Returns read-only array
   */
  readonly list: () => readonly SurfaceId[];

  /**
   * List all versions for a surface
   * Returns read-only array
   */
  readonly listVersions: (id: SurfaceId) => readonly SurfaceVersion[];

  /**
   * Check if a surface exists
   */
  readonly has: (id: SurfaceId) => boolean;
}

/**
 * Surface catalog for Platform Core binding
 *
 * Platform Core uses this catalog to discover and bind surfaces.
 */
export interface SurfaceCatalog {
  /**
   * Get all published surfaces
   */
  readonly getPublished: () => readonly SurfaceContract[];

  /**
   * Get surfaces by tag
   */
  readonly getByTag: (tag: string) => readonly SurfaceContract[];

  /**
   * Get surfaces compatible with an agent type
   */
  readonly getForAgentType: (agentType: string) => readonly SurfaceContract[];

  /**
   * Create a binding for Platform Core
   */
  readonly createBinding: (id: SurfaceId) => SurfaceBinding | undefined;
}

// =============================================================================
// CONSUMER ACCESS PATTERNS
// =============================================================================

/**
 * Test-Bench access pattern
 *
 * LLM-Test-Bench uses this interface to access benchmark scenarios.
 */
export interface TestBenchAccess {
  /**
   * Get benchmark scenarios for a surface
   */
  readonly getBenchmarkScenarios: (id: SurfaceId) => readonly import('../contracts/types').BenchmarkScenario[];

  /**
   * Get input fixtures for deterministic replay
   */
  readonly getInputFixtures: (scenarioId: string) => readonly import('../contracts/types').InputFixture[];

  /**
   * Get expected outputs for comparison
   */
  readonly getExpectedOutputs: (scenarioId: string) => readonly import('../contracts/types').ExpectedOutput[];
}

/**
 * Observatory access pattern
 *
 * LLM-Observatory uses this interface to access telemetry definitions.
 */
export interface ObservatoryAccess {
  /**
   * Get observable events for a surface
   */
  readonly getObservableEvents: (id: SurfaceId) => readonly import('../contracts/types').ObservableEvent[];

  /**
   * Get telemetry points for a surface
   */
  readonly getTelemetryPoints: (id: SurfaceId) => readonly import('../contracts/types').TelemetryPoint[];

  /**
   * Get normal distributions for drift detection baselines
   */
  readonly getNormalDistributions: (eventType: string) => readonly import('../contracts/types').NormalDistribution[];
}

/**
 * Shield access pattern
 *
 * LLM-Shield uses this interface to access validation schemas.
 */
export interface ShieldAccess {
  /**
   * Get contract schema for validation
   */
  readonly getContractSchema: (id: SurfaceId) => import('../contracts/types').ContractSchema | undefined;

  /**
   * Get security boundaries for policy enforcement
   */
  readonly getSecurityBoundaries: (id: SurfaceId) => readonly import('../contracts/types').SecurityBoundary[];

  /**
   * Get validation rules for a schema
   */
  readonly getValidationRules: (schemaId: string) => readonly import('../contracts/types').ValidationRule[];
}

/**
 * Sentinel access pattern
 *
 * LLM-Sentinel uses this interface to access behavioral models.
 */
export interface SentinelAccess {
  /**
   * Get behavioral model for a surface
   */
  readonly getBehavioralModel: (id: SurfaceId) => import('../contracts/types').BehavioralModel | undefined;

  /**
   * Get baseline patterns for anomaly detection
   */
  readonly getBaselinePatterns: (modelId: string) => readonly import('../contracts/types').BaselinePattern[];

  /**
   * Get normal ranges for threshold comparison
   */
  readonly getNormalRanges: (modelId: string) => readonly import('../contracts/types').NormalRange[];
}

/**
 * Memory-Graph access pattern
 *
 * LLM-Memory-Graph uses this interface to access context structures.
 */
export interface MemoryGraphAccess {
  /**
   * Get interaction context structure for a surface
   */
  readonly getContextStructure: (id: SurfaceId) => import('../contracts/types').InteractionContext | undefined;

  /**
   * Get context emissions for lineage tracking
   */
  readonly getContextEmissions: (id: SurfaceId) => readonly import('../contracts/types').ContextEmission[];

  /**
   * Get relationship hints for graph construction
   */
  readonly getRelationshipHints: (contextId: string) => readonly import('../contracts/types').RelationshipHint[];
}

/**
 * Platform Core access pattern
 *
 * Platform Core uses this interface to access orchestration bindings.
 */
export interface PlatformCoreAccess {
  /**
   * Get orchestration bindings for a surface
   */
  readonly getOrchestrationBindings: (id: SurfaceId) => readonly import('../contracts/types').OrchestrationBinding[];

  /**
   * Get execution constraints for an agent type
   */
  readonly getExecutionConstraints: (agentType: string) => import('../contracts/types').ExecutionConstraints | undefined;

  /**
   * Get lifecycle hooks for a binding
   */
  readonly getLifecycleHooks: (bindingId: string) => readonly import('../contracts/types').LifecycleHook[];
}

// =============================================================================
// COMPOSITION VERIFICATION TYPES
// =============================================================================

/**
 * Composition verification result
 *
 * Used to verify that erp-surface correctly composes with consumers.
 */
export interface CompositionVerification {
  /** Verification passed */
  readonly valid: boolean;

  /** Verification timestamp */
  readonly verifiedAt: string;

  /** Checked boundaries */
  readonly boundaries: readonly BoundaryCheck[];

  /** Any violations found */
  readonly violations: readonly BoundaryViolation[];
}

export interface BoundaryCheck {
  readonly checkId: string;
  readonly consumer: string;
  readonly boundary: string;
  readonly status: 'passed' | 'failed' | 'skipped';
}

export interface BoundaryViolation {
  readonly violationId: string;
  readonly consumer: string;
  readonly boundary: string;
  readonly description: string;
  readonly severity: 'error' | 'warning';
}
