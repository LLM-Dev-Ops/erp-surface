/**
 * Sourcing Surface Contracts for ERP Surface Layer
 *
 * Vendor-neutral contracts for strategic sourcing operations.
 * Includes RFx (RFI/RFP/RFQ) management, bid submission, evaluation, and award.
 * All contracts have typed inputs/outputs, preconditions, postconditions,
 * state transitions, and observable events.
 */

import { Result } from '../../../common/types/result';
import { MonetaryAmount, MonetaryOperations } from '../../../common/types/monetary';
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

export const SOURCING_SURFACE = 'SourcingSurface';
export const SOURCING_SURFACE_VERSION = '1.0.0';

/** RFx identifier type */
export type RFxId = string;

/** Bid identifier type */
export type BidId = string;

// ============================================================================
// RFx State Machine
// ============================================================================

/** RFx types */
export type RFxType =
  | 'RFI'    // Request for Information
  | 'RFP'    // Request for Proposal
  | 'RFQ';   // Request for Quotation

/** RFx lifecycle states */
export type RFxState =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'OPEN_FOR_BIDS'
  | 'CLOSED'
  | 'UNDER_EVALUATION'
  | 'AWARDED'
  | 'CANCELLED';

/** Valid state transitions for RFx */
export const RFX_STATE_TRANSITIONS: Record<RFxState, RFxState[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['OPEN_FOR_BIDS', 'CANCELLED'],
  OPEN_FOR_BIDS: ['CLOSED', 'CANCELLED'],
  CLOSED: ['UNDER_EVALUATION', 'CANCELLED'],
  UNDER_EVALUATION: ['AWARDED', 'CANCELLED'],
  AWARDED: [], // Terminal state
  CANCELLED: [] // Terminal state
};

/** Bid lifecycle states */
export type BidState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'REJECTED'
  | 'AWARDED'
  | 'WITHDRAWN';

/** Valid state transitions for bids */
export const BID_STATE_TRANSITIONS: Record<BidState, BidState[]> = {
  DRAFT: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['UNDER_REVIEW', 'WITHDRAWN'],
  UNDER_REVIEW: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['AWARDED', 'REJECTED'],
  REJECTED: [], // Terminal state
  AWARDED: [], // Terminal state
  WITHDRAWN: [] // Terminal state
};

// ============================================================================
// RFx Models
// ============================================================================

/** RFx line item requirement */
export interface RFxLineItem {
  readonly lineId: UUID;
  readonly lineNumber: number;
  readonly itemType: 'MATERIAL' | 'SERVICE' | 'CATEGORY';
  readonly itemCode?: string;
  readonly description: string;
  readonly specifications?: string;
  readonly quantity: number;
  readonly unitOfMeasure: string;
  readonly estimatedUnitPrice?: MonetaryAmount;
  readonly requiredDeliveryDate?: DateString;
  readonly qualityRequirements?: readonly string[];
}

/** RFx evaluation criterion */
export interface EvaluationCriterion {
  readonly criterionId: UUID;
  readonly name: string;
  readonly description: string;
  readonly category: 'TECHNICAL' | 'COMMERCIAL' | 'QUALITY' | 'DELIVERY' | 'SUSTAINABILITY';
  readonly weight: number; // Percentage weight (0-100)
  readonly scoringMethod: 'NUMERIC' | 'PASS_FAIL' | 'RANKING';
  readonly maxScore: number;
  readonly isMandatory: boolean;
}

/** RFx question/clarification */
export interface RFxQuestion {
  readonly questionId: UUID;
  readonly askerId: SupplierId;
  readonly question: string;
  readonly askedAt: Timestamp;
  readonly answer?: string;
  readonly answeredAt?: Timestamp;
  readonly answeredBy?: UserId;
  readonly isPublic: boolean;
}

/** RFx document attachment */
export interface RFxDocument {
  readonly documentId: UUID;
  readonly documentType: 'SPECIFICATION' | 'TERMS' | 'TEMPLATE' | 'ADDENDUM' | 'OTHER';
  readonly name: string;
  readonly description?: string;
  readonly fileReference: string;
  readonly uploadedAt: Timestamp;
  readonly uploadedBy: UserId;
  readonly version: number;
}

