/**
 * ERP Command Types
 *
 * Defines types for ERP CLI subcommands with executive synthesis support.
 * Commands that modify or expose data structures include synthesis.
 * Read-only enumeration commands (list, inspect) are excluded.
 *
 * @module commands/erp/types
 */

import type { ExecutiveSummary } from '../../synthesis';
import type { RegistryEntry, SurfaceDomain, VendorCoverage } from '../../registry';

// =============================================================================
// DATA SENSITIVITY CLASSIFICATION
// =============================================================================

/**
 * Data sensitivity levels for synthesis classification
 */
export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

/**
 * Sensitive field marker for PII/financial data detection
 */
export interface SensitiveFieldMarker {
  /** Field path in dot notation */
  readonly fieldPath: string;
  /** Sensitivity classification */
  readonly sensitivity: DataSensitivity;
  /** Data type category */
  readonly category: 'pii' | 'financial' | 'health' | 'authentication' | 'business';
  /** Human-readable description */
  readonly description: string;
}

/**
 * Data sensitivity classification result
 */
export interface DataSensitivityClassification {
  /** Overall sensitivity level (highest of all fields) */
  readonly overallSensitivity: DataSensitivity;
  /** Sensitive fields detected */
  readonly sensitiveFields: readonly SensitiveFieldMarker[];
  /** PII fields present */
  readonly hasPII: boolean;
  /** Financial data present */
  readonly hasFinancialData: boolean;
  /** Health data present */
  readonly hasHealthData: boolean;
  /** Authentication data present */
  readonly hasAuthData: boolean;
}

// =============================================================================
// MAPPING VALIDATION
// =============================================================================

/**
 * Mapping direction
 */
export type MappingDirection = 'source-to-target' | 'target-to-source' | 'bidirectional';

/**
 * Mapping validation result
 */
export interface MappingValidationResult {
  /** Whether mapping is valid */
  readonly valid: boolean;
  /** Mapping completeness (0.0 - 1.0) */
  readonly completeness: number;
  /** Unmapped source fields */
  readonly unmappedSourceFields: readonly string[];
  /** Unmapped target fields */
  readonly unmappedTargetFields: readonly string[];
  /** Type compatibility issues */
  readonly typeIncompatibilities: readonly TypeIncompatibility[];
  /** Bidirectional consistency verified */
  readonly bidirectionalConsistency: boolean;
  /** Synchronization drift detected */
  readonly syncDriftDetected: boolean;
}

/**
 * Type incompatibility between source and target
 */
export interface TypeIncompatibility {
  /** Source field path */
  readonly sourceField: string;
  /** Target field path */
  readonly targetField: string;
  /** Source type */
  readonly sourceType: string;
  /** Target type */
  readonly targetType: string;
  /** Whether data loss may occur */
  readonly potentialDataLoss: boolean;
  /** Suggested resolution */
  readonly resolution?: string;
}

// =============================================================================
// INTEGRATION RISK ASSESSMENT
// =============================================================================

/**
 * Integration risk factors
 */
export interface IntegrationRiskAssessment {
  /** Data leakage risk (0.0 - 1.0) */
  readonly dataLeakageRisk: number;
  /** Mapping ambiguity risk (0.0 - 1.0) */
  readonly mappingAmbiguityRisk: number;
  /** Synchronization drift risk (0.0 - 1.0) */
  readonly syncDriftRisk: number;
  /** Export corruption risk (0.0 - 1.0) */
  readonly exportCorruptionRisk: number;
  /** Schema mismatch risk (0.0 - 1.0) */
  readonly schemaMismatchRisk: number;
  /** Overall risk score (0.0 - 1.0) */
  readonly overallRisk: number;
  /** Risk factors that contributed to assessment */
  readonly riskFactors: readonly string[];
}

// =============================================================================
// DECISION PACKET
// =============================================================================

/**
 * Decision Packet for synthesis output
 * Contains all information needed for deployment decision
 */
export interface DecisionPacket {
  /** Data sensitivity classification */
  readonly dataSensitivity: DataSensitivityClassification;
  /** Mapping validation results (for map command) */
  readonly mappingValidation?: MappingValidationResult;
  /** Integration risk assessment */
  readonly riskAssessment: IntegrationRiskAssessment;
  /** Executive summary with recommendation */
  readonly synthesis: ExecutiveSummary;
}

// =============================================================================
// COMMAND INPUT TYPES
// =============================================================================

/**
 * Base input for all ERP commands
 */
export interface ErpCommandInput {
  /** Surface ID to operate on */
  readonly surfaceId: string;
  /** Target vendor (optional) */
  readonly vendor?: keyof VendorCoverage;
  /** Environment override */
  readonly environment?: 'production' | 'staging' | 'development' | 'sandbox';
  /** Dry run mode (no persistence) */
  readonly dryRun?: boolean;
}

/**
 * Input for erp surface command
 */
export interface ErpSurfaceInput extends ErpCommandInput {
  /** Operation to perform on surface */
  readonly operation?: string;
  /** Include schema details */
  readonly includeSchema?: boolean;
  /** Include behavioral model */
  readonly includeBehavior?: boolean;
}

/**
 * Input for erp map command
 */
export interface ErpMapInput extends ErpCommandInput {
  /** Target surface ID for mapping */
  readonly targetSurfaceId: string;
  /** Target vendor */
  readonly targetVendor?: keyof VendorCoverage;
  /** Mapping direction */
  readonly direction?: MappingDirection;
  /** Validate bidirectional consistency */
  readonly validateBidirectional?: boolean;
  /** Field mappings (source -> target) */
  readonly fieldMappings?: Record<string, string>;
}

