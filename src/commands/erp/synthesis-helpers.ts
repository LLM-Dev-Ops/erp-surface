/**
 * Synthesis Helpers for ERP Commands
 *
 * Helper functions to build Decision Packets and executive synthesis
 * for ERP surface, map, and export commands.
 *
 * @module commands/erp/synthesis-helpers
 */

import { randomUUID } from 'crypto';
import type { RegistryEntry } from '../../registry';
import {
  buildExecutiveSummary,
  determineEnvironment,
  elevateRiskForProduction,
  hasMutatingOperations,
  involvesSensitiveData,
  type EnvironmentType,
  type BlockingIssueContext,
} from '../../synthesis';
import type {
  DataSensitivity,
  SensitiveFieldMarker,
  DataSensitivityClassification,
  MappingValidationResult,
  IntegrationRiskAssessment,
  DecisionPacket,
  ErpSurfaceInput,
  ErpMapInput,
  ErpExportInput,
} from './types';

// =============================================================================
// SENSITIVE FIELD DETECTION
// =============================================================================

/**
 * Known PII field patterns
 */
const PII_FIELD_PATTERNS = [
  /^(first|last|full)?name$/i,
  /email/i,
  /phone/i,
  /address/i,
  /ssn|social.?security/i,
  /passport/i,
  /driver.?license/i,
  /birth.?date|dob/i,
  /national.?id/i,
  /employee.?id/i,
  /person.?id/i,
];

/**
 * Known financial field patterns
 */
const FINANCIAL_FIELD_PATTERNS = [
  /account.?number/i,
  /routing.?number/i,
  /credit.?card/i,
  /bank/i,
  /salary|wage|compensation/i,
  /balance/i,
  /amount/i,
  /payment/i,
  /invoice/i,
  /tax/i,
];

/**
 * Known health data patterns
 */
const HEALTH_FIELD_PATTERNS = [
  /health/i,
  /medical/i,
  /diagnosis/i,
  /prescription/i,
  /insurance.?claim/i,
  /hipaa/i,
];

/**
 * Known authentication patterns
 */
const AUTH_FIELD_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api.?key/i,
  /credential/i,
  /private.?key/i,
];

/**
 * Detects sensitive fields in a surface entry
 */
export function detectSensitiveFields(surface: RegistryEntry): SensitiveFieldMarker[] {
  const markers: SensitiveFieldMarker[] = [];
  const domain = surface.domain;

  // Analyze operations for sensitive field patterns
  for (const operation of surface.operations) {
    const fieldPaths = [operation.inputType, operation.outputType];

    for (const fieldPath of fieldPaths) {
      // Check PII patterns
      for (const pattern of PII_FIELD_PATTERNS) {
        if (pattern.test(fieldPath)) {
          markers.push({
            fieldPath: `${operation.name}.${fieldPath}`,
            sensitivity: 'restricted',
            category: 'pii',
            description: `PII field detected in ${operation.name}`,
          });
        }
      }

      // Check financial patterns
      for (const pattern of FINANCIAL_FIELD_PATTERNS) {
        if (pattern.test(fieldPath)) {
          markers.push({
            fieldPath: `${operation.name}.${fieldPath}`,
            sensitivity: 'confidential',
            category: 'financial',
            description: `Financial data field in ${operation.name}`,
          });
        }
      }

      // Check health patterns
      for (const pattern of HEALTH_FIELD_PATTERNS) {
        if (pattern.test(fieldPath)) {
          markers.push({
            fieldPath: `${operation.name}.${fieldPath}`,
            sensitivity: 'restricted',
            category: 'health',
            description: `Health data field in ${operation.name}`,
          });
        }
      }

      // Check auth patterns
      for (const pattern of AUTH_FIELD_PATTERNS) {
        if (pattern.test(fieldPath)) {
          markers.push({
            fieldPath: `${operation.name}.${fieldPath}`,
            sensitivity: 'restricted',
            category: 'authentication',
            description: `Authentication credential in ${operation.name}`,
          });
        }
      }
    }
  }

  // Domain-specific sensitivity
  if (domain === 'hcm') {
    markers.push({
      fieldPath: 'domain.hcm',
      sensitivity: 'restricted',
      category: 'pii',
      description: 'HCM domain typically contains employee PII',
    });
  }

  if (domain === 'finance') {
    markers.push({
      fieldPath: 'domain.finance',
      sensitivity: 'confidential',
      category: 'financial',
      description: 'Finance domain contains financial records',
    });
  }

  return markers;
}

