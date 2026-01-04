/**
 * Inventory Surface Contracts
 *
 * Defines typed contracts for inventory management operations.
 * All contracts include preconditions, postconditions, state transitions, and observable events.
 */

import {
  Result,
  Results,
  Failure,
  SurfaceError,
  ErrorFactory,
  ValidationError,
  StateError,
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
  IdentityOperations
} from '../../../common';

import {
  InventoryMovementType,
  StockStatus,
  StockLevel,
  StockKeepingUnit,
  InventoryMovement,
  InventoryCount,
  InventoryValuation,
  CountType,
  ValuationMethod,
  WarehouseId,
  StorageLocationId,
  UnitOfMeasure,
  isValidMovementType,
  isValidStockStatus,
  isValidCountType,
  isValidValuationMethod,
  MOVEMENT_TYPE_METADATA
} from './models';

import {
  INVENTORY_SURFACE,
  INVENTORY_SURFACE_VERSION,
  StockLevelQueriedEvent,
  MovementRecordedEvent,
  InventoryRevaluedEvent,
  CountCompletedEvent,
  InventoryEventFactory
} from './events';

// ============================================================================
// Contract Interfaces
// ============================================================================

/**
 * Surface Contract Base Interface
 *
 * All surface contracts implement this interface.
 */
export interface SurfaceContract<TInput, TOutput, TError extends SurfaceError = SurfaceError> {
  /** Contract name */
  readonly name: string;
  /** Surface name */
  readonly surface: string;
  /** Surface version */
  readonly version: string;
  /** Check preconditions */
  checkPreconditions(input: TInput): Result<void, ValidationError>;
  /** Execute the contract */
  execute(input: TInput): Promise<Result<TOutput, TError>>;
  /** Check postconditions */
  checkPostconditions(input: TInput, output: TOutput): Result<void, ValidationError>;
}

// ============================================================================
// GetStockLevel Contract
// ============================================================================

/** Input for GetStockLevel operation */
export interface GetStockLevelInput {
  readonly materialId: MaterialId;
  readonly companyCode: CompanyCode;
  readonly warehouseId: WarehouseId;
  readonly storageLocationId?: StorageLocationId;
  readonly lotNumber?: string;
  readonly serialNumber?: string;
  readonly correlationId: CorrelationId;
}

/** Output for GetStockLevel operation */
export interface GetStockLevelOutput {
  readonly stockLevel: StockLevel;
  readonly queryTimestamp: Timestamp;
  readonly event: StockLevelQueriedEvent;
}

/** GetStockLevel precondition predicates */
export const GetStockLevelPreconditions = {
  /** Material ID must be provided */
  hasMaterialId(input: GetStockLevelInput): boolean {
    return input.materialId !== undefined && input.materialId.trim().length > 0;
  },

  /** Company code must be provided */
  hasCompanyCode(input: GetStockLevelInput): boolean {
    return input.companyCode !== undefined && input.companyCode.trim().length > 0;
  },

  /** Warehouse ID must be provided */
  hasWarehouseId(input: GetStockLevelInput): boolean {
    return input.warehouseId !== undefined && input.warehouseId.trim().length > 0;
  },

  /** All preconditions combined */
  all(input: GetStockLevelInput): boolean {
    return (
      this.hasMaterialId(input) &&
      this.hasCompanyCode(input) &&
      this.hasWarehouseId(input)
    );
  }
};

/** GetStockLevel postcondition predicates */
export const GetStockLevelPostconditions = {
  /** Stock level must be returned */
  hasStockLevel(output: GetStockLevelOutput): boolean {
    return output.stockLevel !== undefined;
  },

  /** Available quantity must not exceed on-hand */
  availableNotExceedingOnHand(output: GetStockLevelOutput): boolean {
    return output.stockLevel.availableQuantity <= output.stockLevel.onHandQuantity;
  },

  /** Event must be emitted */
  hasEvent(output: GetStockLevelOutput): boolean {
    return output.event !== undefined && output.event.eventType === 'STOCK_LEVEL_QUERIED';
  },

  /** All postconditions combined */
  all(input: GetStockLevelInput, output: GetStockLevelOutput): boolean {
    return (
      this.hasStockLevel(output) &&
      this.availableNotExceedingOnHand(output) &&
      this.hasEvent(output)
    );
  }
};

