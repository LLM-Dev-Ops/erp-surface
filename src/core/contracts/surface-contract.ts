/**
 * Surface Contract Definition
 *
 * A surface contract is the INVARIANT specification that defines:
 * - What inputs a surface accepts
 * - What outputs a surface produces
 * - What events a surface emits
 * - What behavioral guarantees the surface provides
 *
 * CRITICAL: Surface contracts are IDENTICAL in simulation and execution.
 * The contract is the invariant; only the binding is the variable.
 *
 * @module SurfaceContract
 */

// ============================================================================
// CONTRACT CORE
// ============================================================================

/**
 * The immutable contract for a surface
 *
 * This contract defines WHAT the surface does, not HOW it does it.
 * The HOW is determined by whether we're in simulation or execution mode.
 */
export interface SurfaceContract<TInput, TOutput, TEvent> {
  /** Unique identifier for this contract */
  readonly id: string;

  /** Semantic version of this contract */
  readonly version: string;

  /** Human-readable name */
  readonly name: string;

  /** Contract description */
  readonly description: string;

  /** Input specification */
  readonly input: InputContract<TInput>;

  /** Output specification */
  readonly output: OutputContract<TOutput>;

  /** Event specification */
  readonly events: EventContract<TEvent>;

  /** Behavioral invariants */
  readonly invariants: readonly Invariant[];

  /** Contract metadata */
  readonly metadata: ContractMetadata;

  /** Compute a hash of this contract for comparison */
  computeHash(): string;
}

/**
 * Input contract specification
 */
export interface InputContract<TInput> {
  /** Schema defining the input structure */
  readonly schema: JsonSchema;

  /** Example valid input */
  readonly example: TInput;

  /** Validation rules beyond schema */
  readonly validationRules: readonly InputValidationRule[];

  /** Whether input can be batched */
  readonly batchable: boolean;
}

/**
 * Output contract specification
 */
export interface OutputContract<TOutput> {
  /** Schema defining the output structure */
  readonly schema: JsonSchema;

  /** Example output */
  readonly example: TOutput;

  /** Possible error types */
  readonly errorTypes: readonly ErrorType[];

  /** Whether output is deterministic for same input */
  readonly deterministic: boolean;
}

/**
 * Event contract specification
 */
export interface EventContract<TEvent> {
  /** Events that this surface can emit */
  readonly emittedEvents: readonly EmittedEventSpec<TEvent>[];

  /** Events that this surface can receive */
  readonly receivedEvents: readonly ReceivedEventSpec[];
}

/**
 * Specification for an emitted event
 */
export interface EmittedEventSpec<TEvent> {
  /** Event type identifier */
  readonly type: string;

  /** When this event is emitted */
  readonly trigger: string;

  /** Event payload schema */
  readonly payloadSchema: JsonSchema;

  /** Example payload */
  readonly example: Partial<TEvent>;
}

/**
 * Specification for a received event
 */
export interface ReceivedEventSpec {
  /** Event type identifier */
  readonly type: string;

  /** How the surface handles this event */
  readonly handler: string;

  /** Event payload schema */
  readonly payloadSchema: JsonSchema;
}

// ============================================================================
// INVARIANTS
// ============================================================================

/**
 * A behavioral invariant that must hold for this surface
 */
export interface Invariant {
  /** Unique identifier */
  readonly id: string;

  /** Human-readable description */
  readonly description: string;

  /** Invariant type */
  readonly type: InvariantType;

  /** Formal specification (if applicable) */
  readonly specification?: string;

  /** How to verify this invariant */
  readonly verification: InvariantVerification;
}

/**
 * Types of invariants
 */
export enum InvariantType {
  /** State invariant - must hold in every state */
  STATE = 'STATE',

  /** Transition invariant - must hold during state transitions */
  TRANSITION = 'TRANSITION',

  /** Protocol invariant - must hold for operation sequences */
  PROTOCOL = 'PROTOCOL',

  /** Data invariant - must hold for all data */
  DATA = 'DATA'
}

/**
 * How to verify an invariant
 */
export interface InvariantVerification {
  /** Verification method */
  readonly method: 'runtime' | 'static' | 'test' | 'proof';

  /** When to verify */
  readonly timing: 'pre' | 'post' | 'both' | 'continuous';

  /** What to do on violation */
  readonly onViolation: 'error' | 'warn' | 'log';
}

// ============================================================================
// METADATA
// ============================================================================

/**
 * Contract metadata
 */
export interface ContractMetadata {
  /** When this contract was created */
  readonly createdAt: string;

  /** Who created this contract */
  readonly author: string;

  /** Tags for categorization */
  readonly tags: readonly string[];

  /** Dependencies on other contracts */
  readonly dependencies: readonly ContractDependency[];

  /** Compatibility information */
  readonly compatibility: CompatibilityInfo;
}

/**
 * Dependency on another contract
 */
export interface ContractDependency {
  /** Contract ID */
  readonly contractId: string;

  /** Required version range */
  readonly versionRange: string;

  /** Whether this dependency is optional */
  readonly optional: boolean;
}

/**
 * Compatibility information
 */
export interface CompatibilityInfo {
  /** Minimum platform version */
  readonly minPlatformVersion: string;

  /** Breaking changes from previous versions */
  readonly breakingChanges: readonly string[];

