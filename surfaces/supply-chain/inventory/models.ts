/**
 * Inventory Models - State Machines and Domain Types
 *
 * Defines state machines and domain models for inventory management.
 * All types are vendor-neutral and mode-invariant.
 */

import {
  Identifier,
  MaterialId,
  CompanyCode,
  Timestamp,
  DateString,
  MonetaryAmount
} from '../../../common';

// ============================================================================
// Inventory Movement Types
// ============================================================================

/**
 * Inventory Movement Type State Machine
 *
 * Defines the types of inventory movements that can occur.
 */
export type InventoryMovementType =
  | 'RECEIPT'
  | 'ISSUE'
  | 'TRANSFER'
  | 'ADJUSTMENT';

/** Movement type metadata */
export interface MovementTypeMetadata {
  readonly type: InventoryMovementType;
  readonly affectsOnHand: boolean;
  readonly direction: 'IN' | 'OUT' | 'NEUTRAL';
  readonly requiresApproval: boolean;
  readonly reversible: boolean;
}

/** Movement type definitions */
export const MOVEMENT_TYPE_METADATA: Record<InventoryMovementType, MovementTypeMetadata> = {
  RECEIPT: {
    type: 'RECEIPT',
    affectsOnHand: true,
    direction: 'IN',
    requiresApproval: false,
    reversible: true
  },
  ISSUE: {
    type: 'ISSUE',
    affectsOnHand: true,
    direction: 'OUT',
    requiresApproval: false,
    reversible: true
  },
  TRANSFER: {
    type: 'TRANSFER',
    affectsOnHand: true,
    direction: 'NEUTRAL',
    requiresApproval: false,
    reversible: true
  },
  ADJUSTMENT: {
    type: 'ADJUSTMENT',
    affectsOnHand: true,
    direction: 'NEUTRAL',
    requiresApproval: true,
    reversible: true
  }
};

// ============================================================================
// Stock Status State Machine
// ============================================================================

/**
 * Stock Status State Machine
 *
 * States:
 *   AVAILABLE -> RESERVED -> BLOCKED -> IN_TRANSIT
 *
 * Valid Transitions:
 *   AVAILABLE -> RESERVED (via RESERVE)
 *   AVAILABLE -> BLOCKED (via BLOCK)
 *   RESERVED -> AVAILABLE (via RELEASE)
 *   RESERVED -> IN_TRANSIT (via SHIP)
 *   BLOCKED -> AVAILABLE (via UNBLOCK)
 *   IN_TRANSIT -> AVAILABLE (via RECEIVE)
 */
export type StockStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'BLOCKED'
  | 'IN_TRANSIT';

/** Stock status transition trigger */
export type StockStatusTransition =
  | 'RESERVE'
  | 'RELEASE'
  | 'BLOCK'
  | 'UNBLOCK'
  | 'SHIP'
  | 'RECEIVE';

/** Valid transitions from each state */
export const STOCK_STATUS_TRANSITIONS: Record<StockStatus, Partial<Record<StockStatusTransition, StockStatus>>> = {
  AVAILABLE: {
    RESERVE: 'RESERVED',
    BLOCK: 'BLOCKED'
  },
  RESERVED: {
    RELEASE: 'AVAILABLE',
    SHIP: 'IN_TRANSIT'
  },
  BLOCKED: {
    UNBLOCK: 'AVAILABLE'
  },
  IN_TRANSIT: {
    RECEIVE: 'AVAILABLE'
  }
};

/** Check if transition is valid */
export function isValidStockTransition(
  currentStatus: StockStatus,
  transition: StockStatusTransition
): boolean {
  const validTransitions = STOCK_STATUS_TRANSITIONS[currentStatus];
  return transition in validTransitions;
}

/** Get next status for a transition */
export function getNextStockStatus(
  currentStatus: StockStatus,
  transition: StockStatusTransition
): StockStatus | null {
  const validTransitions = STOCK_STATUS_TRANSITIONS[currentStatus];
  return validTransitions[transition] || null;
}

// ============================================================================
// Inventory Domain Models
// ============================================================================

/** Storage location identifier */
export type StorageLocationId = Identifier;

/** Warehouse identifier */
export type WarehouseId = Identifier;

/** Lot/Batch number */
export type LotNumber = string;

/** Serial number */
export type SerialNumber = string;

/** Unit of measure */
export type UnitOfMeasure = string;

