/**
 * ERP Resolution Generation Tests
 *
 * Tests for concrete ERP-level resolution generation:
 * - Resolution mapping to ERP concepts
 * - Impact annotations (cost, risk, throughput)
 * - Safety flags (irreversible, policy-sensitive, human approval)
 */

import {
  generateWorkflowResolution,
  generateSystemReconfigResolution,
  generateApprovalRoutingResolution,
  generateModelPlacementResolution,
  generateDataGovernanceResolution,
  buildResolutionPackage,
  type ResolutionContext
} from '../../src/synthesis/resolutions';
import type { ExecutiveSummary, BlockingIssue } from '../../src/synthesis';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createTestSynthesis(overrides: Partial<ExecutiveSummary> = {}): ExecutiveSummary {
  return {
    deploy_reference: {
      environment: 'staging',
      system: 'ERP_FINANCE_GENERAL_LEDGER',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    },
    metrics: {
      success_rate: 1.0,
      failed_iterations: 0,
      steps_executed: ['entity resolution', 'schema mapping', 'validation']
    },
    risk_level: 'medium',
    recommendation: 'APPROVE',
    rationale: 'All requirements met',
    ...overrides
  };
}

function createTestContext(overrides: Partial<ResolutionContext> = {}): ResolutionContext {
  return {
    synthesis: createTestSynthesis(),
    domain: 'finance',
    surfaceId: 'finance.general-ledger',
    blockingIssues: [],
    hasMutatingOperations: false,
    includesPII: false,
    includesFinancialData: true,
    crossSystemDependencies: [],
    ...overrides
  };
}

const BLOCKING_ISSUES: Record<string, BlockingIssue> = {
  unresolvedEntity: {
    code: 'ERR_UNRESOLVED_ENTITY',
    description: 'Required entity cannot be resolved',
    severity: 'error',
    affected: 'CostCenter'
  },
  schemaBindingFailed: {
    code: 'ERR_SCHEMA_BINDING_FAILED',
    description: 'Schema binding failed',
    severity: 'error',
    affected: 'GLAccount'
  },
  unauthorizedOperation: {
    code: 'ERR_UNAUTHORIZED_OPERATION',
    description: 'Unauthorized write operation detected',
    severity: 'critical',
    affected: 'PostJournalEntry'
  },
  policyViolation: {
    code: 'ERR_POLICY_VIOLATION',
    description: 'Policy violation detected',
    severity: 'critical',
    affected: 'SegregationOfDuties'
  },
  missingCredentials: {
    code: 'ERR_MISSING_CREDENTIALS',
    description: 'Missing required credentials',
    severity: 'error',
    affected: 'erp.finance.read'
  },
  dataClassificationConflict: {
    code: 'ERR_DATA_CLASSIFICATION_CONFLICT',
    description: 'Data classification conflict',
    severity: 'critical',
    affected: 'EmployeeSalary'
  }
};

// =============================================================================
// RESOLUTION STRUCTURE TESTS
// =============================================================================

describe('ERPResolution Structure', () => {
  it('generates resolution with required fields', () => {
    const context = createTestContext();
    const resolution = generateWorkflowResolution(context);

    expect(resolution).toHaveProperty('resolutionId');
    expect(resolution).toHaveProperty('category');
    expect(resolution).toHaveProperty('priority');
    expect(resolution).toHaveProperty('title');
    expect(resolution).toHaveProperty('description');
    expect(resolution).toHaveProperty('implementationSteps');
    expect(resolution).toHaveProperty('targetSystem');
    expect(resolution).toHaveProperty('targetDomain');
    expect(resolution).toHaveProperty('affectedEntities');
    expect(resolution).toHaveProperty('impact');
    expect(resolution).toHaveProperty('safety');
    expect(resolution).toHaveProperty('dependencies');
    expect(resolution).toHaveProperty('conflicts');
    expect(resolution).toHaveProperty('supportsRecommendation');
  });

  it('generates unique resolution IDs', () => {
    const context = createTestContext();
    const resolution1 = generateWorkflowResolution(context);
    const resolution2 = generateWorkflowResolution(context);

    expect(resolution1.resolutionId).not.toBe(resolution2.resolutionId);
  });
});

