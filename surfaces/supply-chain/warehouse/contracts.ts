/**
 * Warehouse Surface Contracts
 *
 * Defines typed contracts for warehouse management operations.
 * All contracts include preconditions, postconditions, state transitions, and observable events.
 */

import {
  Result,
  Results,
  SurfaceError,
  ErrorFactory,
  ValidationError,
  Identifier,
  MaterialId,
  CompanyCode,
  CorrelationId,
  CausationId,
  UUID,
  Timestamp,
  DateString,
  MonetaryAmount,
  TimestampProvider,
  SystemTimestampProvider,
  IdentityOperations,
  SONumber,
  BaseEvent,
  CorrelatedEvent,
  SemanticVersion
} from '../../../common';

// ============================================================================
// Surface Constants
// ============================================================================

export const WAREHOUSE_SURFACE = 'WarehouseSurface';
export const WAREHOUSE_SURFACE_VERSION: SemanticVersion = '1.0.0';

// ============================================================================
// Warehouse Domain Types
// ============================================================================

/** Warehouse identifier */
export type WarehouseId = Identifier;

/** Storage location identifier */
export type StorageLocationId = Identifier;

/** Pick list identifier */
export type PickListId = Identifier;

/** Packing slip identifier */
export type PackingSlipId = Identifier;

/** Shipment identifier */
export type ShipmentId = Identifier;

/** Order line item identifier */
export type OrderLineId = Identifier;

/** Unit of measure */
export type UnitOfMeasure = string;

// ============================================================================
// Pick List State Machine
// ============================================================================

/**
 * Pick List Status State Machine
 *
 * States:
 *   CREATED -> RELEASED -> IN_PROGRESS -> COMPLETED -> CANCELLED
 *
 * Valid Transitions:
 *   CREATED -> RELEASED (via RELEASE)
 *   RELEASED -> IN_PROGRESS (via START_PICKING)
 *   RELEASED -> CANCELLED (via CANCEL)
 *   IN_PROGRESS -> COMPLETED (via COMPLETE)
 *   IN_PROGRESS -> CANCELLED (via CANCEL)
 */
export type PickListStatus =
  | 'CREATED'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type PickListTransition =
  | 'RELEASE'
  | 'START_PICKING'
  | 'COMPLETE'
  | 'CANCEL';

export const PICK_LIST_TRANSITIONS: Record<PickListStatus, Partial<Record<PickListTransition, PickListStatus>>> = {
  CREATED: {
    RELEASE: 'RELEASED'
  },
  RELEASED: {
    START_PICKING: 'IN_PROGRESS',
    CANCEL: 'CANCELLED'
  },
  IN_PROGRESS: {
    COMPLETE: 'COMPLETED',
    CANCEL: 'CANCELLED'
  },
  COMPLETED: {},
  CANCELLED: {}
};

// ============================================================================
// Shipment Status State Machine
// ============================================================================

/**
 * Shipment Status State Machine
 *
 * States:
 *   PLANNED -> PACKED -> SHIPPED -> IN_TRANSIT -> DELIVERED -> CANCELLED
 */
export type ShipmentStatus =
  | 'PLANNED'
  | 'PACKED'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export type ShipmentTransition =
  | 'PACK'
  | 'SHIP'
  | 'DEPART'
  | 'DELIVER'
  | 'CANCEL';

export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, Partial<Record<ShipmentTransition, ShipmentStatus>>> = {
  PLANNED: {
    PACK: 'PACKED',
    CANCEL: 'CANCELLED'
  },
  PACKED: {
    SHIP: 'SHIPPED',
    CANCEL: 'CANCELLED'
  },
  SHIPPED: {
    DEPART: 'IN_TRANSIT'
  },
  IN_TRANSIT: {
    DELIVER: 'DELIVERED'
  },
  DELIVERED: {},
  CANCELLED: {}
};

// ============================================================================
// Domain Models
// ============================================================================

/** Pick list model */
export interface PickList {
  readonly pickListId: PickListId;
  readonly salesOrderNumber: SONumber;
  readonly warehouseId: WarehouseId;
  readonly status: PickListStatus;
  readonly items: PickListItem[];
  readonly priority: PickListPriority;
  readonly requestedShipDate: DateString;
  readonly createdAt: Timestamp;
  readonly createdBy: string;
  readonly releasedAt: Timestamp | null;
  readonly completedAt: Timestamp | null;
}

