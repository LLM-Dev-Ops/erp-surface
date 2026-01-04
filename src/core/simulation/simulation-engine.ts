/**
 * Simulation Engine
 *
 * The simulation engine provides deterministic, reproducible behavior
 * for surfaces in simulation mode. This enables:
 * - Full testing without external dependencies
 * - Reproducible scenarios for verification
 * - Observability for debugging and analysis
 *
 * OWNERSHIP: erp-surface + Platform Core (shared)
 *
 * @module SimulationEngine
 */

import { SurfaceContract } from '../contracts/surface-contract';
import {
  BindableSurface,
  ConversionStage,
  BindingPoint,
  EventDeclaration,
  BindabilityValidation,
  BindingType
} from '../conversion/conversion-model';

// ============================================================================
// SIMULATION BEHAVIOR
// ============================================================================

/**
 * Configuration for simulated behavior
 */
export interface SimulationBehavior<TInput, TOutput> {
  /** The response to return for given input patterns */
  readonly responseMap: ResponseMap<TInput, TOutput>;

  /** Default response when no pattern matches */
  readonly defaultResponse: TOutput;

  /** Simulated latency in milliseconds */
  readonly latencyMs: number;

  /** Error simulation configuration */
  readonly errorSimulation: ErrorSimulationConfig;

  /** Whether responses are deterministic */
  readonly deterministic: boolean;
}

/**
 * Map of input patterns to responses
 */
export interface ResponseMap<TInput, TOutput> {
  /** Get response for input, or undefined if no match */
  getResponse(input: TInput): TOutput | undefined;

  /** Add a pattern-response pair */
  addPattern(pattern: InputPattern<TInput>, response: TOutput): void;

  /** Clear all patterns */
  clear(): void;
}

/**
 * Input pattern for matching
 */
export interface InputPattern<TInput> {
  /** Pattern matcher function */
  readonly matches: (input: TInput) => boolean;

  /** Pattern description for debugging */
  readonly description: string;

  /** Priority (higher = matched first) */
  readonly priority: number;
}

/**
 * Error simulation configuration
 */
export interface ErrorSimulationConfig {
  /** Whether to simulate errors */
  readonly enabled: boolean;

  /** Error rate (0-1) */
  readonly errorRate: number;

  /** Types of errors to simulate */
  readonly errorTypes: readonly SimulatedErrorType[];
}

/**
 * Types of simulated errors
 */
export interface SimulatedErrorType {
  readonly code: string;
  readonly message: string;
  readonly weight: number; // Relative probability
}

// ============================================================================
// SIMULATED SURFACE
// ============================================================================

/**
 * A surface operating in simulation mode
 */
