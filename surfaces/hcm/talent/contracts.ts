/**
 * Talent Surface Contracts
 * Defines typed contracts for requisition management, applications, and performance evaluation
 */

import {
  EmployeeId,
  PositionId,
  DepartmentId,
  RequisitionId,
  ApplicationId,
  Money,
  ISODateString,
  ISODateTimeString,
  Compensation,
  Precondition,
  Postcondition,
  ApprovalStatus,
} from '../../common/types';
import {
  ValidationError,
  PreconditionError,
  NotFoundError,
  EmployeeNotFoundError,
  PositionNotFoundError,
} from '../../common/errors';
import { DomainEvent, createEvent, Observable } from '../../common/events';

// ============================================================================
// Talent Domain Types
// ============================================================================

export type RequisitionStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'OPEN'
  | 'ON_HOLD'
  | 'FILLED'
  | 'CANCELLED';

export type ApplicationStatus =
  | 'RECEIVED'
  | 'SCREENING'
  | 'PHONE_SCREEN'
  | 'INTERVIEW'
  | 'ASSESSMENT'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type PerformanceRating =
  | 'EXCEEDS_EXPECTATIONS'
  | 'MEETS_EXPECTATIONS'
  | 'NEEDS_IMPROVEMENT'
  | 'UNSATISFACTORY';

export type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Requisition {
  requisitionId: RequisitionId;
  positionId: PositionId;
  departmentId: DepartmentId;
  title: string;
  description: string;
  requirements: string[];
  preferredQualifications?: string[];
  compensation: CompensationRange;
  employmentType: string;
  location: string;
  hiringManagerId: EmployeeId;
  recruiterId?: EmployeeId;
  status: RequisitionStatus;
  targetStartDate?: ISODateString;
  openDate?: ISODateString;
  closeDate?: ISODateString;
}

export interface CompensationRange {
  minimum: Money;
  maximum: Money;
  target: Money;
  currency: string;
}

export interface Application {
  applicationId: ApplicationId;
  requisitionId: RequisitionId;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  resumeUrl?: string;
  coverLetterUrl?: string;
  status: ApplicationStatus;
  source: ApplicationSource;
  appliedAt: ISODateTimeString;
  currentStage: string;
  stageHistory: StageTransition[];
  ratings: CandidateRating[];
  notes: CandidateNote[];
}

export type ApplicationSource =
  | 'DIRECT'
  | 'REFERRAL'
  | 'JOB_BOARD'
  | 'LINKEDIN'
  | 'AGENCY'
  | 'CAREER_SITE'
  | 'INTERNAL';

export interface StageTransition {
  fromStage: string;
  toStage: string;
  transitionedAt: ISODateTimeString;
  transitionedBy: EmployeeId;
  notes?: string;
}

export interface CandidateRating {
  ratedBy: EmployeeId;
  ratedAt: ISODateTimeString;
  category: string;
  score: number;
  maxScore: number;
  comments?: string;
}

export interface CandidateNote {
  noteId: string;
  authorId: EmployeeId;
  createdAt: ISODateTimeString;
  content: string;
  visibility: 'PRIVATE' | 'TEAM' | 'ALL';
}

export interface PerformanceReview {
  reviewId: string;
  employeeId: EmployeeId;
  reviewerId: EmployeeId;
  reviewPeriod: ReviewPeriod;
  goals: PerformanceGoal[];
  competencies: CompetencyRating[];
  overallRating: PerformanceRating;
  strengths: string[];
  areasForImprovement: string[];
  developmentPlan?: string;
  comments?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'FINALIZED';
}

export interface ReviewPeriod {
  name: string;
  startDate: ISODateString;
  endDate: ISODateString;
  reviewType: 'ANNUAL' | 'MID_YEAR' | 'QUARTERLY' | 'PROBATION' | 'PROJECT';
}

export interface PerformanceGoal {
  goalId: string;
  title: string;
  description: string;
  weight: number;
  targetDate?: ISODateString;
  status: GoalStatus;
  progress: number;
  rating?: PerformanceRating;
  comments?: string;
}

export interface CompetencyRating {
  competencyId: string;
  competencyName: string;
  rating: PerformanceRating;
  weight: number;
  examples?: string;
}

// ============================================================================
// Create Requisition Contract
// ============================================================================

export interface CreateRequisitionInput {
  position_id: PositionId;
  department_id: DepartmentId;
  title: string;
  description: string;
  requirements: string[];
  preferred_qualifications?: string[];
  compensation_range: CompensationRange;
  employment_type: string;
  location: string;
  hiring_manager_id: EmployeeId;
  recruiter_id?: EmployeeId;
  target_start_date?: ISODateString;
  headcount: number;
}

