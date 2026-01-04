/**
 * Quote Surface Contracts
 * Defines the contract interfaces for sales quote management
 */

import {
  EntityId,
  ISODateString,
  ISODateTimeString,
  Money,
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
  StateTransitionError,
} from '../../common/errors';

// ============================================================================
// Core Quote Types
// ============================================================================

export type QuoteId = EntityId;
export type QuoteNumber = string;
export type QuoteLineId = EntityId;
export type CustomerId = EntityId;
export type ContactId = EntityId;
export type OpportunityId = EntityId;
export type ProductId = EntityId;
export type PriceListId = EntityId;
export type ApprovalId = EntityId;

export type QuoteState =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'OVERRIDE_PRICE';

export interface QuoteLine {
  readonly lineId: QuoteLineId;
  readonly lineNumber: number;
  readonly productId: ProductId;
  readonly productName: string;
  readonly description?: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly discountType?: DiscountType;
  readonly discountValue?: number;
  readonly discountAmount: Money;
  readonly lineTotal: Money;
  readonly taxRate?: number;
  readonly taxAmount?: Money;
}

export interface QuoteProfile {
  readonly quoteId: QuoteId;
  readonly quoteNumber: QuoteNumber;
  readonly customerId: CustomerId;
  readonly contactId?: ContactId;
  readonly opportunityId?: OpportunityId;
  readonly state: QuoteState;
  readonly priceListId?: PriceListId;
  readonly currency: string;
  readonly lines: readonly QuoteLine[];
  readonly subtotal: Money;
  readonly totalDiscount: Money;
  readonly totalTax: Money;
  readonly grandTotal: Money;
  readonly validFrom: ISODateString;
  readonly validTo: ISODateString;
  readonly terms?: string;
  readonly notes?: string;
  readonly createdAt: ISODateTimeString;
  readonly modifiedAt: ISODateTimeString;
  readonly sentAt?: ISODateTimeString;
  readonly acceptedAt?: ISODateTimeString;
}

// ============================================================================
// CreateQuoteContract
// ============================================================================