/** RFx entity */
export interface RFx {
  readonly rfxId: RFxId;
  readonly rfxNumber: string;
  readonly title: string;
  readonly description: string;
  readonly rfxType: RFxType;
  readonly state: RFxState;
  readonly companyCode: CompanyCode;
  readonly category: string;
  readonly estimatedValue: MonetaryAmount;
  readonly currency: string;
  readonly publishDate?: DateString;
  readonly bidOpenDate: DateString;
  readonly bidCloseDate: DateString;
  readonly awardTargetDate?: DateString;
  readonly lineItems: readonly RFxLineItem[];
  readonly evaluationCriteria: readonly EvaluationCriterion[];
  readonly invitedSuppliers: readonly SupplierId[];
  readonly isPublic: boolean;
  readonly documents: readonly RFxDocument[];
  readonly questions: readonly RFxQuestion[];
  readonly createdAt: Timestamp;
  readonly modifiedAt: Timestamp;
  readonly createdBy: UserId;
  readonly modifiedBy: UserId;
  readonly version: number;
}

// ============================================================================
// Bid Models
// ============================================================================

/** Bid line item response */
export interface BidLineItem {
  readonly bidLineId: UUID;
  readonly rfxLineId: UUID;
  readonly lineNumber: number;
  readonly unitPrice: MonetaryAmount;
  readonly extendedPrice: MonetaryAmount;
  readonly quantity: number;
  readonly deliveryDate?: DateString;
  readonly specifications?: string;
  readonly alternateOffered?: boolean;
  readonly alternateDescription?: string;
}

/** Bid criterion response */
export interface BidCriterionResponse {
  readonly criterionId: UUID;
  readonly response: string;
  readonly supportingDocuments?: readonly string[];
  readonly score?: number; // Assigned during evaluation
  readonly evaluatorComments?: string;
}

/** Bid entity */
export interface Bid {
  readonly bidId: BidId;
  readonly bidNumber: string;
  readonly rfxId: RFxId;
  readonly supplierId: SupplierId;
  readonly state: BidState;
  readonly totalPrice: MonetaryAmount;
  readonly lineItems: readonly BidLineItem[];
  readonly criterionResponses: readonly BidCriterionResponse[];
  readonly validityPeriodDays: number;
  readonly validUntil: DateString;
  readonly termsAccepted: boolean;
  readonly documents: readonly {
    readonly documentId: UUID;
    readonly name: string;
    readonly fileReference: string;
  }[];
  readonly submittedAt?: Timestamp;
  readonly technicalScore?: number;
  readonly commercialScore?: number;
  readonly totalScore?: number;
  readonly rank?: number;
  readonly evaluationNotes?: string;
  readonly createdAt: Timestamp;
  readonly modifiedAt: Timestamp;
  readonly version: number;
}

// ============================================================================
// Award Models
// ============================================================================

/** Award recommendation */
export interface AwardRecommendation {
  readonly bidId: BidId;
  readonly supplierId: SupplierId;
  readonly supplierName?: string;
  readonly totalScore: number;
  readonly rank: number;
  readonly totalPrice: MonetaryAmount;
  readonly priceScore: number;
  readonly technicalScore: number;
  readonly recommendation: 'AWARD' | 'RUNNER_UP' | 'REJECT';
  readonly justification: string;
}

