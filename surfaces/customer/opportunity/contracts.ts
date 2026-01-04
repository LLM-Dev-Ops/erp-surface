/**
 * Opportunity Surface Contracts
 * Defines the contract interfaces for sales opportunity management
 */

import {
  EntityId,
  ISODateString,
  ISODateTimeString,
  Money,
  ContractInput,
  ContractOutput,
  Precondition,
  Postcondition,
  ValidationResult,
} from '../../common/types';
import { DomainEvent } from '../../common/events';
import {
  ValidationError,
  PreconditionError,
  NotFoundError,
  StateTransitionError,
} from '../../common/errors';

// ============================================================================
// Core Opportunity Types
// ============================================================================

export type OpportunityId = EntityId;
export type CustomerId = EntityId;
export type ContactId = EntityId;
export type ProductId = EntityId;
export type SalesRepId = EntityId;

export type OpportunityStage =
  | 'PROSPECTING'
  | 'QUALIFICATION'
  | 'NEEDS_ANALYSIS'
  | 'VALUE_PROPOSITION'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export type OpportunityType = 'NEW_BUSINESS' | 'UPSELL' | 'CROSS_SELL' | 'RENEWAL';

export type ForecastCategory = 
  | 'PIPELINE'
  | 'BEST_CASE'
  | 'COMMIT'
  | 'CLOSED'
  | 'OMITTED';

export interface OpportunityProfile {
  readonly opportunityId: OpportunityId;
  readonly name: string;
  readonly customerId: CustomerId;
  readonly primaryContactId?: ContactId;
  readonly stage: OpportunityStage;
  readonly type: OpportunityType;
  readonly amount: Money;
  readonly probability: number;
  readonly expectedCloseDate: ISODateString;
  readonly forecastCategory: ForecastCategory;
  readonly salesRepId: SalesRepId;
  readonly description?: string;
  readonly source?: string;
  readonly competitorInfo?: string;
  readonly nextSteps?: string;
  readonly createdAt: ISODateTimeString;
  readonly modifiedAt: ISODateTimeString;
  readonly closedAt?: ISODateTimeString;
}

// ============================================================================
// Stage Probability Mapping
// ============================================================================

export const stageProbabilityDefaults: Record<OpportunityStage, number> = {
  PROSPECTING: 10,
  QUALIFICATION: 20,
  NEEDS_ANALYSIS: 30,
  VALUE_PROPOSITION: 50,
  PROPOSAL: 60,
  NEGOTIATION: 80,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
};

export const stageOrder: readonly OpportunityStage[] = [
  'PROSPECTING',
  'QUALIFICATION',
  'NEEDS_ANALYSIS',
  'VALUE_PROPOSITION',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
];

// ============================================================================
// CreateOpportunityContract
// ============================================================================

