/**
 * Change Management Models
 *
 * State machines and domain models for change management.
 * Vendor-neutral types supporting ITIL-aligned change lifecycle.
 */

import {
  UUID,
  Identifier,
  UserId,
  ChangeNumber,
  Timestamp,
  DateString,
  DurationMs,
  EntityReference,
  OrgUnitReference
} from '../../../common';

// ============================================================================
// Change State Machine
// ============================================================================

/** Change request lifecycle states */
export type ChangeState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'IMPLEMENTING'
  | 'REVIEW'
  | 'CLOSED';

/** Valid change state transitions */
export const ChangeStateTransitions: Record<ChangeState, ChangeState[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['APPROVED', 'DRAFT'],
  APPROVED: ['SCHEDULED', 'DRAFT'],
  SCHEDULED: ['IMPLEMENTING', 'APPROVED'],
  IMPLEMENTING: ['REVIEW', 'SCHEDULED'],
  REVIEW: ['CLOSED', 'IMPLEMENTING'],
  CLOSED: []
};

/** Check if a state transition is valid */
export const isValidChangeTransition = (
  from: ChangeState,
  to: ChangeState
): boolean => {
  return ChangeStateTransitions[from].includes(to);
};

// ============================================================================
// Change Type
// ============================================================================

/** Change request types */
export type ChangeType =
  | 'STANDARD'   // Pre-approved, low risk
  | 'NORMAL'     // Requires CAB approval
  | 'EMERGENCY'; // Expedited approval process

/** Change type configuration */
export interface ChangeTypeConfig {
  readonly type: ChangeType;
  readonly requiresCABApproval: boolean;
  readonly minimumLeadTimeDays: number;
  readonly autoApprovalAllowed: boolean;
  readonly emergencyProcessEnabled: boolean;
  readonly rollbackRequired: boolean;
}

/** Default change type configurations */
export const DefaultChangeTypeConfigs: Record<ChangeType, ChangeTypeConfig> = {
  STANDARD: {
    type: 'STANDARD',
    requiresCABApproval: false,
    minimumLeadTimeDays: 1,
    autoApprovalAllowed: true,
    emergencyProcessEnabled: false,
    rollbackRequired: true
  },
  NORMAL: {
    type: 'NORMAL',
    requiresCABApproval: true,
    minimumLeadTimeDays: 5,
    autoApprovalAllowed: false,
    emergencyProcessEnabled: false,
    rollbackRequired: true
  },
  EMERGENCY: {
    type: 'EMERGENCY',
    requiresCABApproval: false,
    minimumLeadTimeDays: 0,
    autoApprovalAllowed: false,
    emergencyProcessEnabled: true,
    rollbackRequired: true
  }
};

// ============================================================================
// Change Risk Assessment
// ============================================================================

/** Risk level */
export type RiskLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

/** Risk assessment */
export interface RiskAssessment {
  readonly overallRisk: RiskLevel;
  readonly impactScore: number;       // 1-5
  readonly likelihoodScore: number;   // 1-5
  readonly riskFactors: RiskFactor[];
  readonly mitigations: RiskMitigation[];
  readonly assessedBy: UserId;
  readonly assessedAt: Timestamp;
}

/** Risk factor */
export interface RiskFactor {
  readonly factorId: Identifier;
  readonly category: RiskCategory;
  readonly description: string;
  readonly severity: RiskLevel;
  readonly mitigated: boolean;
}

/** Risk categories */
export type RiskCategory =
  | 'TECHNICAL'
  | 'BUSINESS'
  | 'SECURITY'
  | 'COMPLIANCE'
  | 'OPERATIONAL';

/** Risk mitigation */
export interface RiskMitigation {
  readonly mitigationId: Identifier;
  readonly riskFactorId: Identifier;
  readonly description: string;
  readonly owner: UserId;
  readonly status: MitigationStatus;
  readonly completedAt?: Timestamp;
}

/** Mitigation status */
export type MitigationStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

