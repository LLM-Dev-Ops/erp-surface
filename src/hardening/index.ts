/**
 * Trust Boundary Hardening Module
 *
 * Provides comprehensive security hardening for the ERP Integration trust boundary:
 * - Signal emission (integration_readiness_signal, mapping_validation_signal, external_risk_signal)
 * - Rate limiting per vendor/domain/environment
 * - Data masking for PII and financial data
 * - Audit trail for request lifecycle
 * - Request signing with JOSE
 *
 * @module hardening
 */

// Signal emission
export {
  type TrustBoundarySignal,
  type SignalSeverity,
  type IntegrationReadinessSignal,
  type MappingValidationSignal,
  type ExternalRiskSignal,
  type Signal,
  type ReadinessCheckInput,
  type MappingValidationInput,
  type ExternalRiskInput,
  createReadinessSignal,
  createMappingValidationSignal,
  createExternalRiskSignal,
  emitSignal,
} from './signals';

// Rate limiting
export {
  type RateLimitConfig,
  type RateLimitResult,
  RateLimiter,
  getRateLimiter,
  checkRateLimit,
  consumeRateLimit,
} from './rate-limiter';

// Data masking
export {
  type MaskType,
  type MaskingOptions,
  type SensitiveDataDetection,
  getMaskType,
  maskSensitiveData,
  maskForLogging,
  maskForTelemetry,
  detectSensitiveData,
} from './data-masking';

// Audit trail
export {
  type AuditEventType,
  type AuditEvent,
  type AuditTrailConfig,
  AuditTrail,
  getAuditTrail,
  auditRequestReceived,
  auditValidation,
  auditRateLimitCheck,
  auditExecutionComplete,
  auditResponseSent,
} from './audit-trail';

// Request signing
export {
  type SignedPayload,
  type VerifiedPayload,
  exportPublicKeyJwk,
  signRequest,
  verifyRequest,
  verifyRequestWithSignal,
  createSignedAuthHeader,
  verifyAuthHeader,
  computeIntegrityHash,
  verifyIntegrity,
} from './request-signing';

// =============================================================================
// INTEGRATION HELPERS
// =============================================================================

import { createReadinessSignal, emitSignal, type ReadinessCheckInput } from './signals';
import { getRateLimiter, type RateLimitResult } from './rate-limiter';
import { auditRateLimitCheck } from './audit-trail';
import type { CorrelationId } from '../../common/types/identity';

/**
 * Performance budget constant (from requirements)
 */
export const MAX_LATENCY_MS = 3000;

/**
 * Performs full trust boundary checks before integration execution
 */
export async function performTrustBoundaryChecks(
  correlationId: CorrelationId,
  requestId: string,
  vendor: string,
  domain: string,
  environment: string,
  options: {
    schemaValidated: boolean;
    credentialsAvailable?: boolean;
    governanceApprovalRef?: string;
  }
): Promise<{
  ready: boolean;
  rateLimitResult: RateLimitResult;
  blockedReason?: string;
}> {
  // Check rate limits
  const rateLimitResult = await getRateLimiter().checkAndEmitSignal(
    vendor,
    domain,
    environment,
    correlationId
  );

  // Audit rate limit check
  auditRateLimitCheck(
    correlationId,
    requestId,
    vendor,
    domain,
    environment,
    rateLimitResult.allowed,
    rateLimitResult.remaining
  );

  if (!rateLimitResult.allowed) {
    return {
      ready: false,
      rateLimitResult,
      blockedReason: `Rate limit exceeded. Retry after ${rateLimitResult.retryAfterMs}ms`,
    };
  }

  // Prepare readiness check input
  const readinessInput: ReadinessCheckInput = {
    correlationId,
    vendor,
    domain,
    environment,
    schemaValidated: options.schemaValidated,
    credentialsAvailable: options.credentialsAvailable ?? true, // Assume available if not specified
    governanceApproved: !!options.governanceApprovalRef || environment !== 'production',
    rateWithinLimits: rateLimitResult.allowed,
    latencyBudgetMs: MAX_LATENCY_MS,
  };

  // Create and emit readiness signal
  const readinessSignal = createReadinessSignal(readinessInput);
  await emitSignal(readinessSignal);

  // Determine if ready
  const ready = readinessInput.schemaValidated &&
                readinessInput.credentialsAvailable &&
                readinessInput.governanceApproved &&
                readinessInput.rateWithinLimits;

  let blockedReason: string | undefined;
  if (!ready) {
    if (!readinessInput.schemaValidated) {
      blockedReason = 'Schema validation failed';
    } else if (!readinessInput.credentialsAvailable) {
      blockedReason = 'Credentials not available';
    } else if (!readinessInput.governanceApproved) {
      blockedReason = 'Governance approval required for production';
    }
  }

  return { ready, rateLimitResult, blockedReason };
}

/**
 * Checks if latency is within budget
 */
export function checkLatencyBudget(startTime: number): {
  withinBudget: boolean;
  elapsedMs: number;
  remainingMs: number;
} {
  const elapsedMs = Date.now() - startTime;
  const remainingMs = Math.max(0, MAX_LATENCY_MS - elapsedMs);

  return {
    withinBudget: elapsedMs < MAX_LATENCY_MS,
    elapsedMs,
    remainingMs,
  };
}
