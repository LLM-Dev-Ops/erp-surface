/**
 * Contract Surface Contracts for ERP Surface Layer
 *
 * Vendor-neutral contracts for procurement contract management.
 * All contracts have typed inputs/outputs, preconditions, postconditions,
 * state transitions, and observable events.
 */

import { Result } from '../../../common/types/result';
import { MonetaryAmount, MonetaryOperations, PaymentTerms } from '../../../common/types/monetary';
import { DateString, Timestamp, TimestampProvider, SystemTimestampProvider } from '../../../common/types/temporal';
import {
  SupplierId,
  UserId,
  UUID,
  CorrelationId,
  CompanyCode,
  IdentityOperations
} from '../../../common/types/identity';
import {
  ValidationError,
  StateError
} from '../../../common/errors/error-types';
import { CorrelatedEvent } from '../../../common/events/base-event';
import { CorrelationContext } from '../../../common/events/correlation';

// ============================================================================
// Surface Constants
// ============================================================================

export const CONTRACT_SURFACE = 'ContractSurface';
export const CONTRACT_SURFACE_VERSION = '1.0.0';

/** Contract identifier type */
export type ContractId = string;

// ============================================================================
// Contract State Machine
// ============================================================================

/** Contract lifecycle states */
export type ContractState =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'RENEWED';

/** Valid state transitions for contracts */
export const CONTRACT_STATE_TRANSITIONS: Record<ContractState, ContractState[]> = {
  DRAFT: ['PENDING_APPROVAL', 'TERMINATED'],
  PENDING_APPROVAL: ['APPROVED', 'DRAFT', 'TERMINATED'],
  APPROVED: ['ACTIVE', 'TERMINATED'],
  ACTIVE: ['SUSPENDED', 'EXPIRED', 'TERMINATED', 'RENEWED'],
  SUSPENDED: ['ACTIVE', 'TERMINATED'],
  EXPIRED: ['RENEWED', 'TERMINATED'],
  TERMINATED: [], // Terminal state
  RENEWED: ['ACTIVE'] // Renewed becomes active again
};

/** Contract type */
export type ContractType =
  | 'MASTER_AGREEMENT'
  | 'PURCHASE_AGREEMENT'
  | 'SERVICE_AGREEMENT'
  | 'BLANKET_ORDER'
  | 'FRAMEWORK_AGREEMENT'
  | 'CALL_OFF_CONTRACT';

// ============================================================================
// Contract Models
// ============================================================================

/** Contract pricing terms */
export interface ContractPricingTerms {
  readonly pricingType: 'FIXED' | 'VARIABLE' | 'TIERED' | 'DISCOUNT';
  readonly basePrice?: MonetaryAmount;
  readonly discountPercent?: number;
  readonly volumeDiscounts?: readonly {
    readonly minQuantity: number;
    readonly maxQuantity?: number;
    readonly discountPercent: number;
  }[];
  readonly priceEscalation?: {
    readonly type: 'ANNUAL' | 'CPI_LINKED' | 'NEGOTIATED';
    readonly maxPercent: number;
    readonly effectiveDate: DateString;
  };
}

/** Contract item/service line */
export interface ContractLine {
  readonly lineId: UUID;
  readonly lineNumber: number;
  readonly itemType: 'MATERIAL' | 'SERVICE' | 'CATEGORY';
  readonly itemCode: string;
  readonly description: string;
  readonly unitOfMeasure: string;
  readonly unitPrice: MonetaryAmount;
  readonly minimumQuantity?: number;
  readonly maximumQuantity?: number;
  readonly pricingTerms?: ContractPricingTerms;
}

/** Contract term/clause */
export interface ContractTerm {
  readonly termId: UUID;
  readonly termType: string;
  readonly title: string;
  readonly description: string;
  readonly isMandatory: boolean;
  readonly isNegotiable: boolean;
  readonly defaultValue?: string;
  readonly agreedValue?: string;
}

/** Contract milestone */
export interface ContractMilestone {
  readonly milestoneId: UUID;
  readonly name: string;
  readonly description: string;
  readonly dueDate: DateString;
  readonly value: MonetaryAmount;
  readonly status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  readonly completedDate?: DateString;
}

