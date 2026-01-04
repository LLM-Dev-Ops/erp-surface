/**
 * Case Events
 * Observable events for case management operations
 */

import { DomainEvent, createEvent, Observable } from '../../common/events';
import { EntityId, ISODateTimeString } from '../../common/types';
import { CaseState, CasePriority, CaseChannel } from './models';
import { CaseType, SLATarget, ResolutionCode, EscalationType } from './contracts';

// ============================================================================
// Event Type Constants
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
  CASE_PRIORITY_CHANGED: 'case.priority.changed',
  CASE_ASSIGNED: 'case.assigned',
  SLA_BREACH_WARNING: 'case.sla.breach.warning',
  SLA_BREACHED: 'case.sla.breached',
  CASE_INTERACTION_ADDED: 'case.interaction.added',
  CASE_MERGED: 'case.merged',
} as const;

// ============================================================================
// CaseCreationRequestedEvent
// ============================================================================

export interface CaseCreationRequestedPayload {
  readonly requestId: EntityId;
  readonly contactId: EntityId;
  readonly caseType: CaseType;
  readonly subject: string;
  readonly description: string;
  readonly priority: CasePriority;
  readonly channel: CaseChannel;
  readonly requestedAt: ISODateTimeString;
}

export interface CaseCreationRequestedEvent extends DomainEvent<CaseCreationRequestedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_CREATION_REQUESTED;
  readonly aggregateType: 'Case';
}

export function createCaseCreationRequestedEvent(
  requestId: EntityId,
  payload: CaseCreationRequestedPayload,
  metadata?: { correlationId?: string; userId?: EntityId }
): CaseCreationRequestedEvent {
  return createEvent(
    CASE_EVENT_TYPES.CASE_CREATION_REQUESTED,
    requestId,
    'Case',
    payload,
    {
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      source: 'case-management',
      schemaVersion: '1.0.0',
    }
  ) as CaseCreationRequestedEvent;
}

// ============================================================================
// CaseNumberAssignedEvent
// ============================================================================

export interface CaseNumberAssignedPayload {
  readonly caseId: EntityId;
  readonly caseNumber: string;
  readonly sequenceNumber: number;
  readonly prefix: string;
}

export interface CaseNumberAssignedEvent extends DomainEvent<CaseNumberAssignedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_NUMBER_ASSIGNED;
  readonly aggregateType: 'Case';
}

export function createCaseNumberAssignedEvent(
  caseId: EntityId,
  payload: CaseNumberAssignedPayload,
  metadata?: { correlationId?: string; userId?: EntityId }
): CaseNumberAssignedEvent {
  return createEvent(
    CASE_EVENT_TYPES.CASE_NUMBER_ASSIGNED,
    caseId,
    'Case',
    payload,
    {
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      source: 'case-management',
      schemaVersion: '1.0.0',
    }
  ) as CaseNumberAssignedEvent;
}

// ============================================================================
// SLACalculatedEvent
// ============================================================================

export interface SLACalculatedPayload {
  readonly caseId: EntityId;
  readonly caseNumber: string;
  readonly priority: CasePriority;
  readonly slaTarget: SLATarget;
  readonly responseDeadline: ISODateTimeString;
  readonly resolutionDeadline: ISODateTimeString;
  readonly calculatedAt: ISODateTimeString;
}

export interface SLACalculatedEvent extends DomainEvent<SLACalculatedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.SLA_CALCULATED;
  readonly aggregateType: 'Case';
}

export function createSLACalculatedEvent(
  caseId: EntityId,
  payload: SLACalculatedPayload,
  metadata?: { correlationId?: string; userId?: EntityId }
): SLACalculatedEvent {
  return createEvent(
    CASE_EVENT_TYPES.SLA_CALCULATED,
    caseId,
    'Case',
    payload,
    {
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      source: 'case-management',
      schemaVersion: '1.0.0',
    }
  ) as SLACalculatedEvent;
}

// ============================================================================
// CaseRoutedEvent
// ============================================================================

export interface CaseRoutedPayload {
  readonly caseId: EntityId;
  readonly caseNumber: string;
  readonly queueId: EntityId;
  readonly agentId?: EntityId;
  readonly routingReason: string;
  readonly routingMethod: 'AUTOMATIC' | 'MANUAL' | 'SKILL_BASED' | 'ROUND_ROBIN';
  readonly skillsMatched?: readonly string[];
}

export interface CaseRoutedEvent extends DomainEvent<CaseRoutedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_ROUTED;
  readonly aggregateType: 'Case';
}

