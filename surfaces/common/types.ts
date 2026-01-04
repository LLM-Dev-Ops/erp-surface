/**
 * Common Types for ERP Surface Contracts
 * Provides foundational types used across all surface domains
 */

// ============================================================================
// Core Identifiers
// ============================================================================

export type EntityId = string;
export type EmployeeId = EntityId;
export type PositionId = EntityId;
export type DepartmentId = EntityId;
export type OrganizationId = EntityId;
export type PayrollId = EntityId;
export type TimesheetId = EntityId;
export type RequisitionId = EntityId;
export type ApplicationId = EntityId;
export type BenefitPlanId = EntityId;
export type EnrollmentId = EntityId;

// ============================================================================
// Date and Time Types
// ============================================================================

export type ISODateString = string; // YYYY-MM-DD format
export type ISODateTimeString = string; // ISO 8601 format
export type TimezoneId = string;

export interface DateRange {
  startDate: ISODateString;
  endDate: ISODateString;
}

export interface TimeRange {
  startTime: ISODateTimeString;
  endTime: ISODateTimeString;
}

// ============================================================================
// Money and Currency
// ============================================================================

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CHF' | string;

// ============================================================================
// Personal Data Types
// ============================================================================

export interface PersonalData {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: ISODateString;
  nationalId?: string;
  email: string;
  phone?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

// ============================================================================
// Employment Types
// ============================================================================

export interface EmploymentData {
  employmentType: EmploymentType;
  workSchedule: WorkSchedule;
  departmentId: DepartmentId;
  managerId?: EmployeeId;
  locationId?: string;
  costCenter?: string;
}

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY' | 'INTERN';

export interface WorkSchedule {
  hoursPerWeek: number;
  scheduleType: 'FIXED' | 'FLEXIBLE' | 'SHIFT';
  timezone: TimezoneId;
}

// ============================================================================
// Compensation Types
// ============================================================================

export interface Compensation {
  baseSalary: Money;
  payFrequency: PayFrequency;
  effectiveDate: ISODateString;
  bonusEligible?: boolean;
  bonusTarget?: number; // Percentage
  equityGrants?: EquityGrant[];
}

export type PayFrequency = 'WEEKLY' | 'BIWEEKLY' | 'SEMIMONTHLY' | 'MONTHLY' | 'ANNUAL';

export interface EquityGrant {
  grantType: 'RSU' | 'STOCK_OPTION' | 'ESPP';
  grantDate: ISODateString;
  vestingSchedule: VestingSchedule;
  quantity: number;
  grantPrice?: Money;
}

export interface VestingSchedule {
  vestingType: 'CLIFF' | 'GRADED' | 'IMMEDIATE';
  vestingPeriodMonths: number;
  cliffMonths?: number;
}

// ============================================================================
// Task Types
// ============================================================================

export interface Task {
  taskId: string;
  title: string;
  description?: string;
  assignedTo?: EmployeeId;
  dueDate?: ISODateString;
  status: TaskStatus;
  priority: TaskPriority;
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// ============================================================================
// Contract Types
// ============================================================================

export interface ContractInput<T> {
  data: T;
  requestedBy: EmployeeId;
  requestedAt: ISODateTimeString;
  correlationId?: string;
}

export interface ContractOutput<T> {
  data: T;
  processedAt: ISODateTimeString;
  correlationId?: string;
}

export interface Precondition<T> {
  name: string;
  description: string;
  check: (input: T) => boolean;
}

export interface Postcondition<T, R> {
  name: string;
  description: string;
  check: (input: T, output: R) => boolean;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrorDetail[];
}

export interface ValidationErrorDetail {
  field: string;
  code: string;
  message: string;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface AuditInfo {
  createdBy: EmployeeId;
  createdAt: ISODateTimeString;
  modifiedBy?: EmployeeId;
  modifiedAt?: ISODateTimeString;
}

// ============================================================================
// Status Types
// ============================================================================

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ApprovalInfo {
  status: ApprovalStatus;
  approvedBy?: EmployeeId;
  approvedAt?: ISODateTimeString;
  comments?: string;
}
