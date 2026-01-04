/**
 * Fixed Assets Surface Contracts
 *
 * Vendor-neutral behavioral contracts for fixed asset operations.
 * All contracts specify preconditions, postconditions, state transitions,
 * observable events, and error types.
 */

import {
  MonetaryAmount,
  CurrencyCode,
  DateString,
  Timestamp,
  FiscalYear,
  FiscalPeriod,
  CompanyCode,
  AccountNumber,
  DocumentNumber,
  CorrelationId,
  UserId,
  CostCenter,
  Result,
  SurfaceError,
  ValidationError,
  StateError
} from '../../../common';

// ============================================================================
// SURFACE DEFINITION
// ============================================================================

/** Fixed Assets Surface identifier */
export const FIXED_ASSETS_SURFACE = 'finance.fixed-assets' as const;

/** Surface version */
export const FIXED_ASSETS_VERSION = '1.0.0' as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Asset identifier */
export type AssetId = string;

/** Asset class */
export type AssetClass = string;

/** Depreciation method */
export type DepreciationMethod =
  | 'STRAIGHT_LINE'
  | 'DECLINING_BALANCE'
  | 'DOUBLE_DECLINING'
  | 'SUM_OF_YEARS'
  | 'UNITS_OF_PRODUCTION'
  | 'MACRS';

/** Asset states */
export const AssetState = {
  PLANNED: 'PLANNED',
  ACQUIRED: 'ACQUIRED',
  IN_SERVICE: 'IN_SERVICE',
  SUSPENDED: 'SUSPENDED',
  RETIRED: 'RETIRED',
  DISPOSED: 'DISPOSED',
  TRANSFERRED: 'TRANSFERRED'
} as const;

export type AssetState = typeof AssetState[keyof typeof AssetState];

/** Disposal type */
export type DisposalType =
  | 'SALE'
  | 'SCRAP'
  | 'DONATION'
  | 'TRADE_IN'
  | 'THEFT'
  | 'CASUALTY'
  | 'ABANDONMENT';

// ============================================================================
// ACQUIRE ASSET CONTRACT
// ============================================================================

/** Asset acquisition details */
export interface AssetAcquisitionDetails {
  readonly description: string;
  readonly assetClass: AssetClass;
  readonly acquisitionDate: DateString;
  readonly inServiceDate: DateString;
  readonly acquisitionCost: MonetaryAmount;
  readonly salvageValue: MonetaryAmount;
  readonly usefulLifeMonths: number;
  readonly depreciationMethod: DepreciationMethod;
  readonly companyCode: CompanyCode;
  readonly costCenter: CostCenter;
  readonly location?: string;
  readonly serialNumber?: string;
  readonly manufacturer?: string;
  readonly model?: string;
}

/** Acquire Asset input */
export interface AcquireAssetInput {
  readonly details: AssetAcquisitionDetails;
  readonly purchaseOrderNumber?: string;
  readonly invoiceNumber?: string;
  readonly vendorId?: string;
  readonly assetAccountNumber: AccountNumber;
  readonly depreciationAccountNumber: AccountNumber;
  readonly accumulatedDepreciationAccountNumber: AccountNumber;
  readonly correlationId: CorrelationId;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
}

/** Acquire Asset output */
export interface AcquireAssetOutput {
  readonly assetId: AssetId;
  readonly assetNumber: string;
  readonly documentNumber: DocumentNumber;
  readonly status: AssetState;
  readonly acquisitionCost: MonetaryAmount;
  readonly netBookValue: MonetaryAmount;
  readonly annualDepreciation: MonetaryAmount;
  readonly monthlyDepreciation: MonetaryAmount;
  readonly depreciationStartDate: DateString;
  readonly depreciationEndDate: DateString;
  readonly createdAt: Timestamp;
}

/** Acquire Asset error types */
export type AcquireAssetError =
  | InvalidAssetClassError
  | InvalidDepreciationMethodError
  | InvalidUsefulLifeError
  | FAClosedPeriodError;

