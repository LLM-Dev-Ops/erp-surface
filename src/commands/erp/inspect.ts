/**
 * ERP Inspect Command
 *
 * Read-only detail retrieval for ERP surfaces.
 * EXPLICITLY EXCLUDED from synthesis - no Decision Packet generated.
 *
 * @module commands/erp/inspect
 */

import { registry } from '../../registry';
import { randomUUID } from 'crypto';
import type { ErpInspectInput, ErpInspectResult, ErpCommandError } from './types';
import { ERP_ERROR_CODES } from './types';

/**
 * Executes the erp inspect command
 *
 * Retrieves detailed information about a specific ERP surface.
 * This is a READ-ONLY command and does NOT generate synthesis.
 *
 * @param input - Inspect command input
 * @returns Inspect result WITHOUT Decision Packet
 * @throws ErpCommandError if surface not found
 */
export async function executeErpInspect(
  input: ErpInspectInput
): Promise<ErpInspectResult> {
  const executionId = randomUUID();
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

  const depth = input.depth ?? 'summary';

  // Build operations detail if requested or depth is detailed/full
  let operations: Record<string, unknown>[] | undefined;
  if (input.includeOperations || depth === 'detailed' || depth === 'full') {
    operations = surface.operations.map(op => ({
      name: op.name,
      description: op.description,
      inputType: op.inputType,
      outputType: op.outputType,
      mutating: op.mutating,
      emittedEvents: op.emittedEvents,
    }));
  }

  // Build events if requested or depth is full
  let events: string[] | undefined;
  if (input.includeEvents || depth === 'full') {
    events = [...surface.events];
  }

  return {
    success: true,
    timestamp,
    executionId,
    surface,
    operations,
    events,
    depth,
  };
}

/**
 * Formats inspect result for display
 */
export function formatInspectResult(result: ErpInspectResult): string {
  const lines: string[] = [];

  // Header
  lines.push('═'.repeat(60));
  lines.push(`Surface: ${result.surface.surfaceId}`);
  lines.push('═'.repeat(60));
  lines.push('');

  // Basic info
  lines.push('BASIC INFORMATION');
  lines.push('─'.repeat(40));
  lines.push(`Name:        ${result.surface.name}`);
  lines.push(`Version:     ${result.surface.version}`);
  lines.push(`Domain:      ${result.surface.domain}`);
  lines.push(`Description: ${result.surface.description}`);
  lines.push(`Registered:  ${result.surface.registeredAt}`);
  lines.push(`Updated:     ${result.surface.updatedAt}`);
  lines.push('');

  // Deprecation warning
  if (result.surface.deprecation?.deprecated) {
    lines.push('⚠️  DEPRECATION WARNING');
    lines.push('─'.repeat(40));
    lines.push(`Message:     ${result.surface.deprecation.message}`);
    if (result.surface.deprecation.replacement) {
      lines.push(`Replacement: ${result.surface.deprecation.replacement}`);
    }
    if (result.surface.deprecation.removalDate) {
      lines.push(`Removal:     ${result.surface.deprecation.removalDate}`);
    }
    lines.push('');
  }

  // Vendor coverage
  lines.push('VENDOR COVERAGE');
  lines.push('─'.repeat(40));
  const vendors = Object.entries(result.surface.vendorCoverage)
    .map(([vendor, supported]) => `${vendor}: ${supported ? '✓' : '✗'}`)
    .join('  ');
  lines.push(vendors);
  lines.push('');

  // Operations
  if (result.operations) {
    lines.push('OPERATIONS');
    lines.push('─'.repeat(40));
    for (const op of result.operations) {
      const mutating = op.mutating ? '[MUTATING]' : '[READ-ONLY]';
      lines.push(`  ${op.name} ${mutating}`);
      lines.push(`    ${op.description}`);
      lines.push(`    Input:  ${op.inputType}`);
      lines.push(`    Output: ${op.outputType}`);
      if (Array.isArray(op.emittedEvents) && op.emittedEvents.length > 0) {
        lines.push(`    Events: ${(op.emittedEvents as string[]).join(', ')}`);
      }
      lines.push('');
    }
  }

  // Events
  if (result.events) {
    lines.push('EVENTS');
    lines.push('─'.repeat(40));
    for (const event of result.events) {
      lines.push(`  • ${event}`);
    }
    lines.push('');
  }

  // Error codes
  if (result.depth === 'full') {
    lines.push('ERROR CODES');
    lines.push('─'.repeat(40));
    for (const code of result.surface.errorCodes) {
      lines.push(`  • ${code}`);
    }
    lines.push('');
  }

  // Footer
  lines.push('═'.repeat(60));
  lines.push(`Inspection depth: ${result.depth}`);
  lines.push(`Execution ID: ${result.executionId}`);

  return lines.join('\n');
}

/**
 * Validates inspect command input
 */
export function validateInspectInput(input: unknown): input is ErpInspectInput {
  if (typeof input !== 'object' || input === null) {
    return false;
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.surfaceId !== 'string' || obj.surfaceId.length === 0) {
    return false;
  }

  if (obj.depth !== undefined) {
    const validDepths = ['summary', 'detailed', 'full'];
    if (typeof obj.depth !== 'string' || !validDepths.includes(obj.depth)) {
      return false;
    }
  }

  return true;
}
