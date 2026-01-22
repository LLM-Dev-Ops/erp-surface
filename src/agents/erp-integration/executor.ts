/**
 * ERP Integration Agent Executor
 *
 * Main execution logic for the ERP Integration Agent.
 * Orchestrates validation, mapping, transmission, and event emission.
 *
 * EXECUTION MODEL:
 * - Cloud Run or Job execution
 * - Stateless execution
 * - Deterministic behavior
 * - No orchestration logic
 * - No optimization logic
 * - No direct SQL access
 * - External ERP access via approved connectors only
 * - Append-only DecisionEvent writes via ruvector-service
 *
 * CONFIRMATIONS:
 * ✓ This agent does NOT execute inference
 * ✓ This agent does NOT modify Agentics platform state
 * ✓ This agent does NOT enforce business decisions
 * ✓ This agent does NOT trigger orchestration
 *
 * @module agents/erp-integration/executor
 */

import { randomUUID } from 'crypto';
import type {
  ErpIntegrationInput,
  ErpIntegrationOutput,
  ErpIntegrationDecisionEvent,
  IntegrationStatus,
  IntegrationOutcome,
  ValidationResult,
} from './types';
import {
  AGENT_ID,
  AGENT_VERSION,
  validateInput,
  buildOutput,
  buildConstraints,
  createError,
} from './types';
import { calculateConfidence, type ConfidenceContext } from './confidence';
import { processBatch } from './mapper';
import { emitDecisionEvent } from './emitter';

// =============================================================================
// EXECUTOR TYPES
// =============================================================================

/**
 * Execution options
 */
export interface ExecutorOptions {
  /** Enable verbose logging */
  readonly verbose?: boolean;
  /** Skip DecisionEvent emission (for testing) */
  readonly skipEmit?: boolean;
  /** Force dry run mode */
  readonly forceDryRun?: boolean;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  /** Whether execution succeeded */
  readonly success: boolean;
  /** Output from the agent */
  readonly output: ErpIntegrationOutput;
  /** Emitted DecisionEvent (if not skipped) */
  readonly decisionEvent?: ErpIntegrationDecisionEvent;
  /** Validation errors (if validation failed) */
  readonly validationErrors?: ValidationResult['errors'];
}

// =============================================================================
// EXECUTOR CLASS
// =============================================================================

/**
 * ERP Integration Agent Executor
 *
 * Handles the full execution lifecycle:
 * 1. Input validation
 * 2. Constraint building
 * 3. Payload mapping
 * 4. Transmission (or simulation)
 * 5. Confidence calculation
 * 6. DecisionEvent emission
 */
export class ErpIntegrationExecutor {
  private readonly options: ExecutorOptions;

  constructor(options: ExecutorOptions = {}) {
    this.options = options;
  }

  /**
   * Executes an integration request
   *
   * @param input Integration input
   * @returns Execution result
   */
  async execute(input: ErpIntegrationInput): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = randomUUID();

    // Log start
    this.log('info', 'Integration execution started', {
      executionId,
      operation: input.operation,
      target: input.target,
    });

    // Step 1: Validate input
    const validation = validateInput(input);
    if (!validation.valid) {
      this.log('error', 'Input validation failed', { errors: validation.errors });

      const output = this.buildFailureOutput(input, executionId, startTime, 'failed', {
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
        transmissions: [],
      });

      return {
        success: false,
        output,
        validationErrors: validation.errors,
      };
    }

    // Step 2: Apply force dry run if set
    const effectiveInput: ErpIntegrationInput = this.options.forceDryRun
      ? { ...input, dryRun: true }
      : input;

    // Step 3: Build constraints (uses effectiveInput for accurate dry_run constraint)
    const constraints = buildConstraints(effectiveInput);
    this.log('debug', 'Constraints applied', { constraints });

    // Step 4: Execute integration
    let outcome: IntegrationOutcome;
    let status: IntegrationStatus;