export interface CreateRequisitionOutput {
  requisition_id: RequisitionId;
  position_id: PositionId;
  status: RequisitionStatus;
  created_at: ISODateTimeString;
  approval_required: boolean;
  estimated_time_to_fill?: number;
}

export interface CreateRequisitionContract {
  input: CreateRequisitionInput;
  output: CreateRequisitionOutput;
  preconditions: Precondition<CreateRequisitionInput>[];
  postconditions: Postcondition<CreateRequisitionInput, CreateRequisitionOutput>[];
  events: {
    RequisitionCreated: RequisitionCreatedEvent;
    RequisitionPendingApproval: RequisitionPendingApprovalEvent;
  };
  errors: typeof CreateRequisitionErrors;
}

export const CreateRequisitionErrors = {
  PositionNotFound: PositionNotFoundError,
  EmployeeNotFound: EmployeeNotFoundError,
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
} as const;

export const createRequisitionPreconditions: Precondition<CreateRequisitionInput>[] = [
  {
    name: 'ValidPositionId',
    description: 'Position ID must be provided',
    check: (input) => !!input.position_id && input.position_id.length > 0,
  },
  {
    name: 'ValidDepartmentId',
    description: 'Department ID must be provided',
    check: (input) => !!input.department_id && input.department_id.length > 0,
  },
  {
    name: 'ValidTitle',
    description: 'Title must be provided',
    check: (input) => !!input.title && input.title.length > 0,
  },
  {
    name: 'ValidDescription',
    description: 'Description must be provided',
    check: (input) => !!input.description && input.description.length > 0,
  },
  {
    name: 'ValidRequirements',
    description: 'At least one requirement must be provided',
    check: (input) => Array.isArray(input.requirements) && input.requirements.length > 0,
  },
  {
    name: 'ValidCompensationRange',
    description: 'Compensation range must have valid minimum, maximum, and target',
    check: (input) =>
      input.compensation_range.minimum.amount > 0 &&
      input.compensation_range.maximum.amount >= input.compensation_range.minimum.amount &&
      input.compensation_range.target.amount >= input.compensation_range.minimum.amount &&
      input.compensation_range.target.amount <= input.compensation_range.maximum.amount,
  },
  {
    name: 'ValidHiringManager',
    description: 'Hiring manager ID must be provided',
    check: (input) => !!input.hiring_manager_id && input.hiring_manager_id.length > 0,
  },
  {
    name: 'ValidHeadcount',
    description: 'Headcount must be at least 1',
    check: (input) => input.headcount >= 1,
  },
];

export const createRequisitionPostconditions: Postcondition<
  CreateRequisitionInput,
  CreateRequisitionOutput
>[] = [
  {
    name: 'RequisitionIdGenerated',
    description: 'A unique requisition ID must be generated',
    check: (_, output) => !!output.requisition_id && output.requisition_id.length > 0,
  },
  {
    name: 'PositionIdMatches',
    description: 'Position ID must match input',
    check: (input, output) => output.position_id === input.position_id,
  },
  {
    name: 'ValidStatus',
    description: 'Status must be DRAFT or PENDING_APPROVAL',
    check: (_, output) =>
      output.status === 'DRAFT' || output.status === 'PENDING_APPROVAL',
  },
];

// ============================================================================
// Submit Application Contract
// ============================================================================

export interface SubmitApplicationInput {
  requisition_id: RequisitionId;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  resume_url?: string;
  cover_letter_url?: string;
  source: ApplicationSource;
  referrer_employee_id?: EmployeeId;
  answers?: ApplicationAnswer[];
}

export interface ApplicationAnswer {
  questionId: string;
  answer: string;
}

export interface SubmitApplicationOutput {
  application_id: ApplicationId;
  requisition_id: RequisitionId;
  status: ApplicationStatus;
  current_stage: string;
  submitted_at: ISODateTimeString;
  confirmation_number: string;
  estimated_response_time?: number;
}

export interface SubmitApplicationContract {
  input: SubmitApplicationInput;
  output: SubmitApplicationOutput;
  preconditions: Precondition<SubmitApplicationInput>[];
  postconditions: Postcondition<SubmitApplicationInput, SubmitApplicationOutput>[];
  events: {
    ApplicationSubmitted: ApplicationSubmittedEvent;
    ApplicationReceived: ApplicationReceivedEvent;
  };
  errors: typeof SubmitApplicationErrors;
}

