/**
 * Payroll Surface Contracts
 * Defines typed contracts for payroll processing, deductions, and tax reporting
 */

import {
  EmployeeId,
  PayrollId,
  Money,
  ISODateString,
  DateRange,
  Precondition,
  Postcondition,
  PayFrequency,
} from '../../common/types';
import {
  ValidationError,
  PreconditionError,
  EmployeeNotFoundError,
  PayrollProcessingError,
} from '../../common/errors';
import { DomainEvent, createEvent, Observable } from '../../common/events';

// ============================================================================
// Payroll Domain Types
// ============================================================================

export type PayrollStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface PayrollPeriod {
  periodId: string;
  startDate: ISODateString;
  endDate: ISODateString;
  payDate: ISODateString;
  payFrequency: PayFrequency;
}

export interface EarningsLine {
  earningType: EarningType;
  hours?: number;
  rate?: Money;
  amount: Money;
  description?: string;
}

export type EarningType =
  | 'REGULAR'
  | 'OVERTIME'
  | 'DOUBLE_TIME'
  | 'HOLIDAY'
  | 'PTO'
  | 'SICK'
  | 'BONUS'
  | 'COMMISSION'
  | 'ALLOWANCE'
  | 'REIMBURSEMENT';

export interface DeductionLine {
  deductionType: DeductionType;
  amount: Money;
  pretax: boolean;
  description?: string;
  benefitPlanId?: string;
}

export type DeductionType =
  | 'FEDERAL_TAX'
  | 'STATE_TAX'
  | 'LOCAL_TAX'
  | 'SOCIAL_SECURITY'
  | 'MEDICARE'
  | 'HEALTH_INSURANCE'
  | 'DENTAL_INSURANCE'
  | 'VISION_INSURANCE'
  | 'LIFE_INSURANCE'
  | 'RETIREMENT_401K'
  | 'HSA'
  | 'FSA'
  | 'GARNISHMENT'
  | 'UNION_DUES'
  | 'OTHER';

export interface TaxWithholding {
  taxType: TaxType;
  jurisdiction: string;
  grossWages: Money;
  taxableWages: Money;
  taxAmount: Money;
  ytdWages: Money;
  ytdTax: Money;
}

export type TaxType = 'FEDERAL' | 'STATE' | 'LOCAL' | 'FICA_SS' | 'FICA_MEDICARE' | 'FUTA' | 'SUTA';

export interface PayStatement {
  statementId: string;
  employeeId: EmployeeId;
  payrollId: PayrollId;
  period: PayrollPeriod;
  earnings: EarningsLine[];
  deductions: DeductionLine[];
  taxes: TaxWithholding[];
  grossPay: Money;
  netPay: Money;
  generatedAt: string;
}

// ============================================================================
// Run Payroll Contract
// ============================================================================

export interface RunPayrollInput {
  payroll_period: PayrollPeriod;
  employee_ids?: EmployeeId[];
  include_off_cycle?: boolean;
  process_date: ISODateString;
}

export interface RunPayrollOutput {
  payroll_id: PayrollId;
  pay_date: ISODateString;
  employee_count: number;
  total_gross: Money;
  total_net: Money;
  total_employer_taxes: Money;
  status: PayrollStatus;
  pay_statements: PayStatement[];
}

export interface RunPayrollContract {
  input: RunPayrollInput;
  output: RunPayrollOutput;
  preconditions: Precondition<RunPayrollInput>[];
  postconditions: Postcondition<RunPayrollInput, RunPayrollOutput>[];
  events: {
    PayrollInitiated: PayrollInitiatedEvent;
    EarningsCalculated: EarningsCalculatedEvent;
    DeductionsApplied: DeductionsAppliedEvent;
    TaxesCalculated: TaxesCalculatedEvent;
    PayrollCompleted: PayrollCompletedEvent;
  };
  errors: typeof RunPayrollErrors;
}

export const RunPayrollErrors = {
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
  PayrollProcessingError: PayrollProcessingError,
} as const;

