/**
 * Supplier Surface Contracts for ERP Surface Layer
 *
 * Vendor-neutral contracts for supplier management operations.
 * All contracts have typed inputs/outputs, preconditions, postconditions,
 * state transitions, and observable events.
 */

import { Result } from '../../../common/types/result';
import { MonetaryAmount } from '../../../common/types/monetary';
import { DateString, Timestamp, TimestampProvider, SystemTimestampProvider, DateRange } from '../../../common/types/temporal';
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

export const SUPPLIER_SURFACE = 'SupplierSurface';
export const SUPPLIER_SURFACE_VERSION = '1.0.0';

// ============================================================================
// Supplier State Machine
// ============================================================================

/** Supplier lifecycle states */
export type SupplierState =
  | 'DRAFT'
  | 'PENDING_QUALIFICATION'
  | 'QUALIFIED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'INACTIVE'
  | 'BLOCKED';

/** Valid state transitions for suppliers */
export const SUPPLIER_STATE_TRANSITIONS: Record<SupplierState, SupplierState[]> = {
  DRAFT: ['PENDING_QUALIFICATION', 'INACTIVE'],
  PENDING_QUALIFICATION: ['QUALIFIED', 'DRAFT', 'INACTIVE'],
  QUALIFIED: ['ACTIVE', 'INACTIVE'],
  ACTIVE: ['SUSPENDED', 'INACTIVE', 'BLOCKED'],
  SUSPENDED: ['ACTIVE', 'INACTIVE', 'BLOCKED'],
  INACTIVE: ['DRAFT'],
  BLOCKED: ['INACTIVE']
};

/** Qualification status */
export type QualificationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PASSED'
  | 'FAILED'
  | 'EXPIRED';

// ============================================================================
// Supplier Models
// ============================================================================

/** Supplier address */
export interface SupplierAddress {
  readonly addressType: 'MAIN' | 'BILLING' | 'SHIPPING' | 'REMITTANCE';
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly region: string;
  readonly postalCode: string;
  readonly country: string;
  readonly isPrimary: boolean;
}

/** Supplier contact */
export interface SupplierContact {
  readonly contactId: UUID;
  readonly contactType: 'PRIMARY' | 'SALES' | 'SUPPORT' | 'ACCOUNTS';
  readonly name: string;
  readonly title?: string;
  readonly email: string;
  readonly phone?: string;
  readonly mobile?: string;
  readonly isPrimary: boolean;
}

/** Supplier bank details */
export interface SupplierBankDetails {
  readonly bankId: UUID;
  readonly bankName: string;
  readonly accountNumber: string;
  readonly routingNumber?: string;
  readonly swiftCode?: string;
  readonly iban?: string;
  readonly currency: string;
  readonly isPrimary: boolean;
}

/** Supplier certification */
export interface SupplierCertification {
  readonly certificationId: UUID;
  readonly certificationType: string;
  readonly certificationNumber: string;
  readonly issuingBody: string;
  readonly issueDate: DateString;
  readonly expiryDate: DateString;
  readonly status: 'VALID' | 'EXPIRED' | 'REVOKED';
  readonly documentReference?: string;
}

/** Supplier category */
export interface SupplierCategory {
  readonly categoryCode: string;
  readonly categoryName: string;
  readonly parentCategoryCode?: string;
}

/** Supplier qualification criteria */
export interface QualificationCriteria {
  readonly criteriaId: UUID;
  readonly criteriaType: string;
  readonly description: string;
  readonly weight: number;
  readonly passed: boolean;
  readonly score?: number;
  readonly notes?: string;
  readonly evaluatedAt?: Timestamp;
  readonly evaluatedBy?: UserId;
}

/** Supplier entity */
export interface Supplier {
  readonly supplierId: SupplierId;
  readonly supplierName: string;
  readonly legalName: string;
  readonly taxId: string;
  readonly dunsNumber?: string;
  readonly website?: string;
  readonly state: SupplierState;
  readonly qualificationStatus: QualificationStatus;
  readonly addresses: readonly SupplierAddress[];
  readonly contacts: readonly SupplierContact[];
  readonly bankDetails: readonly SupplierBankDetails[];
  readonly certifications: readonly SupplierCertification[];
  readonly categories: readonly SupplierCategory[];
  readonly paymentTermsCode: string;
  readonly currency: string;
  readonly companyCode: CompanyCode;
  readonly createdAt: Timestamp;
  readonly modifiedAt: Timestamp;
  readonly createdBy: UserId;
  readonly modifiedBy: UserId;
  readonly version: number;
}