/** Pick list item */
export interface PickListItem {
  readonly orderLineId: OrderLineId;
  readonly materialId: MaterialId;
  readonly requestedQuantity: number;
  readonly pickedQuantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly fromStorageLocation: StorageLocationId;
  readonly status: PickItemStatus;
}

/** Pick item status */
export type PickItemStatus =
  | 'PENDING'
  | 'PICKED'
  | 'SHORT_PICKED'
  | 'CANCELLED';

/** Pick list priority */
export type PickListPriority =
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'URGENT';

/** Packing slip model */
export interface PackingSlip {
  readonly packingSlipId: PackingSlipId;
  readonly pickListId: PickListId;
  readonly salesOrderNumber: SONumber;
  readonly warehouseId: WarehouseId;
  readonly items: PackingSlipItem[];
  readonly totalWeight: number;
  readonly weightUnit: string;
  readonly totalVolume: number;
  readonly volumeUnit: string;
  readonly packageCount: number;
  readonly createdAt: Timestamp;
  readonly createdBy: string;
}

/** Packing slip item */
export interface PackingSlipItem {
  readonly orderLineId: OrderLineId;
  readonly materialId: MaterialId;
  readonly packedQuantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly lotNumber?: string;
  readonly serialNumber?: string;
}

/** Shipment model */
export interface Shipment {
  readonly shipmentId: ShipmentId;
  readonly packingSlipId: PackingSlipId;
  readonly salesOrderNumber: SONumber;
  readonly status: ShipmentStatus;
  readonly carrier: string;
  readonly trackingNumber: string | null;
  readonly shipFromAddress: Address;
  readonly shipToAddress: Address;
  readonly scheduledShipDate: DateString;
  readonly actualShipDate: DateString | null;
  readonly estimatedDeliveryDate: DateString | null;
  readonly actualDeliveryDate: DateString | null;
  readonly shippingCost: MonetaryAmount;
  readonly createdAt: Timestamp;
  readonly createdBy: string;
}

/** Address model */
export interface Address {
  readonly addressLine1: string;
  readonly addressLine2?: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;
}

// ============================================================================
// Warehouse Events
// ============================================================================

/** Event: Pick list created */
export interface PickListCreatedEvent extends CorrelatedEvent {
  readonly eventType: 'PICK_LIST_CREATED';
  readonly pickListId: PickListId;
  readonly salesOrderNumber: SONumber;
  readonly warehouseId: WarehouseId;
  readonly itemCount: number;
  readonly priority: PickListPriority;
}

/** Event: Pick confirmed */
export interface PickConfirmedEvent extends CorrelatedEvent {
  readonly eventType: 'PICK_CONFIRMED';
  readonly pickListId: PickListId;
  readonly itemsConfirmed: number;
  readonly itemsShortPicked: number;
  readonly completedAt: Timestamp;
}

/** Event: Packing slip created */
export interface PackingSlipCreatedEvent extends CorrelatedEvent {
  readonly eventType: 'PACKING_SLIP_CREATED';
  readonly packingSlipId: PackingSlipId;
  readonly pickListId: PickListId;
  readonly salesOrderNumber: SONumber;
  readonly packageCount: number;
  readonly totalWeight: number;
}

/** Event: Order shipped */
export interface OrderShippedEvent extends CorrelatedEvent {
  readonly eventType: 'ORDER_SHIPPED';
  readonly shipmentId: ShipmentId;
  readonly salesOrderNumber: SONumber;
  readonly carrier: string;
  readonly trackingNumber: string | null;
  readonly shippedAt: Timestamp;
  readonly estimatedDelivery: DateString | null;
}

/** All warehouse events */
export type WarehouseEvent =
  | PickListCreatedEvent
  | PickConfirmedEvent
  | PackingSlipCreatedEvent
  | OrderShippedEvent;

// ============================================================================
// Event Factory
// ============================================================================