/** Contract amendment */
export interface ContractAmendment {
  readonly amendmentId: UUID;
  readonly amendmentNumber: number;
  readonly effectiveDate: DateString;
  readonly description: string;
  readonly changes: readonly {
    readonly field: string;
    readonly previousValue: string;
    readonly newValue: string;
  }[];
  readonly status: 'DRAFT' | 'APPROVED' | 'REJECTED';
  readonly approvedBy?: UserId;
  readonly approvedAt?: Timestamp;
}

/** Procurement contract entity */
export interface ProcurementContract {
  readonly contractId: ContractId;
  readonly contractNumber: string;
  readonly title: string;
  readonly description: string;
  readonly contractType: ContractType;
  readonly supplierId: SupplierId;
  readonly companyCode: CompanyCode;
  readonly state: ContractState;
  readonly startDate: DateString;
  readonly endDate: DateString;
  readonly totalValue: MonetaryAmount;
  readonly committedValue: MonetaryAmount;
  readonly consumedValue: MonetaryAmount;
  readonly remainingValue: MonetaryAmount;
  readonly paymentTerms: PaymentTerms;
  readonly lines: readonly ContractLine[];
  readonly terms: readonly ContractTerm[];
  readonly milestones: readonly ContractMilestone[];
  readonly amendments: readonly ContractAmendment[];
  readonly autoRenewal: boolean;
  readonly renewalTermMonths?: number;
  readonly noticeRequired: number; // Days notice required for termination
  readonly createdAt: Timestamp;
  readonly modifiedAt: Timestamp;
  readonly createdBy: UserId;
  readonly modifiedBy: UserId;
  readonly version: number;
}

// ============================================================================
// Compliance Types
// ============================================================================

/** Compliance check result */
export interface ComplianceCheckResult {
  readonly checkType: string;
  readonly description: string;
  readonly status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW' | 'NOT_APPLICABLE';
  readonly severity: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly details?: string;
  readonly recommendation?: string;
}

/** Contract compliance report */
export interface ContractComplianceReport {
  readonly contractId: ContractId;
  readonly reportDate: DateString;
  readonly overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
  readonly complianceScore: number; // 0-100
  readonly checks: readonly ComplianceCheckResult[];
  readonly expiringTerms: readonly {
    readonly termId: UUID;
    readonly expiryDate: DateString;
    readonly daysUntilExpiry: number;
  }[];
  readonly overdueCommitments: readonly {
    readonly description: string;
    readonly dueDate: DateString;
    readonly daysOverdue: number;
  }[];
  readonly utilizationRate: number; // Consumed / Committed as percentage
  readonly recommendations: readonly string[];
}

// ============================================================================
// Event Types
// ============================================================================

/** Contract event types */
export type ContractEventType =
  | 'CONTRACT_CREATED'
  | 'CONTRACT_SUBMITTED_FOR_APPROVAL'
  | 'CONTRACT_APPROVED'
  | 'CONTRACT_REJECTED'
  | 'CONTRACT_ACTIVATED'
  | 'CONTRACT_AMENDED'
  | 'CONTRACT_SUSPENDED'
  | 'CONTRACT_TERMINATED'
  | 'CONTRACT_EXPIRED'
  | 'CONTRACT_RENEWED'
  | 'CONTRACT_COMPLIANCE_CHECKED'
  | 'CONTRACT_MILESTONE_COMPLETED';

/** Base contract event */
export interface ContractEvent extends CorrelatedEvent {
  readonly contractId: ContractId;
}

/** Contract created event */
export interface ContractCreatedEvent extends ContractEvent {
  readonly eventType: 'CONTRACT_CREATED';
  readonly contractType: ContractType;
  readonly supplierId: SupplierId;
  readonly totalValue: MonetaryAmount;
  readonly startDate: DateString;
  readonly endDate: DateString;
}

/** Contract amended event */
export interface ContractAmendedEvent extends ContractEvent {
  readonly eventType: 'CONTRACT_AMENDED';
  readonly amendmentId: UUID;
  readonly amendmentNumber: number;
  readonly changesCount: number;
  readonly effectiveDate: DateString;
}

/** Contract terminated event */
export interface ContractTerminatedEvent extends ContractEvent {
  readonly eventType: 'CONTRACT_TERMINATED';
  readonly terminationReason: string;
  readonly terminationDate: DateString;
  readonly previousState: ContractState;
  readonly outstandingValue: MonetaryAmount;
}

/** Contract compliance checked event */
export interface ContractComplianceCheckedEvent extends ContractEvent {
  readonly eventType: 'CONTRACT_COMPLIANCE_CHECKED';
  readonly overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
  readonly complianceScore: number;
  readonly checkCount: number;
  readonly issueCount: number;
}

