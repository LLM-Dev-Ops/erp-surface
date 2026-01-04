/**
 * Case Surface Contracts
 * Defines the contract interfaces for customer service case management
 */

import {
  EntityId,
  ISODateTimeString,
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
import { CaseState, CasePriority, CaseChannel } from './models';

// ============================================================================
// Core Case Types
// ============================================================================

export type CaseId = EntityId;
export type CaseNumber = string;
export type ContactId = EntityId;
export type QueueId = EntityId;
export type AgentId = EntityId;
export type ResolutionId = EntityId;

export type CaseType =
  | 'INCIDENT'
  | 'SERVICE_REQUEST'
  | 'INQUIRY'
  | 'COMPLAINT'
  | 'FEEDBACK';

export interface SLATarget {
  readonly responseTimeMinutes: number;
  readonly resolutionTimeMinutes: number;
  readonly businessHoursOnly: boolean;
  readonly priority: CasePriority;
}

export interface CaseProfile {
  readonly caseId: CaseId;
  readonly caseNumber: CaseNumber;
  readonly contactId: ContactId;
  readonly caseType: CaseType;
  readonly subject: string;
  readonly description: string;
  readonly priority: CasePriority;
  readonly channel: CaseChannel;
  readonly state: CaseState;
  readonly assignedQueueId?: QueueId;
  readonly assignedAgentId?: AgentId;
  readonly slaTarget: SLATarget;
  readonly slaResponseDue?: ISODateTimeString;
  readonly slaResolutionDue?: ISODateTimeString;
  readonly firstResponseAt?: ISODateTimeString;
  readonly resolvedAt?: ISODateTimeString;
  readonly closedAt?: ISODateTimeString;
  readonly createdAt: ISODateTimeString;
  readonly modifiedAt: ISODateTimeString;
}

// ============================================================================
// CreateCaseContract
// ============================================================================

export interface CreateCaseInput {
  readonly contactId: ContactId;
  readonly caseType: CaseType;
  readonly subject: string;
  readonly description: string;
  readonly priority: CasePriority;
  readonly channel: CaseChannel;
  readonly relatedCaseId?: CaseId;
  readonly productId?: EntityId;
  readonly categoryId?: EntityId;
  readonly metadata?: Record<string, unknown>;
}

export interface CreateCaseOutput {
  readonly caseNumber: CaseNumber;
  readonly caseStatus: CaseState;
  readonly assignedQueue: QueueId;
  readonly slaTarget: SLATarget;
  readonly caseId: CaseId;
  readonly slaResponseDue: ISODateTimeString;
  readonly slaResolutionDue: ISODateTimeString;
  readonly createdAt: ISODateTimeString;
}

export interface CreateCaseContract {
  readonly name: 'CreateCase';
  readonly version: '1.0.0';
  readonly input: ContractInput<CreateCaseInput>;
  readonly output: ContractOutput<CreateCaseOutput>;
  readonly preconditions: readonly Precondition<CreateCaseInput>[];
  readonly postconditions: readonly Postcondition<CreateCaseInput, CreateCaseOutput>[];
  readonly events: readonly (CaseCreationRequestedEvent | CaseNumberAssignedEvent | SLACalculatedEvent | CaseRoutedEvent | CaseCreationCompletedEvent)[];
  readonly errors: readonly (ValidationError | PreconditionError)[];
}

export const createCasePreconditions: readonly Precondition<CreateCaseInput>[] = [
  {
    name: 'ValidContactId',
    description: 'Contact ID must be a valid non-empty identifier',
    check: (input) => !!input.contactId && input.contactId.length > 0,
  },
  {
    name: 'ValidCaseType',
    description: 'Case type must be valid',
    check: (input) =>
      ['INCIDENT', 'SERVICE_REQUEST', 'INQUIRY', 'COMPLAINT', 'FEEDBACK'].includes(
        input.caseType
      ),
  },
  {
    name: 'ValidSubject',
    description: 'Subject must be non-empty and less than 500 characters',
    check: (input) =>
      input.subject.trim().length > 0 && input.subject.length <= 500,
  },
  {
    name: 'ValidDescription',
    description: 'Description must be non-empty and less than 32000 characters',
    check: (input) =>
      input.description.trim().length > 0 && input.description.length <= 32000,
  },
  {
    name: 'ValidPriority',
    description: 'Priority must be valid',
    check: (input) =>
      ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(input.priority),
  },
  {
    name: 'ValidChannel',
    description: 'Channel must be valid',
    check: (input) =>
      ['EMAIL', 'PHONE', 'WEB', 'CHAT', 'SOCIAL', 'IN_PERSON', 'API'].includes(
        input.channel
      ),
  },
];

export const createCasePostconditions: readonly Postcondition<CreateCaseInput, CreateCaseOutput>[] = [
  {
    name: 'CaseNumberGenerated',
    description: 'A unique case number must be generated',
    check: (_input, output) =>
      !!output.caseNumber && /^[A-Z0-9-]+$/.test(output.caseNumber),
  },
  {
    name: 'InitialStateIsNew',
    description: 'New case must start in NEW state',
    check: (_input, output) => output.caseStatus === 'NEW',
  },
  {
    name: 'QueueAssigned',
    description: 'Case must be assigned to a queue',
    check: (_input, output) =>
      !!output.assignedQueue && output.assignedQueue.length > 0,
  },
  {
    name: 'SLATargetSet',
    description: 'SLA target must be set based on priority',
    check: (input, output) =>
      output.slaTarget.priority === input.priority &&
      output.slaTarget.responseTimeMinutes > 0 &&
      output.slaTarget.resolutionTimeMinutes > 0,
  },
  {
    name: 'SLADeadlinesCalculated',
    description: 'SLA deadlines must be calculated',
    check: (_input, output) =>
      !!output.slaResponseDue && !!output.slaResolutionDue,
  },
];

// ============================================================================
// ResolveCaseContract
// ============================================================================

export type ResolutionCode =
  | 'RESOLVED'
  | 'RESOLVED_WORKAROUND'
  | 'DUPLICATE'
  | 'CANNOT_REPRODUCE'
  | 'BY_DESIGN'
  | 'DEFERRED'
  | 'NO_ACTION_REQUIRED'
  | 'CUSTOMER_UNRESPONSIVE';

export interface ResolveCaseInput {
  readonly caseNumber: CaseNumber;
  readonly resolution: string;
  readonly resolutionCode: ResolutionCode;
  readonly customerSatisfied: boolean;
  readonly rootCause?: string;
  readonly preventiveMeasures?: string;
  readonly internalNotes?: string;
}

export interface ResolveCaseOutput {
  readonly resolutionId: ResolutionId;
  readonly timeToResolution: number; // Minutes
  readonly slaMet: boolean;
  readonly caseId: CaseId;
  readonly caseNumber: CaseNumber;
  readonly finalState: CaseState;
  readonly resolvedAt: ISODateTimeString;
  readonly slaBreachMinutes?: number;
}

export interface ResolveCaseContract {
  readonly name: 'ResolveCase';
  readonly version: '1.0.0';
  readonly input: ContractInput<ResolveCaseInput>;
  readonly output: ContractOutput<ResolveCaseOutput>;
  readonly preconditions: readonly Precondition<ResolveCaseInput>[];
  readonly postconditions: readonly Postcondition<ResolveCaseInput, ResolveCaseOutput>[];
  readonly events: readonly CaseResolvedEvent[];
  readonly errors: readonly (NotFoundError | StateTransitionError | PreconditionError)[];
}

export const resolveCasePreconditions: readonly Precondition<ResolveCaseInput>[] = [
  {
    name: 'ValidCaseNumber',
    description: 'Case number must be valid',
    check: (input) => !!input.caseNumber && input.caseNumber.length > 0,
  },
  {
    name: 'ValidResolution',
    description: 'Resolution description must be non-empty',
    check: (input) =>
      !!input.resolution && input.resolution.trim().length > 0,
  },
  {
    name: 'ValidResolutionCode',
    description: 'Resolution code must be valid',
    check: (input) =>
      [
        'RESOLVED',
        'RESOLVED_WORKAROUND',
        'DUPLICATE',
        'CANNOT_REPRODUCE',
        'BY_DESIGN',
        'DEFERRED',
        'NO_ACTION_REQUIRED',
        'CUSTOMER_UNRESPONSIVE',
      ].includes(input.resolutionCode),
  },
];

export const resolveCasePostconditions: readonly Postcondition<ResolveCaseInput, ResolveCaseOutput>[] = [
  {
    name: 'ResolutionIdGenerated',
    description: 'A unique resolution ID must be generated',
    check: (_input, output) =>
      !!output.resolutionId && output.resolutionId.length > 0,
  },
  {
    name: 'TimeToResolutionCalculated',
    description: 'Time to resolution must be calculated',
    check: (_input, output) => output.timeToResolution >= 0,
  },
  {
    name: 'SLAStatusDetermined',
    description: 'SLA met status must be determined',
    check: (_input, output) => typeof output.slaMet === 'boolean',
  },
  {
    name: 'FinalStateIsResolved',
    description: 'Final state must be RESOLVED',
    check: (_input, output) => output.finalState === 'RESOLVED',
  },
];

// ============================================================================
// EscalateCaseContract
// ============================================================================

export type EscalationType = 'PRIORITY' | 'EXPERTISE' | 'MANAGEMENT' | 'CUSTOMER_REQUEST';

export interface EscalateCaseInput {
  readonly caseNumber: CaseNumber;
  readonly escalationType: EscalationType;
  readonly reason: string;
  readonly targetQueueId?: QueueId;
  readonly targetAgentId?: AgentId;
  readonly newPriority?: CasePriority;
}

export interface EscalateCaseOutput {
  readonly caseId: CaseId;
  readonly caseNumber: CaseNumber;
  readonly escalationLevel: number;
  readonly previousPriority: CasePriority;
  readonly newPriority: CasePriority;
  readonly previousQueueId?: QueueId;
  readonly newQueueId: QueueId;
  readonly previousAgentId?: AgentId;
  readonly newAgentId?: AgentId;
  readonly escalatedAt: ISODateTimeString;
  readonly newSlaTarget: SLATarget;
}

export interface EscalateCaseContract {
  readonly name: 'EscalateCase';
  readonly version: '1.0.0';
  readonly input: ContractInput<EscalateCaseInput>;
  readonly output: ContractOutput<EscalateCaseOutput>;
  readonly preconditions: readonly Precondition<EscalateCaseInput>[];
  readonly postconditions: readonly Postcondition<EscalateCaseInput, EscalateCaseOutput>[];
  readonly events: readonly CaseEscalatedEvent[];
  readonly errors: readonly (NotFoundError | StateTransitionError | PreconditionError)[];
}

export const escalateCasePreconditions: readonly Precondition<EscalateCaseInput>[] = [
  {
    name: 'ValidCaseNumber',
    description: 'Case number must be valid',
    check: (input) => !!input.caseNumber && input.caseNumber.length > 0,
  },
  {
    name: 'ValidEscalationType',
    description: 'Escalation type must be valid',
    check: (input) =>
      ['PRIORITY', 'EXPERTISE', 'MANAGEMENT', 'CUSTOMER_REQUEST'].includes(
        input.escalationType
      ),
  },
  {
    name: 'ReasonProvided',
    description: 'Escalation reason must be provided',
    check: (input) => !!input.reason && input.reason.trim().length > 0,
  },
  {
    name: 'TargetSpecified',
    description: 'Either target queue or agent must be specified',
    check: (input) => !!input.targetQueueId || !!input.targetAgentId,
  },
];

export const escalateCasePostconditions: readonly Postcondition<EscalateCaseInput, EscalateCaseOutput>[] = [
  {
    name: 'EscalationLevelIncremented',
    description: 'Escalation level must be incremented',
    check: (_input, output) => output.escalationLevel > 0,
  },
  {
    name: 'PriorityEscalatedOrMaintained',
    description: 'Priority must be escalated or maintained',
    check: (_input, output) => {
      const priorityOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const prevIndex = priorityOrder.indexOf(output.previousPriority);
      const newIndex = priorityOrder.indexOf(output.newPriority);
      return newIndex >= prevIndex;
    },
  },
  {
    name: 'SLARecalculated',
    description: 'SLA must be recalculated',
    check: (_input, output) =>
      output.newSlaTarget.responseTimeMinutes > 0 &&
      output.newSlaTarget.resolutionTimeMinutes > 0,
  },
];

// ============================================================================
// ReopenCaseContract
// ============================================================================

export interface ReopenCaseInput {
  readonly caseNumber: CaseNumber;
  readonly reason: string;
  readonly additionalDetails?: string;
  readonly requestedBy: ContactId;
}

export interface ReopenCaseOutput {
  readonly caseId: CaseId;
  readonly caseNumber: CaseNumber;
  readonly previousState: CaseState;
  readonly newState: CaseState;
  readonly reopenCount: number;
  readonly reopenedAt: ISODateTimeString;
  readonly newSlaTarget: SLATarget;
  readonly slaResolutionDue: ISODateTimeString;
}

export interface ReopenCaseContract {
  readonly name: 'ReopenCase';
  readonly version: '1.0.0';
  readonly input: ContractInput<ReopenCaseInput>;
  readonly output: ContractOutput<ReopenCaseOutput>;
  readonly preconditions: readonly Precondition<ReopenCaseInput>[];
  readonly postconditions: readonly Postcondition<ReopenCaseInput, ReopenCaseOutput>[];
  readonly events: readonly CaseReopenedEvent[];
  readonly errors: readonly (NotFoundError | StateTransitionError | PreconditionError)[];
}

export const reopenCasePreconditions: readonly Precondition<ReopenCaseInput>[] = [
  {
    name: 'ValidCaseNumber',
    description: 'Case number must be valid',
    check: (input) => !!input.caseNumber && input.caseNumber.length > 0,
  },
  {
    name: 'ReasonProvided',
    description: 'Reopen reason must be provided',
    check: (input) => !!input.reason && input.reason.trim().length > 0,
  },
  {
    name: 'ValidRequestedBy',
    description: 'Requester ID must be valid',
    check: (input) => !!input.requestedBy && input.requestedBy.length > 0,
  },
];

export const reopenCasePostconditions: readonly Postcondition<ReopenCaseInput, ReopenCaseOutput>[] = [
  {
    name: 'StateChangedToOpen',
    description: 'Case must be in OPEN state after reopen',
    check: (_input, output) => output.newState === 'OPEN',
  },
  {
    name: 'PreviousStateWasClosedOrResolved',
    description: 'Previous state must have been RESOLVED or CLOSED',
    check: (_input, output) =>
      output.previousState === 'RESOLVED' || output.previousState === 'CLOSED',
  },
  {
    name: 'ReopenCountIncremented',
    description: 'Reopen count must be incremented',
    check: (_input, output) => output.reopenCount > 0,
  },
  {
    name: 'NewSLACalculated',
    description: 'New SLA must be calculated',
    check: (_input, output) =>
      !!output.slaResolutionDue && output.newSlaTarget.resolutionTimeMinutes > 0,
  },
];

// ============================================================================
// Event Definitions
// ============================================================================

export const CASE_EVENT_TYPES = {
  CASE_CREATION_REQUESTED: 'case.creation.requested',
  CASE_NUMBER_ASSIGNED: 'case.number.assigned',
  SLA_CALCULATED: 'case.sla.calculated',
  CASE_ROUTED: 'case.routed',
  CASE_CREATION_COMPLETED: 'case.creation.completed',
  CASE_RESOLVED: 'case.resolved',
  CASE_ESCALATED: 'case.escalated',
  CASE_REOPENED: 'case.reopened',
  CASE_STATE_CHANGED: 'case.state.changed',
} as const;

export interface CaseCreationRequestedPayload {
  readonly requestId: EntityId;
  readonly contactId: ContactId;
  readonly caseType: CaseType;
  readonly subject: string;
  readonly priority: CasePriority;
  readonly channel: CaseChannel;
}

export interface CaseCreationRequestedEvent extends DomainEvent<CaseCreationRequestedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_CREATION_REQUESTED;
  readonly aggregateType: 'Case';
}

