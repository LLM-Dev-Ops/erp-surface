/**
 * DecisionEvent Emitter for ERP Integration Agent
 *
 * Emits DecisionEvents to ruvector-service for persistence.
 * All writes are append-only - no updates or deletes.
 *
 * IMPORTANT: This agent does NOT own persistence.
 * All persistence is handled via ruvector-service.
 *
 * @module agents/erp-integration/emitter
 */

import { randomUUID } from 'crypto';
import type { UUID, CorrelationId } from '../../../common/types/identity';
import type {
  ErpIntegrationInput,
  ErpIntegrationOutput,
  ErpIntegrationDecisionEvent,
} from './types';
import { buildDecisionEvent, AGENT_ID, AGENT_VERSION, DECISION_TYPE } from './types';
import { maskForTelemetry } from '../../hardening/data-masking';

// =============================================================================
// EMITTER CONFIGURATION
// =============================================================================

/**
 * Emitter configuration options
 */
export interface EmitterConfig {
  /** ruvector-service endpoint (default: from environment) */
  readonly ruvectorEndpoint?: string;
  /** Enable console logging of events */
  readonly enableConsoleLog?: boolean;
  /** Enable telemetry emission */
  readonly enableTelemetry?: boolean;
  /** Telemetry endpoint (for LLM-Observatory) */
  readonly telemetryEndpoint?: string;
}

/**
 * Default emitter configuration
 */
const DEFAULT_CONFIG: EmitterConfig = {
  ruvectorEndpoint: process.env['RUVECTOR_ENDPOINT'] || 'http://ruvector-service:8080',
  enableConsoleLog: process.env['NODE_ENV'] !== 'production',
  enableTelemetry: true,
  telemetryEndpoint: process.env['TELEMETRY_ENDPOINT'] || 'http://llm-observatory:8080',
};

// =============================================================================
// TELEMETRY TYPES
// =============================================================================

/**
 * Telemetry event for LLM-Observatory
 */
export interface TelemetryEvent {
  /** Event type */
  readonly type: 'integration_execution';
  /** Agent identifier */
  readonly agentId: typeof AGENT_ID;
  /** Agent version */
  readonly agentVersion: typeof AGENT_VERSION;
  /** Correlation ID */
  readonly correlationId: CorrelationId;
  /** Execution ID */
  readonly executionId: UUID;
  /** Operation performed */
  readonly operation: string;
  /** Target vendor */
  readonly vendor: string;
  /** Target domain */
  readonly domain: string;
  /** Target entity */
  readonly entityType: string;
  /** Environment */
  readonly environment: string;
  /** Status */
  readonly status: string;
  /** Confidence score */
  readonly confidence: number;
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** Records processed */
  readonly recordsProcessed: number;
  /** Records succeeded */
  readonly recordsSucceeded: number;
  /** Records failed */
  readonly recordsFailed: number;
  /** Timestamp */
  readonly timestamp: string;
}

// =============================================================================
// EMITTER CLASS
// =============================================================================

/**
 * DecisionEvent Emitter
 *
 * Responsible for:
 * - Emitting DecisionEvents to ruvector-service
 * - Emitting telemetry to LLM-Observatory
 * - Logging for observability
 */
export class DecisionEventEmitter {
  private readonly config: EmitterConfig;