export function createCaseRoutedEvent(
  caseId: EntityId,
  payload: CaseRoutedPayload,
  metadata?: { correlationId?: string; userId?: EntityId }
): CaseRoutedEvent {
  return createEvent(
    CASE_EVENT_TYPES.CASE_ROUTED,
    caseId,
    'Case',
    payload,
    {
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      source: 'case-management',
      schemaVersion: '1.0.0',
    }
  ) as CaseRoutedEvent;
}

// ============================================================================
// CaseCreationCompletedEvent
// ============================================================================

export interface CaseCreationCompletedPayload {
  readonly caseId: EntityId;
  readonly caseNumber: string;
  readonly contactId: EntityId;
  readonly caseType: CaseType;
  readonly subject: string;
  readonly priority: CasePriority;
  readonly channel: CaseChannel;
  readonly state: CaseState;
  readonly queueId: EntityId;
  readonly slaTarget: SLATarget;
  readonly createdAt: ISODateTimeString;
}

export interface CaseCreationCompletedEvent extends DomainEvent<CaseCreationCompletedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_CREATION_COMPLETED;
  readonly aggregateType: 'Case';
}

export function createCaseCreationCompletedEvent(
  caseId: EntityId,
  payload: CaseCreationCompletedPayload,
  metadata?: { correlationId?: string; userId?: EntityId }
): CaseCreationCompletedEvent {
  return createEvent(
    CASE_EVENT_TYPES.CASE_CREATION_COMPLETED,
    caseId,
    'Case',
    payload,
    {
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      source: 'case-management',
      schemaVersion: '1.0.0',
    }
  ) as CaseCreationCompletedEvent;
}

// ============================================================================
// CaseResolvedEvent
// ============================================================================

export interface CaseResolvedPayload {
  readonly caseId: EntityId;
  readonly caseNumber: string;
  readonly resolutionId: EntityId;
  readonly resolution: string;
  readonly resolutionCode: ResolutionCode;
  readonly rootCause?: string;
  readonly preventiveMeasures?: string;
  readonly timeToResolution: number;
  readonly slaMet: boolean;
  readonly customerSatisfied: boolean;
  readonly resolvedBy: EntityId;
  readonly resolvedAt: ISODateTimeString;
}

export interface CaseResolvedEvent extends DomainEvent<CaseResolvedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_RESOLVED;
  readonly aggregateType: 'Case';
}

export function createCaseResolvedEvent(
  caseId: EntityId,
  payload: CaseResolvedPayload,
  metadata?: { correlationId?: string; userId?: EntityId }
): CaseResolvedEvent {
  return createEvent(
    CASE_EVENT_TYPES.CASE_RESOLVED,
    caseId,
    'Case',
    payload,
    {
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      source: 'case-management',
      schemaVersion: '1.0.0',
    }
  ) as CaseResolvedEvent;
}

// ============================================================================
// CaseEscalatedEvent
// ============================================================================

export interface CaseEscalatedPayload {
  readonly caseId: EntityId;
  readonly caseNumber: string;
  readonly escalationType: EscalationType;
  readonly escalationLevel: number;
  readonly previousPriority: CasePriority;
  readonly newPriority: CasePriority;
  readonly previousQueueId?: EntityId;
  readonly newQueueId: EntityId;
  readonly previousAgentId?: EntityId;
  readonly newAgentId?: EntityId;
  readonly reason: string;
  readonly escalatedBy: EntityId;
  readonly escalatedAt: ISODateTimeString;
}

export interface CaseEscalatedEvent extends DomainEvent<CaseEscalatedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_ESCALATED;
  readonly aggregateType: 'Case';
}

export function createCaseEscalatedEvent(
  caseId: EntityId,
  payload: CaseEscalatedPayload,
  metadata?: { correlationId?: string; userId?: EntityId }
): CaseEscalatedEvent {
  return createEvent(
    CASE_EVENT_TYPES.CASE_ESCALATED,
    caseId,
    'Case',
    payload,
    {
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      source: 'case-management',
      schemaVersion: '1.0.0',
    }
  ) as CaseEscalatedEvent;
}

// ============================================================================
// CaseReopenedEvent
// ============================================================================

export interface CaseReopenedPayload {
  readonly caseId: EntityId;
  readonly caseNumber: string;
  readonly previousState: CaseState;
  readonly reason: string;
  readonly additionalDetails?: string;
  readonly reopenCount: number;
  readonly requestedBy: EntityId;
  readonly reopenedAt: ISODateTimeString;
  readonly newSlaResolutionDue: ISODateTimeString;
}

export interface CaseReopenedEvent extends DomainEvent<CaseReopenedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_REOPENED;
  readonly aggregateType: 'Case';
}

