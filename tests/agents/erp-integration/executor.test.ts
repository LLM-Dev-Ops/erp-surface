/**
 * ERP Integration Agent Tests
 *
 * Comprehensive test suite for the ERP Integration Agent.
 *
 * @module tests/agents/erp-integration/executor.test
 */

import {
  execute,
  dryRun,
  validateInput,
  isValidInput,
  calculateConfidence,
  mapToErpPayload,
  mapFromErpResponse,
  buildConstraints,
  AGENT_ID,
  AGENT_VERSION,
  DECISION_TYPE,
  type ErpIntegrationInput,
  type ConfidenceContext,
  type IntegrationOutcome,
} from '../../../src/agents/erp-integration';

// Set simulation mode for tests
beforeAll(() => {
  process.env['ERP_SURFACE_MODE'] = 'simulation';
});

afterAll(() => {
  delete process.env['ERP_SURFACE_MODE'];
});

// =============================================================================
// TEST FIXTURES
// =============================================================================

const validInput: ErpIntegrationInput = {
  requestId: '123e4567-e89b-12d3-a456-426614174000',
  correlationId: 'test-correlation-001',
  operation: 'push',
  target: {
    vendor: 'sap',
    domain: 'finance',
    entityType: 'JournalEntry',
    environment: 'sandbox',
  },
  payload: {
    id: 'JE-001',
    companyCode: 'C001',
    amount: 1000,
    currency: 'USD',
    postingDate: '2024-01-15',
  },
  dryRun: false,
  timeoutMs: 30000,
};

// =============================================================================
// CONTRACT TESTS
// =============================================================================

describe('ERP Integration Agent Contract', () => {
  it('should have correct agent identity', () => {
    expect(AGENT_ID).toBe('erp-integration-agent');
    expect(AGENT_VERSION).toBe('1.0.0');
    expect(DECISION_TYPE).toBe('erp_integration');
  });
});

// =============================================================================
// INPUT VALIDATION TESTS
// =============================================================================

describe('Input Validation', () => {
  it('should validate correct input', () => {
    const result = validateInput(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass type guard for valid input', () => {
    expect(isValidInput(validInput)).toBe(true);
  });

  it('should reject null input', () => {
    const result = validateInput(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject missing requestId', () => {
    const input = { ...validInput, requestId: undefined };
    const result = validateInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'requestId')).toBe(true);
  });

  it('should reject invalid operation', () => {
    const input = { ...validInput, operation: 'invalid' as const };
    const result = validateInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'operation')).toBe(true);
  });

  it('should reject invalid vendor', () => {
    const input = {
      ...validInput,
      target: { ...validInput.target, vendor: 'invalid' as const },
    };
    const result = validateInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'target.vendor')).toBe(true);
  });

  it('should reject invalid domain', () => {
    const input = {
      ...validInput,
      target: { ...validInput.target, domain: 'invalid' as const },
    };
    const result = validateInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'target.domain')).toBe(true);
  });

  it('should require payload for push operation', () => {
    const input = { ...validInput, payload: undefined, artifact: undefined };
    const result = validateInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'payload')).toBe(true);
  });

  it('should require query for pull operation', () => {
    const input = { ...validInput, operation: 'pull' as const, query: undefined };
    const result = validateInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'query')).toBe(true);
  });

  it('should validate timeout range', () => {
    const input = { ...validInput, timeoutMs: 500 }; // Too low
    const result = validateInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'timeoutMs')).toBe(true);
  });
});

// =============================================================================
// MAPPING TESTS
// =============================================================================