// ============================================================================
// Performance Metrics
// ============================================================================

/** Supplier performance metrics */
export interface SupplierPerformanceMetrics {
  readonly supplierId: SupplierId;
  readonly periodStart: DateString;
  readonly periodEnd: DateString;

  /** On-time delivery rate (0-100%) */
  readonly onTimeDeliveryRate: number;

  /** Quality acceptance rate (0-100%) */
  readonly qualityAcceptanceRate: number;

  /** Order accuracy rate (0-100%) */
  readonly orderAccuracyRate: number;

  /** Average lead time in days */
  readonly averageLeadTimeDays: number;

  /** Total orders in period */
  readonly totalOrders: number;

  /** Total order value */
  readonly totalOrderValue: MonetaryAmount;

  /** Number of defects reported */
  readonly defectCount: number;

  /** Number of returns */
  readonly returnCount: number;

  /** Response time score (1-5) */
  readonly responseTimeScore: number;

  /** Overall performance score (0-100) */
  readonly overallScore: number;

  /** Performance trend */
  readonly trend: 'IMPROVING' | 'STABLE' | 'DECLINING';

  /** Calculated at timestamp */
  readonly calculatedAt: Timestamp;
}

/** Performance history entry */
export interface PerformanceHistoryEntry {
  readonly period: string;
  readonly overallScore: number;
  readonly onTimeDeliveryRate: number;
  readonly qualityAcceptanceRate: number;
}

// ============================================================================
// Event Types
// ============================================================================

/** Supplier event types */
export type SupplierEventType =
  | 'SUPPLIER_CREATED'
  | 'SUPPLIER_UPDATED'
  | 'SUPPLIER_QUALIFICATION_STARTED'
  | 'SUPPLIER_QUALIFIED'
  | 'SUPPLIER_QUALIFICATION_FAILED'
  | 'SUPPLIER_ACTIVATED'
  | 'SUPPLIER_SUSPENDED'
  | 'SUPPLIER_BLOCKED'
  | 'SUPPLIER_DEACTIVATED'
  | 'SUPPLIER_PERFORMANCE_CALCULATED';

/** Base supplier event */
export interface SupplierEvent extends CorrelatedEvent {
  readonly supplierId: SupplierId;
}

/** Supplier created event */
export interface SupplierCreatedEvent extends SupplierEvent {
  readonly eventType: 'SUPPLIER_CREATED';
  readonly supplierName: string;
  readonly companyCode: CompanyCode;
  readonly initialState: SupplierState;
}

/** Supplier updated event */
export interface SupplierUpdatedEvent extends SupplierEvent {
  readonly eventType: 'SUPPLIER_UPDATED';
  readonly updatedFields: readonly string[];
  readonly previousVersion: number;
  readonly newVersion: number;
}

/** Supplier qualification completed event */
export interface SupplierQualifiedEvent extends SupplierEvent {
  readonly eventType: 'SUPPLIER_QUALIFIED';
  readonly qualificationScore: number;
  readonly criteriaResults: readonly { criteriaId: string; passed: boolean; score?: number }[];
}

/** Supplier performance calculated event */
export interface SupplierPerformanceCalculatedEvent extends SupplierEvent {
  readonly eventType: 'SUPPLIER_PERFORMANCE_CALCULATED';
  readonly periodStart: DateString;
  readonly periodEnd: DateString;
  readonly overallScore: number;
  readonly trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

// ============================================================================
// Create Supplier Contract
// ============================================================================

/** Input for creating a supplier */
export interface CreateSupplierInput {
  /** Supplier name (trading name) */
  readonly supplierName: string;

  /** Legal registered name */
  readonly legalName: string;

  /** Tax identification number */
  readonly taxId: string;

