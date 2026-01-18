/**
 * Executive Synthesis Module
 *
 * Provides enterprise-grade operational impact analysis for ERP-linked AI deployment scenarios.
 * Generates ExecutiveSummary suitable for CIO/CTO/ERP owner review.
 *
 * NON-GOALS:
 * - Do NOT execute ERP mutations
 * - Do NOT modify ERP state
 * - Do NOT infer business logic beyond schema + surface modeling
 * - Do NOT bypass governance or policy checks
 * - ERP Surface remains simulation + modeling only
 *
 * @module synthesis
 */

import type { RegistryEntry, SurfaceDomain, VendorCoverage } from '../registry';

// =============================================================================
// TYPES
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
 * Executive Summary for ERP deployment scenarios
 *
 * Communicates:
 * - Operational impact
 * - Risk posture
 * - Deployment readiness
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
// ERP SYSTEM CLASSIFICATION
// =============================================================================

/**
 * Critical ERP domains that warrant elevated risk
 */
const CRITICAL_DOMAINS: readonly SurfaceDomain[] = ['finance', 'hcm', 'supply-chain'];

/**
 * Known production ERP system identifiers
 */
const PRODUCTION_SYSTEMS: readonly string[] = [
  'sap',
  'oracle',
  'workday',
  'netsuite',
  'dynamics',
  'salesforce',
  'servicenow'
];

/**
 * Known sandbox/test ERP adapter patterns
 */
const SANDBOX_PATTERNS: readonly string[] = [
  'sandbox',
  'test',
  'dev',
  'mock',
  'demo',
  'staging'
];

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

/**
 * Determines environment from ERP system classification
 *
 * - sap, oracle, workday, netsuite → production
 * - sandbox / test ERP adapters → staging
 */
export function determineEnvironment(
  systemId: string,
  explicitEnvironment?: EnvironmentType
): EnvironmentType {
  // Explicit environment takes precedence
  if (explicitEnvironment) {
    return explicitEnvironment;
  }

  const lowerSystemId = systemId.toLowerCase();

  // Check for sandbox/test patterns first
  for (const pattern of SANDBOX_PATTERNS) {
    if (lowerSystemId.includes(pattern)) {
      return 'staging';
    }
  }

  // Check for production ERP systems
  for (const system of PRODUCTION_SYSTEMS) {
    if (lowerSystemId.includes(system)) {
      return 'production';
    }
  }

  // Default to staging for unknown systems
  return 'staging';
}

/**
 * Normalizes ERP system identifier to standard format
 */
export function normalizeSystemId(surfaceId: string, vendor?: keyof VendorCoverage): string {
  // Extract domain and surface name from surfaceId (e.g., "finance.general-ledger")
  const parts = surfaceId.split('.');
  const domain = parts[0]?.toUpperCase() || 'UNKNOWN';
  const surface = parts[1]?.toUpperCase().replace(/-/g, '_') || 'SURFACE';

  if (vendor) {
    const vendorMap: Record<keyof VendorCoverage, string> = {
      sap: 'SAP_S4',
      oracle: 'ORACLE_ERP',
      salesforce: 'SALESFORCE',
      workday: 'WORKDAY',
      dynamics: 'DYNAMICS_365',
      netsuite: 'NETSUITE',
      servicenow: 'SERVICENOW'
    };
    return `${vendorMap[vendor]}_${domain}_${surface}`;
  }

  return `ERP_${domain}_${surface}`;
}

// =============================================================================
// RISK ASSESSMENT
// =============================================================================

/**
 * Risk elevation context for assessment
 */
export interface RiskContext {
  /** Target environment */
  readonly environment: EnvironmentType;
  /** Surface domain */
  readonly domain?: SurfaceDomain;
  /** Whether write-capable operations are proposed */
  readonly hasMutatingOperations: boolean;
  /** Data scope includes PII */
  readonly includesPII: boolean;
  /** Data scope includes financial records */
  readonly includesFinancialData: boolean;
  /** Cross-system joins detected */
  readonly crossSystemJoins: readonly string[];
}

/**
 * Assesses risk level based on context
 *
 * Base risk_level = "medium"
 *
 * Elevate to HIGH if:
 * - ERP system is financial, HR, or supply-chain critical
 * - Environment resolves to production
 *
 * Elevate to CRITICAL if:
 * - Write-capable ERP actions are proposed
 * - ERP data scope includes PII or financial records
 * - Cross-system joins are detected (e.g. SAP + CRM)
 */
