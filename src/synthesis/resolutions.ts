/**
 * ERP-Level Proposed Resolutions
 *
 * Generates concrete, actionable ERP-level resolutions for executive synthesis outputs.
 * Maps synthesis recommendations to specific ERP actions:
 * - Workflow changes
 * - System reconfigurations
 * - Approval routing changes
 * - Model placement adjustments
 *
 * Each resolution includes:
 * - Impact annotations (cost, risk, throughput)
 * - Safety flags (irreversible, policy-sensitive, human approval required)
 *
 * @module synthesis/resolutions
 */

import type { Recommendation, RiskLevel, ExecutiveSummary, BlockingIssue } from './index';
import type { SurfaceDomain } from '../registry';

// =============================================================================
// RESOLUTION TYPES
// =============================================================================

/**
 * Resolution action category
 */
export type ResolutionCategory =
  | 'workflow_change'
  | 'system_reconfiguration'
  | 'approval_routing'
  | 'model_placement'
  | 'data_governance'
  | 'integration_adjustment';

/**
 * Resolution priority for implementation ordering
 */
export type ResolutionPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Impact severity for cost/risk/throughput
 */
export type ImpactSeverity = 'none' | 'minimal' | 'moderate' | 'significant' | 'severe';

/**
 * Impact direction for throughput
 */
export type ThroughputDirection = 'increase' | 'neutral' | 'decrease';

// =============================================================================
// IMPACT ANNOTATIONS
// =============================================================================

/**
 * Cost impact assessment
 */
export interface CostImpact {
  /** Severity of cost impact */
  readonly severity: ImpactSeverity;
  /** One-time implementation cost indicator */
  readonly oneTimeCost: boolean;
  /** Recurring operational cost indicator */
  readonly recurringCost: boolean;
  /** Cost category (licensing, implementation, training, infrastructure) */
  readonly category: 'licensing' | 'implementation' | 'training' | 'infrastructure' | 'mixed';
  /** Human-readable cost description */
  readonly description: string;
  /** Estimated effort in person-hours (if quantifiable) */
  readonly estimatedEffortHours?: number;
}

/**
 * Risk impact assessment
 */
export interface RiskImpact {
  /** Severity of risk impact */
  readonly severity: ImpactSeverity;
  /** Whether change reduces existing risk */
  readonly mitigatesExistingRisk: boolean;
  /** Whether change introduces new risk */
  readonly introducesNewRisk: boolean;
  /** Risk domains affected */
  readonly affectedDomains: readonly ('security' | 'compliance' | 'operational' | 'data_integrity' | 'availability')[];
  /** Human-readable risk description */
  readonly description: string;
  /** Rollback complexity if change fails */
  readonly rollbackComplexity: 'trivial' | 'moderate' | 'complex' | 'impossible';
}

/**
 * Throughput impact assessment
 */
export interface ThroughputImpactAssessment {
  /** Direction of throughput change */
  readonly direction: ThroughputDirection;
  /** Affected throughput metrics */
  readonly affectedMetrics: readonly ('transaction_volume' | 'response_time' | 'batch_processing' | 'concurrent_users')[];
  /** Human-readable throughput description */
  readonly description: string;
  /** Expected percentage change (if quantifiable, positive = improvement) */
  readonly expectedChangePercent?: number;
}

/**
 * Combined impact annotation for a resolution
 */
export interface ResolutionImpact {
  readonly cost: CostImpact;
  readonly risk: RiskImpact;
  readonly throughput: ThroughputImpactAssessment;
}

// =============================================================================
// SAFETY FLAGS
// =============================================================================

/**
 * Safety classification for a resolution
 */
export interface ResolutionSafety {
  /** Whether the change is irreversible */
  readonly irreversible: boolean;
  /** Reason if irreversible */
  readonly irreversibleReason?: string;

  /** Whether the change is policy-sensitive */
  readonly policySensitive: boolean;
  /** Affected policies if sensitive */
  readonly affectedPolicies?: readonly string[];