// =============================================================================
// IMPACT ANNOTATION TESTS
// =============================================================================

describe('Impact Annotations', () => {
  describe('Cost Impact', () => {
    it('annotates one-time vs recurring costs', () => {
      const context = createTestContext();
      const resolution = generateWorkflowResolution(context);

      expect(resolution.impact.cost).toHaveProperty('oneTimeCost');
      expect(resolution.impact.cost).toHaveProperty('recurringCost');
      expect(typeof resolution.impact.cost.oneTimeCost).toBe('boolean');
      expect(typeof resolution.impact.cost.recurringCost).toBe('boolean');
    });

    it('includes cost severity', () => {
      const context = createTestContext();
      const resolution = generateSystemReconfigResolution(context);

      expect(['none', 'minimal', 'moderate', 'significant', 'severe']).toContain(
        resolution.impact.cost.severity
      );
    });

    it('provides effort estimate for quantifiable work', () => {
      const context = createTestContext();
      const resolution = generateWorkflowResolution(context);

      expect(resolution.impact.cost.estimatedEffortHours).toBeGreaterThan(0);
    });

    it('elevates cost for critical domains', () => {
      const standardContext = createTestContext({ domain: 'customer' });
      const criticalContext = createTestContext({ domain: 'finance' });

      const standardRes = generateSystemReconfigResolution(standardContext);
      const criticalRes = generateSystemReconfigResolution(criticalContext);

      // Critical domains should have higher effort estimates
      expect(criticalRes.impact.cost.estimatedEffortHours).toBeGreaterThanOrEqual(
        standardRes.impact.cost.estimatedEffortHours!
      );
    });
  });

  describe('Risk Impact', () => {
    it('annotates risk mitigation vs introduction', () => {
      const context = createTestContext();
      const resolution = generateDataGovernanceResolution(context);

      expect(resolution.impact.risk.mitigatesExistingRisk).toBe(true);
      expect(resolution.impact.risk.introducesNewRisk).toBe(false);
    });

    it('includes affected risk domains', () => {
      const context = createTestContext();
      const resolution = generateApprovalRoutingResolution(context);

      expect(resolution.impact.risk.affectedDomains.length).toBeGreaterThan(0);
      expect(resolution.impact.risk.affectedDomains).toContain('compliance');
    });

    it('includes rollback complexity', () => {
      const context = createTestContext();
      const resolution = generateWorkflowResolution(context);

      expect(['trivial', 'moderate', 'complex', 'impossible']).toContain(
        resolution.impact.risk.rollbackComplexity
      );
    });

    it('elevates risk for production targets', () => {
      const stagingContext = createTestContext({
        synthesis: createTestSynthesis({
          deploy_reference: {
            environment: 'staging',
            system: 'ERP_FINANCE_GL',
            timestamp: new Date().toISOString()
          }
        })
      });

      const productionContext = createTestContext({
        synthesis: createTestSynthesis({
          deploy_reference: {
            environment: 'production',
            system: 'ERP_FINANCE_GL',
            timestamp: new Date().toISOString()
          }
        })
      });

      const stagingRes = generateSystemReconfigResolution(stagingContext);
      const productionRes = generateSystemReconfigResolution(productionContext);

      const severityOrder = ['none', 'minimal', 'moderate', 'significant', 'severe'];
      const stagingIdx = severityOrder.indexOf(stagingRes.impact.risk.severity);
      const productionIdx = severityOrder.indexOf(productionRes.impact.risk.severity);

      expect(productionIdx).toBeGreaterThanOrEqual(stagingIdx);
    });
  });

  describe('Throughput Impact', () => {
    it('annotates throughput direction', () => {
      const context = createTestContext();
      const resolution = generateApprovalRoutingResolution(context);

      expect(['increase', 'neutral', 'decrease']).toContain(
        resolution.impact.throughput.direction
      );
    });

    it('includes affected metrics', () => {
      const context = createTestContext();
      const resolution = generateModelPlacementResolution(context);

      expect(resolution.impact.throughput.affectedMetrics.length).toBeGreaterThan(0);
    });

    it('provides percentage change when quantifiable', () => {
      const context = createTestContext({
        crossSystemDependencies: ['SAP_CRM', 'SALESFORCE']
      });
      const resolution = generateModelPlacementResolution(context);

      // Cross-system model changes typically have negative throughput impact
      expect(resolution.impact.throughput.expectedChangePercent).toBeDefined();
    });
  });
});

