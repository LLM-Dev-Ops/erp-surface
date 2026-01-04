/**
 * Employee Domain State Machines
 * Defines state transitions for Employee and Position entities
 */

import { StateTransitionError } from '../../common/errors';

// ============================================================================
// Employee State Machine
// ============================================================================

export enum EmployeeState {
  NONE = 'NONE',
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
}

export const VALID_EMPLOYEE_TRANSITIONS: Record<EmployeeState, EmployeeState[]> = {
  [EmployeeState.NONE]: [EmployeeState.ACTIVE],
  [EmployeeState.ACTIVE]: [EmployeeState.ON_LEAVE, EmployeeState.TERMINATED],
  [EmployeeState.ON_LEAVE]: [EmployeeState.ACTIVE, EmployeeState.TERMINATED],
  [EmployeeState.TERMINATED]: [], // Terminal state
};

export function canTransitionEmployee(from: EmployeeState, to: EmployeeState): boolean {
  return VALID_EMPLOYEE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionEmployee(from: EmployeeState, to: EmployeeState): EmployeeState {
  if (!canTransitionEmployee(from, to)) {
    throw new StateTransitionError('Employee', from, to);
  }
  return to;
}

export function isTerminalEmployeeState(state: EmployeeState): boolean {
  return state === EmployeeState.TERMINATED;
}

export function isActiveEmployeeState(state: EmployeeState): boolean {
  return state === EmployeeState.ACTIVE || state === EmployeeState.ON_LEAVE;
}

// ============================================================================
// Position State Machine
// ============================================================================

export enum PositionState {
  VACANT = 'VACANT',
  FILLED = 'FILLED',
}

export const VALID_POSITION_TRANSITIONS: Record<PositionState, PositionState[]> = {
  [PositionState.VACANT]: [PositionState.FILLED],
  [PositionState.FILLED]: [PositionState.VACANT],
};

export function canTransitionPosition(from: PositionState, to: PositionState): boolean {
  return VALID_POSITION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionPosition(from: PositionState, to: PositionState): PositionState {
  if (!canTransitionPosition(from, to)) {
    throw new StateTransitionError('Position', from, to);
  }
  return to;
}

export function isVacantPosition(state: PositionState): boolean {
  return state === PositionState.VACANT;
}

// ============================================================================
// Employee Entity
// ============================================================================

export interface EmployeeEntity {
  employeeId: string;
  state: EmployeeState;
  personalData: PersonalDataSnapshot;
  employmentData: EmploymentDataSnapshot;
  positionId: string;
  hireDate: string;
  terminationDate?: string;
  compensationHistory: CompensationRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonalDataSnapshot {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
}

export interface EmploymentDataSnapshot {
  employmentType: string;
  departmentId: string;
  managerId?: string;
  locationId?: string;
}

export interface CompensationRecord {
  effectiveDate: string;
  baseSalary: { amount: number; currency: string };
  payFrequency: string;
  reason: string;
}

// ============================================================================
// Position Entity
// ============================================================================

export interface PositionEntity {
  positionId: string;
  state: PositionState;
  title: string;
  departmentId: string;
  currentEmployeeId?: string;
  reportsTo?: string;
  headcount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// State Machine Factory
// ============================================================================

export class EmployeeStateMachine {
  private currentState: EmployeeState;

  constructor(initialState: EmployeeState = EmployeeState.NONE) {
    this.currentState = initialState;
  }

  get state(): EmployeeState {
    return this.currentState;
  }

  transition(to: EmployeeState): void {
    this.currentState = transitionEmployee(this.currentState, to);
  }

  canTransitionTo(to: EmployeeState): boolean {
    return canTransitionEmployee(this.currentState, to);
  }

  isTerminal(): boolean {
    return isTerminalEmployeeState(this.currentState);
  }

  isActive(): boolean {
    return isActiveEmployeeState(this.currentState);
  }
}

export class PositionStateMachine {
  private currentState: PositionState;

  constructor(initialState: PositionState = PositionState.VACANT) {
    this.currentState = initialState;
  }

  get state(): PositionState {
    return this.currentState;
  }

  transition(to: PositionState): void {
    this.currentState = transitionPosition(this.currentState, to);
  }

  canTransitionTo(to: PositionState): boolean {
    return canTransitionPosition(this.currentState, to);
  }

  isVacant(): boolean {
    return isVacantPosition(this.currentState);
  }
}