  /** Whether human approval is required */
  readonly requiresHumanApproval: boolean;
  /** Required approval level if approval needed */
  readonly approvalLevel?: 'team_lead' | 'manager' | 'director' | 'executive' | 'board';
  /** Required approver roles */
  readonly requiredApprovers?: readonly string[];

  /** Whether change affects production data */
  readonly affectsProductionData: boolean;
  /** Whether change affects financial records */
  readonly affectsFinancialRecords: boolean;
  /** Whether change affects PII */
  readonly affectsPII: boolean;

  /** Recommended testing before implementation */
  readonly testingRequired: 'none' | 'unit' | 'integration' | 'full_regression' | 'user_acceptance';
  /** Recommended implementation window */
  readonly implementationWindow: 'anytime' | 'off_hours' | 'maintenance_window' | 'change_freeze_exception';
}

// =============================================================================
// RESOLUTION DEFINITION
// =============================================================================

/**
 * ERP-level proposed resolution
 */
export interface ERPResolution {
  /** Unique resolution identifier */
  readonly resolutionId: string;
  /** Resolution category */
  readonly category: ResolutionCategory;
  /** Priority for implementation */
  readonly priority: ResolutionPriority;

  /** Short action title */
  readonly title: string;
  /** Detailed action description */
  readonly description: string;
  /** Specific steps for implementation */
  readonly implementationSteps: readonly string[];

  /** Target ERP system/module */
  readonly targetSystem: string;
  /** Target domain */
  readonly targetDomain: SurfaceDomain;
  /** Affected entities */
  readonly affectedEntities: readonly string[];

  /** Impact annotations */
  readonly impact: ResolutionImpact;
  /** Safety flags */
  readonly safety: ResolutionSafety;

  /** Dependencies on other resolutions */
  readonly dependencies: readonly string[];
  /** Resolutions this conflicts with */
  readonly conflicts: readonly string[];

  /** Source blocking issue this resolves (if any) */
  readonly resolvesBlockingIssue?: string;
  /** Source recommendation this supports */
  readonly supportsRecommendation: Recommendation;
}

/**
 * Resolution package for executive synthesis
 */
export interface ResolutionPackage {
  /** Executive summary this package is for */
  readonly synthesisReference: {
    readonly system: string;
    readonly timestamp: string;
    readonly recommendation: Recommendation;
    readonly riskLevel: RiskLevel;
  };

  /** Proposed resolutions */
  readonly resolutions: readonly ERPResolution[];

  /** Implementation order (resolution IDs in sequence) */
  readonly implementationOrder: readonly string[];

  /** Overall package summary */
  readonly summary: {
    readonly totalResolutions: number;
    readonly byCategory: Record<ResolutionCategory, number>;
    readonly byPriority: Record<ResolutionPriority, number>;
    readonly requiresHumanApproval: boolean;
    readonly hasIrreversibleChanges: boolean;
    readonly hasPolicySensitiveChanges: boolean;
    readonly estimatedTotalEffortHours?: number;
  };
}

// =============================================================================
// RESOLUTION GENERATORS
// =============================================================================

/**
 * Context for resolution generation
 */
export interface ResolutionContext {
  readonly synthesis: ExecutiveSummary;
  readonly domain: SurfaceDomain;
  readonly surfaceId: string;
  readonly vendor?: string;
  readonly blockingIssues: readonly BlockingIssue[];
  readonly hasMutatingOperations: boolean;
  readonly includesPII: boolean;
  readonly includesFinancialData: boolean;
  readonly crossSystemDependencies: readonly string[];
}

/**
 * Generate workflow change resolution
 */
