/**
 * Trust Boundary Signal Emitter
 *
 * Emits required DecisionEvent signals for trust boundary operations:
 * - integration_readiness_signal
 * - mapping_validation_signal
 * - external_risk_signal
 *
 * @module hardening/signals
 */

import { createHash, randomUUID } from 'crypto';
import type { UUID, CorrelationId } from '../../common/types/identity';
import { AGENT_ID, AGENT_VERSION } from '../agents/erp-integration/contract';

// =============================================================================
// SIGNAL TYPES
// =============================================================================

/**
 * Signal severity levels
 */
export type SignalSeverity = 'info' | 'warning' | 'critical';

/**
 * Base signal interface
 */
export interface TrustBoundarySignal {
  readonly signalId: UUID;
  readonly signalType: string;
  readonly agentId: typeof AGENT_ID;
  readonly agentVersion: typeof AGENT_VERSION;
  readonly correlationId: CorrelationId;
  readonly severity: SignalSeverity;
  readonly timestamp: string;
  readonly inputsHash: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * Integration readiness signal
 * Emitted before any external integration attempt
 */
export interface IntegrationReadinessSignal extends TrustBoundarySignal {
  readonly signalType: 'integration_readiness_signal';
  readonly readiness: {
    readonly targetVendor: string;
    readonly targetDomain: string;
    readonly targetEnvironment: string;
    readonly schemaValidated: boolean;
    readonly credentialsAvailable: boolean;
    readonly governanceApproved: boolean;
    readonly rateWithinLimits: boolean;
    readonly latencyBudgetMs: number;
  };
}

/**
 * Mapping validation signal
 * Emitted after schema mapping validation
 */
export interface MappingValidationSignal extends TrustBoundarySignal {
  readonly signalType: 'mapping_validation_signal';
  readonly validation: {
    readonly sourceSchema: string;
    readonly targetSchema: string;
    readonly fieldsMatched: number;
    readonly fieldsMissing: number;
    readonly fieldsIgnored: number;
    readonly transformationsApplied: string[];
    readonly valid: boolean;
    readonly errors: readonly string[];
  };
}

/**
 * External risk signal
 * Emitted when external integration risk is detected
 */
export interface ExternalRiskSignal extends TrustBoundarySignal {
  readonly signalType: 'external_risk_signal';
  readonly risk: {
    readonly riskType: 'latency' | 'authentication' | 'authorization' | 'data_classification' | 'rate_limit' | 'schema_mismatch' | 'governance';
    readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
    readonly description: string;
    readonly mitigationApplied: boolean;
    readonly mitigationAction?: string;
    readonly blocksExecution: boolean;
  };
}

export type Signal = IntegrationReadinessSignal | MappingValidationSignal | ExternalRiskSignal;

// =============================================================================
// SIGNAL BUILDER
// =============================================================================

/**
 * Computes hash of signal inputs for integrity
 */
function computeSignalHash(data: unknown): string {
  const normalized = JSON.stringify(data);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Builds base signal properties
 */
function buildBaseSignal(
  signalType: string,
  correlationId: CorrelationId,
  severity: SignalSeverity,
  inputData: unknown,
  metadata: Record<string, unknown> = {}
): Omit<TrustBoundarySignal, 'signalType'> & { signalType: string } {
  return {
    signalId: randomUUID(),
    signalType,
    agentId: AGENT_ID,
    agentVersion: AGENT_VERSION,
    correlationId,
    severity,
    timestamp: new Date().toISOString(),
    inputsHash: computeSignalHash(inputData),
    metadata: {
      ...metadata,
      environment: process.env['PLATFORM_ENV'] || 'development',
      serviceVersion: process.env['SERVICE_VERSION'] || 'unknown',
    },
  };
}

// =============================================================================
// SIGNAL FACTORY
// =============================================================================

export interface ReadinessCheckInput {
  correlationId: CorrelationId;
  vendor: string;
  domain: string;
  environment: string;
  schemaValidated: boolean;
  credentialsAvailable: boolean;
  governanceApproved: boolean;
  rateWithinLimits: boolean;
  latencyBudgetMs?: number;
}

/**
 * Creates an integration readiness signal
 */
export function createReadinessSignal(input: ReadinessCheckInput): IntegrationReadinessSignal {
  const isReady = input.schemaValidated &&
                  input.credentialsAvailable &&
                  input.governanceApproved &&
                  input.rateWithinLimits;

  const severity: SignalSeverity = isReady ? 'info' :
    (input.governanceApproved === false || input.credentialsAvailable === false) ? 'critical' : 'warning';

  const base = buildBaseSignal(
    'integration_readiness_signal',
    input.correlationId,
    severity,
    input
  );

  return {
    ...base,
    signalType: 'integration_readiness_signal',
    readiness: {
      targetVendor: input.vendor,
      targetDomain: input.domain,
      targetEnvironment: input.environment,
      schemaValidated: input.schemaValidated,
      credentialsAvailable: input.credentialsAvailable,
      governanceApproved: input.governanceApproved,
      rateWithinLimits: input.rateWithinLimits,
      latencyBudgetMs: input.latencyBudgetMs ?? 3000,
    },
  };
}

export interface MappingValidationInput {
  correlationId: CorrelationId;
  sourceSchema: string;
  targetSchema: string;
  fieldsMatched: number;
  fieldsMissing: number;
  fieldsIgnored: number;
  transformationsApplied: string[];
  valid: boolean;
  errors: readonly string[];
}

/**
 * Creates a mapping validation signal
 */
export function createMappingValidationSignal(input: MappingValidationInput): MappingValidationSignal {
  const severity: SignalSeverity = input.valid ? 'info' :
    input.fieldsMissing > 0 ? 'warning' : 'critical';

  const base = buildBaseSignal(
    'mapping_validation_signal',
    input.correlationId,
    severity,
    input
  );

  return {
    ...base,
    signalType: 'mapping_validation_signal',
    validation: {
      sourceSchema: input.sourceSchema,
      targetSchema: input.targetSchema,
      fieldsMatched: input.fieldsMatched,
      fieldsMissing: input.fieldsMissing,
      fieldsIgnored: input.fieldsIgnored,
      transformationsApplied: input.transformationsApplied,
      valid: input.valid,
      errors: input.errors,
    },
  };
}

export interface ExternalRiskInput {
  correlationId: CorrelationId;
  riskType: ExternalRiskSignal['risk']['riskType'];
  riskLevel: ExternalRiskSignal['risk']['riskLevel'];
  description: string;
  mitigationApplied: boolean;
  mitigationAction?: string;
  blocksExecution: boolean;
}

/**
 * Creates an external risk signal
 */
export function createExternalRiskSignal(input: ExternalRiskInput): ExternalRiskSignal {
  const severity: SignalSeverity =
    input.riskLevel === 'critical' ? 'critical' :
    input.riskLevel === 'high' ? 'warning' : 'info';

  const base = buildBaseSignal(
    'external_risk_signal',
    input.correlationId,
    severity,
    input
  );

  return {
    ...base,
    signalType: 'external_risk_signal',
    risk: {
      riskType: input.riskType,
      riskLevel: input.riskLevel,
      description: input.description,
      mitigationApplied: input.mitigationApplied,
      mitigationAction: input.mitigationAction,
      blocksExecution: input.blocksExecution,
    },
  };
}

// =============================================================================
// SIGNAL EMITTER
// =============================================================================

/**
 * Emitter configuration
 */
export interface SignalEmitterConfig {
  readonly ruvectorEndpoint?: string;
  readonly enableConsoleLog?: boolean;
}

const DEFAULT_EMITTER_CONFIG: SignalEmitterConfig = {
  ruvectorEndpoint: process.env['RUVECTOR_ENDPOINT'] || 'http://ruvector-service:8080',
  enableConsoleLog: process.env['NODE_ENV'] !== 'production',
};

/**
 * Emits a signal to ruvector-service
 */
export async function emitSignal(signal: Signal, config: SignalEmitterConfig = DEFAULT_EMITTER_CONFIG): Promise<void> {
  // Log signal if enabled
  if (config.enableConsoleLog) {
    console.log(JSON.stringify({
      level: signal.severity === 'critical' ? 'error' : signal.severity === 'warning' ? 'warn' : 'info',
      message: `Signal emitted: ${signal.signalType}`,
      signal_id: signal.signalId,
      signal_type: signal.signalType,
      correlation_id: signal.correlationId,
      severity: signal.severity,
      timestamp: signal.timestamp,
    }));
  }

  // In simulation mode, skip persistence
  if (process.env['ERP_SURFACE_MODE'] === 'simulation') {
    if (config.enableConsoleLog) {
      console.log(JSON.stringify({
        level: 'debug',
        message: `Signal would be persisted (simulation mode): ${signal.signalType}`,
      }));
    }
    return;
  }

  // Persist to ruvector-service
  try {
    const response = await fetch(`${config.ruvectorEndpoint}/v1/signals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'trust_boundary_signal',
        signal_type: signal.signalType,
        agent_id: signal.agentId,
        agent_version: signal.agentVersion,
        signal_id: signal.signalId,
        correlation_id: signal.correlationId,
        severity: signal.severity,
        inputs_hash: signal.inputsHash,
        payload: signal,
        timestamp: signal.timestamp,
      }),
    });

    if (!response.ok) {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Failed to emit signal to ruvector-service',
        status: response.status,
        signal_type: signal.signalType,
      }));
    }
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Error emitting signal to ruvector-service',
      error: error instanceof Error ? error.message : 'Unknown error',
      signal_type: signal.signalType,
    }));
  }
}
