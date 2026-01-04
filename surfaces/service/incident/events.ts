/**
 * Incident Management Events
 *
 * Observable events for incident lifecycle tracking.
 * All events extend CorrelatedEvent for traceability.
 */

import {
  UUID,
  UserId,
  IncidentNumber,
  Identifier,
  Timestamp,
  CorrelationId,
  CausationId,
  SemanticVersion,
  CorrelatedEvent
} from '../../../common';

import {
  IncidentState,
  IncidentPriority,
  IncidentCategory,
  IncidentImpact,
  IncidentUrgency,
  ResolutionCode,
  EscalationReason
} from './models';

// ============================================================================
// Surface Constants
// ============================================================================

const SURFACE_NAME = 'IncidentSurface';
const SURFACE_VERSION: SemanticVersion = '1.0.0';

// ============================================================================
// Incident Lifecycle Events
// ============================================================================

/** Base incident event */
interface IncidentBaseEvent extends CorrelatedEvent {
  readonly surface: typeof SURFACE_NAME;
  readonly incidentId: UUID;
  readonly incidentNumber: IncidentNumber;
}

/** Incident created event */
export interface IncidentCreatedEvent extends IncidentBaseEvent {
  readonly eventType: 'INCIDENT_CREATED';
  readonly operation: 'CreateIncident';
  readonly title: string;
  readonly category: IncidentCategory;
  readonly priority: IncidentPriority;
  readonly impact: IncidentImpact;
  readonly urgency: IncidentUrgency;
  readonly reportedBy: UserId;
  readonly responseTargetTime: Timestamp;
  readonly resolutionTargetTime: Timestamp;
}

/** Incident assigned event */
export interface IncidentAssignedEvent extends IncidentBaseEvent {
  readonly eventType: 'INCIDENT_ASSIGNED';
  readonly operation: 'AssignIncident';
  readonly previousState: IncidentState;
  readonly newState: IncidentState;
  readonly assignedTo: UserId;
  readonly assignedGroup?: Identifier;
  readonly assignedBy: UserId;
}

/** Incident resolved event */
export interface IncidentResolvedEvent extends IncidentBaseEvent {
  readonly eventType: 'INCIDENT_RESOLVED';
  readonly operation: 'ResolveIncident';
  readonly previousState: IncidentState;
  readonly newState: IncidentState;
  readonly resolutionCode: ResolutionCode;
  readonly resolvedBy: UserId;
  readonly workaround: boolean;
  readonly rootCauseIdentified: boolean;
  readonly timeToResolutionMs: number;
  readonly slaAchieved: boolean;
}

/** Incident closed event */
export interface IncidentClosedEvent extends IncidentBaseEvent {
  readonly eventType: 'INCIDENT_CLOSED';
  readonly operation: 'CloseIncident';
  readonly previousState: IncidentState;
  readonly newState: IncidentState;
  readonly closedBy: UserId;
  readonly closureCode: string;
  readonly satisfactionScore?: number;
}

// ============================================================================
// SLA Events
// ============================================================================

/** SLA breached event */
export interface SLABreachedEvent extends IncidentBaseEvent {
  readonly eventType: 'SLA_BREACHED';
  readonly operation: 'MonitorSLA';
  readonly breachType: SLABreachType;
  readonly targetTime: Timestamp;
  readonly actualTime: Timestamp;
  readonly overageMs: number;
  readonly priority: IncidentPriority;
  readonly assignedTo?: UserId;
}

/** SLA breach types */
export type SLABreachType =
  | 'RESPONSE_TIME'
  | 'RESOLUTION_TIME';

// ============================================================================
// Escalation Events
// ============================================================================

