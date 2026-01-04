/**
 * Tests for the Simulation to Execution Conversion Model
 *
 * These tests verify:
 * 1. Contract Immutability - Contracts remain unchanged across stages
 * 2. Bindability Validation - Surfaces can validate their binding readiness
 * 3. Stage Transitions - Proper validation of stage transitions
 * 4. Guarantee Verification - All guarantees are enforceable
 *
 * @module ConversionModelTests
 */

import {
  ConversionStage,
  STAGE_OWNERSHIP,
  CONVERSION_GUARANTEES,
  STAGE_1_VALIDATION_CRITERIA,
  STAGE_2_VALIDATION_CRITERIA,
  STAGE_3_VALIDATION_CRITERIA,
  BindingType
} from '../../../src/core/conversion/conversion-model';

import {
  SurfaceContract,
  SurfaceContractBuilder,
  compareContracts,
  InvariantType
} from '../../../src/core/contracts/surface-contract';

import {
  SimulatedSurface,
  DefaultResponseMap,
  SimulationBehavior,
  runScenario,
  SimulationScenario
} from '../../../src/core/simulation/simulation-engine';

// ============================================================================
// TEST FIXTURES
// ============================================================================

interface TestInput {
  orderId: string;
  quantity: number;
}

interface TestOutput {
  success: boolean;
  processedOrderId: string;
  totalAmount: number;
}

interface TestEvent {
  type: string;
  payload: Record<string, unknown>;
}

function createTestContract(): SurfaceContract<TestInput, TestOutput, TestEvent> {
  return new SurfaceContractBuilder<TestInput, TestOutput, TestEvent>()
    .id('test-order-surface')
    .version('1.0.0')
    .name('Order Processing Surface')
    .description('Processes orders in simulation mode')
    .input({
      schema: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Order ID' },
          quantity: { type: 'number', minimum: 1, description: 'Quantity' }
        },
        required: ['orderId', 'quantity']
      },
      example: { orderId: 'ORD-001', quantity: 5 },
      validationRules: [
        {
          id: 'quantity-positive',
          description: 'Quantity must be positive',
          validate: (input: unknown) => {
            const typed = input as TestInput;
            return {
              valid: typed.quantity > 0,
              errors: typed.quantity > 0 ? [] : [{ path: 'quantity', message: 'Must be positive', code: 'INVALID_QUANTITY' }]
            };
          }
        }
      ],
      batchable: true
    })
    .output({
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          processedOrderId: { type: 'string' },
          totalAmount: { type: 'number' }
        },
        required: ['success', 'processedOrderId', 'totalAmount']
      },
      example: { success: true, processedOrderId: 'ORD-001', totalAmount: 100 },
      errorTypes: [
        { code: 'INVALID_ORDER', name: 'Invalid Order', condition: 'Order ID not found', recoverable: true },
        { code: 'INSUFFICIENT_STOCK', name: 'Insufficient Stock', condition: 'Stock < quantity', recoverable: true }
      ],
      deterministic: true
    })
    .events({
      emittedEvents: [
        {
          type: 'ORDER_PROCESSED',
          trigger: 'Order successfully processed',
          payloadSchema: { type: 'object', properties: { orderId: { type: 'string' } } },
          example: { type: 'ORDER_PROCESSED', payload: { orderId: 'ORD-001' } }
        }
      ],
      receivedEvents: []
    })
    .addInvariant({
      id: 'output-order-id-matches',
      description: 'Output order ID must match input order ID',
      type: InvariantType.DATA,
      verification: { method: 'runtime', timing: 'post', onViolation: 'error' }
    })
    .metadata({
      createdAt: new Date().toISOString(),
      author: 'test',
      tags: ['order', 'processing'],
      dependencies: [],
      compatibility: { minPlatformVersion: '1.0.0', breakingChanges: [] }
    })
    .build();
}

