/**
 * Case Models
 * Defines state machines and domain models for case management
 */

import { EntityId, ISODateTimeString } from '../../common/types';

// ============================================================================
// Case State Machine
// ============================================================================

export type CaseState =
  | 'NONE'
  | 'NEW'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'PENDING'
  | 'RESOLVED'
  | 'CLOSED';

export interface CaseStateMachine {
  readonly currentState: CaseState;
  readonly previousState?: CaseState;
  readonly stateHistory: readonly CaseStateHistoryEntry[];
  readonly enteredAt: ISODateTimeString;
}

export interface CaseStateHistoryEntry {
  readonly fromState: CaseState;
  readonly toState: CaseState;
  readonly trigger: string;
  readonly triggeredBy: EntityId;
  readonly triggeredAt: ISODateTimeString;
  readonly reason?: string;
  readonly durationMinutes: number;
}

export const caseStateTransitionMatrix: Record<CaseState, readonly CaseState[]> = {
  NONE: ['NEW'],
  NEW: ['OPEN', 'CLOSED'],
  OPEN: ['IN_PROGRESS', 'PENDING', 'CLOSED'],
  IN_PROGRESS: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'],
  PENDING: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['OPEN', 'CLOSED'],
  CLOSED: ['OPEN'],
} as const;

export function canTransitionCaseTo(
  currentState: CaseState,
  targetState: CaseState
): boolean {
  const allowedTransitions = caseStateTransitionMatrix[currentState];
  return allowedTransitions.includes(targetState);
}

export function createCaseStateMachine(
  initialState: CaseState = 'NONE'
): CaseStateMachine {
  return {
    currentState: initialState,
    previousState: undefined,
    stateHistory: [],
    enteredAt: new Date().toISOString(),
  };
}

export function transitionCaseState(
  machine: CaseStateMachine,
  targetState: CaseState,
  trigger: string,
  triggeredBy: EntityId,
  reason?: string
): CaseStateMachine {
  if (!canTransitionCaseTo(machine.currentState, targetState)) {
    throw new Error(
      `Invalid case state transition from ${machine.currentState} to ${targetState}`
    );
  }

  const now = new Date();
  const enteredAt = new Date(machine.enteredAt);
  const durationMinutes = Math.round(
    (now.getTime() - enteredAt.getTime()) / (1000 * 60)
  );

  const historyEntry: CaseStateHistoryEntry = {
    fromState: machine.currentState,
    toState: targetState,
    trigger,
    triggeredBy,
    triggeredAt: now.toISOString(),
    reason,
    durationMinutes,
  };

  return {
    currentState: targetState,
    previousState: machine.currentState,
    stateHistory: [...machine.stateHistory, historyEntry],
    enteredAt: now.toISOString(),
  };
}

export function getTimeInState(machine: CaseStateMachine): number {
  const now = new Date();
  const enteredAt = new Date(machine.enteredAt);
  return Math.round((now.getTime() - enteredAt.getTime()) / (1000 * 60));
}

export function getTotalHandlingTime(machine: CaseStateMachine): number {
  return machine.stateHistory.reduce(
    (total, entry) => total + entry.durationMinutes,
    0
  );
}

// ============================================================================
// Case Priority
// ============================================================================

export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const priorityOrder: readonly CasePriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];

export function comparePriority(a: CasePriority, b: CasePriority): number {
  return priorityOrder.indexOf(a) - priorityOrder.indexOf(b);
}

export function isHigherPriority(
  current: CasePriority,
  proposed: CasePriority
): boolean {
  return comparePriority(proposed, current) > 0;
}

export interface PriorityEscalationRule {
  readonly priority: CasePriority;
  readonly escalateAfterMinutes: number;
  readonly escalateTo: CasePriority;
}

export const defaultEscalationRules: readonly PriorityEscalationRule[] = [
  { priority: 'LOW', escalateAfterMinutes: 1440, escalateTo: 'MEDIUM' },
  { priority: 'MEDIUM', escalateAfterMinutes: 480, escalateTo: 'HIGH' },
  { priority: 'HIGH', escalateAfterMinutes: 240, escalateTo: 'CRITICAL' },
];