export interface CaseNumberAssignedPayload {
  readonly caseId: CaseId;
  readonly caseNumber: CaseNumber;
  readonly sequenceNumber: number;
}

export interface CaseNumberAssignedEvent extends DomainEvent<CaseNumberAssignedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_NUMBER_ASSIGNED;
  readonly aggregateType: 'Case';
}

export interface SLACalculatedPayload {
  readonly caseId: CaseId;
  readonly caseNumber: CaseNumber;
  readonly priority: CasePriority;
  readonly slaTarget: SLATarget;
  readonly responseDeadline: ISODateTimeString;
  readonly resolutionDeadline: ISODateTimeString;
}

export interface SLACalculatedEvent extends DomainEvent<SLACalculatedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.SLA_CALCULATED;
  readonly aggregateType: 'Case';
}

export interface CaseRoutedPayload {
  readonly caseId: CaseId;
  readonly caseNumber: CaseNumber;
  readonly queueId: QueueId;
  readonly agentId?: AgentId;
  readonly routingReason: string;
}

export interface CaseRoutedEvent extends DomainEvent<CaseRoutedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_ROUTED;
  readonly aggregateType: 'Case';
}

export interface CaseCreationCompletedPayload {
  readonly caseId: CaseId;
  readonly caseNumber: CaseNumber;
  readonly state: CaseState;
  readonly queueId: QueueId;
  readonly slaTarget: SLATarget;
}

