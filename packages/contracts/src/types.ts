/**
 * TypeScript types derived from ERP Surface JSON Schemas
 * @module @agentics/contracts/types
 */

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
