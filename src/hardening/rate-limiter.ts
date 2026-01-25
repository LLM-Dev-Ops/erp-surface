/**
 * Rate Limiter for Trust Boundary
 *
 * Enforces rate limits per vendor/domain/environment to protect
 * external ERP systems and ensure fair resource allocation.
 *
 * @module hardening/rate-limiter
 */

import { createExternalRiskSignal, emitSignal } from './signals';
import type { CorrelationId } from '../../common/types/identity';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Rate limit configuration per target
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  readonly maxRequests: number;
  /** Window size in milliseconds */
  readonly windowMs: number;
  /** Burst allowance (temporary over-limit) */
  readonly burstAllowance?: number;
}

/**
 * Rate limit entry in the store
 */
interface RateLimitEntry {
  count: number;
  windowStart: number;
  burstUsed: number;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetMs: number;
  readonly retryAfterMs?: number;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

/**
 * Default rate limits by environment
 * Production has stricter limits to protect ERP systems
 */
const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  production: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    burstAllowance: 10,
  },
  staging: {
    maxRequests: 200,
    windowMs: 60000,
    burstAllowance: 20,
  },
  development: {
    maxRequests: 500,
    windowMs: 60000,
    burstAllowance: 50,
  },
  sandbox: {
    maxRequests: 1000,
    windowMs: 60000,
    burstAllowance: 100,
  },
};

/**
 * Vendor-specific multipliers
 * Some ERP systems have stricter rate limits
 */
const VENDOR_MULTIPLIERS: Record<string, number> = {
  sap: 0.5,        // SAP has strict limits
  oracle: 0.7,     // Oracle moderately strict
  salesforce: 1.0, // Standard
  workday: 0.8,    // Slightly conservative
  dynamics: 1.0,   // Standard
  netsuite: 0.9,   // Slightly conservative
  servicenow: 1.0, // Standard
};

// =============================================================================
// RATE LIMITER CLASS
// =============================================================================

/**
 * In-memory rate limiter with sliding window
 */
export class RateLimiter {
  private readonly store: Map<string, RateLimitEntry> = new Map();
  private readonly config: Record<string, RateLimitConfig>;
  private readonly vendorMultipliers: Record<string, number>;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    config: Record<string, RateLimitConfig> = DEFAULT_RATE_LIMITS,
    vendorMultipliers: Record<string, number> = VENDOR_MULTIPLIERS
  ) {
    this.config = config;
    this.vendorMultipliers = vendorMultipliers;

    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
  }

  /**
   * Generates a rate limit key from target parameters
   */
  private generateKey(vendor: string, domain: string, environment: string): string {
    return `${vendor}:${domain}:${environment}`;
  }

  /**
   * Gets effective rate limit for a target
   */
  private getEffectiveLimit(vendor: string, environment: string): RateLimitConfig {
    const baseConfig = this.config[environment] || this.config['development'];
    const multiplier = this.vendorMultipliers[vendor] || 1.0;

    return {
      maxRequests: Math.floor(baseConfig.maxRequests * multiplier),
      windowMs: baseConfig.windowMs,
      burstAllowance: baseConfig.burstAllowance ? Math.floor(baseConfig.burstAllowance * multiplier) : undefined,
    };
  }

  /**
   * Checks if a request is within rate limits
   */
  check(vendor: string, domain: string, environment: string): RateLimitResult {
    const key = this.generateKey(vendor, domain, environment);
    const config = this.getEffectiveLimit(vendor, environment);
    const now = Date.now();

    let entry = this.store.get(key);

    // Reset window if expired
    if (!entry || now - entry.windowStart >= config.windowMs) {
      entry = {
        count: 0,
        windowStart: now,
        burstUsed: 0,
      };
      this.store.set(key, entry);
    }

    const remaining = config.maxRequests - entry.count;
    const burstRemaining = (config.burstAllowance || 0) - entry.burstUsed;
    const resetMs = config.windowMs - (now - entry.windowStart);

    // Check if within limits
    if (entry.count < config.maxRequests) {
      return { allowed: true, remaining, resetMs };
    }

    // Check burst allowance
    if (burstRemaining > 0) {
      return { allowed: true, remaining: burstRemaining, resetMs };
    }

    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetMs,
      retryAfterMs: resetMs,
    };
  }

  /**
   * Records a request consumption
   */
  consume(vendor: string, domain: string, environment: string): RateLimitResult {
    const key = this.generateKey(vendor, domain, environment);
    const config = this.getEffectiveLimit(vendor, environment);
    const now = Date.now();

    let entry = this.store.get(key);

    // Reset window if expired
    if (!entry || now - entry.windowStart >= config.windowMs) {
      entry = {
        count: 0,
        windowStart: now,
        burstUsed: 0,
      };
    }

    // Consume from regular allowance first, then burst
    if (entry.count < config.maxRequests) {
      entry.count++;
    } else if (entry.burstUsed < (config.burstAllowance || 0)) {
      entry.burstUsed++;
    }

    this.store.set(key, entry);

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const burstRemaining = Math.max(0, (config.burstAllowance || 0) - entry.burstUsed);
    const resetMs = config.windowMs - (now - entry.windowStart);

    const allowed = entry.count <= config.maxRequests || entry.burstUsed <= (config.burstAllowance || 0);

    return {
      allowed,
      remaining: remaining + burstRemaining,
      resetMs,
      retryAfterMs: allowed ? undefined : resetMs,
    };
  }

  /**
   * Checks rate limit and emits risk signal if exceeded
   */
  async checkAndEmitSignal(
    vendor: string,
    domain: string,
    environment: string,
    correlationId: CorrelationId
  ): Promise<RateLimitResult> {
    const result = this.check(vendor, domain, environment);

    if (!result.allowed) {
      const signal = createExternalRiskSignal({
        correlationId,
        riskType: 'rate_limit',
        riskLevel: 'high',
        description: `Rate limit exceeded for ${vendor}:${domain}:${environment}. Retry after ${result.retryAfterMs}ms`,
        mitigationApplied: true,
        mitigationAction: 'request_blocked',
        blocksExecution: true,
      });

      await emitSignal(signal);
    }

    return result;
  }

  /**
   * Cleans up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const maxWindowMs = Math.max(...Object.values(this.config).map(c => c.windowMs));

    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (now - entry.windowStart > maxWindowMs * 2) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Stops the cleanup interval
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Gets current stats for monitoring
   */
  getStats(): { activeKeys: number; totalRequests: number } {
    let totalRequests = 0;
    const values = Array.from(this.store.values());
    for (const entry of values) {
      totalRequests += entry.count + entry.burstUsed;
    }
    return {
      activeKeys: this.store.size,
      totalRequests,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let rateLimiterInstance: RateLimiter | null = null;

/**
 * Gets the singleton rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Checks rate limit using singleton
 */
export function checkRateLimit(
  vendor: string,
  domain: string,
  environment: string
): RateLimitResult {
  return getRateLimiter().check(vendor, domain, environment);
}

/**
 * Consumes rate limit using singleton
 */
export function consumeRateLimit(
  vendor: string,
  domain: string,
  environment: string
): RateLimitResult {
  return getRateLimiter().consume(vendor, domain, environment);
}