export interface CreateQuoteInput {
  readonly customerId: CustomerId;
  readonly contactId?: ContactId;
  readonly opportunityId?: OpportunityId;
  readonly priceListId?: PriceListId;
  readonly currency: string;
  readonly validityDays?: number;
  readonly terms?: string;
  readonly notes?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface CreateQuoteOutput {
  readonly quoteId: QuoteId;
  readonly quoteNumber: QuoteNumber;
  readonly state: QuoteState;
  readonly validFrom: ISODateString;
  readonly validTo: ISODateString;
  readonly createdAt: ISODateTimeString;
}

export interface CreateQuoteContract {
  readonly name: 'CreateQuote';
  readonly version: '1.0.0';
  readonly input: ContractInput<CreateQuoteInput>;
  readonly output: ContractOutput<CreateQuoteOutput>;
  readonly preconditions: readonly Precondition<CreateQuoteInput>[];
  readonly postconditions: readonly Postcondition<CreateQuoteInput, CreateQuoteOutput>[];
  readonly events: readonly QuoteCreatedEvent[];
  readonly errors: readonly (ValidationError | PreconditionError)[];
}

export const createQuotePreconditions: readonly Precondition<CreateQuoteInput>[] = [
  {
    name: 'ValidCustomerId',
    description: 'Customer ID must be a valid non-empty identifier',
    check: (input) => !!input.customerId && input.customerId.length > 0,
  },
  {
    name: 'ValidCurrency',
    description: 'Currency code must be a valid ISO 4217 code',
    check: (input) => /^[A-Z]{3}$/.test(input.currency),
  },
  {
    name: 'ValidValidityDays',
    description: 'Validity days, if provided, must be between 1 and 365',
    check: (input) =>
      input.validityDays === undefined ||
      (input.validityDays >= 1 && input.validityDays <= 365),
  },
];

export const createQuotePostconditions: readonly Postcondition<CreateQuoteInput, CreateQuoteOutput>[] = [
  {
    name: 'QuoteIdGenerated',
    description: 'A unique quote ID must be generated',
    check: (_input, output) =>
      !!output.quoteId && output.quoteId.length > 0,
  },
  {
    name: 'QuoteNumberGenerated',
    description: 'A unique quote number must be generated',
    check: (_input, output) =>
      !!output.quoteNumber && /^[A-Z0-9-]+$/.test(output.quoteNumber),
  },
  {
    name: 'InitialStateIsDraft',
    description: 'New quote must start in DRAFT state',
    check: (_input, output) => output.state === 'DRAFT',
  },
  {
    name: 'ValidityDatesSet',
    description: 'Valid from and valid to dates must be set',
    check: (_input, output) =>
      !!output.validFrom &&
      !!output.validTo &&
      new Date(output.validTo) > new Date(output.validFrom),
  },
];

// ============================================================================
// AddQuoteLineContract
// ============================================================================

export interface AddQuoteLineInput {
  readonly quoteId: QuoteId;
  readonly productId: ProductId;
  readonly quantity: number;
  readonly unitPriceOverride?: Money;
  readonly description?: string;
  readonly discountType?: DiscountType;
  readonly discountValue?: number;
}

export interface AddQuoteLineOutput {
  readonly quoteId: QuoteId;
  readonly lineId: QuoteLineId;
  readonly lineNumber: number;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly discountAmount: Money;
  readonly lineTotal: Money;
  readonly newSubtotal: Money;
  readonly newGrandTotal: Money;
}

export interface AddQuoteLineContract {
  readonly name: 'AddQuoteLine';
  readonly version: '1.0.0';
  readonly input: ContractInput<AddQuoteLineInput>;
  readonly output: ContractOutput<AddQuoteLineOutput>;
  readonly preconditions: readonly Precondition<AddQuoteLineInput>[];
  readonly postconditions: readonly Postcondition<AddQuoteLineInput, AddQuoteLineOutput>[];
  readonly events: readonly QuoteLineAddedEvent[];
  readonly errors: readonly (NotFoundError | ValidationError | PreconditionError)[];
}

export const addQuoteLinePreconditions: readonly Precondition<AddQuoteLineInput>[] = [
  {
    name: 'ValidQuoteId',
    description: 'Quote ID must be valid',
    check: (input) => !!input.quoteId && input.quoteId.length > 0,
  },
  {
    name: 'ValidProductId',
    description: 'Product ID must be valid',
    check: (input) => !!input.productId && input.productId.length > 0,
  },
  {
    name: 'ValidQuantity',
    description: 'Quantity must be greater than zero',
    check: (input) => input.quantity > 0,
  },
  {
    name: 'ValidDiscount',
    description: 'Discount value, if provided, must be valid for the discount type',
    check: (input) => {
      if (input.discountType === undefined) return true;
      if (input.discountValue === undefined) return false;
      if (input.discountType === 'PERCENTAGE') {
        return input.discountValue >= 0 && input.discountValue <= 100;
      }
      return input.discountValue >= 0;
    },
  },
];

export const addQuoteLinePostconditions: readonly Postcondition<AddQuoteLineInput, AddQuoteLineOutput>[] = [
  {
    name: 'LineIdGenerated',
    description: 'A unique line ID must be generated',
    check: (_input, output) =>
      !!output.lineId && output.lineId.length > 0,
  },
  {
    name: 'QuantityMatches',
    description: 'Output quantity must match input quantity',
    check: (input, output) => output.quantity === input.quantity,
  },
  {
    name: 'TotalsRecalculated',
    description: 'Quote totals must be recalculated',
    check: (_input, output) =>
      output.newSubtotal.amount >= 0 && output.newGrandTotal.amount >= 0,
  },
];

// ============================================================================
// ApplyDiscountContract
// ============================================================================

export interface ApplyDiscountInput {
  readonly quoteId: QuoteId;
  readonly discountType: DiscountType;
  readonly discountValue: number;
  readonly applyTo: 'QUOTE' | 'LINE';
  readonly lineId?: QuoteLineId;
  readonly reason: string;
  readonly approvalRequired?: boolean;
}

export interface ApplyDiscountOutput {
  readonly quoteId: QuoteId;
  readonly discountId: EntityId;
  readonly previousTotal: Money;
  readonly discountAmount: Money;
  readonly newTotal: Money;
  readonly discountPercentage: number;
  readonly requiresApproval: boolean;
  readonly approvalThreshold?: number;
}

export interface ApplyDiscountContract {
  readonly name: 'ApplyDiscount';
  readonly version: '1.0.0';
  readonly input: ContractInput<ApplyDiscountInput>;
  readonly output: ContractOutput<ApplyDiscountOutput>;
  readonly preconditions: readonly Precondition<ApplyDiscountInput>[];
  readonly postconditions: readonly Postcondition<ApplyDiscountInput, ApplyDiscountOutput>[];
  readonly events: readonly QuoteDiscountAppliedEvent[];
  readonly errors: readonly (NotFoundError | ValidationError | PreconditionError)[];
}

export const applyDiscountPreconditions: readonly Precondition<ApplyDiscountInput>[] = [
  {
    name: 'ValidQuoteId',
    description: 'Quote ID must be valid',
    check: (input) => !!input.quoteId && input.quoteId.length > 0,
  },
  {
    name: 'ValidDiscountType',
    description: 'Discount type must be valid',
    check: (input) =>
      ['PERCENTAGE', 'FIXED_AMOUNT', 'OVERRIDE_PRICE'].includes(input.discountType),
  },
  {
    name: 'ValidDiscountValue',
    description: 'Discount value must be valid for the type',
    check: (input) => {
      if (input.discountType === 'PERCENTAGE') {
        return input.discountValue >= 0 && input.discountValue <= 100;
      }
      return input.discountValue >= 0;
    },
  },
  {
    name: 'LineIdRequiredForLineDiscount',
    description: 'Line ID is required when applying discount to a line',
    check: (input) =>
      input.applyTo !== 'LINE' ||
      (!!input.lineId && input.lineId.length > 0),
  },
  {
    name: 'ReasonProvided',
    description: 'Discount reason must be provided',
    check: (input) => !!input.reason && input.reason.trim().length > 0,
  },
];

export const applyDiscountPostconditions: readonly Postcondition<ApplyDiscountInput, ApplyDiscountOutput>[] = [
  {
    name: 'DiscountApplied',
    description: 'Discount must be applied',
    check: (_input, output) => output.discountAmount.amount >= 0,
  },
  {
    name: 'TotalReduced',
    description: 'New total must be less than or equal to previous total',
    check: (_input, output) =>
      output.newTotal.amount <= output.previousTotal.amount,
  },
  {
    name: 'ApprovalFlagSet',
    description: 'Approval requirement flag must be set',
    check: (_input, output) => typeof output.requiresApproval === 'boolean',
  },
];

// ============================================================================
// ApproveQuoteContract
// ============================================================================

export type ApprovalDecision = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

export interface ApproveQuoteInput {
  readonly quoteId: QuoteId;
  readonly decision: ApprovalDecision;
  readonly comments?: string;
  readonly approverLevel: number;
  readonly requestedChanges?: string;
}

export interface ApproveQuoteOutput {
  readonly quoteId: QuoteId;
  readonly approvalId: ApprovalId;
  readonly decision: ApprovalDecision;
  readonly previousState: QuoteState;
  readonly newState: QuoteState;
  readonly approverLevel: number;
  readonly finalApproval: boolean;
  readonly approvedAt: ISODateTimeString;
}

export interface ApproveQuoteContract {
  readonly name: 'ApproveQuote';
  readonly version: '1.0.0';
  readonly input: ContractInput<ApproveQuoteInput>;
  readonly output: ContractOutput<ApproveQuoteOutput>;
  readonly preconditions: readonly Precondition<ApproveQuoteInput>[];
  readonly postconditions: readonly Postcondition<ApproveQuoteInput, ApproveQuoteOutput>[];
  readonly events: readonly QuoteApprovalEvent[];
  readonly errors: readonly (NotFoundError | StateTransitionError | PreconditionError)[];
}

export const approveQuotePreconditions: readonly Precondition<ApproveQuoteInput>[] = [
  {
    name: 'ValidQuoteId',
    description: 'Quote ID must be valid',
    check: (input) => !!input.quoteId && input.quoteId.length > 0,
  },
  {
    name: 'ValidDecision',
    description: 'Decision must be valid',
    check: (input) =>
      ['APPROVE', 'REJECT', 'REQUEST_CHANGES'].includes(input.decision),
  },
  {
    name: 'ValidApproverLevel',
    description: 'Approver level must be positive',
    check: (input) => input.approverLevel > 0,
  },
  {
    name: 'ChangesRequiredForRequestChanges',
    description: 'Requested changes must be provided when requesting changes',
    check: (input) =>
      input.decision !== 'REQUEST_CHANGES' ||
      (!!input.requestedChanges && input.requestedChanges.trim().length > 0),
  },
];

export const approveQuotePostconditions: readonly Postcondition<ApproveQuoteInput, ApproveQuoteOutput>[] = [
  {
    name: 'ApprovalIdGenerated',
    description: 'An approval ID must be generated',
    check: (_input, output) =>
      !!output.approvalId && output.approvalId.length > 0,
  },
  {
    name: 'DecisionRecorded',
    description: 'Decision must be recorded',
    check: (input, output) => output.decision === input.decision,
  },
  {
    name: 'StateTransitioned',
    description: 'Quote state must be transitioned appropriately',
    check: (input, output) => {
      if (input.decision === 'APPROVE' && output.finalApproval) {
        return output.newState === 'APPROVED';
      }
      if (input.decision === 'REJECT') {
        return output.newState === 'REJECTED';
      }
      if (input.decision === 'REQUEST_CHANGES') {
        return output.newState === 'DRAFT';
      }
      return output.newState === 'PENDING_APPROVAL';
    },
  },
];

// ============================================================================
// Event Definitions
// ============================================================================

export const QUOTE_EVENT_TYPES = {
  QUOTE_CREATED: 'quote.created',
  QUOTE_LINE_ADDED: 'quote.line.added',
  QUOTE_LINE_REMOVED: 'quote.line.removed',
  QUOTE_LINE_UPDATED: 'quote.line.updated',
  QUOTE_DISCOUNT_APPLIED: 'quote.discount.applied',
  QUOTE_APPROVAL: 'quote.approval',
  QUOTE_SENT: 'quote.sent',
  QUOTE_ACCEPTED: 'quote.accepted',
  QUOTE_REJECTED: 'quote.rejected',
  QUOTE_EXPIRED: 'quote.expired',
  QUOTE_STATE_CHANGED: 'quote.state.changed',
} as const;

export interface QuoteCreatedPayload {
  readonly quoteId: QuoteId;
  readonly quoteNumber: QuoteNumber;
  readonly customerId: CustomerId;
  readonly contactId?: ContactId;
  readonly opportunityId?: OpportunityId;
  readonly currency: string;
  readonly validFrom: ISODateString;
  readonly validTo: ISODateString;
}

export interface QuoteCreatedEvent extends DomainEvent<QuoteCreatedPayload> {
  readonly eventType: typeof QUOTE_EVENT_TYPES.QUOTE_CREATED;
  readonly aggregateType: 'Quote';
}

export interface QuoteLineAddedPayload {
  readonly quoteId: QuoteId;
  readonly lineId: QuoteLineId;
  readonly lineNumber: number;
  readonly productId: ProductId;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly lineTotal: Money;
  readonly newQuoteTotal: Money;
}

export interface QuoteLineAddedEvent extends DomainEvent<QuoteLineAddedPayload> {
  readonly eventType: typeof QUOTE_EVENT_TYPES.QUOTE_LINE_ADDED;
  readonly aggregateType: 'Quote';
}

export interface QuoteDiscountAppliedPayload {
  readonly quoteId: QuoteId;
  readonly discountId: EntityId;
  readonly discountType: DiscountType;
  readonly discountValue: number;
  readonly discountAmount: Money;
  readonly applyTo: 'QUOTE' | 'LINE';
  readonly lineId?: QuoteLineId;
  readonly reason: string;
  readonly previousTotal: Money;
  readonly newTotal: Money;
  readonly requiresApproval: boolean;
}

export interface QuoteDiscountAppliedEvent extends DomainEvent<QuoteDiscountAppliedPayload> {
  readonly eventType: typeof QUOTE_EVENT_TYPES.QUOTE_DISCOUNT_APPLIED;
  readonly aggregateType: 'Quote';
}

export interface QuoteApprovalPayload {
  readonly quoteId: QuoteId;
  readonly approvalId: ApprovalId;
  readonly decision: ApprovalDecision;
  readonly approverLevel: number;
  readonly approverId: EntityId;
  readonly comments?: string;
  readonly requestedChanges?: string;
  readonly finalApproval: boolean;
  readonly previousState: QuoteState;
  readonly newState: QuoteState;
}

export interface QuoteApprovalEvent extends DomainEvent<QuoteApprovalPayload> {
  readonly eventType: typeof QUOTE_EVENT_TYPES.QUOTE_APPROVAL;
  readonly aggregateType: 'Quote';
}

export interface QuoteSentPayload {
  readonly quoteId: QuoteId;
  readonly quoteNumber: QuoteNumber;
  readonly sentTo: readonly string[];
  readonly sentBy: EntityId;
  readonly channel: 'EMAIL' | 'PORTAL' | 'PDF';
}

export interface QuoteSentEvent extends DomainEvent<QuoteSentPayload> {
  readonly eventType: typeof QUOTE_EVENT_TYPES.QUOTE_SENT;
  readonly aggregateType: 'Quote';
}

export interface QuoteAcceptedPayload {
  readonly quoteId: QuoteId;
  readonly quoteNumber: QuoteNumber;
  readonly acceptedBy: string;
  readonly acceptedTotal: Money;
  readonly signatureId?: EntityId;
}

export interface QuoteAcceptedEvent extends DomainEvent<QuoteAcceptedPayload> {
  readonly eventType: typeof QUOTE_EVENT_TYPES.QUOTE_ACCEPTED;
  readonly aggregateType: 'Quote';
}

// ============================================================================
// QuoteSurface Interface
// ============================================================================

export interface QuoteSurface {
  createQuote(
    input: ContractInput<CreateQuoteInput>
  ): Promise<ContractOutput<CreateQuoteOutput>>;