export function shouldAutoEscalate(
  currentPriority: CasePriority,
  minutesOpen: number
): CasePriority | null {
  const rule = defaultEscalationRules.find(
    (r) => r.priority === currentPriority
  );
  if (rule && minutesOpen >= rule.escalateAfterMinutes) {
    return rule.escalateTo;
  }
  return null;
}

// ============================================================================
// Case Channel
// ============================================================================

export type CaseChannel =
  | 'EMAIL'
  | 'PHONE'
  | 'WEB'
  | 'CHAT'
  | 'SOCIAL'
  | 'IN_PERSON'
  | 'API';

export interface ChannelConfig {
  readonly channel: CaseChannel;
  readonly autoResponse: boolean;
  readonly defaultPriority: CasePriority;
  readonly defaultQueueId?: EntityId;
  readonly workingHoursOnly: boolean;
}

export const defaultChannelConfigs: Record<CaseChannel, ChannelConfig> = {
  EMAIL: {
    channel: 'EMAIL',
    autoResponse: true,
    defaultPriority: 'MEDIUM',
    workingHoursOnly: false,
  },
  PHONE: {
    channel: 'PHONE',
    autoResponse: false,
    defaultPriority: 'HIGH',
    workingHoursOnly: true,
  },
  WEB: {
    channel: 'WEB',
    autoResponse: true,
    defaultPriority: 'MEDIUM',
    workingHoursOnly: false,
  },
  CHAT: {
    channel: 'CHAT',
    autoResponse: false,
    defaultPriority: 'HIGH',
    workingHoursOnly: true,
  },
  SOCIAL: {
    channel: 'SOCIAL',
    autoResponse: true,
    defaultPriority: 'HIGH',
    workingHoursOnly: false,
  },
  IN_PERSON: {
    channel: 'IN_PERSON',
    autoResponse: false,
    defaultPriority: 'HIGH',
    workingHoursOnly: true,
  },
  API: {
    channel: 'API',
    autoResponse: false,
    defaultPriority: 'MEDIUM',
    workingHoursOnly: false,
  },
};

// ============================================================================
// Case Queue
// ============================================================================

export interface CaseQueue {
  readonly queueId: EntityId;
  readonly name: string;
  readonly description?: string;
  readonly supportedCaseTypes: readonly string[];
  readonly supportedChannels: readonly CaseChannel[];
  readonly skillRequirements: readonly string[];
  readonly maxCapacity?: number;
  readonly currentLoad: number;
  readonly isActive: boolean;
  readonly businessHours?: BusinessHours;
}

export interface BusinessHours {
  readonly timezone: string;
  readonly schedule: Record<string, DaySchedule>;
}

export interface DaySchedule {
  readonly isOpen: boolean;
  readonly openTime?: string; // HH:mm format
  readonly closeTime?: string; // HH:mm format
  readonly breaks?: readonly Break[];
}

export interface Break {
  readonly startTime: string; // HH:mm format
  readonly endTime: string; // HH:mm format
}

// ============================================================================
// Case Agent
// ============================================================================

export interface CaseAgent {
  readonly agentId: EntityId;
  readonly name: string;
  readonly email: string;
  readonly skills: readonly string[];
  readonly queues: readonly EntityId[];
  readonly maxConcurrentCases: number;
  readonly currentCaseCount: number;
  readonly isAvailable: boolean;
  readonly status: AgentStatus;
  readonly lastActivityAt?: ISODateTimeString;
}

export type AgentStatus =
  | 'AVAILABLE'
  | 'BUSY'
  | 'AWAY'
  | 'ON_BREAK'
  | 'OFFLINE';

export function canAssignToAgent(agent: CaseAgent): boolean {
  return (
    agent.isAvailable &&
    agent.status === 'AVAILABLE' &&
    agent.currentCaseCount < agent.maxConcurrentCases
  );
}

// ============================================================================
// Case Resolution
// ============================================================================

export interface CaseResolution {
  readonly resolutionId: EntityId;
  readonly caseId: EntityId;
  readonly resolution: string;
  readonly resolutionCode: string;
  readonly rootCause?: string;
  readonly preventiveMeasures?: string;
  readonly customerSatisfied: boolean;
  readonly resolvedBy: EntityId;
  readonly resolvedAt: ISODateTimeString;
  readonly timeToResolution: number;
  readonly slaMet: boolean;
}