/**
 * Input for erp export command
 */
export interface ErpExportInput extends ErpCommandInput {
  /** Export format */
  readonly format: 'json' | 'yaml' | 'openapi' | 'graphql' | 'protobuf';
  /** Output path */
  readonly outputPath?: string;
  /** Include all surfaces in domain */
  readonly includeDomain?: boolean;
  /** Include vendor-specific adapters */
  readonly includeAdapters?: boolean;
}

/**
 * Input for erp list command (no synthesis)
 */
export interface ErpListInput {
  /** Filter by domain */
  readonly domain?: SurfaceDomain;
  /** Filter by vendor */
  readonly vendor?: keyof VendorCoverage;
  /** Include deprecated surfaces */
  readonly includeDeprecated?: boolean;
  /** Output format */
  readonly format?: 'table' | 'json' | 'yaml';
}

/**
 * Input for erp inspect command (no synthesis)
 */
export interface ErpInspectInput {
  /** Surface ID to inspect */
  readonly surfaceId: string;
  /** Inspection depth */
  readonly depth?: 'summary' | 'detailed' | 'full';
  /** Include operation contracts */
  readonly includeOperations?: boolean;
  /** Include event schemas */
  readonly includeEvents?: boolean;
}

// =============================================================================
// COMMAND RESULT TYPES
// =============================================================================

/**
 * Base result for commands WITH synthesis
 */
export interface ErpCommandResultWithSynthesis {
  /** Whether command succeeded */
  readonly success: boolean;
  /** Execution timestamp */
  readonly timestamp: string;
  /** Execution ID for traceability */
  readonly executionId: string;
  /** Decision packet with synthesis */
  readonly decisionPacket: DecisionPacket;
}

/**
 * Base result for commands WITHOUT synthesis (list, inspect)
 */
export interface ErpCommandResultWithoutSynthesis {
  /** Whether command succeeded */
  readonly success: boolean;
  /** Execution timestamp */
  readonly timestamp: string;
  /** Execution ID for traceability */
  readonly executionId: string;
}

/**
 * Result for erp surface command
 */
export interface ErpSurfaceResult extends ErpCommandResultWithSynthesis {
  /** Surface entry from registry */
  readonly surface: RegistryEntry;
  /** Schema details if requested */
  readonly schema?: Record<string, unknown>;
  /** Behavioral model if requested */
  readonly behavior?: Record<string, unknown>;
  /** Sensitive fields detected */
  readonly sensitiveFields: readonly SensitiveFieldMarker[];
}

/**
 * Result for erp map command
 */
export interface ErpMapResult extends ErpCommandResultWithSynthesis {
  /** Source surface */
  readonly sourceSurface: RegistryEntry;
  /** Target surface */
  readonly targetSurface: RegistryEntry;
  /** Mapping validation result */
  readonly mappingValidation: MappingValidationResult;
  /** Generated field mappings */
  readonly fieldMappings: Record<string, string>;
  /** Bidirectional consistency status */
  readonly bidirectionalConsistent: boolean;
}

/**
 * Result for erp export command
 */
export interface ErpExportResult extends ErpCommandResultWithSynthesis {
  /** Exported surface(s) */
  readonly surfaces: readonly RegistryEntry[];
  /** Export format used */
  readonly format: string;
  /** Output path (if written) */
  readonly outputPath?: string;
  /** Export content (if not written to file) */
  readonly content?: string;
  /** Export integrity hash */
  readonly integrityHash: string;
}

/**
 * Result for erp list command (no synthesis)
 */
export interface ErpListResult extends ErpCommandResultWithoutSynthesis {
  /** List of surfaces */
  readonly surfaces: readonly RegistryEntry[];
  /** Total count */
  readonly totalCount: number;
  /** Filter applied */
  readonly filter?: {
    domain?: SurfaceDomain;
    vendor?: keyof VendorCoverage;
  };
}

/**
 * Result for erp inspect command (no synthesis)
 */
export interface ErpInspectResult extends ErpCommandResultWithoutSynthesis {
  /** Inspected surface */
  readonly surface: RegistryEntry;
  /** Operations (if requested) */
  readonly operations?: readonly Record<string, unknown>[];
  /** Events (if requested) */
  readonly events?: readonly string[];
  /** Inspection depth used */
  readonly depth: 'summary' | 'detailed' | 'full';
}

// =============================================================================
// COMMAND ERROR TYPES
// =============================================================================

/**
 * ERP command error
 */
export interface ErpCommandError {
  /** Error code */
  readonly code: string;
  /** Error message */
  readonly message: string;
  /** Affected surface ID */
  readonly surfaceId?: string;
  /** Additional details */
  readonly details?: Record<string, unknown>;
}

/**
 * Error codes for ERP commands
 */
export const ERP_ERROR_CODES = {
  SURFACE_NOT_FOUND: 'ERR_SURFACE_NOT_FOUND',
  MAPPING_FAILED: 'ERR_MAPPING_FAILED',
  EXPORT_FAILED: 'ERR_EXPORT_FAILED',
  VALIDATION_FAILED: 'ERR_VALIDATION_FAILED',
  SCHEMA_MISMATCH: 'ERR_SCHEMA_MISMATCH',
  UNAUTHORIZED_OPERATION: 'ERR_UNAUTHORIZED_OPERATION',
  SENSITIVE_DATA_EXPOSURE: 'ERR_SENSITIVE_DATA_EXPOSURE',
  BIDIRECTIONAL_INCONSISTENCY: 'ERR_BIDIRECTIONAL_INCONSISTENCY',
  SYNC_DRIFT_DETECTED: 'ERR_SYNC_DRIFT_DETECTED',
} as const;
