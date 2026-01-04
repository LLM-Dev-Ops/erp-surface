/**
 * Inventory Events - Observable Domain Events
 *
 * All events are observable by default and support deterministic replay.
 * Events follow the BaseEvent pattern from common module.
 */

import {
  BaseEvent,
  CorrelatedEvent,
  UUID,
  CorrelationId,
  CausationId,
  SemanticVersion,
  Timestamp,
  MaterialId,
  MonetaryAmount
} from '../../../common';

import {
  InventoryMovementType,
  StockStatus,
  StockKeepingUnit,
  CountType,
  ValuationMethod,
  WarehouseId,
  StorageLocationId,
  UnitOfMeasure
} from './models';

// ============================================================================
// Surface Constants
// ============================================================================

export const INVENTORY_SURFACE = 'InventorySurface';
export const INVENTORY_SURFACE_VERSION: SemanticVersion = '1.0.0';

// ============================================================================
// Stock Level Events
// ============================================================================

/** Event: Stock level queried */
export interface StockLevelQueriedEvent extends CorrelatedEvent {
  readonly eventType: 'STOCK_LEVEL_QUERIED';
  readonly materialId: MaterialId;
  readonly warehouseId: WarehouseId;
  readonly storageLocationId: StorageLocationId;
  readonly onHandQuantity: number;
  readonly availableQuantity: number;
  readonly reservedQuantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly status: StockStatus;
}

/** Event: Stock level changed */
export interface StockLevelChangedEvent extends CorrelatedEvent {
  readonly eventType: 'STOCK_LEVEL_CHANGED';
  readonly materialId: MaterialId;
  readonly sku: StockKeepingUnit;
  readonly previousOnHand: number;
  readonly newOnHand: number;
  readonly previousAvailable: number;
  readonly newAvailable: number;
  readonly changeReason: string;
  readonly unitOfMeasure: UnitOfMeasure;
}

// ============================================================================
// Movement Events
// ============================================================================

/** Event: Movement recorded */
export interface MovementRecordedEvent extends CorrelatedEvent {
  readonly eventType: 'MOVEMENT_RECORDED';
  readonly movementId: string;
  readonly movementType: InventoryMovementType;
  readonly materialId: MaterialId;
  readonly fromLocation: StockKeepingUnit | null;
  readonly toLocation: StockKeepingUnit | null;
  readonly quantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly movementDate: string;
  readonly referenceDocument: string | null;
}

/** Event: Movement reversed */
export interface MovementReversedEvent extends CorrelatedEvent {
  readonly eventType: 'MOVEMENT_REVERSED';
  readonly originalMovementId: string;
  readonly reversalMovementId: string;
  readonly movementType: InventoryMovementType;
  readonly materialId: MaterialId;
  readonly quantity: number;
  readonly reversalReason: string;
}

// ============================================================================
// Valuation Events
// ============================================================================

/** Event: Inventory revalued */
export interface InventoryRevaluedEvent extends CorrelatedEvent {
  readonly eventType: 'INVENTORY_REVALUED';
  readonly valuationId: string;
  readonly materialId: MaterialId;
  readonly warehouseId: WarehouseId;
  readonly valuationDate: string;
  readonly previousValue: MonetaryAmount;
  readonly newValue: MonetaryAmount;
  readonly valuationMethod: ValuationMethod;
  readonly reason: string;
}

/** Event: Valuation method changed */
export interface ValuationMethodChangedEvent extends CorrelatedEvent {
  readonly eventType: 'VALUATION_METHOD_CHANGED';
  readonly materialId: MaterialId;
  readonly previousMethod: ValuationMethod;
  readonly newMethod: ValuationMethod;
  readonly effectiveDate: string;
}

// ============================================================================
// Count Events
// ============================================================================

/** Event: Count initiated */
export interface CountInitiatedEvent extends CorrelatedEvent {
  readonly eventType: 'COUNT_INITIATED';
  readonly countId: string;
  readonly countType: CountType;
  readonly warehouseId: WarehouseId;
  readonly storageLocationId: StorageLocationId;
  readonly plannedDate: string;
  readonly itemCount: number;
}

/** Event: Count completed */
export interface CountCompletedEvent extends CorrelatedEvent {
  readonly eventType: 'COUNT_COMPLETED';
  readonly countId: string;
  readonly countType: CountType;
  readonly warehouseId: WarehouseId;
  readonly completedDate: string;
  readonly totalItems: number;
  readonly itemsWithVariance: number;
  readonly totalVarianceValue: MonetaryAmount;
}

/** Event: Count item recorded */
export interface CountItemRecordedEvent extends CorrelatedEvent {
  readonly eventType: 'COUNT_ITEM_RECORDED';
  readonly countId: string;
  readonly materialId: MaterialId;
  readonly systemQuantity: number;
  readonly countedQuantity: number;
  readonly variance: number;
  readonly unitOfMeasure: UnitOfMeasure;
}