export function generateWorkflowResolution(
  context: ResolutionContext,
  issue?: BlockingIssue
): ERPResolution {
  const resolutionId = `WF-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const isProductionTarget = context.synthesis.deploy_reference.environment === 'production';

  // Determine specific workflow action based on context
  const workflowAction = determineWorkflowAction(context, issue);

  return {
    resolutionId,
    category: 'workflow_change',
    priority: isProductionTarget ? 'high' : 'medium',
    title: workflowAction.title,
    description: workflowAction.description,
    implementationSteps: workflowAction.steps,
    targetSystem: context.synthesis.deploy_reference.system,
    targetDomain: context.domain,
    affectedEntities: workflowAction.entities,
    impact: {
      cost: {
        severity: 'minimal',
        oneTimeCost: true,
        recurringCost: false,
        category: 'implementation',
        description: 'Configuration change requiring workflow administrator time',
        estimatedEffortHours: 4
      },
      risk: {
        severity: 'moderate',
        mitigatesExistingRisk: true,
        introducesNewRisk: false,
        affectedDomains: ['operational'],
        description: 'Changes task routing and approval flow',
        rollbackComplexity: 'moderate'
      },
      throughput: {
        direction: 'neutral',
        affectedMetrics: ['response_time'],
        description: 'May slightly increase approval time due to additional steps'
      }
    },
    safety: {
      irreversible: false,
      policySensitive: true,
      affectedPolicies: ['workflow_governance', 'approval_matrix'],
      requiresHumanApproval: true,
      approvalLevel: 'manager',
      requiredApprovers: ['workflow_admin', 'process_owner'],
      affectsProductionData: false,
      affectsFinancialRecords: context.includesFinancialData,
      affectsPII: context.includesPII,
      testingRequired: 'integration',
      implementationWindow: isProductionTarget ? 'off_hours' : 'anytime'
    },
    dependencies: [],
    conflicts: [],
    resolvesBlockingIssue: issue?.code,
    supportsRecommendation: context.synthesis.recommendation
  };
}

/**
 * Generate system reconfiguration resolution
 */
export function generateSystemReconfigResolution(
  context: ResolutionContext,
  issue?: BlockingIssue
): ERPResolution {
  const resolutionId = `SYS-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const isProductionTarget = context.synthesis.deploy_reference.environment === 'production';
  const isCriticalDomain = ['finance', 'hcm', 'supply-chain'].includes(context.domain);

  const systemAction = determineSystemAction(context, issue);

  return {
    resolutionId,
    category: 'system_reconfiguration',
    priority: isCriticalDomain ? 'critical' : 'high',
    title: systemAction.title,
    description: systemAction.description,
    implementationSteps: systemAction.steps,
    targetSystem: context.synthesis.deploy_reference.system,
    targetDomain: context.domain,
    affectedEntities: systemAction.entities,
    impact: {
      cost: {
        severity: isCriticalDomain ? 'moderate' : 'minimal',
        oneTimeCost: true,
        recurringCost: false,
        category: 'implementation',
        description: 'System configuration requiring technical administrator and testing',
        estimatedEffortHours: isCriticalDomain ? 16 : 8
      },
      risk: {
        severity: isProductionTarget ? 'significant' : 'moderate',
        mitigatesExistingRisk: true,
        introducesNewRisk: isProductionTarget,
        affectedDomains: ['operational', 'data_integrity'],
        description: `System configuration change in ${context.domain} domain`,
        rollbackComplexity: isProductionTarget ? 'complex' : 'moderate'
      },
      throughput: {
        direction: 'neutral',
        affectedMetrics: ['transaction_volume', 'response_time'],
        description: 'Brief service impact during reconfiguration window'
      }
    },
    safety: {
      irreversible: false,
      policySensitive: isCriticalDomain,
      affectedPolicies: isCriticalDomain ? ['system_governance', 'change_control'] : undefined,
      requiresHumanApproval: true,
      approvalLevel: isProductionTarget ? 'director' : 'manager',
      requiredApprovers: ['system_admin', 'domain_owner'],
      affectsProductionData: isProductionTarget,
      affectsFinancialRecords: context.includesFinancialData,
      affectsPII: context.includesPII,
      testingRequired: isProductionTarget ? 'full_regression' : 'integration',
      implementationWindow: isProductionTarget ? 'maintenance_window' : 'off_hours'
    },
    dependencies: [],
    conflicts: [],
    resolvesBlockingIssue: issue?.code,
    supportsRecommendation: context.synthesis.recommendation
  };
}

/**
 * Generate approval routing change resolution
 */