// ============================================================================
// Case Interaction
// ============================================================================

export interface CaseInteraction {
  readonly interactionId: EntityId;
  readonly caseId: EntityId;
  readonly interactionType: InteractionType;
  readonly channel: CaseChannel;
  readonly direction: 'INBOUND' | 'OUTBOUND';
  readonly content: string;
  readonly agentId?: EntityId;
  readonly contactId?: EntityId;
  readonly createdAt: ISODateTimeString;
  readonly attachments?: readonly EntityId[];
}

export type InteractionType =
  | 'NOTE'
  | 'EMAIL'
  | 'CALL'
  | 'CHAT'
  | 'MEETING'
  | 'TASK'
  | 'SYSTEM';

// ============================================================================
// Case SLA Tracking
// ============================================================================

export interface CaseSLAStatus {
  readonly caseId: EntityId;
  readonly responseSlaMet: boolean | null;
  readonly resolutionSlaMet: boolean | null;
  readonly responseDeadline: ISODateTimeString;
  readonly resolutionDeadline: ISODateTimeString;
  readonly firstResponseAt?: ISODateTimeString;
  readonly resolvedAt?: ISODateTimeString;
  readonly responseBreachMinutes?: number;
  readonly resolutionBreachMinutes?: number;
  readonly pausedMinutes: number;
  readonly adjustedResolutionDeadline?: ISODateTimeString;
}

export function calculateSLAStatus(
  slaStatus: CaseSLAStatus,
  currentTime: Date = new Date()
): {
  readonly responseStatus: 'MET' | 'BREACHED' | 'AT_RISK' | 'PENDING';
  readonly resolutionStatus: 'MET' | 'BREACHED' | 'AT_RISK' | 'PENDING';
} {
  const responseDeadline = new Date(slaStatus.responseDeadline);
  const resolutionDeadline = new Date(
    slaStatus.adjustedResolutionDeadline ?? slaStatus.resolutionDeadline
  );

  const atRiskThresholdMinutes = 30;

  let responseStatus: 'MET' | 'BREACHED' | 'AT_RISK' | 'PENDING';
  if (slaStatus.firstResponseAt) {
    const responseTime = new Date(slaStatus.firstResponseAt);
    responseStatus = responseTime <= responseDeadline ? 'MET' : 'BREACHED';
  } else if (currentTime > responseDeadline) {
    responseStatus = 'BREACHED';
  } else if (
    currentTime.getTime() >
    responseDeadline.getTime() - atRiskThresholdMinutes * 60 * 1000
  ) {
    responseStatus = 'AT_RISK';
  } else {
    responseStatus = 'PENDING';
  }

  let resolutionStatus: 'MET' | 'BREACHED' | 'AT_RISK' | 'PENDING';
  if (slaStatus.resolvedAt) {
    const resolvedTime = new Date(slaStatus.resolvedAt);
    resolutionStatus = resolvedTime <= resolutionDeadline ? 'MET' : 'BREACHED';
  } else if (currentTime > resolutionDeadline) {
    resolutionStatus = 'BREACHED';
  } else if (
    currentTime.getTime() >
    resolutionDeadline.getTime() - atRiskThresholdMinutes * 60 * 1000
  ) {
    resolutionStatus = 'AT_RISK';
  } else {
    resolutionStatus = 'PENDING';
  }

  return { responseStatus, resolutionStatus };
}

// ============================================================================
// Case Metrics
// ============================================================================

export interface CaseMetrics {
  readonly totalCases: number;
  readonly openCases: number;
  readonly resolvedCases: number;
  readonly averageTimeToResolution: number;
  readonly slaComplianceRate: number;
  readonly customerSatisfactionScore?: number;
  readonly firstContactResolutionRate: number;
  readonly reopenRate: number;
  readonly escalationRate: number;
}

export interface AgentMetrics {
  readonly agentId: EntityId;
  readonly casesHandled: number;
  readonly averageHandlingTime: number;
  readonly customerSatisfactionScore: number;
  readonly slaComplianceRate: number;
  readonly firstContactResolutionRate: number;
  readonly utilization: number;
}