export const WarehouseEventFactory = {
  pickListCreated(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    pickListId: PickListId,
    salesOrderNumber: SONumber,
    warehouseId: WarehouseId,
    itemCount: number,
    priority: PickListPriority,
    timestamp: Timestamp,
    eventId: UUID
  ): PickListCreatedEvent {
    return {
      eventId,
      eventType: 'PICK_LIST_CREATED',
      timestamp,
      surface: WAREHOUSE_SURFACE,
      operation: 'CreatePickList',
      surfaceVersion: WAREHOUSE_SURFACE_VERSION,
      correlationId,
      causationId,
      pickListId,
      salesOrderNumber,
      warehouseId,
      itemCount,
      priority
    };
  },

  pickConfirmed(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    pickListId: PickListId,
    itemsConfirmed: number,
    itemsShortPicked: number,
    completedAt: Timestamp,
    timestamp: Timestamp,
    eventId: UUID
  ): PickConfirmedEvent {
    return {
      eventId,
      eventType: 'PICK_CONFIRMED',
      timestamp,
      surface: WAREHOUSE_SURFACE,
      operation: 'ConfirmPick',
      surfaceVersion: WAREHOUSE_SURFACE_VERSION,
      correlationId,
      causationId,
      pickListId,
      itemsConfirmed,
      itemsShortPicked,
      completedAt
    };
  },

  packingSlipCreated(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    packingSlipId: PackingSlipId,
    pickListId: PickListId,
    salesOrderNumber: SONumber,
    packageCount: number,
    totalWeight: number,
    timestamp: Timestamp,
    eventId: UUID
  ): PackingSlipCreatedEvent {
    return {
      eventId,
      eventType: 'PACKING_SLIP_CREATED',
      timestamp,
      surface: WAREHOUSE_SURFACE,
      operation: 'CreatePackingSlip',
      surfaceVersion: WAREHOUSE_SURFACE_VERSION,
      correlationId,
      causationId,
      packingSlipId,
      pickListId,
      salesOrderNumber,
      packageCount,
      totalWeight
    };
  },

  orderShipped(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    shipmentId: ShipmentId,
    salesOrderNumber: SONumber,
    carrier: string,
    trackingNumber: string | null,
    shippedAt: Timestamp,
    estimatedDelivery: DateString | null,
    timestamp: Timestamp,
    eventId: UUID
  ): OrderShippedEvent {
    return {
      eventId,
      eventType: 'ORDER_SHIPPED',
      timestamp,
      surface: WAREHOUSE_SURFACE,
      operation: 'ShipOrder',
      surfaceVersion: WAREHOUSE_SURFACE_VERSION,
      correlationId,
      causationId,
      shipmentId,
      salesOrderNumber,
      carrier,
      trackingNumber,
      shippedAt,
      estimatedDelivery
    };
  }
};

// ============================================================================
// CreatePickList Contract
// ============================================================================

/** Input for CreatePickList operation */
export interface CreatePickListInput {
  readonly salesOrderNumber: SONumber;
  readonly warehouseId: WarehouseId;
  readonly items: CreatePickListItemInput[];
  readonly priority: PickListPriority;
  readonly requestedShipDate: DateString;
  readonly correlationId: CorrelationId;
}

/** Pick list item input */
export interface CreatePickListItemInput {
  readonly orderLineId: OrderLineId;
  readonly materialId: MaterialId;
  readonly quantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly preferredStorageLocation?: StorageLocationId;
}

/** Output for CreatePickList operation */
export interface CreatePickListOutput {
  readonly pickList: PickList;
  readonly event: PickListCreatedEvent;
}

/** CreatePickList precondition predicates */
export const CreatePickListPreconditions = {
  hasSalesOrderNumber(input: CreatePickListInput): boolean {
    return input.salesOrderNumber !== undefined && input.salesOrderNumber.trim().length > 0;
  },

  hasWarehouseId(input: CreatePickListInput): boolean {
    return input.warehouseId !== undefined && input.warehouseId.trim().length > 0;
  },

  hasItems(input: CreatePickListInput): boolean {
    return input.items !== undefined && input.items.length > 0;
  },

  allItemsHavePositiveQuantity(input: CreatePickListInput): boolean {
    return input.items.every(item => item.quantity > 0);
  },

  all(input: CreatePickListInput): boolean {
    return (
      this.hasSalesOrderNumber(input) &&
      this.hasWarehouseId(input) &&
      this.hasItems(input) &&
      this.allItemsHavePositiveQuantity(input)
    );
  }
};

