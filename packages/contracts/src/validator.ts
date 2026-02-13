/**
 * Schema validator with Ajv in STRICT mode
 * @module @agentics/contracts/validator
 */

import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import {
  ERPSurfaceRequest,
  ERPSurfaceResponse,
  ResultPacket,
  ContractValidationError,
  ValidationErrorDetail,
} from './types';
import requestSchema from './schemas/erp-surface/v1/request.schema.json';
import responseSchema from './schemas/erp-surface/v1/response.schema.json';
import resultPacketSchema from './schemas/erp-surface/v1/result-packet.schema.json';

/**
 * Ajv instance configured in STRICT mode
 * - No type coercion
 * - No defaults
 * - Fails on unknown properties
 * - Strict type checking
 */
const ajv = new Ajv({
  // Strict mode options for maximum validation integrity
  strict: true,
  strictTypes: true,
  strictTuples: true,
  // Note: strictRequired is disabled because oneOf with required creates
  // references to properties defined in the parent schema, which Ajv's
  // strictRequired mode doesn't recognize correctly.
  strictRequired: false,
  // CRITICAL: No type coercion - values must match exact types
  coerceTypes: false,
  // CRITICAL: No defaults - all required values must be provided
  useDefaults: false,
  // CRITICAL: Keep additional properties - don't silently strip them
  // The schema's additionalProperties: false will reject them
  removeAdditional: false,
  // Collect all errors for comprehensive error reporting
  allErrors: true,
  verbose: true,
});

// Add format validators (uuid, date-time, etc.)
addFormats(ajv);

// Compile validators once at module load
const validateRequestSchema: ValidateFunction = ajv.compile(requestSchema);
const validateResponseSchema: ValidateFunction = ajv.compile(responseSchema);
const validateResultPacketSchema: ValidateFunction = ajv.compile(resultPacketSchema);

/**
 * Converts Ajv errors to ValidationErrorDetail array
 */
function convertErrors(errors: ErrorObject[] | null | undefined): ValidationErrorDetail[] {
  if (!errors) return [];

  return errors.map((error) => ({
    instancePath: error.instancePath || '/',
    keyword: error.keyword,
    message: error.message || 'Validation failed',
    params: error.params,
  }));
}

/**
 * Validates an ERP Surface request payload
 * Throws immediately on invalid payload
 *
 * @param payload - The request payload to validate
 * @returns The validated request (type-narrowed)
 * @throws {ContractValidationError} If validation fails
 */
export function validateRequest(payload: unknown): ERPSurfaceRequest {
  if (payload === null || payload === undefined) {
    throw new ContractValidationError('Request payload is required', [
      {
        instancePath: '/',
        keyword: 'required',
        message: 'Request payload is required',
        params: {},
      },
    ]);
  }

  const valid = validateRequestSchema(payload);

  if (!valid) {
    const errors = convertErrors(validateRequestSchema.errors);
    throw new ContractValidationError(
      `Invalid ERP Surface request: ${errors.map((e) => e.message).join(', ')}`,
      errors
    );
  }

  return payload as ERPSurfaceRequest;
}

/**
 * Validates an ERP Surface response payload
 * Throws immediately on invalid payload
 *
 * @param payload - The response payload to validate
 * @returns The validated response (type-narrowed)
 * @throws {ContractValidationError} If validation fails
 */
export function validateResponse(payload: unknown): ERPSurfaceResponse {
  if (payload === null || payload === undefined) {
    throw new ContractValidationError('Response payload is required', [
      {
        instancePath: '/',
        keyword: 'required',
        message: 'Response payload is required',
        params: {},
      },
    ]);
  }

  const valid = validateResponseSchema(payload);

  if (!valid) {
    const errors = convertErrors(validateResponseSchema.errors);
    throw new ContractValidationError(
      `Invalid ERP Surface response: ${errors.map((e) => e.message).join(', ')}`,
      errors
    );
  }

  return payload as ERPSurfaceResponse;
}

/**
 * Checks if a request payload is valid without throwing
 *
 * @param payload - The request payload to validate
 * @returns True if valid, false otherwise
 */
export function isValidRequest(payload: unknown): payload is ERPSurfaceRequest {
  if (payload === null || payload === undefined) {
    return false;
  }
  return validateRequestSchema(payload);
}

/**
 * Checks if a response payload is valid without throwing
 *
 * @param payload - The response payload to validate
 * @returns True if valid, false otherwise
 */
export function isValidResponse(payload: unknown): payload is ERPSurfaceResponse {
  if (payload === null || payload === undefined) {
    return false;
  }
  return validateResponseSchema(payload);
}

/**
 * Gets validation errors for a request without throwing
 *
 * @param payload - The request payload to validate
 * @returns Array of validation errors (empty if valid)
 */
export function getRequestValidationErrors(payload: unknown): ValidationErrorDetail[] {
  if (payload === null || payload === undefined) {
    return [
      {
        instancePath: '/',
        keyword: 'required',
        message: 'Request payload is required',
        params: {},
      },
    ];
  }

  validateRequestSchema(payload);
  return convertErrors(validateRequestSchema.errors);
}

/**
 * Gets validation errors for a response without throwing
 *
 * @param payload - The response payload to validate
 * @returns Array of validation errors (empty if valid)
 */
export function getResponseValidationErrors(payload: unknown): ValidationErrorDetail[] {
  if (payload === null || payload === undefined) {
    return [
      {
        instancePath: '/',
        keyword: 'required',
        message: 'Response payload is required',
        params: {},
      },
    ];
  }

  validateResponseSchema(payload);
  return convertErrors(validateResponseSchema.errors);
}

/**
 * Validates a result packet from upstream simulation
 * Throws immediately on invalid payload
 *
 * @param payload - The result packet to validate
 * @returns The validated result packet (type-narrowed)
 * @throws {ContractValidationError} If validation fails
 */
export function validateResultPacket(payload: unknown): ResultPacket {
  if (payload === null || payload === undefined) {
    throw new ContractValidationError('Result packet is required', [
      {
        instancePath: '/',
        keyword: 'required',
        message: 'Result packet is required',
        params: {},
      },
    ]);
  }

  const valid = validateResultPacketSchema(payload);

  if (!valid) {
    const errors = convertErrors(validateResultPacketSchema.errors);
    throw new ContractValidationError(
      `Invalid result packet: ${errors.map((e) => e.message).join(', ')}`,
      errors
    );
  }

  return payload as ResultPacket;
}

/**
 * Re-export the Ajv instance for advanced use cases
 */
export { ajv };

/**
 * Re-export schema objects for direct access
 */
export { requestSchema, responseSchema, resultPacketSchema };