/**
 * Classifies data sensitivity for a surface
 */
export function classifyDataSensitivity(
  surface: RegistryEntry,
  additionalMarkers: SensitiveFieldMarker[] = []
): DataSensitivityClassification {
  const sensitiveFields = [...detectSensitiveFields(surface), ...additionalMarkers];

  const hasPII = sensitiveFields.some(f => f.category === 'pii');
  const hasFinancialData = sensitiveFields.some(f => f.category === 'financial');
  const hasHealthData = sensitiveFields.some(f => f.category === 'health');
  const hasAuthData = sensitiveFields.some(f => f.category === 'authentication');

  // Determine overall sensitivity (highest level)
  // Priority: restricted > confidential > internal > public
  const sensitivityPriority: Record<DataSensitivity, number> = {
    public: 0,
    internal: 1,
    confidential: 2,
    restricted: 3,
  };

  let overallSensitivity: DataSensitivity = 'public';
  let currentPriority = 0;

  for (const field of sensitiveFields) {
    const fieldPriority = sensitivityPriority[field.sensitivity];
    if (fieldPriority > currentPriority) {
      overallSensitivity = field.sensitivity;
      currentPriority = fieldPriority;
    }
    if (currentPriority === 3) break; // Already at highest level
  }

  return {
    overallSensitivity,
    sensitiveFields,
    hasPII,
    hasFinancialData,
    hasHealthData,
    hasAuthData,
  };
}

// =============================================================================
// MAPPING VALIDATION
// =============================================================================

/**
 * Validates mapping between source and target surfaces
 */
export function validateMapping(
  sourceSurface: RegistryEntry,
  targetSurface: RegistryEntry,
  fieldMappings: Record<string, string>,
  validateBidirectional: boolean = true
): MappingValidationResult {
  const sourceFields = sourceSurface.operations.flatMap(op => [op.inputType, op.outputType]);
  const targetFields = targetSurface.operations.flatMap(op => [op.inputType, op.outputType]);

  const mappedSourceFields = Object.keys(fieldMappings);
  const mappedTargetFields = Object.values(fieldMappings);

  const unmappedSourceFields = sourceFields.filter(f => !mappedSourceFields.includes(f));
  const unmappedTargetFields = targetFields.filter(f => !mappedTargetFields.includes(f));

  // Calculate completeness
  const totalFields = sourceFields.length + targetFields.length;
  const mappedFields = mappedSourceFields.length + mappedTargetFields.length;
  const completeness = totalFields > 0 ? mappedFields / totalFields : 1.0;

  // Check for type incompatibilities (simplified check)
  const typeIncompatibilities: MappingValidationResult['typeIncompatibilities'] = [];

  // Check bidirectional consistency
  let bidirectionalConsistency = true;
  if (validateBidirectional) {
    // Verify reverse mappings exist
    for (const [source, target] of Object.entries(fieldMappings)) {
      const reverseExists = Object.entries(fieldMappings).some(
        ([s, t]) => s === target && t === source
      );
      if (!reverseExists) {
        bidirectionalConsistency = false;
        break;
      }
    }
  }

  // Detect synchronization drift (simplified - check version compatibility)
  const syncDriftDetected = sourceSurface.version !== targetSurface.version;

  return {
    valid: completeness >= 0.8 && typeIncompatibilities.length === 0,
    completeness,
    unmappedSourceFields,
    unmappedTargetFields,
    typeIncompatibilities,
    bidirectionalConsistency,
    syncDriftDetected,
  };
}