/** CreatePickList postcondition predicates */
export const CreatePickListPostconditions = {
  hasPickList(output: CreatePickListOutput): boolean {
    return output.pickList !== undefined;
  },

  pickListIsCreated(output: CreatePickListOutput): boolean {
    return output.pickList.status === 'CREATED';
  },

  hasEvent(output: CreatePickListOutput): boolean {
    return output.event !== undefined && output.event.eventType === 'PICK_LIST_CREATED';
  },

  all(input: CreatePickListInput, output: CreatePickListOutput): boolean {
    return (
      this.hasPickList(output) &&
      this.pickListIsCreated(output) &&
      this.hasEvent(output)
    );
  }
};

/** CreatePickList contract implementation */
export class CreatePickListContract {
  readonly name = 'CreatePickList';
  readonly surface = WAREHOUSE_SURFACE;
  readonly version = WAREHOUSE_SURFACE_VERSION;

  constructor(
    private readonly pickListRepository: PickListRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: CreatePickListInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!CreatePickListPreconditions.hasSalesOrderNumber(input)) {
      violations.push({
        field: 'salesOrderNumber',
        rule: 'required',
        message: 'Sales order number is required',
        severity: 'ERROR'
      });
    }

    if (!CreatePickListPreconditions.hasWarehouseId(input)) {
      violations.push({
        field: 'warehouseId',
        rule: 'required',
        message: 'Warehouse ID is required',
        severity: 'ERROR'
      });
    }

    if (!CreatePickListPreconditions.hasItems(input)) {
      violations.push({
        field: 'items',
        rule: 'not_empty',
        message: 'At least one item is required',
        severity: 'ERROR'
      });
    }

    if (!CreatePickListPreconditions.allItemsHavePositiveQuantity(input)) {
      violations.push({
        field: 'items.quantity',
        rule: 'positive',
        message: 'All item quantities must be positive',
        severity: 'ERROR'
      });
    }

    if (violations.length > 0) {
      return Results.failure(
        ErrorFactory.preconditionViolation(this.surface, this.name, violations)
      );
    }

    return Results.success(undefined);
  }

  async execute(input: CreatePickListInput): Promise<Result<CreatePickListOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<CreatePickListOutput, SurfaceError>;
    }

    const timestamp = this.timestampProvider.now();
    const pickListId = IdentityOperations.generateUUID();
    const eventId = IdentityOperations.generateUUID();

    const items: PickListItem[] = input.items.map(item => ({
      orderLineId: item.orderLineId,
      materialId: item.materialId,
      requestedQuantity: item.quantity,
      pickedQuantity: 0,
      unitOfMeasure: item.unitOfMeasure,
      fromStorageLocation: item.preferredStorageLocation || '',
      status: 'PENDING' as PickItemStatus
    }));

    const pickList: PickList = {
      pickListId,
      salesOrderNumber: input.salesOrderNumber,
      warehouseId: input.warehouseId,
      status: 'CREATED',
      items,
      priority: input.priority,
      requestedShipDate: input.requestedShipDate,
      createdAt: timestamp,
      createdBy: 'SYSTEM',
      releasedAt: null,
      completedAt: null
    };

    const event = WarehouseEventFactory.pickListCreated(
      input.correlationId,
      null,
      pickListId,
      input.salesOrderNumber,
      input.warehouseId,
      items.length,
      input.priority,
      timestamp,
      eventId
    );

    return Results.success({ pickList, event });
  }

  checkPostconditions(input: CreatePickListInput, output: CreatePickListOutput): Result<void, ValidationError> {
    if (!CreatePickListPostconditions.all(input, output)) {
      return Results.failure(
        ErrorFactory.businessRuleViolation(
          this.surface,
          this.name,
          'postcondition_violation',
          'Postcondition check failed'
        )
      );
    }
    return Results.success(undefined);
  }
}

// ============================================================================
// ConfirmPick Contract
// ============================================================================

/** Input for ConfirmPick operation */
export interface ConfirmPickInput {
  readonly pickListId: PickListId;
  readonly items: ConfirmPickItemInput[];
  readonly correlationId: CorrelationId;
}

