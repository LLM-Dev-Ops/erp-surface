/**
 * Purchase Order Surface Contracts for ERP Surface Layer
 *
 * Vendor-neutral contracts for purchase order operations.
 * All contracts have typed inputs/outputs, preconditions, postconditions,
 * state transitions, and observable events.
 */

import {
  Result,
  ValidationResult,
  ValidationViolation as ResultViolation,
  Results
} from '../../../common/types/result';
import { MonetaryAmount, MonetaryOperations } from '../../../common/types/monetary';
import { DateString, TimestampProvider, SystemTimestampProvider } from '../../../common/types/temporal';
import {
  PONumber,
  SupplierId,
  UserId,
  CostCenter,
  UUID,
  CorrelationId,
  Identifier,
  IdentityOperations
} from '../../../common/types/identity';
import {
  ValidationError,
  StateError,
  ValidationViolation,
  ErrorFactory
} from '../../../common/errors/error-types';
import { CorrelationContext } from '../../../common/events/correlation';

import {
  POState,
  POLineState,
  POHeaderInput,
  POLineItemInput,
  ApprovalRoute,
  GoodsReceiptLineInput,
  VarianceReport
} from './models';

import {
  PurchaseOrderEvent,
  PURCHASE_ORDER_SURFACE,
  PURCHASE_ORDER_SURFACE_VERSION
} from './events';

// ============================================================================
// Surface Definition
// ============================================================================

/** Purchase Order Surface - manages purchase order lifecycle */
export interface PurchaseOrderSurface {
  /** Surface name */
  readonly surfaceName: typeof PURCHASE_ORDER_SURFACE;

  /** Surface version */
  readonly surfaceVersion: typeof PURCHASE_ORDER_SURFACE_VERSION;

  /** Available contracts */
  readonly contracts: {
    readonly createPurchaseOrder: CreatePurchaseOrderContract;
    readonly receiveGoods: ReceiveGoodsContract;
    readonly approvePurchaseOrder: ApprovePurchaseOrderContract;
    readonly cancelPurchaseOrder: CancelPurchaseOrderContract;
  };
}

// ============================================================================
// Create Purchase Order Contract
// ============================================================================

/** Input for creating a purchase order */
export interface CreatePurchaseOrderInput {
  /** PO header information */
  readonly header: POHeaderInput;

  /** Line items */
  readonly lineItems: readonly POLineItemInput[];

  /** Requestor user ID */
  readonly requestorId: UserId;

  /** Cost center for budget validation */
  readonly costCenter: CostCenter;

  /** Optional: Skip approval workflow (requires permission) */
  readonly skipApproval?: boolean;

  /** Optional: Correlation context for tracing */
  readonly correlationContext?: CorrelationContext;
}

/** Line result for each PO line item */
export interface POLineResult {
  readonly lineNumber: number;
  readonly lineId: UUID;
  readonly materialId: string;
  readonly quantity: number;
  readonly extendedPrice: MonetaryAmount;
  readonly state: POLineState;
}

/** Output from creating a purchase order */
export interface CreatePurchaseOrderOutput {
  /** Assigned PO number */
  readonly poNumber: PONumber;

  /** Current PO state */
  readonly status: POState;

  /** Approval route (if approval required) */
  readonly approvalRoute: ApprovalRoute | null;

  /** Results for each line item */
  readonly lineResults: readonly POLineResult[];

  /** Total order value */
  readonly totalValue: MonetaryAmount;

  /** Grand total including tax */
  readonly grandTotal: MonetaryAmount;

  /** Events emitted during creation */
  readonly events: readonly PurchaseOrderEvent[];
}

/** Create Purchase Order Contract */
export interface CreatePurchaseOrderContract {
  /** Contract name */
  readonly name: 'CreatePurchaseOrder';

  /** Contract description */
  readonly description: 'Creates a new purchase order with header and line items';

  /** Input type */
  readonly inputType: CreatePurchaseOrderInput;

  /** Output type */
  readonly outputType: CreatePurchaseOrderOutput;