/** Stock keeping unit */
export interface StockKeepingUnit {
  readonly materialId: MaterialId;
  readonly companyCode: CompanyCode;
  readonly warehouseId: WarehouseId;
  readonly storageLocationId: StorageLocationId;
  readonly lotNumber?: LotNumber;
  readonly serialNumber?: SerialNumber;
}

/** Stock level record */
export interface StockLevel {
  readonly sku: StockKeepingUnit;
  readonly onHandQuantity: number;
  readonly availableQuantity: number;
  readonly reservedQuantity: number;
  readonly blockedQuantity: number;
  readonly inTransitQuantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly status: StockStatus;
  readonly lastMovementDate: DateString;
  readonly lastCountDate: DateString | null;
  readonly valuationAmount: MonetaryAmount;
}

/** Inventory movement record */
export interface InventoryMovement {
  readonly movementId: Identifier;
  readonly movementType: InventoryMovementType;
  readonly materialId: MaterialId;
  readonly fromLocation: StockKeepingUnit | null;
  readonly toLocation: StockKeepingUnit | null;
  readonly quantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly movementDate: DateString;
  readonly postingDate: DateString;
  readonly referenceDocument: string | null;
  readonly referenceDocumentItem: string | null;
  readonly reason: string;
  readonly reversalIndicator: boolean;
  readonly reversalMovementId: Identifier | null;
  readonly createdAt: Timestamp;
  readonly createdBy: string;
}

/** Inventory count record */
export interface InventoryCount {
  readonly countId: Identifier;
  readonly countType: CountType;
  readonly warehouseId: WarehouseId;
  readonly storageLocationId: StorageLocationId;
  readonly countDate: DateString;
  readonly status: CountStatus;
  readonly items: InventoryCountItem[];
  readonly createdAt: Timestamp;
  readonly createdBy: string;
  readonly completedAt: Timestamp | null;
  readonly completedBy: string | null;
}

/** Inventory count item */
export interface InventoryCountItem {
  readonly materialId: MaterialId;
  readonly lotNumber?: LotNumber;
  readonly serialNumber?: SerialNumber;
  readonly systemQuantity: number;
  readonly countedQuantity: number | null;
  readonly variance: number | null;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly status: CountItemStatus;
}

/** Count type */
export type CountType =
  | 'CYCLE_COUNT'
  | 'PHYSICAL_INVENTORY'
  | 'SPOT_CHECK';

/** Count status state machine */
export type CountStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'PENDING_REVIEW'
  | 'COMPLETED'
  | 'CANCELLED';

/** Count item status */
export type CountItemStatus =
  | 'NOT_COUNTED'
  | 'COUNTED'
  | 'VARIANCE_APPROVED'
  | 'VARIANCE_REJECTED';

/** Inventory valuation record */
export interface InventoryValuation {
  readonly valuationId: Identifier;
  readonly materialId: MaterialId;
  readonly warehouseId: WarehouseId;
  readonly valuationDate: DateString;
  readonly previousValue: MonetaryAmount;
  readonly newValue: MonetaryAmount;
  readonly valuationMethod: ValuationMethod;
  readonly reason: string;
  readonly createdAt: Timestamp;
  readonly createdBy: string;
}

/** Valuation method */
export type ValuationMethod =
  | 'STANDARD_COST'
  | 'MOVING_AVERAGE'
  | 'FIFO'
  | 'LIFO'
  | 'SPECIFIC_IDENTIFICATION';

// ============================================================================
// Validation Functions
// ============================================================================

/** Validate movement type */
export function isValidMovementType(type: string): type is InventoryMovementType {
  return ['RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT'].includes(type);
}

/** Validate stock status */
export function isValidStockStatus(status: string): status is StockStatus {
  return ['AVAILABLE', 'RESERVED', 'BLOCKED', 'IN_TRANSIT'].includes(status);
}

/** Validate count type */
export function isValidCountType(type: string): type is CountType {
  return ['CYCLE_COUNT', 'PHYSICAL_INVENTORY', 'SPOT_CHECK'].includes(type);
}

/** Validate valuation method */
export function isValidValuationMethod(method: string): method is ValuationMethod {
  return ['STANDARD_COST', 'MOVING_AVERAGE', 'FIFO', 'LIFO', 'SPECIFIC_IDENTIFICATION'].includes(method);
}
