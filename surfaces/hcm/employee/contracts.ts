/**
 * Employee Surface Contracts
 * Defines typed contracts for employee lifecycle management
 */

import {
  EmployeeId,
  PositionId,
  PersonalData,
  EmploymentData,
  Compensation,
  Task,
  ISODateString,
  Precondition,
  Postcondition,
} from '../../common/types';
import {
  ValidationError,
  PreconditionError,
  EmployeeNotFoundError,
  PositionNotFoundError,
  PositionFilledError,
  InvalidTerminationError,
} from '../../common/errors';
import { Observable } from '../../common/events';
import { EmployeeState, PositionState } from './models';
import {
  TerminationReason,
  FinalPayInstructions,
  HireRequestReceivedEvent,
  EmployeeIdAssignedEvent,
  PositionFilledEvent,
  PayrollRecordCreatedEvent,
  HireCompletedEvent,
  TerminationRequestedEvent,
  TerminationCompletedEvent,
  TransferRequestedEvent,
  TransferCompletedEvent,
  PromotionRequestedEvent,
  PromotionCompletedEvent,
  hireRequestReceivedStream,
  employeeIdAssignedStream,
  positionFilledStream,
  payrollRecordCreatedStream,
  hireCompletedStream,
  terminationRequestedStream,
  terminationCompletedStream,
  transferRequestedStream,
  transferCompletedStream,
  promotionRequestedStream,
  promotionCompletedStream,
} from './events';

// ============================================================================
// Hire Employee Contract
// ============================================================================

export interface HireEmployeeInput {
  personal_data: PersonalData;
  employment_data: EmploymentData;
  position_id: PositionId;
  hire_date: ISODateString;
  compensation: Compensation;
}

export interface HireEmployeeOutput {
  employee_id: EmployeeId;
  employment_status: EmployeeState;
  onboarding_tasks: Task[];
}

export interface HireEmployeeContract {
  input: HireEmployeeInput;
  output: HireEmployeeOutput;
  preconditions: Precondition<HireEmployeeInput>[];
  postconditions: Postcondition<HireEmployeeInput, HireEmployeeOutput>[];
  stateTransitions: {
    employee: { from: EmployeeState; to: EmployeeState };
    position: { from: PositionState; to: PositionState };
  };
  events: {
    HireRequestReceived: HireRequestReceivedEvent;
    EmployeeIdAssigned: EmployeeIdAssignedEvent;
    PositionFilled: PositionFilledEvent;
    PayrollRecordCreated: PayrollRecordCreatedEvent;
    HireCompleted: HireCompletedEvent;
  };
  errors: typeof HireEmployeeErrors;
}

export const HireEmployeeErrors = {
  PositionNotFound: PositionNotFoundError,
  PositionFilled: PositionFilledError,
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
} as const;