export function createCaseReopenedEvent(
  caseId: EntityId,
  payload: CaseReopenedPayload,
  metadata?: { correlationId?: string; userId?: EntityId }
): CaseReopenedEvent {
  return createEvent(
    CASE_EVENT_TYPES.CASE_REOPENED,
    caseId,
    'Case',
    payload,
    {
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      source: 'case-management',
      schemaVersion: '1.0.0',
    }
  ) as CaseReopenedEvent;
}

// ============================================================================
// CaseStateChangedEvent
// ============================================================================

export interface CaseStateChangedPayload {
  readonly caseId: EntityId;
  readonly caseNumber: string;
  readonly previousState: CaseState;
  readonly newState: CaseState;
  readonly trigger: string;
  readonly reason?: string;
  readonly changedBy: EntityId;
  readonly changedAt: ISODateTimeString;
  readonly durationInPreviousState: number;
}

export interface CaseStateChangedEvent extends DomainEvent<CaseStateChangedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.CASE_STATE_CHANGED;
  readonly aggregateType: 'Case';
}

export function createCaseStateChangedEvent(
  caseId: EntityId,
  payload: CaseStateChangedPayload,
  metadata?: { correlationId?: string; userId?: EntityId }
): CaseStateChangedEvent {
  return createEvent(
    CASE_EVENT_TYPES.CASE_STATE_CHANGED,
    caseId,
    'Case',
    payload,
    {
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      source: 'case-management',
      schemaVersion: '1.0.0',
    }
  ) as CaseStateChangedEvent;
}

// ============================================================================
// SLA Warning and Breach Events
// ============================================================================

export interface SLABreachWarningPayload {
  readonly caseId: EntityId;
  readonly caseNumber: string;
  readonly breachType: 'RESPONSE' | 'RESOLUTION';
  readonly deadline: ISODateTimeString;
  readonly minutesRemaining: number;
  readonly currentState: CaseState;
  readonly assignedAgentId?: EntityId;
}

export interface SLABreachWarningEvent extends DomainEvent<SLABreachWarningPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.SLA_BREACH_WARNING;
  readonly aggregateType: 'Case';
}

export interface SLABreachedPayload {
  readonly caseId: EntityId;
  readonly caseNumber: string;
  readonly breachType: 'RESPONSE' | 'RESOLUTION';
  readonly deadline: ISODateTimeString;
  readonly breachedAt: ISODateTimeString;
  readonly breachDurationMinutes: number;
  readonly currentState: CaseState;
  readonly assignedAgentId?: EntityId;
}

export interface SLABreachedEvent extends DomainEvent<SLABreachedPayload> {
  readonly eventType: typeof CASE_EVENT_TYPES.SLA_BREACHED;
  readonly aggregateType: 'Case';
}

// ============================================================================
// Event Stream Types
// ============================================================================

export type CaseEvent =
  | CaseCreationRequestedEvent
  | CaseNumberAssignedEvent
  | SLACalculatedEvent
  | CaseRoutedEvent
  | CaseCreationCompletedEvent
  | CaseResolvedEvent
  | CaseEscalatedEvent
  | CaseReopenedEvent
  | CaseStateChangedEvent
  | SLABreachWarningEvent
  | SLABreachedEvent;

// ============================================================================
// Event Observable
// ============================================================================

export class CaseEventStream extends Observable<CaseEvent> {
  private static instance: CaseEventStream | null = null;

  private constructor() {
    super();
  }

  static getInstance(): CaseEventStream {
    if (!CaseEventStream.instance) {
      CaseEventStream.instance = new CaseEventStream();
    }
    return CaseEventStream.instance;
  }

  async publishCaseCreationRequested(
    requestId: EntityId,
    payload: CaseCreationRequestedPayload,
    metadata?: { correlationId?: string; userId?: EntityId }
  ): Promise<void> {
    const event = createCaseCreationRequestedEvent(requestId, payload, metadata);
    await this.publish(event);
  }

  async publishCaseNumberAssigned(
    caseId: EntityId,
    payload: CaseNumberAssignedPayload,
    metadata?: { correlationId?: string; userId?: EntityId }
  ): Promise<void> {
    const event = createCaseNumberAssignedEvent(caseId, payload, metadata);
    await this.publish(event);
  }

  async publishSLACalculated(
    caseId: EntityId,
    payload: SLACalculatedPayload,
    metadata?: { correlationId?: string; userId?: EntityId }
  ): Promise<void> {
    const event = createSLACalculatedEvent(caseId, payload, metadata);
    await this.publish(event);
  }

