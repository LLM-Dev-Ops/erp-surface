/**
 * Benefits Surface Contracts
 * Defines typed contracts for benefits enrollment, life events, and eligibility
 */

import {
  EmployeeId,
  BenefitPlanId,
  EnrollmentId,
  Money,
  ISODateString,
  ISODateTimeString,
  DateRange,
  Precondition,
  Postcondition,
} from '../../common/types';
import {
  ValidationError,
  PreconditionError,
  EmployeeNotFoundError,
  BenefitsEnrollmentError,
  NotFoundError,
} from '../../common/errors';
import { DomainEvent, createEvent, Observable } from '../../common/events';

// ============================================================================
// Benefits Domain Types
// ============================================================================

export type BenefitType =
  | 'MEDICAL'
  | 'DENTAL'
  | 'VISION'
  | 'LIFE'
  | 'DISABILITY_SHORT_TERM'
  | 'DISABILITY_LONG_TERM'
  | 'HSA'
  | 'FSA'
  | 'DEPENDENT_CARE_FSA'
  | 'RETIREMENT_401K'
  | 'RETIREMENT_ROTH_401K'
  | 'LEGAL'
  | 'PET'
  | 'COMMUTER'
  | 'WELLNESS';

export type CoverageLevel =
  | 'EMPLOYEE_ONLY'
  | 'EMPLOYEE_SPOUSE'
  | 'EMPLOYEE_CHILDREN'
  | 'FAMILY';

export type EnrollmentStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'WAIVED'
  | 'TERMINATED'
  | 'SUSPENDED';

export type LifeEventType =
  | 'MARRIAGE'
  | 'DIVORCE'
  | 'BIRTH'
  | 'ADOPTION'
  | 'DEATH_OF_DEPENDENT'
  | 'LOSS_OF_COVERAGE'
  | 'GAIN_OF_COVERAGE'
  | 'CHANGE_IN_EMPLOYMENT_STATUS'
  | 'CHANGE_IN_RESIDENCE'
  | 'CHILD_AGING_OUT'
  | 'DISABILITY_STATUS_CHANGE';

export type EligibilityStatus = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING' | 'GRANDFATHERED';

export interface BenefitPlan {
  planId: BenefitPlanId;
  planName: string;
  benefitType: BenefitType;
  carrierId: string;
  carrierName: string;
  planYear: number;
  effectiveDate: ISODateString;
  terminationDate?: ISODateString;
  availableCoverageLevels: CoverageLevel[];
  premiums: PlanPremium[];
  coversPreExisting: boolean;
  waitingPeriodDays: number;
  description: string;
}

export interface PlanPremium {
  coverageLevel: CoverageLevel;
  employeeContribution: Money;
  employerContribution: Money;
  totalPremium: Money;
  payFrequency: string;
}

export interface Enrollment {
  enrollmentId: EnrollmentId;
  employeeId: EmployeeId;
  planId: BenefitPlanId;
  benefitType: BenefitType;
  coverageLevel: CoverageLevel;
  status: EnrollmentStatus;
  effectiveDate: ISODateString;
  terminationDate?: ISODateString;
  dependents: EnrolledDependent[];
  beneficiaries?: Beneficiary[];
  employeeContribution: Money;
  employerContribution: Money;
  electionDate: ISODateTimeString;
}

export interface EnrolledDependent {
  dependentId: string;
  relationship: DependentRelationship;
  firstName: string;
  lastName: string;
  dateOfBirth: ISODateString;
  ssn_last4?: string;
  coveredSince: ISODateString;
}

export type DependentRelationship =
  | 'SPOUSE'
  | 'DOMESTIC_PARTNER'
  | 'CHILD'
  | 'STEPCHILD'
  | 'FOSTER_CHILD'
  | 'DISABLED_DEPENDENT';

export interface Beneficiary {
  beneficiaryId: string;
  name: string;
  relationship: string;
  percentage: number;
  type: 'PRIMARY' | 'CONTINGENT';
  address?: string;
}

export interface LifeEvent {
  eventId: string;
  employeeId: EmployeeId;
  eventType: LifeEventType;
  eventDate: ISODateString;
  reportedDate: ISODateString;
  documentationRequired: boolean;
  documentationReceived: boolean;
  enrollmentWindowStart: ISODateString;
  enrollmentWindowEnd: ISODateString;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';
  allowedChanges: BenefitType[];
}

