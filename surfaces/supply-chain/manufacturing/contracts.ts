/**
 * Manufacturing Surface Contracts
 *
 * Defines typed contracts for manufacturing operations.
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
  BaseEvent,
  CorrelatedEvent,
  SemanticVersion
} from '../../../common';

// ============================================================================
// Surface Constants
// ============================================================================

export const MANUFACTURING_SURFACE = 'ManufacturingSurface';
export const MANUFACTURING_SURFACE_VERSION: SemanticVersion = '1.0.0';

// ============================================================================
// Manufacturing Domain Types
// ============================================================================

/** Production order identifier */
export type ProductionOrderId = Identifier;

/** Work center identifier */
export type WorkCenterId = Identifier;

/** Operation identifier */
export type OperationId = Identifier;

/** Bill of materials identifier */
export type BOMId = Identifier;

/** Routing identifier */
export type RoutingId = Identifier;

/** Unit of measure */
export type UnitOfMeasure = string;

// ============================================================================
// Production Order Status State Machine
// ============================================================================

/**
 * Production Order Status State Machine
 *
 * States:
 *   CREATED -> PLANNED -> RELEASED -> IN_PROGRESS -> COMPLETED -> CLOSED
 *
 * Valid Transitions:
 *   CREATED -> PLANNED (via PLAN)
 *   PLANNED -> RELEASED (via RELEASE)
 *   PLANNED -> CANCELLED (via CANCEL)
 *   RELEASED -> IN_PROGRESS (via START)
 *   RELEASED -> CANCELLED (via CANCEL)
 *   IN_PROGRESS -> COMPLETED (via COMPLETE)
 *   IN_PROGRESS -> ON_HOLD (via HOLD)
 *   ON_HOLD -> IN_PROGRESS (via RESUME)
 *   COMPLETED -> CLOSED (via CLOSE)
 */
export type ProductionOrderStatus =
  | 'CREATED'
  | 'PLANNED'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

export type ProductionOrderTransition =
  | 'PLAN'
  | 'RELEASE'
  | 'START'
  | 'HOLD'
  | 'RESUME'
  | 'COMPLETE'
  | 'CLOSE'
  | 'CANCEL';

export const PRODUCTION_ORDER_TRANSITIONS: Record<ProductionOrderStatus, Partial<Record<ProductionOrderTransition, ProductionOrderStatus>>> = {
  CREATED: {
    PLAN: 'PLANNED'
  },
  PLANNED: {
    RELEASE: 'RELEASED',
    CANCEL: 'CANCELLED'
  },
  RELEASED: {
    START: 'IN_PROGRESS',
    CANCEL: 'CANCELLED'
  },
  IN_PROGRESS: {
    COMPLETE: 'COMPLETED',
    HOLD: 'ON_HOLD'
  },
  ON_HOLD: {
    RESUME: 'IN_PROGRESS',
    CANCEL: 'CANCELLED'
  },
  COMPLETED: {
    CLOSE: 'CLOSED'
  },
  CLOSED: {},
  CANCELLED: {}
};

/** Check if transition is valid */
export function isValidProductionOrderTransition(
  currentStatus: ProductionOrderStatus,
  transition: ProductionOrderTransition
): boolean {
  const validTransitions = PRODUCTION_ORDER_TRANSITIONS[currentStatus];
  return transition in validTransitions;
}

/** Get next status for a transition */
export function getNextProductionOrderStatus(
  currentStatus: ProductionOrderStatus,
  transition: ProductionOrderTransition
): ProductionOrderStatus | null {
  const validTransitions = PRODUCTION_ORDER_TRANSITIONS[currentStatus];
  return validTransitions[transition] || null;
}

// ============================================================================
// Operation Status State Machine
// ============================================================================

/**
 * Operation Status State Machine
 */
export type OperationStatus =
  | 'PENDING'
  | 'SETUP'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED';

export type OperationTransition =
  | 'START_SETUP'
  | 'START_PRODUCTION'
  | 'COMPLETE'
  | 'SKIP';

export const OPERATION_TRANSITIONS: Record<OperationStatus, Partial<Record<OperationTransition, OperationStatus>>> = {
  PENDING: {
    START_SETUP: 'SETUP',
    SKIP: 'SKIPPED'
  },
  SETUP: {
    START_PRODUCTION: 'IN_PROGRESS'
  },
  IN_PROGRESS: {
    COMPLETE: 'COMPLETED'
  },
  COMPLETED: {},
  SKIPPED: {}
};

