/**
 * Request Signing for Trust Boundary
 *
 * Provides JOSE-based request signing and verification
 * for secure inter-service communication.
 *
 * Uses ES256 (ECDSA with P-256 and SHA-256) for signatures.
 *
 * @module hardening/request-signing
 */

import * as jose from 'jose';
import { createHash, randomUUID } from 'crypto';
import type { CorrelationId } from '../../common/types/identity';
import { AGENT_ID } from '../agents/erp-integration/contract';
import { createExternalRiskSignal, emitSignal } from './signals';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Signed request payload
 */
export interface SignedPayload {
  /** JWT token */
  readonly token: string;
  /** Signature algorithm used */
  readonly algorithm: 'ES256';
  /** Key ID if available */
  readonly kid?: string;
}

/**
 * Verified payload result
 */
export interface VerifiedPayload<T = unknown> {
  /** Whether verification succeeded */
  readonly verified: boolean;
  /** Decoded payload if verified */
  readonly payload?: T;
  /** Error message if verification failed */
  readonly error?: string;
  /** Claims from the token */
  readonly claims?: {
    readonly iss: string;
    readonly sub: string;
    readonly aud: string;
    readonly iat: number;
    readonly exp: number;
    readonly jti: string;
  };
}

/**
 * Request signature claims
 */
interface RequestClaims {
  /** Issuer - agent ID */
  iss: typeof AGENT_ID;
  /** Subject - correlation ID */
  sub: CorrelationId;
  /** Audience - target service */
  aud: string;
  /** Request hash (SHA-256 of payload) */
  req_hash: string;
  /** Request ID */
  req_id: string;
  /** Payload (for small payloads) */
  payload?: unknown;
}

// =============================================================================
// KEY MANAGEMENT
// =============================================================================

/**
 * Key pair for signing
 */
let privateKey: jose.KeyLike | null = null;
let publicKey: jose.KeyLike | null = null;
let keyId: string | null = null;

/**
 * Initializes key pair from environment or generates ephemeral
 */
async function initializeKeys(): Promise<void> {
  const privateKeyPem = process.env['SIGNING_PRIVATE_KEY'];
  const publicKeyPem = process.env['SIGNING_PUBLIC_KEY'];

  if (privateKeyPem && publicKeyPem) {
    // Load keys from environment
    privateKey = await jose.importPKCS8(privateKeyPem, 'ES256');
    publicKey = await jose.importSPKI(publicKeyPem, 'ES256');
    keyId = process.env['SIGNING_KEY_ID'] || 'erp-surface-prod';

    console.log(JSON.stringify({
      level: 'info',
      message: 'Request signing keys loaded from environment',
      key_id: keyId,
    }));
  } else {
    // Generate ephemeral key pair for development/testing
    const { privateKey: priv, publicKey: pub } = await jose.generateKeyPair('ES256');
    privateKey = priv;
    publicKey = pub;
    keyId = `erp-surface-ephemeral-${randomUUID().substring(0, 8)}`;

    console.log(JSON.stringify({
      level: 'warn',
      message: 'Using ephemeral signing keys (not for production)',
      key_id: keyId,
    }));
  }
}

/**
 * Gets the private key, initializing if needed
 */
async function getPrivateKey(): Promise<jose.KeyLike> {
  if (!privateKey) {
    await initializeKeys();
  }
  return privateKey!;
}

/**
 * Gets the public key, initializing if needed
 */
async function getPublicKey(): Promise<jose.KeyLike> {
  if (!publicKey) {
    await initializeKeys();
  }
  return publicKey!;
}

/**
 * Exports public key as JWK for key distribution
 */
export async function exportPublicKeyJwk(): Promise<jose.JWK> {
  const key = await getPublicKey();
  const jwk = await jose.exportJWK(key);
  return { ...jwk, kid: keyId || undefined, use: 'sig', alg: 'ES256' };
}

// =============================================================================
// SIGNING FUNCTIONS
// =============================================================================

/**
 * Signs a request payload
 */