// ============================================================================
// Enroll Benefits Contract
// ============================================================================

export interface EnrollBenefitsInput {
  employee_id: EmployeeId;
  plan_id: BenefitPlanId;
  coverage_level: CoverageLevel;
  effective_date: ISODateString;
  dependents?: DependentEnrollment[];
  beneficiaries?: BeneficiaryDesignation[];
  acknowledge_terms: boolean;
  election_reason: 'NEW_HIRE' | 'OPEN_ENROLLMENT' | 'LIFE_EVENT' | 'STATUS_CHANGE';
  life_event_id?: string;
}

export interface DependentEnrollment {
  first_name: string;
  last_name: string;
  relationship: DependentRelationship;
  date_of_birth: ISODateString;
  ssn_last4?: string;
  verification_document_id?: string;
}

export interface BeneficiaryDesignation {
  name: string;
  relationship: string;
  percentage: number;
  type: 'PRIMARY' | 'CONTINGENT';
}

export interface EnrollBenefitsOutput {
  enrollment_id: EnrollmentId;
  plan_id: BenefitPlanId;
  coverage_level: CoverageLevel;
  status: EnrollmentStatus;
  effective_date: ISODateString;
  employee_contribution: Money;
  employer_contribution: Money;
  enrolled_dependents: number;
  confirmation_number: string;
  requires_documentation: boolean;
  documentation_deadline?: ISODateString;
}

export interface EnrollBenefitsContract {
  input: EnrollBenefitsInput;
  output: EnrollBenefitsOutput;
  preconditions: Precondition<EnrollBenefitsInput>[];
  postconditions: Postcondition<EnrollBenefitsInput, EnrollBenefitsOutput>[];
  events: {
    BenefitsEnrollmentInitiated: BenefitsEnrollmentInitiatedEvent;
    BenefitsEnrollmentCompleted: BenefitsEnrollmentCompletedEvent;
    DependentsCovered: DependentsCoveredEvent;
  };
  errors: typeof EnrollBenefitsErrors;
}

export class BenefitPlanNotFoundError extends NotFoundError {
  constructor(planId: string, correlationId?: string) {
    super('BenefitPlan', planId, correlationId);
    this.code = 'BENEFIT_PLAN_NOT_FOUND';
  }
}

export const EnrollBenefitsErrors = {
  EmployeeNotFound: EmployeeNotFoundError,
  BenefitPlanNotFound: BenefitPlanNotFoundError,
  BenefitsEnrollmentError: BenefitsEnrollmentError,
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
} as const;

export const enrollBenefitsPreconditions: Precondition<EnrollBenefitsInput>[] = [
  {
    name: 'ValidEmployeeId',
    description: 'Employee ID must be provided',
    check: (input) => !!input.employee_id && input.employee_id.length > 0,
  },
  {
    name: 'ValidPlanId',
    description: 'Plan ID must be provided',
    check: (input) => !!input.plan_id && input.plan_id.length > 0,
  },
  {
    name: 'ValidCoverageLevel',
    description: 'Coverage level must be valid',
    check: (input) => !!input.coverage_level,
  },
  {
    name: 'ValidEffectiveDate',
    description: 'Effective date must be a valid date',
    check: (input) => {
      const date = new Date(input.effective_date);
      return !isNaN(date.getTime());
    },
  },
  {
    name: 'TermsAcknowledged',
    description: 'Terms must be acknowledged',
    check: (input) => input.acknowledge_terms === true,
  },
  {
    name: 'ValidElectionReason',
    description: 'Election reason must be valid',
    check: (input) => !!input.election_reason,
  },
  {
    name: 'LifeEventProvidedWhenRequired',
    description: 'Life event ID required when election reason is LIFE_EVENT',
    check: (input) =>
      input.election_reason !== 'LIFE_EVENT' ||
      (!!input.life_event_id && input.life_event_id.length > 0),
  },
  {
    name: 'ValidBeneficiaryPercentages',
    description: 'Beneficiary percentages must total 100% per type',
    check: (input) => {
      if (!input.beneficiaries || input.beneficiaries.length === 0) return true;
      const primaryTotal = input.beneficiaries
        .filter((b) => b.type === 'PRIMARY')
        .reduce((sum, b) => sum + b.percentage, 0);
      const contingentTotal = input.beneficiaries
        .filter((b) => b.type === 'CONTINGENT')
        .reduce((sum, b) => sum + b.percentage, 0);
      return (
        (primaryTotal === 0 || primaryTotal === 100) &&
        (contingentTotal === 0 || contingentTotal === 100)
      );
    },
  },
];

