/**
 * Time Surface Contracts
 * Defines typed contracts for time entry, timesheet approval, and absence management
 */

import {
  EmployeeId,
  TimesheetId,
  Money,
  ISODateString,
  ISODateTimeString,
  DateRange,
  TimeRange,
  Precondition,
  Postcondition,
  ApprovalStatus,
} from '../../common/types';
import {
  ValidationError,
  PreconditionError,
  EmployeeNotFoundError,
  TimesheetApprovalError,
} from '../../common/errors';
import { DomainEvent, createEvent, Observable } from '../../common/events';

// ============================================================================
// Time Domain Types
// ============================================================================

export type TimeEntryStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type TimeEntryType =
  | 'REGULAR'
  | 'OVERTIME'
  | 'DOUBLE_TIME'
  | 'ON_CALL'
  | 'TRAINING'
  | 'TRAVEL'
  | 'BREAK';

export type AbsenceType =
  | 'PTO'
  | 'SICK'
  | 'PERSONAL'
  | 'BEREAVEMENT'
  | 'JURY_DUTY'
  | 'MILITARY'
  | 'UNPAID'
  | 'HOLIDAY'
  | 'PARENTAL'
  | 'MEDICAL_LEAVE';

export type TimesheetStatus = 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PROCESSED';

export interface TimeEntry {
  entryId: string;
  employeeId: EmployeeId;
  date: ISODateString;
  startTime: ISODateTimeString;
  endTime: ISODateTimeString;
  breakMinutes: number;
  entryType: TimeEntryType;
  projectCode?: string;
  taskCode?: string;
  costCenter?: string;
  notes?: string;
  status: TimeEntryStatus;
  hours: number;
}

export interface Timesheet {
  timesheetId: TimesheetId;
  employeeId: EmployeeId;
  period: DateRange;
  entries: TimeEntry[];
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  status: TimesheetStatus;
  submittedAt?: ISODateTimeString;
  approvedBy?: EmployeeId;
  approvedAt?: ISODateTimeString;
}

export interface AbsenceBalance {
  absenceType: AbsenceType;
  availableHours: number;
  usedHours: number;
  pendingHours: number;
  accrualRate: number;
  maxCarryover: number;
}

// ============================================================================
// Record Time Entry Contract
// ============================================================================

export interface RecordTimeEntryInput {
  employee_id: EmployeeId;
  date: ISODateString;
  start_time: ISODateTimeString;
  end_time: ISODateTimeString;
  break_minutes?: number;
  entry_type: TimeEntryType;
  project_code?: string;
  task_code?: string;
  cost_center?: string;
  notes?: string;
}

export interface RecordTimeEntryOutput {
  entry_id: string;
  employee_id: EmployeeId;
  date: ISODateString;
  hours_worked: number;
  entry_type: TimeEntryType;
  status: TimeEntryStatus;
  timesheet_id: TimesheetId;
  created_at: ISODateTimeString;
}

export interface RecordTimeEntryContract {
  input: RecordTimeEntryInput;
  output: RecordTimeEntryOutput;
  preconditions: Precondition<RecordTimeEntryInput>[];
  postconditions: Postcondition<RecordTimeEntryInput, RecordTimeEntryOutput>[];
  events: {
    TimeEntryRecorded: TimeEntryRecordedEvent;
    TimesheetUpdated: TimesheetUpdatedEvent;
  };
  errors: typeof RecordTimeEntryErrors;
}

export const RecordTimeEntryErrors = {
  EmployeeNotFound: EmployeeNotFoundError,
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
} as const;