// =============================================================================
// SAFETY FLAG TESTS
// =============================================================================

describe('Safety Flags', () => {
  describe('Irreversibility', () => {
    it('flags cross-system model changes as irreversible', () => {
      const context = createTestContext({
        crossSystemDependencies: ['SAP_CRM', 'SALESFORCE']
      });
      const resolution = generateModelPlacementResolution(context);

      expect(resolution.safety.irreversible).toBe(true);
      expect(resolution.safety.irreversibleReason).toBeDefined();
    });

    it('marks single-system changes as reversible', () => {
      const context = createTestContext({
        crossSystemDependencies: []
      });
      const resolution = generateModelPlacementResolution(context);

      expect(resolution.safety.irreversible).toBe(false);
    });
  });

  describe('Policy Sensitivity', () => {
    it('marks workflow changes as policy-sensitive', () => {
      const context = createTestContext();
      const resolution = generateWorkflowResolution(context);

      expect(resolution.safety.policySensitive).toBe(true);
      expect(resolution.safety.affectedPolicies).toContain('workflow_governance');
    });

    it('marks approval routing as policy-sensitive', () => {
      const context = createTestContext();
      const resolution = generateApprovalRoutingResolution(context);

      expect(resolution.safety.policySensitive).toBe(true);
      expect(resolution.safety.affectedPolicies).toContain('approval_matrix');
    });

    it('includes affected policies list', () => {
      const context = createTestContext();
      const resolution = generateDataGovernanceResolution(context);

      expect(resolution.safety.affectedPolicies?.length).toBeGreaterThan(0);
    });
  });

  describe('Human Approval Requirements', () => {
    it('requires human approval for all resolutions', () => {
      const context = createTestContext();

      const workflowRes = generateWorkflowResolution(context);
      const systemRes = generateSystemReconfigResolution(context);
      const approvalRes = generateApprovalRoutingResolution(context);
      const modelRes = generateModelPlacementResolution(context);
      const govRes = generateDataGovernanceResolution(context);

      expect(workflowRes.safety.requiresHumanApproval).toBe(true);
      expect(systemRes.safety.requiresHumanApproval).toBe(true);
      expect(approvalRes.safety.requiresHumanApproval).toBe(true);
      expect(modelRes.safety.requiresHumanApproval).toBe(true);
      expect(govRes.safety.requiresHumanApproval).toBe(true);
    });

    it('escalates approval level for production', () => {
      const stagingContext = createTestContext({
        synthesis: createTestSynthesis({
          deploy_reference: {
            environment: 'staging',
            system: 'ERP_FINANCE_GL',
            timestamp: new Date().toISOString()
          }
        })
      });

      const productionContext = createTestContext({
        synthesis: createTestSynthesis({
          deploy_reference: {
            environment: 'production',
            system: 'ERP_FINANCE_GL',
            timestamp: new Date().toISOString()
          }
        })
      });

      const stagingRes = generateSystemReconfigResolution(stagingContext);
      const productionRes = generateSystemReconfigResolution(productionContext);

      const approvalLevels = ['team_lead', 'manager', 'director', 'executive', 'board'];
      const stagingIdx = approvalLevels.indexOf(stagingRes.safety.approvalLevel!);
      const productionIdx = approvalLevels.indexOf(productionRes.safety.approvalLevel!);

      expect(productionIdx).toBeGreaterThan(stagingIdx);
    });

    it('includes required approver roles', () => {
      const context = createTestContext();
      const resolution = generateWorkflowResolution(context);

      expect(resolution.safety.requiredApprovers?.length).toBeGreaterThan(0);
    });

    it('elevates approval for sensitive data', () => {
      const standardContext = createTestContext({
        includesPII: false,
        includesFinancialData: false
      });

      const sensitiveContext = createTestContext({
        includesPII: true,
        includesFinancialData: true
      });

      const standardRes = generateDataGovernanceResolution(standardContext);
      const sensitiveRes = generateDataGovernanceResolution(sensitiveContext);

      const approvalLevels = ['team_lead', 'manager', 'director', 'executive', 'board'];
      const standardIdx = approvalLevels.indexOf(standardRes.safety.approvalLevel!);
      const sensitiveIdx = approvalLevels.indexOf(sensitiveRes.safety.approvalLevel!);

      expect(sensitiveIdx).toBeGreaterThanOrEqual(standardIdx);
    });
  });

  describe('Data Sensitivity Flags', () => {
    it('flags resolutions affecting production data', () => {
      const context = createTestContext({
        synthesis: createTestSynthesis({
          deploy_reference: {
            environment: 'production',
            system: 'ERP_FINANCE_GL',
            timestamp: new Date().toISOString()
          }
        })
      });
      const resolution = generateSystemReconfigResolution(context);

      expect(resolution.safety.affectsProductionData).toBe(true);
    });

    it('flags resolutions affecting financial records', () => {
      const context = createTestContext({
        includesFinancialData: true
      });
      const resolution = generateApprovalRoutingResolution(context);

      expect(resolution.safety.affectsFinancialRecords).toBe(true);
    });

    it('flags resolutions affecting PII', () => {
      const context = createTestContext({
        includesPII: true
      });
      const resolution = generateDataGovernanceResolution(context);

      expect(resolution.safety.affectsPII).toBe(true);
    });
  });

  describe('Testing and Implementation Requirements', () => {
    it('requires appropriate testing level', () => {
      const context = createTestContext();
      const resolution = generateSystemReconfigResolution(context);

      expect(['none', 'unit', 'integration', 'full_regression', 'user_acceptance']).toContain(
        resolution.safety.testingRequired
      );
    });

    it('specifies implementation window', () => {
      const context = createTestContext();
      const resolution = generateModelPlacementResolution(context);

      expect(['anytime', 'off_hours', 'maintenance_window', 'change_freeze_exception']).toContain(
        resolution.safety.implementationWindow
      );
    });

    it('requires maintenance window for production model changes', () => {
      const context = createTestContext({
        synthesis: createTestSynthesis({
          deploy_reference: {
            environment: 'production',
            system: 'ERP_FINANCE_GL',
            timestamp: new Date().toISOString()
          }
        })
      });
      const resolution = generateModelPlacementResolution(context);

      expect(resolution.safety.implementationWindow).toBe('maintenance_window');
    });
  });
});