  async publishCaseRouted(
    caseId: EntityId,
    payload: CaseRoutedPayload,
    metadata?: { correlationId?: string; userId?: EntityId }
  ): Promise<void> {
    const event = createCaseRoutedEvent(caseId, payload, metadata);
    await this.publish(event);
  }

  async publishCaseCreationCompleted(
    caseId: EntityId,
    payload: CaseCreationCompletedPayload,
    metadata?: { correlationId?: string; userId?: EntityId }
  ): Promise<void> {
    const event = createCaseCreationCompletedEvent(caseId, payload, metadata);
    await this.publish(event);
  }

  async publishCaseResolved(
    caseId: EntityId,
    payload: CaseResolvedPayload,
    metadata?: { correlationId?: string; userId?: EntityId }
  ): Promise<void> {
    const event = createCaseResolvedEvent(caseId, payload, metadata);
    await this.publish(event);
  }

  async publishCaseEscalated(
    caseId: EntityId,
    payload: CaseEscalatedPayload,
    metadata?: { correlationId?: string; userId?: EntityId }
  ): Promise<void> {
    const event = createCaseEscalatedEvent(caseId, payload, metadata);
    await this.publish(event);
  }

  async publishCaseReopened(
    caseId: EntityId,
    payload: CaseReopenedPayload,
    metadata?: { correlationId?: string; userId?: EntityId }
  ): Promise<void> {
    const event = createCaseReopenedEvent(caseId, payload, metadata);
    await this.publish(event);
  }
}

// ============================================================================
// Event Handlers Interface
// ============================================================================

export interface CaseEventHandlers {
  onCaseCreationRequested?: (event: CaseCreationRequestedEvent) => void | Promise<void>;
  onCaseNumberAssigned?: (event: CaseNumberAssignedEvent) => void | Promise<void>;
  onSLACalculated?: (event: SLACalculatedEvent) => void | Promise<void>;
  onCaseRouted?: (event: CaseRoutedEvent) => void | Promise<void>;
  onCaseCreationCompleted?: (event: CaseCreationCompletedEvent) => void | Promise<void>;
  onCaseResolved?: (event: CaseResolvedEvent) => void | Promise<void>;
  onCaseEscalated?: (event: CaseEscalatedEvent) => void | Promise<void>;
  onCaseReopened?: (event: CaseReopenedEvent) => void | Promise<void>;
  onCaseStateChanged?: (event: CaseStateChangedEvent) => void | Promise<void>;
  onSLABreachWarning?: (event: SLABreachWarningEvent) => void | Promise<void>;
  onSLABreached?: (event: SLABreachedEvent) => void | Promise<void>;
}

export function subscribeToCaseEvents(
  handlers: CaseEventHandlers
): () => void {
  const stream = CaseEventStream.getInstance();

  return stream.subscribe(async (event) => {
    switch (event.eventType) {
      case CASE_EVENT_TYPES.CASE_CREATION_REQUESTED:
        await handlers.onCaseCreationRequested?.(event as CaseCreationRequestedEvent);
        break;
      case CASE_EVENT_TYPES.CASE_NUMBER_ASSIGNED:
        await handlers.onCaseNumberAssigned?.(event as CaseNumberAssignedEvent);
        break;
      case CASE_EVENT_TYPES.SLA_CALCULATED:
        await handlers.onSLACalculated?.(event as SLACalculatedEvent);
        break;
      case CASE_EVENT_TYPES.CASE_ROUTED:
        await handlers.onCaseRouted?.(event as CaseRoutedEvent);
        break;
      case CASE_EVENT_TYPES.CASE_CREATION_COMPLETED:
        await handlers.onCaseCreationCompleted?.(event as CaseCreationCompletedEvent);
        break;
      case CASE_EVENT_TYPES.CASE_RESOLVED:
        await handlers.onCaseResolved?.(event as CaseResolvedEvent);
        break;
      case CASE_EVENT_TYPES.CASE_ESCALATED:
        await handlers.onCaseEscalated?.(event as CaseEscalatedEvent);
        break;
      case CASE_EVENT_TYPES.CASE_REOPENED:
        await handlers.onCaseReopened?.(event as CaseReopenedEvent);
        break;
      case CASE_EVENT_TYPES.CASE_STATE_CHANGED:
        await handlers.onCaseStateChanged?.(event as CaseStateChangedEvent);
        break;
      case CASE_EVENT_TYPES.SLA_BREACH_WARNING:
        await handlers.onSLABreachWarning?.(event as SLABreachWarningEvent);
        break;
      case CASE_EVENT_TYPES.SLA_BREACHED:
        await handlers.onSLABreached?.(event as SLABreachedEvent);
        break;
    }
  });
}