/** Confirm pick item input */
export interface ConfirmPickItemInput {
  readonly orderLineId: OrderLineId;
  readonly pickedQuantity: number;
  readonly actualStorageLocation: StorageLocationId;
  readonly lotNumber?: string;
  readonly serialNumber?: string;
}

/** Output for ConfirmPick operation */
export interface ConfirmPickOutput {
  readonly pickList: PickList;
  readonly itemsConfirmed: number;
  readonly itemsShortPicked: number;
  readonly event: PickConfirmedEvent;
}

/** ConfirmPick precondition predicates */
export const ConfirmPickPreconditions = {
  hasPickListId(input: ConfirmPickInput): boolean {
    return input.pickListId !== undefined && input.pickListId.trim().length > 0;
  },

  hasItems(input: ConfirmPickInput): boolean {
    return input.items !== undefined && input.items.length > 0;
  },

  allQuantitiesNonNegative(input: ConfirmPickInput): boolean {
    return input.items.every(item => item.pickedQuantity >= 0);
  },

  all(input: ConfirmPickInput): boolean {
    return (
      this.hasPickListId(input) &&
      this.hasItems(input) &&
      this.allQuantitiesNonNegative(input)
    );
  }
};

/** ConfirmPick contract implementation */
export class ConfirmPickContract {
  readonly name = 'ConfirmPick';
  readonly surface = WAREHOUSE_SURFACE;
  readonly version = WAREHOUSE_SURFACE_VERSION;

  constructor(
    private readonly pickListRepository: PickListRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: ConfirmPickInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!ConfirmPickPreconditions.hasPickListId(input)) {
      violations.push({
        field: 'pickListId',
        rule: 'required',
        message: 'Pick list ID is required',
        severity: 'ERROR'
      });
    }

    if (!ConfirmPickPreconditions.hasItems(input)) {
      violations.push({
        field: 'items',
        rule: 'not_empty',
        message: 'At least one item confirmation is required',
        severity: 'ERROR'
      });
    }

    if (!ConfirmPickPreconditions.allQuantitiesNonNegative(input)) {
      violations.push({
        field: 'items.pickedQuantity',
        rule: 'non_negative',
        message: 'All picked quantities must be non-negative',
        severity: 'ERROR'
      });
    }

    if (violations.length > 0) {
      return Results.failure(
        ErrorFactory.preconditionViolation(this.surface, this.name, violations)
      );
    }

    return Results.success(undefined);
  }

  async execute(input: ConfirmPickInput): Promise<Result<ConfirmPickOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<ConfirmPickOutput, SurfaceError>;
    }

    const pickListResult = await this.pickListRepository.getPickList(input.pickListId);
    if (!pickListResult.success) {
      return pickListResult as Result<ConfirmPickOutput, SurfaceError>;
    }

    const timestamp = this.timestampProvider.now();
    const eventId = IdentityOperations.generateUUID();

    const existingPickList = pickListResult.data;
    let itemsConfirmed = 0;
    let itemsShortPicked = 0;

    const updatedItems: PickListItem[] = existingPickList.items.map(item => {
      const confirmation = input.items.find(i => i.orderLineId === item.orderLineId);
      if (!confirmation) {
        return item;
      }

      const isShortPicked = confirmation.pickedQuantity < item.requestedQuantity;
      if (isShortPicked) {
        itemsShortPicked++;
      } else {
        itemsConfirmed++;
      }

      return {
        ...item,
        pickedQuantity: confirmation.pickedQuantity,
        fromStorageLocation: confirmation.actualStorageLocation,
        status: isShortPicked ? 'SHORT_PICKED' as PickItemStatus : 'PICKED' as PickItemStatus
      };
    });

    const updatedPickList: PickList = {
      ...existingPickList,
      items: updatedItems,
      status: 'COMPLETED',
      completedAt: timestamp
    };

    const event = WarehouseEventFactory.pickConfirmed(
      input.correlationId,
      null,
      input.pickListId,
      itemsConfirmed,
      itemsShortPicked,
      timestamp,
      timestamp,
      eventId
    );

    return Results.success({
      pickList: updatedPickList,
      itemsConfirmed,
      itemsShortPicked,
      event
    });
  }
}