export interface CaseCreationCompletedEvent extends DomainEvent<CaseCreationCompletedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_CREATION_COMPLETED;
  readonly aggregateType: 'Case';
}

export interface CaseResolvedPayload {
  readonly caseId: CaseId;
  readonly caseNumber: CaseNumber;
  readonly resolutionId: ResolutionId;
  readonly resolutionCode: ResolutionCode;
  readonly timeToResolution: number;
  readonly slaMet: boolean;
  readonly customerSatisfied: boolean;
}

export interface CaseResolvedEvent extends DomainEvent<CaseResolvedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_RESOLVED;
  readonly aggregateType: 'Case';
}

export interface CaseEscalatedPayload {
  readonly caseId: CaseId;
  readonly caseNumber: CaseNumber;
  readonly escalationType: EscalationType;
  readonly escalationLevel: number;
  readonly previousPriority: CasePriority;
  readonly newPriority: CasePriority;
  readonly reason: string;
}

export interface CaseEscalatedEvent extends DomainEvent<CaseEscalatedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_ESCALATED;
  readonly aggregateType: 'Case';
}

export interface CaseReopenedPayload {
  readonly caseId: CaseId;
  readonly caseNumber: CaseNumber;
  readonly previousState: CaseState;
  readonly reason: string;
  readonly reopenCount: number;
  readonly requestedBy: ContactId;
}