export const enrollBenefitsPostconditions: Postcondition<
  EnrollBenefitsInput,
  EnrollBenefitsOutput
>[] = [
  {
    name: 'EnrollmentIdGenerated',
    description: 'A unique enrollment ID must be generated',
    check: (_, output) => !!output.enrollment_id && output.enrollment_id.length > 0,
  },
  {
    name: 'PlanIdMatches',
    description: 'Plan ID must match input',
    check: (input, output) => output.plan_id === input.plan_id,
  },
  {
    name: 'CoverageLevelMatches',
    description: 'Coverage level must match input',
    check: (input, output) => output.coverage_level === input.coverage_level,
  },
  {
    name: 'ContributionsCalculated',
    description: 'Employee and employer contributions must be calculated',
    check: (_, output) =>
      output.employee_contribution.amount >= 0 &&
      output.employer_contribution.amount >= 0,
  },
  {
    name: 'ConfirmationNumberGenerated',
    description: 'Confirmation number must be generated',
    check: (_, output) => !!output.confirmation_number,
  },
];

// ============================================================================
// Process Life Event Contract
// ============================================================================

export interface ProcessLifeEventInput {
  employee_id: EmployeeId;
  event_type: LifeEventType;
  event_date: ISODateString;
  documentation_ids?: string[];
  affected_dependents?: AffectedDependent[];
  description?: string;
}

export interface AffectedDependent {
  dependent_id?: string;
  action: 'ADD' | 'REMOVE' | 'UPDATE';
  first_name: string;
  last_name: string;
  relationship: DependentRelationship;
  date_of_birth: ISODateString;
}

export interface ProcessLifeEventOutput {
  event_id: string;
  employee_id: EmployeeId;
  event_type: LifeEventType;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  enrollment_window_start: ISODateString;
  enrollment_window_end: ISODateString;
  allowed_changes: BenefitType[];
  documentation_required: boolean;
  documentation_deadline?: ISODateString;
  current_enrollments_affected: EnrollmentId[];
  processed_at: ISODateTimeString;
}

export interface ProcessLifeEventContract {
  input: ProcessLifeEventInput;
  output: ProcessLifeEventOutput;
  preconditions: Precondition<ProcessLifeEventInput>[];
  postconditions: Postcondition<ProcessLifeEventInput, ProcessLifeEventOutput>[];
  events: {
    LifeEventReported: LifeEventReportedEvent;
    LifeEventProcessed: LifeEventProcessedEvent;
    EnrollmentWindowOpened: EnrollmentWindowOpenedEvent;
  };
  errors: typeof ProcessLifeEventErrors;
}

export const ProcessLifeEventErrors = {
  EmployeeNotFound: EmployeeNotFoundError,
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
} as const;

export const processLifeEventPreconditions: Precondition<ProcessLifeEventInput>[] = [
  {
    name: 'ValidEmployeeId',
    description: 'Employee ID must be provided',
    check: (input) => !!input.employee_id && input.employee_id.length > 0,
  },
  {
    name: 'ValidEventType',
    description: 'Event type must be valid',
    check: (input) => !!input.event_type,
  },
  {
    name: 'ValidEventDate',
    description: 'Event date must be a valid date',
    check: (input) => {
      const date = new Date(input.event_date);
      return !isNaN(date.getTime());
    },
  },
  {
    name: 'EventDateNotInFarFuture',
    description: 'Event date must not be more than 30 days in the future',
    check: (input) => {
      const eventDate = new Date(input.event_date);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return eventDate <= thirtyDaysFromNow;
    },
  },
  {
    name: 'EventDateNotInFarPast',
    description: 'Event date must not be more than 60 days in the past',
    check: (input) => {
      const eventDate = new Date(input.event_date);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      return eventDate >= sixtyDaysAgo;
    },
  },
];

export const processLifeEventPostconditions: Postcondition<
  ProcessLifeEventInput,
  ProcessLifeEventOutput
