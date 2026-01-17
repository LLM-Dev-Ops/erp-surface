/**
 * ERP List Command
 *
 * Read-only enumeration of ERP surfaces.
 * EXPLICITLY EXCLUDED from synthesis - no Decision Packet generated.
 *
 * @module commands/erp/list
 */

import { registry, type RegistryEntry } from '../../registry';
import { randomUUID } from 'crypto';
import type { ErpListInput, ErpListResult } from './types';

/**
 * Executes the erp list command
 *
 * Lists ERP surfaces from the registry with optional filtering.
 * This is a READ-ONLY command and does NOT generate synthesis.
 *
 * @param input - List command input
 * @returns List result WITHOUT Decision Packet
 */
export async function executeErpList(
  input: ErpListInput = {}
): Promise<ErpListResult> {
  const executionId = randomUUID();
  const timestamp = new Date().toISOString();

  let surfaces: RegistryEntry[];

  // Apply filters
  if (input.domain) {
    surfaces = registry.getByDomain(input.domain);
  } else if (input.vendor) {
    surfaces = registry.getByVendor(input.vendor);
  } else {
    surfaces = registry.getAll();
  }

  // Filter deprecated if requested
  if (!input.includeDeprecated) {
    surfaces = surfaces.filter(s => !s.deprecation?.deprecated);
  }

  // Build filter info for result
  const filter = (input.domain || input.vendor)
    ? {
        ...(input.domain && { domain: input.domain }),
        ...(input.vendor && { vendor: input.vendor }),
      }
    : undefined;

  return {
    success: true,
    timestamp,
    executionId,
    surfaces,
    totalCount: surfaces.length,
    filter,
  };
}

/**
 * Formats list result for display
 */
export function formatListResult(
  result: ErpListResult,
  format: ErpListInput['format'] = 'table'
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(result, null, 2);

    case 'yaml':
      return formatAsYaml(result);

    case 'table':
    default:
      return formatAsTable(result);
  }
}

/**
 * Formats result as ASCII table
 */
function formatAsTable(result: ErpListResult): string {
  const lines: string[] = [];

  // Header
  lines.push('╔════════════════════════════════════╦════════════════════╦══════════╦═════════╗');
  lines.push('║ Surface ID                         ║ Domain             ║ Version  ║ Vendors ║');
  lines.push('╠════════════════════════════════════╬════════════════════╬══════════╬═════════╣');

  for (const surface of result.surfaces) {
    const vendors = Object.entries(surface.vendorCoverage)
      .filter(([_, supported]) => supported)
      .map(([vendor, _]) => vendor.substring(0, 3).toUpperCase())
      .join(',');

    const id = surface.surfaceId.padEnd(34);
    const domain = surface.domain.padEnd(18);
    const version = surface.version.padEnd(8);
    const vendorStr = vendors.substring(0, 7).padEnd(7);

    lines.push(`║ ${id} ║ ${domain} ║ ${version} ║ ${vendorStr} ║`);
  }

  lines.push('╚════════════════════════════════════╩════════════════════╩══════════╩═════════╝');
  lines.push(`Total: ${result.totalCount} surface(s)`);

  if (result.filter) {
    const filterStr = Object.entries(result.filter)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    lines.push(`Filter: ${filterStr}`);
  }

  return lines.join('\n');
}

/**
 * Formats result as YAML
 */
function formatAsYaml(result: ErpListResult): string {
  const lines: string[] = [
    `success: ${result.success}`,
    `timestamp: ${result.timestamp}`,
    `executionId: ${result.executionId}`,
    `totalCount: ${result.totalCount}`,
    'surfaces:',
  ];

  for (const surface of result.surfaces) {
    lines.push(`  - surfaceId: ${surface.surfaceId}`);
    lines.push(`    name: ${surface.name}`);
    lines.push(`    domain: ${surface.domain}`);
    lines.push(`    version: ${surface.version}`);
    lines.push(`    operations: ${surface.operations.length}`);
  }

  return lines.join('\n');
}

/**
 * Validates list command input
 */
export function validateListInput(input: unknown): input is ErpListInput {
  if (input === undefined || input === null) {
    return true; // All fields optional
  }

  if (typeof input !== 'object') {
    return false;
  }

  const obj = input as Record<string, unknown>;

  if (obj.domain !== undefined) {
    const validDomains = ['finance', 'procurement', 'hcm', 'supply-chain', 'customer', 'service'];
    if (typeof obj.domain !== 'string' || !validDomains.includes(obj.domain)) {
      return false;
    }
  }

  if (obj.vendor !== undefined) {
    const validVendors = ['sap', 'oracle', 'salesforce', 'workday', 'dynamics', 'netsuite', 'servicenow'];
    if (typeof obj.vendor !== 'string' || !validVendors.includes(obj.vendor)) {
      return false;
    }
  }

  return true;
}