export class RequisitionNotFoundError extends NotFoundError {
  override readonly code = 'REQUISITION_NOT_FOUND';

  constructor(requisitionId: string, correlationId?: string) {
    super('Requisition', requisitionId, correlationId);
  }
}

export const SubmitApplicationErrors = {
  RequisitionNotFound: RequisitionNotFoundError,
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
} as const;

export const submitApplicationPreconditions: Precondition<SubmitApplicationInput>[] = [
  {
    name: 'ValidRequisitionId',
    description: 'Requisition ID must be provided',
    check: (input) => !!input.requisition_id && input.requisition_id.length > 0,
  },
  {
    name: 'ValidCandidateName',
    description: 'Candidate name must be provided',
    check: (input) => !!input.candidate_name && input.candidate_name.length > 0,
  },
  {
    name: 'ValidCandidateEmail',
    description: 'Valid email must be provided',
    check: (input) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !!input.candidate_email && emailRegex.test(input.candidate_email);
    },
  },
  {
    name: 'ValidSource',
    description: 'Application source must be valid',
    check: (input) => !!input.source,
  },
];

export const submitApplicationPostconditions: Postcondition<
  SubmitApplicationInput,
  SubmitApplicationOutput
>[] = [
  {
    name: 'ApplicationIdGenerated',
    description: 'A unique application ID must be generated',
    check: (_, output) => !!output.application_id && output.application_id.length > 0,
  },
  {
    name: 'RequisitionIdMatches',
    description: 'Requisition ID must match input',
    check: (input, output) => output.requisition_id === input.requisition_id,
  },
  {
    name: 'StatusIsReceived',
    description: 'Initial status must be RECEIVED',
    check: (_, output) => output.status === 'RECEIVED',
  },
  {
    name: 'ConfirmationNumberGenerated',
    description: 'Confirmation number must be generated',
    check: (_, output) => !!output.confirmation_number,
  },
];

// ============================================================================
// Evaluate Performance Contract
// ============================================================================

export interface EvaluatePerformanceInput {
  employee_id: EmployeeId;
  reviewer_id: EmployeeId;
  review_period: ReviewPeriod;
  goals: PerformanceGoalEvaluation[];
  competencies: CompetencyEvaluation[];
  overall_rating: PerformanceRating;
  strengths: string[];
  areas_for_improvement: string[];
  development_plan?: string;
  comments?: string;
}

export interface PerformanceGoalEvaluation {
  goal_id: string;
  progress: number;
  rating: PerformanceRating;
  comments?: string;
}

export interface CompetencyEvaluation {
  competency_id: string;
  rating: PerformanceRating;
  examples?: string;
}

export interface EvaluatePerformanceOutput {
  review_id: string;
  employee_id: EmployeeId;
  reviewer_id: EmployeeId;
  review_period: ReviewPeriod;
  overall_rating: PerformanceRating;
  status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'FINALIZED';
  compensation_eligible: boolean;
  promotion_eligible: boolean;
  created_at: ISODateTimeString;
  next_review_date?: ISODateString;
}

export interface EvaluatePerformanceContract {
  input: EvaluatePerformanceInput;
  output: EvaluatePerformanceOutput;
  preconditions: Precondition<EvaluatePerformanceInput>[];
  postconditions: Postcondition<EvaluatePerformanceInput, EvaluatePerformanceOutput>[];
  events: {
    PerformanceReviewCreated: PerformanceReviewCreatedEvent;
    PerformanceReviewSubmitted: PerformanceReviewSubmittedEvent;
  };
  errors: typeof EvaluatePerformanceErrors;
}

export const EvaluatePerformanceErrors = {
  EmployeeNotFound: EmployeeNotFoundError,
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
} as const;

export const evaluatePerformancePreconditions: Precondition<EvaluatePerformanceInput>[] = [
  {
    name: 'ValidEmployeeId',
    description: 'Employee ID must be provided',
    check: (input) => !!input.employee_id && input.employee_id.length > 0,
  },
  {
    name: 'ValidReviewerId',
    description: 'Reviewer ID must be provided',
    check: (input) => !!input.reviewer_id && input.reviewer_id.length > 0,
  },
  {
    name: 'DifferentEmployeeAndReviewer',
    description: 'Employee and reviewer must be different',
    check: (input) => input.employee_id !== input.reviewer_id,
  },
  {
    name: 'ValidReviewPeriod',
    description: 'Review period must have valid dates',
    check: (input) =>
      !!input.review_period.startDate &&
      !!input.review_period.endDate &&
      new Date(input.review_period.startDate) < new Date(input.review_period.endDate),
  },
  {
    name: 'ValidOverallRating',
    description: 'Overall rating must be provided',
    check: (input) => !!input.overall_rating,
  },
  {
    name: 'ValidStrengths',
    description: 'At least one strength must be identified',
    check: (input) => Array.isArray(input.strengths) && input.strengths.length > 0,
  },
];