export const runPayrollPreconditions: Precondition<RunPayrollInput>[] = [
  {
    name: 'ValidPayrollPeriod',
    description: 'Payroll period must have valid start and end dates',
    check: (input) =>
      !!input.payroll_period.startDate &&
      !!input.payroll_period.endDate &&
      new Date(input.payroll_period.startDate) < new Date(input.payroll_period.endDate),
  },
  {
    name: 'ValidPayDate',
    description: 'Pay date must be on or after period end date',
    check: (input) =>
      new Date(input.payroll_period.payDate) >= new Date(input.payroll_period.endDate),
  },
  {
    name: 'ValidProcessDate',
    description: 'Process date must be a valid date',
    check: (input) => {
      const date = new Date(input.process_date);
      return !isNaN(date.getTime());
    },
  },
];

export const runPayrollPostconditions: Postcondition<RunPayrollInput, RunPayrollOutput>[] = [
  {
    name: 'PayrollIdGenerated',
    description: 'A unique payroll ID must be generated',
    check: (_, output) => !!output.payroll_id && output.payroll_id.length > 0,
  },
  {
    name: 'EmployeesProcessed',
    description: 'At least one employee must be processed',
    check: (_, output) => output.employee_count > 0,
  },
  {
    name: 'TotalsCalculated',
    description: 'Gross and net totals must be calculated',
    check: (_, output) =>
      output.total_gross.amount >= 0 &&
      output.total_net.amount >= 0 &&
      output.total_net.amount <= output.total_gross.amount,
  },
  {
    name: 'PayStatementsGenerated',
    description: 'Pay statements must be generated for all employees',
    check: (_, output) => output.pay_statements.length === output.employee_count,
  },
];

// ============================================================================
// Calculate Deductions Contract
// ============================================================================

export interface CalculateDeductionsInput {
  employee_id: EmployeeId;
  gross_earnings: Money;
  pay_period: PayrollPeriod;
  benefit_elections: BenefitElection[];
  garnishments?: Garnishment[];
}

export interface BenefitElection {
  benefitPlanId: string;
  benefitType: string;
  employeeContribution: Money;
  employerContribution: Money;
  pretax: boolean;
}

export interface Garnishment {
  garnishmentId: string;
  type: 'CHILD_SUPPORT' | 'TAX_LEVY' | 'CREDITOR' | 'STUDENT_LOAN' | 'BANKRUPTCY';
  amount: Money;
  priority: number;
  maxPercentage?: number;
}

export interface CalculateDeductionsOutput {
  employee_id: EmployeeId;
  gross_earnings: Money;
  pretax_deductions: DeductionLine[];
  posttax_deductions: DeductionLine[];
  total_pretax: Money;
  total_posttax: Money;
  taxable_wages: Money;
  net_after_deductions: Money;
}

export interface CalculateDeductionsContract {
  input: CalculateDeductionsInput;
  output: CalculateDeductionsOutput;
  preconditions: Precondition<CalculateDeductionsInput>[];
  postconditions: Postcondition<CalculateDeductionsInput, CalculateDeductionsOutput>[];
  events: {
    DeductionsCalculated: DeductionsCalculatedEvent;
  };
  errors: typeof CalculateDeductionsErrors;
}

export const CalculateDeductionsErrors = {
  EmployeeNotFound: EmployeeNotFoundError,
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
} as const;

export const calculateDeductionsPreconditions: Precondition<CalculateDeductionsInput>[] = [
  {
    name: 'ValidEmployeeId',
    description: 'Employee ID must be provided',
    check: (input) => !!input.employee_id && input.employee_id.length > 0,
  },
  {
    name: 'ValidGrossEarnings',
    description: 'Gross earnings must be positive',
    check: (input) => input.gross_earnings.amount >= 0,
  },
  {
    name: 'ValidBenefitElections',
    description: 'Benefit elections must have valid contributions',
    check: (input) =>
      input.benefit_elections.every(
        (e) => e.employeeContribution.amount >= 0 && e.employerContribution.amount >= 0
      ),
  },
];

