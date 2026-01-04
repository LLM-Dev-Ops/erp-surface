/**
 * Employee Fixtures
 *
 * Deterministic fixtures for EmployeeSurface benchmarking and testing.
 */

import { MonetaryAmount } from '../../common/types/monetary';

/** Hire employee fixture */
export interface HireEmployeeFixture {
  readonly fixtureId: string;
  readonly description: string;
  readonly input: HireEmployeeInput;
  readonly expectedOutput: HireEmployeeOutput;
  readonly tags: string[];
}

interface HireEmployeeInput {
  readonly personalData: {
    readonly firstName: string;
    readonly lastName: string;
    readonly dateOfBirth: string;
    readonly email: string;
    readonly phone: string;
    readonly address: {
      readonly street: string;
      readonly city: string;
      readonly state: string;
      readonly postalCode: string;
      readonly country: string;
    };
  };
  readonly employmentData: {
    readonly employmentType: string;
    readonly department: string;
    readonly jobTitle: string;
    readonly manager: string;
    readonly location: string;
  };
  readonly positionId: string;
  readonly hireDate: string;
  readonly compensation: {
    readonly baseSalary: MonetaryAmount;
    readonly payFrequency: string;
    readonly bonus: {
      readonly targetPercent: number;
      readonly type: string;
    };
  };
}

interface HireEmployeeOutput {
  readonly employeeId: string;
  readonly employmentStatus: string;
  readonly onboardingTasks: Array<{
    readonly taskId: string;
    readonly taskName: string;
    readonly dueDate: string;
    readonly assignee: string;
  }>;
}

/** Standard employee hire */
export const STANDARD_EMPLOYEE_HIRE: HireEmployeeFixture = {
  fixtureId: 'emp-fixture-001',
  description: 'Standard full-time employee hire',
  input: {
    personalData: {
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1990-05-15',
      email: 'jane.doe@example.com',
      phone: '+1-555-0100',
      address: {
        street: '123 Main Street',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        country: 'USA'
      }
    },
    employmentData: {
      employmentType: 'FULL_TIME',
      department: 'Engineering',
      jobTitle: 'Software Engineer',
      manager: 'EMP-MGR-001',
      location: 'HQ-SF'
    },
    positionId: 'POS-ENG-042',
    hireDate: '2024-02-01',
    compensation: {
      baseSalary: { value: 120000.00, currency: 'USD', precision: 2 },
      payFrequency: 'BIWEEKLY',
      bonus: {
        targetPercent: 10,
        type: 'ANNUAL'
      }
    }
  },
  expectedOutput: {
    employeeId: 'EMP-2024-000001',
    employmentStatus: 'ACTIVE',
    onboardingTasks: [
      {
        taskId: 'TASK-001',
        taskName: 'Complete I-9 Form',
        dueDate: '2024-02-04',
        assignee: 'HR-ADMIN'
      },
      {
        taskId: 'TASK-002',
        taskName: 'Setup Workstation',
        dueDate: '2024-02-01',
        assignee: 'IT-SUPPORT'
      },
      {
        taskId: 'TASK-003',
        taskName: 'Benefits Enrollment',
        dueDate: '2024-02-15',
        assignee: 'EMP-2024-000001'
      }
    ]
  },
  tags: ['full-time', 'standard', 'engineering']
};

/** Terminate employee fixture */
export interface TerminateEmployeeFixture {
  readonly fixtureId: string;
  readonly description: string;
  readonly input: TerminateEmployeeInput;
  readonly expectedOutput: TerminateEmployeeOutput;
  readonly tags: string[];
}

interface TerminateEmployeeInput {
  readonly employeeId: string;
  readonly terminationDate: string;
  readonly terminationReason: string;
  readonly finalPayInstructions: {
    readonly includeUnusedPTO: boolean;
    readonly severanceWeeks: number;
    readonly finalPayDate: string;
  };
}

interface TerminateEmployeeOutput {
  readonly terminationId: string;
  readonly finalPayDate: string;
  readonly benefitsEndDate: string;
  readonly exitTasks: Array<{
    readonly taskId: string;
    readonly taskName: string;
    readonly dueDate: string;
    readonly assignee: string;
  }>;
}

/** Voluntary resignation */
export const VOLUNTARY_TERMINATION: TerminateEmployeeFixture = {
  fixtureId: 'emp-fixture-002',
  description: 'Voluntary resignation with standard notice',
  input: {
    employeeId: 'EMP-2020-000042',
    terminationDate: '2024-03-15',
    terminationReason: 'RESIGNATION',
    finalPayInstructions: {
      includeUnusedPTO: true,
      severanceWeeks: 0,
      finalPayDate: '2024-03-15'
    }
  },
  expectedOutput: {
    terminationId: 'TERM-2024-000001',
    finalPayDate: '2024-03-15',
    benefitsEndDate: '2024-03-31',
    exitTasks: [
      {
        taskId: 'EXIT-001',
        taskName: 'Return Equipment',
        dueDate: '2024-03-15',
        assignee: 'EMP-2020-000042'
      },
      {
        taskId: 'EXIT-002',
        taskName: 'Exit Interview',
        dueDate: '2024-03-14',
        assignee: 'HR-BP-001'
      },
      {
        taskId: 'EXIT-003',
        taskName: 'Revoke Access',
        dueDate: '2024-03-15',
        assignee: 'IT-SECURITY'
      }
    ]
  },
  tags: ['resignation', 'voluntary', 'standard-notice']
};

/** All fixtures */
export const EMPLOYEE_FIXTURES = {
  hires: [
    STANDARD_EMPLOYEE_HIRE
  ],
  terminations: [
    VOLUNTARY_TERMINATION
  ]
};