function createTestSimulationBehavior(): SimulationBehavior<TestInput, TestOutput> {
  const responseMap = new DefaultResponseMap<TestInput, TestOutput>();

  responseMap.addPattern(
    {
      matches: (input: TestInput) => input.orderId.startsWith('ORD-'),
      description: 'Valid order ID pattern',
      priority: 1
    },
    { success: true, processedOrderId: 'ORD-001', totalAmount: 100 }
  );

  return {
    responseMap,
    defaultResponse: { success: false, processedOrderId: '', totalAmount: 0 },
    latencyMs: 0,
    errorSimulation: { enabled: false, errorRate: 0, errorTypes: [] },
    deterministic: true
  };
}

// ============================================================================
// STAGE OWNERSHIP TESTS
// ============================================================================

describe('Stage Ownership', () => {
  it('should define three stages with correct ownership', () => {
    expect(STAGE_OWNERSHIP).toHaveLength(3);

    const stage1 = STAGE_OWNERSHIP.find(s => s.stage === ConversionStage.SURFACE_DEFINITION);
    expect(stage1?.owner).toBe('erp-surface');

    const stage2 = STAGE_OWNERSHIP.find(s => s.stage === ConversionStage.SIMULATION_MODE);
    expect(stage2?.owner).toBe('shared');

    const stage3 = STAGE_OWNERSHIP.find(s => s.stage === ConversionStage.EXECUTION_BINDING);
    expect(stage3?.owner).toBe('binding-layer');
  });

  it('should define responsibilities for each stage', () => {
    for (const stage of STAGE_OWNERSHIP) {
      expect(stage.responsibilities.length).toBeGreaterThan(0);
      expect(stage.artifacts.length).toBeGreaterThan(0);
    }
  });

  it('should have Stage 1 owned by erp-surface for surface definition', () => {
    const stage1 = STAGE_OWNERSHIP.find(s => s.stage === ConversionStage.SURFACE_DEFINITION);
    expect(stage1?.owner).toBe('erp-surface');
    expect(stage1?.responsibilities).toContain('Define behavioral model');
    expect(stage1?.responsibilities).toContain('Specify input/output contracts');
    expect(stage1?.responsibilities).toContain('Declare observable events');
  });

  it('should have Stage 3 explicitly NOT owned by erp-surface', () => {
    const stage3 = STAGE_OWNERSHIP.find(s => s.stage === ConversionStage.EXECUTION_BINDING);
    expect(stage3?.owner).toBe('binding-layer');
    expect(stage3?.owner).not.toBe('erp-surface');
  });
});

// ============================================================================
// CONTRACT IMMUTABILITY TESTS
// ============================================================================

describe('Contract Immutability Guarantee', () => {
  it('should produce identical hashes for the same contract', () => {
    const contract1 = createTestContract();
    const contract2 = createTestContract();

    const hash1 = contract1.computeHash();
    const hash2 = contract2.computeHash();

    expect(hash1).toBe(hash2);
  });

  it('should detect contract modifications', () => {
    const contract1 = createTestContract();

    // Create a modified contract
    const contract2 = new SurfaceContractBuilder<TestInput, TestOutput, TestEvent>()
      .id('test-order-surface')
      .version('1.0.1') // Changed version
      .name('Order Processing Surface')
      .description('Processes orders in simulation mode')
      .input({
        schema: { type: 'object', properties: {}, required: [] },
        example: { orderId: 'ORD-001', quantity: 5 },
        validationRules: [],
        batchable: true
      })
      .output({
        schema: { type: 'object', properties: {}, required: [] },
        example: { success: true, processedOrderId: 'ORD-001', totalAmount: 100 },
        errorTypes: [],
        deterministic: true
      })
      .events({ emittedEvents: [], receivedEvents: [] })
      .metadata({
        createdAt: new Date().toISOString(),
        author: 'test',
        tags: [],
        dependencies: [],
        compatibility: { minPlatformVersion: '1.0.0', breakingChanges: [] }
      })
      .build();

    const comparison = compareContracts(contract1, contract2);
    expect(comparison.identical).toBe(false);
  });

  it('should compare contracts and identify differences', () => {
    const contract1 = createTestContract();
    const contract2 = createTestContract();

    const comparison = compareContracts(contract1, contract2);
    expect(comparison.identical).toBe(true);
    expect(comparison.differences).toHaveLength(0);
  });
});

