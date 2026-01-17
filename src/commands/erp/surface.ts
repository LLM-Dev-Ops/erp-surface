/**
 * ERP Surface Command
 *
 * Extracts and exposes ERP data structures with executive synthesis.
 * Flags PII and sensitive fields in synthesis output.
 *
 * @module commands/erp/surface
 */

import { registry, type RegistryEntry } from '../../registry';
import type {
  ErpSurfaceInput,
  ErpSurfaceResult,
  ErpCommandError,
} from './types';
import { ERP_ERROR_CODES } from './types';
import {
  buildSurfaceDecisionPacket,
  detectSensitiveFields,
  generateExecutionId,
} from './synthesis-helpers';

/**
 * Executes the erp surface command
 *
 * Extracts and exposes ERP data structures. Generates Decision Packet
 * with data sensitivity classification, sensitive field markers, and
 * deployment risk assessment.
 *
 * @param input - Surface command input
 * @returns Surface result with Decision Packet
 * @throws ErpCommandError if surface not found
 */
export async function executeErpSurface(
  input: ErpSurfaceInput
): Promise<ErpSurfaceResult> {
  const executionId = generateExecutionId();
  const timestamp = new Date().toISOString();

  // Resolve surface from registry
  const surface = registry.get(input.surfaceId);

  if (!surface) {
    const error: ErpCommandError = {
      code: ERP_ERROR_CODES.SURFACE_NOT_FOUND,
      message: `Surface '${input.surfaceId}' not found in registry`,
      surfaceId: input.surfaceId,
    };
    throw error;
  }

  // Detect sensitive fields
  const sensitiveFields = detectSensitiveFields(surface);

  // Build Decision Packet with synthesis
  const decisionPacket = buildSurfaceDecisionPacket(input, surface);

  // Extract schema if requested
  let schema: Record<string, unknown> | undefined;
  if (input.includeSchema) {
    schema = extractSchema(surface);
  }

  // Extract behavioral model if requested
  let behavior: Record<string, unknown> | undefined;
  if (input.includeBehavior) {
    behavior = extractBehavior(surface);
  }

  return {
    success: true,
    timestamp,
    executionId,
    surface,
    schema,
    behavior,
    sensitiveFields,
    decisionPacket,
  };
}

/**
 * Extracts schema information from a surface
 */
function extractSchema(surface: RegistryEntry): Record<string, unknown> {
  return {
    surfaceId: surface.surfaceId,
    version: surface.version,
    domain: surface.domain,
    operations: surface.operations.map(op => ({
      name: op.name,
      inputType: op.inputType,
      outputType: op.outputType,
      mutating: op.mutating,
    })),
    events: surface.events,
    errorCodes: surface.errorCodes,
  };
}

/**
 * Extracts behavioral model from a surface
 */
function extractBehavior(surface: RegistryEntry): Record<string, unknown> {
  return {
    surfaceId: surface.surfaceId,
    operations: surface.operations.map(op => ({
      name: op.name,
      description: op.description,
      mutating: op.mutating,
      emittedEvents: op.emittedEvents,
    })),
    vendorCoverage: surface.vendorCoverage,
    deprecation: surface.deprecation,
  };
}

/**
 * Validates surface command input
 */
export function validateSurfaceInput(input: unknown): input is ErpSurfaceInput {
  if (typeof input !== 'object' || input === null) {
    return false;
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.surfaceId !== 'string' || obj.surfaceId.length === 0) {
    return false;
  }

  return true;
}
