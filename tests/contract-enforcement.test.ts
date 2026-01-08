/**
 * Contract Enforcement Tests
 *
 * These tests verify that:
 * 1. @agentics/contracts validation is strictly enforced
 * 2. Invalid payloads are rejected with 400 status
 * 3. No type coercion occurs
 * 4. No default values are injected
 * 5. Additional properties are rejected
 * 6. All responses include mandatory execution proof
 */

import {
  validateRequest,
  validateResponse,
  isValidRequest,
  ContractValidationError,
} from '@agentics/contracts';

describe('@agentics/contracts validation', () => {
  describe('Request validation', () => {
    describe('Valid requests', () => {
      it('accepts valid getSurface request', () => {
        const request = {
          action: 'getSurface',
          surfaceId: 'finance-general-ledger',
          input: {},
        };

        const validated = validateRequest(request);
        expect(validated.action).toBe('getSurface');
        expect(validated.surfaceId).toBe('finance-general-ledger');
      });

      it('accepts valid simulate request with operationId', () => {
        const request = {
          action: 'simulate',
          surfaceId: 'procurement-po',
          operationId: 'create-po-123',
          input: { vendorId: 'V001', amount: 1000 },
        };

        const validated = validateRequest(request);
        expect(validated.action).toBe('simulate');
        expect(validated.operationId).toBe('create-po-123');
      });

      it('accepts valid execute request', () => {
        const request = {
          action: 'execute',
          surfaceId: 'hcm-employee',
          input: { employeeId: 'E001' },
        };

        const validated = validateRequest(request);
        expect(validated.action).toBe('execute');
      });
    });

    describe('Strict validation - rejects invalid requests', () => {
      it('rejects null payload', () => {
        expect(() => validateRequest(null)).toThrow(ContractValidationError);
      });

      it('rejects undefined payload', () => {
        expect(() => validateRequest(undefined)).toThrow(ContractValidationError);
      });

      it('rejects missing required fields', () => {
        const request = { action: 'getSurface' };
        expect(() => validateRequest(request)).toThrow(ContractValidationError);
      });

      it('rejects invalid action value', () => {
        const request = {
          action: 'invalidAction',
          surfaceId: 'test',
          input: {},
        };
        expect(() => validateRequest(request)).toThrow(ContractValidationError);
      });

      it('rejects additional properties (strict mode)', () => {
        const request = {
          action: 'getSurface',
          surfaceId: 'test',
          input: {},
          extraField: 'not allowed',
        };
        expect(() => validateRequest(request)).toThrow(ContractValidationError);
      });

      it('rejects wrong type for surfaceId (no coercion)', () => {
        const request = {
          action: 'getSurface',
          surfaceId: 123, // Should be string, no coercion
          input: {},
        };
        expect(() => validateRequest(request)).toThrow(ContractValidationError);
      });

      it('rejects wrong type for input (no coercion)', () => {
        const request = {
          action: 'getSurface',
          surfaceId: 'test',
          input: 'not an object', // Should be object
        };
        expect(() => validateRequest(request)).toThrow(ContractValidationError);
      });

      it('rejects surfaceId not matching pattern', () => {
        const request = {
          action: 'getSurface',
          surfaceId: '123-invalid', // Must start with letter
          input: {},
        };
        expect(() => validateRequest(request)).toThrow(ContractValidationError);
      });

      it('rejects empty surfaceId', () => {
        const request = {
          action: 'getSurface',
          surfaceId: '',
          input: {},
        };
        expect(() => validateRequest(request)).toThrow(ContractValidationError);
      });
    });

    describe('Non-throwing validation', () => {
      it('isValidRequest returns true for valid request', () => {
        const request = {
          action: 'getSurface',
          surfaceId: 'test',
          input: {},
        };
        expect(isValidRequest(request)).toBe(true);
      });

      it('isValidRequest returns false for invalid request', () => {
        const request = { action: 'invalid' };
        expect(isValidRequest(request)).toBe(false);
      });

      it('isValidRequest returns false for null', () => {
        expect(isValidRequest(null)).toBe(false);
      });
    });
  });

  describe('Response validation', () => {
    describe('Valid responses with execution proof', () => {
      it('accepts response with layers_executed', () => {
        const response = {
          success: true,
          execution_id: '550e8400-e29b-41d4-a716-446655440000',
          layers_executed: ['http-boundary', 'validation', 'processing'],
          data: { result: 'test' },
        };

        const validated = validateResponse(response);
        expect(validated.success).toBe(true);
        expect(validated.execution_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      });

      it('accepts response with execution_graph', () => {
        const response = {
          success: true,
          execution_id: '550e8400-e29b-41d4-a716-446655440000',
          execution_graph: {
            nodes: [
              { id: 'node1', type: 'validation', status: 'completed' },
            ],
            edges: [],
          },
        };

        const validated = validateResponse(response);
        expect(validated.success).toBe(true);
      });

      it('accepts error response with layers_executed', () => {
        const response = {
          success: false,
          execution_id: '550e8400-e29b-41d4-a716-446655440000',
          layers_executed: ['http-boundary', 'validation-failed'],
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
          },
        };

        const validated = validateResponse(response);
        expect(validated.success).toBe(false);
      });
    });

    describe('Strict validation - rejects invalid responses', () => {
      it('rejects response without execution proof', () => {
        const response = {
          success: true,
          execution_id: '550e8400-e29b-41d4-a716-446655440000',
          // Missing both layers_executed and execution_graph
        };
        expect(() => validateResponse(response)).toThrow(ContractValidationError);
      });

      it('rejects response without execution_id', () => {
        const response = {
          success: true,
          layers_executed: ['test'],
          // Missing execution_id
        };
        expect(() => validateResponse(response)).toThrow(ContractValidationError);
      });

      it('rejects invalid execution_id format', () => {
        const response = {
          success: true,
          execution_id: 'not-a-uuid',
          layers_executed: ['test'],
        };
        expect(() => validateResponse(response)).toThrow(ContractValidationError);
      });

      it('rejects empty layers_executed array', () => {
        const response = {
          success: true,
          execution_id: '550e8400-e29b-41d4-a716-446655440000',
          layers_executed: [], // Must have minItems: 1
        };
        expect(() => validateResponse(response)).toThrow(ContractValidationError);
      });

      it('rejects additional properties', () => {
        const response = {
          success: true,
          execution_id: '550e8400-e29b-41d4-a716-446655440000',
          layers_executed: ['test'],
          extraField: 'not allowed',
        };
        expect(() => validateResponse(response)).toThrow(ContractValidationError);
      });

      it('rejects invalid execution_graph node status', () => {
        const response = {
          success: true,
          execution_id: '550e8400-e29b-41d4-a716-446655440000',
          execution_graph: {
            nodes: [
              { id: 'node1', type: 'test', status: 'invalid-status' },
            ],
            edges: [],
          },
        };
        expect(() => validateResponse(response)).toThrow(ContractValidationError);
      });
    });

    describe('No type coercion', () => {
      it('rejects success as string instead of boolean', () => {
        const response = {
          success: 'true', // Should be boolean, not string
          execution_id: '550e8400-e29b-41d4-a716-446655440000',
          layers_executed: ['test'],
        };
        expect(() => validateResponse(response)).toThrow(ContractValidationError);
      });

      it('rejects layers_executed as string instead of array', () => {
        const response = {
          success: true,
          execution_id: '550e8400-e29b-41d4-a716-446655440000',
          layers_executed: 'test', // Should be array
        };
        expect(() => validateResponse(response)).toThrow(ContractValidationError);
      });
    });
  });

  describe('ContractValidationError', () => {
    it('includes detailed error information', () => {
      const request = { action: 'invalid' };

      try {
        validateRequest(request);
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ContractValidationError);
        const error = e as ContractValidationError;
        expect(error.errors).toBeDefined();
        expect(error.errors.length).toBeGreaterThan(0);
        expect(error.errors[0]).toHaveProperty('instancePath');
        expect(error.errors[0]).toHaveProperty('keyword');
        expect(error.errors[0]).toHaveProperty('message');
      }
    });

    it('includes all errors when multiple violations', () => {
      const request = {}; // Missing all required fields

      try {
        validateRequest(request);
        fail('Should have thrown');
      } catch (e) {
        const error = e as ContractValidationError;
        // Should report multiple missing fields
        expect(error.errors.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});

describe('Contract enforcement guarantees', () => {
  describe('No defaults are injected', () => {
    it('does not add default values to request', () => {
      const request = {
        action: 'getSurface',
        surfaceId: 'test',
        input: {},
      };

      const validated = validateRequest(request);

      // Verify no extra properties were added
      expect(Object.keys(validated)).toEqual(['action', 'surfaceId', 'input']);
      expect(validated.operationId).toBeUndefined();
    });
  });

  describe('No silent fallbacks', () => {
    it('throws rather than falling back to default values', () => {
      // This would be a case where a permissive validator might
      // use a default action like 'getSurface' if not provided
      const request = {
        surfaceId: 'test',
        input: {},
        // Missing action - no fallback should occur
      };

      expect(() => validateRequest(request)).toThrow(ContractValidationError);
    });
  });

  describe('Strict pattern matching', () => {
    it('enforces surfaceId pattern ^[a-zA-Z][a-zA-Z0-9_-]*$', () => {
      const validIds = ['test', 'Test123', 'test_id', 'test-id', 'A'];
      const invalidIds = ['123test', '_test', '-test', '', 'test@id', 'test.id'];

      for (const id of validIds) {
        const request = { action: 'getSurface', surfaceId: id, input: {} };
        expect(() => validateRequest(request)).not.toThrow();
      }

      for (const id of invalidIds) {
        const request = { action: 'getSurface', surfaceId: id, input: {} };
        expect(() => validateRequest(request)).toThrow(ContractValidationError);
      }
    });
  });

  describe('Execution proof is mandatory', () => {
    it('response must have execution_id', () => {
      const response = {
        success: true,
        layers_executed: ['test'],
      };
      expect(() => validateResponse(response)).toThrow(ContractValidationError);
    });

    it('response must have layers_executed OR execution_graph', () => {
      const response = {
        success: true,
        execution_id: '550e8400-e29b-41d4-a716-446655440000',
      };
      expect(() => validateResponse(response)).toThrow(ContractValidationError);
    });

    it('execution_id must be valid UUID format', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '00000000-0000-0000-0000-000000000000',
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      ];
      const invalidUuids = [
        'not-a-uuid',
        '550e8400-e29b-41d4-a716', // Too short
        '550e8400e29b41d4a716446655440000', // No dashes
        'GGGGGGGG-GGGG-GGGG-GGGG-GGGGGGGGGGGG', // Invalid hex
      ];

      for (const uuid of validUuids) {
        const response = {
          success: true,
          execution_id: uuid,
          layers_executed: ['test'],
        };
        expect(() => validateResponse(response)).not.toThrow();
      }

      for (const uuid of invalidUuids) {
        const response = {
          success: true,
          execution_id: uuid,
          layers_executed: ['test'],
        };
        expect(() => validateResponse(response)).toThrow(ContractValidationError);
      }
    });
  });
});
