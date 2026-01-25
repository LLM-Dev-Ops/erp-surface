/**
 * Audit Trail for Trust Boundary
 *
 * Provides detailed audit logging for all trust boundary operations.
 * Separate from DecisionEvents - captures full request/response lifecycle.
 *
 * @module hardening/audit-trail
 */

import { createHash, randomUUID } from 'crypto';
import type { UUID, CorrelationId } from '../../common/types/identity';
import { AGENT_ID, AGENT_VERSION } from '../agents/erp-integration/contract';
import { maskForLogging } from './data-masking';

// =============================================================================
// AUDIT TYPES
// =============================================================================

/**
 * Audit event types
 */
export type AuditEventType =
  | 'request_received'
  | 'validation_passed'
  | 'validation_failed'
  | 'rate_limit_checked'
  | 'rate_limit_exceeded'
  | 'readiness_checked'
  | 'mapping_validated'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'risk_detected'
  | 'response_sent';

/**
 * Audit event interface
 */
export interface AuditEvent {
  readonly auditId: UUID;
  readonly eventType: AuditEventType;
  readonly correlationId: CorrelationId;
  readonly requestId?: string;
  readonly agentId: typeof AGENT_ID;
  readonly agentVersion: typeof AGENT_VERSION;
  readonly timestamp: string;
  readonly durationMs?: number;
  readonly outcome: 'success' | 'failure' | 'blocked' | 'pending';
  readonly details: Record<string, unknown>;
  readonly clientIp?: string;
  readonly userAgent?: string;
  readonly inputsHash?: string;
}

// =============================================================================
// AUDIT TRAIL CLASS
// =============================================================================

/**
 * Audit trail configuration
 */
export interface AuditTrailConfig {
  /** Enable console logging of audit events */
  readonly enableConsoleLog?: boolean;
  /** External audit endpoint */
  readonly auditEndpoint?: string;
  /** Include full request/response bodies (masked) */
  readonly includePayloads?: boolean;
  /** Maximum events to buffer before flushing */
  readonly bufferSize?: number;
  /** Flush interval in milliseconds */
  readonly flushIntervalMs?: number;
}

const DEFAULT_CONFIG: AuditTrailConfig = {
  enableConsoleLog: true,
  auditEndpoint: process.env['AUDIT_ENDPOINT'],
  includePayloads: process.env['NODE_ENV'] !== 'production',
  bufferSize: 100,
  flushIntervalMs: 5000,
};

/**
 * Audit trail manager
 */
