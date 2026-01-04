/**
 * Customer Master Surface Contracts
 * Defines the contract interfaces for customer management operations
 */

import {
  EntityId,
  ISODateString,
  ISODateTimeString,
  Money,
  Address,
  ContractInput,
  ContractOutput,
  Precondition,
  Postcondition,
  ValidationResult,
} from '../../common/types';
import { DomainEvent } from '../../common/events';
import {
  ValidationError,
  PreconditionError,
  NotFoundError,
} from '../../common/errors';
import { CustomerState, CustomerSegment, CustomerHierarchy } from './models';
import {
  CustomerCreatedEvent,
  CustomerUpdatedEvent,
  CustomerSegmentedEvent,
  HierarchyModifiedEvent,
} from './events';

// ============================================================================
// Core Customer Types
// ============================================================================

export type CustomerId = EntityId;
export type AccountId = EntityId;
export type ContactId = EntityId;
export type TerritoryId = EntityId;

export interface CustomerProfile {
  readonly customerId: CustomerId;
  readonly accountNumber: string;
  readonly legalName: string;
  readonly tradingName?: string;
  readonly taxIdentifier?: string;
  readonly industry: string;
  readonly segment: CustomerSegment;
  readonly state: CustomerState;
  readonly billingAddress: Address;
  readonly shippingAddress?: Address;
  readonly primaryContactId?: ContactId;
  readonly accountManagerId?: EntityId;
  readonly territoryId?: TerritoryId;
  readonly creditLimit?: Money;
  readonly paymentTermsDays: number;
  readonly currency: string;
  readonly createdAt: ISODateTimeString;
  readonly modifiedAt: ISODateTimeString;
}

// ============================================================================
// CreateCustomerContract
// ============================================================================

export interface CreateCustomerInput {
  readonly legalName: string;
  readonly tradingName?: string;
  readonly taxIdentifier?: string;
  readonly industry: string;
  readonly billingAddress: Address;
  readonly shippingAddress?: Address;
  readonly primaryContactId?: ContactId;
  readonly accountManagerId?: EntityId;
  readonly territoryId?: TerritoryId;
  readonly creditLimit?: Money;
  readonly paymentTermsDays?: number;
  readonly currency: string;
  readonly metadata?: Record<string, unknown>;
}

export interface CreateCustomerOutput {
  readonly customerId: CustomerId;
  readonly accountNumber: string;
  readonly segment: CustomerSegment;
  readonly state: CustomerState;
  readonly createdAt: ISODateTimeString;
}

export interface CreateCustomerContract {
  readonly name: 'CreateCustomer';
  readonly version: '1.0.0';
  readonly input: ContractInput<CreateCustomerInput>;
  readonly output: ContractOutput<CreateCustomerOutput>;
  readonly preconditions: readonly CreateCustomerPrecondition[];
  readonly postconditions: readonly CreateCustomerPostcondition[];
  readonly events: readonly CustomerCreatedEvent[];
  readonly errors: readonly (ValidationError | PreconditionError)[];
}

export type CreateCustomerPrecondition = Precondition<CreateCustomerInput>;
export type CreateCustomerPostcondition = Postcondition<CreateCustomerInput, CreateCustomerOutput>;

export const createCustomerPreconditions: readonly CreateCustomerPrecondition[] = [
  {
    name: 'ValidLegalName',
    description: 'Legal name must be non-empty and less than 255 characters',
    check: (input) => 
      input.legalName.trim().length > 0 && input.legalName.length <= 255,
  },
  {
    name: 'ValidBillingAddress',
    description: 'Billing address must be complete with all required fields',
    check: (input) =>
      !!input.billingAddress.line1 &&
      !!input.billingAddress.city &&
      !!input.billingAddress.postalCode &&
      !!input.billingAddress.country,
  },
  {
    name: 'ValidCurrency',
    description: 'Currency code must be a valid ISO 4217 code',
    check: (input) => /^[A-Z]{3}$/.test(input.currency),
  },
  {
    name: 'ValidCreditLimit',
    description: 'Credit limit, if provided, must be non-negative',
    check: (input) =>
      !input.creditLimit || input.creditLimit.amount >= 0,
  },
  {
    name: 'ValidPaymentTerms',
    description: 'Payment terms, if provided, must be between 0 and 365 days',
    check: (input) =>
      input.paymentTermsDays === undefined ||
      (input.paymentTermsDays >= 0 && input.paymentTermsDays <= 365),
  },
];

