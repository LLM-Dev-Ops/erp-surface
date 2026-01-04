/**
 * HCM (Human Capital Management) Surface Module
 *
 * This module exports all HCM domain surfaces including:
 * - Employee: Hire, terminate, transfer, promote operations
 * - Payroll: Run payroll, calculate deductions, generate tax reports
 * - Time: Record time entries, approve timesheets, record absences
 * - Talent: Create requisitions, submit applications, evaluate performance
 * - Benefits: Enroll benefits, process life events, calculate eligibility
 */

// Employee Surface
export * from './employee';

// Payroll Surface
export * from './payroll';

// Time Surface
export * from './time';

// Talent Surface
export * from './talent';

// Benefits Surface
export * from './benefits';

// Re-export surface definitions for easy access
export { employeeSurface } from './employee/contracts';
export { payrollSurface } from './payroll/contracts';
export { timeSurface } from './time/contracts';
export { talentSurface } from './talent/contracts';
export { benefitsSurface } from './benefits/contracts';

// Aggregate HCM Surface type
import { EmployeeSurface } from './employee/contracts';
import { PayrollSurface } from './payroll/contracts';
import { TimeSurface } from './time/contracts';
import { TalentSurface } from './talent/contracts';
import { BenefitsSurface } from './benefits/contracts';

export interface HCMSurface {
  employee: EmployeeSurface;
  payroll: PayrollSurface;
  time: TimeSurface;
  talent: TalentSurface;
  benefits: BenefitsSurface;
}