// ============================================================================
// CreatePackingSlip Contract
// ============================================================================

/** Input for CreatePackingSlip operation */
export interface CreatePackingSlipInput {
  readonly pickListId: PickListId;
  readonly items: CreatePackingSlipItemInput[];
  readonly totalWeight: number;
  readonly weightUnit: string;
  readonly totalVolume: number;
  readonly volumeUnit: string;
  readonly packageCount: number;
  readonly correlationId: CorrelationId;
}

/** Packing slip item input */
export interface CreatePackingSlipItemInput {
  readonly orderLineId: OrderLineId;
  readonly materialId: MaterialId;
  readonly packedQuantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly lotNumber?: string;
  readonly serialNumber?: string;
}

/** Output for CreatePackingSlip operation */
export interface CreatePackingSlipOutput {
  readonly packingSlip: PackingSlip;
  readonly event: PackingSlipCreatedEvent;
}

/** CreatePackingSlip precondition predicates */
export const CreatePackingSlipPreconditions = {
  hasPickListId(input: CreatePackingSlipInput): boolean {
    return input.pickListId !== undefined && input.pickListId.trim().length > 0;
  },

  hasItems(input: CreatePackingSlipInput): boolean {
    return input.items !== undefined && input.items.length > 0;
  },

  hasPositivePackageCount(input: CreatePackingSlipInput): boolean {
    return input.packageCount > 0;
  },

  all(input: CreatePackingSlipInput): boolean {
    return (
      this.hasPickListId(input) &&
      this.hasItems(input) &&
      this.hasPositivePackageCount(input)
    );
  }
};

/** CreatePackingSlip contract implementation */
export class CreatePackingSlipContract {
  readonly name = 'CreatePackingSlip';
  readonly surface = WAREHOUSE_SURFACE;
  readonly version = WAREHOUSE_SURFACE_VERSION;

  constructor(
    private readonly pickListRepository: PickListRepository,
    private readonly packingSlipRepository: PackingSlipRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: CreatePackingSlipInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!CreatePackingSlipPreconditions.hasPickListId(input)) {
      violations.push({
        field: 'pickListId',
        rule: 'required',
        message: 'Pick list ID is required',
        severity: 'ERROR'
      });
    }

    if (!CreatePackingSlipPreconditions.hasItems(input)) {
      violations.push({
        field: 'items',
        rule: 'not_empty',
        message: 'At least one item is required',
        severity: 'ERROR'
      });
    }

    if (!CreatePackingSlipPreconditions.hasPositivePackageCount(input)) {
      violations.push({
        field: 'packageCount',
        rule: 'positive',
        message: 'Package count must be positive',
        severity: 'ERROR'
      });
    }

    if (violations.length > 0) {
      return Results.failure(
        ErrorFactory.preconditionViolation(this.surface, this.name, violations)
      );
    }

    return Results.success(undefined);
  }

  async execute(input: CreatePackingSlipInput): Promise<Result<CreatePackingSlipOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<CreatePackingSlipOutput, SurfaceError>;
    }

    const pickListResult = await this.pickListRepository.getPickList(input.pickListId);
    if (!pickListResult.success) {
      return pickListResult as Result<CreatePackingSlipOutput, SurfaceError>;
    }

    const timestamp = this.timestampProvider.now();
    const packingSlipId = IdentityOperations.generateUUID();
    const eventId = IdentityOperations.generateUUID();

    const pickList = pickListResult.data;

    const items: PackingSlipItem[] = input.items.map(item => ({
      orderLineId: item.orderLineId,
      materialId: item.materialId,
      packedQuantity: item.packedQuantity,
      unitOfMeasure: item.unitOfMeasure,
      lotNumber: item.lotNumber,
      serialNumber: item.serialNumber
    }));

    const packingSlip: PackingSlip = {
      packingSlipId,
      pickListId: input.pickListId,
      salesOrderNumber: pickList.salesOrderNumber,
      warehouseId: pickList.warehouseId,
      items,
      totalWeight: input.totalWeight,
      weightUnit: input.weightUnit,
      totalVolume: input.totalVolume,
      volumeUnit: input.volumeUnit,
      packageCount: input.packageCount,
      createdAt: timestamp,
      createdBy: 'SYSTEM'
    };

    const event = WarehouseEventFactory.packingSlipCreated(
      input.correlationId,
      null,
      packingSlipId,
      input.pickListId,
      pickList.salesOrderNumber,
      input.packageCount,
      input.totalWeight,
      timestamp,
      eventId
    );

    return Results.success({ packingSlip, event });
  }
}