export const calculateDeductionsPostconditions: Postcondition<
  CalculateDeductionsInput,
  CalculateDeductionsOutput
>[] = [
  {
    name: 'DeductionsTotaled',
    description: 'Pretax and posttax deductions must be totaled',
    check: (_, output) =>
      output.total_pretax.amount >= 0 && output.total_posttax.amount >= 0,
  },
  {
    name: 'TaxableWagesCalculated',
    description: 'Taxable wages must equal gross minus pretax deductions',
    check: (_, output) =>
      Math.abs(
        output.taxable_wages.amount -
          (output.gross_earnings.amount - output.total_pretax.amount)
      ) < 0.01,
  },
  {
    name: 'NetCalculated',
    description: 'Net must equal gross minus all deductions',
    check: (_, output) =>
      output.net_after_deductions.amount ===
      output.gross_earnings.amount - output.total_pretax.amount - output.total_posttax.amount,
  },
];

// ============================================================================
// Generate Tax Report Contract
// ============================================================================

export interface GenerateTaxReportInput {
  report_type: TaxReportType;
  tax_year: number;
  quarter?: 1 | 2 | 3 | 4;
  employee_ids?: EmployeeId[];
  jurisdiction?: string;
}

export type TaxReportType =
  | 'W2'
  | '1099'
  | '941'
  | '940'
  | 'STATE_QUARTERLY'
  | 'STATE_ANNUAL'
  | 'LOCAL';

export interface GenerateTaxReportOutput {
  report_id: string;
  report_type: TaxReportType;
  tax_year: number;
  quarter?: 1 | 2 | 3 | 4;
  employee_count: number;
  total_wages: Money;
  total_federal_tax: Money;
  total_state_tax: Money;
  total_local_tax: Money;
  total_fica: Money;
  report_data: TaxReportData[];
  generated_at: string;
  due_date: ISODateString;
  filing_status: 'DRAFT' | 'PENDING' | 'FILED' | 'ACCEPTED' | 'REJECTED';
}

export interface TaxReportData {
  employeeId: EmployeeId;
  ssn_last4: string;
  wages: Money;
  federalWithheld: Money;
  stateWithheld: Money;
  localWithheld: Money;
  socialSecurityWages: Money;
  socialSecurityTax: Money;
  medicareWages: Money;
  medicareTax: Money;
}

export interface GenerateTaxReportContract {
  input: GenerateTaxReportInput;
  output: GenerateTaxReportOutput;
  preconditions: Precondition<GenerateTaxReportInput>[];
  postconditions: Postcondition<GenerateTaxReportInput, GenerateTaxReportOutput>[];
  events: {
    TaxReportGenerated: TaxReportGeneratedEvent;
  };
  errors: typeof GenerateTaxReportErrors;
}

export const GenerateTaxReportErrors = {
  ValidationError: ValidationError,
  PreconditionError: PreconditionError,
  PayrollProcessingError: PayrollProcessingError,
} as const;

export const generateTaxReportPreconditions: Precondition<GenerateTaxReportInput>[] = [
  {
    name: 'ValidReportType',
    description: 'Report type must be valid',
    check: (input) => !!input.report_type,
  },
  {
    name: 'ValidTaxYear',
    description: 'Tax year must be a valid year',
    check: (input) => input.tax_year >= 2000 && input.tax_year <= 2100,
  },
  {
    name: 'ValidQuarter',
    description: 'Quarter must be 1-4 if provided',
    check: (input) =>
      input.quarter === undefined || (input.quarter >= 1 && input.quarter <= 4),
  },
];

export const generateTaxReportPostconditions: Postcondition<
  GenerateTaxReportInput,
  GenerateTaxReportOutput