// ============================================================================
// Create Contract Contract
// ============================================================================

/** Input for creating a procurement contract */
export interface CreateContractInput {
  /** Contract title */
  readonly title: string;

  /** Contract description */
  readonly description: string;

  /** Contract type */
  readonly contractType: ContractType;

  /** Supplier ID */
  readonly supplierId: SupplierId;

  /** Company code */
  readonly companyCode: CompanyCode;

  /** Contract start date */
  readonly startDate: DateString;

  /** Contract end date */
  readonly endDate: DateString;

  /** Total contract value */
  readonly totalValue: MonetaryAmount;

  /** Payment terms */
  readonly paymentTerms: PaymentTerms;

  /** Contract lines */
  readonly lines: readonly Omit<ContractLine, 'lineId'>[];

  /** Contract terms */
  readonly terms?: readonly Omit<ContractTerm, 'termId'>[];

  /** Contract milestones */
  readonly milestones?: readonly Omit<ContractMilestone, 'milestoneId' | 'status' | 'completedDate'>[];

  /** Auto-renewal enabled */
  readonly autoRenewal?: boolean;

  /** Renewal term in months */
  readonly renewalTermMonths?: number;

  /** Days notice required for termination */
  readonly noticeRequired?: number;

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Output from creating a contract */
export interface CreateContractOutput {
  /** Assigned contract ID */
  readonly contractId: ContractId;

  /** Generated contract number */
  readonly contractNumber: string;

  /** Initial state */
  readonly state: ContractState;

  /** Remaining value */
  readonly remainingValue: MonetaryAmount;

  /** Created version */
  readonly version: number;

  /** Events emitted */
  readonly events: readonly ContractEvent[];
}

/** Create Contract Contract */
export interface CreateContractContract {
  readonly name: 'CreateContract';
  readonly description: 'Creates a new procurement contract';

  readonly preconditions: CreateContractPreconditions;
  readonly postconditions: CreateContractPostconditions;

  execute(
    input: CreateContractInput,
    context: ContractExecutionContext
  ): Promise<Result<CreateContractOutput, ValidationError>>;
}

/** Preconditions for creating a contract */
export interface CreateContractPreconditions {
  /** Supplier must exist and be qualified */
  supplierIsQualified(supplierId: SupplierId): Promise<boolean>;

  /** Company code must exist */
  companyCodeExists(companyCode: CompanyCode): Promise<boolean>;

  /** Date range must be valid */
  dateRangeValid(startDate: DateString, endDate: DateString): boolean;

  /** Total value must be positive */
  totalValuePositive(totalValue: MonetaryAmount): boolean;

  /** At least one line required */
  hasLines(lines: readonly Omit<ContractLine, 'lineId'>[]): boolean;

  /** User has contract creation permission */
  userCanCreateContract(userId: UserId): Promise<boolean>;
}

/** Postconditions for creating a contract */
export interface CreateContractPostconditions {
  /** Contract ID was assigned */
  contractIdAssigned(output: CreateContractOutput): boolean;

  /** Contract number was generated */
  contractNumberGenerated(output: CreateContractOutput): boolean;

  /** Initial state is DRAFT */
  initialStateIsDraft(output: CreateContractOutput): boolean;

  /** Creation event was emitted */
  creationEventEmitted(output: CreateContractOutput): boolean;
}

// ============================================================================
// Amend Contract Contract
// ============================================================================

/** Input for amending a contract */
export interface AmendContractInput {
  /** Contract ID to amend */
  readonly contractId: ContractId;

  /** Amendment effective date */
  readonly effectiveDate: DateString;

  /** Amendment description */
  readonly description: string;

  /** Fields to amend */
  readonly amendments: {
    readonly endDate?: DateString;
    readonly totalValue?: MonetaryAmount;
    readonly lines?: readonly {
      readonly action: 'ADD' | 'UPDATE' | 'REMOVE';
      readonly lineId?: UUID;
      readonly line?: Omit<ContractLine, 'lineId'>;
    }[];
    readonly terms?: readonly {
      readonly action: 'ADD' | 'UPDATE' | 'REMOVE';
      readonly termId?: UUID;
      readonly term?: Omit<ContractTerm, 'termId'>;
    }[];
    readonly paymentTerms?: PaymentTerms;
    readonly autoRenewal?: boolean;
    readonly renewalTermMonths?: number;
  };