/** Event: Count variance approved */
export interface CountVarianceApprovedEvent extends CorrelatedEvent {
  readonly eventType: 'COUNT_VARIANCE_APPROVED';
  readonly countId: string;
  readonly materialId: MaterialId;
  readonly variance: number;
  readonly adjustmentMovementId: string;
  readonly approvedBy: string;
}

// ============================================================================
// Reservation Events
// ============================================================================

/** Event: Stock reserved */
export interface StockReservedEvent extends CorrelatedEvent {
  readonly eventType: 'STOCK_RESERVED';
  readonly reservationId: string;
  readonly materialId: MaterialId;
  readonly sku: StockKeepingUnit;
  readonly quantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly reservationReason: string;
  readonly referenceDocument: string | null;
  readonly expirationDate: string | null;
}

/** Event: Stock reservation released */
export interface StockReservationReleasedEvent extends CorrelatedEvent {
  readonly eventType: 'STOCK_RESERVATION_RELEASED';
  readonly reservationId: string;
  readonly materialId: MaterialId;
  readonly quantity: number;
  readonly releaseReason: string;
}

// ============================================================================
// Event Union Type
// ============================================================================

/** All inventory events */
export type InventoryEvent =
  | StockLevelQueriedEvent
  | StockLevelChangedEvent
  | MovementRecordedEvent
  | MovementReversedEvent
  | InventoryRevaluedEvent
  | ValuationMethodChangedEvent
  | CountInitiatedEvent
  | CountCompletedEvent
  | CountItemRecordedEvent
  | CountVarianceApprovedEvent
  | StockReservedEvent
  | StockReservationReleasedEvent;

// ============================================================================
// Event Factory
// ============================================================================

export const InventoryEventFactory = {
  /** Create stock level queried event */
  stockLevelQueried(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    materialId: MaterialId,
    warehouseId: WarehouseId,
    storageLocationId: StorageLocationId,
    onHandQuantity: number,
    availableQuantity: number,
    reservedQuantity: number,
    unitOfMeasure: UnitOfMeasure,
    status: StockStatus,
    timestamp: Timestamp,
    eventId: UUID
  ): StockLevelQueriedEvent {
    return {
      eventId,
      eventType: 'STOCK_LEVEL_QUERIED',
      timestamp,
      surface: INVENTORY_SURFACE,
      operation: 'GetStockLevel',
      surfaceVersion: INVENTORY_SURFACE_VERSION,
      correlationId,
      causationId,
      materialId,
      warehouseId,
      storageLocationId,
      onHandQuantity,
      availableQuantity,
      reservedQuantity,
      unitOfMeasure,
      status
    };
  },

  /** Create movement recorded event */
  movementRecorded(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    movementId: string,
    movementType: InventoryMovementType,
    materialId: MaterialId,
    fromLocation: StockKeepingUnit | null,
    toLocation: StockKeepingUnit | null,
    quantity: number,
    unitOfMeasure: UnitOfMeasure,
    movementDate: string,
    referenceDocument: string | null,
    timestamp: Timestamp,
    eventId: UUID
  ): MovementRecordedEvent {
    return {
      eventId,
      eventType: 'MOVEMENT_RECORDED',
      timestamp,
      surface: INVENTORY_SURFACE,
      operation: 'RecordMovement',
      surfaceVersion: INVENTORY_SURFACE_VERSION,
      correlationId,
      causationId,
      movementId,
      movementType,
      materialId,
      fromLocation,
      toLocation,
      quantity,
      unitOfMeasure,
      movementDate,
      referenceDocument
    };
  },

  /** Create inventory revalued event */
  inventoryRevalued(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    valuationId: string,
    materialId: MaterialId,
    warehouseId: WarehouseId,
    valuationDate: string,
    previousValue: MonetaryAmount,
    newValue: MonetaryAmount,
    valuationMethod: ValuationMethod,
    reason: string,
    timestamp: Timestamp,
    eventId: UUID
  ): InventoryRevaluedEvent {
    return {
      eventId,
      eventType: 'INVENTORY_REVALUED',
      timestamp,
      surface: INVENTORY_SURFACE,
      operation: 'RevalueInventory',
      surfaceVersion: INVENTORY_SURFACE_VERSION,
      correlationId,
      causationId,
      valuationId,
      materialId,
      warehouseId,
      valuationDate,
      previousValue,
      newValue,
      valuationMethod,
      reason
    };
  },

  /** Create count completed event */
  countCompleted(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    countId: string,
    countType: CountType,
    warehouseId: WarehouseId,
    completedDate: string,
    totalItems: number,
    itemsWithVariance: number,
    totalVarianceValue: MonetaryAmount,
    timestamp: Timestamp,
    eventId: UUID
  ): CountCompletedEvent {
    return {
      eventId,
      eventType: 'COUNT_COMPLETED',
      timestamp,
      surface: INVENTORY_SURFACE,
      operation: 'PerformCount',
      surfaceVersion: INVENTORY_SURFACE_VERSION,
      correlationId,
      causationId,
      countId,
      countType,
      warehouseId,
      completedDate,
      totalItems,
      itemsWithVariance,
      totalVarianceValue
    };
  }
};