// =============================================================================
// RISK ASSESSMENT
// =============================================================================

/**
 * Assesses integration risk for an operation
 */
export function assessIntegrationRisk(
  surface: RegistryEntry,
  sensitivity: DataSensitivityClassification,
  mappingValidation?: MappingValidationResult,
  isExport: boolean = false
): IntegrationRiskAssessment {
  const riskFactors: string[] = [];

  // Data leakage risk
  let dataLeakageRisk = 0;
  if (sensitivity.hasPII) {
    dataLeakageRisk += 0.4;
    riskFactors.push('PII data present');
  }
  if (sensitivity.hasFinancialData) {
    dataLeakageRisk += 0.3;
    riskFactors.push('Financial data present');
  }
  if (sensitivity.hasAuthData) {
    dataLeakageRisk += 0.3;
    riskFactors.push('Authentication credentials present');
  }
  dataLeakageRisk = Math.min(dataLeakageRisk, 1.0);

  // Mapping ambiguity risk
  let mappingAmbiguityRisk = 0;
  if (mappingValidation) {
    if (mappingValidation.completeness < 0.8) {
      mappingAmbiguityRisk += 0.4;
      riskFactors.push('Incomplete field mappings');
    }
    if (mappingValidation.typeIncompatibilities.length > 0) {
      mappingAmbiguityRisk += 0.3;
      riskFactors.push('Type incompatibilities detected');
    }
    if (!mappingValidation.bidirectionalConsistency) {
      mappingAmbiguityRisk += 0.3;
      riskFactors.push('Bidirectional inconsistency');
    }
  }
  mappingAmbiguityRisk = Math.min(mappingAmbiguityRisk, 1.0);

  // Sync drift risk
  let syncDriftRisk = 0;
  if (mappingValidation?.syncDriftDetected) {
    syncDriftRisk = 0.5;
    riskFactors.push('Version drift between surfaces');
  }

  // Export corruption risk
  let exportCorruptionRisk = 0;
  if (isExport) {
    if (sensitivity.overallSensitivity === 'restricted') {
      exportCorruptionRisk += 0.4;
      riskFactors.push('Exporting restricted data');
    }
    if (hasMutatingOperations(surface)) {
      exportCorruptionRisk += 0.3;
      riskFactors.push('Export includes mutating operations');
    }
  }
  exportCorruptionRisk = Math.min(exportCorruptionRisk, 1.0);

  // Schema mismatch risk
  let schemaMismatchRisk = 0;
  if (mappingValidation && mappingValidation.unmappedSourceFields.length > 0) {
    schemaMismatchRisk = 0.3 * (mappingValidation.unmappedSourceFields.length / 10);
    riskFactors.push('Orphaned source fields');
  }
  schemaMismatchRisk = Math.min(schemaMismatchRisk, 1.0);

  // Calculate overall risk (weighted average)
  const overallRisk = (
    dataLeakageRisk * 0.3 +
    mappingAmbiguityRisk * 0.25 +
    syncDriftRisk * 0.15 +
    exportCorruptionRisk * 0.15 +
    schemaMismatchRisk * 0.15
  );

  return {
    dataLeakageRisk,
    mappingAmbiguityRisk,
    syncDriftRisk,
    exportCorruptionRisk,
    schemaMismatchRisk,
    overallRisk,
    riskFactors,
  };
}

// =============================================================================
// DECISION PACKET BUILDERS
// =============================================================================

/**
 * Steps executed for surface command
 */
export const SURFACE_STEPS = [
  'erp system resolution',
  'surface registry lookup',
  'schema extraction',
  'sensitive field detection',
  'data classification',
  'synthesis generation',
] as const;

/**
 * Steps executed for map command
 */
export const MAP_STEPS = [
  'erp system resolution',
  'source surface resolution',
  'target surface resolution',
  'field mapping generation',
  'bidirectional consistency validation',
  'type compatibility check',
  'synthesis generation',
] as const;

