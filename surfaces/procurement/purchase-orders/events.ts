/**
 * Purchase Order Events for ERP Surface Contracts
 *
 * Observable events for purchase order lifecycle.
 * All events extend BaseEvent and support deterministic replay.
 */

import {
  CorrelatedEvent,
  StateTransitionEvent
} from '../../../common/events/base-event';
import {
  UUID,
  CorrelationId,
  CausationId,
  PONumber,
  SupplierId,
  UserId,
  SemanticVersion
} from '../../../common/types/identity';
import { Timestamp } from '../../../common/types/temporal';
import { MonetaryAmount } from '../../../common/types/monetary';
import { ValidationViolation } from '../../../common/errors/error-types';
import {
  POState,
  POLineState,
  ApprovalRoute,
  VarianceReport,
  GoodsReceiptStatus
} from './models';

// ============================================================================
// Surface Constants
// ============================================================================

export const PURCHASE_ORDER_SURFACE = 'PurchaseOrderSurface';
export const PURCHASE_ORDER_SURFACE_VERSION: SemanticVersion = '1.0.0';

// ============================================================================
// PO Creation Events
// ============================================================================

/** Event types for purchase order operations */
export type POEventType =
  | 'PO_CREATION_REQUESTED'
  | 'PO_VALIDATION_COMPLETED'
  | 'PO_NUMBER_ASSIGNED'
  | 'PO_APPROVAL_WORKFLOW_INITIATED'
  | 'PO_CREATION_COMPLETED'
  | 'PO_CREATION_FAILED'
  | 'PO_APPROVAL_REQUESTED'
  | 'PO_APPROVED'
  | 'PO_REJECTED'
  | 'PO_CANCELLED'
  | 'GOODS_RECEIVED'
  | 'PO_STATE_CHANGED'
  | 'PO_LINE_STATE_CHANGED';

/** PO creation requested event */
export interface POCreationRequestedEvent extends CorrelatedEvent {
  readonly eventType: 'PO_CREATION_REQUESTED';
  readonly supplierId: SupplierId;
  readonly requestorId: UserId;
  readonly lineCount: number;
  readonly totalValue: MonetaryAmount;
  readonly inputHash: string;
}

/** PO validation completed event */
export interface POValidationCompletedEvent extends CorrelatedEvent {
  readonly eventType: 'PO_VALIDATION_COMPLETED';
  readonly valid: boolean;
  readonly violations: readonly ValidationViolation[];
  readonly supplierValidated: boolean;
  readonly budgetValidated: boolean;
  readonly materialsValidated: boolean;
}

/** PO number assigned event */
export interface PONumberAssignedEvent extends CorrelatedEvent {
  readonly eventType: 'PO_NUMBER_ASSIGNED';
  readonly poNumber: PONumber;
  readonly sequenceNumber: number;
  readonly fiscalYear: number;
}

/** Approval workflow initiated event */
export interface ApprovalWorkflowInitiatedEvent extends CorrelatedEvent {
  readonly eventType: 'PO_APPROVAL_WORKFLOW_INITIATED';
  readonly poNumber: PONumber;
  readonly approvalRoute: ApprovalRoute;
  readonly totalApprovers: number;
  readonly estimatedCompletionTime?: Timestamp;
}

/** PO creation completed event */
export interface POCreationCompletedEvent extends CorrelatedEvent {
  readonly eventType: 'PO_CREATION_COMPLETED';
  readonly poNumber: PONumber;
  readonly state: POState;
  readonly totalValue: MonetaryAmount;
  readonly grandTotal: MonetaryAmount;
  readonly lineCount: number;
  readonly processingDurationMs: number;
}

/** PO creation failed event */
export interface POCreationFailedEvent extends CorrelatedEvent {
  readonly eventType: 'PO_CREATION_FAILED';
  readonly errorCode: string;
  readonly errorMessage: string;
  readonly violations: readonly ValidationViolation[];
  readonly recoverable: boolean;
}