/** Award decision */
export interface AwardDecision {
  readonly awardId: UUID;
  readonly rfxId: RFxId;
  readonly winningBidId: BidId;
  readonly winningSupplierId: SupplierId;
  readonly awardValue: MonetaryAmount;
  readonly awardDate: DateString;
  readonly contractId?: string;
  readonly approvedBy: UserId;
  readonly approvedAt: Timestamp;
  readonly notificationsSent: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

/** Sourcing event types */
export type SourcingEventType =
  | 'RFX_CREATED'
  | 'RFX_PUBLISHED'
  | 'RFX_OPENED_FOR_BIDS'
  | 'RFX_CLOSED'
  | 'RFX_CANCELLED'
  | 'BID_SUBMITTED'
  | 'BID_WITHDRAWN'
  | 'BID_EVALUATION_STARTED'
  | 'BID_EVALUATED'
  | 'BID_SHORTLISTED'
  | 'BID_REJECTED'
  | 'RFX_AWARDED'
  | 'AWARD_CONTRACT_CREATED';

/** Base sourcing event */
export interface SourcingEvent extends CorrelatedEvent {
  readonly rfxId: RFxId;
}

/** RFx created event */
export interface RFxCreatedEvent extends SourcingEvent {
  readonly eventType: 'RFX_CREATED';
  readonly rfxType: RFxType;
  readonly title: string;
  readonly estimatedValue: MonetaryAmount;
  readonly lineCount: number;
  readonly invitedSupplierCount: number;
}

/** RFx published event */
export interface RFxPublishedEvent extends SourcingEvent {
  readonly eventType: 'RFX_PUBLISHED';
  readonly publishDate: DateString;
  readonly bidOpenDate: DateString;
  readonly bidCloseDate: DateString;
  readonly invitedSuppliers: readonly SupplierId[];
  readonly isPublic: boolean;
}

/** Bid submitted event */
export interface BidSubmittedEvent extends SourcingEvent {
  readonly eventType: 'BID_SUBMITTED';
  readonly bidId: BidId;
  readonly supplierId: SupplierId;
  readonly totalPrice: MonetaryAmount;
  readonly lineCount: number;
  readonly validUntil: DateString;
}

/** Bid evaluated event */
export interface BidEvaluatedEvent extends SourcingEvent {
  readonly eventType: 'BID_EVALUATED';
  readonly bidId: BidId;
  readonly supplierId: SupplierId;
  readonly technicalScore: number;
  readonly commercialScore: number;
  readonly totalScore: number;
  readonly rank: number;
}

/** RFx awarded event */
export interface RFxAwardedEvent extends SourcingEvent {
  readonly eventType: 'RFX_AWARDED';
  readonly winningBidId: BidId;
  readonly winningSupplierId: SupplierId;
  readonly awardValue: MonetaryAmount;
  readonly totalBidsReceived: number;
  readonly contractId?: string;
}

// ============================================================================
// Create RFx Contract
// ============================================================================

/** Input for creating an RFx */
export interface CreateRFxInput {
  /** RFx title */
  readonly title: string;

  /** RFx description */
  readonly description: string;

  /** RFx type (RFI, RFP, RFQ) */
  readonly rfxType: RFxType;

  /** Company code */
  readonly companyCode: CompanyCode;

  /** Sourcing category */
  readonly category: string;

  /** Estimated total value */
  readonly estimatedValue: MonetaryAmount;

  /** Transaction currency */
  readonly currency: string;

  /** Date to open for bids */
  readonly bidOpenDate: DateString;

  /** Date to close bids */
  readonly bidCloseDate: DateString;

  /** Target award date */
  readonly awardTargetDate?: DateString;

  /** Line item requirements */
  readonly lineItems: readonly Omit<RFxLineItem, 'lineId'>[];

  /** Evaluation criteria */
  readonly evaluationCriteria: readonly Omit<EvaluationCriterion, 'criterionId'>[];

  /** Suppliers to invite (if not public) */
  readonly invitedSuppliers?: readonly SupplierId[];

  /** Whether open to all suppliers */
  readonly isPublic: boolean;

  /** Initial documents to attach */
  readonly documents?: readonly Omit<RFxDocument, 'documentId' | 'uploadedAt' | 'uploadedBy' | 'version'>[];

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Output from creating an RFx */
export interface CreateRFxOutput {
  /** Assigned RFx ID */
  readonly rfxId: RFxId;

  /** Generated RFx number */
  readonly rfxNumber: string;

  /** Initial state */
  readonly state: RFxState;

  /** Number of line items */
  readonly lineCount: number;

  /** Number of evaluation criteria */
  readonly criteriaCount: number;

  /** Number of invited suppliers */
  readonly invitedSupplierCount: number;

  /** Created version */
  readonly version: number;

  /** Events emitted */
  readonly events: readonly SourcingEvent[];
}

/** Create RFx Contract */
export interface CreateRFxContract {
  readonly name: 'CreateRFx';
  readonly description: 'Creates a new Request for Information/Proposal/Quotation';