describe('ERP Mapping', () => {
  it('should map payload to SAP format', () => {
    const payload = {
      companyCode: 'C001',
      fiscalYear: '2024',
      amount: 1000,
    };

    const mapped = mapToErpPayload(payload, validInput.target);

    expect(mapped['BUKRS']).toBe('C001');
    expect(mapped['GJAHR']).toBe('2024');
    expect(mapped['DMBTR']).toBe(100000); // SAP stores in cents
    expect(mapped['_erp_metadata']).toBeDefined();
  });

  it('should map dates to vendor format', () => {
    const payload = {
      postingDate: '2024-01-15T00:00:00.000Z',
    };

    const mapped = mapToErpPayload(payload, validInput.target);
    expect(mapped['BUDAT']).toBe('20240115'); // SAP format
  });

  it('should include ERP metadata', () => {
    const mapped = mapToErpPayload({ id: '001' }, validInput.target);

    const metadata = mapped['_erp_metadata'] as Record<string, unknown>;
    expect(metadata.vendor).toBe('sap');
    expect(metadata.domain).toBe('finance');
    expect(metadata.entityType).toBe('JournalEntry');
  });

  it('should map from ERP response back to Agentics format', () => {
    const erpResponse = {
      BUKRS: 'C001',
      DMBTR: 100000,
      WAERS: 'USD',
    };

    const mapped = mapFromErpResponse(erpResponse, validInput.target);

    expect(mapped['companyCode']).toBe('C001');
    expect(mapped['amount']).toBe(100000);
    expect(mapped['currency']).toBe('USD');
  });
});

// =============================================================================
// CONFIDENCE CALCULATION TESTS
// =============================================================================

describe('Confidence Calculation', () => {
  it('should return 0 for failed status', () => {
    const context: ConfidenceContext = {
      input: validInput,
      outcome: createOutcome(0, 0, 1),
      status: 'failed',
      schemaValid: true,
      dataCompleteness: 1.0,
      hasWarnings: false,
    };

    expect(calculateConfidence(context)).toBe(0);
  });

  it('should return high confidence for success', () => {
    const context: ConfidenceContext = {
      input: validInput,
      outcome: createOutcome(10, 10, 0),
      status: 'success',
      schemaValid: true,
      dataCompleteness: 1.0,
      hasWarnings: false,
    };

    const confidence = calculateConfidence(context);
    expect(confidence).toBeGreaterThan(0.8);
  });

  it('should cap partial success at 0.79', () => {
    const context: ConfidenceContext = {
      input: validInput,
      outcome: createOutcome(10, 5, 5),
      status: 'partial_success',
      schemaValid: true,
      dataCompleteness: 0.5,
      hasWarnings: false,
    };

    const confidence = calculateConfidence(context);
    expect(confidence).toBeLessThanOrEqual(0.79);
  });

  it('should reduce confidence for warnings', () => {
    const noWarnings: ConfidenceContext = {
      input: validInput,
      outcome: createOutcome(1, 1, 0),
      status: 'success',
      schemaValid: true,
      dataCompleteness: 1.0,
      hasWarnings: false,
    };

    const withWarnings: ConfidenceContext = {
      ...noWarnings,
      hasWarnings: true,
    };

    expect(calculateConfidence(noWarnings)).toBeGreaterThan(calculateConfidence(withWarnings));
  });

  it('should consider environment in confidence', () => {
    const sandbox: ConfidenceContext = {
      input: validInput,
      outcome: createOutcome(1, 1, 0),
      status: 'success',
      schemaValid: true,
      dataCompleteness: 1.0,
      hasWarnings: false,
    };

    const production: ConfidenceContext = {
      ...sandbox,
      input: {
        ...validInput,
        target: { ...validInput.target, environment: 'production' },
      },
    };

    // Production should have slightly lower confidence due to inherent risk
    expect(calculateConfidence(sandbox)).toBeGreaterThan(calculateConfidence(production));
  });
});

// =============================================================================
// CONSTRAINT BUILDING TESTS
// =============================================================================