export function generateApprovalRoutingResolution(
  context: ResolutionContext,
  issue?: BlockingIssue
): ERPResolution {
  const resolutionId = `APR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const isFinancialDomain = context.domain === 'finance' || context.domain === 'procurement';

  const approvalAction = determineApprovalAction(context, issue);

  return {
    resolutionId,
    category: 'approval_routing',
    priority: isFinancialDomain ? 'high' : 'medium',
    title: approvalAction.title,
    description: approvalAction.description,
    implementationSteps: approvalAction.steps,
    targetSystem: context.synthesis.deploy_reference.system,
    targetDomain: context.domain,
    affectedEntities: approvalAction.entities,
    impact: {
      cost: {
        severity: 'minimal',
        oneTimeCost: true,
        recurringCost: false,
        category: 'implementation',
        description: 'Approval matrix update requiring governance review',
        estimatedEffortHours: 6
      },
      risk: {
        severity: isFinancialDomain ? 'moderate' : 'minimal',
        mitigatesExistingRisk: true,
        introducesNewRisk: false,
        affectedDomains: ['compliance', 'operational'],
        description: 'Changes approval authority and escalation paths',
        rollbackComplexity: 'trivial'
      },
      throughput: {
        direction: context.synthesis.recommendation === 'APPROVE' ? 'increase' : 'decrease',
        affectedMetrics: ['response_time'],
        description: context.synthesis.recommendation === 'APPROVE'
          ? 'Streamlined approval process reduces cycle time'
          : 'Additional approval steps increase processing time'
      }
    },
    safety: {
      irreversible: false,
      policySensitive: true,
      affectedPolicies: ['approval_matrix', 'delegation_of_authority', 'segregation_of_duties'],
      requiresHumanApproval: true,
      approvalLevel: isFinancialDomain ? 'director' : 'manager',
      requiredApprovers: ['compliance_officer', 'process_owner'],
      affectsProductionData: false,
      affectsFinancialRecords: isFinancialDomain,
      affectsPII: context.includesPII,
      testingRequired: 'user_acceptance',
      implementationWindow: 'anytime'
    },
    dependencies: [],
    conflicts: [],
    resolvesBlockingIssue: issue?.code,
    supportsRecommendation: context.synthesis.recommendation
  };
}

/**
 * Generate model placement adjustment resolution
 */
export function generateModelPlacementResolution(
  context: ResolutionContext,
  issue?: BlockingIssue
): ERPResolution {
  const resolutionId = `MPL-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const hasCrossSystemDeps = context.crossSystemDependencies.length > 0;

  const modelAction = determineModelAction(context, issue);

  return {
    resolutionId,
    category: 'model_placement',
    priority: hasCrossSystemDeps ? 'high' : 'medium',
    title: modelAction.title,
    description: modelAction.description,
    implementationSteps: modelAction.steps,
    targetSystem: context.synthesis.deploy_reference.system,
    targetDomain: context.domain,
    affectedEntities: modelAction.entities,
    impact: {
      cost: {
        severity: hasCrossSystemDeps ? 'moderate' : 'minimal',
        oneTimeCost: true,
        recurringCost: hasCrossSystemDeps,
        category: hasCrossSystemDeps ? 'mixed' : 'implementation',
        description: hasCrossSystemDeps
          ? 'Cross-system integration requiring ongoing synchronization'
          : 'Entity model restructuring within single system',
        estimatedEffortHours: hasCrossSystemDeps ? 24 : 8
      },
      risk: {
        severity: hasCrossSystemDeps ? 'significant' : 'moderate',
        mitigatesExistingRisk: true,
        introducesNewRisk: hasCrossSystemDeps,
        affectedDomains: ['data_integrity', 'operational'],
        description: 'Changes data model structure and entity relationships',
        rollbackComplexity: hasCrossSystemDeps ? 'complex' : 'moderate'
      },
      throughput: {
        direction: 'neutral',
        affectedMetrics: ['batch_processing', 'response_time'],
        description: 'Query patterns may need optimization after model change',
        expectedChangePercent: -5
      }
    },
    safety: {
      irreversible: hasCrossSystemDeps,
      irreversibleReason: hasCrossSystemDeps
        ? 'Cross-system entity relationships cannot be atomically reverted'
        : undefined,
      policySensitive: true,
      affectedPolicies: ['data_architecture', 'master_data_governance'],
      requiresHumanApproval: true,
      approvalLevel: hasCrossSystemDeps ? 'executive' : 'director',
      requiredApprovers: ['data_architect', 'integration_lead', 'domain_owner'],
      affectsProductionData: true,
      affectsFinancialRecords: context.includesFinancialData,
      affectsPII: context.includesPII,
      testingRequired: 'full_regression',
      implementationWindow: 'maintenance_window'
    },
    dependencies: [],
    conflicts: [],
    resolvesBlockingIssue: issue?.code,
    supportsRecommendation: context.synthesis.recommendation
  };
}

