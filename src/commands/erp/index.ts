/**
 * ERP Commands Module
 *
 * CLI subcommands for ERP surface operations.
 *
 * Commands WITH Synthesis (generate Decision Packet):
 * - erp surface - Extracts and exposes ERP data structures
 * - erp map - Creates binding relationships between systems
 * - erp export - Generates integration artifacts
 *
 * Commands WITHOUT Synthesis (read-only, no Decision Packet):
 * - erp list - Read-only enumeration
 * - erp inspect - Read-only detail retrieval
 *
 * @module commands/erp
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Data Sensitivity
  DataSensitivity,
  SensitiveFieldMarker,
  DataSensitivityClassification,

  // Mapping
  MappingDirection,
  MappingValidationResult,
  TypeIncompatibility,

  // Risk Assessment
  IntegrationRiskAssessment,

  // Decision Packet
  DecisionPacket,

  // Command Inputs
  ErpCommandInput,
  ErpSurfaceInput,
  ErpMapInput,
  ErpExportInput,
  ErpListInput,
  ErpInspectInput,

  // Command Results (with synthesis)
  ErpCommandResultWithSynthesis,
  ErpSurfaceResult,
  ErpMapResult,
  ErpExportResult,

  // Command Results (without synthesis)
  ErpCommandResultWithoutSynthesis,
  ErpListResult,
  ErpInspectResult,

  // Errors
  ErpCommandError,
} from './types';

export { ERP_ERROR_CODES } from './types';

// =============================================================================
// COMMAND EXPORTS - WITH SYNTHESIS
// =============================================================================

export {
  executeErpSurface,
  validateSurfaceInput,
} from './surface';

export {
  executeErpMap,
  validateMapInput,
} from './map';

export {
  executeErpExport,
  validateExportInput,
} from './export';

// =============================================================================
// COMMAND EXPORTS - WITHOUT SYNTHESIS (READ-ONLY)
// =============================================================================

export {
  executeErpList,
  formatListResult,
  validateListInput,
} from './list';

export {
  executeErpInspect,
  formatInspectResult,
  validateInspectInput,
} from './inspect';

// =============================================================================
// SYNTHESIS HELPERS
// =============================================================================

export {
  // Field detection
  detectSensitiveFields,
  classifyDataSensitivity,

  // Mapping validation
  validateMapping,

  // Risk assessment
  assessIntegrationRisk,

  // Decision Packet builders
  buildSurfaceDecisionPacket,
  buildMapDecisionPacket,
  buildExportDecisionPacket,

  // Steps constants
  SURFACE_STEPS,
  MAP_STEPS,
  EXPORT_STEPS,

  // Utilities
  generateExecutionId,
} from './synthesis-helpers';

// =============================================================================
// COMMAND ROUTER
// =============================================================================

/**
 * ERP subcommand type
 */
export type ErpSubcommand = 'surface' | 'map' | 'export' | 'list' | 'inspect';

/**
 * Commands that generate synthesis (Decision Packet)
 */
export const COMMANDS_WITH_SYNTHESIS: readonly ErpSubcommand[] = ['surface', 'map', 'export'];

/**
 * Commands that do NOT generate synthesis (read-only)
 */
export const COMMANDS_WITHOUT_SYNTHESIS: readonly ErpSubcommand[] = ['list', 'inspect'];

/**
 * Checks if a command generates synthesis
 */
export function commandHasSynthesis(command: ErpSubcommand): boolean {
  return COMMANDS_WITH_SYNTHESIS.includes(command);
}

/**
 * Command descriptions for help text
 */
export const COMMAND_DESCRIPTIONS: Record<ErpSubcommand, string> = {
  surface: 'Extract and expose ERP data structures with sensitivity classification',
  map: 'Create binding relationships between ERP systems with bidirectional validation',
  export: 'Generate integration artifacts (JSON, YAML, OpenAPI, GraphQL, Protobuf)',
  list: 'List available ERP surfaces (read-only, no synthesis)',
  inspect: 'Inspect ERP surface details (read-only, no synthesis)',
};