  /** Expected version for optimistic locking */
  readonly expectedVersion: number;

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Output from amending a contract */
export interface AmendContractOutput {
  /** Contract ID */
  readonly contractId: ContractId;

  /** Amendment ID */
  readonly amendmentId: UUID;

  /** Amendment number */
  readonly amendmentNumber: number;

  /** New contract version */
  readonly version: number;

  /** Updated total value */
  readonly totalValue: MonetaryAmount;

  /** Changes made */
  readonly changes: readonly {
    readonly field: string;
    readonly previousValue: string;
    readonly newValue: string;
  }[];

  /** Events emitted */
  readonly events: readonly ContractEvent[];
}

/** Amend Contract Contract */
export interface AmendContractContract {
  readonly name: 'AmendContract';
  readonly description: 'Creates an amendment to an existing contract';

  readonly preconditions: AmendContractPreconditions;
  readonly postconditions: AmendContractPostconditions;

  execute(
    input: AmendContractInput,
    context: ContractExecutionContext
  ): Promise<Result<AmendContractOutput, ValidationError | StateError>>;
}

/** Preconditions for amending a contract */
export interface AmendContractPreconditions {
  /** Contract must exist */
  contractExists(contractId: ContractId): Promise<boolean>;

  /** Contract must be in amendable state */
  contractIsAmendable(contractId: ContractId): Promise<boolean>;

  /** Effective date must be within contract period or extend it */
  effectiveDateValid(contractId: ContractId, effectiveDate: DateString): Promise<boolean>;

  /** Version must match */
  versionMatches(contractId: ContractId, expectedVersion: number): Promise<boolean>;

  /** User has amendment authority */
  userCanAmend(userId: UserId, contractId: ContractId): Promise<boolean>;
}

/** Postconditions for amending a contract */
export interface AmendContractPostconditions {
  /** Amendment was created */
  amendmentCreated(output: AmendContractOutput): boolean;

  /** Version was incremented */
  versionIncremented(output: AmendContractOutput, input: AmendContractInput): boolean;

  /** Amendment event was emitted */
  amendmentEventEmitted(output: AmendContractOutput): boolean;
}

// ============================================================================
// Terminate Contract Contract
// ============================================================================

/** Input for terminating a contract */
export interface TerminateContractInput {
  /** Contract ID to terminate */
  readonly contractId: ContractId;

  /** Termination reason */
  readonly terminationReason: string;

  /** Termination effective date */
  readonly terminationDate: DateString;

  /** Termination type */
  readonly terminationType: 'MUTUAL' | 'FOR_CAUSE' | 'FOR_CONVENIENCE' | 'EXPIRY';

  /** Handle outstanding commitments */
  readonly outstandingAction: 'CANCEL' | 'COMPLETE' | 'TRANSFER';

  /** Transfer to contract (if TRANSFER) */
  readonly transferToContractId?: ContractId;

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Output from terminating a contract */
export interface TerminateContractOutput {
  /** Contract ID */
  readonly contractId: ContractId;

  /** New state */
  readonly state: ContractState;

  /** Previous state */
  readonly previousState: ContractState;

  /** Outstanding value at termination */
  readonly outstandingValue: MonetaryAmount;

  /** Consumed value at termination */
  readonly consumedValue: MonetaryAmount;

  /** Outstanding commitments handled */
  readonly outstandingCommitmentsHandled: number;

  /** Events emitted */
  readonly events: readonly ContractEvent[];
}

/** Terminate Contract Contract */
export interface TerminateContractContract {
  readonly name: 'TerminateContract';
  readonly description: 'Terminates a procurement contract';

  readonly preconditions: TerminateContractPreconditions;
  readonly postconditions: TerminateContractPostconditions;

  execute(
    input: TerminateContractInput,
    context: ContractExecutionContext
  ): Promise<Result<TerminateContractOutput, ValidationError | StateError>>;
}

/** Preconditions for terminating a contract */
export interface TerminateContractPreconditions {
  /** Contract must exist */
  contractExists(contractId: ContractId): Promise<boolean>;

  /** Contract must be in terminable state */
  contractIsTerminable(contractId: ContractId): Promise<boolean>;

  /** Notice period must be satisfied (unless for cause) */
  noticePeriodSatisfied(
    contractId: ContractId,
    terminationDate: DateString,
    terminationType: string
  ): Promise<boolean>;