/** Calculate overall risk from scores */
export const calculateRiskLevel = (
  impactScore: number,
  likelihoodScore: number
): RiskLevel => {
  const riskScore = impactScore * likelihoodScore;
  if (riskScore >= 20) return 'CRITICAL';
  if (riskScore >= 12) return 'HIGH';
  if (riskScore >= 6) return 'MEDIUM';
  return 'LOW';
};

// ============================================================================
// Change Impact
// ============================================================================

/** Change impact scope */
export type ImpactScope =
  | 'LOCAL'        // Single system/component
  | 'DEPARTMENTAL' // Single department
  | 'ENTERPRISE'   // Multiple departments
  | 'EXTERNAL';    // Affects external parties

/** Impact assessment */
export interface ImpactAssessment {
  readonly scope: ImpactScope;
  readonly affectedServices: EntityReference[];
  readonly affectedUsers: number;
  readonly downtime: DowntimeEstimate;
  readonly businessImpact: string;
  readonly technicalImpact: string;
}

/** Downtime estimate */
export interface DowntimeEstimate {
  readonly expected: DurationMs;
  readonly maximum: DurationMs;
  readonly maintenanceWindow: MaintenanceWindow;
}

/** Maintenance window */
export interface MaintenanceWindow {
  readonly windowId: Identifier;
  readonly name: string;
  readonly dayOfWeek: number[];  // 0-6
  readonly startTime: string;    // HH:mm
  readonly endTime: string;      // HH:mm
  readonly timezone: string;
}

// ============================================================================
// Change Approval
// ============================================================================

/** Approval status */
export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'DEFERRED';

/** Approval record */
export interface ApprovalRecord {
  readonly approvalId: UUID;
  readonly approverId: UserId;
  readonly approverRole: ApproverRole;
  readonly status: ApprovalStatus;
  readonly comments: string;
  readonly decidedAt?: Timestamp;
  readonly required: boolean;
}

/** Approver roles */
export type ApproverRole =
  | 'TECHNICAL_LEAD'
  | 'BUSINESS_OWNER'
  | 'SECURITY_OFFICER'
  | 'CAB_MEMBER'
  | 'CHANGE_MANAGER';

/** CAB (Change Advisory Board) meeting */
export interface CABMeeting {
  readonly meetingId: UUID;
  readonly scheduledDate: DateString;
  readonly scheduledTime: string;
  readonly attendees: UserId[];
  readonly agenda: ChangeNumber[];
  readonly status: CABMeetingStatus;
  readonly minutes?: string;
}

/** CAB meeting status */
export type CABMeetingStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

// ============================================================================
// Change Implementation
// ============================================================================

/** Implementation plan */
export interface ImplementationPlan {
  readonly planId: UUID;
  readonly steps: ImplementationStep[];
  readonly estimatedDuration: DurationMs;
  readonly requiredResources: Resource[];
  readonly communicationPlan: CommunicationPlan;
  readonly testPlan: TestPlan;
  readonly rollbackPlan: RollbackPlan;
}

/** Implementation step */
export interface ImplementationStep {
  readonly stepNumber: number;
  readonly description: string;
  readonly assignedTo: UserId;
  readonly estimatedDuration: DurationMs;
  readonly prerequisites: number[];
  readonly verificationCriteria: string;
  readonly status: ImplementationStepStatus;
  readonly completedAt?: Timestamp;
}

/** Implementation step status */
export type ImplementationStepStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

/** Resource requirement */
export interface Resource {
  readonly resourceType: ResourceType;
  readonly description: string;
  readonly quantity: number;
  readonly secured: boolean;
}

/** Resource types */
export type ResourceType =
  | 'PERSONNEL'
  | 'EQUIPMENT'
  | 'SOFTWARE'
  | 'ENVIRONMENT'
  | 'ACCESS';

/** Communication plan */
export interface CommunicationPlan {
  readonly stakeholders: StakeholderCommunication[];
  readonly notificationSchedule: NotificationSchedule[];
}

/** Stakeholder communication */
export interface StakeholderCommunication {
  readonly stakeholderGroup: string;
  readonly channel: CommunicationChannel;
  readonly timing: CommunicationTiming;
  readonly message: string;
}