export const evaluatePerformancePostconditions: Postcondition<
  EvaluatePerformanceInput,
  EvaluatePerformanceOutput
>[] = [
  {
    name: 'ReviewIdGenerated',
    description: 'A unique review ID must be generated',
    check: (_, output) => !!output.review_id && output.review_id.length > 0,
  },
  {
    name: 'EmployeeIdMatches',
    description: 'Employee ID must match input',
    check: (input, output) => output.employee_id === input.employee_id,
  },
  {
    name: 'ReviewerIdMatches',
    description: 'Reviewer ID must match input',
    check: (input, output) => output.reviewer_id === input.reviewer_id,
  },
  {
    name: 'OverallRatingMatches',
    description: 'Overall rating must match input',
    check: (input, output) => output.overall_rating === input.overall_rating,
  },
  {
    name: 'EligibilityDetermined',
    description: 'Compensation and promotion eligibility must be determined',
    check: (_, output) =>
      typeof output.compensation_eligible === 'boolean' &&
      typeof output.promotion_eligible === 'boolean',
  },
];

// ============================================================================
// Talent Events
// ============================================================================

export interface RequisitionCreatedPayload {
  requisitionId: RequisitionId;
  positionId: PositionId;
  departmentId: DepartmentId;
  title: string;
  hiringManagerId: EmployeeId;
  status: RequisitionStatus;
  headcount: number;
}

export type RequisitionCreatedEvent = DomainEvent<RequisitionCreatedPayload>;

export interface RequisitionPendingApprovalPayload {
  requisitionId: RequisitionId;
  approvalChain: EmployeeId[];
  submittedBy: EmployeeId;
  submittedAt: ISODateTimeString;
}

export type RequisitionPendingApprovalEvent = DomainEvent<RequisitionPendingApprovalPayload>;

export interface ApplicationSubmittedPayload {
  applicationId: ApplicationId;
  requisitionId: RequisitionId;
  candidateName: string;
  candidateEmail: string;
  source: ApplicationSource;
  submittedAt: ISODateTimeString;
}

export type ApplicationSubmittedEvent = DomainEvent<ApplicationSubmittedPayload>;

export interface ApplicationReceivedPayload {
  applicationId: ApplicationId;
  requisitionId: RequisitionId;
  confirmationNumber: string;
  receivedAt: ISODateTimeString;
}

export type ApplicationReceivedEvent = DomainEvent<ApplicationReceivedPayload>;

export interface PerformanceReviewCreatedPayload {
  reviewId: string;
  employeeId: EmployeeId;
  reviewerId: EmployeeId;
  reviewPeriod: ReviewPeriod;
  overallRating: PerformanceRating;
  createdAt: ISODateTimeString;
}

export type PerformanceReviewCreatedEvent = DomainEvent<PerformanceReviewCreatedPayload>;

export interface PerformanceReviewSubmittedPayload {
  reviewId: string;
  employeeId: EmployeeId;
  reviewerId: EmployeeId;
  overallRating: PerformanceRating;
  submittedAt: ISODateTimeString;
}

export type PerformanceReviewSubmittedEvent = DomainEvent<PerformanceReviewSubmittedPayload>;

// ============================================================================
// Event Factories
// ============================================================================

export function createRequisitionCreatedEvent(
  payload: RequisitionCreatedPayload,
  metadata?: { correlationId?: string; userId?: string }
): RequisitionCreatedEvent {
  return createEvent('RequisitionCreated', payload.requisitionId, 'Requisition', payload, {
    ...metadata,
    source: 'TalentSurface',
  });
}

export function createRequisitionPendingApprovalEvent(
  payload: RequisitionPendingApprovalPayload,
  metadata?: { correlationId?: string; userId?: string }
): RequisitionPendingApprovalEvent {
  return createEvent(
    'RequisitionPendingApproval',
    payload.requisitionId,
    'Requisition',
    payload,
    { ...metadata, source: 'TalentSurface' }
  );
}

