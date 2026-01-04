/**
 * Employee Domain Events
 * Observable events for the Employee lifecycle
 */

import { DomainEvent, createEvent, Observable } from '../../common/events';
import {
  EmployeeId,
  PositionId,
  PersonalData,
  EmploymentData,
  Compensation,
  Task,
  Money,
  ISODateString,
} from '../../common/types';
import { EmployeeState, PositionState } from './models';

// ============================================================================
// Hire Process Events
// ============================================================================

export interface HireRequestReceivedPayload {
  requestId: string;
  personalData: PersonalData;
  employmentData: EmploymentData;
  positionId: PositionId;
  hireDate: ISODateString;
  compensation: Compensation;
  requestedBy: EmployeeId;
}

export type HireRequestReceivedEvent = DomainEvent<HireRequestReceivedPayload>;

export interface EmployeeIdAssignedPayload {
  requestId: string;
  employeeId: EmployeeId;
  email: string;
  assignedAt: string;
}

export type EmployeeIdAssignedEvent = DomainEvent<EmployeeIdAssignedPayload>;

export interface PositionFilledPayload {
  positionId: PositionId;
  employeeId: EmployeeId;
  previousState: PositionState;
  newState: PositionState;
  effectiveDate: ISODateString;
}

export type PositionFilledEvent = DomainEvent<PositionFilledPayload>;

export interface PayrollRecordCreatedPayload {
  employeeId: EmployeeId;
  payrollId: string;
  baseSalary: Money;
  payFrequency: string;
  effectiveDate: ISODateString;
}

export type PayrollRecordCreatedEvent = DomainEvent<PayrollRecordCreatedPayload>;

export interface HireCompletedPayload {
  employeeId: EmployeeId;
  positionId: PositionId;
  employmentStatus: EmployeeState;
  hireDate: ISODateString;
  onboardingTasks: Task[];
  completedAt: string;
}

export type HireCompletedEvent = DomainEvent<HireCompletedPayload>;

// ============================================================================
// Termination Process Events
// ============================================================================

export interface TerminationRequestedPayload {
  employeeId: EmployeeId;
  terminationId: string;
  terminationDate: ISODateString;
  terminationReason: TerminationReason;
  finalPayInstructions: FinalPayInstructions;
  requestedBy: EmployeeId;
}

export type TerminationReason =
  | 'VOLUNTARY_RESIGNATION'
  | 'INVOLUNTARY_TERMINATION'
  | 'RETIREMENT'
  | 'LAYOFF'
  | 'END_OF_CONTRACT'
  | 'MUTUAL_AGREEMENT'
  | 'DEATH';

export interface FinalPayInstructions {
  includeUnusedPto: boolean;
  severanceAmount?: Money;
  payoutDate: ISODateString;
  paymentMethod: 'DIRECT_DEPOSIT' | 'CHECK';
}

export type TerminationRequestedEvent = DomainEvent<TerminationRequestedPayload>;

export interface TerminationCompletedPayload {
  employeeId: EmployeeId;
  terminationId: string;
  terminationDate: ISODateString;
  finalPayDate: ISODateString;
  benefitsEndDate: ISODateString;
  exitTasks: Task[];
  previousState: EmployeeState;
  newState: EmployeeState;
  completedAt: string;
}

export type TerminationCompletedEvent = DomainEvent<TerminationCompletedPayload>;

// ============================================================================
// Transfer Process Events
// ============================================================================

export interface TransferRequestedPayload {
  employeeId: EmployeeId;
  transferId: string;
  fromPositionId: PositionId;
  toPositionId: PositionId;
  fromDepartmentId: string;
  toDepartmentId: string;
  effectiveDate: ISODateString;
  transferReason: string;
  requestedBy: EmployeeId;
}

export type TransferRequestedEvent = DomainEvent<TransferRequestedPayload>;

export interface TransferCompletedPayload {
  employeeId: EmployeeId;
  transferId: string;
  fromPositionId: PositionId;
  toPositionId: PositionId;
  effectiveDate: ISODateString;
  completedAt: string;
}

export type TransferCompletedEvent = DomainEvent<TransferCompletedPayload>;

// ============================================================================
// Promotion Process Events
// ============================================================================

export interface PromotionRequestedPayload {
  employeeId: EmployeeId;
  promotionId: string;
  fromPositionId: PositionId;
  toPositionId: PositionId;
  effectiveDate: ISODateString;
  newCompensation: Compensation;
  promotionReason: string;
  requestedBy: EmployeeId;
}

export type PromotionRequestedEvent = DomainEvent<PromotionRequestedPayload>;

export interface PromotionCompletedPayload {
  employeeId: EmployeeId;
  promotionId: string;
  fromPositionId: PositionId;
  toPositionId: PositionId;
  previousCompensation: Compensation;
  newCompensation: Compensation;
  effectiveDate: ISODateString;
  completedAt: string;
}

export type PromotionCompletedEvent = DomainEvent<PromotionCompletedPayload>;

// ============================================================================
// Leave Process Events
// ============================================================================

export interface LeaveRequestedPayload {
  employeeId: EmployeeId;
  leaveId: string;
  leaveType: LeaveType;
  startDate: ISODateString;
  expectedReturnDate: ISODateString;
  reason?: string;
  requestedBy: EmployeeId;
}

export type LeaveType =
  | 'MEDICAL'
  | 'PARENTAL'
  | 'SABBATICAL'
  | 'PERSONAL'
  | 'MILITARY'
  | 'BEREAVEMENT';