// ============================================================================
// ShipOrder Contract
// ============================================================================

/** Input for ShipOrder operation */
export interface ShipOrderInput {
  readonly packingSlipId: PackingSlipId;
  readonly carrier: string;
  readonly trackingNumber?: string;
  readonly shipFromAddress: Address;
  readonly shipToAddress: Address;
  readonly scheduledShipDate: DateString;
  readonly shippingCost: MonetaryAmount;
  readonly correlationId: CorrelationId;
}

/** Output for ShipOrder operation */
export interface ShipOrderOutput {
  readonly shipment: Shipment;
  readonly event: OrderShippedEvent;
}

/** ShipOrder precondition predicates */
export const ShipOrderPreconditions = {
  hasPackingSlipId(input: ShipOrderInput): boolean {
    return input.packingSlipId !== undefined && input.packingSlipId.trim().length > 0;
  },

  hasCarrier(input: ShipOrderInput): boolean {
    return input.carrier !== undefined && input.carrier.trim().length > 0;
  },

  hasShipFromAddress(input: ShipOrderInput): boolean {
    return input.shipFromAddress !== undefined && input.shipFromAddress.addressLine1.trim().length > 0;
  },

  hasShipToAddress(input: ShipOrderInput): boolean {
    return input.shipToAddress !== undefined && input.shipToAddress.addressLine1.trim().length > 0;
  },

  all(input: ShipOrderInput): boolean {
    return (
      this.hasPackingSlipId(input) &&
      this.hasCarrier(input) &&
      this.hasShipFromAddress(input) &&
      this.hasShipToAddress(input)
    );
  }
};

/** ShipOrder contract implementation */
export class ShipOrderContract {
  readonly name = 'ShipOrder';
  readonly surface = WAREHOUSE_SURFACE;
  readonly version = WAREHOUSE_SURFACE_VERSION;

  constructor(
    private readonly packingSlipRepository: PackingSlipRepository,
    private readonly shipmentRepository: ShipmentRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: ShipOrderInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!ShipOrderPreconditions.hasPackingSlipId(input)) {
      violations.push({
        field: 'packingSlipId',
        rule: 'required',
        message: 'Packing slip ID is required',
        severity: 'ERROR'
      });
    }

    if (!ShipOrderPreconditions.hasCarrier(input)) {
      violations.push({
        field: 'carrier',
        rule: 'required',
        message: 'Carrier is required',
        severity: 'ERROR'
      });
    }

    if (!ShipOrderPreconditions.hasShipFromAddress(input)) {
      violations.push({
        field: 'shipFromAddress',
        rule: 'required',
        message: 'Ship from address is required',
        severity: 'ERROR'
      });
    }

    if (!ShipOrderPreconditions.hasShipToAddress(input)) {
      violations.push({
        field: 'shipToAddress',
        rule: 'required',
        message: 'Ship to address is required',
        severity: 'ERROR'
      });
    }

    if (violations.length > 0) {
      return Results.failure(
        ErrorFactory.preconditionViolation(this.surface, this.name, violations)
      );
    }