export class AuditTrail {
  private readonly config: AuditTrailConfig;
  private readonly buffer: AuditEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: AuditTrailConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Start flush interval if endpoint configured
    if (this.config.auditEndpoint && this.config.flushIntervalMs) {
      this.flushInterval = setInterval(
        () => this.flush(),
        this.config.flushIntervalMs
      );
    }
  }

  /**
   * Records an audit event
   */
  record(event: Omit<AuditEvent, 'auditId' | 'agentId' | 'agentVersion' | 'timestamp'>): AuditEvent {
    const fullEvent: AuditEvent = {
      ...event,
      auditId: randomUUID(),
      agentId: AGENT_ID,
      agentVersion: AGENT_VERSION,
      timestamp: new Date().toISOString(),
    };

    // Log to console if enabled
    if (this.config.enableConsoleLog) {
      this.logEvent(fullEvent);
    }

    // Buffer for async flush
    if (this.config.auditEndpoint) {
      this.buffer.push(fullEvent);

      // Flush if buffer is full
      if (this.buffer.length >= (this.config.bufferSize || 100)) {
        this.flush();
      }
    }

    return fullEvent;
  }

  /**
   * Logs an event to console in structured format
   */
  private logEvent(event: AuditEvent): void {
    const level = event.outcome === 'failure' ? 'error' :
                  event.outcome === 'blocked' ? 'warn' : 'info';

    console.log(JSON.stringify({
      level,
      type: 'audit',
      audit_id: event.auditId,
      event_type: event.eventType,
      correlation_id: event.correlationId,
      request_id: event.requestId,
      outcome: event.outcome,
      duration_ms: event.durationMs,
      timestamp: event.timestamp,
      // Mask sensitive details before logging
      details: this.config.includePayloads
        ? maskForLogging(event.details as Record<string, unknown>)
        : { masked: true },
    }));
  }

  /**
   * Flushes buffered events to the audit endpoint
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.config.auditEndpoint) {
      return;
    }

    const events = this.buffer.splice(0, this.buffer.length);

    try {
      const response = await fetch(this.config.auditEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'audit_batch',
          agent_id: AGENT_ID,
          events: events.map(e => ({
            ...e,
            // Mask payloads before sending
            details: maskForLogging(e.details as Record<string, unknown>),
          })),
        }),
      });

      if (!response.ok) {
        console.error(JSON.stringify({
          level: 'error',
          message: 'Failed to flush audit events',
          status: response.status,
          event_count: events.length,
        }));
        // Re-add events to buffer on failure
        this.buffer.unshift(...events);
      }
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Error flushing audit events',
        error: error instanceof Error ? error.message : 'Unknown error',
        event_count: events.length,
      }));
      // Re-add events to buffer on failure
      this.buffer.unshift(...events);
    }
  }

  /**
   * Shuts down the audit trail, flushing remaining events
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }

  /**
   * Gets buffer stats
   */
  getStats(): { bufferedEvents: number; pendingFlush: boolean } {
    return {
      bufferedEvents: this.buffer.length,
      pendingFlush: this.buffer.length > 0 && !!this.config.auditEndpoint,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let auditTrailInstance: AuditTrail | null = null;

/**
 * Gets the singleton audit trail instance
 */
export function getAuditTrail(config?: AuditTrailConfig): AuditTrail {
  if (!auditTrailInstance) {
    auditTrailInstance = new AuditTrail(config);
  }
  return auditTrailInstance;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Records a request received audit event
 */
export function auditRequestReceived(
  correlationId: CorrelationId,
  requestId: string,
  details: Record<string, unknown>
): AuditEvent {
  return getAuditTrail().record({
    eventType: 'request_received',
    correlationId,
    requestId,
    outcome: 'pending',
    details: {
      ...details,
      inputsHash: createHash('sha256')
        .update(JSON.stringify(details))
        .digest('hex'),
    },
  });
}

/**
 * Records a validation result audit event
 */
export function auditValidation(
  correlationId: CorrelationId,
  requestId: string,
  passed: boolean,
  errors?: readonly { field: string; message: string }[]
): AuditEvent {
  return getAuditTrail().record({
    eventType: passed ? 'validation_passed' : 'validation_failed',
    correlationId,
    requestId,
    outcome: passed ? 'success' : 'failure',
    details: {
      passed,
      errors: errors || [],
    },
  });
}

/**
 * Records a rate limit check audit event
 */
export function auditRateLimitCheck(
  correlationId: CorrelationId,
  requestId: string,
  vendor: string,
  domain: string,
  environment: string,
  allowed: boolean,
  remaining: number
): AuditEvent {
  return getAuditTrail().record({
    eventType: allowed ? 'rate_limit_checked' : 'rate_limit_exceeded',
    correlationId,
    requestId,
    outcome: allowed ? 'success' : 'blocked',
    details: {
      vendor,
      domain,
      environment,
      allowed,
      remaining,
    },
  });
}

/**
 * Records an execution completion audit event
 */
export function auditExecutionComplete(
  correlationId: CorrelationId,
  requestId: string,
  executionId: string,
  status: string,
  confidence: number,
  durationMs: number
): AuditEvent {
  return getAuditTrail().record({
    eventType: status === 'success' || status === 'skipped' ? 'execution_completed' : 'execution_failed',
    correlationId,
    requestId,
    outcome: status === 'success' || status === 'skipped' ? 'success' : 'failure',
    durationMs,
    details: {
      executionId,
      status,
      confidence,
      durationMs,
    },
  });
}

/**
 * Records a response sent audit event
 */
export function auditResponseSent(
  correlationId: CorrelationId,
  requestId: string,
  statusCode: number,
  success: boolean,
  durationMs: number
): AuditEvent {
  return getAuditTrail().record({
    eventType: 'response_sent',
    correlationId,
    requestId,
    outcome: success ? 'success' : 'failure',
    durationMs,
    details: {
      statusCode,
      success,
      durationMs,
    },
  });
}
