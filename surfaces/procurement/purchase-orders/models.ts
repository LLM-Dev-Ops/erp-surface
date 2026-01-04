/**
 * Purchase Order State Models for ERP Surface Contracts
 *
 * State machines for purchase orders and purchase order line items.
 * All state transitions are observable and support deterministic replay.
 */

import { Timestamp, DateString } from '../../../common/types/temporal';
import {
  MonetaryAmount,
  TaxAmount,
  PaymentTerms
} from '../../../common/types/monetary';
import {
  PONumber,
  SupplierId,
  MaterialId,
  CostCenter,
  UserId,
  UUID,
  Identifier,
  OrgUnitReference
} from '../../../common/types/identity';

// ============================================================================
// Purchase Order State Machine
// ============================================================================

/** Purchase order states */
export type POState =
  | 'NEW'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PARTIALLY_RECEIVED'
  | 'FULLY_RECEIVED'
  | 'CANCELLED';

/** Valid state transitions for purchase orders */
export const PO_STATE_TRANSITIONS: Record<POState, POState[]> = {
  NEW: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'NEW', 'CANCELLED'],
  APPROVED: ['PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['FULLY_RECEIVED', 'CANCELLED'],
  FULLY_RECEIVED: [], // Terminal state
  CANCELLED: [] // Terminal state
};

/** State transition triggers for purchase orders */
export type POStateTransitionTrigger =
  | 'SUBMIT_FOR_APPROVAL'
  | 'RETURN_TO_DRAFT'
  | 'APPROVE'
  | 'REJECT'
  | 'RECEIVE_PARTIAL'
  | 'RECEIVE_COMPLETE'
  | 'CANCEL';

/** Map of triggers to target states */
export const PO_TRIGGER_TO_STATE: Record<POStateTransitionTrigger, POState> = {
  SUBMIT_FOR_APPROVAL: 'PENDING_APPROVAL',
  RETURN_TO_DRAFT: 'NEW',
  APPROVE: 'APPROVED',
  REJECT: 'NEW',
  RECEIVE_PARTIAL: 'PARTIALLY_RECEIVED',
  RECEIVE_COMPLETE: 'FULLY_RECEIVED',
  CANCEL: 'CANCELLED'
};

// ============================================================================
// Purchase Order Line State Machine
// ============================================================================

/** Purchase order line item states */
export type POLineState =
  | 'OPEN'
  | 'PARTIALLY_RECEIVED'
  | 'FULLY_RECEIVED'
  | 'CANCELLED';