  addQuoteLine(
    input: ContractInput<AddQuoteLineInput>
  ): Promise<ContractOutput<AddQuoteLineOutput>>;

  applyDiscount(
    input: ContractInput<ApplyDiscountInput>
  ): Promise<ContractOutput<ApplyDiscountOutput>>;

  approveQuote(
    input: ContractInput<ApproveQuoteInput>
  ): Promise<ContractOutput<ApproveQuoteOutput>>;

  validateQuote(data: CreateQuoteInput): ValidationResult;

  subscribeToEvents(
    handler: (
      event:
        | QuoteCreatedEvent
        | QuoteLineAddedEvent
        | QuoteDiscountAppliedEvent
        | QuoteApprovalEvent
        | QuoteSentEvent
        | QuoteAcceptedEvent
    ) => void
  ): () => void;
}

// ============================================================================
// State Machine Helpers
// ============================================================================

export const quoteStateTransitionMatrix: Record<QuoteState, readonly QuoteState[]> = {
  DRAFT: ['IN_REVIEW', 'PENDING_APPROVAL', 'CANCELLED'],
  IN_REVIEW: ['DRAFT', 'PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['DRAFT', 'APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['SENT', 'CANCELLED'],
  SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
  ACCEPTED: [],
  REJECTED: ['DRAFT'],
  EXPIRED: ['DRAFT'],
  CANCELLED: [],
} as const;

export function canTransitionQuoteTo(
  currentState: QuoteState,
  targetState: QuoteState
): boolean {
  const allowedTransitions = quoteStateTransitionMatrix[currentState];
  return allowedTransitions.includes(targetState);
}

export function generateQuoteNumber(sequenceNumber: number): QuoteNumber {
  const year = new Date().getFullYear();
  const paddedSequence = sequenceNumber.toString().padStart(6, '0');
  return `QT-${year}-${paddedSequence}`;
}

// ============================================================================
// Discount Calculation Helpers
// ============================================================================

export function calculateLineDiscount(
  unitPrice: Money,
  quantity: number,
  discountType: DiscountType,
  discountValue: number
): Money {
  const lineTotal = unitPrice.amount * quantity;

  switch (discountType) {
    case 'PERCENTAGE':
      return {
        amount: lineTotal * (discountValue / 100),
        currency: unitPrice.currency,
      };
    case 'FIXED_AMOUNT':
      return {
        amount: Math.min(discountValue, lineTotal),
        currency: unitPrice.currency,
      };
    case 'OVERRIDE_PRICE':
      return {
        amount: Math.max(0, lineTotal - discountValue * quantity),
        currency: unitPrice.currency,
      };
    default:
      return { amount: 0, currency: unitPrice.currency };
  }
}

export function calculateQuoteTotals(
  lines: readonly QuoteLine[]
): {
  readonly subtotal: Money;
  readonly totalDiscount: Money;
  readonly totalTax: Money;
  readonly grandTotal: Money;
} {
  if (lines.length === 0) {
    return {
      subtotal: { amount: 0, currency: 'USD' },
      totalDiscount: { amount: 0, currency: 'USD' },
      totalTax: { amount: 0, currency: 'USD' },
      grandTotal: { amount: 0, currency: 'USD' },
    };
  }

  const currency = lines[0].unitPrice.currency;

  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice.amount * line.quantity,
    0
  );

  const totalDiscount = lines.reduce(
    (sum, line) => sum + line.discountAmount.amount,
    0
  );

  const totalTax = lines.reduce(
    (sum, line) => sum + (line.taxAmount?.amount ?? 0),
    0
  );

  const grandTotal = subtotal - totalDiscount + totalTax;

  return {
    subtotal: { amount: subtotal, currency },
    totalDiscount: { amount: totalDiscount, currency },
    totalTax: { amount: totalTax, currency },
    grandTotal: { amount: grandTotal, currency },
  };
}

// ============================================================================
// Approval Threshold Configuration
// ============================================================================

export interface ApprovalThreshold {
  readonly level: number;
  readonly maxDiscountPercentage: number;
  readonly maxTotalAmount: Money;
  readonly roleName: string;
}

export const defaultApprovalThresholds: readonly ApprovalThreshold[] = [
  {
    level: 1,
    maxDiscountPercentage: 10,
    maxTotalAmount: { amount: 10000, currency: 'USD' },
    roleName: 'Sales Representative',
  },
  {
    level: 2,
    maxDiscountPercentage: 20,
    maxTotalAmount: { amount: 50000, currency: 'USD' },
    roleName: 'Sales Manager',
  },
  {
    level: 3,
    maxDiscountPercentage: 35,
    maxTotalAmount: { amount: 250000, currency: 'USD' },
    roleName: 'Sales Director',
  },
  {
    level: 4,
    maxDiscountPercentage: 50,
    maxTotalAmount: { amount: 1000000, currency: 'USD' },
    roleName: 'VP Sales',
  },
];

export function getRequiredApprovalLevel(
  discountPercentage: number,
  totalAmount: Money
): number {
  for (const threshold of defaultApprovalThresholds) {
    if (
      discountPercentage <= threshold.maxDiscountPercentage &&
      totalAmount.amount <= threshold.maxTotalAmount.amount
    ) {
      return threshold.level;
    }
  }
  return defaultApprovalThresholds.length + 1; // Requires executive approval
}