  constructor(config: Partial<EmitterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Emits a DecisionEvent for an integration execution
   *
   * @param input Integration input
   * @param output Integration output
   * @returns The emitted DecisionEvent
   */
  async emit(
    input: ErpIntegrationInput,
    output: ErpIntegrationOutput
  ): Promise<ErpIntegrationDecisionEvent> {
    const eventId = randomUUID();
    const event = buildDecisionEvent(input, output, eventId);

    // Log event if enabled
    if (this.config.enableConsoleLog) {
      this.logEvent(event);
    }

    // Persist to ruvector-service
    await this.persistToRuvector(event);

    // Emit telemetry if enabled
    if (this.config.enableTelemetry) {
      await this.emitTelemetry(input, output);
    }

    return event;
  }

  /**
   * Logs the event to console
   */
  private logEvent(event: ErpIntegrationDecisionEvent): void {
    console.log(JSON.stringify({
      level: 'info',
      message: 'DecisionEvent emitted',
      agent_id: event.agent_id,
      decision_type: event.decision_type,
      event_id: event.eventId,
      execution_ref: event.execution_ref,
      confidence: event.confidence,
      timestamp: event.timestamp,
    }));
  }

  /**
   * Persists the DecisionEvent to ruvector-service
   *
   * NOTE: In simulation mode, this is a no-op.
   * In execution mode, this would make an HTTP call to ruvector-service.
   */
  private async persistToRuvector(event: ErpIntegrationDecisionEvent): Promise<void> {
    // Build the persistence payload
    const payload = {
      type: 'decision_event',
      decision_type: DECISION_TYPE,
      agent_id: AGENT_ID,
      agent_version: AGENT_VERSION,
      event_id: event.eventId,
      execution_ref: event.execution_ref,
      inputs_hash: event.inputs_hash,
      outputs: event.outputs,
      confidence: event.confidence,
      constraints_applied: event.constraints_applied,
      timestamp: event.timestamp,
    };

    // In simulation mode, just log
    if (process.env['ERP_SURFACE_MODE'] === 'simulation') {
      if (this.config.enableConsoleLog) {
        console.log(JSON.stringify({
          level: 'debug',
          message: 'Would persist to ruvector-service (simulation mode)',
          payload_size: JSON.stringify(payload).length,
        }));
      }
      return;
    }

    // In execution mode, persist via HTTP — failures MUST propagate
    const response = await fetch(`${this.config.ruvectorEndpoint}/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to persist DecisionEvent to ruvector-service: ` +
        `status=${response.status} execution_id=${event.outputs.executionId} event_id=${event.eventId}`
      );
    }
  }

  /**
   * Emits telemetry to LLM-Observatory
   * NOTE: All payload data is masked before transmission
   */
  private async emitTelemetry(
    input: ErpIntegrationInput,
    output: ErpIntegrationOutput
  ): Promise<void> {
    // Build base telemetry without sensitive data
    const telemetry: TelemetryEvent = {
      type: 'integration_execution',
      agentId: AGENT_ID,
      agentVersion: AGENT_VERSION,
      correlationId: input.correlationId,
      executionId: output.executionId,
      operation: input.operation,
      vendor: input.target.vendor,
      domain: input.target.domain,
      entityType: input.target.entityType,
      environment: input.target.environment,
      status: output.status,
      confidence: output.confidence,
      durationMs: output.durationMs,
      recordsProcessed: output.outcome.recordsProcessed,
      recordsSucceeded: output.outcome.recordsSucceeded,
      recordsFailed: output.outcome.recordsFailed,
      timestamp: output.timestamp,
    };

    // Mask any sensitive data that might be in the telemetry
    const maskedTelemetry = maskForTelemetry(telemetry as unknown as Record<string, unknown>);

    // In simulation mode, just log
    if (process.env['ERP_SURFACE_MODE'] === 'simulation') {
      if (this.config.enableConsoleLog) {
        console.log(JSON.stringify({
          level: 'debug',
          message: 'Telemetry (simulation mode)',
          telemetry: maskedTelemetry,
        }));
      }
      return;
    }

    // In execution mode, would emit to observatory
    try {
      const response = await fetch(`${this.config.telemetryEndpoint}/v1/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(maskedTelemetry),
      });

      if (!response.ok) {
        console.warn(JSON.stringify({
          level: 'warn',
          message: 'Failed to emit telemetry',
          execution_id: output.executionId,
          correlation_id: input.correlationId,
          status: response.status,
        }));
      }
    } catch (error) {
      // Telemetry failures are non-blocking but must include execution context
      console.warn(JSON.stringify({
        level: 'warn',
        message: 'Error emitting telemetry',
        execution_id: output.executionId,
        correlation_id: input.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }
}

/**
 * Singleton emitter instance
 */
let emitterInstance: DecisionEventEmitter | null = null;

/**
 * Gets the singleton emitter instance
 */
export function getEmitter(config?: Partial<EmitterConfig>): DecisionEventEmitter {
  if (!emitterInstance) {
    emitterInstance = new DecisionEventEmitter(config);
  }
  return emitterInstance;
}

/**
 * Emits a DecisionEvent using the singleton emitter
 */
export async function emitDecisionEvent(
  input: ErpIntegrationInput,
  output: ErpIntegrationOutput
): Promise<ErpIntegrationDecisionEvent> {
  return getEmitter().emit(input, output);
}