export const recordTimeEntryPreconditions: Precondition<RecordTimeEntryInput>[] = [
  {
    name: 'ValidEmployeeId',
    description: 'Employee ID must be provided',
    check: (input) => !!input.employee_id && input.employee_id.length > 0,
  },
  {
    name: 'ValidDate',
    description: 'Date must be a valid date string',
    check: (input) => {
      const date = new Date(input.date);
      return !isNaN(date.getTime());
    },
  },
  {
    name: 'ValidTimeRange',
    description: 'End time must be after start time',
    check: (input) => new Date(input.end_time) > new Date(input.start_time),
  },
  {
    name: 'ValidBreakMinutes',
    description: 'Break minutes must be non-negative if provided',
    check: (input) => input.break_minutes === undefined || input.break_minutes >= 0,
  },
  {
    name: 'ValidEntryType',
    description: 'Entry type must be valid',
    check: (input) => !!input.entry_type,
  },
  {
    name: 'ReasonableHours',
    description: 'Work hours must be reasonable (less than 24 hours)',
    check: (input) => {
      const start = new Date(input.start_time).getTime();
      const end = new Date(input.end_time).getTime();
      const hours = (end - start) / (1000 * 60 * 60);
      return hours > 0 && hours <= 24;
    },
  },
];

export const recordTimeEntryPostconditions: Postcondition<
  RecordTimeEntryInput,
  RecordTimeEntryOutput
>[] = [
  {
    name: 'EntryIdGenerated',
    description: 'A unique entry ID must be generated',
    check: (_, output) => !!output.entry_id && output.entry_id.length > 0,
  },
  {
    name: 'HoursCalculated',
    description: 'Hours worked must be calculated correctly',
    check: (_, output) => output.hours_worked > 0,
  },
  {
    name: 'TimesheetAssigned',
    description: 'Entry must be assigned to a timesheet',
    check: (_, output) => !!output.timesheet_id,
  },
  {
    name: 'StatusIsDraft',
    description: 'New entries should be in DRAFT status',
    check: (_, output) => output.status === 'DRAFT',
  },
];

// ============================================================================
// Approve Timesheet Contract
// ============================================================================

export interface ApproveTimesheetInput {
  timesheet_id: TimesheetId;
  approver_id: EmployeeId;
  approval_action: 'APPROVE' | 'REJECT';
  comments?: string;
  line_item_adjustments?: LineItemAdjustment[];
}

export interface LineItemAdjustment {
  entryId: string;
  adjustedHours?: number;
  adjustedType?: TimeEntryType;
  reason: string;
}

export interface ApproveTimesheetOutput {
  timesheet_id: TimesheetId;
  employee_id: EmployeeId;
  status: TimesheetStatus;
  approved_by: EmployeeId;
  approved_at: ISODateTimeString;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  adjustments_applied: number;
  ready_for_payroll: boolean;
}

export interface ApproveTimesheetContract {
  input: ApproveTimesheetInput;
  output: ApproveTimesheetOutput;
  preconditions: Precondition<ApproveTimesheetInput>[];
  postconditions: Postcondition<ApproveTimesheetInput, ApproveTimesheetOutput>[];
  events: {
    TimesheetApproved: TimesheetApprovedEvent;
    TimesheetRejected: TimesheetRejectedEvent;
    TimesheetReadyForPayroll: TimesheetReadyForPayrollEvent;
  };
  errors: typeof ApproveTimesheetErrors;
}

export const ApproveTimesheetErrors = {
  EmployeeNotFound: EmployeeNotFoundError,
  TimesheetApprovalError: TimesheetApprovalError,
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
} as const;

export const approveTimesheetPreconditions: Precondition<ApproveTimesheetInput>[] = [
  {
    name: 'ValidTimesheetId',
    description: 'Timesheet ID must be provided',
    check: (input) => !!input.timesheet_id && input.timesheet_id.length > 0,
  },
  {
    name: 'ValidApproverId',
    description: 'Approver ID must be provided',
    check: (input) => !!input.approver_id && input.approver_id.length > 0,
  },
  {
    name: 'ValidApprovalAction',
    description: 'Approval action must be APPROVE or REJECT',
    check: (input) =>
      input.approval_action === 'APPROVE' || input.approval_action === 'REJECT',
  },
  {
    name: 'RejectionHasComments',
    description: 'Rejection must include comments',
    check: (input) =>
      input.approval_action !== 'REJECT' ||
      (!!input.comments && input.comments.length > 0),
  },
];

export const approveTimesheetPostconditions: Postcondition<
  ApproveTimesheetInput,
  ApproveTimesheetOutput