/** GetStockLevel contract implementation */
export class GetStockLevelContract implements SurfaceContract<GetStockLevelInput, GetStockLevelOutput> {
  readonly name = 'GetStockLevel';
  readonly surface = INVENTORY_SURFACE;
  readonly version = INVENTORY_SURFACE_VERSION;

  constructor(
    private readonly stockLevelRepository: StockLevelRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: GetStockLevelInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!GetStockLevelPreconditions.hasMaterialId(input)) {
      violations.push({
        field: 'materialId',
        rule: 'required',
        message: 'Material ID is required',
        severity: 'ERROR'
      });
    }

    if (!GetStockLevelPreconditions.hasCompanyCode(input)) {
      violations.push({
        field: 'companyCode',
        rule: 'required',
        message: 'Company code is required',
        severity: 'ERROR'
      });
    }

    if (!GetStockLevelPreconditions.hasWarehouseId(input)) {
      violations.push({
        field: 'warehouseId',
        rule: 'required',
        message: 'Warehouse ID is required',
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

  async execute(input: GetStockLevelInput): Promise<Result<GetStockLevelOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<GetStockLevelOutput, SurfaceError>;
    }

    const stockLevelResult = await this.stockLevelRepository.getStockLevel(
      input.materialId,
      input.companyCode,
      input.warehouseId,
      input.storageLocationId
    );

    if (!stockLevelResult.success) {
      return stockLevelResult as Failure<SurfaceError>;
    }

    const stockLevel = stockLevelResult.data;
    const timestamp = this.timestampProvider.now();
    const eventId = IdentityOperations.generateUUID();

    const event = InventoryEventFactory.stockLevelQueried(
      input.correlationId,
      null,
      input.materialId,
      input.warehouseId,
      input.storageLocationId || '',
      stockLevel.onHandQuantity,
      stockLevel.availableQuantity,
      stockLevel.reservedQuantity,
      stockLevel.unitOfMeasure,
      stockLevel.status,
      timestamp,
      eventId
    );

    const output: GetStockLevelOutput = {
      stockLevel,
      queryTimestamp: timestamp,
      event
    };

    const postconditionResult = this.checkPostconditions(input, output);
    if (!postconditionResult.success) {
      return postconditionResult as Result<GetStockLevelOutput, SurfaceError>;
    }

    return Results.success(output);
  }

  checkPostconditions(input: GetStockLevelInput, output: GetStockLevelOutput): Result<void, ValidationError> {
    if (!GetStockLevelPostconditions.all(input, output)) {
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
// RecordMovement Contract
// ============================================================================

/** Input for RecordMovement operation */
export interface RecordMovementInput {
  readonly movementType: InventoryMovementType;
  readonly materialId: MaterialId;
  readonly companyCode: CompanyCode;
  readonly fromWarehouseId?: WarehouseId;
  readonly fromStorageLocationId?: StorageLocationId;
  readonly toWarehouseId?: WarehouseId;
  readonly toStorageLocationId?: StorageLocationId;
  readonly quantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly movementDate: DateString;
  readonly postingDate: DateString;
  readonly referenceDocument?: string;
  readonly referenceDocumentItem?: string;
  readonly reason: string;
  readonly lotNumber?: string;
  readonly serialNumber?: string;
  readonly correlationId: CorrelationId;
}

/** Output for RecordMovement operation */
export interface RecordMovementOutput {
  readonly movement: InventoryMovement;
  readonly previousStockLevel: StockLevel | null;
  readonly newStockLevel: StockLevel;
  readonly event: MovementRecordedEvent;
}

/** RecordMovement precondition predicates */
export const RecordMovementPreconditions = {
  /** Movement type must be valid */
  hasValidMovementType(input: RecordMovementInput): boolean {
    return isValidMovementType(input.movementType);
  },

  /** Quantity must be positive */
  hasPositiveQuantity(input: RecordMovementInput): boolean {
    return input.quantity > 0;
  },

  /** Receipt must have destination */
  receiptHasDestination(input: RecordMovementInput): boolean {
    if (input.movementType === 'RECEIPT') {
      return input.toWarehouseId !== undefined && input.toStorageLocationId !== undefined;
    }
    return true;
  },

  /** Issue must have source */
  issueHasSource(input: RecordMovementInput): boolean {
    if (input.movementType === 'ISSUE') {
      return input.fromWarehouseId !== undefined && input.fromStorageLocationId !== undefined;
    }
    return true;
  },

  /** Transfer must have both source and destination */
  transferHasBothLocations(input: RecordMovementInput): boolean {
    if (input.movementType === 'TRANSFER') {
      return (
        input.fromWarehouseId !== undefined &&
        input.fromStorageLocationId !== undefined &&
        input.toWarehouseId !== undefined &&
        input.toStorageLocationId !== undefined
      );
    }
    return true;
  },

  /** Reason must be provided */
  hasReason(input: RecordMovementInput): boolean {
    return input.reason !== undefined && input.reason.trim().length > 0;
  },

  /** All preconditions combined */
  all(input: RecordMovementInput): boolean {
    return (
      this.hasValidMovementType(input) &&
      this.hasPositiveQuantity(input) &&
      this.receiptHasDestination(input) &&
      this.issueHasSource(input) &&
      this.transferHasBothLocations(input) &&
      this.hasReason(input)
    );
  }
};

/** RecordMovement postcondition predicates */
export const RecordMovementPostconditions = {
  /** Movement must be created */
  hasMovement(output: RecordMovementOutput): boolean {
    return output.movement !== undefined;
  },

  /** Stock level must be updated */
  hasNewStockLevel(output: RecordMovementOutput): boolean {
    return output.newStockLevel !== undefined;
  },

  /** Event must be emitted */
  hasEvent(output: RecordMovementOutput): boolean {
    return output.event !== undefined && output.event.eventType === 'MOVEMENT_RECORDED';
  },

  /** All postconditions combined */
  all(input: RecordMovementInput, output: RecordMovementOutput): boolean {
    return (
      this.hasMovement(output) &&
      this.hasNewStockLevel(output) &&
      this.hasEvent(output)
    );
  }
};

/** RecordMovement contract implementation */
export class RecordMovementContract implements SurfaceContract<RecordMovementInput, RecordMovementOutput> {
  readonly name = 'RecordMovement';
  readonly surface = INVENTORY_SURFACE;
  readonly version = INVENTORY_SURFACE_VERSION;

  constructor(
    private readonly stockLevelRepository: StockLevelRepository,
    private readonly movementRepository: MovementRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: RecordMovementInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!RecordMovementPreconditions.hasValidMovementType(input)) {
      violations.push({
        field: 'movementType',
        rule: 'valid_type',
        message: 'Invalid movement type',
        severity: 'ERROR'
      });
    }

    if (!RecordMovementPreconditions.hasPositiveQuantity(input)) {
      violations.push({
        field: 'quantity',
        rule: 'positive',
        message: 'Quantity must be positive',
        severity: 'ERROR'
      });
    }

    if (!RecordMovementPreconditions.receiptHasDestination(input)) {
      violations.push({
        field: 'toWarehouseId',
        rule: 'required_for_receipt',
        message: 'Receipt movements require destination location',
        severity: 'ERROR'
      });
    }

    if (!RecordMovementPreconditions.issueHasSource(input)) {
      violations.push({
        field: 'fromWarehouseId',
        rule: 'required_for_issue',
        message: 'Issue movements require source location',
        severity: 'ERROR'
      });
    }

    if (!RecordMovementPreconditions.transferHasBothLocations(input)) {
      violations.push({
        field: 'locations',
        rule: 'required_for_transfer',
        message: 'Transfer movements require both source and destination',
        severity: 'ERROR'
      });
    }

    if (!RecordMovementPreconditions.hasReason(input)) {
      violations.push({
        field: 'reason',
        rule: 'required',
        message: 'Movement reason is required',
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

  async execute(input: RecordMovementInput): Promise<Result<RecordMovementOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<RecordMovementOutput, SurfaceError>;
    }

    const timestamp = this.timestampProvider.now();
    const movementId = IdentityOperations.generateUUID();
    const eventId = IdentityOperations.generateUUID();

    // Build SKU structures
    const fromLocation: StockKeepingUnit | null = input.fromWarehouseId ? {
      materialId: input.materialId,
      companyCode: input.companyCode,
      warehouseId: input.fromWarehouseId,
      storageLocationId: input.fromStorageLocationId!,
      lotNumber: input.lotNumber,
      serialNumber: input.serialNumber
    } : null;

    const toLocation: StockKeepingUnit | null = input.toWarehouseId ? {
      materialId: input.materialId,
      companyCode: input.companyCode,
      warehouseId: input.toWarehouseId,
      storageLocationId: input.toStorageLocationId!,
      lotNumber: input.lotNumber,
      serialNumber: input.serialNumber
    } : null;

    // Create movement record
    const movement: InventoryMovement = {
      movementId,
      movementType: input.movementType,
      materialId: input.materialId,
      fromLocation,
      toLocation,
      quantity: input.quantity,
      unitOfMeasure: input.unitOfMeasure,
      movementDate: input.movementDate,
      postingDate: input.postingDate,
      referenceDocument: input.referenceDocument || null,
      referenceDocumentItem: input.referenceDocumentItem || null,
      reason: input.reason,
      reversalIndicator: false,
      reversalMovementId: null,
      createdAt: timestamp,
      createdBy: 'SYSTEM'
    };

    // Record movement and get updated stock level
    const recordResult = await this.movementRepository.recordMovement(movement);
    if (!recordResult.success) {
      return recordResult as Failure<SurfaceError>;
    }

    // Get stock levels
    const targetLocation = toLocation || fromLocation!;
    const stockLevelResult = await this.stockLevelRepository.getStockLevel(
      input.materialId,
      input.companyCode,
      targetLocation.warehouseId,
      targetLocation.storageLocationId
    );

    if (!stockLevelResult.success) {
      return stockLevelResult as Failure<SurfaceError>;
    }

    const event = InventoryEventFactory.movementRecorded(
      input.correlationId,
      null,
      movementId,
      input.movementType,
      input.materialId,
      fromLocation,
      toLocation,
      input.quantity,
      input.unitOfMeasure,
      input.movementDate,
      input.referenceDocument || null,
      timestamp,
      eventId
    );

    const output: RecordMovementOutput = {
      movement,
      previousStockLevel: null,
      newStockLevel: stockLevelResult.data,
      event
    };

    const postconditionResult = this.checkPostconditions(input, output);
    if (!postconditionResult.success) {
      return postconditionResult as Result<RecordMovementOutput, SurfaceError>;
    }

    return Results.success(output);
  }

  checkPostconditions(input: RecordMovementInput, output: RecordMovementOutput): Result<void, ValidationError> {
    if (!RecordMovementPostconditions.all(input, output)) {
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
// RevalueInventory Contract
// ============================================================================

/** Input for RevalueInventory operation */
export interface RevalueInventoryInput {
  readonly materialId: MaterialId;
  readonly companyCode: CompanyCode;
  readonly warehouseId: WarehouseId;
  readonly valuationDate: DateString;
  readonly newValue: MonetaryAmount;
  readonly valuationMethod: ValuationMethod;
  readonly reason: string;
  readonly correlationId: CorrelationId;
}

/** Output for RevalueInventory operation */
export interface RevalueInventoryOutput {
  readonly valuation: InventoryValuation;
  readonly previousValue: MonetaryAmount;
  readonly valueDifference: MonetaryAmount;
  readonly event: InventoryRevaluedEvent;
}

/** RevalueInventory precondition predicates */
export const RevalueInventoryPreconditions = {
  /** Material ID must be provided */
  hasMaterialId(input: RevalueInventoryInput): boolean {
    return input.materialId !== undefined && input.materialId.trim().length > 0;
  },

  /** Valuation method must be valid */
  hasValidValuationMethod(input: RevalueInventoryInput): boolean {
    return isValidValuationMethod(input.valuationMethod);
  },

  /** New value must be non-negative */
  hasNonNegativeValue(input: RevalueInventoryInput): boolean {
    return input.newValue.value >= 0;
  },

  /** Reason must be provided */
  hasReason(input: RevalueInventoryInput): boolean {
    return input.reason !== undefined && input.reason.trim().length > 0;
  },

  /** All preconditions combined */
  all(input: RevalueInventoryInput): boolean {
    return (
      this.hasMaterialId(input) &&
      this.hasValidValuationMethod(input) &&
      this.hasNonNegativeValue(input) &&
      this.hasReason(input)
    );
  }
};

/** RevalueInventory postcondition predicates */
export const RevalueInventoryPostconditions = {
  /** Valuation must be created */
  hasValuation(output: RevalueInventoryOutput): boolean {
    return output.valuation !== undefined;
  },

  /** Event must be emitted */
  hasEvent(output: RevalueInventoryOutput): boolean {
    return output.event !== undefined && output.event.eventType === 'INVENTORY_REVALUED';
  },

  /** All postconditions combined */
  all(input: RevalueInventoryInput, output: RevalueInventoryOutput): boolean {
    return this.hasValuation(output) && this.hasEvent(output);
  }
};

/** RevalueInventory contract implementation */
export class RevalueInventoryContract implements SurfaceContract<RevalueInventoryInput, RevalueInventoryOutput> {
  readonly name = 'RevalueInventory';
  readonly surface = INVENTORY_SURFACE;
  readonly version = INVENTORY_SURFACE_VERSION;

  constructor(
    private readonly valuationRepository: ValuationRepository,
    private readonly stockLevelRepository: StockLevelRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: RevalueInventoryInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!RevalueInventoryPreconditions.hasMaterialId(input)) {
      violations.push({
        field: 'materialId',
        rule: 'required',
        message: 'Material ID is required',
        severity: 'ERROR'
      });
    }

    if (!RevalueInventoryPreconditions.hasValidValuationMethod(input)) {
      violations.push({
        field: 'valuationMethod',
        rule: 'valid_method',
        message: 'Invalid valuation method',
        severity: 'ERROR'
      });
    }

    if (!RevalueInventoryPreconditions.hasNonNegativeValue(input)) {
      violations.push({
        field: 'newValue',
        rule: 'non_negative',
        message: 'Value must be non-negative',
        severity: 'ERROR'
      });
    }

    if (!RevalueInventoryPreconditions.hasReason(input)) {
      violations.push({
        field: 'reason',
        rule: 'required',
        message: 'Reason is required',
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

  async execute(input: RevalueInventoryInput): Promise<Result<RevalueInventoryOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<RevalueInventoryOutput, SurfaceError>;
    }

    const timestamp = this.timestampProvider.now();
    const valuationId = IdentityOperations.generateUUID();
    const eventId = IdentityOperations.generateUUID();

    // Get current stock level for previous value
    const stockLevelResult = await this.stockLevelRepository.getStockLevel(
      input.materialId,
      input.companyCode,
      input.warehouseId
    );

    if (!stockLevelResult.success) {
      return stockLevelResult as Failure<SurfaceError>;
    }

    const previousValue = stockLevelResult.data.valuationAmount;

    const valuation: InventoryValuation = {
      valuationId,
      materialId: input.materialId,
      warehouseId: input.warehouseId,
      valuationDate: input.valuationDate,
      previousValue,
      newValue: input.newValue,
      valuationMethod: input.valuationMethod,
      reason: input.reason,
      createdAt: timestamp,
      createdBy: 'SYSTEM'
    };

    const recordResult = await this.valuationRepository.recordValuation(valuation);
    if (!recordResult.success) {
      return recordResult as Failure<SurfaceError>;
    }

    const valueDifference: MonetaryAmount = {
      value: input.newValue.value - previousValue.value,
      currency: input.newValue.currency,
      precision: input.newValue.precision
    };

    const event = InventoryEventFactory.inventoryRevalued(
      input.correlationId,
      null,
      valuationId,
      input.materialId,
      input.warehouseId,
      input.valuationDate,
      previousValue,
      input.newValue,
      input.valuationMethod,
      input.reason,
      timestamp,
      eventId
    );

    const output: RevalueInventoryOutput = {
      valuation,
      previousValue,
      valueDifference,
      event
    };

    const postconditionResult = this.checkPostconditions(input, output);
    if (!postconditionResult.success) {
      return postconditionResult as Result<RevalueInventoryOutput, SurfaceError>;
    }

    return Results.success(output);
  }

  checkPostconditions(input: RevalueInventoryInput, output: RevalueInventoryOutput): Result<void, ValidationError> {
    if (!RevalueInventoryPostconditions.all(input, output)) {
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
// PerformCount Contract
// ============================================================================

/** Input for PerformCount operation */
export interface PerformCountInput {
  readonly countType: CountType;
  readonly warehouseId: WarehouseId;
  readonly storageLocationId: StorageLocationId;
  readonly countDate: DateString;
  readonly items: PerformCountItemInput[];
  readonly correlationId: CorrelationId;
}

/** Count item input */
export interface PerformCountItemInput {
  readonly materialId: MaterialId;
  readonly lotNumber?: string;
  readonly serialNumber?: string;
  readonly countedQuantity: number;
  readonly unitOfMeasure: UnitOfMeasure;
}

/** Output for PerformCount operation */
export interface PerformCountOutput {
  readonly count: InventoryCount;
  readonly itemsWithVariance: number;
  readonly totalVarianceValue: MonetaryAmount;
  readonly adjustmentMovements: InventoryMovement[];
  readonly event: CountCompletedEvent;
}

/** PerformCount precondition predicates */
export const PerformCountPreconditions = {
  /** Count type must be valid */
  hasValidCountType(input: PerformCountInput): boolean {
    return isValidCountType(input.countType);
  },

  /** Warehouse ID must be provided */
  hasWarehouseId(input: PerformCountInput): boolean {
    return input.warehouseId !== undefined && input.warehouseId.trim().length > 0;
  },

  /** At least one item must be counted */
  hasItems(input: PerformCountInput): boolean {
    return input.items !== undefined && input.items.length > 0;
  },

  /** All counted quantities must be non-negative */
  hasNonNegativeQuantities(input: PerformCountInput): boolean {
    return input.items.every(item => item.countedQuantity >= 0);
  },

  /** All preconditions combined */
  all(input: PerformCountInput): boolean {
    return (
      this.hasValidCountType(input) &&
      this.hasWarehouseId(input) &&
      this.hasItems(input) &&
      this.hasNonNegativeQuantities(input)
    );
  }
};

/** PerformCount postcondition predicates */
export const PerformCountPostconditions = {
  /** Count must be created */
  hasCount(output: PerformCountOutput): boolean {
    return output.count !== undefined;
  },

  /** Count status must be COMPLETED */
  countIsCompleted(output: PerformCountOutput): boolean {
    return output.count.status === 'COMPLETED';
  },

  /** Event must be emitted */
  hasEvent(output: PerformCountOutput): boolean {
    return output.event !== undefined && output.event.eventType === 'COUNT_COMPLETED';
  },

  /** All postconditions combined */
  all(input: PerformCountInput, output: PerformCountOutput): boolean {
    return (
      this.hasCount(output) &&
      this.countIsCompleted(output) &&
      this.hasEvent(output)
    );
  }
};

/** PerformCount contract implementation */
export class PerformCountContract implements SurfaceContract<PerformCountInput, PerformCountOutput> {
  readonly name = 'PerformCount';
  readonly surface = INVENTORY_SURFACE;
  readonly version = INVENTORY_SURFACE_VERSION;

  constructor(
    private readonly countRepository: CountRepository,
    private readonly stockLevelRepository: StockLevelRepository,
    private readonly movementRepository: MovementRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: PerformCountInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!PerformCountPreconditions.hasValidCountType(input)) {
      violations.push({
        field: 'countType',
        rule: 'valid_type',
        message: 'Invalid count type',
        severity: 'ERROR'
      });
    }

    if (!PerformCountPreconditions.hasWarehouseId(input)) {
      violations.push({
        field: 'warehouseId',
        rule: 'required',
        message: 'Warehouse ID is required',
        severity: 'ERROR'
      });
    }

    if (!PerformCountPreconditions.hasItems(input)) {
      violations.push({
        field: 'items',
        rule: 'not_empty',
        message: 'At least one item must be counted',
        severity: 'ERROR'
      });
    }

    if (!PerformCountPreconditions.hasNonNegativeQuantities(input)) {
      violations.push({
        field: 'items.countedQuantity',
        rule: 'non_negative',
        message: 'All counted quantities must be non-negative',
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

  async execute(input: PerformCountInput): Promise<Result<PerformCountOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<PerformCountOutput, SurfaceError>;
    }

    const timestamp = this.timestampProvider.now();
    const countId = IdentityOperations.generateUUID();
    const eventId = IdentityOperations.generateUUID();

    // Process count items and calculate variances
    const countItems = await Promise.all(
      input.items.map(async (item) => {
        const stockResult = await this.stockLevelRepository.getStockLevel(
          item.materialId,
          '', // company code from context
          input.warehouseId,
          input.storageLocationId
        );

        const systemQuantity = stockResult.success ? stockResult.data.onHandQuantity : 0;
        const variance = item.countedQuantity - systemQuantity;

        return {
          materialId: item.materialId,
          lotNumber: item.lotNumber,
          serialNumber: item.serialNumber,
          systemQuantity,
          countedQuantity: item.countedQuantity,
          variance,
          unitOfMeasure: item.unitOfMeasure,
          status: variance !== 0 ? 'VARIANCE_APPROVED' as const : 'COUNTED' as const
        };
      })
    );

    const itemsWithVariance = countItems.filter(item => item.variance !== 0).length;

    const count: InventoryCount = {
      countId,
      countType: input.countType,
      warehouseId: input.warehouseId,
      storageLocationId: input.storageLocationId,
      countDate: input.countDate,
      status: 'COMPLETED',
      items: countItems,
      createdAt: timestamp,
      createdBy: 'SYSTEM',
      completedAt: timestamp,
      completedBy: 'SYSTEM'
    };

    // Create adjustment movements for variances
    const adjustmentMovements: InventoryMovement[] = [];
    for (const item of countItems) {
      if (item.variance !== 0) {
        const movementId = IdentityOperations.generateUUID();
        const movement: InventoryMovement = {
          movementId,
          movementType: 'ADJUSTMENT',
          materialId: item.materialId,
          fromLocation: null,
          toLocation: {
            materialId: item.materialId,
            companyCode: '',
            warehouseId: input.warehouseId,
            storageLocationId: input.storageLocationId,
            lotNumber: item.lotNumber,
            serialNumber: item.serialNumber
          },
          quantity: Math.abs(item.variance),
          unitOfMeasure: item.unitOfMeasure,
          movementDate: input.countDate,
          postingDate: input.countDate,
          referenceDocument: countId,
          referenceDocumentItem: item.materialId,
          reason: `Inventory count adjustment - Count ID: ${countId}`,
          reversalIndicator: false,
          reversalMovementId: null,
          createdAt: timestamp,
          createdBy: 'SYSTEM'
        };
        adjustmentMovements.push(movement);
      }
    }

    const totalVarianceValue: MonetaryAmount = {
      value: 0, // Would be calculated based on material valuation
      currency: 'USD',
      precision: 2
    };

    const event = InventoryEventFactory.countCompleted(
      input.correlationId,
      null,
      countId,
      input.countType,
      input.warehouseId,
      input.countDate,
      countItems.length,
      itemsWithVariance,
      totalVarianceValue,
      timestamp,
      eventId
    );

    const output: PerformCountOutput = {
      count,
      itemsWithVariance,
      totalVarianceValue,
      adjustmentMovements,
      event
    };

    const postconditionResult = this.checkPostconditions(input, output);
    if (!postconditionResult.success) {
      return postconditionResult as Result<PerformCountOutput, SurfaceError>;
    }

    return Results.success(output);
  }

  checkPostconditions(input: PerformCountInput, output: PerformCountOutput): Result<void, ValidationError> {
    if (!PerformCountPostconditions.all(input, output)) {
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
// Repository Interfaces
// ============================================================================

/** Stock level repository interface */
export interface StockLevelRepository {
  getStockLevel(
    materialId: MaterialId,
    companyCode: CompanyCode,
    warehouseId: WarehouseId,
    storageLocationId?: StorageLocationId
  ): Promise<Result<StockLevel, SurfaceError>>;

  updateStockLevel(stockLevel: StockLevel): Promise<Result<StockLevel, SurfaceError>>;
}

/** Movement repository interface */
export interface MovementRepository {
  recordMovement(movement: InventoryMovement): Promise<Result<InventoryMovement, SurfaceError>>;
  getMovement(movementId: Identifier): Promise<Result<InventoryMovement, SurfaceError>>;
  reverseMovement(movementId: Identifier, reason: string): Promise<Result<InventoryMovement, SurfaceError>>;
}

/** Valuation repository interface */
export interface ValuationRepository {
  recordValuation(valuation: InventoryValuation): Promise<Result<InventoryValuation, SurfaceError>>;
  getValuation(valuationId: Identifier): Promise<Result<InventoryValuation, SurfaceError>>;
}

/** Count repository interface */
export interface CountRepository {
  recordCount(count: InventoryCount): Promise<Result<InventoryCount, SurfaceError>>;
  getCount(countId: Identifier): Promise<Result<InventoryCount, SurfaceError>>;
  updateCountStatus(countId: Identifier, status: string): Promise<Result<InventoryCount, SurfaceError>>;
}

// ============================================================================
// Inventory Surface
// ============================================================================

/** Inventory surface facade */
export interface InventorySurface {
  /** Get stock level for a material */
  getStockLevel(input: GetStockLevelInput): Promise<Result<GetStockLevelOutput, SurfaceError>>;

  /** Record an inventory movement */
  recordMovement(input: RecordMovementInput): Promise<Result<RecordMovementOutput, SurfaceError>>;

  /** Revalue inventory */
  revalueInventory(input: RevalueInventoryInput): Promise<Result<RevalueInventoryOutput, SurfaceError>>;

  /** Perform inventory count */
  performCount(input: PerformCountInput): Promise<Result<PerformCountOutput, SurfaceError>>;
}

/** Default inventory surface implementation */
export class DefaultInventorySurface implements InventorySurface {
  private readonly getStockLevelContract: GetStockLevelContract;
  private readonly recordMovementContract: RecordMovementContract;
  private readonly revalueInventoryContract: RevalueInventoryContract;
  private readonly performCountContract: PerformCountContract;

  constructor(
    stockLevelRepository: StockLevelRepository,
    movementRepository: MovementRepository,
    valuationRepository: ValuationRepository,
    countRepository: CountRepository,
    timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {
    this.getStockLevelContract = new GetStockLevelContract(stockLevelRepository, timestampProvider);
    this.recordMovementContract = new RecordMovementContract(stockLevelRepository, movementRepository, timestampProvider);
    this.revalueInventoryContract = new RevalueInventoryContract(valuationRepository, stockLevelRepository, timestampProvider);
    this.performCountContract = new PerformCountContract(countRepository, stockLevelRepository, movementRepository, timestampProvider);
  }

  async getStockLevel(input: GetStockLevelInput): Promise<Result<GetStockLevelOutput, SurfaceError>> {
    return this.getStockLevelContract.execute(input);
  }

  async recordMovement(input: RecordMovementInput): Promise<Result<RecordMovementOutput, SurfaceError>> {
    return this.recordMovementContract.execute(input);
  }

  async revalueInventory(input: RevalueInventoryInput): Promise<Result<RevalueInventoryOutput, SurfaceError>> {
    return this.revalueInventoryContract.execute(input);
  }

  async performCount(input: PerformCountInput): Promise<Result<PerformCountOutput, SurfaceError>> {
    return this.performCountContract.execute(input);
  }
}
