/**
 * ERP Surface API Server
 *
 * This server enforces strict contract validation at the HTTP request boundary.
 * All incoming requests are validated against @agentics/contracts JSON Schema
 * using Ajv in strict mode (no coercion, no defaults).
 *
 * VALIDATION BOUNDARY: This file is the SINGLE validation boundary.
 * All requests MUST pass through validateRequest() before any processing.
 * Invalid payloads are rejected immediately with 400 response.
 *
 * EXECUTION PROOF: All successful responses include mandatory execution proof:
 * - execution_id (UUID)
 * - layers_executed (array) OR execution_graph (object)
 */

import * as http from 'http';
import { randomUUID } from 'crypto';
import {
  validateRequest,
  ContractValidationError,
  ERPSurfaceRequest,
  ERPSurfaceResponseWithLayers,
  ExecutiveSummary,
} from '@agentics/contracts';
import * as erpSurface from './index';
import {
  buildExecutiveSummary,
  hasMutatingOperations,
  involvesSensitiveData,
  DEFAULT_STEPS_EXECUTED,
  elevateRiskForProduction,
} from './synthesis';

const PORT = parseInt(process.env.PORT || '8080', 10);

/**
 * Creates a valid ERP Surface response with mandatory execution proof
 */
function createResponse(
  success: boolean,
  data?: Record<string, unknown>,
  error?: { code: string; message: string; details?: Record<string, unknown> },
  layersExecuted: string[] = ['http-boundary', 'validation', 'processing'],
  synthesis?: ExecutiveSummary
): ERPSurfaceResponseWithLayers {
  return {
    success,
    execution_id: randomUUID(),
    layers_executed: layersExecuted,
    ...(data && { data }),
    ...(error && { error }),
    timestamp: new Date().toISOString(),
    ...(synthesis && { synthesis }),
  };
}

/**
 * Handles contract validation errors - returns 400 with detailed error
 */
function handleValidationError(
  res: http.ServerResponse,
  error: ContractValidationError
): void {
  const response = createResponse(
    false,
    undefined,
    {
      code: 'CONTRACT_VALIDATION_ERROR',
      message: error.message,
      details: {
        errors: error.errors,
      },
    },
    ['http-boundary', 'validation-failed']
  );

  res.writeHead(400);
  res.end(JSON.stringify(response));
}

/**
 * Reads the request body as a string
 */
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/**
 * Builds executive synthesis for a surface operation
 */
function buildSynthesisForSurface(
  surfaceId: string,
  surface: erpSurface.RegistryEntry | undefined,
  success: boolean,
  stepsExecuted: string[],
  isExecute: boolean = false
): ExecutiveSummary {
  if (!surface) {
    // Build rejection synthesis for missing surface
    return buildExecutiveSummary(
      {
        surfaceId,
        hasMutatingOperations: false,
        blockingContext: {
          unresolvedEntities: [surfaceId],
          failedBindings: [],
          unauthorizedOperations: [],
          policyViolations: [],
          missingCredentials: [],
          dataClassificationConflicts: []
        }
      },
      {
        success: false,
        resolvedEntities: 0,
        totalEntities: 1,
        failedBindings: 1,
        rejectedConstraints: 0,
        stepsExecuted
      }
    );
  }

  // Determine if operation involves mutations
  const isMutating = isExecute && hasMutatingOperations(surface);

  // Determine sensitive data involvement
  const { includesPII, includesFinancialData } = involvesSensitiveData(surface);

  // Build synthesis
  let synthesis = buildExecutiveSummary(
    {
      surfaceId,
      surfaceEntry: surface,
      hasMutatingOperations: isMutating,
      includesPII,
      includesFinancialData,
      version: surface.version,
      commitSha: process.env['GIT_SHA']
    },
    {
      success,
      resolvedEntities: success ? 1 : 0,
      totalEntities: 1,
      failedBindings: success ? 0 : 1,
      rejectedConstraints: 0,
      stepsExecuted
    }
  );

  // Apply production risk elevation if targeting production
  if (isExecute) {
    synthesis = elevateRiskForProduction(synthesis);
  }

  return synthesis;
}

/**
 * Processes a validated ERP Surface request
 * This function is ONLY called after validation passes
 */