describe('Constraint Building', () => {
  it('should build basic constraints', () => {
    const constraints = buildConstraints(validInput);

    expect(constraints).toContain('erp_system:sap');
    expect(constraints).toContain('domain:finance');
    expect(constraints).toContain('entity_type:JournalEntry');
    expect(constraints).toContain('environment:sandbox');
    expect(constraints).toContain('operation:push');
  });

  it('should include dry_run mode', () => {
    const input = { ...validInput, dryRun: true };
    const constraints = buildConstraints(input);

    expect(constraints).toContain('mode:dry_run');
  });

  it('should include artifact source', () => {
    const input: ErpIntegrationInput = {
      ...validInput,
      artifact: {
        source: 'agentics-dev-platform',
        artifactId: 'ART-001',
        governanceApprovalRef: 'GOV-001',
      },
    };
    const constraints = buildConstraints(input);

    expect(constraints).toContain('artifact_source:agentics-dev-platform');
    expect(constraints).toContain('governance_approval:GOV-001');
  });
});

// =============================================================================
// EXECUTION TESTS
// =============================================================================

describe('Execution', () => {
  it('should execute push operation successfully', async () => {
    const result = await execute(validInput);

    expect(result.success).toBe(true);
    expect(result.output.agentId).toBe(AGENT_ID);
    expect(result.output.agentVersion).toBe(AGENT_VERSION);
    expect(result.output.status).toBe('success');
    expect(result.output.outcome.recordsProcessed).toBe(1);
    expect(result.output.outcome.recordsSucceeded).toBe(1);
  });

  it('should execute dry run', async () => {
    const result = await dryRun(validInput);

    expect(result.success).toBe(true);
    // Dry run in simulation mode returns success with warnings
    expect(['success', 'skipped']).toContain(result.output.status);
    expect(result.output.constraintsApplied).toContain('mode:dry_run');
    // Dry run should have warning about dry run mode
    const hasWarning = result.output.outcome.transmissions.some(
      t => t.warnings?.some(w => w.includes('Dry run'))
    );
    expect(hasWarning).toBe(true);
  });

  it('should execute validate operation', async () => {
    const validateInput: ErpIntegrationInput = {
      ...validInput,
      operation: 'validate',
    };

    const result = await execute(validateInput);

    expect(result.success).toBe(true);
    expect(result.output.outcome.recordsProcessed).toBe(1);
  });

  it('should execute inspect operation', async () => {
    const inspectInput: ErpIntegrationInput = {
      ...validInput,
      operation: 'inspect',
      payload: undefined,
    };

    const result = await execute(inspectInput);

    expect(result.success).toBe(true);
    expect(result.output.outcome.recordsProcessed).toBe(1);
  });

  it('should emit DecisionEvent', async () => {
    const result = await execute(validInput);

    expect(result.decisionEvent).toBeDefined();
    expect(result.decisionEvent?.agent_id).toBe(AGENT_ID);
    expect(result.decisionEvent?.decision_type).toBe(DECISION_TYPE);
    expect(result.decisionEvent?.inputs_hash).toBeDefined();
  });

  it('should handle validation failure', async () => {
    const invalidInput = { ...validInput, requestId: undefined as unknown as string };
    const result = await execute(invalidInput);

    expect(result.success).toBe(false);
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors!.length).toBeGreaterThan(0);
  });

  it('should fail for invalid entity type', async () => {
    const input: ErpIntegrationInput = {
      ...validInput,
      target: {
        ...validInput.target,
        entityType: 'InvalidEntity',
      },
    };

    const result = await execute(input);

    expect(result.output.outcome.recordsFailed).toBe(1);
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createOutcome(
  processed: number,
  succeeded: number,
  failed: number
): IntegrationOutcome {
  const transmissions = [];

  for (let i = 0; i < succeeded; i++) {
    transmissions.push({
      sourceRecordId: `success-${i}`,
      targetRecordId: `target-${i}`,
      success: true,
    });
  }

  for (let i = 0; i < failed; i++) {
    transmissions.push({
      sourceRecordId: `failed-${i}`,
      success: false,
      error: 'Test failure',
    });
  }

  return {
    recordsProcessed: processed,
    recordsSucceeded: succeeded,
    recordsFailed: failed,
    transmissions,
  };
}