export interface CaseReopenedEvent extends DomainEvent<CaseReopenedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_REOPENED;
  readonly aggregateType: 'Case';
}

// ============================================================================
// CaseSurface Interface
// ============================================================================

export interface CaseSurface {
  createCase(
    input: ContractInput<CreateCaseInput>
  ): Promise<ContractOutput<CreateCaseOutput>>;

  resolveCase(
    input: ContractInput<ResolveCaseInput>
  ): Promise<ContractOutput<ResolveCaseOutput>>;

  escalateCase(
    input: ContractInput<EscalateCaseInput>
  ): Promise<ContractOutput<EscalateCaseOutput>>;

  reopenCase(
    input: ContractInput<ReopenCaseInput>
  ): Promise<ContractOutput<ReopenCaseOutput>>;

  validateCase(data: CreateCaseInput): ValidationResult;

  subscribeToEvents(
    handler: (
      event:
        | CaseCreationRequestedEvent
        | CaseNumberAssignedEvent
        | SLACalculatedEvent
        | CaseRoutedEvent
        | CaseCreationCompletedEvent
        | CaseResolvedEvent
        | CaseEscalatedEvent
        | CaseReopenedEvent
    ) => void
  ): () => void;
}

// ============================================================================
// SLA Calculation Helpers
// ============================================================================