// ============================================================================
// Domain Models
// ============================================================================

/** Production order model */
export interface ProductionOrder {
  readonly productionOrderId: ProductionOrderId;
  readonly companyCode: CompanyCode;
  readonly materialId: MaterialId;
  readonly plannedQuantity: number;
  readonly completedQuantity: number;
  readonly scrapQuantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly status: ProductionOrderStatus;
  readonly bomId: BOMId;
  readonly routingId: RoutingId;
  readonly plannedStartDate: DateString;
  readonly plannedEndDate: DateString;
  readonly actualStartDate: DateString | null;
  readonly actualEndDate: DateString | null;
  readonly operations: ProductionOperation[];
  readonly components: ProductionComponent[];
  readonly estimatedCost: MonetaryAmount;
  readonly actualCost: MonetaryAmount | null;
  readonly priority: ProductionPriority;
  readonly createdAt: Timestamp;
  readonly createdBy: string;
  readonly releasedAt: Timestamp | null;
  readonly completedAt: Timestamp | null;
}

/** Production operation model */
export interface ProductionOperation {
  readonly operationId: OperationId;
  readonly sequenceNumber: number;
  readonly workCenterId: WorkCenterId;
  readonly operationDescription: string;
  readonly status: OperationStatus;
  readonly plannedSetupTime: number;
  readonly plannedRunTime: number;
  readonly actualSetupTime: number | null;
  readonly actualRunTime: number | null;
  readonly plannedQuantity: number;
  readonly confirmedQuantity: number;
  readonly scrapQuantity: number;
  readonly startedAt: Timestamp | null;
  readonly completedAt: Timestamp | null;
}

/** Production component model */
export interface ProductionComponent {
  readonly componentId: Identifier;
  readonly materialId: MaterialId;
  readonly requiredQuantity: number;
  readonly issuedQuantity: number;
  readonly returnedQuantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly operationId: OperationId | null;
  readonly storageLocationId: string;
  readonly backflushIndicator: boolean;
}

/** Production priority */
export type ProductionPriority =
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'URGENT';

/** Operation confirmation */
export interface OperationConfirmation {
  readonly confirmationId: Identifier;
  readonly productionOrderId: ProductionOrderId;
  readonly operationId: OperationId;
  readonly confirmedQuantity: number;
  readonly scrapQuantity: number;
  readonly setupTime: number;
  readonly runTime: number;
  readonly workCenterId: WorkCenterId;
  readonly postingDate: DateString;
  readonly personnelNumber?: string;
  readonly confirmationType: ConfirmationType;
  readonly createdAt: Timestamp;
  readonly createdBy: string;
}

/** Confirmation type */
export type ConfirmationType =
  | 'PARTIAL'
  | 'FINAL';

// ============================================================================
// Manufacturing Events
// ============================================================================

/** Event: Production order created */
export interface ProductionOrderCreatedEvent extends CorrelatedEvent {
  readonly eventType: 'PRODUCTION_ORDER_CREATED';
  readonly productionOrderId: ProductionOrderId;
  readonly materialId: MaterialId;
  readonly plannedQuantity: number;
  readonly plannedStartDate: DateString;
  readonly plannedEndDate: DateString;
}

/** Event: Production order released */
export interface ProductionOrderReleasedEvent extends CorrelatedEvent {
  readonly eventType: 'PRODUCTION_ORDER_RELEASED';
  readonly productionOrderId: ProductionOrderId;
  readonly materialId: MaterialId;
  readonly releasedQuantity: number;
  readonly releasedAt: Timestamp;
}

/** Event: Operation confirmed */
export interface OperationConfirmedEvent extends CorrelatedEvent {
  readonly eventType: 'OPERATION_CONFIRMED';
  readonly productionOrderId: ProductionOrderId;
  readonly operationId: OperationId;
  readonly confirmedQuantity: number;
  readonly scrapQuantity: number;
  readonly confirmationType: ConfirmationType;
  readonly workCenterId: WorkCenterId;
}

/** Event: Production completed */
export interface ProductionCompletedEvent extends CorrelatedEvent {
  readonly eventType: 'PRODUCTION_COMPLETED';
  readonly productionOrderId: ProductionOrderId;
  readonly materialId: MaterialId;
  readonly completedQuantity: number;
  readonly scrapQuantity: number;
  readonly actualCost: MonetaryAmount;
  readonly completedAt: Timestamp;
}