  /** Precondition predicates */
  readonly preconditions: CreatePurchaseOrderPreconditions;

  /** Postcondition predicates */
  readonly postconditions: CreatePurchaseOrderPostconditions;

  /** Execute the contract */
  execute(
    input: CreatePurchaseOrderInput,
    context: ContractExecutionContext
  ): Promise<Result<CreatePurchaseOrderOutput, ValidationError | StateError>>;
}

/** Preconditions for creating a purchase order */
export interface CreatePurchaseOrderPreconditions {
  /** Supplier must exist and be active */
  supplierIsActive(supplierId: SupplierId): Promise<boolean>;

  /** All materials must exist */
  materialsExist(materialIds: readonly string[]): Promise<boolean>;

  /** Budget must be available for cost center */
  budgetAvailable(costCenter: CostCenter, amount: MonetaryAmount): Promise<boolean>;

  /** Requestor must have permission to create PO */
  requestorHasPermission(requestorId: UserId): Promise<boolean>;

  /** At least one line item must be provided */
  hasLineItems(lineItems: readonly POLineItemInput[]): boolean;

  /** All quantities must be positive */
  allQuantitiesPositive(lineItems: readonly POLineItemInput[]): boolean;

  /** Delivery date must be in the future */
  deliveryDateValid(deliveryDate: DateString): boolean;
}

/** Postconditions for creating a purchase order */
export interface CreatePurchaseOrderPostconditions {
  /** PO number was assigned */
  poNumberAssigned(output: CreatePurchaseOrderOutput): boolean;

  /** PO is in valid initial state */
  validInitialState(output: CreatePurchaseOrderOutput): boolean;

  /** All line items have valid IDs */
  allLinesHaveIds(output: CreatePurchaseOrderOutput): boolean;

  /** Total matches sum of line items */
  totalMatchesLines(output: CreatePurchaseOrderOutput, input: CreatePurchaseOrderInput): boolean;

  /** Creation events were emitted */
  creationEventsEmitted(output: CreatePurchaseOrderOutput): boolean;
}

// ============================================================================
// Receive Goods Contract
// ============================================================================

/** Input for receiving goods against a PO */
export interface ReceiveGoodsInput {
  /** PO number to receive against */
  readonly poNumber: PONumber;

  /** Receipt lines */
  readonly receiptLines: readonly GoodsReceiptLineInput[];

  /** Receipt date */
  readonly receiptDate: DateString;

  /** Delivery note reference */
  readonly deliveryNote?: string;

  /** Receiving user ID */
  readonly receivedById: UserId;

  /** Storage location for received goods */
  readonly storageLocation?: string;

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Output from receiving goods */
export interface ReceiveGoodsOutput {
  /** Receipt number */
  readonly receiptNumber: Identifier;

  /** Receipt status */
  readonly receiptStatus: 'POSTED' | 'DRAFT';

  /** Variance report */
  readonly varianceReport: VarianceReport;

  /** Updated PO state */
  readonly updatedPOState: POState;

  /** Line-level receipt results */
  readonly lineReceipts: readonly {
    readonly lineNumber: number;
    readonly quantityReceived: number;
    readonly quantityAccepted: number;
    readonly quantityRejected: number;
    readonly lineState: POLineState;
  }[];

  /** Events emitted */
  readonly events: readonly PurchaseOrderEvent[];
}

/** Receive Goods Contract */
export interface ReceiveGoodsContract {
  readonly name: 'ReceiveGoods';
  readonly description: 'Records receipt of goods against a purchase order';

  readonly preconditions: ReceiveGoodsPreconditions;
  readonly postconditions: ReceiveGoodsPostconditions;

  execute(
    input: ReceiveGoodsInput,
    context: ContractExecutionContext
  ): Promise<Result<ReceiveGoodsOutput, ValidationError | StateError>>;
}

/** Preconditions for receiving goods */
export interface ReceiveGoodsPreconditions {
  /** PO must exist */
  poExists(poNumber: PONumber): Promise<boolean>;