  readonly preconditions: CreateRFxPreconditions;
  readonly postconditions: CreateRFxPostconditions;

  execute(
    input: CreateRFxInput,
    context: SourcingExecutionContext
  ): Promise<Result<CreateRFxOutput, ValidationError>>;
}

/** Preconditions for creating an RFx */
export interface CreateRFxPreconditions {
  /** Bid dates must be valid (open before close, close in future) */
  bidDatesValid(bidOpenDate: DateString, bidCloseDate: DateString): boolean;

  /** Estimated value must be positive */
  estimatedValuePositive(estimatedValue: MonetaryAmount): boolean;

  /** At least one line item required */
  hasLineItems(lineItems: readonly Omit<RFxLineItem, 'lineId'>[]): boolean;

  /** At least one evaluation criterion required for RFP */
  hasEvaluationCriteria(rfxType: RFxType, criteria: readonly Omit<EvaluationCriterion, 'criterionId'>[]): boolean;

  /** Evaluation criteria weights must sum to 100 */
  criteriaWeightsValid(criteria: readonly Omit<EvaluationCriterion, 'criterionId'>[]): boolean;

  /** Invited suppliers must exist if not public */
  invitedSuppliersValidIfRequired(
    isPublic: boolean,
    invitedSuppliers: readonly SupplierId[] | undefined
  ): Promise<boolean>;

  /** User has RFx creation permission */
  userCanCreateRFx(userId: UserId): Promise<boolean>;
}

/** Postconditions for creating an RFx */
export interface CreateRFxPostconditions {
  /** RFx ID was assigned */
  rfxIdAssigned(output: CreateRFxOutput): boolean;

  /** RFx number was generated */
  rfxNumberGenerated(output: CreateRFxOutput): boolean;

  /** Initial state is DRAFT */
  initialStateIsDraft(output: CreateRFxOutput): boolean;

  /** Line and criteria counts match input */
  countsMatchInput(output: CreateRFxOutput, input: CreateRFxInput): boolean;

  /** Creation event was emitted */
  creationEventEmitted(output: CreateRFxOutput): boolean;
}

// ============================================================================
// Submit Bid Contract
// ============================================================================

/** Input for submitting a bid */
export interface SubmitBidInput {
  /** RFx ID to bid on */
  readonly rfxId: RFxId;

  /** Supplier ID (submitting entity) */
  readonly supplierId: SupplierId;

  /** Bid line items */
  readonly lineItems: readonly Omit<BidLineItem, 'bidLineId'>[];

  /** Responses to evaluation criteria */
  readonly criterionResponses: readonly Omit<BidCriterionResponse, 'score' | 'evaluatorComments'>[];

  /** Bid validity period in days */
  readonly validityPeriodDays: number;

  /** Terms and conditions accepted */
  readonly termsAccepted: boolean;

  /** Supporting documents */
  readonly documents?: readonly {
    readonly name: string;
    readonly fileReference: string;
  }[];

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Output from submitting a bid */
export interface SubmitBidOutput {
  /** Assigned bid ID */
  readonly bidId: BidId;

  /** Generated bid number */
  readonly bidNumber: string;

  /** Bid state */
  readonly state: BidState;

  /** Total bid price */
  readonly totalPrice: MonetaryAmount;

  /** Valid until date */
  readonly validUntil: DateString;

  /** Submission timestamp */
  readonly submittedAt: Timestamp;

  /** Events emitted */
  readonly events: readonly SourcingEvent[];
}

/** Submit Bid Contract */
export interface SubmitBidContract {
  readonly name: 'SubmitBid';
  readonly description: 'Submits a bid in response to an RFx';

  readonly preconditions: SubmitBidPreconditions;
  readonly postconditions: SubmitBidPostconditions;

  execute(
    input: SubmitBidInput,
    context: SourcingExecutionContext
  ): Promise<Result<SubmitBidOutput, ValidationError | StateError>>;
}

/** Preconditions for submitting a bid */
export interface SubmitBidPreconditions {
  /** RFx must exist */
  rfxExists(rfxId: RFxId): Promise<boolean>;

  /** RFx must be open for bids */
  rfxIsOpenForBids(rfxId: RFxId): Promise<boolean>;