/**
 * Generate data governance resolution
 */
export function generateDataGovernanceResolution(
  context: ResolutionContext,
  issue?: BlockingIssue
): ERPResolution {
  const resolutionId = `DGV-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const hasSensitiveData = context.includesPII || context.includesFinancialData;

  return {
    resolutionId,
    category: 'data_governance',
    priority: hasSensitiveData ? 'critical' : 'high',
    title: hasSensitiveData
      ? 'Implement data classification controls'
      : 'Update data access policies',
    description: hasSensitiveData
      ? `Establish data classification and access controls for ${context.includesPII ? 'PII' : ''}${context.includesPII && context.includesFinancialData ? ' and ' : ''}${context.includesFinancialData ? 'financial data' : ''} in ${context.domain} domain`
      : `Review and update data access policies for ${context.domain} surface operations`,
    implementationSteps: hasSensitiveData ? [
      '1. Identify all sensitive data fields in affected entities',
      '2. Apply data classification labels (confidential/restricted)',
      '3. Configure field-level access controls based on role matrix',
      '4. Enable audit logging for sensitive field access',
      '5. Update data retention policies as required',
      '6. Document classification decisions in data catalog'
    ] : [
      '1. Review current data access policies for affected entities',
      '2. Update role-based access control definitions',
      '3. Validate access grants against principle of least privilege',
      '4. Enable access logging for compliance tracking'
    ],
    targetSystem: context.synthesis.deploy_reference.system,
    targetDomain: context.domain,
    affectedEntities: [`${context.surfaceId}.entities`, `${context.surfaceId}.access_controls`],
    impact: {
      cost: {
        severity: hasSensitiveData ? 'moderate' : 'minimal',
        oneTimeCost: true,
        recurringCost: true,
        category: 'mixed',
        description: 'Policy implementation plus ongoing compliance monitoring',
        estimatedEffortHours: hasSensitiveData ? 20 : 8
      },
      risk: {
        severity: hasSensitiveData ? 'minimal' : 'none',
        mitigatesExistingRisk: true,
        introducesNewRisk: false,
        affectedDomains: ['compliance', 'security'],
        description: 'Reduces data exposure risk through proper governance controls',
        rollbackComplexity: 'trivial'
      },
      throughput: {
        direction: 'decrease',
        affectedMetrics: ['response_time'],
        description: 'Additional access checks add minor latency',
        expectedChangePercent: -2
      }
    },
    safety: {
      irreversible: false,
      policySensitive: true,
      affectedPolicies: ['data_classification', 'access_control', 'privacy_policy'],
      requiresHumanApproval: true,
      approvalLevel: hasSensitiveData ? 'executive' : 'director',
      requiredApprovers: ['data_protection_officer', 'compliance_officer', 'security_officer'],
      affectsProductionData: false,
      affectsFinancialRecords: context.includesFinancialData,
      affectsPII: context.includesPII,
      testingRequired: 'user_acceptance',
      implementationWindow: 'anytime'
    },
    dependencies: [],
    conflicts: [],
    resolvesBlockingIssue: issue?.code,
    supportsRecommendation: context.synthesis.recommendation
  };
}

// =============================================================================
// ACTION DETERMINATION HELPERS
// =============================================================================

interface ActionDetails {
  title: string;
  description: string;
  steps: readonly string[];
  entities: readonly string[];
}

function determineWorkflowAction(context: ResolutionContext, issue?: BlockingIssue): ActionDetails {
  const baseEntity = context.surfaceId.split('.')[1] || 'entity';

  if (issue?.code === 'ERR_UNAUTHORIZED_OPERATION') {
    return {
      title: 'Add authorization workflow step',
      description: `Insert authorization checkpoint before ${baseEntity} mutation operations`,
      steps: [
        '1. Identify affected workflow definition in workflow service',
        '2. Add new task definition for authorization verification',
        '3. Configure assignment rule to route to authorized approver role',
        '4. Set SLA policy with appropriate timeout (recommend 24h)',
        '5. Add escalation policy for timeout scenarios',
        '6. Update workflow transition to include new authorization task',
        '7. Test workflow with sample request'
      ],
      entities: [`workflow.${baseEntity}_approval`, `task.authorization_check`]
    };
  }

  if (issue?.code === 'ERR_POLICY_VIOLATION') {
    return {
      title: 'Implement policy compliance workflow',
      description: `Add policy validation step to ${context.domain} ${baseEntity} processing`,
      steps: [
        '1. Create policy check task definition',
        '2. Configure conditional transition based on policy evaluation',
        '3. Route policy violations to compliance review queue',
        '4. Set up automated notification for policy exceptions',
        '5. Document policy check criteria in workflow instructions'
      ],
      entities: [`workflow.policy_compliance`, `task.policy_validation`]
    };
  }

  // Default: add review workflow
  return {
    title: `Add review workflow for ${context.domain} operations`,
    description: `Implement review and approval workflow for ${baseEntity} surface operations`,
    steps: [
      '1. Define review workflow with appropriate task structure',
      '2. Configure reviewer assignment based on domain expertise',
      '3. Set completion criteria and approval thresholds',
      '4. Integrate with existing escalation policies',
      '5. Enable audit trail for review decisions'
    ],
    entities: [`workflow.${baseEntity}_review`, `task.domain_review`]
  };
}

function determineSystemAction(context: ResolutionContext, issue?: BlockingIssue): ActionDetails {
  const baseEntity = context.surfaceId.split('.')[1] || 'entity';

  if (issue?.code === 'ERR_SCHEMA_BINDING_FAILED') {
    return {
      title: 'Reconfigure schema binding',
      description: `Correct schema binding configuration for ${baseEntity} entity mapping`,
      steps: [
        '1. Export current schema binding configuration',
        '2. Identify misaligned field mappings from error details',
        '3. Update field type mappings to ensure compatibility',
        '4. Validate bidirectional consistency of bindings',
        '5. Apply updated configuration in staging environment',
        '6. Run integration tests to verify binding correctness',
        '7. Promote to production after successful validation'
      ],
      entities: [`schema.${baseEntity}`, `binding.${baseEntity}_mapping`]
    };
  }

  if (issue?.code === 'ERR_MISSING_CREDENTIALS') {
    return {
      title: 'Configure service credentials',
      description: `Set up required credentials and scopes for ${context.domain} system access`,
      steps: [
        '1. Identify required credential scopes from error details',
        '2. Request service account with appropriate permissions',
        '3. Configure credential storage in secrets management',
        '4. Update connection configuration with new credentials',
        '5. Validate connectivity and scope access',
        '6. Set up credential rotation schedule'
      ],
      entities: [`credential.${context.domain}_service`, `config.connection`]
    };
  }

  // Default: general system reconfiguration
  return {
    title: `Reconfigure ${context.domain} system integration`,
    description: `Update system configuration for improved ${baseEntity} surface compatibility`,
    steps: [
      '1. Review current system configuration settings',
      '2. Identify configuration gaps from synthesis analysis',
      '3. Update integration parameters as required',
      '4. Validate configuration changes in test environment',
      '5. Document configuration changes for change control'
    ],
    entities: [`config.${context.domain}`, `integration.${baseEntity}`]
  };
}

function determineApprovalAction(context: ResolutionContext, issue?: BlockingIssue): ActionDetails {
  const baseEntity = context.surfaceId.split('.')[1] || 'entity';

  if (issue?.code === 'ERR_DATA_CLASSIFICATION_CONFLICT') {
    return {
      title: 'Update approval matrix for sensitive data',
      description: `Add data classification-aware approval requirements for ${baseEntity} operations`,
      steps: [
        '1. Review current approval matrix for affected operations',
        '2. Add data classification tier to approval routing logic',
        '3. Define approver roles for each classification level',
        '4. Configure conditional routing based on data sensitivity',
        '5. Update notification templates with classification context',
        '6. Document updated approval requirements'
      ],
      entities: [`approval.${baseEntity}_matrix`, `routing.classification_based`]
    };
  }

  if (context.synthesis.recommendation === 'DEFER') {
    return {
      title: 'Add manual review approval step',
      description: `Insert manual review checkpoint for deferred ${context.domain} operations`,
      steps: [
        '1. Add review task to approval workflow',
        '2. Configure assignment to domain expert reviewers',
        '3. Define review checklist criteria',
        '4. Set escalation path for review delays',
        '5. Enable approval tracking and audit logging'
      ],
      entities: [`approval.manual_review`, `routing.${context.domain}_review`]
    };
  }

  // Default: optimize approval routing
  return {
    title: `Optimize approval routing for ${context.domain}`,
    description: `Streamline approval process while maintaining control requirements`,
    steps: [
      '1. Analyze current approval routing effectiveness',
      '2. Identify approval bottlenecks and redundancies',
      '3. Configure parallel approval paths where appropriate',
      '4. Set up automated pre-approval validation checks',
      '5. Update delegation of authority as needed'
    ],
    entities: [`approval.${context.domain}_routing`, `delegation.authority_matrix`]
  };
}

function determineModelAction(context: ResolutionContext, issue?: BlockingIssue): ActionDetails {
  const baseEntity = context.surfaceId.split('.')[1] || 'entity';

  if (issue?.code === 'ERR_UNRESOLVED_ENTITY') {
    return {
      title: 'Add missing entity definition',
      description: `Create or map missing ${baseEntity} entity to resolve surface binding`,
      steps: [
        '1. Identify unresolved entity from blocking issue details',
        '2. Determine if entity exists in source system under different name',
        '3. If exists: create entity alias mapping to surface definition',
        '4. If new: define entity structure matching surface contract',
        '5. Validate entity completeness against surface requirements',
        '6. Update surface registry with resolved entity binding'
      ],
      entities: [`entity.${baseEntity}`, `mapping.entity_resolution`]
    };
  }

  if (context.crossSystemDependencies.length > 0) {
    return {
      title: 'Establish cross-system entity federation',
      description: `Configure entity federation across: ${context.crossSystemDependencies.join(', ')}`,
      steps: [
        '1. Define master data source for shared entities',
        '2. Configure entity replication or federation rules',
        '3. Establish synchronization schedule and conflict resolution',
        '4. Set up cross-system entity reference mappings',
        '5. Implement change data capture for entity updates',
        '6. Configure fallback behavior for system unavailability'
      ],
      entities: [`federation.${baseEntity}`, ...context.crossSystemDependencies.map(s => `reference.${s}`)]
    };
  }

  // Default: model optimization
  return {
    title: `Optimize ${baseEntity} model placement`,
    description: `Adjust entity model structure for improved surface binding efficiency`,
    steps: [
      '1. Analyze current entity model against surface requirements',
      '2. Identify model optimization opportunities',
      '3. Refactor entity relationships if needed',
      '4. Update surface bindings to match optimized model',
      '5. Validate model changes with integration tests'
    ],
    entities: [`model.${baseEntity}`, `binding.optimized`]
  };
}

// =============================================================================
// RESOLUTION PACKAGE BUILDER
// =============================================================================

/**
 * Build complete resolution package from synthesis
 */
export function buildResolutionPackage(context: ResolutionContext): ResolutionPackage {
  const resolutions: ERPResolution[] = [];

  // Generate resolutions for blocking issues
  for (const issue of context.blockingIssues) {
    const resolution = selectResolutionForIssue(context, issue);
    if (resolution) {
      resolutions.push(resolution);
    }
  }

  // Generate proactive resolutions based on synthesis recommendation
  if (context.synthesis.recommendation === 'DEFER') {
    // Add review workflow
    resolutions.push(generateWorkflowResolution(context));
    // Add approval routing update
    resolutions.push(generateApprovalRoutingResolution(context));
  }

  if (context.synthesis.recommendation === 'REJECT') {
    // Add system reconfiguration
    resolutions.push(generateSystemReconfigResolution(context));
  }

  // Add data governance if sensitive data present
  if (context.includesPII || context.includesFinancialData) {
    resolutions.push(generateDataGovernanceResolution(context));
  }

  // Add model placement if cross-system dependencies
  if (context.crossSystemDependencies.length > 0) {
    resolutions.push(generateModelPlacementResolution(context));
  }

  // Determine implementation order (critical first, respecting dependencies)
  const implementationOrder = calculateImplementationOrder(resolutions);

  // Build summary
  const summary = buildPackageSummary(resolutions);

  return {
    synthesisReference: {
      system: context.synthesis.deploy_reference.system,
      timestamp: context.synthesis.deploy_reference.timestamp,
      recommendation: context.synthesis.recommendation,
      riskLevel: context.synthesis.risk_level
    },
    resolutions,
    implementationOrder,
    summary
  };
}

function selectResolutionForIssue(
  context: ResolutionContext,
  issue: BlockingIssue
): ERPResolution | null {
  switch (issue.code) {
    case 'ERR_UNRESOLVED_ENTITY':
      return generateModelPlacementResolution(context, issue);
    case 'ERR_SCHEMA_BINDING_FAILED':
      return generateSystemReconfigResolution(context, issue);
    case 'ERR_UNAUTHORIZED_OPERATION':
      return generateWorkflowResolution(context, issue);
    case 'ERR_POLICY_VIOLATION':
      return generateApprovalRoutingResolution(context, issue);
    case 'ERR_MISSING_CREDENTIALS':
      return generateSystemReconfigResolution(context, issue);
    case 'ERR_DATA_CLASSIFICATION_CONFLICT':
      return generateDataGovernanceResolution(context, issue);
    default:
      return null;
  }
}

function calculateImplementationOrder(resolutions: ERPResolution[]): readonly string[] {
  // Priority order: critical > high > medium > low
  const priorityOrder: Record<ResolutionPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
  };

  // Sort by priority, then by dependencies
  const sorted = [...resolutions].sort((a, b) => {
    // First by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by whether it's a dependency of others
    const aIsDependency = resolutions.some(r => r.dependencies.includes(a.resolutionId));
    const bIsDependency = resolutions.some(r => r.dependencies.includes(b.resolutionId));
    if (aIsDependency && !bIsDependency) return -1;
    if (!aIsDependency && bIsDependency) return 1;

    return 0;
  });

  return sorted.map(r => r.resolutionId);
}

function buildPackageSummary(resolutions: ERPResolution[]): ResolutionPackage['summary'] {
  const byCategory: Record<ResolutionCategory, number> = {
    workflow_change: 0,
    system_reconfiguration: 0,
    approval_routing: 0,
    model_placement: 0,
    data_governance: 0,
    integration_adjustment: 0
  };

  const byPriority: Record<ResolutionPriority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  let requiresHumanApproval = false;
  let hasIrreversibleChanges = false;
  let hasPolicySensitiveChanges = false;
  let totalEffort = 0;

  for (const resolution of resolutions) {
    byCategory[resolution.category]++;
    byPriority[resolution.priority]++;

    if (resolution.safety.requiresHumanApproval) requiresHumanApproval = true;
    if (resolution.safety.irreversible) hasIrreversibleChanges = true;
    if (resolution.safety.policySensitive) hasPolicySensitiveChanges = true;
    if (resolution.impact.cost.estimatedEffortHours) {
      totalEffort += resolution.impact.cost.estimatedEffortHours;
    }
  }

  return {
    totalResolutions: resolutions.length,
    byCategory,
    byPriority,
    requiresHumanApproval,
    hasIrreversibleChanges,
    hasPolicySensitiveChanges,
    estimatedTotalEffortHours: totalEffort > 0 ? totalEffort : undefined
  };
}

