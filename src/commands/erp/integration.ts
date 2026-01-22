/**
 * ERP Integration CLI Command
 *
 * CLI handler for the ERP Integration Agent.
 * Provides command-line interface for integration operations.
 *
 * Usage:
 *   erp integration push --target sap --domain finance --entity JournalEntry --payload ./data.json
 *   erp integration pull --target oracle --domain hcm --entity Employee --query '{"employeeId": "E001"}'
 *   erp integration sync --target workday --domain hcm --entity Position
 *   erp integration validate --target netsuite --domain finance --entity Invoice --payload ./invoice.json
 *   erp integration inspect --target dynamics --domain customer
 *
 * @module commands/erp/integration
 */

import { randomUUID } from 'crypto';
import type { VendorCoverage, SurfaceDomain } from '../../registry';
import {
  execute,
  dryRun,
  validate,
  AGENT_ID,
  AGENT_VERSION,
  type ErpIntegrationInput,
  type IntegrationOperationType,
  type ExecutionResult,
} from '../../agents/erp-integration';
import type { ErpCommandError } from './types';
import { ERP_ERROR_CODES } from './types';

// =============================================================================
// CLI INPUT TYPES
// =============================================================================

/**
 * CLI input for integration command
 */
export interface ErpIntegrationCliInput {
  /** Operation subcommand */
  readonly operation: IntegrationOperationType;
  /** Target ERP vendor */
  readonly target: keyof VendorCoverage;
  /** Target domain */
  readonly domain: SurfaceDomain;
  /** Target entity type */
  readonly entity: string;
  /** Target environment */
  readonly environment?: 'production' | 'staging' | 'development' | 'sandbox';
  /** Instance ID (optional) */
  readonly instanceId?: string;
  /** Payload file path or inline JSON (for push/validate) */
  readonly payload?: string;
  /** Query JSON (for pull) */
  readonly query?: string;
  /** Artifact ID (optional) */
  readonly artifactId?: string;
  /** Artifact source (optional) */
  readonly artifactSource?: 'agentics-dev-platform' | 'enterprise-roi-engine' | 'diligence' | 'governance';
  /** Governance approval reference */
  readonly governanceApprovalRef?: string;
  /** Dry run mode */
  readonly dryRun?: boolean;
  /** Timeout in milliseconds */
  readonly timeout?: number;
  /** Output format */
  readonly output?: 'json' | 'yaml' | 'table';
  /** Verbose output */
  readonly verbose?: boolean;
}

/**
 * CLI result for integration command
 */