  /** Supplier must be invited or RFx must be public */
  supplierCanBid(rfxId: RFxId, supplierId: SupplierId): Promise<boolean>;

  /** Supplier has not already submitted */
  supplierHasNotSubmitted(rfxId: RFxId, supplierId: SupplierId): Promise<boolean>;

  /** All required line items must be addressed */
  allRequiredLinesAddressed(
    rfxId: RFxId,
    lineItems: readonly Omit<BidLineItem, 'bidLineId'>[]
  ): Promise<boolean>;

  /** All mandatory criteria must be responded to */
  allMandatoryCriteriaAnswered(
    rfxId: RFxId,
    responses: readonly Omit<BidCriterionResponse, 'score' | 'evaluatorComments'>[]
  ): Promise<boolean>;

  /** Terms must be accepted */
  termsAccepted(termsAccepted: boolean): boolean;

  /** Validity period must meet minimum */
  validityPeriodMeetsMinimum(rfxId: RFxId, validityPeriodDays: number): Promise<boolean>;
}

/** Postconditions for submitting a bid */
export interface SubmitBidPostconditions {
  /** Bid ID was assigned */
  bidIdAssigned(output: SubmitBidOutput): boolean;

  /** Bid state is SUBMITTED */
  bidStateIsSubmitted(output: SubmitBidOutput): boolean;

  /** Total price is calculated */
  totalPriceCalculated(output: SubmitBidOutput): boolean;

  /** Submission event was emitted */
  submissionEventEmitted(output: SubmitBidOutput): boolean;
}

// ============================================================================
// Evaluate Bids Contract
// ============================================================================

/** Criterion score for evaluation */
export interface CriterionScore {
  readonly bidId: BidId;
  readonly criterionId: UUID;
  readonly score: number;
  readonly comments?: string;
}

/** Input for evaluating bids */
export interface EvaluateBidsInput {
  /** RFx ID */
  readonly rfxId: RFxId;

  /** Criterion scores for all bids */
  readonly criterionScores: readonly CriterionScore[];

  /** Price scoring method */
  readonly priceScoringMethod: 'LOWEST_PRICE' | 'PRICE_FORMULA' | 'MANUAL';

  /** Normalize scores (0-100 scale) */
  readonly normalizeScores: boolean;

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Bid evaluation result */
export interface BidEvaluationResult {
  readonly bidId: BidId;
  readonly supplierId: SupplierId;
  readonly technicalScore: number;
  readonly commercialScore: number;
  readonly totalScore: number;
  readonly rank: number;
  readonly state: BidState;
  readonly criterionScores: readonly {
    readonly criterionId: UUID;
    readonly score: number;
    readonly weightedScore: number;
  }[];
}

/** Output from evaluating bids */
export interface EvaluateBidsOutput {
  /** RFx ID */
  readonly rfxId: RFxId;

  /** Evaluation results per bid */
  readonly evaluationResults: readonly BidEvaluationResult[];

  /** Award recommendations */
  readonly recommendations: readonly AwardRecommendation[];

  /** RFx state after evaluation */
  readonly rfxState: RFxState;

  /** Events emitted */
  readonly events: readonly SourcingEvent[];
}

/** Evaluate Bids Contract */
export interface EvaluateBidsContract {
  readonly name: 'EvaluateBids';
  readonly description: 'Evaluates and scores all submitted bids for an RFx';

  readonly preconditions: EvaluateBidsPreconditions;
  readonly postconditions: EvaluateBidsPostconditions;

  execute(
    input: EvaluateBidsInput,
    context: SourcingExecutionContext
  ): Promise<Result<EvaluateBidsOutput, ValidationError | StateError>>;
}

/** Preconditions for evaluating bids */
export interface EvaluateBidsPreconditions {
  /** RFx must exist */
  rfxExists(rfxId: RFxId): Promise<boolean>;

  /** RFx must be closed */
  rfxIsClosed(rfxId: RFxId): Promise<boolean>;

  /** At least one bid must be submitted */
  hasBids(rfxId: RFxId): Promise<boolean>;

  /** All criteria for all bids must be scored */
  allCriteriaScored(
    rfxId: RFxId,
    criterionScores: readonly CriterionScore[]
  ): Promise<boolean>;