export const hireEmployeePreconditions: Precondition<HireEmployeeInput>[] = [
  {
    name: 'ValidPersonalData',
    description: 'Personal data must contain required fields',
    check: (input) =>
      !!input.personal_data.firstName &&
      !!input.personal_data.lastName &&
      !!input.personal_data.email &&
      !!input.personal_data.dateOfBirth,
  },
  {
    name: 'ValidPositionId',
    description: 'Position ID must be provided',
    check: (input) => !!input.position_id && input.position_id.length > 0,
  },
  {
    name: 'ValidHireDate',
    description: 'Hire date must be a valid date string',
    check: (input) => {
      const date = new Date(input.hire_date);
      return !isNaN(date.getTime());
    },
  },
  {
    name: 'ValidCompensation',
    description: 'Compensation must include base salary and pay frequency',
    check: (input) =>
      !!input.compensation.baseSalary &&
      input.compensation.baseSalary.amount > 0 &&
      !!input.compensation.payFrequency,
  },
  {
    name: 'FutureOrTodayHireDate',
    description: 'Hire date must not be in the past',
    check: (input) => {
      const hireDate = new Date(input.hire_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return hireDate >= today;
    },
  },
];

export const hireEmployeePostconditions: Postcondition<HireEmployeeInput, HireEmployeeOutput>[] = [
  {
    name: 'EmployeeIdGenerated',
    description: 'A unique employee ID must be generated',
    check: (_, output) => !!output.employee_id && output.employee_id.length > 0,
  },
  {
    name: 'EmployeeIsActive',
    description: 'Employee status must be ACTIVE after hire',
    check: (_, output) => output.employment_status === EmployeeState.ACTIVE,
  },
  {
    name: 'OnboardingTasksCreated',
    description: 'Onboarding tasks must be created',
    check: (_, output) => Array.isArray(output.onboarding_tasks) && output.onboarding_tasks.length > 0,
  },
];

// ============================================================================
// Terminate Employee Contract
// ============================================================================

export interface TerminateEmployeeInput {
  employee_id: EmployeeId;
  termination_date: ISODateString;
  termination_reason: TerminationReason;
  final_pay_instructions: FinalPayInstructions;
}

export interface TerminateEmployeeOutput {
  termination_id: string;
  final_pay_date: ISODateString;
  benefits_end_date: ISODateString;
  exit_tasks: Task[];
}

export interface TerminateEmployeeContract {
  input: TerminateEmployeeInput;
  output: TerminateEmployeeOutput;
  preconditions: Precondition<TerminateEmployeeInput>[];
  postconditions: Postcondition<TerminateEmployeeInput, TerminateEmployeeOutput>[];
  stateTransitions: {
    employee: { from: EmployeeState; to: EmployeeState };
    position: { from: PositionState; to: PositionState };
  };
  events: {
    TerminationRequested: TerminationRequestedEvent;
    TerminationCompleted: TerminationCompletedEvent;
  };
  errors: typeof TerminateEmployeeErrors;
}

export const TerminateEmployeeErrors = {
  EmployeeNotFound: EmployeeNotFoundError,
  InvalidTermination: InvalidTerminationError,
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
} as const;

export const terminateEmployeePreconditions: Precondition<TerminateEmployeeInput>[] = [
  {
    name: 'ValidEmployeeId',
    description: 'Employee ID must be provided',
    check: (input) => !!input.employee_id && input.employee_id.length > 0,
  },
  {
    name: 'ValidTerminationDate',
    description: 'Termination date must be a valid date string',
    check: (input) => {
      const date = new Date(input.termination_date);
      return !isNaN(date.getTime());
    },
  },
  {
    name: 'ValidTerminationReason',
    description: 'Termination reason must be provided',
    check: (input) => !!input.termination_reason,
  },
  {
    name: 'ValidFinalPayInstructions',
    description: 'Final pay instructions must include payout date and payment method',
    check: (input) =>
      !!input.final_pay_instructions.payoutDate &&
      !!input.final_pay_instructions.paymentMethod,
  },
];

export const terminateEmployeePostconditions: Postcondition<
  TerminateEmployeeInput,
  TerminateEmployeeOutput
>[] = [
  {
    name: 'TerminationIdGenerated',
    description: 'A unique termination ID must be generated',
    check: (_, output) => !!output.termination_id && output.termination_id.length > 0,
  },
  {
    name: 'FinalPayDateSet',
    description: 'Final pay date must be set',
    check: (_, output) => !!output.final_pay_date,
  },
  {
    name: 'BenefitsEndDateSet',
    description: 'Benefits end date must be set',
    check: (_, output) => !!output.benefits_end_date,
  },
  {
    name: 'ExitTasksCreated',
    description: 'Exit tasks must be created',
    check: (_, output) => Array.isArray(output.exit_tasks) && output.exit_tasks.length > 0,
  },
];

// ============================================================================
// Transfer Employee Contract
// ============================================================================

export interface TransferEmployeeInput {
  employee_id: EmployeeId;
  from_position_id: PositionId;
  to_position_id: PositionId;
  effective_date: ISODateString;
  transfer_reason: string;
  compensation_change?: Compensation;
}

export interface TransferEmployeeOutput {
  transfer_id: string;
  effective_date: ISODateString;
  new_position_id: PositionId;
  new_department_id: string;
  new_manager_id?: EmployeeId;
  transition_tasks: Task[];
}

export interface TransferEmployeeContract {
  input: TransferEmployeeInput;
  output: TransferEmployeeOutput;
  preconditions: Precondition<TransferEmployeeInput>[];
  postconditions: Postcondition<TransferEmployeeInput, TransferEmployeeOutput>[];
  stateTransitions: {
    fromPosition: { from: PositionState; to: PositionState };
    toPosition: { from: PositionState; to: PositionState };
  };
  events: {
    TransferRequested: TransferRequestedEvent;
    TransferCompleted: TransferCompletedEvent;
  };
  errors: typeof TransferEmployeeErrors;
}

export const TransferEmployeeErrors = {
  EmployeeNotFound: EmployeeNotFoundError,
  PositionNotFound: PositionNotFoundError,
  PositionFilled: PositionFilledError,
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
} as const;

export const transferEmployeePreconditions: Precondition<TransferEmployeeInput>[] = [
  {
    name: 'ValidEmployeeId',
    description: 'Employee ID must be provided',
    check: (input) => !!input.employee_id && input.employee_id.length > 0,
  },
  {
    name: 'ValidFromPositionId',
    description: 'Source position ID must be provided',
    check: (input) => !!input.from_position_id && input.from_position_id.length > 0,
  },
  {
    name: 'ValidToPositionId',
    description: 'Target position ID must be provided',
    check: (input) => !!input.to_position_id && input.to_position_id.length > 0,
  },
  {
    name: 'DifferentPositions',
    description: 'Source and target positions must be different',
    check: (input) => input.from_position_id !== input.to_position_id,
  },
  {
    name: 'ValidEffectiveDate',
    description: 'Effective date must be a valid future date',
    check: (input) => {
      const date = new Date(input.effective_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return !isNaN(date.getTime()) && date >= today;
    },
  },
  {
    name: 'ValidTransferReason',
    description: 'Transfer reason must be provided',
    check: (input) => !!input.transfer_reason && input.transfer_reason.length > 0,
  },
];

export const transferEmployeePostconditions: Postcondition<
  TransferEmployeeInput,
  TransferEmployeeOutput
>[] = [
  {
    name: 'TransferIdGenerated',
    description: 'A unique transfer ID must be generated',
    check: (_, output) => !!output.transfer_id && output.transfer_id.length > 0,
  },
  {
    name: 'NewPositionAssigned',
    description: 'New position ID must match the requested target position',
    check: (input, output) => output.new_position_id === input.to_position_id,
  },
  {
    name: 'TransitionTasksCreated',
    description: 'Transition tasks must be created',
    check: (_, output) => Array.isArray(output.transition_tasks),
  },
];

// ============================================================================
// Promote Employee Contract
// ============================================================================

export interface PromoteEmployeeInput {
  employee_id: EmployeeId;
  from_position_id: PositionId;
  to_position_id: PositionId;
  effective_date: ISODateString;
  new_compensation: Compensation;
  promotion_reason: string;
}

export interface PromoteEmployeeOutput {
  promotion_id: string;
  effective_date: ISODateString;
  new_position_id: PositionId;
  new_title: string;
  previous_compensation: Compensation;
  new_compensation: Compensation;
  compensation_change_percentage: number;
  transition_tasks: Task[];
}

export interface PromoteEmployeeContract {
  input: PromoteEmployeeInput;
  output: PromoteEmployeeOutput;
  preconditions: Precondition<PromoteEmployeeInput>[];
  postconditions: Postcondition<PromoteEmployeeInput, PromoteEmployeeOutput>[];
  stateTransitions: {
    fromPosition: { from: PositionState; to: PositionState };
    toPosition: { from: PositionState; to: PositionState };
  };
  events: {
    PromotionRequested: PromotionRequestedEvent;
    PromotionCompleted: PromotionCompletedEvent;
  };
  errors: typeof PromoteEmployeeErrors;
}

export const PromoteEmployeeErrors = {
  EmployeeNotFound: EmployeeNotFoundError,
  PositionNotFound: PositionNotFoundError,
  PositionFilled: PositionFilledError,
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
} as const;

export const promoteEmployeePreconditions: Precondition<PromoteEmployeeInput>[] = [
  {
    name: 'ValidEmployeeId',
    description: 'Employee ID must be provided',
    check: (input) => !!input.employee_id && input.employee_id.length > 0,
  },
  {
    name: 'ValidFromPositionId',
    description: 'Source position ID must be provided',
    check: (input) => !!input.from_position_id && input.from_position_id.length > 0,
  },
  {
    name: 'ValidToPositionId',
    description: 'Target position ID must be provided',
    check: (input) => !!input.to_position_id && input.to_position_id.length > 0,
  },
  {
    name: 'DifferentPositions',
    description: 'Source and target positions must be different',
    check: (input) => input.from_position_id !== input.to_position_id,
  },
  {
    name: 'ValidEffectiveDate',
    description: 'Effective date must be a valid future date',
    check: (input) => {
      const date = new Date(input.effective_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return !isNaN(date.getTime()) && date >= today;
    },
  },
  {
    name: 'ValidNewCompensation',
    description: 'New compensation must include base salary and pay frequency',
    check: (input) =>
      !!input.new_compensation.baseSalary &&
      input.new_compensation.baseSalary.amount > 0 &&
      !!input.new_compensation.payFrequency,
  },
  {
    name: 'ValidPromotionReason',
    description: 'Promotion reason must be provided',
    check: (input) => !!input.promotion_reason && input.promotion_reason.length > 0,
  },
];

export const promoteEmployeePostconditions: Postcondition<
  PromoteEmployeeInput,
  PromoteEmployeeOutput
>[] = [
  {
    name: 'PromotionIdGenerated',
    description: 'A unique promotion ID must be generated',
    check: (_, output) => !!output.promotion_id && output.promotion_id.length > 0,
  },
  {
    name: 'NewPositionAssigned',
    description: 'New position ID must match the requested target position',
    check: (input, output) => output.new_position_id === input.to_position_id,
  },
  {
    name: 'CompensationUpdated',
    description: 'New compensation must be applied',
    check: (input, output) =>
      output.new_compensation.baseSalary.amount === input.new_compensation.baseSalary.amount,
  },
  {
    name: 'CompensationIncreased',
    description: 'Compensation must increase for a promotion',
    check: (_, output) => output.compensation_change_percentage > 0,
  },
  {
    name: 'TransitionTasksCreated',
    description: 'Transition tasks must be created',
    check: (_, output) => Array.isArray(output.transition_tasks),
  },
];

// ============================================================================
// Employee Surface Definition
// ============================================================================

export interface EmployeeSurface {
  contracts: {
    HireEmployee: HireEmployeeContract;
    TerminateEmployee: TerminateEmployeeContract;
    TransferEmployee: TransferEmployeeContract;
    PromoteEmployee: PromoteEmployeeContract;
  };
  eventStreams: {
    hireRequestReceived: Observable<HireRequestReceivedEvent>;
    employeeIdAssigned: Observable<EmployeeIdAssignedEvent>;
    positionFilled: Observable<PositionFilledEvent>;
    payrollRecordCreated: Observable<PayrollRecordCreatedEvent>;
    hireCompleted: Observable<HireCompletedEvent>;
    terminationRequested: Observable<TerminationRequestedEvent>;
    terminationCompleted: Observable<TerminationCompletedEvent>;
    transferRequested: Observable<TransferRequestedEvent>;
    transferCompleted: Observable<TransferCompletedEvent>;
    promotionRequested: Observable<PromotionRequestedEvent>;
    promotionCompleted: Observable<PromotionCompletedEvent>;
  };
}

export const employeeSurface: EmployeeSurface = {
  contracts: {
    HireEmployee: {
      input: {} as HireEmployeeInput,
      output: {} as HireEmployeeOutput,
      preconditions: hireEmployeePreconditions,
      postconditions: hireEmployeePostconditions,
      stateTransitions: {
        employee: { from: EmployeeState.NONE, to: EmployeeState.ACTIVE },
        position: { from: PositionState.VACANT, to: PositionState.FILLED },
      },
      events: {
        HireRequestReceived: {} as HireRequestReceivedEvent,
        EmployeeIdAssigned: {} as EmployeeIdAssignedEvent,
        PositionFilled: {} as PositionFilledEvent,
        PayrollRecordCreated: {} as PayrollRecordCreatedEvent,
        HireCompleted: {} as HireCompletedEvent,
      },
      errors: HireEmployeeErrors,
    },
    TerminateEmployee: {
      input: {} as TerminateEmployeeInput,
      output: {} as TerminateEmployeeOutput,
      preconditions: terminateEmployeePreconditions,
      postconditions: terminateEmployeePostconditions,
      stateTransitions: {
        employee: { from: EmployeeState.ACTIVE, to: EmployeeState.TERMINATED },
        position: { from: PositionState.FILLED, to: PositionState.VACANT },
      },
      events: {
        TerminationRequested: {} as TerminationRequestedEvent,
        TerminationCompleted: {} as TerminationCompletedEvent,
      },
      errors: TerminateEmployeeErrors,
    },
    TransferEmployee: {
      input: {} as TransferEmployeeInput,
      output: {} as TransferEmployeeOutput,
      preconditions: transferEmployeePreconditions,
      postconditions: transferEmployeePostconditions,
      stateTransitions: {
        fromPosition: { from: PositionState.FILLED, to: PositionState.VACANT },
        toPosition: { from: PositionState.VACANT, to: PositionState.FILLED },
      },
      events: {
        TransferRequested: {} as TransferRequestedEvent,
        TransferCompleted: {} as TransferCompletedEvent,
      },
      errors: TransferEmployeeErrors,
    },
    PromoteEmployee: {
      input: {} as PromoteEmployeeInput,
      output: {} as PromoteEmployeeOutput,
      preconditions: promoteEmployeePreconditions,
      postconditions: promoteEmployeePostconditions,
      stateTransitions: {
        fromPosition: { from: PositionState.FILLED, to: PositionState.VACANT },
        toPosition: { from: PositionState.VACANT, to: PositionState.FILLED },
      },
      events: {
        PromotionRequested: {} as PromotionRequestedEvent,
        PromotionCompleted: {} as PromotionCompletedEvent,
      },
      errors: PromoteEmployeeErrors,
    },
  },
  eventStreams: {
    hireRequestReceived: hireRequestReceivedStream,
    employeeIdAssigned: employeeIdAssignedStream,
    positionFilled: positionFilledStream,
    payrollRecordCreated: payrollRecordCreatedStream,
    hireCompleted: hireCompletedStream,
    terminationRequested: terminationRequestedStream,
    terminationCompleted: terminationCompletedStream,
    transferRequested: transferRequestedStream,
    transferCompleted: transferCompletedStream,
    promotionRequested: promotionRequestedStream,
    promotionCompleted: promotionCompletedStream,
  },
};

// ============================================================================
// Contract Execution Helpers
// ============================================================================

export function validatePreconditions<T>(
  preconditions: Precondition<T>[],
  input: T
): void {
  for (const precondition of preconditions) {
    if (!precondition.check(input)) {
      throw new PreconditionError(
        precondition.name,
        `Precondition '${precondition.name}' failed: ${precondition.description}`
      );
    }
  }
}

export function validatePostconditions<T, R>(
  postconditions: Postcondition<T, R>[],
  input: T,
  output: R
): void {
  for (const postcondition of postconditions) {
    if (!postcondition.check(input, output)) {
      throw new PreconditionError(
        postcondition.name,
        `Postcondition '${postcondition.name}' failed: ${postcondition.description}`
      );
    }
  }
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