export const createCustomerPostconditions: readonly CreateCustomerPostcondition[] = [
  {
    name: 'CustomerIdGenerated',
    description: 'A unique customer ID must be generated',
    check: (_input, output) =>
      !!output.customerId && output.customerId.length > 0,
  },
  {
    name: 'AccountNumberAssigned',
    description: 'A unique account number must be assigned',
    check: (_input, output) =>
      !!output.accountNumber && /^[A-Z0-9-]+$/.test(output.accountNumber),
  },
  {
    name: 'InitialStateIsProspect',
    description: 'New customer must start in PROSPECT state',
    check: (_input, output) => output.state === 'PROSPECT',
  },
  {
    name: 'SegmentAssigned',
    description: 'Customer must be assigned a segment',
    check: (_input, output) => !!output.segment,
  },
];

// ============================================================================
// UpdateCustomerContract
// ============================================================================

export interface UpdateCustomerInput {
  readonly customerId: CustomerId;
  readonly tradingName?: string;
  readonly billingAddress?: Address;
  readonly shippingAddress?: Address;
  readonly primaryContactId?: ContactId;
  readonly accountManagerId?: EntityId;
  readonly territoryId?: TerritoryId;
  readonly creditLimit?: Money;
  readonly paymentTermsDays?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface UpdateCustomerOutput {
  readonly customerId: CustomerId;
  readonly previousVersion: number;
  readonly newVersion: number;
  readonly changedFields: readonly string[];
  readonly modifiedAt: ISODateTimeString;
}

export interface UpdateCustomerContract {
  readonly name: 'UpdateCustomer';
  readonly version: '1.0.0';
  readonly input: ContractInput<UpdateCustomerInput>;
  readonly output: ContractOutput<UpdateCustomerOutput>;
  readonly preconditions: readonly UpdateCustomerPrecondition[];
  readonly postconditions: readonly UpdateCustomerPostcondition[];
  readonly events: readonly CustomerUpdatedEvent[];
  readonly errors: readonly (ValidationError | NotFoundError | PreconditionError)[];
}

export type UpdateCustomerPrecondition = Precondition<UpdateCustomerInput>;
export type UpdateCustomerPostcondition = Postcondition<UpdateCustomerInput, UpdateCustomerOutput>;

export const updateCustomerPreconditions: readonly UpdateCustomerPrecondition[] = [
  {
    name: 'ValidCustomerId',
    description: 'Customer ID must be a valid non-empty identifier',
    check: (input) => !!input.customerId && input.customerId.length > 0,
  },
  {
    name: 'AtLeastOneFieldToUpdate',
    description: 'At least one field must be provided for update',
    check: (input) =>
      input.tradingName !== undefined ||
      input.billingAddress !== undefined ||
      input.shippingAddress !== undefined ||
      input.primaryContactId !== undefined ||
      input.accountManagerId !== undefined ||
      input.territoryId !== undefined ||
      input.creditLimit !== undefined ||
      input.paymentTermsDays !== undefined ||
      input.metadata !== undefined,
  },
  {
    name: 'ValidCreditLimitIfProvided',
    description: 'Credit limit, if provided, must be non-negative',
    check: (input) =>
      !input.creditLimit || input.creditLimit.amount >= 0,
  },
];

export const updateCustomerPostconditions: readonly UpdateCustomerPostcondition[] = [
  {
    name: 'VersionIncremented',
    description: 'Entity version must be incremented',
    check: (_input, output) => output.newVersion === output.previousVersion + 1,
  },
  {
    name: 'ChangedFieldsTracked',
    description: 'All changed fields must be tracked',
    check: (_input, output) => output.changedFields.length > 0,
  },
  {
    name: 'ModificationTimestampUpdated',
    description: 'Modification timestamp must be updated',
    check: (_input, output) => !!output.modifiedAt,
  },
];

// ============================================================================
// GetCustomerHierarchyContract
// ============================================================================

export interface GetCustomerHierarchyInput {
  readonly customerId: CustomerId;
  readonly includeInactive?: boolean;
  readonly maxDepth?: number;
}

export interface GetCustomerHierarchyOutput {
  readonly hierarchy: CustomerHierarchy;
  readonly totalAccounts: number;
  readonly activeAccounts: number;
  readonly hierarchyDepth: number;
}

export interface GetCustomerHierarchyContract {
  readonly name: 'GetCustomerHierarchy';
  readonly version: '1.0.0';
  readonly input: ContractInput<GetCustomerHierarchyInput>;
  readonly output: ContractOutput<GetCustomerHierarchyOutput>;
  readonly preconditions: readonly GetHierarchyPrecondition[];
  readonly postconditions: readonly GetHierarchyPostcondition[];
  readonly events: readonly DomainEvent[];
  readonly errors: readonly (NotFoundError | PreconditionError)[];
}

export type GetHierarchyPrecondition = Precondition<GetCustomerHierarchyInput>;
export type GetHierarchyPostcondition = Postcondition<GetCustomerHierarchyInput, GetCustomerHierarchyOutput>;

export const getCustomerHierarchyPreconditions: readonly GetHierarchyPrecondition[] = [
  {
    name: 'ValidCustomerId',
    description: 'Customer ID must be valid',
    check: (input) => !!input.customerId && input.customerId.length > 0,
  },
  {
    name: 'ValidMaxDepth',
    description: 'Max depth, if provided, must be between 1 and 10',
    check: (input) =>
      input.maxDepth === undefined ||
      (input.maxDepth >= 1 && input.maxDepth <= 10),
  },
];

export const getCustomerHierarchyPostconditions: readonly GetHierarchyPostcondition[] = [
  {
    name: 'HierarchyContainsRoot',
    description: 'Hierarchy must contain the requested customer as root',
    check: (input, output) =>
      output.hierarchy.rootCustomerId === input.customerId,
  },
  {
    name: 'DepthWithinLimit',
    description: 'Hierarchy depth must not exceed max depth',
    check: (input, output) =>
      !input.maxDepth || output.hierarchyDepth <= input.maxDepth,
  },
  {
    name: 'ActiveCountConsistent',
    description: 'Active accounts must not exceed total accounts',
    check: (_input, output) =>
      output.activeAccounts <= output.totalAccounts,
  },
];

// ============================================================================
// SegmentCustomerContract
// ============================================================================

export interface SegmentCustomerInput {
  readonly customerId: CustomerId;
  readonly newSegment: CustomerSegment;
  readonly reason: string;
  readonly effectiveDate?: ISODateString;
}

export interface SegmentCustomerOutput {
  readonly customerId: CustomerId;
  readonly previousSegment: CustomerSegment;
  readonly newSegment: CustomerSegment;
  readonly effectiveDate: ISODateString;
  readonly segmentedAt: ISODateTimeString;
}

export interface SegmentCustomerContract {
  readonly name: 'SegmentCustomer';
  readonly version: '1.0.0';
  readonly input: ContractInput<SegmentCustomerInput>;
  readonly output: ContractOutput<SegmentCustomerOutput>;
  readonly preconditions: readonly SegmentCustomerPrecondition[];
  readonly postconditions: readonly SegmentCustomerPostcondition[];
  readonly events: readonly CustomerSegmentedEvent[];
  readonly errors: readonly (ValidationError | NotFoundError | PreconditionError)[];
}

export type SegmentCustomerPrecondition = Precondition<SegmentCustomerInput>;
export type SegmentCustomerPostcondition = Postcondition<SegmentCustomerInput, SegmentCustomerOutput>;

export const segmentCustomerPreconditions: readonly SegmentCustomerPrecondition[] = [
  {
    name: 'ValidCustomerId',
    description: 'Customer ID must be valid',
    check: (input) => !!input.customerId && input.customerId.length > 0,
  },
  {
    name: 'ValidSegment',
    description: 'New segment must be a valid segment type',
    check: (input) =>
      ['ENTERPRISE', 'MID_MARKET', 'SMB', 'STARTUP', 'INDIVIDUAL'].includes(
        input.newSegment
      ),
  },
  {
    name: 'ReasonProvided',
    description: 'Reason for segmentation change must be provided',
    check: (input) => !!input.reason && input.reason.trim().length > 0,
  },
  {
    name: 'ValidEffectiveDate',
    description: 'Effective date, if provided, must not be in the past',
    check: (input) => {
      if (!input.effectiveDate) return true;
      const effective = new Date(input.effectiveDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return effective >= today;
    },
  },
];

export const segmentCustomerPostconditions: readonly SegmentCustomerPostcondition[] = [
  {
    name: 'SegmentChanged',
    description: 'Customer segment must be updated to new segment',
    check: (input, output) => output.newSegment === input.newSegment,
  },
  {
    name: 'EffectiveDateSet',
    description: 'Effective date must be set',
    check: (_input, output) => !!output.effectiveDate,
  },
  {
    name: 'PreviousSegmentRecorded',
    description: 'Previous segment must be recorded',
    check: (_input, output) => !!output.previousSegment,
  },
];

// ============================================================================
// CustomerSurface Interface
// ============================================================================

export interface CustomerSurface {
  /**
   * Creates a new customer record
   */
  createCustomer(
    input: ContractInput<CreateCustomerInput>
  ): Promise<ContractOutput<CreateCustomerOutput>>;

  /**
   * Updates an existing customer record
   */
  updateCustomer(
    input: ContractInput<UpdateCustomerInput>
  ): Promise<ContractOutput<UpdateCustomerOutput>>;

  /**
   * Retrieves the customer hierarchy
   */
  getCustomerHierarchy(
    input: ContractInput<GetCustomerHierarchyInput>
  ): Promise<ContractOutput<GetCustomerHierarchyOutput>>;

  /**
   * Updates customer segmentation
   */
  segmentCustomer(
    input: ContractInput<SegmentCustomerInput>
  ): Promise<ContractOutput<SegmentCustomerOutput>>;

  /**
   * Validates customer data without persisting
   */
  validateCustomer(data: CreateCustomerInput): ValidationResult;

  /**
   * Subscribes to customer-related events
   */
  subscribeToEvents(
    handler: (event: CustomerCreatedEvent | CustomerUpdatedEvent | CustomerSegmentedEvent | HierarchyModifiedEvent) => void
  ): () => void;
}

// ============================================================================
// State Transition Rules
// ============================================================================

export interface CustomerStateTransition {
  readonly from: CustomerState;
  readonly to: CustomerState;
  readonly trigger: string;
  readonly guard?: (customer: CustomerProfile) => boolean;
}

export const customerStateTransitions: readonly CustomerStateTransition[] = [
  {
    from: 'PROSPECT',
    to: 'ACTIVE',
    trigger: 'QUALIFY',
    guard: (customer) => !!customer.primaryContactId,
  },
  {
    from: 'ACTIVE',
    to: 'INACTIVE',
    trigger: 'DEACTIVATE',
  },
  {
    from: 'INACTIVE',
    to: 'ACTIVE',
    trigger: 'REACTIVATE',
  },
  {
    from: 'ACTIVE',
    to: 'BLOCKED',
    trigger: 'BLOCK',
  },
  {
    from: 'BLOCKED',
    to: 'ACTIVE',
    trigger: 'UNBLOCK',
  },
  {
    from: 'PROSPECT',
    to: 'INACTIVE',
    trigger: 'DISQUALIFY',
  },
];

export function isValidStateTransition(
  from: CustomerState,
  to: CustomerState
): boolean {
  return customerStateTransitions.some(
    (transition) => transition.from === from && transition.to === to
  );
}

export function getAvailableTransitions(
  currentState: CustomerState
): readonly CustomerState[] {
  return customerStateTransitions
    .filter((transition) => transition.from === currentState)
    .map((transition) => transition.to);
}
