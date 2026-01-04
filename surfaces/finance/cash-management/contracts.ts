/**
 * Cash Management Surface Contracts
 *
 * Vendor-neutral behavioral contracts for cash management operations.
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
  Result,
  SurfaceError,
  ValidationError,
  StateError
} from '../../../common';

// ============================================================================
// SURFACE DEFINITION
// ============================================================================

/** Cash Management Surface identifier */
export const CASH_MANAGEMENT_SURFACE = 'finance.cash-management' as const;

/** Surface version */
export const CASH_MANAGEMENT_VERSION = '1.0.0' as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Bank account identifier */
export type BankAccountId = string;

/** Bank statement identifier */
export type StatementId = string;

/** Transaction identifier */
export type TransactionId = string;

/** Reconciliation states */
export const ReconciliationState = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  PARTIALLY_RECONCILED: 'PARTIALLY_RECONCILED',
  RECONCILED: 'RECONCILED',
  APPROVED: 'APPROVED',
  POSTED: 'POSTED'
} as const;

export type ReconciliationState = typeof ReconciliationState[keyof typeof ReconciliationState];

/** Transaction match status */
export type MatchStatus =
  | 'MATCHED'
  | 'PARTIALLY_MATCHED'
  | 'UNMATCHED'
  | 'MANUAL_MATCH'
  | 'EXCEPTION';

/** Cash position status */
export type CashPositionStatus =
  | 'CURRENT'
  | 'PROJECTED'
  | 'HISTORICAL';

/** Forecast period type */
export type ForecastPeriodType =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY';

// ============================================================================
// RECONCILE BANK CONTRACT
// ============================================================================

/** Bank statement transaction */
export interface BankStatementTransaction {
  readonly transactionId: TransactionId;
  readonly transactionDate: DateString;
  readonly valueDate: DateString;
  readonly description: string;
  readonly amount: MonetaryAmount;
  readonly transactionType: 'CREDIT' | 'DEBIT';
  readonly reference: string;
  readonly bankReference?: string;
}

/** GL transaction for matching */
export interface GLTransaction {
  readonly documentNumber: DocumentNumber;
  readonly transactionDate: DateString;
  readonly description: string;
  readonly amount: MonetaryAmount;
  readonly transactionType: 'CREDIT' | 'DEBIT';
  readonly reference: string;
  readonly clearedDate?: DateString;
}

/** Match result */
export interface MatchResult {
  readonly bankTransactionId: TransactionId;
  readonly glDocumentNumber: DocumentNumber | null;
  readonly matchStatus: MatchStatus;
  readonly matchConfidence: number;
  readonly difference: MonetaryAmount;
  readonly matchedAt: Timestamp;
  readonly matchedBy: 'AUTO' | 'MANUAL';
}

/** Reconcile Bank input */
export interface ReconcileBankInput {
  readonly bankAccountId: BankAccountId;
  readonly statementId: StatementId;
  readonly statementDate: DateString;
  readonly statementOpeningBalance: MonetaryAmount;
  readonly statementClosingBalance: MonetaryAmount;
  readonly bankTransactions: readonly BankStatementTransaction[];
  readonly correlationId: CorrelationId;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
}

/** Reconciliation summary */
export interface ReconciliationSummary {
  readonly totalBankTransactions: number;
  readonly matchedTransactions: number;
  readonly unmatchedBankTransactions: number;
  readonly unmatchedGLTransactions: number;
  readonly autoMatchedCount: number;
  readonly manualMatchedCount: number;
  readonly exceptionCount: number;
}

/** Reconcile Bank output */
export interface ReconcileBankOutput {
  readonly reconciliationId: string;
  readonly bankAccountId: BankAccountId;
  readonly statementDate: DateString;
  readonly status: ReconciliationState;
  readonly bookBalance: MonetaryAmount;
  readonly bankBalance: MonetaryAmount;
  readonly outstandingDeposits: MonetaryAmount;
  readonly outstandingChecks: MonetaryAmount;
  readonly adjustedBankBalance: MonetaryAmount;
  readonly difference: MonetaryAmount;
  readonly isReconciled: boolean;
  readonly matchResults: readonly MatchResult[];
  readonly summary: ReconciliationSummary;
  readonly reconciledAt: Timestamp;
}