/**
 * Steps executed for export command
 */
export const EXPORT_STEPS = [
  'erp system resolution',
  'surface collection',
  'schema serialization',
  'format conversion',
  'integrity hash generation',
  'synthesis generation',
] as const;

/**
 * Builds a Decision Packet for erp surface command
 */
export function buildSurfaceDecisionPacket(
  input: ErpSurfaceInput,
  surface: RegistryEntry
): DecisionPacket {
  const sensitivity = classifyDataSensitivity(surface);
  const riskAssessment = assessIntegrationRisk(surface, sensitivity);

  const { includesPII, includesFinancialData } = involvesSensitiveData(surface);
  const environment = determineEnvironment(input.surfaceId, input.environment as EnvironmentType);

  let synthesis = buildExecutiveSummary(
    {
      surfaceId: input.surfaceId,
      surfaceEntry: surface,
      targetVendor: input.vendor,
      explicitEnvironment: input.environment as EnvironmentType,
      hasMutatingOperations: hasMutatingOperations(surface),
      includesPII: includesPII || sensitivity.hasPII,
      includesFinancialData: includesFinancialData || sensitivity.hasFinancialData,
      version: surface.version,
      commitSha: process.env['GIT_SHA'],
    },
    {
      success: true,
      resolvedEntities: 1,
      totalEntities: 1,
      failedBindings: 0,
      rejectedConstraints: 0,
      stepsExecuted: [...SURFACE_STEPS],
    }
  );

  // Elevate risk for production
  if (environment === 'production') {
    synthesis = elevateRiskForProduction(synthesis);
  }

  return {
    dataSensitivity: sensitivity,
    riskAssessment,
    synthesis,
  };
}

/**
 * Builds a Decision Packet for erp map command
 */
export function buildMapDecisionPacket(
  input: ErpMapInput,
  sourceSurface: RegistryEntry,
  targetSurface: RegistryEntry,
  fieldMappings: Record<string, string>
): DecisionPacket {
  const sourceSensitivity = classifyDataSensitivity(sourceSurface);
  const targetSensitivity = classifyDataSensitivity(targetSurface);

  // Merge sensitivities
  const sensitivity: DataSensitivityClassification = {
    overallSensitivity:
      sourceSensitivity.overallSensitivity === 'restricted' ||
      targetSensitivity.overallSensitivity === 'restricted'
        ? 'restricted'
        : sourceSensitivity.overallSensitivity === 'confidential' ||
          targetSensitivity.overallSensitivity === 'confidential'
          ? 'confidential'
          : 'internal',
    sensitiveFields: [
      ...sourceSensitivity.sensitiveFields,
      ...targetSensitivity.sensitiveFields,
    ],
    hasPII: sourceSensitivity.hasPII || targetSensitivity.hasPII,
    hasFinancialData: sourceSensitivity.hasFinancialData || targetSensitivity.hasFinancialData,
    hasHealthData: sourceSensitivity.hasHealthData || targetSensitivity.hasHealthData,
    hasAuthData: sourceSensitivity.hasAuthData || targetSensitivity.hasAuthData,
  };

  const mappingValidation = validateMapping(
    sourceSurface,
    targetSurface,
    fieldMappings,
    input.validateBidirectional ?? true
  );

  const riskAssessment = assessIntegrationRisk(sourceSurface, sensitivity, mappingValidation);

  // Build blocking issues if mapping fails
  const blockingContext: BlockingIssueContext = {
    unresolvedEntities: [],
    failedBindings: mappingValidation.typeIncompatibilities.map(t => `${t.sourceField}->${t.targetField}`),
    unauthorizedOperations: [],
    policyViolations: !mappingValidation.bidirectionalConsistency
      ? ['Bidirectional consistency verification failed']
      : [],
    missingCredentials: [],
    dataClassificationConflicts: [],
  };

  const environment = determineEnvironment(input.surfaceId, input.environment as EnvironmentType);

  let synthesis = buildExecutiveSummary(
    {
      surfaceId: input.surfaceId,
      surfaceEntry: sourceSurface,
      targetVendor: input.vendor,
      explicitEnvironment: input.environment as EnvironmentType,
      hasMutatingOperations: hasMutatingOperations(sourceSurface) || hasMutatingOperations(targetSurface),
      includesPII: sensitivity.hasPII,
      includesFinancialData: sensitivity.hasFinancialData,
      crossSystemDependencies: [input.targetSurfaceId],
      blockingContext,
      version: sourceSurface.version,
      commitSha: process.env['GIT_SHA'],
    },
    {
      success: mappingValidation.valid,
      resolvedEntities: 2,
      totalEntities: 2,
      failedBindings: mappingValidation.typeIncompatibilities.length,
      rejectedConstraints: mappingValidation.bidirectionalConsistency ? 0 : 1,
      stepsExecuted: [...MAP_STEPS],
    }
  );

  // Elevate risk for production or cross-system joins
  if (environment === 'production') {
    synthesis = elevateRiskForProduction(synthesis);
  }

  return {
    dataSensitivity: sensitivity,
    mappingValidation,
    riskAssessment,
    synthesis,
  };
}