    return Results.success(undefined);
  }

  async execute(input: ShipOrderInput): Promise<Result<ShipOrderOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<ShipOrderOutput, SurfaceError>;
    }

    const packingSlipResult = await this.packingSlipRepository.getPackingSlip(input.packingSlipId);
    if (!packingSlipResult.success) {
      return packingSlipResult as Result<ShipOrderOutput, SurfaceError>;
    }

    const timestamp = this.timestampProvider.now();
    const shipmentId = IdentityOperations.generateUUID();
    const eventId = IdentityOperations.generateUUID();

    const packingSlip = packingSlipResult.data;

    const shipment: Shipment = {
      shipmentId,
      packingSlipId: input.packingSlipId,
      salesOrderNumber: packingSlip.salesOrderNumber,
      status: 'SHIPPED',
      carrier: input.carrier,
      trackingNumber: input.trackingNumber || null,
      shipFromAddress: input.shipFromAddress,
      shipToAddress: input.shipToAddress,
      scheduledShipDate: input.scheduledShipDate,
      actualShipDate: this.timestampProvider.today(),
      estimatedDeliveryDate: null,
      actualDeliveryDate: null,
      shippingCost: input.shippingCost,
      createdAt: timestamp,
      createdBy: 'SYSTEM'
    };

    const event = WarehouseEventFactory.orderShipped(
      input.correlationId,
      null,
      shipmentId,
      packingSlip.salesOrderNumber,
      input.carrier,
      input.trackingNumber || null,
      timestamp,
      null,
      timestamp,
      eventId
    );

    return Results.success({ shipment, event });
  }
}

// ============================================================================
// Repository Interfaces
// ============================================================================

/** Pick list repository interface */
export interface PickListRepository {
  createPickList(pickList: PickList): Promise<Result<PickList, SurfaceError>>;
  getPickList(pickListId: PickListId): Promise<Result<PickList, SurfaceError>>;
  updatePickList(pickList: PickList): Promise<Result<PickList, SurfaceError>>;
}

/** Packing slip repository interface */
export interface PackingSlipRepository {
  createPackingSlip(packingSlip: PackingSlip): Promise<Result<PackingSlip, SurfaceError>>;
  getPackingSlip(packingSlipId: PackingSlipId): Promise<Result<PackingSlip, SurfaceError>>;
}

/** Shipment repository interface */
export interface ShipmentRepository {
  createShipment(shipment: Shipment): Promise<Result<Shipment, SurfaceError>>;
  getShipment(shipmentId: ShipmentId): Promise<Result<Shipment, SurfaceError>>;
  updateShipment(shipment: Shipment): Promise<Result<Shipment, SurfaceError>>;
}

// ============================================================================
// Warehouse Surface
// ============================================================================

/** Warehouse surface facade */
export interface WarehouseSurface {
  createPickList(input: CreatePickListInput): Promise<Result<CreatePickListOutput, SurfaceError>>;
  confirmPick(input: ConfirmPickInput): Promise<Result<ConfirmPickOutput, SurfaceError>>;
  createPackingSlip(input: CreatePackingSlipInput): Promise<Result<CreatePackingSlipOutput, SurfaceError>>;
  shipOrder(input: ShipOrderInput): Promise<Result<ShipOrderOutput, SurfaceError>>;
}

/** Default warehouse surface implementation */
export class DefaultWarehouseSurface implements WarehouseSurface {
  private readonly createPickListContract: CreatePickListContract;
  private readonly confirmPickContract: ConfirmPickContract;
  private readonly createPackingSlipContract: CreatePackingSlipContract;
  private readonly shipOrderContract: ShipOrderContract;

  constructor(
    pickListRepository: PickListRepository,
    packingSlipRepository: PackingSlipRepository,
    shipmentRepository: ShipmentRepository,
    timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {
    this.createPickListContract = new CreatePickListContract(pickListRepository, timestampProvider);
    this.confirmPickContract = new ConfirmPickContract(pickListRepository, timestampProvider);
    this.createPackingSlipContract = new CreatePackingSlipContract(pickListRepository, packingSlipRepository, timestampProvider);
    this.shipOrderContract = new ShipOrderContract(packingSlipRepository, shipmentRepository, timestampProvider);
  }

  async createPickList(input: CreatePickListInput): Promise<Result<CreatePickListOutput, SurfaceError>> {
    return this.createPickListContract.execute(input);
  }

  async confirmPick(input: ConfirmPickInput): Promise<Result<ConfirmPickOutput, SurfaceError>> {
    return this.confirmPickContract.execute(input);
  }

  async createPackingSlip(input: CreatePackingSlipInput): Promise<Result<CreatePackingSlipOutput, SurfaceError>> {
    return this.createPackingSlipContract.execute(input);
  }

  async shipOrder(input: ShipOrderInput): Promise<Result<ShipOrderOutput, SurfaceError>> {
    return this.shipOrderContract.execute(input);
  }
}