  /** PO must be in receivable state */
  poInReceivableState(poNumber: PONumber): Promise<boolean>;

  /** All receipt lines must reference valid PO lines */
  allLinesReferenceValidPOLines(
    poNumber: PONumber,
    receiptLines: readonly GoodsReceiptLineInput[]
  ): Promise<boolean>;

  /** Receipt quantities must not exceed open quantities */
  quantitiesWithinLimits(
    poNumber: PONumber,
    receiptLines: readonly GoodsReceiptLineInput[]
  ): Promise<boolean>;

  /** User must have permission to receive */
  userCanReceive(userId: UserId): Promise<boolean>;
}

/** Postconditions for receiving goods */
export interface ReceiveGoodsPostconditions {
  /** Receipt number was assigned */
  receiptNumberAssigned(output: ReceiveGoodsOutput): boolean;

  /** PO line quantities were updated */
  lineQuantitiesUpdated(output: ReceiveGoodsOutput): boolean;

  /** Variance report is accurate */
  varianceReportAccurate(output: ReceiveGoodsOutput, input: ReceiveGoodsInput): boolean;

  /** PO state was updated correctly */
  poStateUpdatedCorrectly(output: ReceiveGoodsOutput): boolean;
}

// ============================================================================
// Approve Purchase Order Contract
// ============================================================================

/** Input for approving a purchase order */
export interface ApprovePurchaseOrderInput {
  /** PO number to approve */
  readonly poNumber: PONumber;

  /** Approver user ID */
  readonly approverId: UserId;

  /** Approval decision */
  readonly decision: 'APPROVE' | 'REJECT';

  /** Comments from approver */
  readonly comments?: string;

  /** Rejection reason (required if rejecting) */
  readonly rejectionReason?: string;

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Output from approving a purchase order */
export interface ApprovePurchaseOrderOutput {
  /** Updated PO number */
  readonly poNumber: PONumber;

  /** Updated PO state */
  readonly status: POState;

  /** Was this the final approval? */
  readonly finalApproval: boolean;

  /** Next approver (if more approvals needed) */
  readonly nextApproverId?: UserId;

  /** Updated approval route */
  readonly approvalRoute: ApprovalRoute;

  /** Events emitted */
  readonly events: readonly PurchaseOrderEvent[];
}

/** Approve Purchase Order Contract */
export interface ApprovePurchaseOrderContract {
  readonly name: 'ApprovePurchaseOrder';
  readonly description: 'Approves or rejects a purchase order in approval workflow';

  readonly preconditions: ApprovePurchaseOrderPreconditions;
  readonly postconditions: ApprovePurchaseOrderPostconditions;

  execute(
    input: ApprovePurchaseOrderInput,
    context: ContractExecutionContext
  ): Promise<Result<ApprovePurchaseOrderOutput, ValidationError | StateError>>;
}

/** Preconditions for approving a purchase order */
export interface ApprovePurchaseOrderPreconditions {
  /** PO must exist */
  poExists(poNumber: PONumber): Promise<boolean>;

  /** PO must be pending approval */
  poIsPendingApproval(poNumber: PONumber): Promise<boolean>;

  /** User must be current approver */
  userIsCurrentApprover(poNumber: PONumber, approverId: UserId): Promise<boolean>;

  /** User has approval authority for amount */
  userHasApprovalAuthority(approverId: UserId, amount: MonetaryAmount): Promise<boolean>;

  /** Rejection reason required if rejecting */
  rejectionReasonProvidedIfRejecting(
    decision: 'APPROVE' | 'REJECT',
    rejectionReason?: string
  ): boolean;
}

/** Postconditions for approving a purchase order */
export interface ApprovePurchaseOrderPostconditions {
  /** Approval was recorded */
  approvalRecorded(output: ApprovePurchaseOrderOutput): boolean;

  /** State transition is valid */
  stateTransitionValid(output: ApprovePurchaseOrderOutput, input: ApprovePurchaseOrderInput): boolean;