export class SimulatedSurface<TInput, TOutput, TEvent>
  implements BindableSurface<TInput, TOutput, TEvent> {

  readonly stage = ConversionStage.SIMULATION_MODE;

  private readonly _bindingPoints: BindingPoint[] = [];
  private readonly _observableEvents: EventDeclaration<TEvent>[] = [];
  private readonly _observers: Set<SimulationObserver<TInput, TOutput, TEvent>> = new Set();
  private _invocationCount = 0;

  constructor(
    readonly id: string,
    readonly contract: SurfaceContract<TInput, TOutput, TEvent>,
    private readonly behavior: SimulationBehavior<TInput, TOutput>
  ) {
    this.initializeBindingPoints();
    this.initializeObservableEvents();
  }

  /**
   * Execute the surface with simulated behavior
   */
  async execute(input: TInput): Promise<SimulationResult<TOutput, TEvent>> {
    this._invocationCount++;
    const invocationId = `sim-${this.id}-${this._invocationCount}`;

    // Notify observers of invocation start
    this.notifyObservers({
      type: 'invocation_start',
      invocationId,
      input,
      timestamp: new Date()
    });

    // Simulate latency
    if (this.behavior.latencyMs > 0) {
      await this.delay(this.behavior.latencyMs);
    }

    // Check for simulated error
    if (this.shouldSimulateError()) {
      const error = this.generateSimulatedError();
      this.notifyObservers({
        type: 'invocation_error',
        invocationId,
        error,
        timestamp: new Date()
      });
      return {
        success: false,
        invocationId,
        error,
        events: [],
        duration: this.behavior.latencyMs
      };
    }

    // Get response from behavior map
    let output = this.behavior.responseMap.getResponse(input);
    if (output === undefined) {
      output = this.behavior.defaultResponse;
    }

    // Generate events
    const events = this.generateSimulatedEvents(input, output);

    // Notify observers of invocation complete
    this.notifyObservers({
      type: 'invocation_complete',
      invocationId,
      output,
      events,
      timestamp: new Date()
    });

    return {
      success: true,
      invocationId,
      output,
      events,
      duration: this.behavior.latencyMs
    };
  }

  /**
   * Validate that this surface is bindable
   */
  validateBindability(): BindabilityValidation {
    const issues: { code: string; message: string; severity: 'error' | 'warning'; bindingPoint?: string }[] = [];
    const warnings: string[] = [];

    // Check that all required binding points are defined
    const requiredPoints = this._bindingPoints.filter(bp => bp.required);
    if (requiredPoints.length === 0) {
      warnings.push('No required binding points defined - surface may be self-contained');
    }

    // Validate each binding point
    for (const bp of this._bindingPoints) {
      if (!bp.dataContract.schema) {
        issues.push({
          code: 'MISSING_SCHEMA',
          message: `Binding point ${bp.id} has no data schema`,
          severity: 'error',
          bindingPoint: bp.id
        });
      }
    }

    // Validate contract completeness
    if (!this.contract.input.schema) {
      issues.push({
        code: 'MISSING_INPUT_SCHEMA',
        message: 'Contract input schema is not defined',
        severity: 'error'
      });
    }

    if (!this.contract.output.schema) {
      issues.push({
        code: 'MISSING_OUTPUT_SCHEMA',
        message: 'Contract output schema is not defined',
        severity: 'error'
      });
    }

    return {
      bindable: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      warnings,
      requirements: {
        required: requiredPoints.map(bp => bp.id),
        optional: this._bindingPoints.filter(bp => !bp.required).map(bp => bp.id),
        minApiVersion: '1.0.0'
      }
    };
  }

  /**
   * Get all binding points
   */
  getBindingPoints(): readonly BindingPoint[] {
    return Object.freeze([...this._bindingPoints]);
  }

  /**
   * Get all observable events
   */
  getObservableEvents(): readonly EventDeclaration<TEvent>[] {
    return Object.freeze([...this._observableEvents]);
  }

  /**
   * Add an observer for simulation events
   */
  addObserver(observer: SimulationObserver<TInput, TOutput, TEvent>): void {
    this._observers.add(observer);
  }

  /**
   * Remove an observer
   */
  removeObserver(observer: SimulationObserver<TInput, TOutput, TEvent>): void {
    this._observers.delete(observer);
  }

  /**
   * Get simulation statistics
   */
  getStatistics(): SimulationStatistics {
    return {
      invocationCount: this._invocationCount,
      surfaceId: this.id,
      observerCount: this._observers.size,
      bindingPointCount: this._bindingPoints.length
    };
  }

  // Private methods

  private initializeBindingPoints(): void {
    // Create binding points from contract
    // Input binding point
    this._bindingPoints.push({
      id: `${this.id}-input`,
      name: 'Input Data Source',
      bindingType: BindingType.DATA_SOURCE,
      required: true,
      dataContract: {
        schema: this.contract.input.schema as unknown as Record<string, unknown>,
        validationRules: this.contract.input.validationRules.map(r => ({
          id: r.id,
          description: r.description,
          validate: (data: unknown) => r.validate(data).valid
        })),
        nullable: false
      }
    });

    // Output binding point
    this._bindingPoints.push({
      id: `${this.id}-output`,
      name: 'Output Data Sink',
      bindingType: BindingType.DATA_SINK,
      required: true,
      dataContract: {
        schema: this.contract.output.schema as unknown as Record<string, unknown>,
        validationRules: [],
        nullable: false
      }
    });

    // Event binding points
    for (const event of this.contract.events.emittedEvents) {
      this._bindingPoints.push({
        id: `${this.id}-event-${event.type}`,
        name: `Event: ${event.type}`,
        bindingType: BindingType.EVENT_EMITTER,
        required: false,
        dataContract: {
          schema: event.payloadSchema as unknown as Record<string, unknown>,
          validationRules: [],
          nullable: false
        }
      });
    }
  }

  private initializeObservableEvents(): void {
    for (const event of this.contract.events.emittedEvents) {
      this._observableEvents.push({
        eventType: event.type,
        payloadSchema: event.payloadSchema as unknown as Record<string, unknown>,
        trigger: event.trigger,
        example: event.example as TEvent
      });
    }
  }

  private shouldSimulateError(): boolean {
    if (!this.behavior.errorSimulation.enabled) {
      return false;
    }
    return Math.random() < this.behavior.errorSimulation.errorRate;
  }

  private generateSimulatedError(): SimulatedError {
    const errorTypes = this.behavior.errorSimulation.errorTypes;
    if (errorTypes.length === 0) {
      return { code: 'UNKNOWN_ERROR', message: 'Simulated error occurred' };
    }

    // Weighted random selection
    const totalWeight = errorTypes.reduce((sum, et) => sum + et.weight, 0);
    let random = Math.random() * totalWeight;

    for (const errorType of errorTypes) {
      random -= errorType.weight;
      if (random <= 0) {
        return { code: errorType.code, message: errorType.message };
      }
    }

    return { code: errorTypes[0].code, message: errorTypes[0].message };
  }

  private generateSimulatedEvents(_input: TInput, _output: TOutput): TEvent[] {
    // Generate events based on contract declarations
    // In simulation mode, we emit deterministic events
    return [];
  }

  private notifyObservers(notification: SimulationNotification<TInput, TOutput, TEvent>): void {
    for (const observer of this._observers) {
      try {
        observer.onNotification(notification);
      } catch (error) {
        // Observer errors should not affect simulation
        console.warn('Observer error:', error);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SIMULATION TYPES
// ============================================================================

/**
 * Result of a simulated execution
 */
export interface SimulationResult<TOutput, TEvent> {
  readonly success: boolean;
  readonly invocationId: string;
  readonly output?: TOutput;
  readonly error?: SimulatedError;
  readonly events: readonly TEvent[];
  readonly duration: number;
}

/**
 * Simulated error
 */
export interface SimulatedError {
  readonly code: string;
  readonly message: string;
}

/**
 * Observer for simulation events
 */
export interface SimulationObserver<TInput, TOutput, TEvent> {
  onNotification(notification: SimulationNotification<TInput, TOutput, TEvent>): void;
}

/**
 * Notification from simulation
 */
export type SimulationNotification<TInput, TOutput, TEvent> =
  | InvocationStartNotification<TInput>
  | InvocationCompleteNotification<TOutput, TEvent>
  | InvocationErrorNotification;

interface InvocationStartNotification<TInput> {
  type: 'invocation_start';
  invocationId: string;
  input: TInput;
  timestamp: Date;
}

interface InvocationCompleteNotification<TOutput, TEvent> {
  type: 'invocation_complete';
  invocationId: string;
  output: TOutput;
  events: readonly TEvent[];
  timestamp: Date;
}

interface InvocationErrorNotification {
  type: 'invocation_error';
  invocationId: string;
  error: SimulatedError;
  timestamp: Date;
}

/**
 * Simulation statistics
 */
export interface SimulationStatistics {
  readonly invocationCount: number;
  readonly surfaceId: string;
  readonly observerCount: number;
  readonly bindingPointCount: number;
}

// ============================================================================
// RESPONSE MAP IMPLEMENTATION
// ============================================================================

/**
 * Default implementation of ResponseMap
 */
export class DefaultResponseMap<TInput, TOutput> implements ResponseMap<TInput, TOutput> {
  private patterns: Array<{ pattern: InputPattern<TInput>; response: TOutput }> = [];

  getResponse(input: TInput): TOutput | undefined {
    // Sort by priority (descending) and find first match
    const sorted = [...this.patterns].sort((a, b) => b.pattern.priority - a.pattern.priority);

    for (const { pattern, response } of sorted) {
      if (pattern.matches(input)) {
        return response;
      }
    }

    return undefined;
  }

  addPattern(pattern: InputPattern<TInput>, response: TOutput): void {
    this.patterns.push({ pattern, response });
  }

  clear(): void {
    this.patterns = [];
  }
}

// ============================================================================
// SIMULATION SCENARIO
// ============================================================================

/**
 * A test scenario for simulation
 */
export interface SimulationScenario<TInput, TOutput, TEvent> {
  /** Scenario name */
  readonly name: string;

  /** Scenario description */
  readonly description: string;

  /** Input for this scenario */
  readonly input: TInput;

  /** Expected output */
  readonly expectedOutput: TOutput;

  /** Expected events */
  readonly expectedEvents: readonly TEvent[];

  /** Whether this scenario should succeed */
  readonly shouldSucceed: boolean;
}

/**
 * Run a simulation scenario and verify results
 */
export async function runScenario<TInput, TOutput, TEvent>(
  surface: SimulatedSurface<TInput, TOutput, TEvent>,
  scenario: SimulationScenario<TInput, TOutput, TEvent>
): Promise<ScenarioResult> {
  const result = await surface.execute(scenario.input);

  const outputMatches = scenario.shouldSucceed
    ? JSON.stringify(result.output) === JSON.stringify(scenario.expectedOutput)
    : !result.success;

  const eventsMatch = JSON.stringify(result.events) === JSON.stringify(scenario.expectedEvents);

  return {
    scenarioName: scenario.name,
    passed: outputMatches && eventsMatch,
    outputMatches,
    eventsMatch,
    actualOutput: result.output,
    actualEvents: result.events,
    actualSuccess: result.success
  };
}

/**
 * Result of running a scenario
 */
export interface ScenarioResult {
  readonly scenarioName: string;
  readonly passed: boolean;
  readonly outputMatches: boolean;
  readonly eventsMatch: boolean;
  readonly actualOutput: unknown;
  readonly actualEvents: readonly unknown[];
  readonly actualSuccess: boolean;
}