/** All manufacturing events */
export type ManufacturingEvent =
  | ProductionOrderCreatedEvent
  | ProductionOrderReleasedEvent
  | OperationConfirmedEvent
  | ProductionCompletedEvent;

// ============================================================================
// Event Factory
// ============================================================================

export const ManufacturingEventFactory = {
  productionOrderCreated(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    productionOrderId: ProductionOrderId,
    materialId: MaterialId,
    plannedQuantity: number,
    plannedStartDate: DateString,
    plannedEndDate: DateString,
    timestamp: Timestamp,
    eventId: UUID
  ): ProductionOrderCreatedEvent {
    return {
      eventId,
      eventType: 'PRODUCTION_ORDER_CREATED',
      timestamp,
      surface: MANUFACTURING_SURFACE,
      operation: 'CreateProductionOrder',
      surfaceVersion: MANUFACTURING_SURFACE_VERSION,
      correlationId,
      causationId,
      productionOrderId,
      materialId,
      plannedQuantity,
      plannedStartDate,
      plannedEndDate
    };
  },

  productionOrderReleased(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    productionOrderId: ProductionOrderId,
    materialId: MaterialId,
    releasedQuantity: number,
    releasedAt: Timestamp,
    timestamp: Timestamp,
    eventId: UUID
  ): ProductionOrderReleasedEvent {
    return {
      eventId,
      eventType: 'PRODUCTION_ORDER_RELEASED',
      timestamp,
      surface: MANUFACTURING_SURFACE,
      operation: 'ReleaseProductionOrder',
      surfaceVersion: MANUFACTURING_SURFACE_VERSION,
      correlationId,
      causationId,
      productionOrderId,
      materialId,
      releasedQuantity,
      releasedAt
    };
  },

  operationConfirmed(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    productionOrderId: ProductionOrderId,
    operationId: OperationId,
    confirmedQuantity: number,
    scrapQuantity: number,
    confirmationType: ConfirmationType,
    workCenterId: WorkCenterId,
    timestamp: Timestamp,
    eventId: UUID
  ): OperationConfirmedEvent {
    return {
      eventId,
      eventType: 'OPERATION_CONFIRMED',
      timestamp,
      surface: MANUFACTURING_SURFACE,
      operation: 'ConfirmOperation',
      surfaceVersion: MANUFACTURING_SURFACE_VERSION,
      correlationId,
      causationId,
      productionOrderId,
      operationId,
      confirmedQuantity,
      scrapQuantity,
      confirmationType,
      workCenterId
    };
  },

  productionCompleted(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    productionOrderId: ProductionOrderId,
    materialId: MaterialId,
    completedQuantity: number,
    scrapQuantity: number,
    actualCost: MonetaryAmount,
    completedAt: Timestamp,
    timestamp: Timestamp,
    eventId: UUID
  ): ProductionCompletedEvent {
    return {
      eventId,
      eventType: 'PRODUCTION_COMPLETED',
      timestamp,
      surface: MANUFACTURING_SURFACE,
      operation: 'CompleteProduction',
      surfaceVersion: MANUFACTURING_SURFACE_VERSION,
      correlationId,
      causationId,
      productionOrderId,
      materialId,
      completedQuantity,
      scrapQuantity,
      actualCost,
      completedAt
    };
  }
};

// ============================================================================
// CreateProductionOrder Contract
// ============================================================================

/** Input for CreateProductionOrder operation */
export interface CreateProductionOrderInput {
  readonly companyCode: CompanyCode;
  readonly materialId: MaterialId;
  readonly quantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly bomId: BOMId;
  readonly routingId: RoutingId;
  readonly plannedStartDate: DateString;
  readonly plannedEndDate: DateString;
  readonly priority: ProductionPriority;
  readonly correlationId: CorrelationId;
}

/** Output for CreateProductionOrder operation */
export interface CreateProductionOrderOutput {
  readonly productionOrder: ProductionOrder;
  readonly event: ProductionOrderCreatedEvent;
}

/** CreateProductionOrder precondition predicates */
export const CreateProductionOrderPreconditions = {
  hasMaterialId(input: CreateProductionOrderInput): boolean {
    return input.materialId !== undefined && input.materialId.trim().length > 0;
  },

  hasPositiveQuantity(input: CreateProductionOrderInput): boolean {
    return input.quantity > 0;
  },

  hasBOMId(input: CreateProductionOrderInput): boolean {
    return input.bomId !== undefined && input.bomId.trim().length > 0;
  },

  hasRoutingId(input: CreateProductionOrderInput): boolean {
    return input.routingId !== undefined && input.routingId.trim().length > 0;
  },

  hasValidDates(input: CreateProductionOrderInput): boolean {
    return input.plannedStartDate <= input.plannedEndDate;
  },

  all(input: CreateProductionOrderInput): boolean {
    return (
      this.hasMaterialId(input) &&
      this.hasPositiveQuantity(input) &&
      this.hasBOMId(input) &&
      this.hasRoutingId(input) &&
      this.hasValidDates(input)
    );
  }
};