/** Invalid asset class error */
export interface InvalidAssetClassError extends ValidationError {
  readonly errorCode: 'FA_INVALID_ASSET_CLASS';
  readonly assetClass: AssetClass;
  readonly reason: string;
}

/** Invalid depreciation method error */
export interface InvalidDepreciationMethodError extends ValidationError {
  readonly errorCode: 'FA_INVALID_DEPRECIATION_METHOD';
  readonly depreciationMethod: DepreciationMethod;
  readonly assetClass: AssetClass;
  readonly reason: string;
}

/** Invalid useful life error */
export interface InvalidUsefulLifeError extends ValidationError {
  readonly errorCode: 'FA_INVALID_USEFUL_LIFE';
  readonly providedMonths: number;
  readonly minimumMonths: number;
  readonly maximumMonths: number;
}

/** FA Closed period error */
export interface FAClosedPeriodError extends StateError {
  readonly errorCode: 'FA_CLOSED_PERIOD';
  readonly fiscalYear: FiscalYear;
  readonly fiscalPeriod: FiscalPeriod;
}

/** Acquire Asset preconditions */
export interface AcquireAssetPreconditions {
  /** Asset class must be valid */
  assetClassMustBeValid(assetClass: AssetClass): boolean;

  /** Depreciation method must be valid for asset class */
  depreciationMethodMustBeValid(
    depreciationMethod: DepreciationMethod,
    assetClass: AssetClass
  ): boolean;

  /** Useful life must be within acceptable range */
  usefulLifeMustBeValid(usefulLifeMonths: number, assetClass: AssetClass): boolean;

  /** Salvage value must not exceed acquisition cost */
  salvageValueMustBeValid(salvageValue: MonetaryAmount, acquisitionCost: MonetaryAmount): boolean;

  /** Fiscal period must be open */
  fiscalPeriodMustBeOpen(acquisitionDate: DateString, companyCode: CompanyCode): boolean;

  /** User must have acquisition authorization */
  userMustHaveAcquisitionAuth(userId: UserId, acquisitionCost: MonetaryAmount): boolean;
}

/** Acquire Asset postconditions */
export interface AcquireAssetPostconditions {
  /** Asset ID assigned */
  assetIdAssigned(output: AcquireAssetOutput): boolean;

  /** Asset account debited */
  assetAccountDebited(assetAccountNumber: AccountNumber, acquisitionCost: MonetaryAmount): boolean;

  /** Depreciation schedule created */
  depreciationScheduleCreated(assetId: AssetId): boolean;

  /** State is ACQUIRED or IN_SERVICE */
  stateIsValid(output: AcquireAssetOutput): boolean;
}

/** Acquire Asset contract */
export interface AcquireAssetContract {
  readonly contractId: 'AcquireAsset';
  readonly surface: typeof FIXED_ASSETS_SURFACE;
  readonly version: typeof FIXED_ASSETS_VERSION;
  readonly input: AcquireAssetInput;
  readonly output: AcquireAssetOutput;
  readonly preconditions: AcquireAssetPreconditions;
  readonly postconditions: AcquireAssetPostconditions;
  readonly stateTransitions: {
    readonly assetState: {
      readonly from: null | typeof AssetState.PLANNED;
      readonly to: typeof AssetState.ACQUIRED | typeof AssetState.IN_SERVICE;
      readonly trigger: 'ACQUISITION';
    };
  };
  readonly observableEvents: {
    readonly onReceived: 'FA.ACQUISITION_RECEIVED';
    readonly onValidated: 'FA.ACQUISITION_VALIDATED';
    readonly onCompleted: 'FA.ASSET_ACQUIRED';
  };
  readonly errorTypes: AcquireAssetError;
}