  /** Transfer contract must exist and be active (if transferring) */
  transferContractValid(
    transferToContractId: ContractId | undefined,
    outstandingAction: string
  ): Promise<boolean>;

  /** User has termination authority */
  userCanTerminate(userId: UserId, contractId: ContractId): Promise<boolean>;
}

/** Postconditions for terminating a contract */
export interface TerminateContractPostconditions {
  /** Contract state is TERMINATED */
  contractIsTerminated(output: TerminateContractOutput): boolean;

  /** Outstanding commitments were handled */
  outstandingCommitmentsHandled(output: TerminateContractOutput): boolean;

  /** Termination event was emitted */
  terminationEventEmitted(output: TerminateContractOutput): boolean;
}

// ============================================================================
// Get Contract Compliance Contract
// ============================================================================

/** Input for getting contract compliance */
export interface GetContractComplianceInput {
  /** Contract ID */
  readonly contractId: ContractId;

  /** Check types to include (all if not specified) */
  readonly checkTypes?: readonly string[];

  /** Include recommendations */
  readonly includeRecommendations?: boolean;

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Output from getting contract compliance */
export interface GetContractComplianceOutput {
  /** Compliance report */
  readonly report: ContractComplianceReport;

  /** Last check timestamp */
  readonly checkedAt: Timestamp;

  /** Events emitted */
  readonly events: readonly ContractEvent[];
}

/** Get Contract Compliance Contract */
export interface GetContractComplianceContract {
  readonly name: 'GetContractCompliance';
  readonly description: 'Retrieves compliance status for a contract';

  readonly preconditions: GetContractCompliancePreconditions;
  readonly postconditions: GetContractCompliancePostconditions;

  execute(
    input: GetContractComplianceInput,
    context: ContractExecutionContext
  ): Promise<Result<GetContractComplianceOutput, ValidationError>>;
}

/** Preconditions for getting contract compliance */
export interface GetContractCompliancePreconditions {
  /** Contract must exist */
  contractExists(contractId: ContractId): Promise<boolean>;

  /** User has compliance view permission */
  userCanViewCompliance(userId: UserId, contractId: ContractId): Promise<boolean>;
}

/** Postconditions for getting contract compliance */
export interface GetContractCompliancePostconditions {
  /** Compliance score is within range */
  complianceScoreInRange(output: GetContractComplianceOutput): boolean;

  /** All checks have valid status */
  allChecksHaveValidStatus(output: GetContractComplianceOutput): boolean;
}

// ============================================================================
// Execution Context
// ============================================================================

/** Context for contract execution */
export interface ContractExecutionContext {
  /** Timestamp provider */
  readonly timestampProvider: TimestampProvider;

  /** UUID generator */
  readonly uuidGenerator: () => UUID;

  /** Correlation ID generator */
  readonly correlationIdGenerator: () => CorrelationId;

  /** Contract ID generator */
  readonly contractIdGenerator: () => Promise<ContractId>;

  /** Contract number generator */
  readonly contractNumberGenerator: (type: ContractType) => Promise<string>;

  /** Current user */
  readonly currentUser: UserId;

  /** Operational mode */
  readonly mode: 'SIMULATION' | 'EXECUTION';
}

/** Default execution context factory */
export const createDefaultContractExecutionContext = (
  currentUser: UserId,
  mode: 'SIMULATION' | 'EXECUTION' = 'EXECUTION'
): ContractExecutionContext => ({
  timestampProvider: SystemTimestampProvider,
  uuidGenerator: () => IdentityOperations.generateUUID(),
  correlationIdGenerator: () => IdentityOperations.generateCorrelationId('ctr'),
  contractIdGenerator: async () => `CTR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  contractNumberGenerator: async (type: ContractType) => {
    const prefix = type.slice(0, 2).toUpperCase();
    return `${prefix}-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  },
  currentUser,
  mode
});

// ============================================================================
// Surface Definition
// ============================================================================

/** Contract Surface - manages procurement contracts */
export interface ContractSurface {
  readonly surfaceName: typeof CONTRACT_SURFACE;
  readonly surfaceVersion: typeof CONTRACT_SURFACE_VERSION;

