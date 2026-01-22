/**
 * ERP Integration Agent Platform Registration
 *
 * Registration metadata for the ERP Integration Agent within the Agentics platform.
 *
 * This file defines:
 * - Agent registration in agentics-contracts
 * - Agent endpoint registration in erp-surface service
 * - CLI command specifications
 * - Platform composition interfaces
 *
 * @module agents/erp-integration/registration
 */

import {
  AGENT_ID,
  AGENT_VERSION,
  DECISION_TYPE,
  FAILURE_MODES,
  INPUT_VALIDATION_RULES,
} from './contract';

// =============================================================================
// PLATFORM REGISTRATION
// =============================================================================

/**
 * Agent registration metadata for agentics-contracts
 */
export const AGENT_REGISTRATION = {
  /** Agent identifier */
  agentId: AGENT_ID,

  /** Agent version */
  version: AGENT_VERSION,

  /** Agent classification */
  classification: 'ENTERPRISE_SYSTEM_INTEGRATION' as const,

  /** Decision type */
  decisionType: DECISION_TYPE,

  /** Agent description */
  description: 'Translate approved Agentics platform artifacts into enterprise ERP-compatible representations and synchronize them with external systems of record.',

  /** Agent scope */
  scope: [
    'Normalize Agentics outputs into ERP schemas',
    'Push approved records to ERP systems',
    'Pull limited reference metadata when requested',
    'Emit integration outcome DecisionEvents',
  ] as const,

  /** Non-responsibilities */
  nonResponsibilities: [
    'Execute inference',
    'Generate documentation',
    'Synthesize decisions',
    'Perform analytics or forecasting',
    'Optimize configurations',
    'Mutate Agentics platform state',
    'Act autonomously without explicit invocation',
    'Store canonical records',
    'Make business decisions',
    'Override governance outcomes',
    'Retry workflows autonomously',
    'Execute orchestration logic',
    'Apply optimizations or transformations beyond mapping',
  ] as const,

  /** Input sources */
  inputSources: [
    'agentics-dev-platform',
    'enterprise-roi-engine',
    'diligence',
    'governance',
  ] as const,

  /** Output consumers */
  outputConsumers: [
    'External ERP systems (SAP, Oracle, Workday, NetSuite, Dynamics, Salesforce, ServiceNow)',
    'Audit & compliance workflows',
    'Executive reporting pipelines',
  ] as const,

  /** Deployment model */
  deploymentModel: {
    type: 'cloud-run' as const,
    stateless: true,
    deterministic: true,
    memory: '512Mi',
    cpu: '1',
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    timeoutSeconds: 300,
  },

  /** Input validation rules */
  inputValidation: INPUT_VALIDATION_RULES,

  /** Failure modes */
  failureModes: FAILURE_MODES,

  /** Registration timestamp */
  registeredAt: new Date().toISOString(),
} as const;

// =============================================================================
// SERVICE ENDPOINT REGISTRATION
// =============================================================================

/**
 * Service endpoint registration for erp-surface
 */
export const ENDPOINT_REGISTRATION = {
  /** Base path */
  basePath: '/v1/agents/erp-integration',

  /** Available endpoints */
  endpoints: [
    {
      method: 'POST' as const,
      path: '/execute',
      description: 'Execute integration operation',
      requestSchema: 'ErpIntegrationInput',
      responseSchema: 'ErpIntegrationOutput',
    },
    {
      method: 'POST' as const,
      path: '/validate',
      description: 'Validate integration input',
      requestSchema: 'ErpIntegrationInput',
      responseSchema: 'ValidationResult',
    },
    {
      method: 'GET' as const,
      path: '/health',
      description: 'Agent health check',
      responseSchema: 'HealthResponse',
    },
    {
      method: 'GET' as const,
      path: '/info',
      description: 'Agent information',
      responseSchema: 'AgentInfo',
    },
  ],

  /** Health check configuration */
  healthCheck: {
    path: '/v1/agents/erp-integration/health',
    interval: '30s',
    timeout: '5s',
    healthyThreshold: 1,
    unhealthyThreshold: 3,
  },
} as const;

// =============================================================================
// CLI COMMAND REGISTRATION
// =============================================================================

/**
 * CLI command registration
 */
