/**
 * ERP Export Command
 *
 * Generates integration artifacts with external system impact.
 * Includes integrity verification and data sensitivity classification.
 *
 * @module commands/erp/export
 */

import { createHash } from 'crypto';
import { registry, type RegistryEntry } from '../../registry';
import type {
  ErpExportInput,
  ErpExportResult,
  ErpCommandError,
} from './types';
import { ERP_ERROR_CODES } from './types';
import {
  buildExportDecisionPacket,
  generateExecutionId,
} from './synthesis-helpers';

/**
 * Executes the erp export command
 *
 * Generates integration artifacts for ERP surfaces in various formats.
 * Includes Decision Packet with data sensitivity classification and
 * export integrity verification.
 *
 * @param input - Export command input
 * @returns Export result with Decision Packet
 * @throws ErpCommandError if surface not found or export fails
 */
export async function executeErpExport(
  input: ErpExportInput
): Promise<ErpExportResult> {
  const executionId = generateExecutionId();
  const timestamp = new Date().toISOString();

  // Collect surfaces to export
  const surfaces: RegistryEntry[] = [];

  if (input.includeDomain) {
    // Get all surfaces in the domain
    const surfaceEntry = registry.get(input.surfaceId);
    if (surfaceEntry) {
      const domainSurfaces = registry.getByDomain(surfaceEntry.domain);
      surfaces.push(...domainSurfaces);
    }
  } else {
    // Get single surface
    const surface = registry.get(input.surfaceId);
    if (surface) {
      surfaces.push(surface);
    }
  }

  if (surfaces.length === 0) {
    const error: ErpCommandError = {
      code: ERP_ERROR_CODES.SURFACE_NOT_FOUND,
      message: `Surface '${input.surfaceId}' not found in registry`,
      surfaceId: input.surfaceId,
    };
    throw error;
  }

  // Generate export content
  const content = generateExportContent(surfaces, input.format, input.includeAdapters);

  // Calculate integrity hash
  const integrityHash = calculateIntegrityHash(content);

  // Build Decision Packet with synthesis
  const decisionPacket = buildExportDecisionPacket(input, surfaces);

  // Check for sensitive data in export
  if (decisionPacket.dataSensitivity.overallSensitivity === 'restricted') {
    // Add warning to synthesis but don't block
    console.warn(
      `WARNING: Export contains restricted data (${decisionPacket.dataSensitivity.sensitiveFields.length} sensitive fields)`
    );
  }

  return {
    success: true,
    timestamp,
    executionId,
    surfaces,
    format: input.format,
    outputPath: input.outputPath,
    content: input.outputPath ? undefined : content,
    integrityHash,
    decisionPacket,
  };
}

/**
 * Generates export content in the specified format
 */
function generateExportContent(
  surfaces: RegistryEntry[],
  format: ErpExportInput['format'],
  includeAdapters?: boolean
): string {
  const exportData = {
    exportVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    surfaces: surfaces.map(surface => ({
      surfaceId: surface.surfaceId,
      name: surface.name,
      version: surface.version,
      domain: surface.domain,
      description: surface.description,
      operations: surface.operations.map(op => ({
        name: op.name,
        description: op.description,
        inputType: op.inputType,
        outputType: op.outputType,
        mutating: op.mutating,
        emittedEvents: op.emittedEvents,
      })),
      events: surface.events,
      errorCodes: surface.errorCodes,
      ...(includeAdapters && { vendorCoverage: surface.vendorCoverage }),
    })),
  };

  switch (format) {
    case 'json':
      return JSON.stringify(exportData, null, 2);

    case 'yaml':
      return convertToYaml(exportData);

    case 'openapi':
      return generateOpenApiSpec(surfaces);

    case 'graphql':
      return generateGraphQLSchema(surfaces);

    case 'protobuf':
      return generateProtobufSchema(surfaces);

    default:
      return JSON.stringify(exportData, null, 2);
  }
}

/**
 * Simple YAML converter
 */
