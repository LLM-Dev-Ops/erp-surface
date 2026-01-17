/**
 * ERP Map Command
 *
 * Creates binding relationships between ERP systems with executive synthesis.
 * Includes bidirectional consistency verification in synthesis.
 *
 * @module commands/erp/map
 */

import { registry, type RegistryEntry } from '../../registry';
import type {
  ErpMapInput,
  ErpMapResult,
  ErpCommandError,
} from './types';
import { ERP_ERROR_CODES } from './types';
import {
  buildMapDecisionPacket,
  validateMapping,
  generateExecutionId,
} from './synthesis-helpers';

/**
 * Executes the erp map command
 *
 * Creates binding relationships between source and target ERP surfaces.
 * Generates Decision Packet with mapping validation results, bidirectional
 * consistency verification, and integration risk assessment.
 *
 * @param input - Map command input
 * @returns Map result with Decision Packet
 * @throws ErpCommandError if surfaces not found or mapping fails
 */
export async function executeErpMap(
  input: ErpMapInput
): Promise<ErpMapResult> {
  const executionId = generateExecutionId();
  const timestamp = new Date().toISOString();

  // Resolve source surface
  const sourceSurface = registry.get(input.surfaceId);
  if (!sourceSurface) {
    const error: ErpCommandError = {
      code: ERP_ERROR_CODES.SURFACE_NOT_FOUND,
      message: `Source surface '${input.surfaceId}' not found in registry`,
      surfaceId: input.surfaceId,
    };
    throw error;
  }

  // Resolve target surface
  const targetSurface = registry.get(input.targetSurfaceId);
  if (!targetSurface) {
    const error: ErpCommandError = {
      code: ERP_ERROR_CODES.SURFACE_NOT_FOUND,
      message: `Target surface '${input.targetSurfaceId}' not found in registry`,
      surfaceId: input.targetSurfaceId,
    };
    throw error;
  }

  // Generate field mappings if not provided
  const fieldMappings = input.fieldMappings ?? generateFieldMappings(sourceSurface, targetSurface);

  // Validate mapping
  const mappingValidation = validateMapping(
    sourceSurface,
    targetSurface,
    fieldMappings,
    input.validateBidirectional ?? true
  );

  // Check for blocking issues
  if (!mappingValidation.valid) {
    // Still return result with failed validation, synthesis will show REJECT
  }

  // Note: Bidirectional inconsistency is captured in the Decision Packet
  // synthesis as a blocking issue, not thrown as an error

  // Build Decision Packet with synthesis
  const decisionPacket = buildMapDecisionPacket(
    input,
    sourceSurface,
    targetSurface,
    fieldMappings
  );

  return {
    success: mappingValidation.valid,
    timestamp,
    executionId,
    sourceSurface,
    targetSurface,
    mappingValidation,
    fieldMappings,
    bidirectionalConsistent: mappingValidation.bidirectionalConsistency,
    decisionPacket,
  };
}

/**
 * Generates automatic field mappings between surfaces
 * Uses operation name matching and type compatibility
 */
function generateFieldMappings(
  source: RegistryEntry,
  target: RegistryEntry
): Record<string, string> {
  const mappings: Record<string, string> = {};

  // Match operations by name
  for (const sourceOp of source.operations) {
    const matchingTargetOp = target.operations.find(
      targetOp => targetOp.name.toLowerCase() === sourceOp.name.toLowerCase()
    );

    if (matchingTargetOp) {
      // Map input types
      mappings[sourceOp.inputType] = matchingTargetOp.inputType;
      // Map output types
      mappings[sourceOp.outputType] = matchingTargetOp.outputType;
    }
  }

  // Match events
  for (const sourceEvent of source.events) {
    const matchingEvent = target.events.find(
      e => e.toLowerCase() === sourceEvent.toLowerCase()
    );
    if (matchingEvent) {
      mappings[`event:${sourceEvent}`] = `event:${matchingEvent}`;
    }
  }

  return mappings;
}

/**
 * Validates map command input
 */
export function validateMapInput(input: unknown): input is ErpMapInput {
  if (typeof input !== 'object' || input === null) {
    return false;
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.surfaceId !== 'string' || obj.surfaceId.length === 0) {
    return false;
  }

  if (typeof obj.targetSurfaceId !== 'string' || obj.targetSurfaceId.length === 0) {
    return false;
  }

  return true;
}