export function assessRiskLevel(context: RiskContext): RiskLevel {
  // Check for CRITICAL conditions first
  if (context.hasMutatingOperations && context.environment === 'production') {
    return 'critical';
  }

  if (context.includesPII || context.includesFinancialData) {
    return 'critical';
  }

  if (context.crossSystemJoins.length > 0) {
    return 'critical';
  }

  // Check for HIGH conditions
  if (CRITICAL_DOMAINS.includes(context.domain as SurfaceDomain)) {
    return 'high';
  }

  if (context.environment === 'production') {
    return 'high';
  }

  // Default to MEDIUM
  return 'medium';
}

/**
 * Elevates risk level for production targets
 */
export function elevateRiskForProduction(summary: ExecutiveSummary): ExecutiveSummary {
  if (summary.deploy_reference.environment === 'production') {
    const elevatedRisk: RiskLevel =
      summary.risk_level === 'medium' ? 'high' :
      summary.risk_level === 'high' ? 'critical' : 'critical';

    return {
      ...summary,
      risk_level: elevatedRisk,
      rationale: `${summary.rationale} [Elevated for production environment]`
    };
  }
  return summary;
}

// =============================================================================
// RECOMMENDATION MAPPING
// =============================================================================

/**
 * Determines recommendation based on execution results
 *
 * APPROVE:
 * - All entities mapped
 * - No blocking issues
 * - Read-only or analytics-only surface
 *
 * DEFER:
 * - Partial mappings
 * - Non-critical warnings
 * - Requires ERP admin or data owner review
 *
 * REJECT:
 * - Blocking schema failures
 * - Unauthorized ERP actions
 * - Missing mandatory entities
 * - Policy violations (security / compliance)
 */
export function determineRecommendation(
  successRate: number,
  blockingIssues: readonly BlockingIssue[],
  hasMutatingOperations: boolean,
  riskLevel: RiskLevel
): Recommendation {
  // REJECT conditions
  if (blockingIssues.length > 0) {
    return 'REJECT';
  }

  if (successRate < 0.5) {
    return 'REJECT';
  }

  // DEFER conditions
  if (successRate < 1.0) {
    return 'DEFER';
  }

  if (riskLevel === 'critical' && hasMutatingOperations) {
    return 'DEFER';
  }

  if (riskLevel === 'high') {
    return 'DEFER';
  }

  // APPROVE conditions
  return 'APPROVE';
}

/**
 * Generates rationale text for the recommendation
 */
function generateRationale(
  recommendation: Recommendation,
  successRate: number,
  blockingIssues: readonly BlockingIssue[],
  riskLevel: RiskLevel,
  hasMutatingOperations: boolean
): string {
  switch (recommendation) {
    case 'APPROVE':
      return `All ${successRate === 1.0 ? 'entities mapped successfully' : 'requirements met'}. ` +
        `${hasMutatingOperations ? 'Read-only operations verified' : 'Analytics-only surface'}. ` +
        `Risk level: ${riskLevel}.`;

    case 'DEFER':
      if (successRate < 1.0) {
        return `Partial entity mappings detected (${(successRate * 100).toFixed(1)}% success rate). ` +
          `Requires ERP admin or data owner review before deployment.`;
      }
      return `Risk level (${riskLevel}) requires additional review. ` +
        `${hasMutatingOperations ? 'Write-capable operations detected. ' : ''}` +
        `Recommend ERP owner sign-off.`;

    case 'REJECT':
      if (blockingIssues.length > 0) {
        return `${blockingIssues.length} blocking issue(s) detected: ` +
          blockingIssues.map(i => i.code).join(', ') + '. ' +
          `Deployment blocked until issues resolved.`;
      }
      return `Insufficient success rate (${(successRate * 100).toFixed(1)}%). ` +
        `Critical failures prevent safe deployment.`;
  }
}

// =============================================================================
// BLOCKING ISSUE DETECTION
// =============================================================================

/**
 * Blocking issue detection context
 */
export interface BlockingIssueContext {
  /** Unresolved ERP entities */
  readonly unresolvedEntities: readonly string[];
  /** Failed schema bindings */
  readonly failedBindings: readonly string[];
  /** Unauthorized operations detected */
  readonly unauthorizedOperations: readonly string[];
  /** Policy violations */
  readonly policyViolations: readonly string[];
  /** Missing credentials or scopes */
  readonly missingCredentials: readonly string[];
  /** Data classification conflicts */
  readonly dataClassificationConflicts: readonly string[];
}