function convertToYaml(obj: unknown, indent: number = 0): string {
  const spaces = '  '.repeat(indent);

  if (obj === null || obj === undefined) {
    return 'null';
  }

  if (typeof obj === 'string') {
    return obj.includes('\n') ? `|\n${spaces}  ${obj.split('\n').join(`\n${spaces}  `)}` : obj;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map(item => `${spaces}- ${convertToYaml(item, indent + 1).trimStart()}`).join('\n');
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';
    return entries
      .map(([key, value]) => {
        const yamlValue = convertToYaml(value, indent + 1);
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `${spaces}${key}:\n${yamlValue}`;
        }
        return `${spaces}${key}: ${yamlValue}`;
      })
      .join('\n');
  }

  return String(obj);
}

/**
 * Generates OpenAPI specification
 */
function generateOpenApiSpec(surfaces: RegistryEntry[]): string {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'ERP Surface API',
      version: '1.0.0',
      description: 'Auto-generated OpenAPI specification for ERP surfaces',
    },
    paths: {} as Record<string, unknown>,
    components: {
      schemas: {} as Record<string, unknown>,
    },
  };

  for (const surface of surfaces) {
    for (const op of surface.operations) {
      const path = `/${surface.domain}/${surface.surfaceId.split('.')[1]}/${op.name}`;
      spec.paths[path] = {
        post: {
          operationId: op.name,
          summary: op.description,
          tags: [surface.domain],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${op.inputType}` },
              },
            },
          },
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: { $ref: `#/components/schemas/${op.outputType}` },
                },
              },
            },
          },
        },
      };

      // Add schema placeholders
      spec.components.schemas[op.inputType] = { type: 'object' };
      spec.components.schemas[op.outputType] = { type: 'object' };
    }
  }

  return JSON.stringify(spec, null, 2);
}

/**
 * Generates GraphQL schema
 */
function generateGraphQLSchema(surfaces: RegistryEntry[]): string {
  const lines: string[] = ['# Auto-generated GraphQL schema for ERP surfaces', ''];

  for (const surface of surfaces) {
    lines.push(`# ${surface.name} - ${surface.description}`);

    for (const op of surface.operations) {
      // Generate type definitions for operations
      lines.push(`input ${op.inputType} {`);
      lines.push('  # TODO: Add input fields');
      lines.push('}');
      lines.push('');
      lines.push(`type ${op.outputType} {`);
      lines.push('  # TODO: Add output fields');
      lines.push('}');
      lines.push('');
    }
  }

  lines.push('type Query {');
  for (const surface of surfaces) {
    for (const op of surface.operations) {
      if (!op.mutating) {
        lines.push(`  ${op.name}(input: ${op.inputType}!): ${op.outputType}!`);
      }
    }
  }
  lines.push('}');
  lines.push('');

  lines.push('type Mutation {');
  for (const surface of surfaces) {
    for (const op of surface.operations) {
      if (op.mutating) {
        lines.push(`  ${op.name}(input: ${op.inputType}!): ${op.outputType}!`);
      }
    }
  }
  lines.push('}');

  return lines.join('\n');
}

/**
 * Generates Protobuf schema
 */
function generateProtobufSchema(surfaces: RegistryEntry[]): string {
  const lines: string[] = [
    'syntax = "proto3";',
    '',
    'package erp.surface;',
    '',
    '// Auto-generated Protobuf schema for ERP surfaces',
    '',
  ];

  for (const surface of surfaces) {
    lines.push(`// ${surface.name}`);

    for (const op of surface.operations) {
      lines.push(`message ${op.inputType} {`);
      lines.push('  // TODO: Add input fields');
      lines.push('}');
      lines.push('');
      lines.push(`message ${op.outputType} {`);
      lines.push('  // TODO: Add output fields');
      lines.push('}');
      lines.push('');
    }

    lines.push(`service ${surface.name.replace(/Surface$/, '')}Service {`);
    for (const op of surface.operations) {
      lines.push(`  rpc ${op.name}(${op.inputType}) returns (${op.outputType});`);
    }
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Calculates SHA-256 integrity hash for export content
 */
function calculateIntegrityHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Validates export command input
 */
export function validateExportInput(input: unknown): input is ErpExportInput {
  if (typeof input !== 'object' || input === null) {
    return false;
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.surfaceId !== 'string' || obj.surfaceId.length === 0) {
    return false;
  }

  const validFormats = ['json', 'yaml', 'openapi', 'graphql', 'protobuf'];
  if (typeof obj.format !== 'string' || !validFormats.includes(obj.format)) {
    return false;
  }

  return true;
}