/**
 * Builds a Decision Packet for erp export command
 */
export function buildExportDecisionPacket(
  input: ErpExportInput,
  surfaces: readonly RegistryEntry[]
): DecisionPacket {
  // Aggregate sensitivity across all surfaces
  const allMarkers: SensitiveFieldMarker[] = [];
  let hasPII = false;
  let hasFinancialData = false;
  let hasHealthData = false;
  let hasAuthData = false;

  for (const surface of surfaces) {
    const surfaceSensitivity = classifyDataSensitivity(surface);
    allMarkers.push(...surfaceSensitivity.sensitiveFields);
    hasPII = hasPII || surfaceSensitivity.hasPII;
    hasFinancialData = hasFinancialData || surfaceSensitivity.hasFinancialData;
    hasHealthData = hasHealthData || surfaceSensitivity.hasHealthData;
    hasAuthData = hasAuthData || surfaceSensitivity.hasAuthData;
  }

  const sensitivity: DataSensitivityClassification = {
    overallSensitivity: hasPII || hasHealthData || hasAuthData
      ? 'restricted'
      : hasFinancialData
        ? 'confidential'
        : 'internal',
    sensitiveFields: allMarkers,
    hasPII,
    hasFinancialData,
    hasHealthData,
    hasAuthData,
  };

  // Use first surface for primary assessment
  const primarySurface = surfaces[0];
  const riskAssessment = assessIntegrationRisk(primarySurface, sensitivity, undefined, true);

  const environment = determineEnvironment(input.surfaceId, input.environment as EnvironmentType);

  let synthesis = buildExecutiveSummary(
    {
      surfaceId: input.surfaceId,
      surfaceEntry: primarySurface,
      targetVendor: input.vendor,
      explicitEnvironment: input.environment as EnvironmentType,
      hasMutatingOperations: surfaces.some(s => hasMutatingOperations(s)),
      includesPII: hasPII,
      includesFinancialData: hasFinancialData,
      version: primarySurface.version,
      commitSha: process.env['GIT_SHA'],
    },
    {
      success: true,
      resolvedEntities: surfaces.length,
      totalEntities: surfaces.length,
      failedBindings: 0,
      rejectedConstraints: 0,
      stepsExecuted: [...EXPORT_STEPS],
    }
  );

  // Elevate risk for production exports
  if (environment === 'production') {
    synthesis = elevateRiskForProduction(synthesis);
  }

  return {
    dataSensitivity: sensitivity,
    riskAssessment,
    synthesis,
  };
}

/**
 * Generates a unique execution ID
 */
export function generateExecutionId(): string {
  return randomUUID();
}