export function createApplicationSubmittedEvent(
  payload: ApplicationSubmittedPayload,
  metadata?: { correlationId?: string; userId?: string }
): ApplicationSubmittedEvent {
  return createEvent('ApplicationSubmitted', payload.applicationId, 'Application', payload, {
    ...metadata,
    source: 'TalentSurface',
  });
}

export function createApplicationReceivedEvent(
  payload: ApplicationReceivedPayload,
  metadata?: { correlationId?: string; userId?: string }
): ApplicationReceivedEvent {
  return createEvent('ApplicationReceived', payload.applicationId, 'Application', payload, {
    ...metadata,
    source: 'TalentSurface',
  });
}

export function createPerformanceReviewCreatedEvent(
  payload: PerformanceReviewCreatedPayload,
  metadata?: { correlationId?: string; userId?: string }
): PerformanceReviewCreatedEvent {
  return createEvent('PerformanceReviewCreated', payload.reviewId, 'PerformanceReview', payload, {
    ...metadata,
    source: 'TalentSurface',
  });
}

export function createPerformanceReviewSubmittedEvent(
  payload: PerformanceReviewSubmittedPayload,
  metadata?: { correlationId?: string; userId?: string }
): PerformanceReviewSubmittedEvent {
  return createEvent(
    'PerformanceReviewSubmitted',
    payload.reviewId,
    'PerformanceReview',
    payload,
    { ...metadata, source: 'TalentSurface' }
  );
}

// ============================================================================
// Event Streams
// ============================================================================

export const requisitionCreatedStream = new Observable<RequisitionCreatedEvent>();
export const requisitionPendingApprovalStream = new Observable<RequisitionPendingApprovalEvent>();
export const applicationSubmittedStream = new Observable<ApplicationSubmittedEvent>();
export const applicationReceivedStream = new Observable<ApplicationReceivedEvent>();
export const performanceReviewCreatedStream = new Observable<PerformanceReviewCreatedEvent>();
export const performanceReviewSubmittedStream = new Observable<PerformanceReviewSubmittedEvent>();

// ============================================================================
// Talent Surface Definition
// ============================================================================

export interface TalentSurface {
  contracts: {
    CreateRequisition: CreateRequisitionContract;
    SubmitApplication: SubmitApplicationContract;
    EvaluatePerformance: EvaluatePerformanceContract;
  };
  eventStreams: {
    requisitionCreated: Observable<RequisitionCreatedEvent>;
    requisitionPendingApproval: Observable<RequisitionPendingApprovalEvent>;
    applicationSubmitted: Observable<ApplicationSubmittedEvent>;
    applicationReceived: Observable<ApplicationReceivedEvent>;
    performanceReviewCreated: Observable<PerformanceReviewCreatedEvent>;
    performanceReviewSubmitted: Observable<PerformanceReviewSubmittedEvent>;
  };
}

export const talentSurface: TalentSurface = {
  contracts: {
    CreateRequisition: {
      input: {} as CreateRequisitionInput,
      output: {} as CreateRequisitionOutput,
      preconditions: createRequisitionPreconditions,
      postconditions: createRequisitionPostconditions,
      events: {
        RequisitionCreated: {} as RequisitionCreatedEvent,
        RequisitionPendingApproval: {} as RequisitionPendingApprovalEvent,
      },
      errors: CreateRequisitionErrors,
    },
    SubmitApplication: {
      input: {} as SubmitApplicationInput,
      output: {} as SubmitApplicationOutput,
      preconditions: submitApplicationPreconditions,
      postconditions: submitApplicationPostconditions,
      events: {
        ApplicationSubmitted: {} as ApplicationSubmittedEvent,
        ApplicationReceived: {} as ApplicationReceivedEvent,
      },
      errors: SubmitApplicationErrors,
    },
    EvaluatePerformance: {
      input: {} as EvaluatePerformanceInput,
      output: {} as EvaluatePerformanceOutput,
      preconditions: evaluatePerformancePreconditions,
      postconditions: evaluatePerformancePostconditions,
      events: {
        PerformanceReviewCreated: {} as PerformanceReviewCreatedEvent,
        PerformanceReviewSubmitted: {} as PerformanceReviewSubmittedEvent,
      },
      errors: EvaluatePerformanceErrors,
    },
  },
  eventStreams: {
    requisitionCreated: requisitionCreatedStream,
    requisitionPendingApproval: requisitionPendingApprovalStream,
    applicationSubmitted: applicationSubmittedStream,
    applicationReceived: applicationReceivedStream,
    performanceReviewCreated: performanceReviewCreatedStream,
    performanceReviewSubmitted: performanceReviewSubmittedStream,
  },
};