>[] = [
  {
    name: 'EventIdGenerated',
    description: 'A unique event ID must be generated',
    check: (_, output) => !!output.event_id && output.event_id.length > 0,
  },
  {
    name: 'EmployeeIdMatches',
    description: 'Employee ID must match input',
    check: (input, output) => output.employee_id === input.employee_id,
  },
  {
    name: 'EventTypeMatches',
    description: 'Event type must match input',
    check: (input, output) => output.event_type === input.event_type,
  },
  {
    name: 'EnrollmentWindowDefined',
    description: 'Enrollment window must be defined',
    check: (_, output) =>
      !!output.enrollment_window_start && !!output.enrollment_window_end,
  },
  {
    name: 'AllowedChangesSpecified',
    description: 'Allowed benefit changes must be specified',
    check: (_, output) => Array.isArray(output.allowed_changes),
  },
];

// ============================================================================
// Calculate Eligibility Contract
// ============================================================================

export interface CalculateEligibilityInput {
  employee_id: EmployeeId;
  benefit_types?: BenefitType[];
  as_of_date?: ISODateString;
  include_future_eligibility?: boolean;
}

export interface CalculateEligibilityOutput {
  employee_id: EmployeeId;
  as_of_date: ISODateString;
  eligibility_results: EligibilityResult[];
  overall_benefits_eligible: boolean;
  waiting_period_end_date?: ISODateString;
  open_enrollment_window?: DateRange;
  life_event_window?: DateRange;
}

export interface EligibilityResult {
  benefit_type: BenefitType;
  status: EligibilityStatus;
  eligible_date?: ISODateString;
  ineligible_reason?: string;
  available_plans: AvailablePlan[];
  current_enrollment?: EnrollmentId;
  can_enroll: boolean;
  can_change: boolean;
  can_waive: boolean;
}

export interface AvailablePlan {
  plan_id: BenefitPlanId;
  plan_name: string;
  available_coverage_levels: CoverageLevel[];
  premiums: PlanPremium[];
}

export interface CalculateEligibilityContract {
  input: CalculateEligibilityInput;
  output: CalculateEligibilityOutput;
  preconditions: Precondition<CalculateEligibilityInput>[];
  postconditions: Postcondition<CalculateEligibilityInput, CalculateEligibilityOutput>[];
  events: {
    EligibilityCalculated: EligibilityCalculatedEvent;
  };
  errors: typeof CalculateEligibilityErrors;
}

export const CalculateEligibilityErrors = {
  EmployeeNotFound: EmployeeNotFoundError,
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
} as const;

export const calculateEligibilityPreconditions: Precondition<CalculateEligibilityInput>[] = [
  {
    name: 'ValidEmployeeId',
    description: 'Employee ID must be provided',
    check: (input) => !!input.employee_id && input.employee_id.length > 0,
  },
  {
    name: 'ValidAsOfDate',
    description: 'As of date must be a valid date if provided',
    check: (input) => {
      if (!input.as_of_date) return true;
      const date = new Date(input.as_of_date);
      return !isNaN(date.getTime());
    },
  },
];

export const calculateEligibilityPostconditions: Postcondition<
  CalculateEligibilityInput,
  CalculateEligibilityOutput
>[] = [
  {
    name: 'EmployeeIdMatches',
    description: 'Employee ID must match input',
    check: (input, output) => output.employee_id === input.employee_id,
  },
  {
    name: 'AsOfDateSet',
    description: 'As of date must be set',
    check: (_, output) => !!output.as_of_date,
  },
  {
    name: 'EligibilityResultsProvided',
    description: 'Eligibility results must be provided',
    check: (_, output) => Array.isArray(output.eligibility_results),
  },
  {
    name: 'OverallEligibilityDetermined',
    description: 'Overall eligibility must be determined',
    check: (_, output) => typeof output.overall_benefits_eligible === 'boolean',
  },
];

// ============================================================================
// Benefits Events
// ============================================================================

export interface BenefitsEnrollmentInitiatedPayload {
  enrollmentId: EnrollmentId;
  employeeId: EmployeeId;
  planId: BenefitPlanId;
  coverageLevel: CoverageLevel;
  effectiveDate: ISODateString;
  electionReason: string;
}

export type BenefitsEnrollmentInitiatedEvent = DomainEvent<BenefitsEnrollmentInitiatedPayload>;