>[] = [
  {
    name: 'StatusUpdated',
    description: 'Timesheet status must reflect approval action',
    check: (input, output) =>
      (input.approval_action === 'APPROVE' && output.status === 'APPROVED') ||
      (input.approval_action === 'REJECT' && output.status === 'REJECTED'),
  },
  {
    name: 'ApproverRecorded',
    description: 'Approver must be recorded',
    check: (input, output) => output.approved_by === input.approver_id,
  },
  {
    name: 'HoursCalculated',
    description: 'Hours must be calculated',
    check: (_, output) =>
      output.total_hours >= 0 &&
      output.regular_hours >= 0 &&
      output.overtime_hours >= 0,
  },
  {
    name: 'PayrollReadinessSet',
    description: 'Payroll readiness must be determined',
    check: (input, output) =>
      (input.approval_action === 'APPROVE' && output.ready_for_payroll === true) ||
      (input.approval_action === 'REJECT' && output.ready_for_payroll === false),
  },
];

// ============================================================================
// Record Absence Contract
// ============================================================================

export interface RecordAbsenceInput {
  employee_id: EmployeeId;
  absence_type: AbsenceType;
  start_date: ISODateString;
  end_date: ISODateString;
  hours_per_day?: number;
  reason?: string;
  documentation_attached?: boolean;
}

export interface RecordAbsenceOutput {
  absence_id: string;
  employee_id: EmployeeId;
  absence_type: AbsenceType;
  start_date: ISODateString;
  end_date: ISODateString;
  total_hours: number;
  status: ApprovalStatus;
  balance_after: AbsenceBalance;
  requires_approval: boolean;
  created_at: ISODateTimeString;
}

export interface RecordAbsenceContract {
  input: RecordAbsenceInput;
  output: RecordAbsenceOutput;
  preconditions: Precondition<RecordAbsenceInput>[];
  postconditions: Postcondition<RecordAbsenceInput, RecordAbsenceOutput>[];
  events: {
    AbsenceRecorded: AbsenceRecordedEvent;
    AbsenceBalanceUpdated: AbsenceBalanceUpdatedEvent;
  };
  errors: typeof RecordAbsenceErrors;
}

export const RecordAbsenceErrors = {
  EmployeeNotFound: EmployeeNotFoundError,
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
} as const;