/** Precondition predicates */
export const AcquireAssetPreconditionPredicates: AcquireAssetPreconditions = {
  assetClassMustBeValid(_assetClass: AssetClass): boolean {
    return true;
  },

  depreciationMethodMustBeValid(
    _depreciationMethod: DepreciationMethod,
    _assetClass: AssetClass
  ): boolean {
    return true;
  },

  usefulLifeMustBeValid(usefulLifeMonths: number, _assetClass: AssetClass): boolean {
    return usefulLifeMonths > 0 && usefulLifeMonths <= 600; // Max 50 years
  },

  salvageValueMustBeValid(salvageValue: MonetaryAmount, acquisitionCost: MonetaryAmount): boolean {
    return salvageValue.value >= 0 && salvageValue.value < acquisitionCost.value;
  },

  fiscalPeriodMustBeOpen(_acquisitionDate: DateString, _companyCode: CompanyCode): boolean {
    return true;
  },

  userMustHaveAcquisitionAuth(_userId: UserId, _acquisitionCost: MonetaryAmount): boolean {
    return true;
  }
};

// ============================================================================
// DEPRECIATE ASSET CONTRACT
// ============================================================================

/** Depreciate Asset input */
export interface DepreciateAssetInput {
  readonly assetId: AssetId;
  readonly fiscalYear: FiscalYear;
  readonly fiscalPeriod: FiscalPeriod;
  readonly depreciationDate: DateString;
  readonly overrideAmount?: MonetaryAmount;
  readonly reason?: string;
  readonly correlationId: CorrelationId;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
}

/** Depreciation detail */
export interface DepreciationDetail {
  readonly assetId: AssetId;
  readonly periodDepreciation: MonetaryAmount;
  readonly accumulatedDepreciation: MonetaryAmount;
  readonly netBookValue: MonetaryAmount;
  readonly remainingLife: number;
  readonly depreciationPercentComplete: number;
}

/** Depreciate Asset output */
export interface DepreciateAssetOutput {
  readonly assetId: AssetId;
  readonly documentNumber: DocumentNumber;
  readonly fiscalYear: FiscalYear;
  readonly fiscalPeriod: FiscalPeriod;
  readonly depreciationAmount: MonetaryAmount;
  readonly previousAccumulated: MonetaryAmount;
  readonly newAccumulated: MonetaryAmount;
  readonly previousNetBookValue: MonetaryAmount;
  readonly newNetBookValue: MonetaryAmount;
  readonly depreciatedAt: Timestamp;
  readonly isFullyDepreciated: boolean;
}

/** Depreciate Asset error types */
export type DepreciateAssetError =
  | AssetNotFoundError
  | AssetNotDepreciableError
  | AlreadyDepreciatedError
  | FullyDepreciatedError;

/** Asset not found error */
export interface AssetNotFoundError extends ValidationError {
  readonly errorCode: 'FA_ASSET_NOT_FOUND';
  readonly assetId: AssetId;
}

/** Asset not depreciable error */
export interface AssetNotDepreciableError extends StateError {
  readonly errorCode: 'FA_ASSET_NOT_DEPRECIABLE';
  readonly assetId: AssetId;
  readonly currentState: AssetState;
}

/** Already depreciated error */
export interface AlreadyDepreciatedError extends ValidationError {
  readonly errorCode: 'FA_ALREADY_DEPRECIATED';
  readonly assetId: AssetId;
  readonly fiscalYear: FiscalYear;
  readonly fiscalPeriod: FiscalPeriod;
}

/** Fully depreciated error */
export interface FullyDepreciatedError extends ValidationError {
  readonly errorCode: 'FA_FULLY_DEPRECIATED';
  readonly assetId: AssetId;
  readonly netBookValue: MonetaryAmount;
  readonly salvageValue: MonetaryAmount;
}

/** Depreciate Asset preconditions */
export interface DepreciateAssetPreconditions {
  /** Asset must exist */
  assetMustExist(assetId: AssetId): boolean;

  /** Asset must be in depreciable state */
  assetMustBeDepreciable(assetId: AssetId): boolean;

  /** Period must not be already depreciated */
  periodMustNotBeDepreciated(assetId: AssetId, fiscalYear: FiscalYear, fiscalPeriod: FiscalPeriod): boolean;