  /** Next approver assigned if not final */
  nextApproverAssignedIfNotFinal(output: ApprovePurchaseOrderOutput): boolean;
}

// ============================================================================
// Cancel Purchase Order Contract
// ============================================================================

/** Input for cancelling a purchase order */
export interface CancelPurchaseOrderInput {
  /** PO number to cancel */
  readonly poNumber: PONumber;

  /** User requesting cancellation */
  readonly cancelledById: UserId;

  /** Cancellation reason */
  readonly cancellationReason: string;

  /** Optional: Correlation context */
  readonly correlationContext?: CorrelationContext;
}

/** Output from cancelling a purchase order */
export interface CancelPurchaseOrderOutput {
  /** Cancelled PO number */
  readonly poNumber: PONumber;

  /** Updated status */
  readonly status: POState;

  /** Previous state before cancellation */
  readonly previousState: POState;

  /** Number of affected receipts */
  readonly affectedReceiptCount: number;

  /** Events emitted */
  readonly events: readonly PurchaseOrderEvent[];
}

/** Cancel Purchase Order Contract */
export interface CancelPurchaseOrderContract {
  readonly name: 'CancelPurchaseOrder';
  readonly description: 'Cancels a purchase order';

  readonly preconditions: CancelPurchaseOrderPreconditions;
  readonly postconditions: CancelPurchaseOrderPostconditions;

  execute(
    input: CancelPurchaseOrderInput,
    context: ContractExecutionContext
  ): Promise<Result<CancelPurchaseOrderOutput, ValidationError | StateError>>;
}

/** Preconditions for cancelling a purchase order */
export interface CancelPurchaseOrderPreconditions {
  /** PO must exist */
  poExists(poNumber: PONumber): Promise<boolean>;

  /** PO must be in cancellable state */
  poIsCancellable(poNumber: PONumber): Promise<boolean>;

  /** User must have cancellation permission */
  userCanCancel(userId: UserId, poNumber: PONumber): Promise<boolean>;

  /** Cancellation reason must be provided */
  reasonProvided(reason: string): boolean;
}

/** Postconditions for cancelling a purchase order */
export interface CancelPurchaseOrderPostconditions {
  /** PO state is CANCELLED */
  poIsCancelled(output: CancelPurchaseOrderOutput): boolean;

  /** All open lines are cancelled */
  allOpenLinesCancelled(output: CancelPurchaseOrderOutput): boolean;

  /** Cancellation event was emitted */
  cancellationEventEmitted(output: CancelPurchaseOrderOutput): boolean;
}

// ============================================================================
// Contract Execution Context
// ============================================================================

/** Context for contract execution */
export interface ContractExecutionContext {
  /** Timestamp provider (injectable for replay) */
  readonly timestampProvider: TimestampProvider;

  /** UUID generator (injectable for replay) */
  readonly uuidGenerator: () => UUID;

  /** Correlation ID generator */
  readonly correlationIdGenerator: () => CorrelationId;

  /** PO number generator */
  readonly poNumberGenerator: () => Promise<PONumber>;

  /** Receipt number generator */
  readonly receiptNumberGenerator: () => Promise<Identifier>;

  /** Current user context */
  readonly currentUser: UserId;

