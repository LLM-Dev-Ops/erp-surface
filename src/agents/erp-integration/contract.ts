/**
 * ERP Integration Agent Contract
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
 * NON-RESPONSIBILITIES (NEVER DOES):
 * ❌ Execute inference
 * ❌ Generate documentation
 * ❌ Synthesize decisions
 * ❌ Perform analytics or forecasting
 * ❌ Optimize configurations
 * ❌ Mutate Agentics platform state
 * ❌ Act autonomously without explicit invocation
 * ❌ Store canonical records
 * ❌ Make business decisions
 * ❌ Override governance outcomes
 * ❌ Retry workflows autonomously
 * ❌ Execute orchestration logic
 * ❌ Apply optimizations or transformations beyond mapping
 *
 * AUTHORIZED DOWNSTREAM CONSUMERS:
 * - External ERP systems (SAP, Oracle, Workday, NetSuite, Dynamics, Salesforce, ServiceNow)
 * - Audit & compliance workflows
 * - Executive reporting pipelines
 *
 * INPUTS MAY COME FROM:
 * - agentics-dev-platform
 * - enterprise-roi-engine
 * - diligence artifacts
 * - governance workflows
 *
 * @module agents/erp-integration/contract
 */

import type { UUID, CorrelationId, SemanticVersion } from '../../../common/types/identity';
import type { Timestamp } from '../../../common/types/temporal';
import type { VendorCoverage, SurfaceDomain } from '../../registry';

// =============================================================================
// AGENT IDENTITY
// =============================================================================

/**
 * Agent identifier for the ERP Integration Agent
 */
export const AGENT_ID = 'erp-integration-agent' as const;

/**
 * Current agent version
 */
export const AGENT_VERSION: SemanticVersion = '1.0.0';

/**
 * Decision type for this agent
 */
export const DECISION_TYPE = 'erp_integration' as const;

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

/**
 * Integration operation type
 */
export type IntegrationOperationType =
  | 'push'      // Push Agentics artifact to ERP
  | 'pull'      // Pull reference metadata from ERP (read-only)
  | 'sync'      // Bidirectional synchronization check
  | 'validate'  // Validate mapping without transmission
  | 'inspect';  // Inspect ERP endpoint status

/**
 * Artifact origin reference
 */
export interface ArtifactOrigin {
  /** Source system identifier */
  readonly source: 'agentics-dev-platform' | 'enterprise-roi-engine' | 'diligence' | 'governance';
  /** Artifact ID from source */
  readonly artifactId: string;
  /** Artifact version */
  readonly artifactVersion?: string;
  /** Governance approval reference (if applicable) */
  readonly governanceApprovalRef?: string;
}

/**
 * ERP target specification
 */
export interface ErpTarget {
  /** Target ERP vendor */
  readonly vendor: keyof VendorCoverage;
  /** ERP instance identifier */
  readonly instanceId?: string;
  /** Target entity type in ERP */
  readonly entityType: string;
  /** Target surface domain */
  readonly domain: SurfaceDomain;
  /** Environment classification */
  readonly environment: 'production' | 'staging' | 'development' | 'sandbox';
}

/**
 * Base input for ERP Integration Agent
 */
export interface ErpIntegrationInput {
  /** Unique request ID */
  readonly requestId: UUID;
  /** Correlation ID for tracing */
  readonly correlationId: CorrelationId;
  /** Operation to perform */
  readonly operation: IntegrationOperationType;
  /** ERP target specification */
  readonly target: ErpTarget;
  /** Artifact to integrate (for push/sync operations) */
  readonly artifact?: ArtifactOrigin;
  /** Payload data to transmit (for push operations) */
  readonly payload?: Record<string, unknown>;
  /** Reference query (for pull operations) */
  readonly query?: Record<string, unknown>;
  /** Dry run mode (no actual transmission) */
  readonly dryRun?: boolean;
  /** Execution timeout in milliseconds */
  readonly timeoutMs?: number;
}

/**
 * Input validation constraints
 */