  /** Asset must not be fully depreciated */
  assetMustNotBeFullyDepreciated(assetId: AssetId): boolean;

  /** Fiscal period must be open */
  fiscalPeriodMustBeOpen(fiscalYear: FiscalYear, fiscalPeriod: FiscalPeriod): boolean;
}

/** Depreciate Asset postconditions */
export interface DepreciateAssetPostconditions {
  /** Accumulated depreciation increased */
  accumulatedDepreciationIncreased(output: DepreciateAssetOutput): boolean;

  /** Net book value decreased */
  netBookValueDecreased(output: DepreciateAssetOutput): boolean;

  /** GL entries created */
  glEntriesCreated(documentNumber: DocumentNumber): boolean;

  /** Depreciation record created */
  depreciationRecordCreated(assetId: AssetId, fiscalYear: FiscalYear, fiscalPeriod: FiscalPeriod): boolean;
}

/** Depreciate Asset contract */
export interface DepreciateAssetContract {
  readonly contractId: 'DepreciateAsset';
  readonly surface: typeof FIXED_ASSETS_SURFACE;
  readonly version: typeof FIXED_ASSETS_VERSION;
  readonly input: DepreciateAssetInput;
  readonly output: DepreciateAssetOutput;
  readonly preconditions: DepreciateAssetPreconditions;
  readonly postconditions: DepreciateAssetPostconditions;
  readonly stateTransitions: null; // No state change for depreciation
  readonly observableEvents: {
    readonly onReceived: 'FA.DEPRECIATION_RECEIVED';
    readonly onCalculated: 'FA.DEPRECIATION_CALCULATED';
    readonly onCompleted: 'FA.DEPRECIATION_POSTED';
  };
  readonly errorTypes: DepreciateAssetError;
}

// ============================================================================
// DISPOSE ASSET CONTRACT
// ============================================================================

/** Dispose Asset input */
export interface DisposeAssetInput {
  readonly assetId: AssetId;
  readonly disposalType: DisposalType;
  readonly disposalDate: DateString;
  readonly salePrice?: MonetaryAmount;
  readonly proceedsAccountNumber?: AccountNumber;
  readonly gainLossAccountNumber: AccountNumber;
  readonly buyerId?: string;
  readonly reason: string;
  readonly correlationId: CorrelationId;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
}

/** Dispose Asset output */
export interface DisposeAssetOutput {
  readonly assetId: AssetId;
  readonly documentNumber: DocumentNumber;
  readonly disposalType: DisposalType;
  readonly disposalDate: DateString;
  readonly netBookValueAtDisposal: MonetaryAmount;
  readonly saleProceeds: MonetaryAmount;
  readonly gainLoss: MonetaryAmount;
  readonly gainLossType: 'GAIN' | 'LOSS' | 'NONE';
  readonly previousState: AssetState;
  readonly newState: AssetState;
  readonly disposedAt: Timestamp;
}

/** Dispose Asset error types */
export type DisposeAssetError =
  | AssetNotFoundError
  | AssetNotDisposableError
  | InvalidDisposalTypeError
  | FutureDisposalDateError;

/** Asset not disposable error */
export interface AssetNotDisposableError extends StateError {
  readonly errorCode: 'FA_ASSET_NOT_DISPOSABLE';
  readonly assetId: AssetId;
  readonly currentState: AssetState;
}

/** Invalid disposal type error */
export interface InvalidDisposalTypeError extends ValidationError {
  readonly errorCode: 'FA_INVALID_DISPOSAL_TYPE';
  readonly disposalType: DisposalType;
  readonly reason: string;
}

/** Future disposal date error */
export interface FutureDisposalDateError extends ValidationError {
  readonly errorCode: 'FA_FUTURE_DISPOSAL_DATE';
  readonly disposalDate: DateString;
  readonly currentDate: DateString;
}

/** Dispose Asset preconditions */
export interface DisposeAssetPreconditions {
  /** Asset must exist */
  assetMustExist(assetId: AssetId): boolean;