  /** D&B DUNS number */
  readonly dunsNumber?: string;

  /** Company website */
  readonly website?: string;

  /** Primary address */
  readonly primaryAddress: Omit<SupplierAddress, 'addressType' | 'isPrimary'>;

  /** Additional addresses */
  readonly additionalAddresses?: readonly Omit<SupplierAddress, 'isPrimary'>[];

  /** Primary contact */
  readonly primaryContact: Omit<SupplierContact, 'contactId' | 'isPrimary'>;

  /** Additional contacts */
  readonly additionalContacts?: readonly Omit<SupplierContact, 'contactId' | 'isPrimary'>[];

  /** Bank details */
  readonly bankDetails?: readonly Omit<SupplierBankDetails, 'bankId' | 'isPrimary'>[];

  /** Supplier categories */
  readonly categories: readonly SupplierCategory[];

  /** Payment terms code */
  readonly paymentTermsCode: string;

  /** Default transaction currency */
  readonly currency: string;

  /** Company code */
  readonly companyCode: CompanyCode;

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Output from creating a supplier */
export interface CreateSupplierOutput {
  /** Assigned supplier ID */
  readonly supplierId: SupplierId;

  /** Initial state */
  readonly state: SupplierState;

  /** Qualification status */
  readonly qualificationStatus: QualificationStatus;

  /** Created entity version */
  readonly version: number;

  /** Events emitted */
  readonly events: readonly SupplierEvent[];
}

/** Create Supplier Contract */
export interface CreateSupplierContract {
  readonly name: 'CreateSupplier';
  readonly description: 'Creates a new supplier in the supplier master';

  readonly preconditions: CreateSupplierPreconditions;
  readonly postconditions: CreateSupplierPostconditions;

  execute(
    input: CreateSupplierInput,
    context: SupplierExecutionContext
  ): Promise<Result<CreateSupplierOutput, ValidationError>>;
}

/** Preconditions for creating a supplier */
export interface CreateSupplierPreconditions {
  /** Supplier name must be unique within company */
  supplierNameUnique(supplierName: string, companyCode: CompanyCode): Promise<boolean>;

  /** Tax ID must be unique and valid */
  taxIdValidAndUnique(taxId: string, companyCode: CompanyCode): Promise<boolean>;

  /** DUNS number must be valid if provided */
  dunsNumberValid(dunsNumber?: string): Promise<boolean>;

  /** Payment terms must exist */
  paymentTermsExist(paymentTermsCode: string): Promise<boolean>;

  /** Company code must exist */
  companyCodeExists(companyCode: CompanyCode): Promise<boolean>;

  /** At least one category must be provided */
  hasCategories(categories: readonly SupplierCategory[]): boolean;
}

/** Postconditions for creating a supplier */
export interface CreateSupplierPostconditions {
  /** Supplier ID was assigned */
  supplierIdAssigned(output: CreateSupplierOutput): boolean;

  /** Initial state is DRAFT */
  initialStateIsDraft(output: CreateSupplierOutput): boolean;

  /** Creation event was emitted */
  creationEventEmitted(output: CreateSupplierOutput): boolean;
}

// ============================================================================
// Update Supplier Contract
// ============================================================================

/** Input for updating a supplier */
export interface UpdateSupplierInput {
  /** Supplier ID to update */
  readonly supplierId: SupplierId;

  /** Fields to update */
  readonly updates: Partial<{
    readonly supplierName: string;
    readonly legalName: string;
    readonly website: string;
    readonly addresses: readonly SupplierAddress[];
    readonly contacts: readonly SupplierContact[];
    readonly bankDetails: readonly SupplierBankDetails[];
    readonly certifications: readonly SupplierCertification[];
    readonly categories: readonly SupplierCategory[];
    readonly paymentTermsCode: string;
    readonly currency: string;
  }>;

  /** Expected version for optimistic locking */
  readonly expectedVersion: number;

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Output from updating a supplier */
export interface UpdateSupplierOutput {
  /** Updated supplier ID */
  readonly supplierId: SupplierId;

  /** New version */
  readonly version: number;

  /** Fields that were updated */
  readonly updatedFields: readonly string[];