/** CreateProductionOrder postcondition predicates */
export const CreateProductionOrderPostconditions = {
  hasProductionOrder(output: CreateProductionOrderOutput): boolean {
    return output.productionOrder !== undefined;
  },

  orderIsCreated(output: CreateProductionOrderOutput): boolean {
    return output.productionOrder.status === 'CREATED';
  },

  hasEvent(output: CreateProductionOrderOutput): boolean {
    return output.event !== undefined && output.event.eventType === 'PRODUCTION_ORDER_CREATED';
  },

  all(input: CreateProductionOrderInput, output: CreateProductionOrderOutput): boolean {
    return (
      this.hasProductionOrder(output) &&
      this.orderIsCreated(output) &&
      this.hasEvent(output)
    );
  }
};

/** CreateProductionOrder contract implementation */
export class CreateProductionOrderContract {
  readonly name = 'CreateProductionOrder';
  readonly surface = MANUFACTURING_SURFACE;
  readonly version = MANUFACTURING_SURFACE_VERSION;

  constructor(
    private readonly productionOrderRepository: ProductionOrderRepository,
    private readonly bomRepository: BOMRepository,
    private readonly routingRepository: RoutingRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: CreateProductionOrderInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!CreateProductionOrderPreconditions.hasMaterialId(input)) {
      violations.push({
        field: 'materialId',
        rule: 'required',
        message: 'Material ID is required',
        severity: 'ERROR'
      });
    }

    if (!CreateProductionOrderPreconditions.hasPositiveQuantity(input)) {
      violations.push({
        field: 'quantity',
        rule: 'positive',
        message: 'Quantity must be positive',
        severity: 'ERROR'
      });
    }

    if (!CreateProductionOrderPreconditions.hasBOMId(input)) {
      violations.push({
        field: 'bomId',
        rule: 'required',
        message: 'Bill of materials ID is required',
        severity: 'ERROR'
      });
    }

    if (!CreateProductionOrderPreconditions.hasRoutingId(input)) {
      violations.push({
        field: 'routingId',
        rule: 'required',
        message: 'Routing ID is required',
        severity: 'ERROR'
      });
    }