  /** Operational mode */
  readonly mode: 'SIMULATION' | 'EXECUTION';
}

/** Default execution context factory */
export const createDefaultExecutionContext = (
  currentUser: UserId,
  mode: 'SIMULATION' | 'EXECUTION' = 'EXECUTION'
): ContractExecutionContext => ({
  timestampProvider: SystemTimestampProvider,
  uuidGenerator: () => IdentityOperations.generateUUID(),
  correlationIdGenerator: () => IdentityOperations.generateCorrelationId('po'),
  poNumberGenerator: async () => `PO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  receiptNumberGenerator: async () => `GR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  currentUser,
  mode
});

// ============================================================================
// Precondition Implementations
// ============================================================================

/** Default precondition implementations for CreatePurchaseOrder */
export const createPurchaseOrderPreconditions: CreatePurchaseOrderPreconditions = {
  supplierIsActive: async (_supplierId: SupplierId): Promise<boolean> => {
    // In real implementation, would check supplier master data
    return true;
  },

  materialsExist: async (_materialIds: readonly string[]): Promise<boolean> => {
    // In real implementation, would check material master data
    return true;
  },

  budgetAvailable: async (_costCenter: CostCenter, _amount: MonetaryAmount): Promise<boolean> => {
    // In real implementation, would check budget availability
    return true;
  },

  requestorHasPermission: async (_requestorId: UserId): Promise<boolean> => {
    // In real implementation, would check user permissions
    return true;
  },

  hasLineItems: (lineItems: readonly POLineItemInput[]): boolean => {
    return lineItems.length > 0;
  },

  allQuantitiesPositive: (lineItems: readonly POLineItemInput[]): boolean => {
    return lineItems.every(line => line.quantity > 0);
  },

  deliveryDateValid: (deliveryDate: DateString): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return deliveryDate >= today;
  }
};

/** Default postcondition implementations for CreatePurchaseOrder */
export const createPurchaseOrderPostconditions: CreatePurchaseOrderPostconditions = {
  poNumberAssigned: (output: CreatePurchaseOrderOutput): boolean => {
    return output.poNumber !== undefined && output.poNumber.length > 0;
  },

  validInitialState: (output: CreatePurchaseOrderOutput): boolean => {
    return output.status === 'NEW' || output.status === 'PENDING_APPROVAL';
  },

  allLinesHaveIds: (output: CreatePurchaseOrderOutput): boolean => {
    return output.lineResults.every(line => line.lineId !== undefined);
  },

  totalMatchesLines: (output: CreatePurchaseOrderOutput, _input: CreatePurchaseOrderInput): boolean => {
    const lineTotal = output.lineResults.reduce(
      (sum, line) => sum + line.extendedPrice.value,
      0
    );
    return Math.abs(lineTotal - output.totalValue.value) < 0.01;
  },

  creationEventsEmitted: (output: CreatePurchaseOrderOutput): boolean => {
    return output.events.some(e => e.eventType === 'PO_CREATION_COMPLETED');
  }
};

// ============================================================================
// Validation Helpers
// ============================================================================

/** Validate create purchase order input */
export const validateCreatePurchaseOrderInput = (
  input: CreatePurchaseOrderInput,
  preconditions: CreatePurchaseOrderPreconditions
): ValidationResult => {
  const violations: ResultViolation[] = [];

  if (!preconditions.hasLineItems(input.lineItems)) {
    violations.push({
      field: 'lineItems',
      rule: 'required',
      message: 'At least one line item is required',
      severity: 'ERROR'
    });
  }

  if (!preconditions.allQuantitiesPositive(input.lineItems)) {
    violations.push({
      field: 'lineItems.quantity',
      rule: 'positive',
      message: 'All line item quantities must be positive',
      severity: 'ERROR'
    });
  }

  if (!preconditions.deliveryDateValid(input.header.requestedDeliveryDate)) {
    violations.push({
      field: 'header.requestedDeliveryDate',
      rule: 'futureDate',
      message: 'Requested delivery date must be in the future',
      severity: 'ERROR'
    });
  }

  return Results.validation(violations.length === 0, violations);
};

/** Calculate line item extended price */
export const calculateExtendedPrice = (
  quantity: number,
  unitPrice: MonetaryAmount
): MonetaryAmount => {
  return MonetaryOperations.create(
    quantity * unitPrice.value,
    unitPrice.currency,
    unitPrice.precision
  );
};

/** Calculate PO totals from line items */
export const calculatePOTotals = (
  lineItems: readonly { extendedPrice: MonetaryAmount; tax: { taxAmount: MonetaryAmount } }[]
): { totalValue: MonetaryAmount; totalTax: MonetaryAmount; grandTotal: MonetaryAmount } => {
  if (lineItems.length === 0) {
    return {
      totalValue: MonetaryOperations.create(0, 'USD'),
      totalTax: MonetaryOperations.create(0, 'USD'),
      grandTotal: MonetaryOperations.create(0, 'USD')
    };
  }

  const currency = lineItems[0].extendedPrice.currency;

  const totalValue = lineItems.reduce(
    (sum, line) => MonetaryOperations.add(sum, line.extendedPrice),
    MonetaryOperations.create(0, currency)
  );

  const totalTax = lineItems.reduce(
    (sum, line) => MonetaryOperations.add(sum, line.tax.taxAmount),
    MonetaryOperations.create(0, currency)
  );

  const grandTotal = MonetaryOperations.add(totalValue, totalTax);

  return { totalValue, totalTax, grandTotal };
};

// ============================================================================
// Error Types for Purchase Orders
// ============================================================================

/** PO-specific error codes */
export type POErrorCode =
  | 'ERR_INVALID_SUPPLIER'
  | 'ERR_BUDGET_EXCEEDED'
  | 'ERR_MATERIAL_NOT_FOUND'
  | 'ERR_PO_NOT_FOUND'
  | 'ERR_PO_NOT_RECEIVABLE'
  | 'ERR_PO_NOT_APPROVABLE'
  | 'ERR_PO_NOT_CANCELLABLE'
  | 'ERR_RECEIPT_EXCEEDS_OPEN'
  | 'ERR_INVALID_APPROVER'
  | 'ERR_MISSING_REJECTION_REASON';

/** Create PO-specific validation error */
export const createPOValidationError = (
  _code: POErrorCode,
  message: string,
  violations: ValidationViolation[]
): ValidationError => {
  return ErrorFactory.preconditionViolation(
    PURCHASE_ORDER_SURFACE,
    'PurchaseOrderOperation',
    violations,
    message
  );
};

/** Create PO state error */
export const createPOStateError = (
  currentState: POState,
  attemptedTransition: string
): StateError => {
  return ErrorFactory.invalidTransition(
    PURCHASE_ORDER_SURFACE,
    'StateTransition',
    currentState,
    attemptedTransition
  );
};

// ============================================================================
// Export Surface Factory
// ============================================================================

/** Create the Purchase Order Surface */
export const createPurchaseOrderSurface = (): PurchaseOrderSurface => {
  return {
    surfaceName: PURCHASE_ORDER_SURFACE,
    surfaceVersion: PURCHASE_ORDER_SURFACE_VERSION,
    contracts: {
      createPurchaseOrder: {
        name: 'CreatePurchaseOrder',
        description: 'Creates a new purchase order with header and line items',
        inputType: {} as CreatePurchaseOrderInput,
        outputType: {} as CreatePurchaseOrderOutput,
        preconditions: createPurchaseOrderPreconditions,
        postconditions: createPurchaseOrderPostconditions,
        execute: async (_input, _context) => {
          // Implementation would go here
          // This is the contract definition - actual execution
          // would be provided by the binding layer
          throw new Error('Contract execution requires binding implementation');
        }
      },
      receiveGoods: {
        name: 'ReceiveGoods',
        description: 'Records receipt of goods against a purchase order',
        preconditions: {} as ReceiveGoodsPreconditions,
        postconditions: {} as ReceiveGoodsPostconditions,
        execute: async (_input, _context) => {
          throw new Error('Contract execution requires binding implementation');
        }
      },
      approvePurchaseOrder: {
        name: 'ApprovePurchaseOrder',
        description: 'Approves or rejects a purchase order in approval workflow',
        preconditions: {} as ApprovePurchaseOrderPreconditions,
        postconditions: {} as ApprovePurchaseOrderPostconditions,
        execute: async (_input, _context) => {
          throw new Error('Contract execution requires binding implementation');
        }
      },
      cancelPurchaseOrder: {
        name: 'CancelPurchaseOrder',
        description: 'Cancels a purchase order',
        preconditions: {} as CancelPurchaseOrderPreconditions,
        postconditions: {} as CancelPurchaseOrderPostconditions,
        execute: async (_input, _context) => {
          throw new Error('Contract execution requires binding implementation');
        }
      }
    }
  };
};