// ============================================================================
// Approval Events
// ============================================================================

/** PO approval requested event */
export interface POApprovalRequestedEvent extends CorrelatedEvent {
  readonly eventType: 'PO_APPROVAL_REQUESTED';
  readonly poNumber: PONumber;
  readonly requestedApproverId: UserId;
  readonly approvalStepIndex: number;
  readonly threshold: MonetaryAmount;
  readonly expiresAt?: Timestamp;
}

/** PO approved event */
export interface POApprovedEvent extends CorrelatedEvent {
  readonly eventType: 'PO_APPROVED';
  readonly poNumber: PONumber;
  readonly approverId: UserId;
  readonly approvalStepIndex: number;
  readonly comments?: string;
  readonly finalApproval: boolean;
}

/** PO rejected event */
export interface PORejectedEvent extends CorrelatedEvent {
  readonly eventType: 'PO_REJECTED';
  readonly poNumber: PONumber;
  readonly rejectedById: UserId;
  readonly approvalStepIndex: number;
  readonly rejectionReason: string;
  readonly comments?: string;
}

// ============================================================================
// Cancellation Events
// ============================================================================

/** PO cancelled event */
export interface POCancelledEvent extends CorrelatedEvent {
  readonly eventType: 'PO_CANCELLED';
  readonly poNumber: PONumber;
  readonly cancelledById: UserId;
  readonly cancellationReason: string;
  readonly previousState: POState;
  readonly affectedReceiptCount: number;
}

// ============================================================================
// Goods Receipt Events
// ============================================================================

/** Goods received event */
export interface GoodsReceivedEvent extends CorrelatedEvent {
  readonly eventType: 'GOODS_RECEIVED';
  readonly poNumber: PONumber;
  readonly receiptNumber: string;
  readonly receiptDate: string;
  readonly deliveryNote?: string;
  readonly totalReceived: number;
  readonly totalAccepted: number;
  readonly totalRejected: number;
  readonly varianceReport: VarianceReport;
  readonly receiptStatus: GoodsReceiptStatus;
  readonly receivedById: UserId;
  readonly resultingPOState: POState;
}

// ============================================================================
// State Change Events
// ============================================================================

/** PO state changed event (extends generic state transition) */
export interface POStateChangedEvent extends StateTransitionEvent {
  readonly poNumber: PONumber;
  readonly previousState: POState;
  readonly newState: POState;
  readonly trigger: string;
  readonly triggeredById: UserId;
}

/** PO line state changed event */
export interface POLineStateChangedEvent extends CorrelatedEvent {
  readonly eventType: 'PO_LINE_STATE_CHANGED';
  readonly poNumber: PONumber;
  readonly lineNumber: number;
  readonly lineId: UUID;
  readonly previousState: POLineState;
  readonly newState: POLineState;
  readonly trigger: string;
  readonly quantityReceived?: number;
}

// ============================================================================
// Event Union Type
// ============================================================================

/** All purchase order events */
export type PurchaseOrderEvent =
  | POCreationRequestedEvent
  | POValidationCompletedEvent
  | PONumberAssignedEvent
  | ApprovalWorkflowInitiatedEvent
  | POCreationCompletedEvent
  | POCreationFailedEvent
  | POApprovalRequestedEvent
  | POApprovedEvent
  | PORejectedEvent
  | POCancelledEvent
  | GoodsReceivedEvent
  | POStateChangedEvent
  | POLineStateChangedEvent;

// ============================================================================
// Event Factory
// ============================================================================