export type LeaveRequestedEvent = DomainEvent<LeaveRequestedPayload>;

export interface LeaveStartedPayload {
  employeeId: EmployeeId;
  leaveId: string;
  leaveType: LeaveType;
  startDate: ISODateString;
  previousState: EmployeeState;
  newState: EmployeeState;
}

export type LeaveStartedEvent = DomainEvent<LeaveStartedPayload>;

export interface LeaveEndedPayload {
  employeeId: EmployeeId;
  leaveId: string;
  returnDate: ISODateString;
  previousState: EmployeeState;
  newState: EmployeeState;
}

export type LeaveEndedEvent = DomainEvent<LeaveEndedPayload>;

// ============================================================================
// Event Factories
// ============================================================================

export function createHireRequestReceivedEvent(
  payload: HireRequestReceivedPayload,
  metadata?: { correlationId?: string; userId?: string }
): HireRequestReceivedEvent {
  return createEvent(
    'HireRequestReceived',
    payload.requestId,
    'Employee',
    payload,
    { ...metadata, source: 'EmployeeSurface' }
  );
}

export function createEmployeeIdAssignedEvent(
  payload: EmployeeIdAssignedPayload,
  metadata?: { correlationId?: string; userId?: string }
): EmployeeIdAssignedEvent {
  return createEvent(
    'EmployeeIdAssigned',
    payload.employeeId,
    'Employee',
    payload,
    { ...metadata, source: 'EmployeeSurface' }
  );
}

export function createPositionFilledEvent(
  payload: PositionFilledPayload,
  metadata?: { correlationId?: string; userId?: string }
): PositionFilledEvent {
  return createEvent(
    'PositionFilled',
    payload.positionId,
    'Position',
    payload,
    { ...metadata, source: 'EmployeeSurface' }
  );
}

export function createPayrollRecordCreatedEvent(
  payload: PayrollRecordCreatedPayload,
  metadata?: { correlationId?: string; userId?: string }
): PayrollRecordCreatedEvent {
  return createEvent(
    'PayrollRecordCreated',
    payload.payrollId,
    'Payroll',
    payload,
    { ...metadata, source: 'EmployeeSurface' }
  );
}

export function createHireCompletedEvent(
  payload: HireCompletedPayload,
  metadata?: { correlationId?: string; userId?: string }
): HireCompletedEvent {
  return createEvent(
    'HireCompleted',
    payload.employeeId,
    'Employee',
    payload,
    { ...metadata, source: 'EmployeeSurface' }
  );
}

export function createTerminationRequestedEvent(
  payload: TerminationRequestedPayload,
  metadata?: { correlationId?: string; userId?: string }
): TerminationRequestedEvent {
  return createEvent(
    'TerminationRequested',
    payload.terminationId,
    'Termination',
    payload,
    { ...metadata, source: 'EmployeeSurface' }
  );
}

export function createTerminationCompletedEvent(
  payload: TerminationCompletedPayload,
  metadata?: { correlationId?: string; userId?: string }
): TerminationCompletedEvent {
  return createEvent(
    'TerminationCompleted',
    payload.terminationId,
    'Termination',
    payload,
    { ...metadata, source: 'EmployeeSurface' }
  );
}

export function createTransferRequestedEvent(
  payload: TransferRequestedPayload,
  metadata?: { correlationId?: string; userId?: string }
): TransferRequestedEvent {
  return createEvent(
    'TransferRequested',
    payload.transferId,
    'Transfer',
    payload,
    { ...metadata, source: 'EmployeeSurface' }
  );
}

export function createTransferCompletedEvent(
  payload: TransferCompletedPayload,
  metadata?: { correlationId?: string; userId?: string }
): TransferCompletedEvent {
  return createEvent(
    'TransferCompleted',
    payload.transferId,
    'Transfer',
    payload,
    { ...metadata, source: 'EmployeeSurface' }
  );
}

export function createPromotionRequestedEvent(
  payload: PromotionRequestedPayload,
  metadata?: { correlationId?: string; userId?: string }
): PromotionRequestedEvent {
  return createEvent(
    'PromotionRequested',
    payload.promotionId,
    'Promotion',
    payload,
    { ...metadata, source: 'EmployeeSurface' }
  );
}

export function createPromotionCompletedEvent(
  payload: PromotionCompletedPayload,
  metadata?: { correlationId?: string; userId?: string }
): PromotionCompletedEvent {
  return createEvent(
    'PromotionCompleted',
    payload.promotionId,
    'Promotion',
    payload,
    { ...metadata, source: 'EmployeeSurface' }
  );
}

// ============================================================================
// Event Streams
// ============================================================================

export const hireRequestReceivedStream = new Observable<HireRequestReceivedEvent>();
export const employeeIdAssignedStream = new Observable<EmployeeIdAssignedEvent>();
export const positionFilledStream = new Observable<PositionFilledEvent>();
export const payrollRecordCreatedStream = new Observable<PayrollRecordCreatedEvent>();
export const hireCompletedStream = new Observable<HireCompletedEvent>();
export const terminationRequestedStream = new Observable<TerminationRequestedEvent>();
export const terminationCompletedStream = new Observable<TerminationCompletedEvent>();
export const transferRequestedStream = new Observable<TransferRequestedEvent>();
export const transferCompletedStream = new Observable<TransferCompletedEvent>();
export const promotionRequestedStream = new Observable<PromotionRequestedEvent>();
export const promotionCompletedStream = new Observable<PromotionCompletedEvent>();