  /** User has evaluation authority */
  userCanEvaluate(userId: UserId, rfxId: RFxId): Promise<boolean>;
}

/** Postconditions for evaluating bids */
export interface EvaluateBidsPostconditions {
  /** All bids have scores */
  allBidsScored(output: EvaluateBidsOutput): boolean;

  /** Rankings are assigned (no ties at top) */
  rankingsAssigned(output: EvaluateBidsOutput): boolean;

  /** Recommendations are provided */
  recommendationsProvided(output: EvaluateBidsOutput): boolean;

  /** Evaluation events were emitted */
  evaluationEventsEmitted(output: EvaluateBidsOutput): boolean;
}

// ============================================================================
// Award Contract Contract
// ============================================================================

/** Input for awarding a contract */
export interface AwardContractInput {
  /** RFx ID */
  readonly rfxId: RFxId;

  /** Winning bid ID */
  readonly winningBidId: BidId;

  /** Award justification */
  readonly justification: string;

  /** Create contract automatically */
  readonly createContract: boolean;

  /** Contract details (if creating) */
  readonly contractDetails?: {
    readonly title: string;
    readonly startDate: DateString;
    readonly endDate: DateString;
    readonly paymentTermsCode: string;
  };

  /** Notify all participants */
  readonly notifyParticipants: boolean;

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Output from awarding a contract */
export interface AwardContractOutput {
  /** RFx ID */
  readonly rfxId: RFxId;

  /** Award decision details */
  readonly awardDecision: AwardDecision;

  /** Updated RFx state */
  readonly rfxState: RFxState;

  /** Created contract ID (if applicable) */
  readonly contractId?: string;

  /** Notifications sent count */
  readonly notificationsSent: number;

  /** Events emitted */
  readonly events: readonly SourcingEvent[];
}

/** Award Contract Contract */
export interface AwardContractContract {
  readonly name: 'AwardContract';
  readonly description: 'Awards a contract to the winning bidder';

  readonly preconditions: AwardContractPreconditions;
  readonly postconditions: AwardContractPostconditions;

  execute(
    input: AwardContractInput,
    context: SourcingExecutionContext
  ): Promise<Result<AwardContractOutput, ValidationError | StateError>>;
}

/** Preconditions for awarding a contract */
export interface AwardContractPreconditions {
  /** RFx must exist */
  rfxExists(rfxId: RFxId): Promise<boolean>;

  /** RFx must be under evaluation */
  rfxIsUnderEvaluation(rfxId: RFxId): Promise<boolean>;

  /** Winning bid must exist */
  winningBidExists(bidId: BidId): Promise<boolean>;

  /** Winning bid must be shortlisted */
  winningBidIsShortlisted(bidId: BidId): Promise<boolean>;

  /** Winning bid must still be valid */
  winningBidIsValid(bidId: BidId): Promise<boolean>;

  /** User has award authority */
  userCanAward(userId: UserId, rfxId: RFxId, value: MonetaryAmount): Promise<boolean>;

  /** Contract details required if creating contract */
  contractDetailsProvidedIfRequired(
    createContract: boolean,
    contractDetails: unknown
  ): boolean;
}

/** Postconditions for awarding a contract */
export interface AwardContractPostconditions {
  /** Award decision was created */
  awardDecisionCreated(output: AwardContractOutput): boolean;

  /** RFx state is AWARDED */
  rfxStateIsAwarded(output: AwardContractOutput): boolean;

  /** Contract was created if requested */
  contractCreatedIfRequested(output: AwardContractOutput, input: AwardContractInput): boolean;

  /** Award event was emitted */
  awardEventEmitted(output: AwardContractOutput): boolean;
}

// ============================================================================
// Execution Context
// ============================================================================

/** Context for sourcing contract execution */
export interface SourcingExecutionContext {
  /** Timestamp provider */
  readonly timestampProvider: TimestampProvider;

  /** UUID generator */
  readonly uuidGenerator: () => UUID;

  /** Correlation ID generator */
  readonly correlationIdGenerator: () => CorrelationId;

  /** RFx ID generator */
  readonly rfxIdGenerator: () => Promise<RFxId>;