  /** Events emitted */
  readonly events: readonly SupplierEvent[];
}

/** Update Supplier Contract */
export interface UpdateSupplierContract {
  readonly name: 'UpdateSupplier';
  readonly description: 'Updates an existing supplier in the supplier master';

  readonly preconditions: UpdateSupplierPreconditions;
  readonly postconditions: UpdateSupplierPostconditions;

  execute(
    input: UpdateSupplierInput,
    context: SupplierExecutionContext
  ): Promise<Result<UpdateSupplierOutput, ValidationError | StateError>>;
}

/** Preconditions for updating a supplier */
export interface UpdateSupplierPreconditions {
  /** Supplier must exist */
  supplierExists(supplierId: SupplierId): Promise<boolean>;

  /** Supplier must be in editable state */
  supplierIsEditable(supplierId: SupplierId): Promise<boolean>;

  /** Version must match for optimistic locking */
  versionMatches(supplierId: SupplierId, expectedVersion: number): Promise<boolean>;

  /** User has update permission */
  userCanUpdate(userId: UserId, supplierId: SupplierId): Promise<boolean>;
}

/** Postconditions for updating a supplier */
export interface UpdateSupplierPostconditions {
  /** Version was incremented */
  versionIncremented(output: UpdateSupplierOutput, input: UpdateSupplierInput): boolean;

  /** Update event was emitted */
  updateEventEmitted(output: UpdateSupplierOutput): boolean;
}

// ============================================================================
// Qualify Supplier Contract
// ============================================================================

/** Input for qualifying a supplier */
export interface QualifySupplierInput {
  /** Supplier ID to qualify */
  readonly supplierId: SupplierId;

  /** Qualification criteria evaluations */
  readonly criteriaEvaluations: readonly {
    readonly criteriaType: string;
    readonly passed: boolean;
    readonly score?: number;
    readonly notes?: string;
    readonly documentReferences?: readonly string[];
  }[];

  /** Overall qualification decision */
  readonly decision: 'APPROVE' | 'REJECT' | 'DEFER';

  /** Qualification notes */
  readonly notes?: string;

  /** Qualification valid until (if approved) */
  readonly validUntil?: DateString;

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Output from qualifying a supplier */
export interface QualifySupplierOutput {
  /** Supplier ID */
  readonly supplierId: SupplierId;

  /** New state */
  readonly state: SupplierState;

  /** New qualification status */
  readonly qualificationStatus: QualificationStatus;

  /** Overall qualification score */
  readonly qualificationScore: number;

  /** Criteria results */
  readonly criteriaResults: readonly QualificationCriteria[];

  /** Valid until date */
  readonly validUntil?: DateString;

  /** Events emitted */
  readonly events: readonly SupplierEvent[];
}

/** Qualify Supplier Contract */
export interface QualifySupplierContract {
  readonly name: 'QualifySupplier';
  readonly description: 'Evaluates and qualifies a supplier based on defined criteria';

  readonly preconditions: QualifySupplierPreconditions;
  readonly postconditions: QualifySupplierPostconditions;

  execute(
    input: QualifySupplierInput,
    context: SupplierExecutionContext
  ): Promise<Result<QualifySupplierOutput, ValidationError | StateError>>;
}

/** Preconditions for qualifying a supplier */
export interface QualifySupplierPreconditions {
  /** Supplier must exist */
  supplierExists(supplierId: SupplierId): Promise<boolean>;

  /** Supplier must be in qualifiable state */
  supplierIsQualifiable(supplierId: SupplierId): Promise<boolean>;

  /** All required criteria must be evaluated */
  allRequiredCriteriaEvaluated(
    supplierId: SupplierId,
    criteriaEvaluations: readonly { criteriaType: string }[]
  ): Promise<boolean>;

  /** User has qualification authority */
  userCanQualify(userId: UserId): Promise<boolean>;
}

/** Postconditions for qualifying a supplier */
export interface QualifySupplierPostconditions {
  /** State transition is valid */
  stateTransitionValid(output: QualifySupplierOutput, input: QualifySupplierInput): boolean;