    if (!CreateProductionOrderPreconditions.hasValidDates(input)) {
      violations.push({
        field: 'plannedDates',
        rule: 'valid_range',
        message: 'Planned end date must be on or after start date',
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

  async execute(input: CreateProductionOrderInput): Promise<Result<CreateProductionOrderOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<CreateProductionOrderOutput, SurfaceError>;
    }

    const timestamp = this.timestampProvider.now();
    const productionOrderId = IdentityOperations.generateUUID();
    const eventId = IdentityOperations.generateUUID();

    // Get BOM and Routing to build operations and components
    const bomResult = await this.bomRepository.getBOM(input.bomId);
    const routingResult = await this.routingRepository.getRouting(input.routingId);

    if (!bomResult.success) {
      return bomResult as Result<CreateProductionOrderOutput, SurfaceError>;
    }
    if (!routingResult.success) {
      return routingResult as Result<CreateProductionOrderOutput, SurfaceError>;
    }

    const bom = bomResult.data;
    const routing = routingResult.data;

    // Build operations from routing
    const operations: ProductionOperation[] = routing.operations.map((op, index) => ({
      operationId: IdentityOperations.generateUUID(),
      sequenceNumber: (index + 1) * 10,
      workCenterId: op.workCenterId,
      operationDescription: op.description,
      status: 'PENDING' as OperationStatus,
      plannedSetupTime: op.setupTime,
      plannedRunTime: op.runTime * input.quantity,
      actualSetupTime: null,
      actualRunTime: null,
      plannedQuantity: input.quantity,
      confirmedQuantity: 0,
      scrapQuantity: 0,
      startedAt: null,
      completedAt: null
    }));

    // Build components from BOM
    const components: ProductionComponent[] = bom.components.map(comp => ({
      componentId: IdentityOperations.generateUUID(),
      materialId: comp.materialId,
      requiredQuantity: comp.quantity * input.quantity,
      issuedQuantity: 0,
      returnedQuantity: 0,
      unitOfMeasure: comp.unitOfMeasure,
      operationId: comp.operationId || null,
      storageLocationId: comp.storageLocationId,
      backflushIndicator: comp.backflush
    }));

    const productionOrder: ProductionOrder = {
      productionOrderId,
      companyCode: input.companyCode,
      materialId: input.materialId,
      plannedQuantity: input.quantity,
      completedQuantity: 0,
      scrapQuantity: 0,
      unitOfMeasure: input.unitOfMeasure,
      status: 'CREATED',
      bomId: input.bomId,
      routingId: input.routingId,
      plannedStartDate: input.plannedStartDate,
      plannedEndDate: input.plannedEndDate,
      actualStartDate: null,
      actualEndDate: null,
      operations,
      components,
      estimatedCost: { value: 0, currency: 'USD', precision: 2 },
      actualCost: null,
      priority: input.priority,
      createdAt: timestamp,
      createdBy: 'SYSTEM',
      releasedAt: null,
      completedAt: null
    };

    const event = ManufacturingEventFactory.productionOrderCreated(
      input.correlationId,
      null,
      productionOrderId,
      input.materialId,
      input.quantity,
      input.plannedStartDate,
      input.plannedEndDate,
      timestamp,
      eventId
    );

    return Results.success({ productionOrder, event });
  }

  checkPostconditions(input: CreateProductionOrderInput, output: CreateProductionOrderOutput): Result<void, ValidationError> {
    if (!CreateProductionOrderPostconditions.all(input, output)) {
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
// ReleaseProductionOrder Contract
// ============================================================================

/** Input for ReleaseProductionOrder operation */
export interface ReleaseProductionOrderInput {
  readonly productionOrderId: ProductionOrderId;
  readonly correlationId: CorrelationId;
}

/** Output for ReleaseProductionOrder operation */
export interface ReleaseProductionOrderOutput {
  readonly productionOrder: ProductionOrder;
  readonly previousStatus: ProductionOrderStatus;
  readonly event: ProductionOrderReleasedEvent;
}

/** ReleaseProductionOrder precondition predicates */
export const ReleaseProductionOrderPreconditions = {
  hasProductionOrderId(input: ReleaseProductionOrderInput): boolean {
    return input.productionOrderId !== undefined && input.productionOrderId.trim().length > 0;
  },

  all(input: ReleaseProductionOrderInput): boolean {
    return this.hasProductionOrderId(input);
  }
};

/** ReleaseProductionOrder contract implementation */
export class ReleaseProductionOrderContract {
  readonly name = 'ReleaseProductionOrder';
  readonly surface = MANUFACTURING_SURFACE;
  readonly version = MANUFACTURING_SURFACE_VERSION;

  constructor(
    private readonly productionOrderRepository: ProductionOrderRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: ReleaseProductionOrderInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!ReleaseProductionOrderPreconditions.hasProductionOrderId(input)) {
      violations.push({
        field: 'productionOrderId',
        rule: 'required',
        message: 'Production order ID is required',
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

  async execute(input: ReleaseProductionOrderInput): Promise<Result<ReleaseProductionOrderOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<ReleaseProductionOrderOutput, SurfaceError>;
    }

    const orderResult = await this.productionOrderRepository.getProductionOrder(input.productionOrderId);
    if (!orderResult.success) {
      return orderResult as Result<ReleaseProductionOrderOutput, SurfaceError>;
    }

    const existingOrder = orderResult.data;
    const previousStatus = existingOrder.status;

    // Check if transition is valid
    if (!isValidProductionOrderTransition(previousStatus, 'RELEASE')) {
      return Results.failure(
        ErrorFactory.invalidTransition(
          this.surface,
          this.name,
          previousStatus,
          'RELEASE'
        )
      );
    }

    const timestamp = this.timestampProvider.now();
    const eventId = IdentityOperations.generateUUID();

    const updatedOrder: ProductionOrder = {
      ...existingOrder,
      status: 'RELEASED',
      releasedAt: timestamp
    };

    const event = ManufacturingEventFactory.productionOrderReleased(
      input.correlationId,
      null,
      input.productionOrderId,
      existingOrder.materialId,
      existingOrder.plannedQuantity,
      timestamp,
      timestamp,
      eventId
    );

    return Results.success({
      productionOrder: updatedOrder,
      previousStatus,
      event
    });
  }
}

// ============================================================================
// ConfirmOperation Contract
// ============================================================================

/** Input for ConfirmOperation operation */
export interface ConfirmOperationInput {
  readonly productionOrderId: ProductionOrderId;
  readonly operationId: OperationId;
  readonly confirmedQuantity: number;
  readonly scrapQuantity: number;
  readonly setupTime: number;
  readonly runTime: number;
  readonly workCenterId: WorkCenterId;
  readonly postingDate: DateString;
  readonly confirmationType: ConfirmationType;
  readonly personnelNumber?: string;
  readonly correlationId: CorrelationId;
}

/** Output for ConfirmOperation operation */
export interface ConfirmOperationOutput {
  readonly confirmation: OperationConfirmation;
  readonly updatedOperation: ProductionOperation;
  readonly event: OperationConfirmedEvent;
}

/** ConfirmOperation precondition predicates */
export const ConfirmOperationPreconditions = {
  hasProductionOrderId(input: ConfirmOperationInput): boolean {
    return input.productionOrderId !== undefined && input.productionOrderId.trim().length > 0;
  },

  hasOperationId(input: ConfirmOperationInput): boolean {
    return input.operationId !== undefined && input.operationId.trim().length > 0;
  },

  hasNonNegativeQuantities(input: ConfirmOperationInput): boolean {
    return input.confirmedQuantity >= 0 && input.scrapQuantity >= 0;
  },

  hasNonNegativeTimes(input: ConfirmOperationInput): boolean {
    return input.setupTime >= 0 && input.runTime >= 0;
  },

  all(input: ConfirmOperationInput): boolean {
    return (
      this.hasProductionOrderId(input) &&
      this.hasOperationId(input) &&
      this.hasNonNegativeQuantities(input) &&
      this.hasNonNegativeTimes(input)
    );
  }
};

/** ConfirmOperation contract implementation */
export class ConfirmOperationContract {
  readonly name = 'ConfirmOperation';
  readonly surface = MANUFACTURING_SURFACE;
  readonly version = MANUFACTURING_SURFACE_VERSION;

  constructor(
    private readonly productionOrderRepository: ProductionOrderRepository,
    private readonly confirmationRepository: ConfirmationRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: ConfirmOperationInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!ConfirmOperationPreconditions.hasProductionOrderId(input)) {
      violations.push({
        field: 'productionOrderId',
        rule: 'required',
        message: 'Production order ID is required',
        severity: 'ERROR'
      });
    }

    if (!ConfirmOperationPreconditions.hasOperationId(input)) {
      violations.push({
        field: 'operationId',
        rule: 'required',
        message: 'Operation ID is required',
        severity: 'ERROR'
      });
    }

    if (!ConfirmOperationPreconditions.hasNonNegativeQuantities(input)) {
      violations.push({
        field: 'quantities',
        rule: 'non_negative',
        message: 'Confirmed and scrap quantities must be non-negative',
        severity: 'ERROR'
      });
    }

    if (!ConfirmOperationPreconditions.hasNonNegativeTimes(input)) {
      violations.push({
        field: 'times',
        rule: 'non_negative',
        message: 'Setup and run times must be non-negative',
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

  async execute(input: ConfirmOperationInput): Promise<Result<ConfirmOperationOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<ConfirmOperationOutput, SurfaceError>;
    }

    const timestamp = this.timestampProvider.now();
    const confirmationId = IdentityOperations.generateUUID();
    const eventId = IdentityOperations.generateUUID();

    const confirmation: OperationConfirmation = {
      confirmationId,
      productionOrderId: input.productionOrderId,
      operationId: input.operationId,
      confirmedQuantity: input.confirmedQuantity,
      scrapQuantity: input.scrapQuantity,
      setupTime: input.setupTime,
      runTime: input.runTime,
      workCenterId: input.workCenterId,
      postingDate: input.postingDate,
      personnelNumber: input.personnelNumber,
      confirmationType: input.confirmationType,
      createdAt: timestamp,
      createdBy: 'SYSTEM'
    };

    const updatedOperation: ProductionOperation = {
      operationId: input.operationId,
      sequenceNumber: 0,
      workCenterId: input.workCenterId,
      operationDescription: '',
      status: input.confirmationType === 'FINAL' ? 'COMPLETED' : 'IN_PROGRESS',
      plannedSetupTime: 0,
      plannedRunTime: 0,
      actualSetupTime: input.setupTime,
      actualRunTime: input.runTime,
      plannedQuantity: 0,
      confirmedQuantity: input.confirmedQuantity,
      scrapQuantity: input.scrapQuantity,
      startedAt: timestamp,
      completedAt: input.confirmationType === 'FINAL' ? timestamp : null
    };

    const event = ManufacturingEventFactory.operationConfirmed(
      input.correlationId,
      null,
      input.productionOrderId,
      input.operationId,
      input.confirmedQuantity,
      input.scrapQuantity,
      input.confirmationType,
      input.workCenterId,
      timestamp,
      eventId
    );

    return Results.success({
      confirmation,
      updatedOperation,
      event
    });
  }
}

// ============================================================================
// CompleteProduction Contract
// ============================================================================

/** Input for CompleteProduction operation */
export interface CompleteProductionInput {
  readonly productionOrderId: ProductionOrderId;
  readonly completedQuantity: number;
  readonly scrapQuantity: number;
  readonly actualCost: MonetaryAmount;
  readonly postingDate: DateString;
  readonly correlationId: CorrelationId;
}

/** Output for CompleteProduction operation */
export interface CompleteProductionOutput {
  readonly productionOrder: ProductionOrder;
  readonly previousStatus: ProductionOrderStatus;
  readonly event: ProductionCompletedEvent;
}

/** CompleteProduction precondition predicates */
export const CompleteProductionPreconditions = {
  hasProductionOrderId(input: CompleteProductionInput): boolean {
    return input.productionOrderId !== undefined && input.productionOrderId.trim().length > 0;
  },

  hasPositiveCompletedQuantity(input: CompleteProductionInput): boolean {
    return input.completedQuantity > 0;
  },

  hasNonNegativeScrapQuantity(input: CompleteProductionInput): boolean {
    return input.scrapQuantity >= 0;
  },

  all(input: CompleteProductionInput): boolean {
    return (
      this.hasProductionOrderId(input) &&
      this.hasPositiveCompletedQuantity(input) &&
      this.hasNonNegativeScrapQuantity(input)
    );
  }
};

/** CompleteProduction contract implementation */
export class CompleteProductionContract {
  readonly name = 'CompleteProduction';
  readonly surface = MANUFACTURING_SURFACE;
  readonly version = MANUFACTURING_SURFACE_VERSION;

  constructor(
    private readonly productionOrderRepository: ProductionOrderRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: CompleteProductionInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!CompleteProductionPreconditions.hasProductionOrderId(input)) {
      violations.push({
        field: 'productionOrderId',
        rule: 'required',
        message: 'Production order ID is required',
        severity: 'ERROR'
      });
    }

    if (!CompleteProductionPreconditions.hasPositiveCompletedQuantity(input)) {
      violations.push({
        field: 'completedQuantity',
        rule: 'positive',
        message: 'Completed quantity must be positive',
        severity: 'ERROR'
      });
    }

    if (!CompleteProductionPreconditions.hasNonNegativeScrapQuantity(input)) {
      violations.push({
        field: 'scrapQuantity',
        rule: 'non_negative',
        message: 'Scrap quantity must be non-negative',
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

  async execute(input: CompleteProductionInput): Promise<Result<CompleteProductionOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<CompleteProductionOutput, SurfaceError>;
    }

    const orderResult = await this.productionOrderRepository.getProductionOrder(input.productionOrderId);
    if (!orderResult.success) {
      return orderResult as Result<CompleteProductionOutput, SurfaceError>;
    }

    const existingOrder = orderResult.data;
    const previousStatus = existingOrder.status;

    // Check if transition is valid
    if (!isValidProductionOrderTransition(previousStatus, 'COMPLETE')) {
      return Results.failure(
        ErrorFactory.invalidTransition(
          this.surface,
          this.name,
          previousStatus,
          'COMPLETE'
        )
      );
    }

    const timestamp = this.timestampProvider.now();
    const eventId = IdentityOperations.generateUUID();

    const updatedOrder: ProductionOrder = {
      ...existingOrder,
      status: 'COMPLETED',
      completedQuantity: input.completedQuantity,
      scrapQuantity: input.scrapQuantity,
      actualCost: input.actualCost,
      actualEndDate: input.postingDate,
      completedAt: timestamp
    };

    const event = ManufacturingEventFactory.productionCompleted(
      input.correlationId,
      null,
      input.productionOrderId,
      existingOrder.materialId,
      input.completedQuantity,
      input.scrapQuantity,
      input.actualCost,
      timestamp,
      timestamp,
      eventId
    );

    return Results.success({
      productionOrder: updatedOrder,
      previousStatus,
      event
    });
  }
}

// ============================================================================
// Repository Interfaces
// ============================================================================

/** Production order repository interface */
export interface ProductionOrderRepository {
  createProductionOrder(order: ProductionOrder): Promise<Result<ProductionOrder, SurfaceError>>;
  getProductionOrder(orderId: ProductionOrderId): Promise<Result<ProductionOrder, SurfaceError>>;
  updateProductionOrder(order: ProductionOrder): Promise<Result<ProductionOrder, SurfaceError>>;
}

/** BOM repository interface */
export interface BOMRepository {
  getBOM(bomId: BOMId): Promise<Result<BOMDefinition, SurfaceError>>;
}

/** Routing repository interface */
export interface RoutingRepository {
  getRouting(routingId: RoutingId): Promise<Result<RoutingDefinition, SurfaceError>>;
}

/** Confirmation repository interface */
export interface ConfirmationRepository {
  createConfirmation(confirmation: OperationConfirmation): Promise<Result<OperationConfirmation, SurfaceError>>;
  getConfirmations(productionOrderId: ProductionOrderId): Promise<Result<OperationConfirmation[], SurfaceError>>;
}

/** BOM definition */
export interface BOMDefinition {
  readonly bomId: BOMId;
  readonly materialId: MaterialId;
  readonly components: BOMComponent[];
}

/** BOM component */
export interface BOMComponent {
  readonly materialId: MaterialId;
  readonly quantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly operationId?: OperationId;
  readonly storageLocationId: string;
  readonly backflush: boolean;
}

/** Routing definition */
export interface RoutingDefinition {
  readonly routingId: RoutingId;
  readonly materialId: MaterialId;
  readonly operations: RoutingOperation[];
}

/** Routing operation */
export interface RoutingOperation {
  readonly workCenterId: WorkCenterId;
  readonly description: string;
  readonly setupTime: number;
  readonly runTime: number;
}

// ============================================================================
// Manufacturing Surface
// ============================================================================

/** Manufacturing surface facade */
export interface ManufacturingSurface {
  createProductionOrder(input: CreateProductionOrderInput): Promise<Result<CreateProductionOrderOutput, SurfaceError>>;
  releaseProductionOrder(input: ReleaseProductionOrderInput): Promise<Result<ReleaseProductionOrderOutput, SurfaceError>>;
  confirmOperation(input: ConfirmOperationInput): Promise<Result<ConfirmOperationOutput, SurfaceError>>;
  completeProduction(input: CompleteProductionInput): Promise<Result<CompleteProductionOutput, SurfaceError>>;
}

/** Default manufacturing surface implementation */
export class DefaultManufacturingSurface implements ManufacturingSurface {
  private readonly createProductionOrderContract: CreateProductionOrderContract;
  private readonly releaseProductionOrderContract: ReleaseProductionOrderContract;
  private readonly confirmOperationContract: ConfirmOperationContract;
  private readonly completeProductionContract: CompleteProductionContract;

  constructor(
    productionOrderRepository: ProductionOrderRepository,
    bomRepository: BOMRepository,
    routingRepository: RoutingRepository,
    confirmationRepository: ConfirmationRepository,
    timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {
    this.createProductionOrderContract = new CreateProductionOrderContract(
      productionOrderRepository,
      bomRepository,
      routingRepository,
      timestampProvider
    );
    this.releaseProductionOrderContract = new ReleaseProductionOrderContract(
      productionOrderRepository,
      timestampProvider
    );
    this.confirmOperationContract = new ConfirmOperationContract(
      productionOrderRepository,
      confirmationRepository,
      timestampProvider
    );
    this.completeProductionContract = new CompleteProductionContract(
      productionOrderRepository,
      timestampProvider
    );
  }

  async createProductionOrder(input: CreateProductionOrderInput): Promise<Result<CreateProductionOrderOutput, SurfaceError>> {
    return this.createProductionOrderContract.execute(input);
  }

  async releaseProductionOrder(input: ReleaseProductionOrderInput): Promise<Result<ReleaseProductionOrderOutput, SurfaceError>> {
    return this.releaseProductionOrderContract.execute(input);
  }

  async confirmOperation(input: ConfirmOperationInput): Promise<Result<ConfirmOperationOutput, SurfaceError>> {
    return this.confirmOperationContract.execute(input);
  }

  async completeProduction(input: CompleteProductionInput): Promise<Result<CompleteProductionOutput, SurfaceError>> {
    return this.completeProductionContract.execute(input);
  }
}