// =============================================================================
// RESOLUTION MAPPING TESTS
// =============================================================================

describe('Resolution Mapping', () => {
  describe('Workflow Change Resolution', () => {
    it('maps unauthorized operation to authorization workflow', () => {
      const context = createTestContext({
        blockingIssues: [BLOCKING_ISSUES.unauthorizedOperation]
      });
      const resolution = generateWorkflowResolution(context, BLOCKING_ISSUES.unauthorizedOperation);

      expect(resolution.category).toBe('workflow_change');
      expect(resolution.title).toContain('authorization');
      expect(resolution.resolvesBlockingIssue).toBe('ERR_UNAUTHORIZED_OPERATION');
    });

    it('maps policy violation to compliance workflow', () => {
      const context = createTestContext({
        blockingIssues: [BLOCKING_ISSUES.policyViolation]
      });
      const resolution = generateWorkflowResolution(context, BLOCKING_ISSUES.policyViolation);

      expect(resolution.category).toBe('workflow_change');
      expect(resolution.title.toLowerCase()).toContain('policy');
    });

    it('includes concrete implementation steps', () => {
      const context = createTestContext();
      const resolution = generateWorkflowResolution(context);

      expect(resolution.implementationSteps.length).toBeGreaterThan(3);
      resolution.implementationSteps.forEach(step => {
        expect(step).toMatch(/^\d+\./); // Steps should be numbered
      });
    });
  });

  describe('System Reconfiguration Resolution', () => {
    it('maps schema binding failure to reconfiguration', () => {
      const context = createTestContext({
        blockingIssues: [BLOCKING_ISSUES.schemaBindingFailed]
      });
      const resolution = generateSystemReconfigResolution(context, BLOCKING_ISSUES.schemaBindingFailed);

      expect(resolution.category).toBe('system_reconfiguration');
      expect(resolution.title).toContain('schema');
      expect(resolution.resolvesBlockingIssue).toBe('ERR_SCHEMA_BINDING_FAILED');
    });

    it('maps missing credentials to credential configuration', () => {
      const context = createTestContext({
        blockingIssues: [BLOCKING_ISSUES.missingCredentials]
      });
      const resolution = generateSystemReconfigResolution(context, BLOCKING_ISSUES.missingCredentials);

      expect(resolution.category).toBe('system_reconfiguration');
      expect(resolution.title.toLowerCase()).toContain('credential');
    });
  });

  describe('Approval Routing Resolution', () => {
    it('maps data classification conflict to approval matrix update', () => {
      const context = createTestContext({
        blockingIssues: [BLOCKING_ISSUES.dataClassificationConflict]
      });
      const resolution = generateApprovalRoutingResolution(context, BLOCKING_ISSUES.dataClassificationConflict);

      expect(resolution.category).toBe('approval_routing');
      expect(resolution.title.toLowerCase()).toContain('approval');
    });

    it('adds review step for DEFER recommendation', () => {
      const context = createTestContext({
        synthesis: createTestSynthesis({ recommendation: 'DEFER' })
      });
      const resolution = generateApprovalRoutingResolution(context);

      expect(resolution.title.toLowerCase()).toContain('review');
    });
  });

  describe('Model Placement Resolution', () => {
    it('maps unresolved entity to entity definition', () => {
      const context = createTestContext({
        blockingIssues: [BLOCKING_ISSUES.unresolvedEntity]
      });
      const resolution = generateModelPlacementResolution(context, BLOCKING_ISSUES.unresolvedEntity);

      expect(resolution.category).toBe('model_placement');
      expect(resolution.title.toLowerCase()).toContain('entity');
      expect(resolution.resolvesBlockingIssue).toBe('ERR_UNRESOLVED_ENTITY');
    });

    it('handles cross-system federation', () => {
      const context = createTestContext({
        crossSystemDependencies: ['SAP_CRM', 'SALESFORCE']
      });
      const resolution = generateModelPlacementResolution(context);

      expect(resolution.title.toLowerCase()).toContain('federation');
      expect(resolution.affectedEntities.length).toBeGreaterThan(1);
    });
  });

  describe('Data Governance Resolution', () => {
    it('generates classification controls for PII', () => {
      const context = createTestContext({
        includesPII: true,
        includesFinancialData: false
      });
      const resolution = generateDataGovernanceResolution(context);

      expect(resolution.category).toBe('data_governance');
      expect(resolution.title).toContain('classification');
      expect(resolution.description).toContain('PII');
    });

    it('generates classification controls for financial data', () => {
      const context = createTestContext({
        includesPII: false,
        includesFinancialData: true
      });
      const resolution = generateDataGovernanceResolution(context);

      expect(resolution.category).toBe('data_governance');
      expect(resolution.description).toContain('financial');
    });
  });
});