/** Reconcile Bank error types */
export type ReconcileBankError =
  | BankAccountNotFoundError
  | DuplicateStatementError
  | BalanceMismatchError
  | ReconciliationInProgressError;

/** Bank account not found error */
export interface BankAccountNotFoundError extends ValidationError {
  readonly errorCode: 'CM_BANK_ACCOUNT_NOT_FOUND';
  readonly bankAccountId: BankAccountId;
}

/** Duplicate statement error */
export interface DuplicateStatementError extends ValidationError {
  readonly errorCode: 'CM_DUPLICATE_STATEMENT';
  readonly bankAccountId: BankAccountId;
  readonly statementDate: DateString;
  readonly existingStatementId: StatementId;
}

/** Balance mismatch error */
export interface BalanceMismatchError extends ValidationError {
  readonly errorCode: 'CM_BALANCE_MISMATCH';
  readonly expectedBalance: MonetaryAmount;
  readonly actualBalance: MonetaryAmount;
  readonly difference: MonetaryAmount;
}

/** Reconciliation in progress error */
export interface ReconciliationInProgressError extends StateError {
  readonly errorCode: 'CM_RECONCILIATION_IN_PROGRESS';
  readonly bankAccountId: BankAccountId;
  readonly existingReconciliationId: string;
}

/** Reconcile Bank preconditions */
export interface ReconcileBankPreconditions {
  /** Bank account must exist and be active */
  bankAccountMustExist(bankAccountId: BankAccountId): boolean;

  /** Statement must not be duplicate */
  statementMustNotBeDuplicate(bankAccountId: BankAccountId, statementDate: DateString): boolean;

  /** No reconciliation in progress for this account */
  noReconciliationInProgress(bankAccountId: BankAccountId): boolean;

  /** Opening balance must match previous closing */
  openingBalanceMustMatch(
    bankAccountId: BankAccountId,
    openingBalance: MonetaryAmount
  ): boolean;

  /** User must have reconciliation authorization */
  userMustHaveReconAuth(userId: UserId, bankAccountId: BankAccountId): boolean;
}

/** Reconcile Bank postconditions */
export interface ReconcileBankPostconditions {
  /** Reconciliation ID assigned */
  reconciliationIdAssigned(output: ReconcileBankOutput): boolean;

  /** All transactions processed */
  allTransactionsProcessed(output: ReconcileBankOutput): boolean;

  /** Book balance calculated correctly */
  bookBalanceCorrect(output: ReconcileBankOutput): boolean;

  /** Match results recorded */
  matchResultsRecorded(output: ReconcileBankOutput): boolean;
}

/** Reconcile Bank contract */
export interface ReconcileBankContract {
  readonly contractId: 'ReconcileBank';
  readonly surface: typeof CASH_MANAGEMENT_SURFACE;
  readonly version: typeof CASH_MANAGEMENT_VERSION;
  readonly input: ReconcileBankInput;
  readonly output: ReconcileBankOutput;
  readonly preconditions: ReconcileBankPreconditions;
  readonly postconditions: ReconcileBankPostconditions;
  readonly stateTransitions: {
    readonly reconciliationState: {
      readonly from: null;
      readonly to: typeof ReconciliationState.IN_PROGRESS | typeof ReconciliationState.RECONCILED;
      readonly trigger: 'START_RECONCILIATION';
    };
  };
  readonly observableEvents: {
    readonly onReceived: 'CM.RECONCILIATION_RECEIVED';
    readonly onMatchingStarted: 'CM.MATCHING_STARTED';
    readonly onMatchingCompleted: 'CM.MATCHING_COMPLETED';
    readonly onReconciled: 'CM.RECONCILIATION_COMPLETED';
  };
  readonly errorTypes: ReconcileBankError;
}

