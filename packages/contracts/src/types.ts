/**
 * TypeScript types derived from ERP Surface JSON Schemas
 * @module @agentics/contracts/types
 */

// =============================================================================
// EXECUTIVE SYNTHESIS TYPES
// =============================================================================

/**
 * Risk level for deployment recommendation
 */
export type RiskLevel = 'medium' | 'high' | 'critical';

/**
 * Executive recommendation for deployment
 */
export type Recommendation = 'APPROVE' | 'DEFER' | 'REJECT';

/**
 * Environment classification
 */
export type EnvironmentType = 'production' | 'staging' | 'development' | 'sandbox';

/**
 * Deployment reference information
 */
export interface DeployReference {
  /** Target environment (production, staging, etc.) */
  readonly environment: EnvironmentType;
  /** ERP system identifier (e.g., SAP_S4, ORACLE_FINANCIALS) */
  readonly system: string;
  /** Execution completion timestamp (ISO 8601) */
  readonly timestamp: string;
  /** Optional version identifier */
  readonly version?: string;
  /** Optional commit SHA for traceability */
  readonly commit_sha?: string;
}

/**
 * Blocking issue that prevents deployment
 */
export interface BlockingIssue {
  /** Issue code identifier */
  readonly code: string;
  /** Human-readable description */
  readonly description: string;
  /** Severity level */
  readonly severity: 'error' | 'critical';
  /** Affected component or entity */
  readonly affected?: string;
}

/**
 * Execution metrics for synthesis
 */
export interface ExecutionMetrics {
  /**
   * Success rate (0.0 - 1.0)
   * 1.0 if: ERP schema mapping succeeds, required entities resolved, no blocking validation errors
   * < 1.0 if: partial mappings or warnings exist
   */
  readonly success_rate: number;
  /**
   * Count of failed iterations:
   * - Unresolved ERP entities
   * - Failed schema bindings
   * - Rejected integration constraints
   */
  readonly failed_iterations: number;
  /** Steps executed during ERP surface orchestration */
  readonly steps_executed: readonly string[];
  /** Optional blocking issues preventing deployment */
  readonly blocking_issues?: readonly BlockingIssue[];
}

/**
 * Executive Summary for ERP deployment scenarios
 *
 * Communicates:
 * - Operational impact
 * - Risk posture
 * - Deployment readiness
 *
 * Output is suitable for CIO / CTO / ERP owner review
 */
export interface ExecutiveSummary {
  /** Deployment reference information */
  readonly deploy_reference: DeployReference;
  /** Execution metrics */
  readonly metrics: ExecutionMetrics;
  /** Risk level assessment */
  readonly risk_level: RiskLevel;
  /** Deployment recommendation */
  readonly recommendation: Recommendation;
  /** Summary rationale for the recommendation */
  readonly rationale: string;
  /** Data classification concerns (if any) */
  readonly data_classification?: readonly string[];
  /** Cross-system dependencies detected */
  readonly cross_system_dependencies?: readonly string[];
}

// =============================================================================
// RESULT PACKET & EXECUTION CONTEXT TYPES
// =============================================================================

/**
 * Execution proof for lineage verification
 */
export interface ExecutionProof {
  /** Hash of the execution lineage chain */
  readonly lineage_hash: string;
  /** Ordered proof chain entries */
  readonly proof_chain: readonly string[];
}

/**
 * Execution context metadata
 */
export interface ExecutionContext {
  /** Unique execution identifier */
  readonly execution_id: string;
  /** Parent span ID for distributed tracing */
  readonly parent_span_id: string;
  /** Source repository name */
  readonly repo_name: string;
  /** Simulation resolution status */
  readonly simulation_resolution: string;
  /** Context timestamp (ISO 8601) */
  readonly timestamp: string;
}

/**
 * Result packet from upstream simulation
 *
 * Canonical schema for simulation outputs consumed by ERP surface.
 * All incoming simulation data MUST conform to this structure.
 */
export interface ResultPacket {
  /** Unique execution identifier (REQUIRED) */
  readonly execution_id: string;
  /** Simulation resolution status (REQUIRED) */
  readonly simulation_resolution: string;
  /** Source repository name (REQUIRED) */
  readonly repo_name: string;
  /** Parent span ID for tracing lineage (REQUIRED) */
  readonly parent_span_id: string;
  /** Execution proof for lineage verification (if available) */
  readonly execution_proof?: ExecutionProof;
  /** Result payload data */
  readonly data: Record<string, unknown>;
}