// =============================================================================
// RESOLUTION PACKAGE TESTS
// =============================================================================

describe('Resolution Package', () => {
  it('builds package from synthesis context', () => {
    const context = createTestContext({
      synthesis: createTestSynthesis({ recommendation: 'DEFER' }),
      blockingIssues: [BLOCKING_ISSUES.unauthorizedOperation]
    });

    const pkg = buildResolutionPackage(context);

    expect(pkg).toHaveProperty('synthesisReference');
    expect(pkg).toHaveProperty('resolutions');
    expect(pkg).toHaveProperty('implementationOrder');
    expect(pkg).toHaveProperty('summary');
  });

  it('generates resolutions for blocking issues', () => {
    const context = createTestContext({
      blockingIssues: [
        BLOCKING_ISSUES.unauthorizedOperation,
        BLOCKING_ISSUES.schemaBindingFailed
      ]
    });

    const pkg = buildResolutionPackage(context);

    const resolvedCodes = pkg.resolutions
      .filter(r => r.resolvesBlockingIssue)
      .map(r => r.resolvesBlockingIssue);

    expect(resolvedCodes).toContain('ERR_UNAUTHORIZED_OPERATION');
    expect(resolvedCodes).toContain('ERR_SCHEMA_BINDING_FAILED');
  });

  it('adds proactive resolutions for DEFER recommendation', () => {
    const context = createTestContext({
      synthesis: createTestSynthesis({ recommendation: 'DEFER' }),
      blockingIssues: []
    });

    const pkg = buildResolutionPackage(context);

    const categories = pkg.resolutions.map(r => r.category);
    expect(categories).toContain('workflow_change');
    expect(categories).toContain('approval_routing');
  });

  it('adds system reconfiguration for REJECT recommendation', () => {
    const context = createTestContext({
      synthesis: createTestSynthesis({ recommendation: 'REJECT' }),
      blockingIssues: []
    });

    const pkg = buildResolutionPackage(context);

    const categories = pkg.resolutions.map(r => r.category);
    expect(categories).toContain('system_reconfiguration');
  });

  it('adds data governance for sensitive data', () => {
    const context = createTestContext({
      includesPII: true,
      includesFinancialData: true
    });

    const pkg = buildResolutionPackage(context);

    const categories = pkg.resolutions.map(r => r.category);
    expect(categories).toContain('data_governance');
  });

  it('adds model placement for cross-system dependencies', () => {
    const context = createTestContext({
      crossSystemDependencies: ['SAP_CRM']
    });

    const pkg = buildResolutionPackage(context);

    const categories = pkg.resolutions.map(r => r.category);
    expect(categories).toContain('model_placement');
  });

  it('orders implementation by priority', () => {
    const context = createTestContext({
      synthesis: createTestSynthesis({ recommendation: 'DEFER' }),
      blockingIssues: [BLOCKING_ISSUES.unauthorizedOperation],
      includesPII: true,
      crossSystemDependencies: ['SALESFORCE']
    });

    const pkg = buildResolutionPackage(context);

    // Implementation order should exist
    expect(pkg.implementationOrder.length).toBe(pkg.resolutions.length);

    // All resolution IDs should be in implementation order
    const resolutionIds = pkg.resolutions.map(r => r.resolutionId);
    pkg.implementationOrder.forEach(id => {
      expect(resolutionIds).toContain(id);
    });
  });

  describe('Package Summary', () => {
    it('calculates correct totals', () => {
      const context = createTestContext({
        synthesis: createTestSynthesis({ recommendation: 'DEFER' }),
        includesPII: true
      });

      const pkg = buildResolutionPackage(context);

      expect(pkg.summary.totalResolutions).toBe(pkg.resolutions.length);
    });

    it('counts resolutions by category', () => {
      const context = createTestContext({
        synthesis: createTestSynthesis({ recommendation: 'DEFER' }),
        includesPII: true,
        crossSystemDependencies: ['SALESFORCE']
      });

      const pkg = buildResolutionPackage(context);

      let categorySum = 0;
      Object.values(pkg.summary.byCategory).forEach(count => {
        categorySum += count;
      });
      expect(categorySum).toBe(pkg.summary.totalResolutions);
    });

    it('counts resolutions by priority', () => {
      const context = createTestContext({
        synthesis: createTestSynthesis({ recommendation: 'DEFER' }),
        blockingIssues: [BLOCKING_ISSUES.unauthorizedOperation]
      });

      const pkg = buildResolutionPackage(context);

      let prioritySum = 0;
      Object.values(pkg.summary.byPriority).forEach(count => {
        prioritySum += count;
      });
      expect(prioritySum).toBe(pkg.summary.totalResolutions);
    });

    it('flags human approval requirement', () => {
      const context = createTestContext();
      const pkg = buildResolutionPackage(context);

      const hasApprovalRequired = pkg.resolutions.some(r => r.safety.requiresHumanApproval);
      expect(pkg.summary.requiresHumanApproval).toBe(hasApprovalRequired);
    });

    it('flags irreversible changes', () => {
      const context = createTestContext({
        crossSystemDependencies: ['SAP_CRM', 'SALESFORCE']
      });

      const pkg = buildResolutionPackage(context);

      const hasIrreversible = pkg.resolutions.some(r => r.safety.irreversible);
      expect(pkg.summary.hasIrreversibleChanges).toBe(hasIrreversible);
    });

    it('flags policy-sensitive changes', () => {
      const context = createTestContext({
        synthesis: createTestSynthesis({ recommendation: 'DEFER' })
      });

      const pkg = buildResolutionPackage(context);

      const hasPolicySensitive = pkg.resolutions.some(r => r.safety.policySensitive);
      expect(pkg.summary.hasPolicySensitiveChanges).toBe(hasPolicySensitive);
    });

    it('calculates total effort hours', () => {
      const context = createTestContext({
        synthesis: createTestSynthesis({ recommendation: 'DEFER' }),
        includesPII: true
      });

      const pkg = buildResolutionPackage(context);

      if (pkg.summary.estimatedTotalEffortHours !== undefined) {
        let sumEffort = 0;
        pkg.resolutions.forEach(r => {
          if (r.impact.cost.estimatedEffortHours) {
            sumEffort += r.impact.cost.estimatedEffortHours;
          }
        });
        expect(pkg.summary.estimatedTotalEffortHours).toBe(sumEffort);
      }
    });
  });
});