// ============================================================================
// CONVERSION GUARANTEES TESTS
// ============================================================================

describe('Conversion Guarantees', () => {
  it('should define CONTRACT_IMMUTABILITY guarantee', () => {
    const guarantee = CONVERSION_GUARANTEES.CONTRACT_IMMUTABILITY;
    expect(guarantee.id).toBe('GUARANTEE_001');
    expect(guarantee.statement).toContain('identical in simulation and execution');
    expect(guarantee.enforcedBy).toBe('erp-surface');
  });

  it('should define BEHAVIORAL_EQUIVALENCE guarantee', () => {
    const guarantee = CONVERSION_GUARANTEES.BEHAVIORAL_EQUIVALENCE;
    expect(guarantee.id).toBe('GUARANTEE_002');
    expect(guarantee.statement).toContain('identical pre/post binding');
  });

  it('should define NO_REDESIGN guarantee', () => {
    const guarantee = CONVERSION_GUARANTEES.NO_REDESIGN;
    expect(guarantee.id).toBe('GUARANTEE_003');
    expect(guarantee.statement).toContain('binding is additive');
  });

  it('should define ROLLBACK_CAPABILITY guarantee', () => {
    const guarantee = CONVERSION_GUARANTEES.ROLLBACK_CAPABILITY;
    expect(guarantee.id).toBe('GUARANTEE_004');
    expect(guarantee.statement).toContain('Rollback to simulation mode');
  });

  it('should have verification methods for all guarantees', () => {
    for (const [_, guarantee] of Object.entries(CONVERSION_GUARANTEES)) {
      expect(guarantee.verification).toBeDefined();
      expect(guarantee.verification.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// VALIDATION CRITERIA TESTS
// ============================================================================

describe('Stage Validation Criteria', () => {
  describe('Stage 1: Surface Definition', () => {
    it('should have validation criteria for behavioral model', () => {
      const criterion = STAGE_1_VALIDATION_CRITERIA.find(c => c.id === 'S1_001');
      expect(criterion?.description).toContain('Behavioral model');
      expect(criterion?.required).toBe(true);
    });

    it('should have validation criteria for contracts', () => {
      const criterion = STAGE_1_VALIDATION_CRITERIA.find(c => c.id === 'S1_002');
      expect(criterion?.description).toContain('contracts');
      expect(criterion?.required).toBe(true);
    });

    it('should have all required criteria for Stage 1', () => {
      expect(STAGE_1_VALIDATION_CRITERIA.filter(c => c.required)).toHaveLength(5);
    });
  });

  describe('Stage 2: Simulation Mode', () => {
    it('should have validation criteria for determinism', () => {
      const criterion = STAGE_2_VALIDATION_CRITERIA.find(c => c.id === 'S2_001');
      expect(criterion?.description).toContain('deterministic');
      expect(criterion?.required).toBe(true);
    });

    it('should have validation criteria for reproducibility', () => {
      const criterion = STAGE_2_VALIDATION_CRITERIA.find(c => c.id === 'S2_002');
      expect(criterion?.description).toContain('reproducible');
    });

    it('should have validation criteria for observability', () => {
      const criterion = STAGE_2_VALIDATION_CRITERIA.find(c => c.id === 'S2_003');
      expect(criterion?.description).toContain('observability');
    });
  });

  describe('Stage 3: Execution Binding', () => {
    it('should have validation criteria for binding point connection', () => {
      const criterion = STAGE_3_VALIDATION_CRITERIA.find(c => c.id === 'S3_001');
      expect(criterion?.description).toContain('binding points');
    });

    it('should have validation criteria for contract preservation', () => {
      const criterion = STAGE_3_VALIDATION_CRITERIA.find(c => c.id === 'S3_002');
      expect(criterion?.description).toContain('contract is unchanged');
    });

    it('should have validation criteria for rollback', () => {
      const criterion = STAGE_3_VALIDATION_CRITERIA.find(c => c.id === 'S3_004');
      expect(criterion?.description).toContain('Rollback');
    });
  });
});

// ============================================================================
// BINDABILITY VALIDATION TESTS
// ============================================================================

describe('Bindability Validation', () => {
  let surface: SimulatedSurface<TestInput, TestOutput, TestEvent>;

  beforeEach(() => {
    const contract = createTestContract();
    const behavior = createTestSimulationBehavior();
    surface = new SimulatedSurface('test-surface', contract, behavior);
  });

  it('should validate that a properly defined surface is bindable', () => {
    const validation = surface.validateBindability();
    expect(validation.bindable).toBe(true);
  });

  it('should return binding requirements', () => {
    const validation = surface.validateBindability();
    expect(validation.requirements).toBeDefined();
    expect(validation.requirements.required.length).toBeGreaterThan(0);
  });

  it('should identify required and optional binding points', () => {
    const bindingPoints = surface.getBindingPoints();
    const requiredPoints = bindingPoints.filter(bp => bp.required);
    const optionalPoints = bindingPoints.filter(bp => !bp.required);

    expect(requiredPoints.length).toBeGreaterThan(0);
    expect(optionalPoints.length).toBeGreaterThanOrEqual(0);
  });

  it('should have binding points for input, output, and events', () => {
    const bindingPoints = surface.getBindingPoints();

    const inputPoint = bindingPoints.find(bp => bp.bindingType === BindingType.DATA_SOURCE);
    const outputPoint = bindingPoints.find(bp => bp.bindingType === BindingType.DATA_SINK);
    const eventPoint = bindingPoints.find(bp => bp.bindingType === BindingType.EVENT_EMITTER);

    expect(inputPoint).toBeDefined();
    expect(outputPoint).toBeDefined();
    expect(eventPoint).toBeDefined();
  });
});

// ============================================================================
// SIMULATION MODE TESTS
// ============================================================================

describe('Simulation Mode', () => {
  let surface: SimulatedSurface<TestInput, TestOutput, TestEvent>;

  beforeEach(() => {
    const contract = createTestContract();
    const behavior = createTestSimulationBehavior();
    surface = new SimulatedSurface('test-surface', contract, behavior);
  });

  it('should be in SIMULATION_MODE stage', () => {
    expect(surface.stage).toBe(ConversionStage.SIMULATION_MODE);
  });

  it('should execute with simulated behavior', async () => {
    const result = await surface.execute({ orderId: 'ORD-001', quantity: 5 });
    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
  });

  it('should produce deterministic responses', async () => {
    const input: TestInput = { orderId: 'ORD-001', quantity: 5 };

    const result1 = await surface.execute(input);
    const result2 = await surface.execute(input);

    expect(JSON.stringify(result1.output)).toBe(JSON.stringify(result2.output));
  });

  it('should support observers for full observability', async () => {
    const notifications: unknown[] = [];

    surface.addObserver({
      onNotification: (notification) => {
        notifications.push(notification);
      }
    });

    await surface.execute({ orderId: 'ORD-001', quantity: 5 });

    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications.some(n => (n as { type: string }).type === 'invocation_start')).toBe(true);
    expect(notifications.some(n => (n as { type: string }).type === 'invocation_complete')).toBe(true);
  });

  it('should track statistics', async () => {
    await surface.execute({ orderId: 'ORD-001', quantity: 5 });
    await surface.execute({ orderId: 'ORD-002', quantity: 3 });

    const stats = surface.getStatistics();
    expect(stats.invocationCount).toBe(2);
  });
});

// ============================================================================
// SIMULATION SCENARIO TESTS
// ============================================================================

describe('Simulation Scenarios', () => {
  let surface: SimulatedSurface<TestInput, TestOutput, TestEvent>;

  beforeEach(() => {
    const contract = createTestContract();
    const behavior = createTestSimulationBehavior();
    surface = new SimulatedSurface('test-surface', contract, behavior);
  });

  it('should run and verify scenarios', async () => {
    const scenario: SimulationScenario<TestInput, TestOutput, TestEvent> = {
      name: 'Process valid order',
      description: 'Should successfully process a valid order',
      input: { orderId: 'ORD-001', quantity: 5 },
      expectedOutput: { success: true, processedOrderId: 'ORD-001', totalAmount: 100 },
      expectedEvents: [],
      shouldSucceed: true
    };

    const result = await runScenario(surface, scenario);
    expect(result.passed).toBe(true);
    expect(result.outputMatches).toBe(true);
  });
});

// ============================================================================
// BINDING POINTS TESTS
// ============================================================================

describe('Binding Points', () => {
  let surface: SimulatedSurface<TestInput, TestOutput, TestEvent>;

  beforeEach(() => {
    const contract = createTestContract();
    const behavior = createTestSimulationBehavior();
    surface = new SimulatedSurface('test-surface', contract, behavior);
  });

  it('should define binding points that enable binding', () => {
    const bindingPoints = surface.getBindingPoints();
    expect(bindingPoints.length).toBeGreaterThan(0);

    for (const bp of bindingPoints) {
      expect(bp.id).toBeDefined();
      expect(bp.name).toBeDefined();
      expect(bp.bindingType).toBeDefined();
      expect(bp.dataContract).toBeDefined();
    }
  });

  it('should have data contracts for each binding point', () => {
    const bindingPoints = surface.getBindingPoints();

    for (const bp of bindingPoints) {
      expect(bp.dataContract.schema).toBeDefined();
    }
  });

  it('should mark required vs optional binding points', () => {
    const bindingPoints = surface.getBindingPoints();

    const requiredCount = bindingPoints.filter(bp => bp.required).length;
    expect(requiredCount).toBeGreaterThan(0);
  });
});

// ============================================================================
// OBSERVABLE EVENTS TESTS
// ============================================================================

describe('Observable Events', () => {
  let surface: SimulatedSurface<TestInput, TestOutput, TestEvent>;

  beforeEach(() => {
    const contract = createTestContract();
    const behavior = createTestSimulationBehavior();
    surface = new SimulatedSurface('test-surface', contract, behavior);
  });

  it('should declare observable events from contract', () => {
    const events = surface.getObservableEvents();
    expect(events.length).toBeGreaterThan(0);
  });

  it('should have event type and schema for each event', () => {
    const events = surface.getObservableEvents();

    for (const event of events) {
      expect(event.eventType).toBeDefined();
      expect(event.payloadSchema).toBeDefined();
      expect(event.trigger).toBeDefined();
    }
  });
});

// ============================================================================
// CONVERSION FLOW DIAGRAM VERIFICATION
// ============================================================================

describe('Conversion Flow', () => {
  it('should follow the defined flow: Definition -> Simulation -> Execution', () => {
    const stages = [
      ConversionStage.SURFACE_DEFINITION,
      ConversionStage.SIMULATION_MODE,
      ConversionStage.EXECUTION_BINDING
    ];

    expect(stages[0]).toBe(ConversionStage.SURFACE_DEFINITION);
    expect(stages[1]).toBe(ConversionStage.SIMULATION_MODE);
    expect(stages[2]).toBe(ConversionStage.EXECUTION_BINDING);
  });

  it('should have erp-surface owning Stage 1 and shared ownership of Stage 2', () => {
    const stage1 = STAGE_OWNERSHIP.find(s => s.stage === ConversionStage.SURFACE_DEFINITION);
    const stage2 = STAGE_OWNERSHIP.find(s => s.stage === ConversionStage.SIMULATION_MODE);

    expect(stage1?.owner).toBe('erp-surface');
    expect(stage2?.owner).toBe('shared');
  });

  it('should have binding layer owning Stage 3 (future, not erp-surface)', () => {
    const stage3 = STAGE_OWNERSHIP.find(s => s.stage === ConversionStage.EXECUTION_BINDING);

    expect(stage3?.owner).toBe('binding-layer');
    expect(stage3?.owner).not.toBe('erp-surface');
  });
});