export const defaultSLATargets: Record<CasePriority, SLATarget> = {
  CRITICAL: {
    responseTimeMinutes: 15,
    resolutionTimeMinutes: 240,
    businessHoursOnly: false,
    priority: 'CRITICAL',
  },
  HIGH: {
    responseTimeMinutes: 60,
    resolutionTimeMinutes: 480,
    businessHoursOnly: true,
    priority: 'HIGH',
  },
  MEDIUM: {
    responseTimeMinutes: 240,
    resolutionTimeMinutes: 1440,
    businessHoursOnly: true,
    priority: 'MEDIUM',
  },
  LOW: {
    responseTimeMinutes: 480,
    resolutionTimeMinutes: 2880,
    businessHoursOnly: true,
    priority: 'LOW',
  },
};

export function calculateSLADeadline(
  startTime: Date,
  targetMinutes: number,
  businessHoursOnly: boolean
): Date {
  if (!businessHoursOnly) {
    return new Date(startTime.getTime() + targetMinutes * 60 * 1000);
  }

  // Business hours: 9 AM to 5 PM, Monday to Friday
  const BUSINESS_START = 9;
  const BUSINESS_END = 17;

  let remainingMinutes = targetMinutes;
  const deadline = new Date(startTime);

  while (remainingMinutes > 0) {
    const dayOfWeek = deadline.getDay();
    const hour = deadline.getHours();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(BUSINESS_START, 0, 0, 0);
      continue;
    }

    // Before business hours
    if (hour < BUSINESS_START) {
      deadline.setHours(BUSINESS_START, 0, 0, 0);
      continue;
    }

    // After business hours
    if (hour >= BUSINESS_END) {
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(BUSINESS_START, 0, 0, 0);
      continue;
    }

    // Within business hours
    const minutesUntilEnd = (BUSINESS_END - hour) * 60 - deadline.getMinutes();

    if (remainingMinutes <= minutesUntilEnd) {
      deadline.setMinutes(deadline.getMinutes() + remainingMinutes);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= minutesUntilEnd;
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(BUSINESS_START, 0, 0, 0);
    }
  }

  return deadline;
}

export function generateCaseNumber(sequenceNumber: number): CaseNumber {
  const year = new Date().getFullYear();
  const paddedSequence = sequenceNumber.toString().padStart(7, '0');
  return `CS-${year}-${paddedSequence}`;
}
