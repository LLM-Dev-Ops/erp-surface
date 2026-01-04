/**
 * Incident Management Models
 *
 * State machines and domain models for incident management.
 * Vendor-neutral types supporting ITIL-aligned incident lifecycle.
 */

import {
  UUID,
  Identifier,
  UserId,
  IncidentNumber,
  Timestamp,
  DurationMs,
  EntityReference,
  OrgUnitReference
} from '../../../common';

// ============================================================================
// Incident State Machine
// ============================================================================

/** Incident lifecycle states */
export type IncidentState =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

/** Valid incident state transitions */
export const IncidentStateTransitions: Record<IncidentState, IncidentState[]> = {
  NEW: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS', 'NEW'],
  IN_PROGRESS: ['RESOLVED', 'ASSIGNED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: []
};

/** Check if a state transition is valid */
export const isValidIncidentTransition = (
  from: IncidentState,
  to: IncidentState
): boolean => {
  return IncidentStateTransitions[from].includes(to);
};

// ============================================================================
// Incident Priority
// ============================================================================

/** Incident priority levels */
export type IncidentPriority =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW';

/** Priority level configuration */
export interface PriorityConfig {
  readonly priority: IncidentPriority;
  readonly responseTimeMs: DurationMs;
  readonly resolutionTimeMs: DurationMs;
  readonly escalationEnabled: boolean;
  readonly notificationLevel: NotificationLevel;
}

/** Notification levels */
export type NotificationLevel =
  | 'NONE'
  | 'STANDARD'
  | 'URGENT'
  | 'EMERGENCY';

/** Default priority configurations */
export const DefaultPriorityConfigs: Record<IncidentPriority, PriorityConfig> = {
  CRITICAL: {
    priority: 'CRITICAL',
    responseTimeMs: 15 * 60 * 1000,      // 15 minutes
    resolutionTimeMs: 4 * 60 * 60 * 1000, // 4 hours
    escalationEnabled: true,
    notificationLevel: 'EMERGENCY'
  },
  HIGH: {
    priority: 'HIGH',
    responseTimeMs: 60 * 60 * 1000,       // 1 hour
    resolutionTimeMs: 8 * 60 * 60 * 1000, // 8 hours
    escalationEnabled: true,
    notificationLevel: 'URGENT'
  },
  MEDIUM: {
    priority: 'MEDIUM',
    responseTimeMs: 4 * 60 * 60 * 1000,    // 4 hours
    resolutionTimeMs: 24 * 60 * 60 * 1000, // 24 hours
    escalationEnabled: true,
    notificationLevel: 'STANDARD'
  },
  LOW: {
    priority: 'LOW',
    responseTimeMs: 8 * 60 * 60 * 1000,    // 8 hours
    resolutionTimeMs: 72 * 60 * 60 * 1000, // 72 hours
    escalationEnabled: false,
    notificationLevel: 'NONE'
  }
};

// ============================================================================
// Incident Category
// ============================================================================

/** Top-level incident categories */
export type IncidentCategory =
  | 'HARDWARE'
  | 'SOFTWARE'
  | 'NETWORK'
  | 'SECURITY'
  | 'ACCESS'
  | 'SERVICE_REQUEST'
  | 'OTHER';

/** Incident subcategory */
export interface IncidentSubcategory {
  readonly category: IncidentCategory;
  readonly subcategoryId: Identifier;
  readonly name: string;
  readonly description: string;
  readonly defaultPriority: IncidentPriority;
  readonly requiresApproval: boolean;
}

// ============================================================================
// Incident Impact & Urgency
// ============================================================================

/** Incident impact level */
export type IncidentImpact =
  | 'EXTENSIVE'    // Affects entire organization
  | 'SIGNIFICANT'  // Affects multiple departments
  | 'MODERATE'     // Affects single department
  | 'MINOR';       // Affects single user

/** Incident urgency level */
export type IncidentUrgency =
  | 'CRITICAL'     // Business-critical, immediate attention
  | 'HIGH'         // Significant degradation
  | 'MEDIUM'       // Minor degradation
  | 'LOW';         // No immediate impact

/** Priority matrix (Impact x Urgency) */
export const PriorityMatrix: Record<IncidentImpact, Record<IncidentUrgency, IncidentPriority>> = {
  EXTENSIVE: {
    CRITICAL: 'CRITICAL',
    HIGH: 'CRITICAL',
    MEDIUM: 'HIGH',
    LOW: 'HIGH'
  },
  SIGNIFICANT: {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'HIGH',
    LOW: 'MEDIUM'
  },
  MODERATE: {
    CRITICAL: 'HIGH',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW'
  },
  MINOR: {
    CRITICAL: 'HIGH',
    HIGH: 'MEDIUM',
    MEDIUM: 'LOW',
    LOW: 'LOW'
  }
};

/** Calculate priority from impact and urgency */
export const calculatePriority = (
  impact: IncidentImpact,
  urgency: IncidentUrgency
): IncidentPriority => {
  return PriorityMatrix[impact][urgency];
};

// ============================================================================
// Incident Entity
// ============================================================================

/** Core incident entity */
export interface Incident {
  readonly id: UUID;
  readonly incidentNumber: IncidentNumber;
  readonly state: IncidentState;
  readonly title: string;
  readonly description: string;
  readonly category: IncidentCategory;
  readonly subcategory?: IncidentSubcategory;
  readonly priority: IncidentPriority;
  readonly impact: IncidentImpact;
  readonly urgency: IncidentUrgency;
  readonly reportedBy: UserId;
  readonly assignedTo?: UserId;
  readonly assignedGroup?: Identifier;
  readonly affectedService?: EntityReference;
  readonly affectedAsset?: EntityReference;
  readonly relatedIncidents: IncidentNumber[];
  readonly orgUnit: OrgUnitReference;
  readonly sla: SLAInfo;
  readonly resolution?: ResolutionInfo;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly closedAt?: Timestamp;
  readonly version: number;
}

/** SLA tracking information */
export interface SLAInfo {
  readonly responseTargetTime: Timestamp;
  readonly resolutionTargetTime: Timestamp;
  readonly responseAchieved: boolean;
  readonly resolutionAchieved: boolean;
  readonly respondedAt?: Timestamp;
  readonly breached: boolean;
  readonly breachedAt?: Timestamp;
}

/** Resolution information */
export interface ResolutionInfo {
  readonly resolutionCode: ResolutionCode;
  readonly resolutionNotes: string;
  readonly resolvedBy: UserId;
  readonly resolvedAt: Timestamp;
  readonly workaround: boolean;
  readonly rootCauseIdentified: boolean;
  readonly knowledgeArticleRef?: Identifier;
}

/** Resolution codes */
export type ResolutionCode =
  | 'FIXED'
  | 'WORKAROUND_PROVIDED'
  | 'KNOWN_ERROR'
  | 'USER_ERROR'
  | 'DUPLICATE'
  | 'NOT_REPRODUCIBLE'
  | 'CANCELLED';

// ============================================================================
// Incident Work Log
// ============================================================================

/** Work log entry */
export interface WorkLogEntry {
  readonly id: UUID;
  readonly incidentId: UUID;
  readonly entryType: WorkLogEntryType;
  readonly description: string;
  readonly createdBy: UserId;
  readonly createdAt: Timestamp;
  readonly timeSpentMs?: DurationMs;
  readonly visibility: WorkLogVisibility;
}

/** Work log entry types */
export type WorkLogEntryType =
  | 'NOTE'
  | 'STATUS_UPDATE'
  | 'ASSIGNMENT_CHANGE'
  | 'PRIORITY_CHANGE'
  | 'COMMUNICATION'
  | 'RESOLUTION_ATTEMPT';

/** Work log visibility */
export type WorkLogVisibility =
  | 'PUBLIC'       // Visible to all stakeholders
  | 'INTERNAL'     // Visible to support staff only
  | 'PRIVATE';     // Visible to assigned agent only

// ============================================================================
// Escalation
// ============================================================================

/** Escalation level */
export interface EscalationLevel {
  readonly level: number;
  readonly name: string;
  readonly notifyGroup: Identifier;
  readonly notifyUsers: UserId[];
  readonly triggerAfterMs: DurationMs;
  readonly autoReassign: boolean;
}

/** Escalation path */
export interface EscalationPath {
  readonly pathId: Identifier;
  readonly name: string;
  readonly levels: EscalationLevel[];
  readonly applicableCategories: IncidentCategory[];
  readonly applicablePriorities: IncidentPriority[];
}

/** Escalation state */
export interface EscalationState {
  readonly currentLevel: number;
  readonly escalatedAt?: Timestamp;
  readonly escalationPath: EscalationPath;
  readonly history: EscalationHistoryEntry[];
}

/** Escalation history entry */
export interface EscalationHistoryEntry {
  readonly level: number;
  readonly escalatedAt: Timestamp;
  readonly reason: EscalationReason;
  readonly triggeredBy: 'SYSTEM' | UserId;
}

/** Escalation reasons */
export type EscalationReason =
  | 'SLA_BREACH'
  | 'MANUAL'
  | 'PRIORITY_INCREASE'
  | 'CUSTOMER_REQUEST';

// ============================================================================
// State Machine Operations
// ============================================================================

/** Incident state machine */
export const IncidentStateMachine = {
  /** Get valid transitions from current state */
  getValidTransitions(state: IncidentState): IncidentState[] {
    return IncidentStateTransitions[state];
  },

  /** Check if transition is valid */
  canTransition(from: IncidentState, to: IncidentState): boolean {
    return isValidIncidentTransition(from, to);
  },

  /** Get terminal states */
  getTerminalStates(): IncidentState[] {
    return ['CLOSED'];
  },

  /** Check if state is terminal */
  isTerminal(state: IncidentState): boolean {
    return state === 'CLOSED';
  },

  /** Get initial state */
  getInitialState(): IncidentState {
    return 'NEW';
  }
};