/**
 * Valid actions that can be performed on the ERP surface
 */
export type ERPSurfaceAction = 'getSurface' | 'simulate' | 'execute';

/**
 * ERP Surface Request structure
 * Matches request.schema.json
 */
export interface ERPSurfaceRequest {
  /** The action to perform on the ERP surface */
  action: ERPSurfaceAction;

  /** Unique identifier for the ERP surface (pattern: ^[a-zA-Z][a-zA-Z0-9_-]*$) */
  surfaceId: string;

  /** Optional operation identifier for tracking */
  operationId?: string;

  /** Input parameters for the action */
  input: Record<string, unknown>;
}

/**
 * Node status in the execution graph
 */
export type ExecutionNodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/**
 * Edge type in the execution graph
 */
export type ExecutionEdgeType = 'dependency' | 'data_flow' | 'control_flow';

/**
 * A node in the execution graph
 */
export interface ExecutionGraphNode {
  /** Unique identifier for the node */
  id: string;

  /** Type of the node */
  type: string;

  /** Current status of the node */
  status: ExecutionNodeStatus;

  /** ISO 8601 timestamp when node started execution */
  startTime?: string;

  /** ISO 8601 timestamp when node completed execution */
  endTime?: string;

  /** Optional metadata about the node */
  metadata?: Record<string, unknown>;
}

/**
 * An edge in the execution graph
 */
export interface ExecutionGraphEdge {
  /** Source node identifier */
  source: string;

  /** Target node identifier */
  target: string;

  /** Type of relationship between nodes */
  type?: ExecutionEdgeType;
}

/**
 * Execution graph structure
 */
export interface ExecutionGraph {
  /** Array of execution nodes */
  nodes: ExecutionGraphNode[];

  /** Array of edges connecting nodes */
  edges: ExecutionGraphEdge[];
}

/**
 * Error structure for failed responses
 */
export interface ERPSurfaceError {
  /** Error code identifier */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Base response structure with common fields
 */
interface ERPSurfaceResponseBase {
  /** Indicates whether the operation completed successfully */
  success: boolean;

  /** Unique UUID identifier for this execution */
  execution_id: string;

  /** Optional response payload data */
  data?: Record<string, unknown>;

  /** Error information when success is false */
  error?: ERPSurfaceError;

  /** ISO 8601 timestamp of the response */
  timestamp?: string;

  /**
   * Executive synthesis for operational impact analysis
   * Provides enterprise-grade deployment readiness assessment
   * suitable for CIO/CTO/ERP owner review
   */
  synthesis?: ExecutiveSummary;
}

/**
 * Response with layers_executed proof
 */
export interface ERPSurfaceResponseWithLayers extends ERPSurfaceResponseBase {
  /** List of layer identifiers that were executed */
  layers_executed: string[];
  execution_graph?: never;
}

/**
 * Response with execution_graph proof
 */
export interface ERPSurfaceResponseWithGraph extends ERPSurfaceResponseBase {
  /** Detailed execution graph with nodes and edges */
  execution_graph: ExecutionGraph;
  layers_executed?: never;
}

/**
 * ERP Surface Response structure
 * Must contain either layers_executed OR execution_graph (not both)
 * Matches response.schema.json
 */
export type ERPSurfaceResponse = ERPSurfaceResponseWithLayers | ERPSurfaceResponseWithGraph;

/**
 * Type guard to check if response has layers_executed
 */
export function hasLayersExecuted(
  response: ERPSurfaceResponse
): response is ERPSurfaceResponseWithLayers {
  return 'layers_executed' in response && Array.isArray(response.layers_executed);
}

/**
 * Type guard to check if response has execution_graph
 */
export function hasExecutionGraph(
  response: ERPSurfaceResponse
): response is ERPSurfaceResponseWithGraph {
  return 'execution_graph' in response && response.execution_graph !== undefined;
}

/**
 * Validation error thrown when schema validation fails
 */
export class ContractValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: ValidationErrorDetail[]
  ) {
    super(message);
    this.name = 'ContractValidationError';
    Object.setPrototypeOf(this, ContractValidationError.prototype);
  }
}

/**
 * Detail about a specific validation error
 */
export interface ValidationErrorDetail {
  /** JSON pointer to the invalid property */
  instancePath: string;

  /** The validation keyword that failed */
  keyword: string;

  /** Human-readable error message */
  message: string;

  /** Additional parameters about the error */
  params: Record<string, unknown>;
}