  /** Migration path from previous version */
  readonly migrationPath?: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Input validation rule
 */
export interface InputValidationRule {
  readonly id: string;
  readonly description: string;
  readonly validate: (input: unknown) => ValidationResult;
}

/**
 * Validation result
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  readonly path: string;
  readonly message: string;
  readonly code: string;
}

/**
 * Contract validation result
 */
export interface ContractValidationResult {
  readonly valid: boolean;
  readonly contractId: string;
  readonly contractVersion: string;
  readonly errors: readonly ContractError[];
  readonly warnings: readonly string[];
}

/**
 * Contract-level error
 */
export interface ContractError {
  readonly code: string;
  readonly message: string;
  readonly location: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Error type definition
 */
export interface ErrorType {
  /** Error code */
  readonly code: string;

  /** Error name */
  readonly name: string;

  /** When this error occurs */
  readonly condition: string;

  /** Whether this error is recoverable */
  readonly recoverable: boolean;

  /** Suggested recovery action */
  readonly recovery?: string;
}

// ============================================================================
// JSON SCHEMA (Simplified)
// ============================================================================

/**
 * Simplified JSON Schema type
 */
export interface JsonSchema {
  readonly type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  readonly properties?: Record<string, JsonSchema>;
  readonly items?: JsonSchema;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
  readonly enum?: readonly unknown[];
  readonly format?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly description?: string;
}

// ============================================================================
// CONTRACT BUILDER
// ============================================================================

/**
 * Builder for creating surface contracts
 */
export class SurfaceContractBuilder<TInput, TOutput, TEvent> {
  private _id: string = '';
  private _version: string = '1.0.0';
  private _name: string = '';
  private _description: string = '';
  private _input: InputContract<TInput> | null = null;
  private _output: OutputContract<TOutput> | null = null;
  private _events: EventContract<TEvent> | null = null;
  private _invariants: Invariant[] = [];
  private _metadata: ContractMetadata | null = null;

  id(id: string): this {
    this._id = id;
    return this;
  }

  version(version: string): this {
    this._version = version;
    return this;
  }

  name(name: string): this {
    this._name = name;
    return this;
  }

  description(description: string): this {
    this._description = description;
    return this;
  }

  input(input: InputContract<TInput>): this {
    this._input = input;
    return this;
  }

  output(output: OutputContract<TOutput>): this {
    this._output = output;
    return this;
  }

  events(events: EventContract<TEvent>): this {
    this._events = events;
    return this;
  }

  addInvariant(invariant: Invariant): this {
    this._invariants.push(invariant);
    return this;
  }

  metadata(metadata: ContractMetadata): this {
    this._metadata = metadata;
    return this;
  }

  build(): SurfaceContract<TInput, TOutput, TEvent> {
    if (!this._id) throw new Error('Contract ID is required');
    if (!this._name) throw new Error('Contract name is required');
    if (!this._input) throw new Error('Input contract is required');
    if (!this._output) throw new Error('Output contract is required');
    if (!this._events) throw new Error('Event contract is required');
    if (!this._metadata) throw new Error('Contract metadata is required');

    const contract: SurfaceContract<TInput, TOutput, TEvent> = {
      id: this._id,
      version: this._version,
      name: this._name,
      description: this._description,
      input: this._input,
      output: this._output,
      events: this._events,
      invariants: Object.freeze([...this._invariants]),
      metadata: this._metadata,
      computeHash: () => this.computeContractHash()
    };

    return Object.freeze(contract) as SurfaceContract<TInput, TOutput, TEvent>;
  }

  private computeContractHash(): string {
    // Simple hash computation for contract comparison
    const contractString = JSON.stringify({
      id: this._id,
      version: this._version,
      input: this._input,
      output: this._output,
      events: this._events,
      invariants: this._invariants
    });

    // Simple hash function (in production, use crypto)
    let hash = 0;
    for (let i = 0; i < contractString.length; i++) {
      const char = contractString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
}

// ============================================================================
// CONTRACT COMPARISON
// ============================================================================

/**
 * Compare two contracts for equality
 * Used to verify CONTRACT_IMMUTABILITY guarantee
 */
export function compareContracts<TInput, TOutput, TEvent>(
  contract1: SurfaceContract<TInput, TOutput, TEvent>,
  contract2: SurfaceContract<TInput, TOutput, TEvent>
): ContractComparisonResult {
  const hash1 = contract1.computeHash();
  const hash2 = contract2.computeHash();

  const differences: ContractDifference[] = [];

  if (contract1.id !== contract2.id) {
    differences.push({ field: 'id', before: contract1.id, after: contract2.id });
  }

  if (contract1.version !== contract2.version) {
    differences.push({ field: 'version', before: contract1.version, after: contract2.version });
  }

  // Deep comparison of input/output/events would go here

  return {
    identical: hash1 === hash2,
    hash1,
    hash2,
    differences
  };
}

/**
 * Result of contract comparison
 */
export interface ContractComparisonResult {
  readonly identical: boolean;
  readonly hash1: string;
  readonly hash2: string;
  readonly differences: readonly ContractDifference[];
}

/**
 * A difference between two contracts
 */
export interface ContractDifference {
  readonly field: string;
  readonly before: unknown;
  readonly after: unknown;
}