    try {
      outcome = await this.executeWithTimeout(effectiveInput);

      // Determine status
      if (outcome.recordsFailed === 0 && outcome.recordsSucceeded > 0) {
        status = 'success';
      } else if (outcome.recordsSucceeded > 0 && outcome.recordsFailed > 0) {
        status = 'partial_success';
      } else if (effectiveInput.dryRun) {
        status = 'skipped';
      } else if (outcome.recordsFailed > 0) {
        status = 'failed';
      } else {
        status = outcome.recordsProcessed === 0 ? 'skipped' : 'success';
      }

    } catch (error) {
      this.log('error', 'Integration execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const isTimeout = error instanceof Error && error.message.includes('timeout');
      status = isTimeout ? 'timeout' : 'failed';
      outcome = {
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 1,
        transmissions: [{
          sourceRecordId: 'execution-error',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
      };
    }

    // Step 5: Calculate confidence
    const confidenceContext: ConfidenceContext = {
      input: effectiveInput,
      outcome,
      status,
      schemaValid: true,
      dataCompleteness: this.calculateDataCompleteness(outcome),
      hasWarnings: outcome.transmissions.some(t => t.warnings && t.warnings.length > 0),
    };
    const confidence = calculateConfidence(confidenceContext);

    // Step 6: Build output
    const output = buildOutput({
      input: effectiveInput,
      executionId,
      status,
      outcome,
      confidence,
      constraintsApplied: constraints,
      startTime,
    });

    // Step 7: Emit DecisionEvent
    let decisionEvent: ErpIntegrationDecisionEvent | undefined;
    if (!this.options.skipEmit) {
      decisionEvent = await emitDecisionEvent(effectiveInput, output);
      this.log('info', 'DecisionEvent emitted', { eventId: decisionEvent.eventId });
    }

    // Log completion
    this.log('info', 'Integration execution completed', {
      executionId,
      status,
      confidence,
      duration: output.durationMs,
    });

    return {
      success: status === 'success' || status === 'skipped',
      output,
      decisionEvent,
    };
  }

  /**
   * Executes with timeout handling
   */
  private async executeWithTimeout(input: ErpIntegrationInput): Promise<IntegrationOutcome> {
    const timeoutMs = input.timeoutMs ?? 30000;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(createError('TIMEOUT', { timeoutMs }));
      }, timeoutMs);

      processBatch(input)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Calculates data completeness from outcome
   */
  private calculateDataCompleteness(outcome: IntegrationOutcome): number {
    if (outcome.recordsProcessed === 0) {
      return 1.0;
    }
    return outcome.recordsSucceeded / outcome.recordsProcessed;
  }

  /**
   * Builds a failure output
   */
  private buildFailureOutput(
    input: ErpIntegrationInput,
    executionId: string,
    startTime: number,
    status: IntegrationStatus,
    outcome: IntegrationOutcome
  ): ErpIntegrationOutput {
    return {
      requestId: input.requestId,
      executionId,
      correlationId: input.correlationId,
      agentId: AGENT_ID,
      agentVersion: AGENT_VERSION,
      status,
      outcome,
      confidence: 0,
      constraintsApplied: [],
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Logs a message
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, unknown>
  ): void {
    if (level === 'debug' && !this.options.verbose) {
      return;
    }

    console.log(JSON.stringify({
      level,
      agent: AGENT_ID,
      version: AGENT_VERSION,
      message,
      ...context,
      timestamp: new Date().toISOString(),
    }));
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Default executor instance
 */
let executorInstance: ErpIntegrationExecutor | null = null;

/**
 * Gets the default executor instance
 */
export function getExecutor(options?: ExecutorOptions): ErpIntegrationExecutor {
  if (!executorInstance || options) {
    executorInstance = new ErpIntegrationExecutor(options);
  }
  return executorInstance;
}

/**
 * Executes an integration request using the default executor
 */
export async function execute(input: ErpIntegrationInput): Promise<ExecutionResult> {
  return getExecutor().execute(input);
}

/**
 * Executes an integration request in dry-run mode
 */
export async function dryRun(input: ErpIntegrationInput): Promise<ExecutionResult> {
  return new ErpIntegrationExecutor({ forceDryRun: true }).execute(input);
}

/**
 * Validates an integration input without executing
 */
export function validate(input: unknown): ValidationResult {
  return validateInput(input);
}