export const recordAbsencePreconditions: Precondition<RecordAbsenceInput>[] = [
  {
    name: 'ValidEmployeeId',
    description: 'Employee ID must be provided',
    check: (input) => !!input.employee_id && input.employee_id.length > 0,
  },
  {
    name: 'ValidAbsenceType',
    description: 'Absence type must be valid',
    check: (input) => !!input.absence_type,
  },
  {
    name: 'ValidDateRange',
    description: 'End date must be on or after start date',
    check: (input) => new Date(input.end_date) >= new Date(input.start_date),
  },
  {
    name: 'ValidHoursPerDay',
    description: 'Hours per day must be positive if provided',
    check: (input) =>
      input.hours_per_day === undefined ||
      (input.hours_per_day > 0 && input.hours_per_day <= 24),
  },
  {
    name: 'FutureOrCurrentDate',
    description: 'Absence must not be in the distant past',
    check: (input) => {
      const startDate = new Date(input.start_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return startDate >= thirtyDaysAgo;
    },
  },
];

export const recordAbsencePostconditions: Postcondition<
  RecordAbsenceInput,
  RecordAbsenceOutput
>[] = [
  {
    name: 'AbsenceIdGenerated',
    description: 'A unique absence ID must be generated',
    check: (_, output) => !!output.absence_id && output.absence_id.length > 0,
  },
  {
    name: 'TotalHoursCalculated',
    description: 'Total hours must be calculated',
    check: (_, output) => output.total_hours > 0,
  },
  {
    name: 'BalanceUpdated',
    description: 'Absence balance must be returned',
    check: (_, output) => !!output.balance_after,
  },
  {
    name: 'ApprovalStatusSet',
    description: 'Approval status must be determined',
    check: (_, output) => !!output.status,
  },
];

// ============================================================================
// Time Events
// ============================================================================

export interface TimeEntryRecordedPayload {
  entryId: string;
  employeeId: EmployeeId;
  date: ISODateString;
  hoursWorked: number;
  entryType: TimeEntryType;
  timesheetId: TimesheetId;
}

export type TimeEntryRecordedEvent = DomainEvent<TimeEntryRecordedPayload>;

export interface TimesheetUpdatedPayload {
  timesheetId: TimesheetId;
  employeeId: EmployeeId;
  totalHours: number;
  entryCount: number;
  lastUpdatedAt: ISODateTimeString;
}

export type TimesheetUpdatedEvent = DomainEvent<TimesheetUpdatedPayload>;

export interface TimesheetApprovedPayload {
  timesheetId: TimesheetId;
  employeeId: EmployeeId;
  approvedBy: EmployeeId;
  approvedAt: ISODateTimeString;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
}

export type TimesheetApprovedEvent = DomainEvent<TimesheetApprovedPayload>;

export interface TimesheetRejectedPayload {
  timesheetId: TimesheetId;
  employeeId: EmployeeId;
  rejectedBy: EmployeeId;
  rejectedAt: ISODateTimeString;
  reason: string;
}

export type TimesheetRejectedEvent = DomainEvent<TimesheetRejectedPayload>;

export interface TimesheetReadyForPayrollPayload {
  timesheetId: TimesheetId;
  employeeId: EmployeeId;
  period: DateRange;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
}

export type TimesheetReadyForPayrollEvent = DomainEvent<TimesheetReadyForPayrollPayload>;

export interface AbsenceRecordedPayload {
  absenceId: string;
  employeeId: EmployeeId;
  absenceType: AbsenceType;
  startDate: ISODateString;
  endDate: ISODateString;
  totalHours: number;
  status: ApprovalStatus;
}

export type AbsenceRecordedEvent = DomainEvent<AbsenceRecordedPayload>;

export interface AbsenceBalanceUpdatedPayload {
  employeeId: EmployeeId;
  absenceType: AbsenceType;
  previousBalance: number;
  newBalance: number;
  changeReason: string;
}

export type AbsenceBalanceUpdatedEvent = DomainEvent<AbsenceBalanceUpdatedPayload>;

// ============================================================================
// Event Factories
// ============================================================================

export function createTimeEntryRecordedEvent(
  payload: TimeEntryRecordedPayload,
  metadata?: { correlationId?: string; userId?: string }
): TimeEntryRecordedEvent {
  return createEvent('TimeEntryRecorded', payload.entryId, 'TimeEntry', payload, {
    ...metadata,
    source: 'TimeSurface',
  });
}

export function createTimesheetUpdatedEvent(
  payload: TimesheetUpdatedPayload,
  metadata?: { correlationId?: string; userId?: string }
): TimesheetUpdatedEvent {
  return createEvent('TimesheetUpdated', payload.timesheetId, 'Timesheet', payload, {
    ...metadata,
    source: 'TimeSurface',
  });
}

export function createTimesheetApprovedEvent(
  payload: TimesheetApprovedPayload,
  metadata?: { correlationId?: string; userId?: string }
): TimesheetApprovedEvent {
  return createEvent('TimesheetApproved', payload.timesheetId, 'Timesheet', payload, {
    ...metadata,
    source: 'TimeSurface',
  });
}

export function createTimesheetRejectedEvent(
  payload: TimesheetRejectedPayload,
  metadata?: { correlationId?: string; userId?: string }
): TimesheetRejectedEvent {
  return createEvent('TimesheetRejected', payload.timesheetId, 'Timesheet', payload, {
    ...metadata,
    source: 'TimeSurface',
  });
}

export function createTimesheetReadyForPayrollEvent(
  payload: TimesheetReadyForPayrollPayload,
  metadata?: { correlationId?: string; userId?: string }
): TimesheetReadyForPayrollEvent {
  return createEvent(
    'TimesheetReadyForPayroll',
    payload.timesheetId,
    'Timesheet',
    payload,
    { ...metadata, source: 'TimeSurface' }
  );
}

export function createAbsenceRecordedEvent(
  payload: AbsenceRecordedPayload,
  metadata?: { correlationId?: string; userId?: string }
): AbsenceRecordedEvent {
  return createEvent('AbsenceRecorded', payload.absenceId, 'Absence', payload, {
    ...metadata,
    source: 'TimeSurface',
  });
}

export function createAbsenceBalanceUpdatedEvent(
  payload: AbsenceBalanceUpdatedPayload,
  metadata?: { correlationId?: string; userId?: string }
): AbsenceBalanceUpdatedEvent {
  return createEvent(
    'AbsenceBalanceUpdated',
    payload.employeeId,
    'AbsenceBalance',
    payload,
    { ...metadata, source: 'TimeSurface' }
  );
}

// ============================================================================
// Event Streams
// ============================================================================

export const timeEntryRecordedStream = new Observable<TimeEntryRecordedEvent>();
export const timesheetUpdatedStream = new Observable<TimesheetUpdatedEvent>();
export const timesheetApprovedStream = new Observable<TimesheetApprovedEvent>();
export const timesheetRejectedStream = new Observable<TimesheetRejectedEvent>();
export const timesheetReadyForPayrollStream = new Observable<TimesheetReadyForPayrollEvent>();
export const absenceRecordedStream = new Observable<AbsenceRecordedEvent>();
export const absenceBalanceUpdatedStream = new Observable<AbsenceBalanceUpdatedEvent>();

// ============================================================================
// Time Surface Definition
// ============================================================================

export interface TimeSurface {
  contracts: {
    RecordTimeEntry: RecordTimeEntryContract;
    ApproveTimesheet: ApproveTimesheetContract;
    RecordAbsence: RecordAbsenceContract;
  };
  eventStreams: {
    timeEntryRecorded: Observable<TimeEntryRecordedEvent>;
    timesheetUpdated: Observable<TimesheetUpdatedEvent>;
    timesheetApproved: Observable<TimesheetApprovedEvent>;
    timesheetRejected: Observable<TimesheetRejectedEvent>;
    timesheetReadyForPayroll: Observable<TimesheetReadyForPayrollEvent>;
    absenceRecorded: Observable<AbsenceRecordedEvent>;
    absenceBalanceUpdated: Observable<AbsenceBalanceUpdatedEvent>;
  };
}

export const timeSurface: TimeSurface = {
  contracts: {
    RecordTimeEntry: {
      input: {} as RecordTimeEntryInput,
      output: {} as RecordTimeEntryOutput,
      preconditions: recordTimeEntryPreconditions,
      postconditions: recordTimeEntryPostconditions,
      events: {
        TimeEntryRecorded: {} as TimeEntryRecordedEvent,
        TimesheetUpdated: {} as TimesheetUpdatedEvent,
      },
      errors: RecordTimeEntryErrors,
    },
    ApproveTimesheet: {
      input: {} as ApproveTimesheetInput,
      output: {} as ApproveTimesheetOutput,
      preconditions: approveTimesheetPreconditions,
      postconditions: approveTimesheetPostconditions,
      events: {
        TimesheetApproved: {} as TimesheetApprovedEvent,
        TimesheetRejected: {} as TimesheetRejectedEvent,
        TimesheetReadyForPayroll: {} as TimesheetReadyForPayrollEvent,
      },
      errors: ApproveTimesheetErrors,
    },
    RecordAbsence: {
      input: {} as RecordAbsenceInput,
      output: {} as RecordAbsenceOutput,
      preconditions: recordAbsencePreconditions,
      postconditions: recordAbsencePostconditions,
      events: {
        AbsenceRecorded: {} as AbsenceRecordedEvent,
        AbsenceBalanceUpdated: {} as AbsenceBalanceUpdatedEvent,
      },
      errors: RecordAbsenceErrors,
    },
  },
  eventStreams: {
    timeEntryRecorded: timeEntryRecordedStream,
    timesheetUpdated: timesheetUpdatedStream,
    timesheetApproved: timesheetApprovedStream,
    timesheetRejected: timesheetRejectedStream,
    timesheetReadyForPayroll: timesheetReadyForPayrollStream,
    absenceRecorded: absenceRecordedStream,
    absenceBalanceUpdated: absenceBalanceUpdatedStream,
  },
};