/** Valid state transitions for PO line items */
export const PO_LINE_STATE_TRANSITIONS: Record<POLineState, POLineState[]> = {
  OPEN: ['PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['FULLY_RECEIVED', 'CANCELLED'],
  FULLY_RECEIVED: [], // Terminal state
  CANCELLED: [] // Terminal state
};

/** State transition triggers for PO line items */
export type POLineStateTransitionTrigger =
  | 'RECEIVE_PARTIAL'
  | 'RECEIVE_COMPLETE'
  | 'CANCEL_LINE';

// ============================================================================
// Purchase Order Header
// ============================================================================

/** Purchase order header */
export interface POHeader {
  /** Unique PO number (system-assigned) */
  readonly poNumber: PONumber;

  /** Supplier reference */
  readonly supplierId: SupplierId;

  /** Document date */
  readonly documentDate: DateString;

  /** Requested delivery date */
  readonly requestedDeliveryDate: DateString;

  /** Payment terms */
  readonly paymentTerms: PaymentTerms;

  /** Organizational unit */
  readonly orgUnit: OrgUnitReference;

  /** Currency for the PO */
  readonly currency: string;

  /** Shipping address */
  readonly shippingAddress: Address;

  /** Billing address */
  readonly billingAddress: Address;

  /** Free-text notes */
  readonly notes?: string;

  /** External reference (e.g., requisition number) */
  readonly externalReference?: string;
}

/** Address structure */
export interface Address {
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly region: string;
  readonly postalCode: string;
  readonly country: string;
}

/** Purchase order header input (for creation) */
export interface POHeaderInput {
  readonly supplierId: SupplierId;
  readonly documentDate: DateString;
  readonly requestedDeliveryDate: DateString;
  readonly paymentTerms: PaymentTerms;
  readonly orgUnit: OrgUnitReference;
  readonly currency: string;
  readonly shippingAddress: Address;
  readonly billingAddress: Address;
  readonly notes?: string;
  readonly externalReference?: string;
}

// ============================================================================
// Purchase Order Line Items
// ============================================================================

/** Purchase order line item */
export interface POLineItem {
  /** Line item number (1-based) */
  readonly lineNumber: number;

  /** Line item unique ID */
  readonly lineId: UUID;

  /** Material/service identifier */
  readonly materialId: MaterialId;

  /** Material description */
  readonly description: string;

  /** Quantity ordered */
  readonly quantity: number;

  /** Unit of measure */
  readonly unitOfMeasure: string;

  /** Unit price */
  readonly unitPrice: MonetaryAmount;

  /** Extended price (quantity * unit price) */
  readonly extendedPrice: MonetaryAmount;

  /** Tax information */
  readonly tax: TaxAmount;

  /** Cost center assignment */
  readonly costCenter: CostCenter;

  /** GL account for posting */
  readonly glAccount: string;

  /** Current line state */
  readonly state: POLineState;

  /** Quantity received to date */
  readonly quantityReceived: number;

  /** Quantity open (quantity - received) */
  readonly quantityOpen: number;

  /** Expected delivery date for this line */
  readonly expectedDeliveryDate?: DateString;
}

/** Purchase order line item input (for creation) */
export interface POLineItemInput {
  readonly materialId: MaterialId;
  readonly description: string;
  readonly quantity: number;
  readonly unitOfMeasure: string;
  readonly unitPrice: MonetaryAmount;
  readonly costCenter: CostCenter;
  readonly glAccount: string;
  readonly expectedDeliveryDate?: DateString;
}

// ============================================================================
// Purchase Order Entity
// ============================================================================

/** Complete purchase order entity */
export interface PurchaseOrder {
  /** Header information */
  readonly header: POHeader;

  /** Line items */
  readonly lineItems: readonly POLineItem[];

  /** Current order state */
  readonly state: POState;

  /** Requestor user ID */
  readonly requestorId: UserId;

  /** Current approver user ID (if in approval) */
  readonly currentApproverId?: UserId;

  /** Total order value (sum of line extended prices) */
  readonly totalValue: MonetaryAmount;

  /** Total tax amount */
  readonly totalTax: MonetaryAmount;

  /** Grand total (totalValue + totalTax) */
  readonly grandTotal: MonetaryAmount;

  /** Creation timestamp */
  readonly createdAt: Timestamp;

  /** Last modification timestamp */
  readonly modifiedAt: Timestamp;

  /** Created by user ID */
  readonly createdBy: UserId;

  /** Modified by user ID */
  readonly modifiedBy: UserId;

  /** Version for optimistic locking */
  readonly version: number;
}

// ============================================================================
// Approval Workflow
// ============================================================================

/** Approval route for a purchase order */
export interface ApprovalRoute {
  /** Route ID */
  readonly routeId: UUID;

  /** Approval steps */
  readonly steps: readonly ApprovalStep[];

  /** Current step index (0-based) */
  readonly currentStepIndex: number;

  /** Route status */
  readonly status: ApprovalRouteStatus;
}

/** Approval step */
export interface ApprovalStep {
  /** Step index (0-based) */
  readonly stepIndex: number;

  /** Approver user ID */
  readonly approverId: UserId;

  /** Approval threshold (max amount this level can approve) */
  readonly threshold: MonetaryAmount;

  /** Step status */
  readonly status: ApprovalStepStatus;

  /** Approval/rejection timestamp */
  readonly completedAt?: Timestamp;

  /** Comments from approver */
  readonly comments?: string;
}

/** Approval route status */
export type ApprovalRouteStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

/** Approval step status */
export type ApprovalStepStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SKIPPED';

// ============================================================================
// Goods Receipt
// ============================================================================

/** Goods receipt line */
export interface GoodsReceiptLine {
  /** Receipt line ID */
  readonly receiptLineId: UUID;

  /** Reference to PO line number */
  readonly poLineNumber: number;

  /** Reference to PO line ID */
  readonly poLineId: UUID;

  /** Material ID */
  readonly materialId: MaterialId;

  /** Quantity received */
  readonly quantityReceived: number;

  /** Unit of measure */
  readonly unitOfMeasure: string;

  /** Received in good condition */
  readonly acceptedQuantity: number;

  /** Rejected quantity (damaged, wrong item, etc.) */
  readonly rejectedQuantity: number;

  /** Rejection reason (if any) */
  readonly rejectionReason?: string;

  /** Storage location */
  readonly storageLocation?: string;

  /** Batch/lot number (if applicable) */
  readonly batchNumber?: string;
}

/** Goods receipt input */
export interface GoodsReceiptLineInput {
  readonly poLineNumber: number;
  readonly quantityReceived: number;
  readonly acceptedQuantity: number;
  readonly rejectedQuantity: number;
  readonly rejectionReason?: string;
  readonly storageLocation?: string;
  readonly batchNumber?: string;
}

/** Goods receipt document */
export interface GoodsReceipt {
  /** Receipt number */
  readonly receiptNumber: Identifier;

  /** Reference PO number */
  readonly poNumber: PONumber;

  /** Receipt date */
  readonly receiptDate: DateString;

  /** Delivery note reference */
  readonly deliveryNote?: string;

  /** Receipt lines */
  readonly lines: readonly GoodsReceiptLine[];

  /** Receipt status */
  readonly status: GoodsReceiptStatus;

  /** Total items received */
  readonly totalReceived: number;

  /** Total items accepted */
  readonly totalAccepted: number;

  /** Total items rejected */
  readonly totalRejected: number;

  /** Received by user ID */
  readonly receivedBy: UserId;

  /** Creation timestamp */
  readonly createdAt: Timestamp;
}

/** Goods receipt status */
export type GoodsReceiptStatus =
  | 'DRAFT'
  | 'POSTED'
  | 'CANCELLED';

// ============================================================================
// Variance Report
// ============================================================================

/** Variance type */
export type VarianceType =
  | 'OVER_RECEIPT'
  | 'UNDER_RECEIPT'
  | 'QUALITY_REJECTION'
  | 'EARLY_DELIVERY'
  | 'LATE_DELIVERY';

/** Variance item */
export interface VarianceItem {
  readonly lineNumber: number;
  readonly varianceType: VarianceType;
  readonly expectedQuantity: number;
  readonly actualQuantity: number;
  readonly varianceQuantity: number;
  readonly variancePercent: number;
  readonly description: string;
}

/** Variance report */
export interface VarianceReport {
  readonly poNumber: PONumber;
  readonly receiptNumber: Identifier;
  readonly variances: readonly VarianceItem[];
  readonly hasVariances: boolean;
  readonly totalVarianceCount: number;
}

// ============================================================================
// State Machine Operations
// ============================================================================

/** Check if a state transition is valid */
export const isValidPOTransition = (
  currentState: POState,
  targetState: POState
): boolean => {
  return PO_STATE_TRANSITIONS[currentState].includes(targetState);
};

/** Check if a PO line state transition is valid */
export const isValidPOLineTransition = (
  currentState: POLineState,
  targetState: POLineState
): boolean => {
  return PO_LINE_STATE_TRANSITIONS[currentState].includes(targetState);
};

/** Get allowed transitions from current state */
export const getAllowedPOTransitions = (currentState: POState): POState[] => {
  return [...PO_STATE_TRANSITIONS[currentState]];
};

/** Get allowed transitions for PO line */
export const getAllowedPOLineTransitions = (currentState: POLineState): POLineState[] => {
  return [...PO_LINE_STATE_TRANSITIONS[currentState]];
};

/** Check if PO is in terminal state */
export const isPOTerminalState = (state: POState): boolean => {
  return PO_STATE_TRANSITIONS[state].length === 0;
};

/** Check if PO line is in terminal state */
export const isPOLineTerminalState = (state: POLineState): boolean => {
  return PO_LINE_STATE_TRANSITIONS[state].length === 0;
};

/** Calculate aggregate PO state from line states */
export const calculatePOStateFromLines = (
  lineStates: POLineState[]
): POState | null => {
  if (lineStates.length === 0) return null;

  const allCancelled = lineStates.every(s => s === 'CANCELLED');
  if (allCancelled) return 'CANCELLED';

  const allFullyReceived = lineStates.every(
    s => s === 'FULLY_RECEIVED' || s === 'CANCELLED'
  );
  if (allFullyReceived) return 'FULLY_RECEIVED';

  const hasAnyReceived = lineStates.some(
    s => s === 'PARTIALLY_RECEIVED' || s === 'FULLY_RECEIVED'
  );
  if (hasAnyReceived) return 'PARTIALLY_RECEIVED';

  return null; // No change to header state
};