/** Communication channels */
export type CommunicationChannel =
  | 'EMAIL'
  | 'SMS'
  | 'PORTAL'
  | 'SLACK'
  | 'TEAMS';

/** Communication timing */
export type CommunicationTiming =
  | 'BEFORE_CHANGE'
  | 'DURING_CHANGE'
  | 'AFTER_CHANGE'
  | 'ON_FAILURE';

/** Notification schedule */
export interface NotificationSchedule {
  readonly timing: CommunicationTiming;
  readonly offsetMs: number;  // Offset from change start/end
  readonly recipients: string[];
  readonly template: string;
}

/** Test plan */
export interface TestPlan {
  readonly testCases: TestCase[];
  readonly acceptanceCriteria: string[];
  readonly rollbackTriggers: string[];
}

/** Test case */
export interface TestCase {
  readonly testId: Identifier;
  readonly description: string;
  readonly type: TestType;
  readonly status: TestStatus;
  readonly result?: string;
  readonly executedAt?: Timestamp;
}

/** Test types */
export type TestType =
  | 'SMOKE'
  | 'FUNCTIONAL'
  | 'INTEGRATION'
  | 'PERFORMANCE'
  | 'SECURITY';

/** Test status */
export type TestStatus =
  | 'PENDING'
  | 'PASSED'
  | 'FAILED'
  | 'SKIPPED';

/** Rollback plan */
export interface RollbackPlan {
  readonly steps: ImplementationStep[];
  readonly estimatedDuration: DurationMs;
  readonly triggers: string[];
  readonly verified: boolean;
  readonly verifiedBy?: UserId;
  readonly verifiedAt?: Timestamp;
}

// ============================================================================
// Change Entity
// ============================================================================

/** Core change request entity */
export interface ChangeRequest {
  readonly id: UUID;
  readonly changeNumber: ChangeNumber;
  readonly state: ChangeState;
  readonly type: ChangeType;
  readonly title: string;
  readonly description: string;
  readonly justification: string;
  readonly requestedBy: UserId;
  readonly assignedTo?: UserId;
  readonly orgUnit: OrgUnitReference;
  readonly riskAssessment?: RiskAssessment;
  readonly impactAssessment?: ImpactAssessment;
  readonly approvals: ApprovalRecord[];
  readonly implementationPlan?: ImplementationPlan;
  readonly scheduledStart?: Timestamp;
  readonly scheduledEnd?: Timestamp;
  readonly actualStart?: Timestamp;
  readonly actualEnd?: Timestamp;
  readonly relatedIncidents: Identifier[];
  readonly relatedChanges: ChangeNumber[];
  readonly affectedCIs: EntityReference[];
  readonly review?: ChangeReview;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly closedAt?: Timestamp;
  readonly version: number;
}

/** Post-implementation review */
export interface ChangeReview {
  readonly reviewId: UUID;
  readonly successful: boolean;
  readonly objectives: ObjectiveResult[];
  readonly lessonsLearned: string[];
  readonly recommendations: string[];
  readonly reviewedBy: UserId;
  readonly reviewedAt: Timestamp;
}

/** Objective result */
export interface ObjectiveResult {
  readonly objective: string;
  readonly achieved: boolean;
  readonly notes: string;
}

// ============================================================================
// State Machine Operations
// ============================================================================

/** Change state machine */
export const ChangeStateMachine = {
  /** Get valid transitions from current state */
  getValidTransitions(state: ChangeState): ChangeState[] {
    return ChangeStateTransitions[state];
  },

  /** Check if transition is valid */
  canTransition(from: ChangeState, to: ChangeState): boolean {
    return isValidChangeTransition(from, to);
  },

  /** Get terminal states */
  getTerminalStates(): ChangeState[] {
    return ['CLOSED'];
  },

  /** Check if state is terminal */
  isTerminal(state: ChangeState): boolean {
    return state === 'CLOSED';
  },

  /** Get initial state */
  getInitialState(): ChangeState {
    return 'DRAFT';
  },

  /** Check if change requires approval based on type */
  requiresApproval(changeType: ChangeType): boolean {
    return DefaultChangeTypeConfigs[changeType].requiresCABApproval;
  }
};