// =============================================================================
// ACTIONABILITY TESTS
// =============================================================================

describe('Resolution Actionability', () => {
  it('provides concrete implementation steps', () => {
    const context = createTestContext();
    const resolution = generateWorkflowResolution(context);

    // Steps should be numbered and specific
    resolution.implementationSteps.forEach((step, index) => {
      expect(step).toMatch(new RegExp(`^${index + 1}\\.`));
      expect(step.length).toBeGreaterThan(20); // Non-trivial step descriptions
    });
  });

  it('specifies target system', () => {
    const context = createTestContext();
    const resolution = generateSystemReconfigResolution(context);

    expect(resolution.targetSystem).toBe(context.synthesis.deploy_reference.system);
  });

  it('specifies target domain', () => {
    const context = createTestContext({ domain: 'hcm' });
    const resolution = generateApprovalRoutingResolution(context);

    expect(resolution.targetDomain).toBe('hcm');
  });

  it('lists affected entities', () => {
    const context = createTestContext();
    const resolution = generateModelPlacementResolution(context);

    expect(resolution.affectedEntities.length).toBeGreaterThan(0);
    resolution.affectedEntities.forEach(entity => {
      expect(entity.length).toBeGreaterThan(0);
    });
  });

  it('can be handed to implementation team', () => {
    const context = createTestContext({
      synthesis: createTestSynthesis({ recommendation: 'DEFER' }),
      blockingIssues: [BLOCKING_ISSUES.unauthorizedOperation],
      includesPII: true
    });

    const pkg = buildResolutionPackage(context);

    // Each resolution should have all information needed for implementation
    pkg.resolutions.forEach(resolution => {
      // Clear action
      expect(resolution.title.length).toBeGreaterThan(10);
      expect(resolution.description.length).toBeGreaterThan(30);

      // Specific steps
      expect(resolution.implementationSteps.length).toBeGreaterThan(3);

      // Clear targets
      expect(resolution.targetSystem).toBeDefined();
      expect(resolution.targetDomain).toBeDefined();
      expect(resolution.affectedEntities.length).toBeGreaterThan(0);

      // Impact clarity
      expect(resolution.impact.cost.description.length).toBeGreaterThan(10);
      expect(resolution.impact.risk.description.length).toBeGreaterThan(10);
      expect(resolution.impact.throughput.description.length).toBeGreaterThan(10);

      // Safety requirements
      expect(resolution.safety.testingRequired).toBeDefined();
      expect(resolution.safety.implementationWindow).toBeDefined();
    });

    // Package should have clear implementation order
    expect(pkg.implementationOrder.length).toBe(pkg.resolutions.length);
  });
});