  /** RFx number generator */
  readonly rfxNumberGenerator: (type: RFxType) => Promise<string>;

  /** Bid ID generator */
  readonly bidIdGenerator: () => Promise<BidId>;

  /** Bid number generator */
  readonly bidNumberGenerator: () => Promise<string>;

  /** Current user */
  readonly currentUser: UserId;

  /** Operational mode */
  readonly mode: 'SIMULATION' | 'EXECUTION';
}

/** Default execution context factory */
export const createDefaultSourcingExecutionContext = (
  currentUser: UserId,
  mode: 'SIMULATION' | 'EXECUTION' = 'EXECUTION'
): SourcingExecutionContext => ({
  timestampProvider: SystemTimestampProvider,
  uuidGenerator: () => IdentityOperations.generateUUID(),
  correlationIdGenerator: () => IdentityOperations.generateCorrelationId('src'),
  rfxIdGenerator: async () => `RFX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  rfxNumberGenerator: async (type: RFxType) => {
    const year = new Date().getFullYear();
    const seq = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${type}-${year}-${seq}`;
  },
  bidIdGenerator: async () => `BID-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  bidNumberGenerator: async () => {
    const seq = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `BID-${seq}`;
  },
  currentUser,
  mode
});

// ============================================================================
// Surface Definition
// ============================================================================

/** Sourcing Surface - manages strategic sourcing */
export interface SourcingSurface {
  readonly surfaceName: typeof SOURCING_SURFACE;
  readonly surfaceVersion: typeof SOURCING_SURFACE_VERSION;

  readonly contracts: {
    readonly createRFx: CreateRFxContract;
    readonly submitBid: SubmitBidContract;
    readonly evaluateBids: EvaluateBidsContract;
    readonly awardContract: AwardContractContract;
  };
}

/** Create the Sourcing Surface */
export const createSourcingSurface = (): SourcingSurface => {
  return {
    surfaceName: SOURCING_SURFACE,
    surfaceVersion: SOURCING_SURFACE_VERSION,
    contracts: {
      createRFx: {
        name: 'CreateRFx',
        description: 'Creates a new Request for Information/Proposal/Quotation',
        preconditions: {
          bidDatesValid: (openDate, closeDate) => openDate < closeDate,
          estimatedValuePositive: (value) => value.value > 0,
          hasLineItems: (items) => items.length > 0,
          hasEvaluationCriteria: (type, criteria) =>
            type !== 'RFP' || criteria.length > 0,
          criteriaWeightsValid: (criteria) => {
            const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
            return Math.abs(totalWeight - 100) < 0.01 || criteria.length === 0;
          },
          invitedSuppliersValidIfRequired: async (isPublic, suppliers) =>
            isPublic || (suppliers !== undefined && suppliers.length > 0),
          userCanCreateRFx: async () => true
        },
        postconditions: {
          rfxIdAssigned: (output) => !!output.rfxId,
          rfxNumberGenerated: (output) => !!output.rfxNumber,
          initialStateIsDraft: (output) => output.state === 'DRAFT',
          countsMatchInput: (output, input) =>
            output.lineCount === input.lineItems.length &&
            output.criteriaCount === input.evaluationCriteria.length,
          creationEventEmitted: (output) =>
            output.events.some(e => e.eventType === 'RFX_CREATED')
        },
        execute: async () => {
          throw new Error('Contract execution requires binding implementation');
        }
      },
      submitBid: {
        name: 'SubmitBid',
        description: 'Submits a bid in response to an RFx',
        preconditions: {
          rfxExists: async () => true,
          rfxIsOpenForBids: async () => true,
          supplierCanBid: async () => true,
          supplierHasNotSubmitted: async () => true,
          allRequiredLinesAddressed: async () => true,
          allMandatoryCriteriaAnswered: async () => true,
          termsAccepted: (accepted) => accepted === true,
          validityPeriodMeetsMinimum: async () => true
        },
        postconditions: {
          bidIdAssigned: (output) => !!output.bidId,
          bidStateIsSubmitted: (output) => output.state === 'SUBMITTED',
          totalPriceCalculated: (output) => output.totalPrice.value > 0,
          submissionEventEmitted: (output) =>
            output.events.some(e => e.eventType === 'BID_SUBMITTED')
        },
        execute: async () => {
          throw new Error('Contract execution requires binding implementation');
        }
      },
      evaluateBids: {
        name: 'EvaluateBids',
        description: 'Evaluates and scores all submitted bids for an RFx',
        preconditions: {
          rfxExists: async () => true,
          rfxIsClosed: async () => true,
          hasBids: async () => true,
          allCriteriaScored: async () => true,
          userCanEvaluate: async () => true
        },
        postconditions: {
          allBidsScored: (output) =>
            output.evaluationResults.every(r => r.totalScore !== undefined),
          rankingsAssigned: (output) =>
            output.evaluationResults.every(r => r.rank !== undefined),
          recommendationsProvided: (output) =>
            output.recommendations.length > 0,
          evaluationEventsEmitted: (output) =>
            output.events.some(e => e.eventType === 'BID_EVALUATED')
        },
        execute: async () => {
          throw new Error('Contract execution requires binding implementation');
        }
      },
      awardContract: {
        name: 'AwardContract',
        description: 'Awards a contract to the winning bidder',
        preconditions: {
          rfxExists: async () => true,
          rfxIsUnderEvaluation: async () => true,
          winningBidExists: async () => true,
          winningBidIsShortlisted: async () => true,
          winningBidIsValid: async () => true,
          userCanAward: async () => true,
          contractDetailsProvidedIfRequired: (createContract, details) =>
            !createContract || details !== undefined
        },
        postconditions: {
          awardDecisionCreated: (output) => !!output.awardDecision,
          rfxStateIsAwarded: (output) => output.rfxState === 'AWARDED',
          contractCreatedIfRequested: (output, input) =>
            !input.createContract || !!output.contractId,
          awardEventEmitted: (output) =>
            output.events.some(e => e.eventType === 'RFX_AWARDED')
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

/** Validate RFx state transition */
export const isValidRFxTransition = (
  currentState: RFxState,
  targetState: RFxState
): boolean => {
  return RFX_STATE_TRANSITIONS[currentState].includes(targetState);
};

/** Validate bid state transition */
export const isValidBidTransition = (
  currentState: BidState,
  targetState: BidState
): boolean => {
  return BID_STATE_TRANSITIONS[currentState].includes(targetState);
};

/** Get allowed RFx transitions */
export const getAllowedRFxTransitions = (currentState: RFxState): RFxState[] => {
  return [...RFX_STATE_TRANSITIONS[currentState]];
};

/** Get allowed bid transitions */
export const getAllowedBidTransitions = (currentState: BidState): BidState[] => {
  return [...BID_STATE_TRANSITIONS[currentState]];
};

/** Calculate weighted score from criterion scores */
export const calculateWeightedScore = (
  scores: readonly { criterionId: UUID; score: number }[],
  criteria: readonly { criterionId: UUID; weight: number; maxScore: number }[]
): number => {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const criterion of criteria) {
    const scoreEntry = scores.find(s => s.criterionId === criterion.criterionId);
    if (scoreEntry) {
      const normalizedScore = (scoreEntry.score / criterion.maxScore) * 100;
      totalWeightedScore += normalizedScore * criterion.weight;
      totalWeight += criterion.weight;
    }
  }

  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
};

/** Calculate bid total from line items */
export const calculateBidTotal = (
  lineItems: readonly { extendedPrice: MonetaryAmount }[]
): MonetaryAmount => {
  if (lineItems.length === 0) {
    return MonetaryOperations.create(0, 'USD');
  }

  const currency = lineItems[0].extendedPrice.currency;

  return lineItems.reduce(
    (sum, line) => MonetaryOperations.add(sum, line.extendedPrice),
    MonetaryOperations.create(0, currency)
  );
};

/** Rank bids by score (descending) */
export const rankBidsByScore = (
  bids: readonly { bidId: BidId; totalScore: number }[]
): readonly { bidId: BidId; rank: number }[] => {
  const sorted = [...bids].sort((a, b) => b.totalScore - a.totalScore);

  return sorted.map((bid, index) => ({
    bidId: bid.bidId,
    rank: index + 1
  }));
};
