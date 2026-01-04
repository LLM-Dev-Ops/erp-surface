/**
 * Composition Interfaces for Platform Repositories
 *
 * Defines composition contracts for platform integration without runtime coupling.
 * Each interface specifies what erp-surface provides to consumers.
 */

import { SemanticVersion } from '../common/types/identity';
import { Trace } from '../traces/schemas/trace-schema';
import { SurfaceRegistration } from './registry';

/**
 * LLM-Test-Bench Composition Interface
 *
 * Provides: Surface contracts, fixtures, trace schemas
 * For: Deterministic benchmarking
 */
export interface TestBenchComposition {
  /** Get all surface contracts for benchmarking */
  getSurfaceContracts(): SurfaceContract[];

  /** Get fixtures for a surface */
  getFixtures(surfaceId: string): Fixture[];

  /** Get trace schema for replay verification */
  getTraceSchema(): TraceSchema;

  /** Validate trace against surface contracts */
  validateTrace(trace: Trace): ValidationResult;
}

/** Surface contract for test bench */
export interface SurfaceContract {
  readonly surfaceId: string;
  readonly version: SemanticVersion;
  readonly operations: OperationContract[];
}

/** Operation contract */
export interface OperationContract {
  readonly name: string;
  readonly inputSchema: unknown;
  readonly outputSchema: unknown;
  readonly preconditions: string[];
  readonly postconditions: string[];
}

/** Fixture for testing */
export interface Fixture {
  readonly fixtureId: string;
  readonly surfaceId: string;
  readonly operation: string;
  readonly input: unknown;
  readonly expectedOutput: unknown;
  readonly tags: string[];
}

/** Trace schema */
export interface TraceSchema {
  readonly version: SemanticVersion;
  readonly entryTypes: string[];
  readonly requiredFields: string[];
}

/** Validation result */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * LLM-Observatory Composition Interface
 *
 * Provides: Event schemas, telemetry contracts
 * For: Drift detection and telemetry analysis
 */
export interface ObservatoryComposition {
  /** Get all event schemas */
  getEventSchemas(): EventSchema[];

  /** Get baseline behavioral models */
  getBehavioralBaselines(): BehavioralBaseline[];

  /** Get observable event catalog */
  getEventCatalog(): EventCatalogEntry[];
}

/** Event schema for observatory */
export interface EventSchema {
  readonly eventType: string;
  readonly version: SemanticVersion;
  readonly fields: SchemaField[];
  readonly requiredFields: string[];
}

/** Schema field */
export interface SchemaField {
  readonly name: string;
  readonly type: string;
  readonly description: string;
}

/** Behavioral baseline */
export interface BehavioralBaseline {
  readonly surfaceId: string;
  readonly operation: string;
  readonly expectedDurationMs: { min: number; max: number; avg: number };
  readonly expectedErrorRate: number;
  readonly expectedStateTransitions: string[];
}

/** Event catalog entry */
export interface EventCatalogEntry {
  readonly eventType: string;
  readonly surface: string;
  readonly operation: string;
  readonly description: string;
  readonly severity: 'INFO' | 'WARNING' | 'ERROR';
}

/**
 * LLM-Shield Composition Interface
 *
 * Provides: Contract schemas, validation boundaries
 * For: Security policy enforcement
 */
export interface ShieldComposition {
  /** Get input/output schemas for validation */
  getValidationSchemas(): ValidationSchema[];

  /** Get authorization boundaries */
  getAuthorizationBoundaries(): AuthorizationBoundary[];

  /** Get sensitive field markers */
  getSensitiveFields(): SensitiveFieldMarker[];
}

/** Validation schema for shield */
export interface ValidationSchema {
  readonly surfaceId: string;
  readonly operation: string;
  readonly inputSchema: unknown;
  readonly outputSchema: unknown;
}

/** Authorization boundary */
export interface AuthorizationBoundary {
  readonly surfaceId: string;
  readonly operation: string;
  readonly requiredPermissions: string[];
  readonly sensitiveData: boolean;
}

/** Sensitive field marker */
export interface SensitiveFieldMarker {
  readonly surfaceId: string;
  readonly fieldPath: string;
  readonly sensitivity: 'PII' | 'FINANCIAL' | 'CONFIDENTIAL';
  readonly maskingRequired: boolean;
}

/**
 * LLM-Sentinel Composition Interface
 *
 * Provides: Behavioral models, expected patterns
 * For: Runtime anomaly detection
 */
export interface SentinelComposition {
  /** Get state machine definitions */
  getStateMachines(): StateMachineDefinition[];

  /** Get timing boundaries */
  getTimingBoundaries(): TimingBoundary[];

  /** Get frequency patterns */
  getFrequencyPatterns(): FrequencyPattern[];
}

/** State machine definition */
export interface StateMachineDefinition {
  readonly surfaceId: string;
  readonly entityType: string;
  readonly states: string[];
  readonly transitions: StateTransitionDef[];
  readonly terminalStates: string[];
}