/** Precondition predicates */
export const ReconcileBankPreconditionPredicates: ReconcileBankPreconditions = {
  bankAccountMustExist(_bankAccountId: BankAccountId): boolean {
    return true;
  },

  statementMustNotBeDuplicate(_bankAccountId: BankAccountId, _statementDate: DateString): boolean {
    return true;
  },

  noReconciliationInProgress(_bankAccountId: BankAccountId): boolean {
    return true;
  },

  openingBalanceMustMatch(
    _bankAccountId: BankAccountId,
    _openingBalance: MonetaryAmount
  ): boolean {
    return true;
  },

  userMustHaveReconAuth(_userId: UserId, _bankAccountId: BankAccountId): boolean {
    return true;
  }
};

// ============================================================================
// GET CASH POSITION CONTRACT
// ============================================================================

/** Bank account balance */
export interface BankAccountBalance {
  readonly bankAccountId: BankAccountId;
  readonly bankAccountName: string;
  readonly bankName: string;
  readonly accountNumber: string;
  readonly currency: CurrencyCode;
  readonly currentBalance: MonetaryAmount;
  readonly availableBalance: MonetaryAmount;
  readonly pendingDeposits: MonetaryAmount;
  readonly pendingWithdrawals: MonetaryAmount;
  readonly lastUpdated: Timestamp;
}

/** Cash position by currency */
export interface CurrencyCashPosition {
  readonly currency: CurrencyCode;
  readonly totalBalance: MonetaryAmount;
  readonly accountCount: number;
  readonly accounts: readonly BankAccountBalance[];
}

/** Get Cash Position input */
export interface GetCashPositionInput {
  readonly companyCode: CompanyCode;
  readonly asOfDate?: DateString;
  readonly currencies?: readonly CurrencyCode[];
  readonly bankAccountIds?: readonly BankAccountId[];
  readonly includeProjected?: boolean;
  readonly correlationId: CorrelationId;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
}

/** Get Cash Position output */
export interface GetCashPositionOutput {
  readonly companyCode: CompanyCode;
  readonly asOfDate: DateString;
  readonly status: CashPositionStatus;
  readonly totalCashPosition: MonetaryAmount;
  readonly reportingCurrency: CurrencyCode;
  readonly positionsByCurrency: readonly CurrencyCashPosition[];
  readonly totalAccountCount: number;
  readonly projectedInflows: MonetaryAmount | null;
  readonly projectedOutflows: MonetaryAmount | null;
  readonly netProjectedChange: MonetaryAmount | null;
  readonly lastUpdated: Timestamp;
}

/** Get Cash Position error types */
export type GetCashPositionError =
  | CompanyNotFoundError
  | NoAccountsFoundError;

/** Company not found error */
export interface CompanyNotFoundError extends ValidationError {
  readonly errorCode: 'CM_COMPANY_NOT_FOUND';
  readonly companyCode: CompanyCode;
}

/** No accounts found error */
export interface NoAccountsFoundError extends ValidationError {
  readonly errorCode: 'CM_NO_ACCOUNTS_FOUND';
  readonly companyCode: CompanyCode;
  readonly filter?: string;
}

/** Get Cash Position contract */
export interface GetCashPositionContract {
  readonly contractId: 'GetCashPosition';
  readonly surface: typeof CASH_MANAGEMENT_SURFACE;
  readonly version: typeof CASH_MANAGEMENT_VERSION;
  readonly input: GetCashPositionInput;
  readonly output: GetCashPositionOutput;
  readonly preconditions: {
    companyMustExist(companyCode: CompanyCode): boolean;
    userMustHaveViewAuth(userId: UserId, companyCode: CompanyCode): boolean;
  };
  readonly postconditions: {
    balancesSumToTotal(output: GetCashPositionOutput): boolean;
    currencyConversionsCorrect(output: GetCashPositionOutput): boolean;
  };
  readonly stateTransitions: null;
  readonly observableEvents: {
    readonly onReceived: 'CM.POSITION_QUERY_RECEIVED';
    readonly onCompleted: 'CM.POSITION_QUERY_COMPLETED';
  };
  readonly errorTypes: GetCashPositionError;
}