  /** Qualification status matches decision */
  qualificationStatusMatchesDecision(output: QualifySupplierOutput, input: QualifySupplierInput): boolean;

  /** Qualification event was emitted */
  qualificationEventEmitted(output: QualifySupplierOutput): boolean;
}

// ============================================================================
// Get Supplier Performance Contract
// ============================================================================

/** Input for getting supplier performance */
export interface GetSupplierPerformanceInput {
  /** Supplier ID */
  readonly supplierId: SupplierId;

  /** Performance period */
  readonly period: DateRange;

  /** Include trend analysis */
  readonly includeTrend?: boolean;

  /** Include history */
  readonly includeHistory?: boolean;

  /** Number of historical periods */
  readonly historyPeriods?: number;

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Output from getting supplier performance */
export interface GetSupplierPerformanceOutput {
  /** Current period metrics */
  readonly currentMetrics: SupplierPerformanceMetrics;

  /** Historical metrics (if requested) */
  readonly history?: readonly PerformanceHistoryEntry[];

  /** Benchmark comparison */
  readonly benchmark: {
    readonly categoryAverage: number;
    readonly topPerformerScore: number;
    readonly percentileRank: number;
  };

  /** Recommendations */
  readonly recommendations: readonly string[];

  /** Events emitted */
  readonly events: readonly SupplierEvent[];
}

/** Get Supplier Performance Contract */
export interface GetSupplierPerformanceContract {
  readonly name: 'GetSupplierPerformance';
  readonly description: 'Retrieves performance metrics for a supplier';

  readonly preconditions: GetSupplierPerformancePreconditions;
  readonly postconditions: GetSupplierPerformancePostconditions;

  execute(
    input: GetSupplierPerformanceInput,
    context: SupplierExecutionContext
  ): Promise<Result<GetSupplierPerformanceOutput, ValidationError>>;
}

/** Preconditions for getting supplier performance */
export interface GetSupplierPerformancePreconditions {
  /** Supplier must exist */
  supplierExists(supplierId: SupplierId): Promise<boolean>;

  /** Date range must be valid */
  dateRangeValid(period: DateRange): boolean;

  /** User has view permission */
  userCanViewPerformance(userId: UserId, supplierId: SupplierId): Promise<boolean>;
}

/** Postconditions for getting supplier performance */
export interface GetSupplierPerformancePostconditions {
  /** Metrics are within valid ranges */
  metricsWithinValidRanges(output: GetSupplierPerformanceOutput): boolean;

  /** History matches requested periods */
  historyMatchesRequestedPeriods(
    output: GetSupplierPerformanceOutput,
    input: GetSupplierPerformanceInput
  ): boolean;
}

// ============================================================================
// Execution Context
// ============================================================================

/** Context for supplier contract execution */
export interface SupplierExecutionContext {
  /** Timestamp provider */
  readonly timestampProvider: TimestampProvider;

  /** UUID generator */
  readonly uuidGenerator: () => UUID;

  /** Correlation ID generator */
  readonly correlationIdGenerator: () => CorrelationId;

  /** Supplier ID generator */
  readonly supplierIdGenerator: () => Promise<SupplierId>;

  /** Current user */
  readonly currentUser: UserId;