/** Escalation triggered event */
export interface EscalationTriggeredEvent extends IncidentBaseEvent {
  readonly eventType: 'ESCALATION_TRIGGERED';
  readonly operation: 'TriggerEscalation';
  readonly escalationLevel: number;
  readonly previousLevel: number;
  readonly reason: EscalationReason;
  readonly triggeredBy: 'SYSTEM' | UserId;
  readonly notifiedGroups: Identifier[];
  readonly notifiedUsers: UserId[];
  readonly autoReassigned: boolean;
  readonly newAssignee?: UserId;
}

// ============================================================================
// Priority Change Events
// ============================================================================

/** Priority changed event */
export interface PriorityChangedEvent extends IncidentBaseEvent {
  readonly eventType: 'PRIORITY_CHANGED';
  readonly operation: 'ChangePriority';
  readonly previousPriority: IncidentPriority;
  readonly newPriority: IncidentPriority;
  readonly reason: string;
  readonly changedBy: UserId;
  readonly newResponseTargetTime: Timestamp;
  readonly newResolutionTargetTime: Timestamp;
}

// ============================================================================
// Assignment Events
// ============================================================================

/** Incident reassigned event */
export interface IncidentReassignedEvent extends IncidentBaseEvent {
  readonly eventType: 'INCIDENT_REASSIGNED';
  readonly operation: 'ReassignIncident';
  readonly previousAssignee?: UserId;
  readonly previousGroup?: Identifier;
  readonly newAssignee: UserId;
  readonly newGroup?: Identifier;
  readonly reason: string;
  readonly reassignedBy: UserId;
}

// ============================================================================
// Work Progress Events
// ============================================================================

/** Work started event */
export interface WorkStartedEvent extends IncidentBaseEvent {
  readonly eventType: 'WORK_STARTED';
  readonly operation: 'StartWork';
  readonly previousState: IncidentState;
  readonly newState: IncidentState;
  readonly startedBy: UserId;
}

/** Work log added event */
export interface WorkLogAddedEvent extends IncidentBaseEvent {
  readonly eventType: 'WORK_LOG_ADDED';
  readonly operation: 'AddWorkLog';
  readonly workLogId: UUID;
  readonly entryType: string;
  readonly timeSpentMs?: number;
  readonly addedBy: UserId;
}

// ============================================================================
// Union Types
// ============================================================================

/** All incident events */
export type IncidentEvent =
  | IncidentCreatedEvent
  | IncidentAssignedEvent
  | IncidentResolvedEvent
  | IncidentClosedEvent
  | SLABreachedEvent
  | EscalationTriggeredEvent
  | PriorityChangedEvent
  | IncidentReassignedEvent
  | WorkStartedEvent
  | WorkLogAddedEvent;

// ============================================================================
// Event Factory
// ============================================================================