export interface BenefitsEnrollmentCompletedPayload {
  enrollmentId: EnrollmentId;
  employeeId: EmployeeId;
  planId: BenefitPlanId;
  coverageLevel: CoverageLevel;
  effectiveDate: ISODateString;
  employeeContribution: Money;
  employerContribution: Money;
  confirmationNumber: string;
  completedAt: ISODateTimeString;
}

export type BenefitsEnrollmentCompletedEvent = DomainEvent<BenefitsEnrollmentCompletedPayload>;

export interface DependentsCoveredPayload {
  enrollmentId: EnrollmentId;
  employeeId: EmployeeId;
  dependents: EnrolledDependent[];
  effectiveDate: ISODateString;
}

export type DependentsCoveredEvent = DomainEvent<DependentsCoveredPayload>;

export interface LifeEventReportedPayload {
  eventId: string;
  employeeId: EmployeeId;
  eventType: LifeEventType;
  eventDate: ISODateString;
  reportedAt: ISODateTimeString;
}

export type LifeEventReportedEvent = DomainEvent<LifeEventReportedPayload>;

export interface LifeEventProcessedPayload {
  eventId: string;
  employeeId: EmployeeId;
  eventType: LifeEventType;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  processedAt: ISODateTimeString;
}

export type LifeEventProcessedEvent = DomainEvent<LifeEventProcessedPayload>;

export interface EnrollmentWindowOpenedPayload {
  employeeId: EmployeeId;
  windowType: 'NEW_HIRE' | 'OPEN_ENROLLMENT' | 'LIFE_EVENT';
  startDate: ISODateString;
  endDate: ISODateString;
  allowedBenefitTypes: BenefitType[];
  triggeredBy?: string;
}

export type EnrollmentWindowOpenedEvent = DomainEvent<EnrollmentWindowOpenedPayload>;

export interface EligibilityCalculatedPayload {
  employeeId: EmployeeId;
  asOfDate: ISODateString;
  overallEligible: boolean;
  eligibleBenefitTypes: BenefitType[];
  calculatedAt: ISODateTimeString;
}

export type EligibilityCalculatedEvent = DomainEvent<EligibilityCalculatedPayload>;

// ============================================================================
// Event Factories
// ============================================================================

export function createBenefitsEnrollmentInitiatedEvent(
  payload: BenefitsEnrollmentInitiatedPayload,
  metadata?: { correlationId?: string; userId?: string }
): BenefitsEnrollmentInitiatedEvent {
  return createEvent(
    'BenefitsEnrollmentInitiated',
    payload.enrollmentId,
    'Enrollment',
    payload,
    { ...metadata, source: 'BenefitsSurface' }
  );
}

export function createBenefitsEnrollmentCompletedEvent(
  payload: BenefitsEnrollmentCompletedPayload,
  metadata?: { correlationId?: string; userId?: string }
): BenefitsEnrollmentCompletedEvent {
  return createEvent(
    'BenefitsEnrollmentCompleted',
    payload.enrollmentId,
    'Enrollment',
    payload,
    { ...metadata, source: 'BenefitsSurface' }
  );
}

export function createDependentsCoveredEvent(
  payload: DependentsCoveredPayload,
  metadata?: { correlationId?: string; userId?: string }
): DependentsCoveredEvent {
  return createEvent('DependentsCovered', payload.enrollmentId, 'Enrollment', payload, {
    ...metadata,
    source: 'BenefitsSurface',
  });
}

export function createLifeEventReportedEvent(
  payload: LifeEventReportedPayload,
  metadata?: { correlationId?: string; userId?: string }
): LifeEventReportedEvent {
  return createEvent('LifeEventReported', payload.eventId, 'LifeEvent', payload, {
    ...metadata,
    source: 'BenefitsSurface',
  });
}

export function createLifeEventProcessedEvent(
  payload: LifeEventProcessedPayload,
  metadata?: { correlationId?: string; userId?: string }
): LifeEventProcessedEvent {
  return createEvent('LifeEventProcessed', payload.eventId, 'LifeEvent', payload, {
    ...metadata,
    source: 'BenefitsSurface',
  });
}

export function createEnrollmentWindowOpenedEvent(
  payload: EnrollmentWindowOpenedPayload,
  metadata?: { correlationId?: string; userId?: string }
): EnrollmentWindowOpenedEvent {
  return createEvent(
    'EnrollmentWindowOpened',
    payload.employeeId,
    'EnrollmentWindow',
    payload,
    { ...metadata, source: 'BenefitsSurface' }
  );
}