  /** Asset must be in disposable state */
  assetMustBeDisposable(assetId: AssetId): boolean;

  /** Disposal date must not be in future */
  disposalDateMustNotBeFuture(disposalDate: DateString): boolean;

  /** Sale price required for SALE disposal */
  salePriceRequiredForSale(disposalType: DisposalType, salePrice: MonetaryAmount | undefined): boolean;

  /** User must have disposal authorization */
  userMustHaveDisposalAuth(userId: UserId, assetId: AssetId): boolean;
}

/** Dispose Asset postconditions */
export interface DisposeAssetPostconditions {
  /** Asset state is DISPOSED */
  assetStateIsDisposed(output: DisposeAssetOutput): boolean;

  /** Asset account cleared */
  assetAccountCleared(assetId: AssetId): boolean;

  /** Accumulated depreciation cleared */
  accumulatedDepreciationCleared(assetId: AssetId): boolean;

  /** Gain/Loss correctly calculated */
  gainLossCorrectlyCalculated(output: DisposeAssetOutput): boolean;

  /** GL entries created */
  glEntriesCreated(documentNumber: DocumentNumber): boolean;
}

/** Dispose Asset contract */
export interface DisposeAssetContract {
  readonly contractId: 'DisposeAsset';
  readonly surface: typeof FIXED_ASSETS_SURFACE;
  readonly version: typeof FIXED_ASSETS_VERSION;
  readonly input: DisposeAssetInput;
  readonly output: DisposeAssetOutput;
  readonly preconditions: DisposeAssetPreconditions;
  readonly postconditions: DisposeAssetPostconditions;
  readonly stateTransitions: {
    readonly assetState: {
      readonly from: typeof AssetState.IN_SERVICE | typeof AssetState.SUSPENDED;
      readonly to: typeof AssetState.DISPOSED;
      readonly trigger: 'DISPOSAL';
    };
  };
  readonly observableEvents: {
    readonly onReceived: 'FA.DISPOSAL_RECEIVED';
    readonly onValidated: 'FA.DISPOSAL_VALIDATED';
    readonly onCompleted: 'FA.ASSET_DISPOSED';
  };
  readonly errorTypes: DisposeAssetError;
}

// ============================================================================
// FIXED ASSETS SURFACE INTERFACE
// ============================================================================

/** Fixed Assets Surface interface */
export interface FixedAssetsSurface {
  readonly surfaceId: typeof FIXED_ASSETS_SURFACE;
  readonly version: typeof FIXED_ASSETS_VERSION;

  /** Acquire a new asset */
  acquireAsset(
    input: AcquireAssetInput
  ): Promise<Result<AcquireAssetOutput, AcquireAssetError>>;

  /** Depreciate an asset */
  depreciateAsset(
    input: DepreciateAssetInput
  ): Promise<Result<DepreciateAssetOutput, DepreciateAssetError>>;

  /** Dispose an asset */
  disposeAsset(
    input: DisposeAssetInput
  ): Promise<Result<DisposeAssetOutput, DisposeAssetError>>;
}

// ============================================================================
// CONTRACT REGISTRY
// ============================================================================

/** All contracts in the Fixed Assets surface */
export type FixedAssetsContracts =
  | AcquireAssetContract
  | DepreciateAssetContract
  | DisposeAssetContract;

/** Contract registry */
export const FixedAssetsContractRegistry = {
  AcquireAsset: {
    contractId: 'AcquireAsset',
    surface: FIXED_ASSETS_SURFACE,
    version: FIXED_ASSETS_VERSION
  },
  DepreciateAsset: {
    contractId: 'DepreciateAsset',
    surface: FIXED_ASSETS_SURFACE,
    version: FIXED_ASSETS_VERSION
  },
  DisposeAsset: {
    contractId: 'DisposeAsset',
    surface: FIXED_ASSETS_SURFACE,
    version: FIXED_ASSETS_VERSION
  }
} as const;