// ============================================================================
// CREATE CASH FORECAST CONTRACT
// ============================================================================

/** Forecast line item */
export interface ForecastLineItem {
  readonly category: string;
  readonly description: string;
  readonly amount: MonetaryAmount;
  readonly flowType: 'INFLOW' | 'OUTFLOW';
  readonly probability: number;
  readonly source: string;
  readonly sourceReference?: string;
}

/** Forecast period */
export interface ForecastPeriod {
  readonly periodStart: DateString;
  readonly periodEnd: DateString;
  readonly openingBalance: MonetaryAmount;
  readonly projectedInflows: MonetaryAmount;
  readonly projectedOutflows: MonetaryAmount;
  readonly netChange: MonetaryAmount;
  readonly closingBalance: MonetaryAmount;
  readonly lineItems: readonly ForecastLineItem[];
}

/** Create Cash Forecast input */
export interface CreateCashForecastInput {
  readonly companyCode: CompanyCode;
  readonly forecastName: string;
  readonly startDate: DateString;
  readonly endDate: DateString;
  readonly periodType: ForecastPeriodType;
  readonly baseCurrency: CurrencyCode;
  readonly includeARProjections: boolean;
  readonly includeAPProjections: boolean;
  readonly includeRecurring: boolean;
  readonly manualAdjustments?: readonly ForecastLineItem[];
  readonly correlationId: CorrelationId;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
}

/** Create Cash Forecast output */
export interface CreateCashForecastOutput {
  readonly forecastId: string;
  readonly forecastName: string;
  readonly companyCode: CompanyCode;
  readonly startDate: DateString;
  readonly endDate: DateString;
  readonly periodType: ForecastPeriodType;
  readonly baseCurrency: CurrencyCode;
  readonly openingCashPosition: MonetaryAmount;
  readonly closingCashPosition: MonetaryAmount;
  readonly totalProjectedInflows: MonetaryAmount;
  readonly totalProjectedOutflows: MonetaryAmount;
  readonly netCashFlow: MonetaryAmount;
  readonly periods: readonly ForecastPeriod[];
  readonly createdAt: Timestamp;
  readonly validUntil: Timestamp;
}

/** Create Cash Forecast error types */
export type CreateCashForecastError =
  | InvalidDateRangeError
  | InsufficientDataError
  | ForecastExistsError;

/** Invalid date range error */
export interface InvalidDateRangeError extends ValidationError {
  readonly errorCode: 'CM_INVALID_DATE_RANGE';
  readonly startDate: DateString;
  readonly endDate: DateString;
  readonly reason: string;
}

/** Insufficient data error */
export interface InsufficientDataError extends ValidationError {
  readonly errorCode: 'CM_INSUFFICIENT_DATA';
  readonly dataType: string;
  readonly required: string;
  readonly available: string;
}

/** Forecast exists error */
export interface ForecastExistsError extends ValidationError {
  readonly errorCode: 'CM_FORECAST_EXISTS';
  readonly forecastName: string;
  readonly existingForecastId: string;
}

/** Create Cash Forecast preconditions */
export interface CreateCashForecastPreconditions {
  /** Company must exist */
  companyMustExist(companyCode: CompanyCode): boolean;

  /** Date range must be valid */
  dateRangeMustBeValid(startDate: DateString, endDate: DateString): boolean;

  /** Sufficient historical data must exist */
  sufficientDataMustExist(companyCode: CompanyCode): boolean;

  /** Forecast name must be unique */
  forecastNameMustBeUnique(forecastName: string, companyCode: CompanyCode): boolean;