export async function signRequest(
  correlationId: CorrelationId,
  requestId: string,
  payload: unknown,
  audience: string = 'ruvector-service'
): Promise<SignedPayload> {
  const key = await getPrivateKey();

  // Compute payload hash
  const payloadHash = createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');

  const claims: RequestClaims = {
    iss: AGENT_ID,
    sub: correlationId,
    aud: audience,
    req_hash: payloadHash,
    req_id: requestId,
    // Include payload only if small enough
    payload: JSON.stringify(payload).length < 4096 ? payload : undefined,
  };

  const token = await new jose.SignJWT(claims as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: 'ES256', kid: keyId || undefined })
    .setIssuedAt()
    .setExpirationTime('5m') // 5 minute expiration
    .setJti(randomUUID())
    .sign(key);

  return {
    token,
    algorithm: 'ES256',
    kid: keyId || undefined,
  };
}

/**
 * Verifies a signed request
 */
export async function verifyRequest<T = unknown>(
  signedPayload: SignedPayload,
  expectedAudience: string = AGENT_ID
): Promise<VerifiedPayload<T>> {
  try {
    const key = await getPublicKey();

    const { payload } = await jose.jwtVerify(
      signedPayload.token,
      key,
      {
        audience: expectedAudience,
        algorithms: ['ES256'],
      }
    );

    const claims = payload as unknown as RequestClaims & {
      iat: number;
      exp: number;
      jti: string;
    };

    return {
      verified: true,
      payload: claims.payload as T,
      claims: {
        iss: claims.iss,
        sub: claims.sub,
        aud: typeof claims.aud === 'string' ? claims.aud : claims.aud[0],
        iat: claims.iat,
        exp: claims.exp,
        jti: claims.jti,
      },
    };
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Verifies request and emits risk signal on failure
 */
export async function verifyRequestWithSignal<T = unknown>(
  signedPayload: SignedPayload,
  correlationId: CorrelationId,
  expectedAudience: string = AGENT_ID
): Promise<VerifiedPayload<T>> {
  const result = await verifyRequest<T>(signedPayload, expectedAudience);

  if (!result.verified) {
    const signal = createExternalRiskSignal({
      correlationId,
      riskType: 'authentication',
      riskLevel: 'critical',
      description: `Request signature verification failed: ${result.error}`,
      mitigationApplied: true,
      mitigationAction: 'request_rejected',
      blocksExecution: true,
    });

    await emitSignal(signal);
  }

  return result;
}

// =============================================================================
// HEADER HELPERS
// =============================================================================

/**
 * Creates authorization header with signed request
 */
export async function createSignedAuthHeader(
  correlationId: CorrelationId,
  requestId: string,
  payload: unknown,
  audience: string = 'ruvector-service'
): Promise<{ Authorization: string; 'X-Request-Signature': string }> {
  const signed = await signRequest(correlationId, requestId, payload, audience);

  return {
    'Authorization': `Bearer ${signed.token}`,
    'X-Request-Signature': signed.token,
  };
}

/**
 * Extracts and verifies signature from request headers
 */
export async function verifyAuthHeader<T = unknown>(
  authHeader: string | undefined,
  correlationId: CorrelationId,
  expectedAudience: string = AGENT_ID
): Promise<VerifiedPayload<T>> {
  if (!authHeader) {
    return {
      verified: false,
      error: 'Missing Authorization header',
    };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');

  return verifyRequestWithSignal<T>(
    { token, algorithm: 'ES256' },
    correlationId,
    expectedAudience
  );
}

// =============================================================================
// REQUEST INTEGRITY
// =============================================================================

/**
 * Computes request integrity hash
 */
export function computeIntegrityHash(
  method: string,
  path: string,
  body: unknown,
  timestamp: string
): string {
  const canonical = JSON.stringify({
    method: method.toUpperCase(),
    path,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    timestamp,
  });

  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Verifies request integrity
 */
export function verifyIntegrity(
  expectedHash: string,
  method: string,
  path: string,
  body: unknown,
  timestamp: string
): boolean {
  const computedHash = computeIntegrityHash(method, path, body, timestamp);

  // Constant-time comparison to prevent timing attacks
  if (expectedHash.length !== computedHash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < expectedHash.length; i++) {
    result |= expectedHash.charCodeAt(i) ^ computedHash.charCodeAt(i);
  }

  return result === 0;
}