export const CLI_REGISTRATION = {
  /** Command group */
  group: 'erp',

  /** Subcommand */
  subcommand: 'integration',

  /** Description */
  description: 'ERP Integration Agent - Enterprise system integration operations',

  /** Operations */
  operations: ['push', 'pull', 'sync', 'validate', 'inspect'] as const,

  /** Required flags */
  requiredFlags: {
    target: {
      flag: '--target',
      alias: '-t',
      description: 'ERP vendor',
      type: 'string' as const,
      choices: ['sap', 'oracle', 'salesforce', 'workday', 'dynamics', 'netsuite', 'servicenow'],
    },
    domain: {
      flag: '--domain',
      alias: '-d',
      description: 'Surface domain',
      type: 'string' as const,
      choices: ['finance', 'procurement', 'hcm', 'supply-chain', 'customer', 'service'],
    },
    entity: {
      flag: '--entity',
      alias: '-e',
      description: 'Target entity type',
      type: 'string' as const,
    },
  },

  /** Optional flags */
  optionalFlags: {
    environment: {
      flag: '--environment',
      alias: '--env',
      description: 'Target environment',
      type: 'string' as const,
      choices: ['production', 'staging', 'development', 'sandbox'],
      default: 'sandbox',
    },
    instance: {
      flag: '--instance',
      alias: '-i',
      description: 'ERP instance ID',
      type: 'string' as const,
    },
    payload: {
      flag: '--payload',
      alias: '-p',
      description: 'Payload data (file path or inline JSON)',
      type: 'string' as const,
    },
    query: {
      flag: '--query',
      alias: '-q',
      description: 'Query parameters (JSON string)',
      type: 'string' as const,
    },
    artifactId: {
      flag: '--artifact-id',
      description: 'Source artifact ID',
      type: 'string' as const,
    },
    artifactSource: {
      flag: '--artifact-source',
      description: 'Source system',
      type: 'string' as const,
      choices: ['agentics-dev-platform', 'enterprise-roi-engine', 'diligence', 'governance'],
    },
    governanceRef: {
      flag: '--governance-ref',
      description: 'Governance approval reference',
      type: 'string' as const,
    },
    dryRun: {
      flag: '--dry-run',
      description: 'Validate without transmitting',
      type: 'boolean' as const,
      default: false,
    },
    timeout: {
      flag: '--timeout',
      description: 'Timeout in milliseconds',
      type: 'number' as const,
      default: 30000,
    },
    output: {
      flag: '--output',
      alias: '-o',
      description: 'Output format',
      type: 'string' as const,
      choices: ['json', 'yaml', 'table'],
      default: 'json',
    },
    verbose: {
      flag: '--verbose',
      alias: '-v',
      description: 'Enable verbose logging',
      type: 'boolean' as const,
      default: false,
    },
  },
} as const;

// =============================================================================
// COMPOSITION INTERFACES
// =============================================================================

/**
 * Composition interfaces for platform integration
 */
export const COMPOSITION_INTERFACES = {
  /** LLM-Observatory telemetry */
  observatory: {
    telemetryEndpoint: '/v1/telemetry',
    eventTypes: ['integration_execution'],
    metricsExported: [
      'integration_duration_ms',
      'records_processed',
      'records_succeeded',
      'records_failed',
      'confidence_score',
    ],
  },

  /** LLM-Shield security */
  shield: {
    authorizationBoundary: 'erp-integration-agent',
    requiredScopes: [
      'erp:read',
      'erp:write',
      'artifact:read',
    ],
    sensitiveDataHandling: true,
  },

  /** ruvector-service persistence */
  ruvector: {
    eventType: 'decision_event',
    decisionType: DECISION_TYPE,
    appendOnly: true,
  },

  /** Platform Core binding */
  platformCore: {
    bindingLayer: 'erp-surface',
    lifecycleEvents: [
      'INTEGRATION_STARTED',
      'INTEGRATION_COMPLETED',
      'INTEGRATION_FAILED',
    ],
  },
} as const;

// =============================================================================
// VERIFICATION
// =============================================================================

/**
 * Verification checklist for agent deployment
 */
export const VERIFICATION_CHECKLIST = [
  {
    id: 'contract-schema',
    description: 'Input/output schemas match agentics-contracts',
    verification: 'schema-validation',
  },
  {
    id: 'decision-event',
    description: 'DecisionEvents persist correctly to ruvector-service',
    verification: 'integration-test',
  },
  {
    id: 'telemetry',
    description: 'Telemetry visible in LLM-Observatory',
    verification: 'observability-check',
  },
  {
    id: 'cli-commands',
    description: 'CLI commands execute correctly',
    verification: 'smoke-test',
  },
  {
    id: 'endpoint-health',
    description: 'Health endpoint returns 200',
    verification: 'health-check',
  },
  {
    id: 'dry-run',
    description: 'Dry run mode validates without transmission',
    verification: 'smoke-test',
  },
  {
    id: 'error-handling',
    description: 'Errors are properly typed and logged',
    verification: 'error-test',
  },
  {
    id: 'confidence',
    description: 'Confidence scores are calculated correctly',
    verification: 'unit-test',
  },
] as const;

/**
 * Smoke test commands
 */
export const SMOKE_TEST_COMMANDS = [
  // Health check
  'curl -s http://localhost:8080/v1/agents/erp-integration/health',

  // Info endpoint
  'curl -s http://localhost:8080/v1/agents/erp-integration/info',

  // Dry run push
  `curl -s -X POST http://localhost:8080/v1/agents/erp-integration/execute \\
    -H "Content-Type: application/json" \\
    -d '{"requestId":"test-001","correlationId":"smoke-test","operation":"push","target":{"vendor":"sap","domain":"finance","entityType":"JournalEntry","environment":"sandbox"},"payload":{"amount":100},"dryRun":true}'`,

  // Validate only
  `curl -s -X POST http://localhost:8080/v1/agents/erp-integration/validate \\
    -H "Content-Type: application/json" \\
    -d '{"requestId":"test-002","correlationId":"smoke-test","operation":"validate","target":{"vendor":"oracle","domain":"hcm","entityType":"Employee","environment":"sandbox"},"payload":{"employeeId":"E001"}}'`,

  // Inspect endpoint
  `curl -s -X POST http://localhost:8080/v1/agents/erp-integration/execute \\
    -H "Content-Type: application/json" \\
    -d '{"requestId":"test-003","correlationId":"smoke-test","operation":"inspect","target":{"vendor":"workday","domain":"hcm","entityType":"Position","environment":"sandbox"}}'`,

  // CLI commands
  'npx erp integration inspect --target sap --domain finance --entity JournalEntry --output table',
  'npx erp integration validate --target oracle --domain hcm --entity Employee --payload \'{"id":"E001"}\' --dry-run',
] as const;