>[] = [
  {
    name: 'ReportIdGenerated',
    description: 'A unique report ID must be generated',
    check: (_, output) => !!output.report_id && output.report_id.length > 0,
  },
  {
    name: 'ReportTypeMatches',
    description: 'Report type must match input',
    check: (input, output) => output.report_type === input.report_type,
  },
  {
    name: 'TaxYearMatches',
    description: 'Tax year must match input',
    check: (input, output) => output.tax_year === input.tax_year,
  },
  {
    name: 'TotalsCalculated',
    description: 'All tax totals must be calculated',
    check: (_, output) =>
      output.total_wages.amount >= 0 &&
      output.total_federal_tax.amount >= 0 &&
      output.total_fica.amount >= 0,
  },
];

// ============================================================================
// Payroll Events
// ============================================================================

export interface PayrollInitiatedPayload {
  payrollId: PayrollId;
  period: PayrollPeriod;
  employeeCount: number;
  initiatedBy: EmployeeId;
}

export type PayrollInitiatedEvent = DomainEvent<PayrollInitiatedPayload>;

export interface EarningsCalculatedPayload {
  payrollId: PayrollId;
  employeeId: EmployeeId;
  earnings: EarningsLine[];
  totalGross: Money;
}

export type EarningsCalculatedEvent = DomainEvent<EarningsCalculatedPayload>;

export interface DeductionsAppliedPayload {
  payrollId: PayrollId;
  employeeId: EmployeeId;
  deductions: DeductionLine[];
  totalDeductions: Money;
}

export type DeductionsAppliedEvent = DomainEvent<DeductionsAppliedPayload>;

export interface DeductionsCalculatedPayload {
  employeeId: EmployeeId;
  payPeriod: PayrollPeriod;
  pretaxTotal: Money;
  posttaxTotal: Money;
  taxableWages: Money;
}

export type DeductionsCalculatedEvent = DomainEvent<DeductionsCalculatedPayload>;

export interface TaxesCalculatedPayload {
  payrollId: PayrollId;
  employeeId: EmployeeId;
  taxes: TaxWithholding[];
  totalTaxes: Money;
}

export type TaxesCalculatedEvent = DomainEvent<TaxesCalculatedPayload>;

export interface PayrollCompletedPayload {
  payrollId: PayrollId;
  payDate: ISODateString;
  employeeCount: number;
  totalGross: Money;
  totalNet: Money;
  totalEmployerTaxes: Money;
  status: PayrollStatus;
  completedAt: string;
}

export type PayrollCompletedEvent = DomainEvent<PayrollCompletedPayload>;

export interface TaxReportGeneratedPayload {
  reportId: string;
  reportType: TaxReportType;
  taxYear: number;
  quarter?: number;
  employeeCount: number;
  totalWages: Money;
  generatedAt: string;
}

export type TaxReportGeneratedEvent = DomainEvent<TaxReportGeneratedPayload>;

// ============================================================================
// Event Factories
// ============================================================================

export function createPayrollInitiatedEvent(
  payload: PayrollInitiatedPayload,
  metadata?: { correlationId?: string; userId?: string }
): PayrollInitiatedEvent {
  return createEvent('PayrollInitiated', payload.payrollId, 'Payroll', payload, {
    ...metadata,
    source: 'PayrollSurface',
  });
}

export function createEarningsCalculatedEvent(
  payload: EarningsCalculatedPayload,
  metadata?: { correlationId?: string; userId?: string }
): EarningsCalculatedEvent {
  return createEvent('EarningsCalculated', payload.payrollId, 'Payroll', payload, {
    ...metadata,
    source: 'PayrollSurface',
  });
}

export function createDeductionsAppliedEvent(
  payload: DeductionsAppliedPayload,
  metadata?: { correlationId?: string; userId?: string }
): DeductionsAppliedEvent {
  return createEvent('DeductionsApplied', payload.payrollId, 'Payroll', payload, {
    ...metadata,
    source: 'PayrollSurface',
  });
}

export function createTaxesCalculatedEvent(
  payload: TaxesCalculatedPayload,
  metadata?: { correlationId?: string; userId?: string }
): TaxesCalculatedEvent {
  return createEvent('TaxesCalculated', payload.payrollId, 'Payroll', payload, {
    ...metadata,
    source: 'PayrollSurface',
  });
}