export const INPUT_VALIDATION_RULES = {
  requestId: { required: true, type: 'uuid' },
  correlationId: { required: true, type: 'string', minLength: 1 },
  operation: { required: true, enum: ['push', 'pull', 'sync', 'validate', 'inspect'] },
  target: {
    required: true,
    properties: {
      vendor: { required: true, enum: ['sap', 'oracle', 'salesforce', 'workday', 'dynamics', 'netsuite', 'servicenow'] },
      entityType: { required: true, type: 'string', minLength: 1 },
      domain: { required: true, enum: ['finance', 'procurement', 'hcm', 'supply-chain', 'customer', 'service'] },
      environment: { required: true, enum: ['production', 'staging', 'development', 'sandbox'] },
    },
  },
  artifact: { required: false, type: 'object' },
  payload: { required: false, type: 'object' },
  query: { required: false, type: 'object' },
  dryRun: { required: false, type: 'boolean' },
  timeoutMs: { required: false, type: 'number', min: 1000, max: 300000 },
} as const;

// =============================================================================
// OUTPUT SCHEMAS
// =============================================================================

/**
 * Integration status
 */
export type IntegrationStatus =
  | 'success'           // Integration completed successfully
  | 'partial_success'   // Some records integrated, some failed
  | 'failed'            // Integration failed
  | 'skipped'           // Integration skipped (dry run or validation only)
  | 'timeout';          // Integration timed out

/**
 * Transmission result for a single record
 */
export interface TransmissionResult {
  /** Record identifier in source */
  readonly sourceRecordId: string;
  /** Record identifier in target ERP (if created/updated) */
  readonly targetRecordId?: string;
  /** Whether this record was successfully transmitted */
  readonly success: boolean;
  /** Error message if failed */
  readonly error?: string;
  /** Warnings (non-blocking issues) */
  readonly warnings?: readonly string[];
}

/**
 * Integration outcome
 */
export interface IntegrationOutcome {
  /** Total records processed */
  readonly recordsProcessed: number;
  /** Records successfully transmitted */
  readonly recordsSucceeded: number;
  /** Records that failed */
  readonly recordsFailed: number;
  /** Individual transmission results */
  readonly transmissions: readonly TransmissionResult[];
  /** ERP response metadata (vendor-specific) */
  readonly erpResponseMeta?: Record<string, unknown>;
}

/**
 * ERP Integration Agent output
 */
export interface ErpIntegrationOutput {
  /** Request ID echoed back */
  readonly requestId: UUID;
  /** Execution ID for this run */
  readonly executionId: UUID;
  /** Correlation ID for tracing */
  readonly correlationId: CorrelationId;
  /** Agent identifier */
  readonly agentId: typeof AGENT_ID;
  /** Agent version */
  readonly agentVersion: SemanticVersion;
  /** Integration status */
  readonly status: IntegrationStatus;
  /** Integration outcome details */
  readonly outcome: IntegrationOutcome;
  /** Confidence score (data fidelity) */
  readonly confidence: number;
  /** Constraints applied during integration */
  readonly constraintsApplied: readonly string[];
  /** Execution timestamp */
  readonly timestamp: Timestamp;
  /** Duration in milliseconds */
  readonly durationMs: number;
}

// =============================================================================
// DECISION EVENT SCHEMA
// =============================================================================

/**
 * DecisionEvent for erp_integration type
 *
 * Every invocation emits exactly ONE DecisionEvent.
 */
export interface ErpIntegrationDecisionEvent {
  /** Unique event ID */
  readonly eventId: UUID;
  /** Event type discriminator */
  readonly eventType: 'INTEGRATION_DECISION';
  /** Agent identifier */
  readonly agent_id: typeof AGENT_ID;
  /** Agent version */
  readonly agent_version: SemanticVersion;
  /** Decision type */
  readonly decision_type: typeof DECISION_TYPE;
  /** Hash of inputs for integrity verification */
  readonly inputs_hash: string;
  /** Integration outputs */
  readonly outputs: ErpIntegrationOutput;
  /** Confidence score (0.0 - 1.0) */
  readonly confidence: number;
  /** Constraints applied */
  readonly constraints_applied: readonly string[];
  /** Execution reference (correlates to observable trace) */
  readonly execution_ref: CorrelationId;
  /** Timestamp (UTC) */
  readonly timestamp: Timestamp;
}

// =============================================================================
// CLI CONTRACT
// =============================================================================