/**
 * Detects blocking issues from context
 *
 * Include blocking issues if any of:
 * - Required ERP entities cannot be resolved
 * - Unauthorized write or mutation operations detected
 * - Policy engine flags ERP access violations
 * - Required ERP credentials or scopes missing
 * - Data classification conflicts (PII / finance without approval)
 */
export function detectBlockingIssues(context: BlockingIssueContext): BlockingIssue[] {
  const issues: BlockingIssue[] = [];

  // Unresolved entities
  for (const entity of context.unresolvedEntities) {
    issues.push({
      code: 'ERR_UNRESOLVED_ENTITY',
      description: `Required ERP entity '${entity}' cannot be resolved`,
      severity: 'error',
      affected: entity
    });
  }

  // Failed bindings
  for (const binding of context.failedBindings) {
    issues.push({
      code: 'ERR_SCHEMA_BINDING_FAILED',
      description: `Schema binding failed for '${binding}'`,
      severity: 'error',
      affected: binding
    });
  }

  // Unauthorized operations
  for (const op of context.unauthorizedOperations) {
    issues.push({
      code: 'ERR_UNAUTHORIZED_OPERATION',
      description: `Unauthorized write/mutation operation detected: '${op}'`,
      severity: 'critical',
      affected: op
    });
  }

  // Policy violations
  for (const violation of context.policyViolations) {
    issues.push({
      code: 'ERR_POLICY_VIOLATION',
      description: `Policy engine flagged ERP access violation: ${violation}`,
      severity: 'critical',
      affected: violation
    });
  }

  // Missing credentials
  for (const cred of context.missingCredentials) {
    issues.push({
      code: 'ERR_MISSING_CREDENTIALS',
      description: `Required ERP credentials or scope missing: '${cred}'`,
      severity: 'error',
      affected: cred
    });
  }

  // Data classification conflicts
  for (const conflict of context.dataClassificationConflicts) {
    issues.push({
      code: 'ERR_DATA_CLASSIFICATION_CONFLICT',
      description: `Data classification conflict (PII/finance without approval): ${conflict}`,
      severity: 'critical',
      affected: conflict
    });
  }

  return issues;
}

// =============================================================================
// BUILDER
// =============================================================================

/**
 * Build options for ExecutiveSummary
 */
export interface BuildExecutiveSummaryOptions {
  /** Surface ID being processed */
  readonly surfaceId: string;
  /** Registry entry for the surface (if available) */
  readonly surfaceEntry?: RegistryEntry;
  /** Target vendor (if known) */
  readonly targetVendor?: keyof VendorCoverage;
  /** Explicit environment override */
  readonly explicitEnvironment?: EnvironmentType;
  /** Whether the operation includes mutations */
  readonly hasMutatingOperations: boolean;
  /** PII data scope */
  readonly includesPII?: boolean;
  /** Financial data scope */
  readonly includesFinancialData?: boolean;
  /** Cross-system dependencies */
  readonly crossSystemDependencies?: readonly string[];
  /** Blocking issue context for detection */
  readonly blockingContext?: BlockingIssueContext;
  /** Optional version identifier */
  readonly version?: string;
  /** Optional commit SHA */
  readonly commitSha?: string;
}

/**
 * Execution result for synthesis
 */
export interface ExecutionResult {
  /** Whether the execution succeeded */
  readonly success: boolean;
  /** Resolved entities count */
  readonly resolvedEntities: number;
  /** Total entities required */
  readonly totalEntities: number;
  /** Failed binding count */
  readonly failedBindings: number;
  /** Rejected constraints count */
  readonly rejectedConstraints: number;
  /** Steps that were executed */
  readonly stepsExecuted: readonly string[];
  /** Any warnings generated */
  readonly warnings?: readonly string[];
}

/**
 * Calculates success rate from execution result
 */
export function calculateSuccessRate(result: ExecutionResult): number {
  if (!result.success) {
    return 0;
  }

  if (result.totalEntities === 0) {
    return 1.0;
  }

  const entityRate = result.resolvedEntities / result.totalEntities;
  const hasFailures = result.failedBindings > 0 || result.rejectedConstraints > 0;

  if (hasFailures) {
    // Reduce success rate proportionally
    const failurePenalty = (result.failedBindings + result.rejectedConstraints) * 0.1;
    return Math.max(0, entityRate - failurePenalty);
  }

  return entityRate;
}

/**
 * Counts failed iterations from execution result
 */