export function createPayrollCompletedEvent(
  payload: PayrollCompletedPayload,
  metadata?: { correlationId?: string; userId?: string }
): PayrollCompletedEvent {
  return createEvent('PayrollCompleted', payload.payrollId, 'Payroll', payload, {
    ...metadata,
    source: 'PayrollSurface',
  });
}

export function createTaxReportGeneratedEvent(
  payload: TaxReportGeneratedPayload,
  metadata?: { correlationId?: string; userId?: string }
): TaxReportGeneratedEvent {
  return createEvent('TaxReportGenerated', payload.reportId, 'TaxReport', payload, {
    ...metadata,
    source: 'PayrollSurface',
  });
}

// ============================================================================
// Event Streams
// ============================================================================

export const payrollInitiatedStream = new Observable<PayrollInitiatedEvent>();
export const earningsCalculatedStream = new Observable<EarningsCalculatedEvent>();
export const deductionsAppliedStream = new Observable<DeductionsAppliedEvent>();
export const deductionsCalculatedStream = new Observable<DeductionsCalculatedEvent>();
export const taxesCalculatedStream = new Observable<TaxesCalculatedEvent>();
export const payrollCompletedStream = new Observable<PayrollCompletedEvent>();
export const taxReportGeneratedStream = new Observable<TaxReportGeneratedEvent>();

// ============================================================================
// Payroll Surface Definition
// ============================================================================

export interface PayrollSurface {
  contracts: {
    RunPayroll: RunPayrollContract;
    CalculateDeductions: CalculateDeductionsContract;
    GenerateTaxReport: GenerateTaxReportContract;
  };
  eventStreams: {
    payrollInitiated: Observable<PayrollInitiatedEvent>;
    earningsCalculated: Observable<EarningsCalculatedEvent>;
    deductionsApplied: Observable<DeductionsAppliedEvent>;
    deductionsCalculated: Observable<DeductionsCalculatedEvent>;
    taxesCalculated: Observable<TaxesCalculatedEvent>;
    payrollCompleted: Observable<PayrollCompletedEvent>;
    taxReportGenerated: Observable<TaxReportGeneratedEvent>;
  };
}

export const payrollSurface: PayrollSurface = {
  contracts: {
    RunPayroll: {
      input: {} as RunPayrollInput,
      output: {} as RunPayrollOutput,
      preconditions: runPayrollPreconditions,
      postconditions: runPayrollPostconditions,
      events: {
        PayrollInitiated: {} as PayrollInitiatedEvent,
        EarningsCalculated: {} as EarningsCalculatedEvent,
        DeductionsApplied: {} as DeductionsAppliedEvent,
        TaxesCalculated: {} as TaxesCalculatedEvent,
        PayrollCompleted: {} as PayrollCompletedEvent,
      },
      errors: RunPayrollErrors,
    },
    CalculateDeductions: {
      input: {} as CalculateDeductionsInput,
      output: {} as CalculateDeductionsOutput,
      preconditions: calculateDeductionsPreconditions,
      postconditions: calculateDeductionsPostconditions,
      events: {
        DeductionsCalculated: {} as DeductionsCalculatedEvent,
      },
      errors: CalculateDeductionsErrors,
    },
    GenerateTaxReport: {
      input: {} as GenerateTaxReportInput,
      output: {} as GenerateTaxReportOutput,
      preconditions: generateTaxReportPreconditions,
      postconditions: generateTaxReportPostconditions,
      events: {
        TaxReportGenerated: {} as TaxReportGeneratedEvent,
      },
      errors: GenerateTaxReportErrors,
    },
  },
  eventStreams: {
    payrollInitiated: payrollInitiatedStream,
    earningsCalculated: earningsCalculatedStream,
    deductionsApplied: deductionsAppliedStream,
    deductionsCalculated: deductionsCalculatedStream,
    taxesCalculated: taxesCalculatedStream,
    payrollCompleted: payrollCompletedStream,
    taxReportGenerated: taxReportGeneratedStream,
  },
};