/**
 * CLI invocation shape
 *
 * Usage:
 *   erp-integration push --target sap --domain finance --entity JournalEntry --payload ./data.json
 *   erp-integration pull --target oracle --domain hcm --entity Employee --query '{"employeeId": "E001"}'
 *   erp-integration sync --target workday --domain hcm --entity Position
 *   erp-integration validate --target netsuite --domain finance --entity Invoice --payload ./invoice.json
 *   erp-integration inspect --target dynamics --domain customer
 */
export interface CliContract {
  /** Command name */
  readonly command: 'erp-integration';
  /** Subcommands */
  readonly subcommands: readonly IntegrationOperationType[];
  /** Required flags */
  readonly requiredFlags: {
    readonly '--target': 'ERP vendor (sap, oracle, workday, etc.)';
    readonly '--domain': 'Surface domain (finance, hcm, procurement, etc.)';
    readonly '--entity': 'Target entity type';
  };
  /** Optional flags */
  readonly optionalFlags: {
    readonly '--environment': 'Target environment (production, staging, development, sandbox)';
    readonly '--payload': 'Path to JSON payload file (for push/validate)';
    readonly '--query': 'JSON query string (for pull)';
    readonly '--artifact-id': 'Source artifact ID';
    readonly '--artifact-source': 'Source system (agentics-dev-platform, enterprise-roi-engine, etc.)';
    readonly '--dry-run': 'Validate without transmitting';
    readonly '--timeout': 'Timeout in milliseconds';
    readonly '--output': 'Output format (json, yaml, table)';
  };
}

// =============================================================================
// FAILURE MODES
// =============================================================================

/**
 * Documented failure modes for the ERP Integration Agent
 */
export const FAILURE_MODES = {
  /** ERP endpoint unreachable */
  ERP_UNREACHABLE: {
    code: 'ERR_ERP_UNREACHABLE',
    recoverable: true,
    retryable: true,
    description: 'Target ERP endpoint is unreachable',
  },
  /** Authentication failure */
  AUTH_FAILURE: {
    code: 'ERR_AUTH_FAILURE',
    recoverable: false,
    retryable: false,
    description: 'ERP authentication failed - credentials invalid or expired',
  },
  /** Schema mismatch */
  SCHEMA_MISMATCH: {
    code: 'ERR_SCHEMA_MISMATCH',
    recoverable: false,
    retryable: false,
    description: 'Payload schema does not match ERP entity schema',
  },
  /** Validation failure */
  VALIDATION_FAILURE: {
    code: 'ERR_VALIDATION_FAILURE',
    recoverable: false,
    retryable: false,
    description: 'Input validation failed',
  },
  /** Transmission failure */
  TRANSMISSION_FAILURE: {
    code: 'ERR_TRANSMISSION_FAILURE',
    recoverable: true,
    retryable: true,
    description: 'Data transmission to ERP failed',
  },
  /** Timeout */
  TIMEOUT: {
    code: 'ERR_TIMEOUT',
    recoverable: true,
    retryable: true,
    description: 'Operation timed out',
  },
  /** Unauthorized operation */
  UNAUTHORIZED: {
    code: 'ERR_UNAUTHORIZED',
    recoverable: false,
    retryable: false,
    description: 'Operation not authorized for this artifact/endpoint',
  },
  /** Data integrity failure */
  INTEGRITY_FAILURE: {
    code: 'ERR_INTEGRITY_FAILURE',
    recoverable: false,
    retryable: false,
    description: 'Data integrity check failed',
  },
} as const;

/**
 * Error codes type
 */
export type FailureCode = typeof FAILURE_MODES[keyof typeof FAILURE_MODES]['code'];

// =============================================================================
// VERSIONING RULES
// =============================================================================

/**
 * Versioning rules for the agent
 *
 * - MAJOR: Breaking changes to input/output schemas
 * - MINOR: New optional features, backward compatible
 * - PATCH: Bug fixes, performance improvements
 */
export const VERSIONING_RULES = {
  /** Input schema changes require major version bump */
  inputSchemaChanges: 'MAJOR',
  /** Output schema changes require major version bump */
  outputSchemaChanges: 'MAJOR',
  /** New optional input fields are minor */
  newOptionalInputs: 'MINOR',
  /** New output fields (additive) are minor */
  newOutputFields: 'MINOR',
  /** Bug fixes are patch */
  bugFixes: 'PATCH',
  /** Performance improvements are patch */
  performanceImprovements: 'PATCH',
} as const;