/** Factory for creating incident events */
export const IncidentEventFactory = {
  /** Create incident created event */
  created(
    eventId: UUID,
    correlationId: CorrelationId,
    timestamp: Timestamp,
    incidentId: UUID,
    incidentNumber: IncidentNumber,
    title: string,
    category: IncidentCategory,
    priority: IncidentPriority,
    impact: IncidentImpact,
    urgency: IncidentUrgency,
    reportedBy: UserId,
    responseTargetTime: Timestamp,
    resolutionTargetTime: Timestamp
  ): IncidentCreatedEvent {
    return {
      eventId,
      eventType: 'INCIDENT_CREATED',
      timestamp,
      surface: SURFACE_NAME,
      operation: 'CreateIncident',
      surfaceVersion: SURFACE_VERSION,
      correlationId,
      causationId: null,
      incidentId,
      incidentNumber,
      title,
      category,
      priority,
      impact,
      urgency,
      reportedBy,
      responseTargetTime,
      resolutionTargetTime
    };
  },

  /** Create incident assigned event */
  assigned(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    incidentId: UUID,
    incidentNumber: IncidentNumber,
    previousState: IncidentState,
    newState: IncidentState,
    assignedTo: UserId,
    assignedBy: UserId,
    assignedGroup?: Identifier
  ): IncidentAssignedEvent {
    return {
      eventId,
      eventType: 'INCIDENT_ASSIGNED',
      timestamp,
      surface: SURFACE_NAME,
      operation: 'AssignIncident',
      surfaceVersion: SURFACE_VERSION,
      correlationId,
      causationId,
      incidentId,
      incidentNumber,
      previousState,
      newState,
      assignedTo,
      assignedGroup,
      assignedBy
    };
  },

  /** Create incident resolved event */
  resolved(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    incidentId: UUID,
    incidentNumber: IncidentNumber,
    previousState: IncidentState,
    newState: IncidentState,
    resolutionCode: ResolutionCode,
    resolvedBy: UserId,
    workaround: boolean,
    rootCauseIdentified: boolean,
    timeToResolutionMs: number,
    slaAchieved: boolean
  ): IncidentResolvedEvent {
    return {
      eventId,
      eventType: 'INCIDENT_RESOLVED',
      timestamp,
      surface: SURFACE_NAME,
      operation: 'ResolveIncident',
      surfaceVersion: SURFACE_VERSION,
      correlationId,
      causationId,
      incidentId,
      incidentNumber,
      previousState,
      newState,
      resolutionCode,
      resolvedBy,
      workaround,
      rootCauseIdentified,
      timeToResolutionMs,
      slaAchieved
    };
  },

  /** Create incident closed event */
  closed(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    incidentId: UUID,
    incidentNumber: IncidentNumber,
    previousState: IncidentState,
    newState: IncidentState,
    closedBy: UserId,
    closureCode: string,
    satisfactionScore?: number
  ): IncidentClosedEvent {
    return {
      eventId,
      eventType: 'INCIDENT_CLOSED',
      timestamp,
      surface: SURFACE_NAME,
      operation: 'CloseIncident',
      surfaceVersion: SURFACE_VERSION,
      correlationId,
      causationId,
      incidentId,
      incidentNumber,
      previousState,
      newState,
      closedBy,
      closureCode,
      satisfactionScore
    };
  },

  /** Create SLA breached event */
  slaBreached(
    eventId: UUID,
    correlationId: CorrelationId,
    timestamp: Timestamp,
    incidentId: UUID,
    incidentNumber: IncidentNumber,
    breachType: SLABreachType,
    targetTime: Timestamp,
    actualTime: Timestamp,
    overageMs: number,
    priority: IncidentPriority,
    assignedTo?: UserId
  ): SLABreachedEvent {
    return {
      eventId,
      eventType: 'SLA_BREACHED',
      timestamp,
      surface: SURFACE_NAME,
      operation: 'MonitorSLA',
      surfaceVersion: SURFACE_VERSION,
      correlationId,
      causationId: null,
      incidentId,
      incidentNumber,
      breachType,
      targetTime,
      actualTime,
      overageMs,
      priority,
      assignedTo
    };
  },

  /** Create escalation triggered event */
  escalationTriggered(
    eventId: UUID,
    correlationId: CorrelationId,
    causationId: CausationId,
    timestamp: Timestamp,
    incidentId: UUID,
    incidentNumber: IncidentNumber,
    escalationLevel: number,
    previousLevel: number,
    reason: EscalationReason,
    triggeredBy: 'SYSTEM' | UserId,
    notifiedGroups: Identifier[],
    notifiedUsers: UserId[],
    autoReassigned: boolean,
    newAssignee?: UserId
  ): EscalationTriggeredEvent {
    return {
      eventId,
      eventType: 'ESCALATION_TRIGGERED',
      timestamp,
      surface: SURFACE_NAME,
      operation: 'TriggerEscalation',
      surfaceVersion: SURFACE_VERSION,
      correlationId,
      causationId,
      incidentId,
      incidentNumber,
      escalationLevel,
      previousLevel,
      reason,
      triggeredBy,
      notifiedGroups,
      notifiedUsers,
      autoReassigned,
      newAssignee
    };
  }
};