export interface CreateOpportunityInput {
  readonly name: string;
  readonly customerId: CustomerId;
  readonly primaryContactId?: ContactId;
  readonly type: OpportunityType;
  readonly amount: Money;
  readonly expectedCloseDate: ISODateString;
  readonly salesRepId: SalesRepId;
  readonly description?: string;
  readonly source?: string;
  readonly probability?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface CreateOpportunityOutput {
  readonly opportunityId: OpportunityId;
  readonly stage: OpportunityStage;
  readonly probability: number;
  readonly forecastCategory: ForecastCategory;
  readonly weightedAmount: Money;
  readonly createdAt: ISODateTimeString;
}

export interface CreateOpportunityContract {
  readonly name: 'CreateOpportunity';
  readonly version: '1.0.0';
  readonly input: ContractInput<CreateOpportunityInput>;
  readonly output: ContractOutput<CreateOpportunityOutput>;
  readonly preconditions: readonly Precondition<CreateOpportunityInput>[];
  readonly postconditions: readonly Postcondition<CreateOpportunityInput, CreateOpportunityOutput>[];
  readonly events: readonly OpportunityCreatedEvent[];
  readonly errors: readonly (ValidationError | PreconditionError)[];
}

export const createOpportunityPreconditions: readonly Precondition<CreateOpportunityInput>[] = [
  {
    name: 'ValidName',
    description: 'Opportunity name must be non-empty and less than 255 characters',
    check: (input) =>
      input.name.trim().length > 0 && input.name.length <= 255,
  },
  {
    name: 'ValidCustomerId',
    description: 'Customer ID must be provided',
    check: (input) => !!input.customerId && input.customerId.length > 0,
  },
  {
    name: 'ValidAmount',
    description: 'Amount must be non-negative',
    check: (input) => input.amount.amount >= 0,
  },
  {
    name: 'ValidExpectedCloseDate',
    description: 'Expected close date must not be in the past',
    check: (input) => {
      const closeDate = new Date(input.expectedCloseDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return closeDate >= today;
    },
  },
  {
    name: 'ValidProbability',
    description: 'Probability, if provided, must be between 0 and 100',
    check: (input) =>
      input.probability === undefined ||
      (input.probability >= 0 && input.probability <= 100),
  },
  {
    name: 'ValidSalesRep',
    description: 'Sales representative must be assigned',
    check: (input) => !!input.salesRepId && input.salesRepId.length > 0,
  },
];

export const createOpportunityPostconditions: readonly Postcondition<CreateOpportunityInput, CreateOpportunityOutput>[] = [
  {
    name: 'OpportunityIdGenerated',
    description: 'A unique opportunity ID must be generated',
    check: (_input, output) =>
      !!output.opportunityId && output.opportunityId.length > 0,
  },
  {
    name: 'InitialStageIsProspecting',
    description: 'New opportunity must start in PROSPECTING stage',
    check: (_input, output) => output.stage === 'PROSPECTING',
  },
  {
    name: 'ForecastCategoryAssigned',
    description: 'Forecast category must be assigned',
    check: (_input, output) => !!output.forecastCategory,
  },
  {
    name: 'WeightedAmountCalculated',
    description: 'Weighted amount must be calculated based on probability',
    check: (_input, output) => output.weightedAmount.amount >= 0,
  },
];

// ============================================================================
// UpdateOpportunityStageContract
// ============================================================================

export interface UpdateOpportunityStageInput {
  readonly opportunityId: OpportunityId;
  readonly newStage: OpportunityStage;
  readonly reason?: string;
  readonly closedReason?: string;
  readonly competitorId?: EntityId;
}

export interface UpdateOpportunityStageOutput {
  readonly opportunityId: OpportunityId;
  readonly previousStage: OpportunityStage;
  readonly newStage: OpportunityStage;
  readonly previousProbability: number;
  readonly newProbability: number;
  readonly forecastCategory: ForecastCategory;
  readonly stageChangedAt: ISODateTimeString;
  readonly daysInPreviousStage: number;
}

export interface UpdateOpportunityStageContract {
  readonly name: 'UpdateOpportunityStage';
  readonly version: '1.0.0';
  readonly input: ContractInput<UpdateOpportunityStageInput>;
  readonly output: ContractOutput<UpdateOpportunityStageOutput>;
  readonly preconditions: readonly Precondition<UpdateOpportunityStageInput>[];
  readonly postconditions: readonly Postcondition<UpdateOpportunityStageInput, UpdateOpportunityStageOutput>[];
  readonly events: readonly OpportunityStageChangedEvent[];
  readonly errors: readonly (NotFoundError | StateTransitionError | PreconditionError)[];
}

export const updateOpportunityStagePreconditions: readonly Precondition<UpdateOpportunityStageInput>[] = [
  {
    name: 'ValidOpportunityId',
    description: 'Opportunity ID must be valid',
    check: (input) => !!input.opportunityId && input.opportunityId.length > 0,
  },
  {
    name: 'ValidStage',
    description: 'New stage must be a valid opportunity stage',
    check: (input) =>
      stageOrder.includes(input.newStage) || input.newStage === 'CLOSED_LOST',
  },
  {
    name: 'ClosedReasonRequiredForLost',
    description: 'Closed reason is required when closing as lost',
    check: (input) =>
      input.newStage !== 'CLOSED_LOST' ||
      (!!input.closedReason && input.closedReason.trim().length > 0),
  },
];

export const updateOpportunityStagePostconditions: readonly Postcondition<UpdateOpportunityStageInput, UpdateOpportunityStageOutput>[] = [
  {
    name: 'StageUpdated',
    description: 'Stage must be updated to new stage',
    check: (input, output) => output.newStage === input.newStage,
  },
  {
    name: 'ProbabilityAdjusted',
    description: 'Probability must be adjusted based on stage',
    check: (_input, output) =>
      output.newProbability >= 0 && output.newProbability <= 100,
  },
  {
    name: 'ForecastCategoryUpdated',
    description: 'Forecast category must be updated',
    check: (_input, output) => !!output.forecastCategory,
  },
];

// ============================================================================
// ForecastOpportunityContract
// ============================================================================

export interface ForecastOpportunityInput {
  readonly opportunityId: OpportunityId;
  readonly forecastCategory: ForecastCategory;
  readonly adjustedAmount?: Money;
  readonly adjustedCloseDate?: ISODateString;
  readonly forecastNotes?: string;
}

export interface ForecastOpportunityOutput {
  readonly opportunityId: OpportunityId;
  readonly previousForecastCategory: ForecastCategory;
  readonly newForecastCategory: ForecastCategory;
  readonly previousWeightedAmount: Money;
  readonly newWeightedAmount: Money;
  readonly forecastedAt: ISODateTimeString;
}

export interface ForecastOpportunityContract {
  readonly name: 'ForecastOpportunity';
  readonly version: '1.0.0';
  readonly input: ContractInput<ForecastOpportunityInput>;
  readonly output: ContractOutput<ForecastOpportunityOutput>;
  readonly preconditions: readonly Precondition<ForecastOpportunityInput>[];
  readonly postconditions: readonly Postcondition<ForecastOpportunityInput, ForecastOpportunityOutput>[];
  readonly events: readonly OpportunityForecastedEvent[];
  readonly errors: readonly (NotFoundError | PreconditionError)[];
}

export const forecastOpportunityPreconditions: readonly Precondition<ForecastOpportunityInput>[] = [
  {
    name: 'ValidOpportunityId',
    description: 'Opportunity ID must be valid',
    check: (input) => !!input.opportunityId && input.opportunityId.length > 0,
  },
  {
    name: 'ValidForecastCategory',
    description: 'Forecast category must be valid',
    check: (input) =>
      ['PIPELINE', 'BEST_CASE', 'COMMIT', 'CLOSED', 'OMITTED'].includes(
        input.forecastCategory
      ),
  },
  {
    name: 'ValidAdjustedAmount',
    description: 'Adjusted amount, if provided, must be non-negative',
    check: (input) =>
      !input.adjustedAmount || input.adjustedAmount.amount >= 0,
  },
];

export const forecastOpportunityPostconditions: readonly Postcondition<ForecastOpportunityInput, ForecastOpportunityOutput>[] = [
  {
    name: 'ForecastCategoryUpdated',
    description: 'Forecast category must be updated',
    check: (input, output) =>
      output.newForecastCategory === input.forecastCategory,
  },
  {
    name: 'WeightedAmountRecalculated',
    description: 'Weighted amount must be recalculated',
    check: (_input, output) => output.newWeightedAmount.amount >= 0,
  },
];

// ============================================================================
// CloseOpportunityContract
// ============================================================================

export type CloseOutcome = 'WON' | 'LOST';

export interface CloseOpportunityInput {
  readonly opportunityId: OpportunityId;
  readonly outcome: CloseOutcome;
  readonly actualAmount?: Money;
  readonly closeReason: string;
  readonly competitorId?: EntityId;
  readonly lessonLearned?: string;
}

export interface CloseOpportunityOutput {
  readonly opportunityId: OpportunityId;
  readonly outcome: CloseOutcome;
  readonly finalAmount: Money;
  readonly finalStage: OpportunityStage;
  readonly closedAt: ISODateTimeString;
  readonly daysToClose: number;
  readonly salesCycleDeviation: number; // Days from expected close
}

export interface CloseOpportunityContract {
  readonly name: 'CloseOpportunity';
  readonly version: '1.0.0';
  readonly input: ContractInput<CloseOpportunityInput>;
  readonly output: ContractOutput<CloseOpportunityOutput>;
  readonly preconditions: readonly Precondition<CloseOpportunityInput>[];
  readonly postconditions: readonly Postcondition<CloseOpportunityInput, CloseOpportunityOutput>[];
  readonly events: readonly OpportunityClosedEvent[];
  readonly errors: readonly (NotFoundError | PreconditionError | StateTransitionError)[];
}

export const closeOpportunityPreconditions: readonly Precondition<CloseOpportunityInput>[] = [
  {
    name: 'ValidOpportunityId',
    description: 'Opportunity ID must be valid',
    check: (input) => !!input.opportunityId && input.opportunityId.length > 0,
  },
  {
    name: 'ValidOutcome',
    description: 'Outcome must be WON or LOST',
    check: (input) => input.outcome === 'WON' || input.outcome === 'LOST',
  },
  {
    name: 'CloseReasonRequired',
    description: 'Close reason must be provided',
    check: (input) => !!input.closeReason && input.closeReason.trim().length > 0,
  },
  {
    name: 'ActualAmountRequiredForWon',
    description: 'Actual amount is required when closing as won',
    check: (input) =>
      input.outcome !== 'WON' ||
      (!!input.actualAmount && input.actualAmount.amount >= 0),
  },
];

export const closeOpportunityPostconditions: readonly Postcondition<CloseOpportunityInput, CloseOpportunityOutput>[] = [
  {
    name: 'OutcomeMatches',
    description: 'Output outcome must match input outcome',
    check: (input, output) => output.outcome === input.outcome,
  },
  {
    name: 'FinalStageSet',
    description: 'Final stage must be set correctly based on outcome',
    check: (input, output) =>
      (input.outcome === 'WON' && output.finalStage === 'CLOSED_WON') ||
      (input.outcome === 'LOST' && output.finalStage === 'CLOSED_LOST'),
  },
  {
    name: 'ClosedTimestampSet',
    description: 'Closed timestamp must be set',
    check: (_input, output) => !!output.closedAt,
  },
];

// ============================================================================
// Event Definitions
// ============================================================================

export const OPPORTUNITY_EVENT_TYPES = {
  OPPORTUNITY_CREATED: 'opportunity.created',
  OPPORTUNITY_STAGE_CHANGED: 'opportunity.stage.changed',
  OPPORTUNITY_FORECASTED: 'opportunity.forecasted',
  OPPORTUNITY_CLOSED: 'opportunity.closed',
  OPPORTUNITY_UPDATED: 'opportunity.updated',
} as const;

export interface OpportunityCreatedPayload {
  readonly opportunityId: OpportunityId;
  readonly name: string;
  readonly customerId: CustomerId;
  readonly type: OpportunityType;
  readonly amount: Money;
  readonly stage: OpportunityStage;
  readonly probability: number;
  readonly forecastCategory: ForecastCategory;
  readonly salesRepId: SalesRepId;
  readonly expectedCloseDate: ISODateString;
}

export interface OpportunityCreatedEvent extends DomainEvent<OpportunityCreatedPayload> {
  readonly eventType: typeof OPPORTUNITY_EVENT_TYPES.OPPORTUNITY_CREATED;
  readonly aggregateType: 'Opportunity';
}

export interface OpportunityStageChangedPayload {
  readonly opportunityId: OpportunityId;
  readonly previousStage: OpportunityStage;
  readonly newStage: OpportunityStage;
  readonly previousProbability: number;
  readonly newProbability: number;
  readonly reason?: string;
}

export interface OpportunityStageChangedEvent extends DomainEvent<OpportunityStageChangedPayload> {
  readonly eventType: typeof OPPORTUNITY_EVENT_TYPES.OPPORTUNITY_STAGE_CHANGED;
  readonly aggregateType: 'Opportunity';
}

export interface OpportunityForecastedPayload {
  readonly opportunityId: OpportunityId;
  readonly previousForecastCategory: ForecastCategory;
  readonly newForecastCategory: ForecastCategory;
  readonly adjustedAmount?: Money;
  readonly adjustedCloseDate?: ISODateString;
}

export interface OpportunityForecastedEvent extends DomainEvent<OpportunityForecastedPayload> {
  readonly eventType: typeof OPPORTUNITY_EVENT_TYPES.OPPORTUNITY_FORECASTED;
  readonly aggregateType: 'Opportunity';
}

export interface OpportunityClosedPayload {
  readonly opportunityId: OpportunityId;
  readonly outcome: CloseOutcome;
  readonly finalAmount: Money;
  readonly finalStage: OpportunityStage;
  readonly closeReason: string;
  readonly daysToClose: number;
  readonly competitorId?: EntityId;
}

export interface OpportunityClosedEvent extends DomainEvent<OpportunityClosedPayload> {
  readonly eventType: typeof OPPORTUNITY_EVENT_TYPES.OPPORTUNITY_CLOSED;
  readonly aggregateType: 'Opportunity';
}

// ============================================================================
// OpportunitySurface Interface
// ============================================================================

export interface OpportunitySurface {
  createOpportunity(
    input: ContractInput<CreateOpportunityInput>
  ): Promise<ContractOutput<CreateOpportunityOutput>>;

  updateOpportunityStage(
    input: ContractInput<UpdateOpportunityStageInput>
  ): Promise<ContractOutput<UpdateOpportunityStageOutput>>;

  forecastOpportunity(
    input: ContractInput<ForecastOpportunityInput>
  ): Promise<ContractOutput<ForecastOpportunityOutput>>;

  closeOpportunity(
    input: ContractInput<CloseOpportunityInput>
  ): Promise<ContractOutput<CloseOpportunityOutput>>;

  validateOpportunity(data: CreateOpportunityInput): ValidationResult;

  subscribeToEvents(
    handler: (
      event:
        | OpportunityCreatedEvent
        | OpportunityStageChangedEvent
        | OpportunityForecastedEvent
        | OpportunityClosedEvent
    ) => void
  ): () => void;
}

// ============================================================================
// State Machine Helpers
// ============================================================================

export function canTransitionStage(
  currentStage: OpportunityStage,
  targetStage: OpportunityStage
): boolean {
  // Cannot transition from closed stages
  if (currentStage === 'CLOSED_WON' || currentStage === 'CLOSED_LOST') {
    return false;
  }

  // Can always close as lost
  if (targetStage === 'CLOSED_LOST') {
    return true;
  }

  // Can close as won only from NEGOTIATION
  if (targetStage === 'CLOSED_WON') {
    return currentStage === 'NEGOTIATION';
  }

  const currentIndex = stageOrder.indexOf(currentStage);
  const targetIndex = stageOrder.indexOf(targetStage);

  // Allow moving forward or backward by one stage (except for closed)
  return Math.abs(targetIndex - currentIndex) === 1;
}

export function calculateForecastCategory(
  stage: OpportunityStage,
  probability: number
): ForecastCategory {
  if (stage === 'CLOSED_WON') return 'CLOSED';
  if (stage === 'CLOSED_LOST') return 'OMITTED';
  if (probability >= 75) return 'COMMIT';
  if (probability >= 50) return 'BEST_CASE';
  return 'PIPELINE';
}

export function calculateWeightedAmount(amount: Money, probability: number): Money {
  return {
    amount: amount.amount * (probability / 100),
    currency: amount.currency,
  };
}