export interface ErpIntegrationCliResult {
  /** Whether command succeeded */
  readonly success: boolean;
  /** Execution result */
  readonly result?: ExecutionResult;
  /** Error (if failed) */
  readonly error?: ErpCommandError;
  /** Formatted output */
  readonly formatted: string;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Valid vendors
 */
const VALID_VENDORS: readonly (keyof VendorCoverage)[] = [
  'sap', 'oracle', 'salesforce', 'workday', 'dynamics', 'netsuite', 'servicenow'
];

/**
 * Valid domains
 */
const VALID_DOMAINS: readonly SurfaceDomain[] = [
  'finance', 'procurement', 'hcm', 'supply-chain', 'customer', 'service'
];

/**
 * Valid operations
 */
const VALID_OPERATIONS: readonly IntegrationOperationType[] = [
  'push', 'pull', 'sync', 'validate', 'inspect'
];

/**
 * Validates CLI input
 */
export function validateCliInput(input: unknown): input is ErpIntegrationCliInput {
  if (typeof input !== 'object' || input === null) {
    return false;
  }

  const obj = input as Record<string, unknown>;

  // Required fields
  if (!obj.operation || !VALID_OPERATIONS.includes(obj.operation as IntegrationOperationType)) {
    return false;
  }
  if (!obj.target || !VALID_VENDORS.includes(obj.target as keyof VendorCoverage)) {
    return false;
  }
  if (!obj.domain || !VALID_DOMAINS.includes(obj.domain as SurfaceDomain)) {
    return false;
  }
  if (!obj.entity || typeof obj.entity !== 'string') {
    return false;
  }

  return true;
}

// =============================================================================
// PAYLOAD PARSING
// =============================================================================

/**
 * Parses payload from file path or inline JSON
 */
async function parsePayload(payloadInput: string): Promise<Record<string, unknown>> {
  // Try to parse as inline JSON first
  try {
    return JSON.parse(payloadInput);
  } catch {
    // Not inline JSON, try to read as file
    // In simulation mode, return a mock payload
    if (process.env['ERP_SURFACE_MODE'] === 'simulation') {
      return {
        id: `mock-${Date.now()}`,
        source: 'cli-input',
        data: payloadInput,
      };
    }

    // In execution mode, would read from file system
    throw new Error(`Cannot parse payload: ${payloadInput}`);
  }
}

/**
 * Parses query from JSON string
 */
function parseQuery(queryInput: string): Record<string, unknown> {
  try {
    return JSON.parse(queryInput);
  } catch {
    throw new Error(`Invalid query JSON: ${queryInput}`);
  }
}

// =============================================================================
// EXECUTION
// =============================================================================

/**
 * Executes the ERP integration CLI command
 *
 * @param cliInput CLI input
 * @returns CLI result
 */
export async function executeErpIntegration(
  cliInput: ErpIntegrationCliInput
): Promise<ErpIntegrationCliResult> {
  // Validate CLI input
  if (!validateCliInput(cliInput)) {
    const error: ErpCommandError = {
      code: ERP_ERROR_CODES.VALIDATION_FAILED,
      message: 'Invalid CLI input',
      details: { input: cliInput },
    };
    return {
      success: false,
      error,
      formatted: formatError(error),
    };
  }

  // Build agent input
  let agentInput: ErpIntegrationInput;
  try {
    agentInput = await buildAgentInput(cliInput);
  } catch (error) {
    const commandError: ErpCommandError = {
      code: ERP_ERROR_CODES.VALIDATION_FAILED,
      message: error instanceof Error ? error.message : 'Failed to build agent input',
    };
    return {
      success: false,
      error: commandError,
      formatted: formatError(commandError),
    };
  }

  // Validate agent input
  const validation = validate(agentInput);
  if (!validation.valid) {
    const error: ErpCommandError = {
      code: ERP_ERROR_CODES.VALIDATION_FAILED,
      message: 'Agent input validation failed',
      details: { errors: validation.errors },
    };
    return {
      success: false,
      error,
      formatted: formatError(error),
    };
  }

  // Execute
  const result = cliInput.dryRun
    ? await dryRun(agentInput)
    : await execute(agentInput);

  return {
    success: result.success,
    result,
    formatted: formatResult(result, cliInput.output ?? 'json'),
  };
}

/**
 * Builds agent input from CLI input
 */
async function buildAgentInput(cliInput: ErpIntegrationCliInput): Promise<ErpIntegrationInput> {
  const requestId = randomUUID();
  const correlationId = `cli-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const input: ErpIntegrationInput = {
    requestId,
    correlationId,
    operation: cliInput.operation,
    target: {
      vendor: cliInput.target,
      domain: cliInput.domain,
      entityType: cliInput.entity,
      environment: cliInput.environment ?? 'sandbox',
      instanceId: cliInput.instanceId,
    },
    dryRun: cliInput.dryRun,
    timeoutMs: cliInput.timeout,
  };

  // Build the full input with optional fields
  const fullInput: ErpIntegrationInput = {
    ...input,
    ...(cliInput.artifactId && cliInput.artifactSource ? {
      artifact: {
        source: cliInput.artifactSource,
        artifactId: cliInput.artifactId,
        governanceApprovalRef: cliInput.governanceApprovalRef,
      },
    } : {}),
    ...(cliInput.payload ? {
      payload: await parsePayload(cliInput.payload),
    } : {}),
    ...(cliInput.query ? {
      query: parseQuery(cliInput.query),
    } : {}),
  };

  return fullInput;
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Formats an error for CLI output
 */
function formatError(error: ErpCommandError): string {
  return JSON.stringify({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  }, null, 2);
}

/**
 * Formats a result for CLI output
 */
function formatResult(result: ExecutionResult, format: 'json' | 'yaml' | 'table'): string {
  const output = {
    success: result.success,
    agent: {
      id: AGENT_ID,
      version: AGENT_VERSION,
    },
    execution: {
      id: result.output.executionId,
      correlationId: result.output.correlationId,
      status: result.output.status,
      confidence: result.output.confidence,
      duration: `${result.output.durationMs}ms`,
    },
    outcome: {
      recordsProcessed: result.output.outcome.recordsProcessed,
      recordsSucceeded: result.output.outcome.recordsSucceeded,
      recordsFailed: result.output.outcome.recordsFailed,
    },
    constraints: result.output.constraintsApplied,
    timestamp: result.output.timestamp,
  };

  switch (format) {
    case 'yaml':
      return formatAsYaml(output);
    case 'table':
      return formatAsTable(output);
    case 'json':
    default:
      return JSON.stringify(output, null, 2);
  }
}

/**
 * Simple YAML-like formatting
 */
function formatAsYaml(obj: Record<string, unknown>, indent = 0): string {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      lines.push(formatAsYaml(value as Record<string, unknown>, indent + 1));
    } else if (Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      for (const item of value) {
        lines.push(`${prefix}  - ${item}`);
      }
    } else {
      lines.push(`${prefix}${key}: ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Table formatting for key metrics
 */
function formatAsTable(obj: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push('┌────────────────────────┬────────────────────────────────────────┐');
  lines.push('│ Field                  │ Value                                  │');
  lines.push('├────────────────────────┼────────────────────────────────────────┤');

  const execution = obj.execution as Record<string, unknown>;
  const outcome = obj.outcome as Record<string, unknown>;

  const rows: [string, unknown][] = [
    ['Status', obj.success ? '✓ SUCCESS' : '✗ FAILED'],
    ['Execution ID', execution.id],
    ['Integration Status', execution.status],
    ['Confidence', `${((execution.confidence as number) * 100).toFixed(1)}%`],
    ['Duration', execution.duration],
    ['Records Processed', outcome.recordsProcessed],
    ['Records Succeeded', outcome.recordsSucceeded],
    ['Records Failed', outcome.recordsFailed],
    ['Timestamp', obj.timestamp],
  ];

  for (const [field, value] of rows) {
    const fieldStr = field.padEnd(22);
    const valueStr = String(value).substring(0, 38).padEnd(38);
    lines.push(`│ ${fieldStr} │ ${valueStr} │`);
  }

  lines.push('└────────────────────────┴────────────────────────────────────────┘');
  return lines.join('\n');
}

// =============================================================================
// CLI HELP
// =============================================================================

/**
 * Returns help text for the integration command
 */
export function getIntegrationHelp(): string {
  return `
ERP Integration Agent CLI

USAGE:
  erp integration <operation> [options]

OPERATIONS:
  push      Push Agentics artifacts to ERP system
  pull      Pull reference metadata from ERP (read-only)
  sync      Bidirectional synchronization check
  validate  Validate mapping without transmission
  inspect   Inspect ERP endpoint status

REQUIRED OPTIONS:
  --target <vendor>   ERP vendor (sap, oracle, salesforce, workday, dynamics, netsuite, servicenow)
  --domain <domain>   Surface domain (finance, procurement, hcm, supply-chain, customer, service)
  --entity <type>     Target entity type (JournalEntry, Employee, PurchaseOrder, etc.)

OPTIONAL OPTIONS:
  --environment <env> Target environment (production, staging, development, sandbox)
  --instance <id>     ERP instance identifier
  --payload <json>    Payload data (file path or inline JSON)
  --query <json>      Query parameters (JSON string)
  --artifact-id <id>  Source artifact ID
  --artifact-source   Source system (agentics-dev-platform, enterprise-roi-engine, diligence, governance)
  --governance-ref    Governance approval reference
  --dry-run           Validate without transmitting
  --timeout <ms>      Timeout in milliseconds (1000-300000)
  --output <format>   Output format (json, yaml, table)
  --verbose           Enable verbose logging

EXAMPLES:
  # Push journal entry to SAP
  erp integration push --target sap --domain finance --entity JournalEntry \\
    --environment staging --payload '{"amount": 1000, "currency": "USD"}'

  # Pull employee data from Workday
  erp integration pull --target workday --domain hcm --entity Employee \\
    --query '{"employeeId": "E001"}'

  # Validate invoice mapping for NetSuite
  erp integration validate --target netsuite --domain finance --entity Invoice \\
    --payload ./invoice.json --dry-run

  # Inspect SAP finance endpoint
  erp integration inspect --target sap --domain finance --entity JournalEntry

AGENT INFO:
  Agent ID:      ${AGENT_ID}
  Agent Version: ${AGENT_VERSION}
  Decision Type: erp_integration
`;
}