/** State transition definition */
export interface StateTransitionDef {
  readonly from: string;
  readonly to: string;
  readonly trigger: string;
  readonly guards: string[];
}

/** Timing boundary */
export interface TimingBoundary {
  readonly surfaceId: string;
  readonly operation: string;
  readonly expectedDurationMs: number;
  readonly warningThresholdMs: number;
  readonly errorThresholdMs: number;
}

/** Frequency pattern */
export interface FrequencyPattern {
  readonly surfaceId: string;
  readonly operation: string;
  readonly normalRatePerMinute: { min: number; max: number };
  readonly burstThreshold: number;
}

/**
 * LLM-Memory-Graph Composition Interface
 *
 * Provides: Context structures, lineage hints
 * For: Context lineage and provenance tracking
 */
export interface MemoryGraphComposition {
  /** Get correlation structure */
  getCorrelationStructure(): CorrelationStructure;

  /** Get parent-child relationship hints */
  getRelationshipHints(): RelationshipHint[];

  /** Get context cardinality rules */
  getCardinalityRules(): CardinalityRule[];
}

/** Correlation structure */
export interface CorrelationStructure {
  readonly correlationIdFormat: string;
  readonly causationIdFormat: string;
  readonly propagationRules: PropagationRule[];
}

/** Propagation rule */
export interface PropagationRule {
  readonly fromOperation: string;
  readonly toOperation: string;
  readonly propagateCorrelation: boolean;
  readonly createCausation: boolean;
}

/** Relationship hint */
export interface RelationshipHint {
  readonly sourceEntityType: string;
  readonly targetEntityType: string;
  readonly relationshipType: string;
  readonly cardinality: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY';
}

/** Cardinality rule */
export interface CardinalityRule {
  readonly entityType: string;
  readonly relationshipType: string;
  readonly minCount: number;
  readonly maxCount: number | null;
}

/**
 * Agentics Platform Core Composition Interface
 *
 * Provides: Surface registry, binding interfaces
 * For: Orchestration, simulation control, lifecycle management
 */
export interface PlatformCoreComposition {
  /** Get surface registry */
  getSurfaceRegistry(): SurfaceRegistration[];

  /** Get binding interface contracts */
  getBindingInterfaces(): BindingInterface[];

  /** Get lifecycle event definitions */
  getLifecycleEvents(): LifecycleEvent[];
}

/** Binding interface */
export interface BindingInterface {
  readonly surfaceId: string;
  readonly bindingType: 'SIMULATION' | 'EXECUTION';
  readonly requiredMethods: BindingMethod[];
}

/** Binding method */
export interface BindingMethod {
  readonly name: string;
  readonly inputType: string;
  readonly outputType: string;
  readonly async: boolean;
}

/** Lifecycle event */
export interface LifecycleEvent {
  readonly eventType: string;
  readonly phase: 'INITIALIZATION' | 'READY' | 'ACTIVE' | 'DRAINING' | 'TERMINATED';
  readonly payload: Record<string, string>;
}

/**
 * Composition Factory
 *
 * Creates composition interfaces for platform consumers.
 */
export const CompositionFactory = {
  /** Create Test-Bench composition */
  createTestBenchComposition(): TestBenchComposition {
    return {
      getSurfaceContracts: () => [],
      getFixtures: () => [],
      getTraceSchema: () => ({
        version: '1.0.0',
        entryTypes: ['OPERATION_START', 'OPERATION_END', 'STATE_CHANGE', 'EVENT_EMITTED', 'ERROR_OCCURRED', 'CHECKPOINT'],
        requiredFields: ['entryId', 'entryType', 'sequenceNumber', 'timestamp']
      }),
      validateTrace: () => ({ valid: true, errors: [], warnings: [] })
    };
  },

  /** Create Observatory composition */
  createObservatoryComposition(): ObservatoryComposition {
    return {
      getEventSchemas: () => [],
      getBehavioralBaselines: () => [],
      getEventCatalog: () => []
    };
  },

  /** Create Shield composition */
  createShieldComposition(): ShieldComposition {
    return {
      getValidationSchemas: () => [],
      getAuthorizationBoundaries: () => [],
      getSensitiveFields: () => []
    };
  },

  /** Create Sentinel composition */
  createSentinelComposition(): SentinelComposition {
    return {
      getStateMachines: () => [],
      getTimingBoundaries: () => [],
      getFrequencyPatterns: () => []
    };
  },

  /** Create Memory-Graph composition */
  createMemoryGraphComposition(): MemoryGraphComposition {
    return {
      getCorrelationStructure: () => ({
        correlationIdFormat: 'corr-{timestamp}-{random}',
        causationIdFormat: 'uuid-v4',
        propagationRules: []
      }),
      getRelationshipHints: () => [],
      getCardinalityRules: () => []
    };
  },

  /** Create Platform Core composition */
  createPlatformCoreComposition(): PlatformCoreComposition {
    return {
      getSurfaceRegistry: () => [],
      getBindingInterfaces: () => [],
      getLifecycleEvents: () => []
    };
  }
};