/** Factory for creating purchase order events */
export const POEventFactory = {
  /** Create PO creation requested event */
  creationRequested(
    correlationId: CorrelationId,
    supplierId: SupplierId,
    requestorId: UserId,
    lineCount: number,
    totalValue: MonetaryAmount,
    inputHash: string,
    timestamp: Timestamp,
    eventId: UUID
  ): POCreationRequestedEvent {
    return {
      eventId,
      eventType: 'PO_CREATION_REQUESTED',
      timestamp,
      surface: PURCHASE_ORDER_SURFACE,
      operation: 'CreatePurchaseOrder',
      surfaceVersion: PURCHASE_ORDER_SURFACE_VERSION,
      correlationId,
      causationId: null,
      supplierId,
      requestorId,
      lineCount,
      totalValue,
      inputHash
    };
  },

  /** Create validation completed event */
  validationCompleted(
    correlationId: CorrelationId,
    causationId: CausationId,
    valid: boolean,
    violations: readonly ValidationViolation[],
    supplierValidated: boolean,
    budgetValidated: boolean,
    materialsValidated: boolean,
    timestamp: Timestamp,
    eventId: UUID
  ): POValidationCompletedEvent {
    return {
      eventId,
      eventType: 'PO_VALIDATION_COMPLETED',
      timestamp,
      surface: PURCHASE_ORDER_SURFACE,
      operation: 'CreatePurchaseOrder',
      surfaceVersion: PURCHASE_ORDER_SURFACE_VERSION,
      correlationId,
      causationId,
      valid,
      violations,
      supplierValidated,
      budgetValidated,
      materialsValidated
    };
  },

  /** Create PO number assigned event */
  numberAssigned(
    correlationId: CorrelationId,
    causationId: CausationId,
    poNumber: PONumber,
    sequenceNumber: number,
    fiscalYear: number,
    timestamp: Timestamp,
    eventId: UUID
  ): PONumberAssignedEvent {
    return {
      eventId,
      eventType: 'PO_NUMBER_ASSIGNED',
      timestamp,
      surface: PURCHASE_ORDER_SURFACE,
      operation: 'CreatePurchaseOrder',
      surfaceVersion: PURCHASE_ORDER_SURFACE_VERSION,
      correlationId,
      causationId,
      poNumber,
      sequenceNumber,
      fiscalYear
    };
  },

  /** Create approval workflow initiated event */
  approvalWorkflowInitiated(
    correlationId: CorrelationId,
    causationId: CausationId,
    poNumber: PONumber,
    approvalRoute: ApprovalRoute,
    timestamp: Timestamp,
    eventId: UUID,
    estimatedCompletionTime?: Timestamp
  ): ApprovalWorkflowInitiatedEvent {
    return {
      eventId,
      eventType: 'PO_APPROVAL_WORKFLOW_INITIATED',
      timestamp,
      surface: PURCHASE_ORDER_SURFACE,
      operation: 'CreatePurchaseOrder',
      surfaceVersion: PURCHASE_ORDER_SURFACE_VERSION,
      correlationId,
      causationId,
      poNumber,
      approvalRoute,
      totalApprovers: approvalRoute.steps.length,
      estimatedCompletionTime
    };
  },

  /** Create PO creation completed event */
  creationCompleted(
    correlationId: CorrelationId,
    causationId: CausationId,
    poNumber: PONumber,
    state: POState,
    totalValue: MonetaryAmount,
    grandTotal: MonetaryAmount,
    lineCount: number,
    processingDurationMs: number,
    timestamp: Timestamp,
    eventId: UUID
  ): POCreationCompletedEvent {
    return {
      eventId,
      eventType: 'PO_CREATION_COMPLETED',
      timestamp,
      surface: PURCHASE_ORDER_SURFACE,
      operation: 'CreatePurchaseOrder',
      surfaceVersion: PURCHASE_ORDER_SURFACE_VERSION,
      correlationId,
      causationId,
      poNumber,
      state,
      totalValue,
      grandTotal,
      lineCount,
      processingDurationMs
    };
  },

  /** Create PO creation failed event */
  creationFailed(
    correlationId: CorrelationId,
    causationId: CausationId,
    errorCode: string,
    errorMessage: string,
    violations: readonly ValidationViolation[],
    recoverable: boolean,
    timestamp: Timestamp,
    eventId: UUID
  ): POCreationFailedEvent {
    return {
      eventId,
      eventType: 'PO_CREATION_FAILED',
      timestamp,
      surface: PURCHASE_ORDER_SURFACE,
      operation: 'CreatePurchaseOrder',
      surfaceVersion: PURCHASE_ORDER_SURFACE_VERSION,
      correlationId,
      causationId,
      errorCode,
      errorMessage,
      violations,
      recoverable
    };
  },

  /** Create goods received event */
  goodsReceived(
    correlationId: CorrelationId,
    causationId: CausationId,
    poNumber: PONumber,
    receiptNumber: string,
    receiptDate: string,
    totalReceived: number,
    totalAccepted: number,
    totalRejected: number,
    varianceReport: VarianceReport,
    receiptStatus: GoodsReceiptStatus,
    receivedById: UserId,
    resultingPOState: POState,
    timestamp: Timestamp,
    eventId: UUID,
    deliveryNote?: string
  ): GoodsReceivedEvent {
    return {
      eventId,
      eventType: 'GOODS_RECEIVED',
      timestamp,
      surface: PURCHASE_ORDER_SURFACE,
      operation: 'ReceiveGoods',
      surfaceVersion: PURCHASE_ORDER_SURFACE_VERSION,
      correlationId,
      causationId,
      poNumber,
      receiptNumber,
      receiptDate,
      deliveryNote,
      totalReceived,
      totalAccepted,
      totalRejected,
      varianceReport,
      receiptStatus,
      receivedById,
      resultingPOState
    };
  },

  /** Create PO cancelled event */
  cancelled(
    correlationId: CorrelationId,
    causationId: CausationId,
    poNumber: PONumber,
    cancelledById: UserId,
    cancellationReason: string,
    previousState: POState,
    affectedReceiptCount: number,
    timestamp: Timestamp,
    eventId: UUID
  ): POCancelledEvent {
    return {
      eventId,
      eventType: 'PO_CANCELLED',
      timestamp,
      surface: PURCHASE_ORDER_SURFACE,
      operation: 'CancelPurchaseOrder',
      surfaceVersion: PURCHASE_ORDER_SURFACE_VERSION,
      correlationId,
      causationId,
      poNumber,
      cancelledById,
      cancellationReason,
      previousState,
      affectedReceiptCount
    };
  },

  /** Create PO state changed event */
  stateChanged(
    correlationId: CorrelationId,
    causationId: CausationId,
    poNumber: PONumber,
    previousState: POState,
    newState: POState,
    trigger: string,
    triggeredById: UserId,
    timestamp: Timestamp,
    eventId: UUID
  ): POStateChangedEvent {
    return {
      eventId,
      eventType: 'STATE_TRANSITION',
      timestamp,
      surface: PURCHASE_ORDER_SURFACE,
      operation: 'StateTransition',
      surfaceVersion: PURCHASE_ORDER_SURFACE_VERSION,
      correlationId,
      causationId,
      entityType: 'PurchaseOrder',
      entityId: poNumber,
      poNumber,
      previousState,
      newState,
      trigger,
      triggeredById
    };
  },

  /** Create PO line state changed event */
  lineStateChanged(
    correlationId: CorrelationId,
    causationId: CausationId,
    poNumber: PONumber,
    lineNumber: number,
    lineId: UUID,
    previousState: POLineState,
    newState: POLineState,
    trigger: string,
    timestamp: Timestamp,
    eventId: UUID,
    quantityReceived?: number
  ): POLineStateChangedEvent {
    return {
      eventId,
      eventType: 'PO_LINE_STATE_CHANGED',
      timestamp,
      surface: PURCHASE_ORDER_SURFACE,
      operation: 'StateTransition',
      surfaceVersion: PURCHASE_ORDER_SURFACE_VERSION,
      correlationId,
      causationId,
      poNumber,
      lineNumber,
      lineId,
      previousState,
      newState,
      trigger,
      quantityReceived
    };
  }
};