export function countFailedIterations(result: ExecutionResult): number {
  const unresolvedEntities = result.totalEntities - result.resolvedEntities;
  return unresolvedEntities + result.failedBindings + result.rejectedConstraints;
}

/**
 * Default steps for ERP surface execution
 */
export const DEFAULT_STEPS_EXECUTED: readonly string[] = [
  'erp system resolution',
  'entity schema mapping',
  'integration constraint validation',
  'surface contract generation',
  'ruvector persistence'
];

/**
 * Builds an ExecutiveSummary from execution context
 *
 * @param options Build options
 * @param result Execution result
 * @returns Complete ExecutiveSummary
 */
export function buildExecutiveSummary(
  options: BuildExecutiveSummaryOptions,
  result: ExecutionResult
): ExecutiveSummary {
  const timestamp = new Date().toISOString();

  // Determine environment
  const environment = determineEnvironment(
    options.surfaceId,
    options.explicitEnvironment
  );

  // Normalize system identifier
  const system = normalizeSystemId(options.surfaceId, options.targetVendor);

  // Build deploy reference
  const deploy_reference: DeployReference = {
    environment,
    system,
    timestamp,
    ...(options.version && { version: options.version }),
    ...(options.commitSha && { commit_sha: options.commitSha })
  };

  // Detect blocking issues
  const blockingIssues = options.blockingContext
    ? detectBlockingIssues(options.blockingContext)
    : [];

  // Calculate metrics
  const success_rate = calculateSuccessRate(result);
  const failed_iterations = countFailedIterations(result);

  const metrics: ExecutionMetrics = {
    success_rate,
    failed_iterations,
    steps_executed: result.stepsExecuted.length > 0 ? result.stepsExecuted : DEFAULT_STEPS_EXECUTED,
    ...(blockingIssues.length > 0 && { blocking_issues: blockingIssues })
  };

  // Assess risk level
  const riskContext: RiskContext = {
    environment,
    domain: options.surfaceEntry?.domain,
    hasMutatingOperations: options.hasMutatingOperations,
    includesPII: options.includesPII ?? false,
    includesFinancialData: options.includesFinancialData ?? false,
    crossSystemJoins: options.crossSystemDependencies ?? []
  };

  const risk_level = assessRiskLevel(riskContext);

  // Determine recommendation
  const recommendation = determineRecommendation(
    success_rate,
    blockingIssues,
    options.hasMutatingOperations,
    risk_level
  );

  // Generate rationale
  const rationale = generateRationale(
    recommendation,
    success_rate,
    blockingIssues,
    risk_level,
    options.hasMutatingOperations
  );

  // Build summary
  const summary: ExecutiveSummary = {
    deploy_reference,
    metrics,
    risk_level,
    recommendation,
    rationale,
    ...(options.includesPII || options.includesFinancialData ? {
      data_classification: [
        ...(options.includesPII ? ['PII'] : []),
        ...(options.includesFinancialData ? ['FINANCIAL'] : [])
      ]
    } : {}),
    ...(options.crossSystemDependencies && options.crossSystemDependencies.length > 0 ? {
      cross_system_dependencies: options.crossSystemDependencies
    } : {})
  };

  return summary;
}

/**
 * Creates a minimal ExecutiveSummary for simple operations
 */
export function buildSimpleSummary(
  surfaceId: string,
  success: boolean,
  stepsExecuted: readonly string[] = DEFAULT_STEPS_EXECUTED
): ExecutiveSummary {
  return buildExecutiveSummary(
    {
      surfaceId,
      hasMutatingOperations: false
    },
    {
      success,
      resolvedEntities: success ? 1 : 0,
      totalEntities: 1,
      failedBindings: success ? 0 : 1,
      rejectedConstraints: 0,
      stepsExecuted: [...stepsExecuted]
    }
  );
}

/**
 * Checks if a surface has mutating operations
 */
export function hasMutatingOperations(entry: RegistryEntry): boolean {
  return entry.operations.some(op => op.mutating);
}

/**
 * Determines if surface domain involves sensitive data
 */
export function involvesSensitiveData(entry: RegistryEntry): {
  includesPII: boolean;
  includesFinancialData: boolean;
} {
  const domain = entry.domain;

  return {
    includesPII: domain === 'hcm', // HR data typically includes PII
    includesFinancialData: domain === 'finance' || domain === 'procurement'
  };
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

/**
 * ERP-Level Resolution Generation
 * Provides concrete, actionable resolutions for executive synthesis outputs
 */
export * from './resolutions';