  /** Operational mode */
  readonly mode: 'SIMULATION' | 'EXECUTION';
}

/** Default execution context factory */
export const createDefaultSupplierExecutionContext = (
  currentUser: UserId,
  mode: 'SIMULATION' | 'EXECUTION' = 'EXECUTION'
): SupplierExecutionContext => ({
  timestampProvider: SystemTimestampProvider,
  uuidGenerator: () => IdentityOperations.generateUUID(),
  correlationIdGenerator: () => IdentityOperations.generateCorrelationId('sup'),
  supplierIdGenerator: async () => `SUP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  currentUser,
  mode
});

// ============================================================================
// Surface Definition
// ============================================================================

/** Supplier Surface - manages supplier lifecycle */
export interface SupplierSurface {
  readonly surfaceName: typeof SUPPLIER_SURFACE;
  readonly surfaceVersion: typeof SUPPLIER_SURFACE_VERSION;

  readonly contracts: {
    readonly createSupplier: CreateSupplierContract;
    readonly updateSupplier: UpdateSupplierContract;
    readonly qualifySupplier: QualifySupplierContract;
    readonly getSupplierPerformance: GetSupplierPerformanceContract;
  };
}

/** Create the Supplier Surface */
export const createSupplierSurface = (): SupplierSurface => {
  return {
    surfaceName: SUPPLIER_SURFACE,
    surfaceVersion: SUPPLIER_SURFACE_VERSION,
    contracts: {
      createSupplier: {
        name: 'CreateSupplier',
        description: 'Creates a new supplier in the supplier master',
        preconditions: {
          supplierNameUnique: async () => true,
          taxIdValidAndUnique: async () => true,
          dunsNumberValid: async () => true,
          paymentTermsExist: async () => true,
          companyCodeExists: async () => true,
          hasCategories: (categories) => categories.length > 0
        },
        postconditions: {
          supplierIdAssigned: (output) => !!output.supplierId,
          initialStateIsDraft: (output) => output.state === 'DRAFT',
          creationEventEmitted: (output) =>
            output.events.some(e => e.eventType === 'SUPPLIER_CREATED')
        },
        execute: async () => {
          throw new Error('Contract execution requires binding implementation');
        }
      },
      updateSupplier: {
        name: 'UpdateSupplier',
        description: 'Updates an existing supplier in the supplier master',
        preconditions: {
          supplierExists: async () => true,
          supplierIsEditable: async () => true,
          versionMatches: async () => true,
          userCanUpdate: async () => true
        },
        postconditions: {
          versionIncremented: (output, input) => output.version === input.expectedVersion + 1,
          updateEventEmitted: (output) =>
            output.events.some(e => e.eventType === 'SUPPLIER_UPDATED')
        },
        execute: async () => {
          throw new Error('Contract execution requires binding implementation');
        }
      },
      qualifySupplier: {
        name: 'QualifySupplier',
        description: 'Evaluates and qualifies a supplier based on defined criteria',
        preconditions: {
          supplierExists: async () => true,
          supplierIsQualifiable: async () => true,
          allRequiredCriteriaEvaluated: async () => true,
          userCanQualify: async () => true
        },
        postconditions: {
          stateTransitionValid: () => true,
          qualificationStatusMatchesDecision: (output, input) => {
            if (input.decision === 'APPROVE') return output.qualificationStatus === 'PASSED';
            if (input.decision === 'REJECT') return output.qualificationStatus === 'FAILED';
            return true;
          },
          qualificationEventEmitted: (output) =>
            output.events.some(e => e.eventType === 'SUPPLIER_QUALIFIED' || e.eventType === 'SUPPLIER_QUALIFICATION_FAILED')
        },
        execute: async () => {
          throw new Error('Contract execution requires binding implementation');
        }
      },
      getSupplierPerformance: {
        name: 'GetSupplierPerformance',
        description: 'Retrieves performance metrics for a supplier',
        preconditions: {
          supplierExists: async () => true,
          dateRangeValid: (period) => period.startDate <= period.endDate,
          userCanViewPerformance: async () => true
        },
        postconditions: {
          metricsWithinValidRanges: (output) =>
            output.currentMetrics.overallScore >= 0 && output.currentMetrics.overallScore <= 100,
          historyMatchesRequestedPeriods: () => true
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

/** Validate supplier state transition */
export const isValidSupplierTransition = (
  currentState: SupplierState,
  targetState: SupplierState
): boolean => {
  return SUPPLIER_STATE_TRANSITIONS[currentState].includes(targetState);
};

/** Get allowed supplier transitions */
export const getAllowedSupplierTransitions = (currentState: SupplierState): SupplierState[] => {
  return [...SUPPLIER_STATE_TRANSITIONS[currentState]];
};

/** Calculate qualification score from criteria */
export const calculateQualificationScore = (
  criteria: readonly { weight: number; score?: number; passed: boolean }[]
): number => {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedScore = criteria.reduce((sum, c) => {
    const score = c.passed ? (c.score ?? 100) : 0;
    return sum + (score * c.weight);
  }, 0);

  return Math.round(weightedScore / totalWeight);
};
