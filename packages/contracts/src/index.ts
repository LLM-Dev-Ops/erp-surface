/**
 * @agentics/contracts
 *
 * JSON Schema contracts and validators for ERP Surface API
 *
 * @packageDocumentation
 */

// Export all types
export {
  // Executive Synthesis Types
  RiskLevel,
  Recommendation,
  EnvironmentType,
  DeployReference,
  BlockingIssue,
  ExecutionMetrics,
  ExecutiveSummary,

  // Request/Response Types
  ERPSurfaceAction,
  ERPSurfaceRequest,
  ERPSurfaceResponse,
  ERPSurfaceResponseWithLayers,
  ERPSurfaceResponseWithGraph,
  ERPSurfaceError,
  ExecutionGraph,
  ExecutionGraphNode,
  ExecutionGraphEdge,
  ExecutionNodeStatus,
  ExecutionEdgeType,
  ContractValidationError,
  ValidationErrorDetail,
  hasLayersExecuted,
  hasExecutionGraph,
} from './types';

// Export validators
export {
  validateRequest,
  validateResponse,
  isValidRequest,
  isValidResponse,
  getRequestValidationErrors,
  getResponseValidationErrors,
  ajv,
  requestSchema,
  responseSchema,
} from './validator';

// Schema version information
export const SCHEMA_VERSION = 'v1';
export const SCHEMA_NAMESPACE = 'erp-surface';