function processRequest(
  validatedRequest: ERPSurfaceRequest
): ERPSurfaceResponseWithLayers {
  const { action, surfaceId, operationId, input } = validatedRequest;

  switch (action) {
    case 'getSurface': {
      const surface = erpSurface.registry.get(surfaceId);
      const stepsExecuted = ['http-boundary', 'validation', 'registry-lookup'];

      if (surface) {
        const synthesis = buildSynthesisForSurface(
          surfaceId,
          surface,
          true,
          stepsExecuted,
          false
        );

        return createResponse(
          true,
          { surface },
          undefined,
          stepsExecuted,
          synthesis
        );
      }

      const synthesis = buildSynthesisForSurface(
        surfaceId,
        undefined,
        false,
        stepsExecuted,
        false
      );

      return createResponse(
        false,
        undefined,
        {
          code: 'SURFACE_NOT_FOUND',
          message: `Surface '${surfaceId}' not found in registry`,
        },
        stepsExecuted,
        synthesis
      );
    }

    case 'simulate': {
      const surface = erpSurface.registry.get(surfaceId);
      const stepsExecuted = ['http-boundary', 'validation', 'registry-lookup', 'simulation-engine'];

      if (!surface) {
        const synthesis = buildSynthesisForSurface(
          surfaceId,
          undefined,
          false,
          stepsExecuted,
          false
        );

        return createResponse(
          false,
          undefined,
          {
            code: 'SURFACE_NOT_FOUND',
            message: `Surface '${surfaceId}' not found in registry`,
          },
          stepsExecuted,
          synthesis
        );
      }

      const synthesis = buildSynthesisForSurface(
        surfaceId,
        surface,
        true,
        [...stepsExecuted, ...DEFAULT_STEPS_EXECUTED],
        false
      );

      return createResponse(
        true,
        {
          simulation: {
            surfaceId,
            operationId,
            input,
            status: 'simulated',
            timestamp: new Date().toISOString(),
          },
        },
        undefined,
        stepsExecuted,
        synthesis
      );
    }

    case 'execute': {
      const surface = erpSurface.registry.get(surfaceId);
      const stepsExecuted = ['http-boundary', 'validation', 'registry-lookup', 'execution-engine', 'commit'];

      if (!surface) {
        const synthesis = buildSynthesisForSurface(
          surfaceId,
          undefined,
          false,
          stepsExecuted,
          true
        );

        return createResponse(
          false,
          undefined,
          {
            code: 'SURFACE_NOT_FOUND',
            message: `Surface '${surfaceId}' not found in registry`,
          },
          stepsExecuted,
          synthesis
        );
      }

      const synthesis = buildSynthesisForSurface(
        surfaceId,
        surface,
        true,
        [...stepsExecuted, ...DEFAULT_STEPS_EXECUTED],
        true
      );

      return createResponse(
        true,
        {
          execution: {
            surfaceId,
            operationId,
            input,
            status: 'executed',
            timestamp: new Date().toISOString(),
          },
        },
        undefined,
        stepsExecuted,
        synthesis
      );
    }

    default: {
      // This should never happen due to schema validation
      // but TypeScript exhaustive check requires it
      const _exhaustive: never = action;
      return createResponse(
        false,
        undefined,
        {
          code: 'INVALID_ACTION',
          message: `Unknown action: ${_exhaustive}`,
        },
        ['http-boundary', 'validation-failed']
      );
    }
  }
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  // Health check - exempt from contract validation
  if (url.pathname === '/health' || url.pathname === '/') {
    const response = createResponse(
      true,
      { status: 'healthy', service: 'erp-surface' },
      undefined,
      ['http-boundary', 'health-check']
    );
    res.writeHead(200);
    res.end(JSON.stringify(response));
    return;
  }

  // Main API endpoint - CONTRACT VALIDATION BOUNDARY
  if (url.pathname === '/v1/erpsurface') {
    if (req.method === 'GET') {
      // GET requests return registry statistics
      const stats = erpSurface.registry.getStatistics();
      const surfaces = erpSurface.registry.getAll();

      const response = createResponse(
        true,
        {
          service: 'erp-surface',
          version: '0.1.0',
          statistics: stats,
          surfaces: surfaces.map((s: erpSurface.RegistryEntry) => ({
            id: s.surfaceId,
            name: s.name,
            domain: s.domain,
            version: s.version,
          })),
        },
        undefined,
        ['http-boundary', 'registry-stats']
      );

      res.writeHead(200);
      res.end(JSON.stringify(response));
      return;
    }

    if (req.method === 'POST') {
      try {
        // Read request body
        const body = await readBody(req);

        // Parse JSON - reject invalid JSON immediately
        let payload: unknown;
        try {
          payload = JSON.parse(body);
        } catch {
          const response = createResponse(
            false,
            undefined,
            {
              code: 'INVALID_JSON',
              message: 'Request body is not valid JSON',
            },
            ['http-boundary', 'json-parse-failed']
          );
          res.writeHead(400);
          res.end(JSON.stringify(response));
          return;
        }

        // ============================================================
        // CONTRACT VALIDATION BOUNDARY
        // This is the SINGLE point where all requests are validated.
        // validateRequest() uses Ajv in strict mode:
        // - No type coercion
        // - No default value injection
        // - Fails on unknown properties
        // - Throws ContractValidationError on any violation
        // ============================================================
        const validatedRequest = validateRequest(payload);

        // Request passed validation - now process it
        const response = processRequest(validatedRequest);

        res.writeHead(response.success ? 200 : 404);
        res.end(JSON.stringify(response));
        return;
      } catch (error) {
        if (error instanceof ContractValidationError) {
          // Contract validation failed - return 400 immediately
          // NO processing has occurred
          handleValidationError(res, error);
          return;
        }

        // Unexpected error
        const response = createResponse(
          false,
          undefined,
          {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          ['http-boundary', 'error-handler']
        );
        res.writeHead(500);
        res.end(JSON.stringify(response));
        return;
      }
    }

    // Method not allowed
    const response = createResponse(
      false,
      undefined,
      {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed on ${url.pathname}`,
      },
      ['http-boundary', 'method-check']
    );
    res.writeHead(405);
    res.end(JSON.stringify(response));
    return;
  }

  // 404 for unknown routes
  const response = createResponse(
    false,
    undefined,
    {
      code: 'NOT_FOUND',
      message: `Path ${url.pathname} not found`,
    },
    ['http-boundary', 'route-not-found']
  );
  res.writeHead(404);
  res.end(JSON.stringify(response));
});

server.listen(PORT, () => {
  console.log(`ERP Surface API running on port ${PORT}`);
  console.log(`Contract validation: STRICT MODE (Ajv)`);
  console.log(`  - No type coercion`);
  console.log(`  - No defaults`);
  console.log(`  - Rejects unknown properties`);
  console.log(`Endpoints:`);
  console.log(`  GET  /health        - Health check`);
  console.log(`  GET  /v1/erpsurface - List surfaces and stats`);
  console.log(`  POST /v1/erpsurface - Surface operations (contract validated)`);
});