  readonly contracts: {
    readonly createContract: CreateContractContract;
    readonly amendContract: AmendContractContract;
    readonly terminateContract: TerminateContractContract;
    readonly getContractCompliance: GetContractComplianceContract;
  };
}

/** Create the Contract Surface */
export const createContractSurface = (): ContractSurface => {
  return {
    surfaceName: CONTRACT_SURFACE,
    surfaceVersion: CONTRACT_SURFACE_VERSION,
    contracts: {
      createContract: {
        name: 'CreateContract',
        description: 'Creates a new procurement contract',
        preconditions: {
          supplierIsQualified: async () => true,
          companyCodeExists: async () => true,
          dateRangeValid: (start, end) => start < end,
          totalValuePositive: (value) => value.value > 0,
          hasLines: (lines) => lines.length > 0,
          userCanCreateContract: async () => true
        },
        postconditions: {
          contractIdAssigned: (output) => !!output.contractId,
          contractNumberGenerated: (output) => !!output.contractNumber,
          initialStateIsDraft: (output) => output.state === 'DRAFT',
          creationEventEmitted: (output) =>
            output.events.some(e => e.eventType === 'CONTRACT_CREATED')
        },
        execute: async () => {
          throw new Error('Contract execution requires binding implementation');
        }
      },
      amendContract: {
        name: 'AmendContract',
        description: 'Creates an amendment to an existing contract',
        preconditions: {
          contractExists: async () => true,
          contractIsAmendable: async () => true,
          effectiveDateValid: async () => true,
          versionMatches: async () => true,
          userCanAmend: async () => true
        },
        postconditions: {
          amendmentCreated: (output) => !!output.amendmentId,
          versionIncremented: (output, input) => output.version === input.expectedVersion + 1,
          amendmentEventEmitted: (output) =>
            output.events.some(e => e.eventType === 'CONTRACT_AMENDED')
        },
        execute: async () => {
          throw new Error('Contract execution requires binding implementation');
        }
      },
      terminateContract: {
        name: 'TerminateContract',
        description: 'Terminates a procurement contract',
        preconditions: {
          contractExists: async () => true,
          contractIsTerminable: async () => true,
          noticePeriodSatisfied: async () => true,
          transferContractValid: async () => true,
          userCanTerminate: async () => true
        },
        postconditions: {
          contractIsTerminated: (output) => output.state === 'TERMINATED',
          outstandingCommitmentsHandled: () => true,
          terminationEventEmitted: (output) =>
            output.events.some(e => e.eventType === 'CONTRACT_TERMINATED')
        },
        execute: async () => {
          throw new Error('Contract execution requires binding implementation');
        }
      },
      getContractCompliance: {
        name: 'GetContractCompliance',
        description: 'Retrieves compliance status for a contract',
        preconditions: {
          contractExists: async () => true,
          userCanViewCompliance: async () => true
        },
        postconditions: {
          complianceScoreInRange: (output) =>
            output.report.complianceScore >= 0 && output.report.complianceScore <= 100,
          allChecksHaveValidStatus: (output) =>
            output.report.checks.every(c =>
              ['COMPLIANT', 'NON_COMPLIANT', 'NEEDS_REVIEW', 'NOT_APPLICABLE'].includes(c.status)
            )
        },
        execute: async () => {
          throw new Error('Contract execution requires binding implementation');
        }
      }
    }
  };
};

// ============================================================================
// Validation Helpers
// ============================================================================

/** Validate contract state transition */
export const isValidContractTransition = (
  currentState: ContractState,
  targetState: ContractState
): boolean => {
  return CONTRACT_STATE_TRANSITIONS[currentState].includes(targetState);
};

/** Get allowed contract transitions */
export const getAllowedContractTransitions = (currentState: ContractState): ContractState[] => {
  return [...CONTRACT_STATE_TRANSITIONS[currentState]];
};

/** Check if contract is in terminal state */
export const isContractTerminal = (state: ContractState): boolean => {
  return CONTRACT_STATE_TRANSITIONS[state].length === 0;
};

/** Calculate remaining contract value */
export const calculateRemainingValue = (
  totalValue: MonetaryAmount,
  consumedValue: MonetaryAmount
): MonetaryAmount => {
  return MonetaryOperations.subtract(totalValue, consumedValue);
};

/** Calculate utilization rate */
export const calculateUtilizationRate = (
  consumedValue: MonetaryAmount,
  committedValue: MonetaryAmount
): number => {
  if (committedValue.value === 0) return 0;
  return Math.round((consumedValue.value / committedValue.value) * 100);
};