export function createEligibilityCalculatedEvent(
  payload: EligibilityCalculatedPayload,
  metadata?: { correlationId?: string; userId?: string }
): EligibilityCalculatedEvent {
  return createEvent(
    'EligibilityCalculated',
    payload.employeeId,
    'Eligibility',
    payload,
    { ...metadata, source: 'BenefitsSurface' }
  );
}

// ============================================================================
// Event Streams
// ============================================================================

export const benefitsEnrollmentInitiatedStream =
  new Observable<BenefitsEnrollmentInitiatedEvent>();
export const benefitsEnrollmentCompletedStream =
  new Observable<BenefitsEnrollmentCompletedEvent>();
export const dependentsCoveredStream = new Observable<DependentsCoveredEvent>();
export const lifeEventReportedStream = new Observable<LifeEventReportedEvent>();
export const lifeEventProcessedStream = new Observable<LifeEventProcessedEvent>();
export const enrollmentWindowOpenedStream = new Observable<EnrollmentWindowOpenedEvent>();
export const eligibilityCalculatedStream = new Observable<EligibilityCalculatedEvent>();

// ============================================================================
// Benefits Surface Definition
// ============================================================================

export interface BenefitsSurface {
  contracts: {
    EnrollBenefits: EnrollBenefitsContract;
    ProcessLifeEvent: ProcessLifeEventContract;
    CalculateEligibility: CalculateEligibilityContract;
  };
  eventStreams: {
    benefitsEnrollmentInitiated: Observable<BenefitsEnrollmentInitiatedEvent>;
    benefitsEnrollmentCompleted: Observable<BenefitsEnrollmentCompletedEvent>;
    dependentsCovered: Observable<DependentsCoveredEvent>;
    lifeEventReported: Observable<LifeEventReportedEvent>;
    lifeEventProcessed: Observable<LifeEventProcessedEvent>;
    enrollmentWindowOpened: Observable<EnrollmentWindowOpenedEvent>;
    eligibilityCalculated: Observable<EligibilityCalculatedEvent>;
  };
}

export const benefitsSurface: BenefitsSurface = {
  contracts: {
    EnrollBenefits: {
      input: {} as EnrollBenefitsInput,
      output: {} as EnrollBenefitsOutput,
      preconditions: enrollBenefitsPreconditions,
      postconditions: enrollBenefitsPostconditions,
      events: {
        BenefitsEnrollmentInitiated: {} as BenefitsEnrollmentInitiatedEvent,
        BenefitsEnrollmentCompleted: {} as BenefitsEnrollmentCompletedEvent,
        DependentsCovered: {} as DependentsCoveredEvent,
      },
      errors: EnrollBenefitsErrors,
    },
    ProcessLifeEvent: {
      input: {} as ProcessLifeEventInput,
      output: {} as ProcessLifeEventOutput,
      preconditions: processLifeEventPreconditions,
      postconditions: processLifeEventPostconditions,
      events: {
        LifeEventReported: {} as LifeEventReportedEvent,
        LifeEventProcessed: {} as LifeEventProcessedEvent,
        EnrollmentWindowOpened: {} as EnrollmentWindowOpenedEvent,
      },
      errors: ProcessLifeEventErrors,
    },
    CalculateEligibility: {
      input: {} as CalculateEligibilityInput,
      output: {} as CalculateEligibilityOutput,
      preconditions: calculateEligibilityPreconditions,
      postconditions: calculateEligibilityPostconditions,
      events: {
        EligibilityCalculated: {} as EligibilityCalculatedEvent,
      },
      errors: CalculateEligibilityErrors,
    },
  },
  eventStreams: {
    benefitsEnrollmentInitiated: benefitsEnrollmentInitiatedStream,
    benefitsEnrollmentCompleted: benefitsEnrollmentCompletedStream,
    dependentsCovered: dependentsCoveredStream,
    lifeEventReported: lifeEventReportedStream,
    lifeEventProcessed: lifeEventProcessedStream,
    enrollmentWindowOpened: enrollmentWindowOpenedStream,
    eligibilityCalculated: eligibilityCalculatedStream,
  },
};