  /** User must have forecast authorization */
  userMustHaveForecastAuth(userId: UserId, companyCode: CompanyCode): boolean;
}

/** Create Cash Forecast postconditions */
export interface CreateCashForecastPostconditions {
  /** Forecast ID assigned */
  forecastIdAssigned(output: CreateCashForecastOutput): boolean;

  /** All periods generated */
  allPeriodsGenerated(output: CreateCashForecastOutput): boolean;

  /** Cash flow calculations correct */
  cashFlowCalculationsCorrect(output: CreateCashForecastOutput): boolean;

  /** Period balances chain correctly */
  periodBalancesChain(output: CreateCashForecastOutput): boolean;
}

/** Create Cash Forecast contract */
export interface CreateCashForecastContract {
  readonly contractId: 'CreateCashForecast';
  readonly surface: typeof CASH_MANAGEMENT_SURFACE;
  readonly version: typeof CASH_MANAGEMENT_VERSION;
  readonly input: CreateCashForecastInput;
  readonly output: CreateCashForecastOutput;
  readonly preconditions: CreateCashForecastPreconditions;
  readonly postconditions: CreateCashForecastPostconditions;
  readonly stateTransitions: null;
  readonly observableEvents: {
    readonly onReceived: 'CM.FORECAST_CREATE_RECEIVED';
    readonly onDataCollected: 'CM.FORECAST_DATA_COLLECTED';
    readonly onCalculated: 'CM.FORECAST_CALCULATED';
    readonly onCompleted: 'CM.FORECAST_CREATED';
  };
  readonly errorTypes: CreateCashForecastError;
}

/** Precondition predicates */
export const CreateCashForecastPreconditionPredicates: CreateCashForecastPreconditions = {
  companyMustExist(_companyCode: CompanyCode): boolean {
    return true;
  },

  dateRangeMustBeValid(startDate: DateString, endDate: DateString): boolean {
    return startDate < endDate;
  },

  sufficientDataMustExist(_companyCode: CompanyCode): boolean {
    return true;
  },

  forecastNameMustBeUnique(_forecastName: string, _companyCode: CompanyCode): boolean {
    return true;
  },

  userMustHaveForecastAuth(_userId: UserId, _companyCode: CompanyCode): boolean {
    return true;
  }
};

// ============================================================================
// CASH MANAGEMENT SURFACE INTERFACE
// ============================================================================

/** Cash Management Surface interface */
export interface CashManagementSurface {
  readonly surfaceId: typeof CASH_MANAGEMENT_SURFACE;
  readonly version: typeof CASH_MANAGEMENT_VERSION;

  /** Reconcile bank account */
  reconcileBank(
    input: ReconcileBankInput
  ): Promise<Result<ReconcileBankOutput, ReconcileBankError>>;

  /** Get current cash position */
  getCashPosition(
    input: GetCashPositionInput
  ): Promise<Result<GetCashPositionOutput, GetCashPositionError>>;

  /** Create cash forecast */
  createCashForecast(
    input: CreateCashForecastInput
  ): Promise<Result<CreateCashForecastOutput, CreateCashForecastError>>;
}

// ============================================================================
// CONTRACT REGISTRY
// ============================================================================

/** All contracts in the Cash Management surface */
export type CashManagementContracts =
  | ReconcileBankContract
  | GetCashPositionContract
  | CreateCashForecastContract;

/** Contract registry */
export const CashManagementContractRegistry = {
  ReconcileBank: {
    contractId: 'ReconcileBank',
    surface: CASH_MANAGEMENT_SURFACE,
    version: CASH_MANAGEMENT_VERSION
  },
  GetCashPosition: {
    contractId: 'GetCashPosition',
    surface: CASH_MANAGEMENT_SURFACE,
    version: CASH_MANAGEMENT_VERSION
  },
  CreateCashForecast: {
    contractId: 'CreateCashForecast',
    surface: CASH_MANAGEMENT_SURFACE,
    version: CASH_MANAGEMENT_VERSION
  }
} as const;
