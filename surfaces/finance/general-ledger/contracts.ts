/**
 * General Ledger Surface Contracts
 *
 * Vendor-neutral behavioral contracts for general ledger operations.
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

import { JournalState, DocumentLifecycleState } from './models';
import {
  JournalEntryReceivedEvent,
  ValidationCompletedEvent,
  PostingAttemptedEvent,
  PostingCompletedEvent,
  PostingFailedEvent,
  BalanceQueryReceivedEvent,
  BalanceQueryCompletedEvent
} from './events';

// ============================================================================
// SURFACE DEFINITION
// ============================================================================

/** General Ledger Surface identifier */
export const GENERAL_LEDGER_SURFACE = 'finance.general-ledger' as const;

/** Surface version */
export const GENERAL_LEDGER_VERSION = '1.0.0' as const;

// ============================================================================
// POST JOURNAL ENTRY CONTRACT
// ============================================================================

/** Journal header input */
export interface JournalHeader {
  readonly documentType: JournalDocumentType;
  readonly companyCode: CompanyCode;
  readonly postingDate: DateString;
  readonly documentDate: DateString;
  readonly reference: string;
  readonly headerText: string;
  readonly reversalDate?: DateString;
  readonly reversalReason?: string;
}

/** Journal document types */
export type JournalDocumentType =
  | 'SA'  // G/L Account Document
  | 'SK'  // Cash Document
  | 'KR'  // Vendor Invoice
  | 'KG'  // Vendor Credit Memo
  | 'DR'  // Customer Invoice
  | 'DG'  // Customer Credit Memo
  | 'AB'  // General Posting
  | 'AF'  // Depreciation Posting;

/** Journal line item */
export interface JournalLineItem {
  readonly lineNumber: number;
  readonly accountNumber: AccountNumber;
  readonly amount: MonetaryAmount;
  readonly debitCredit: DebitCredit;
  readonly costCenter?: string;
  readonly profitCenter?: string;
  readonly lineText?: string;
  readonly taxCode?: string;
  readonly assignment?: string;
}

/** Debit/Credit indicator */
export type DebitCredit = 'DEBIT' | 'CREDIT';

/** Post Journal Entry input */
export interface PostJournalEntryInput {
  readonly header: JournalHeader;
  readonly lineItems: readonly JournalLineItem[];
  readonly postingDate: DateString;
  readonly reference: string;
  readonly correlationId: CorrelationId;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
}

/** Line result from posting */
export interface LineResult {
  readonly lineNumber: number;
  readonly accountNumber: AccountNumber;
  readonly postedAmount: MonetaryAmount;
  readonly status: LinePostingStatus;
  readonly message?: string;
}

/** Line posting status */
export type LinePostingStatus = 'POSTED' | 'FAILED' | 'SKIPPED';

/** Posting status */
export type PostingStatus = 'COMPLETED' | 'PARTIAL' | 'FAILED';

/** Post Journal Entry output */
export interface PostJournalEntryOutput {
  readonly documentNumber: DocumentNumber;
  readonly postingStatus: PostingStatus;
  readonly lineResults: readonly LineResult[];
  readonly fiscalYear: FiscalYear;
  readonly fiscalPeriod: FiscalPeriod;
  readonly postingTimestamp: Timestamp;
}

/** Post Journal Entry error types */
export type PostJournalEntryError =
  | UnbalancedEntryError
  | ClosedPeriodError
  | InvalidAccountError
  | DuplicateDocumentError;

/** Unbalanced entry error */
export interface UnbalancedEntryError extends ValidationError {
  readonly errorCode: 'GL_UNBALANCED_ENTRY';
  readonly debitTotal: MonetaryAmount;
  readonly creditTotal: MonetaryAmount;
  readonly difference: MonetaryAmount;
}

/** Closed period error */
export interface ClosedPeriodError extends StateError {
  readonly errorCode: 'GL_CLOSED_PERIOD';
  readonly fiscalYear: FiscalYear;
  readonly fiscalPeriod: FiscalPeriod;
  readonly periodStatus: string;
}

/** Invalid account error */
export interface InvalidAccountError extends ValidationError {
  readonly errorCode: 'GL_INVALID_ACCOUNT';
  readonly accountNumber: AccountNumber;
  readonly reason: string;
}

/** Duplicate document error */
export interface DuplicateDocumentError extends ValidationError {
  readonly errorCode: 'GL_DUPLICATE_DOCUMENT';
  readonly existingDocumentNumber: DocumentNumber;
}

/** Post Journal Entry contract */
export interface PostJournalEntryContract {
  /** Contract identifier */
  readonly contractId: 'PostJournalEntry';

  /** Surface identifier */
  readonly surface: typeof GENERAL_LEDGER_SURFACE;

  /** Contract version */
  readonly version: typeof GENERAL_LEDGER_VERSION;

  /** Input type */
  readonly input: PostJournalEntryInput;

  /** Output type */
  readonly output: PostJournalEntryOutput;

  /** Preconditions that must hold before execution */
  readonly preconditions: PostJournalEntryPreconditions;

  /** Postconditions that must hold after successful execution */
  readonly postconditions: PostJournalEntryPostconditions;

  /** State transitions triggered by this operation */
  readonly stateTransitions: PostJournalEntryStateTransitions;

  /** Observable events emitted during execution */
  readonly observableEvents: PostJournalEntryEvents;

  /** Possible error types */
  readonly errorTypes: PostJournalEntryError;
}

/** Post Journal Entry preconditions */
export interface PostJournalEntryPreconditions {
  /** Entry must balance (debits = credits) */
  entryMustBalance(input: PostJournalEntryInput): boolean;

  /** Fiscal period must be open */
  fiscalPeriodMustBeOpen(postingDate: DateString, companyCode: CompanyCode): boolean;

  /** All accounts must exist and be valid */
  allAccountsMustBeValid(lineItems: readonly JournalLineItem[], companyCode: CompanyCode): boolean;

  /** User must have posting authorization */
  userMustHavePostingAuth(userId: UserId, companyCode: CompanyCode): boolean;

  /** At least two line items required */
  minimumTwoLineItems(lineItems: readonly JournalLineItem[]): boolean;
}

/** Post Journal Entry postconditions */
export interface PostJournalEntryPostconditions {
  /** Document number assigned */
  documentNumberAssigned(output: PostJournalEntryOutput): boolean;

  /** All account balances updated */
  accountBalancesUpdated(lineItems: readonly JournalLineItem[]): boolean;

  /** Audit trail created */
  auditTrailCreated(documentNumber: DocumentNumber): boolean;

  /** State is POSTED */
  stateIsPosted(documentNumber: DocumentNumber): boolean;
}

/** Post Journal Entry state transitions */
export interface PostJournalEntryStateTransitions {
  /** Journal state: DRAFT -> POSTED */
  readonly journalState: {
    readonly from: typeof JournalState.DRAFT;
    readonly to: typeof JournalState.POSTED;
    readonly trigger: 'POST';
  };

  /** Document lifecycle: CREATED -> POSTED */
  readonly documentLifecycle: {
    readonly from: typeof DocumentLifecycleState.CREATED;
    readonly to: typeof DocumentLifecycleState.POSTED;
    readonly trigger: 'SUCCESSFUL_POSTING';
  };
}

/** Post Journal Entry observable events */
export interface PostJournalEntryEvents {
  /** Events emitted on operation received */
  readonly onReceived: JournalEntryReceivedEvent;

  /** Events emitted after validation */
  readonly onValidationCompleted: ValidationCompletedEvent;

  /** Events emitted when posting attempted */
  readonly onPostingAttempted: PostingAttemptedEvent;

  /** Events emitted on successful posting */
  readonly onPostingCompleted: PostingCompletedEvent;

  /** Events emitted on posting failure */
  readonly onPostingFailed: PostingFailedEvent;
}

/** Precondition predicates */
export const PostJournalEntryPreconditionPredicates: PostJournalEntryPreconditions = {
  entryMustBalance(input: PostJournalEntryInput): boolean {
    let debitTotal = 0;
    let creditTotal = 0;

    for (const line of input.lineItems) {
      if (line.debitCredit === 'DEBIT') {
        debitTotal += line.amount.value;
      } else {
        creditTotal += line.amount.value;
      }
    }

    // Allow for floating point precision tolerance
    return Math.abs(debitTotal - creditTotal) < 0.01;
  },

  fiscalPeriodMustBeOpen(_postingDate: DateString, _companyCode: CompanyCode): boolean {
    // Binding-specific implementation
    return true;
  },

  allAccountsMustBeValid(_lineItems: readonly JournalLineItem[], _companyCode: CompanyCode): boolean {
    // Binding-specific implementation
    return true;
  },

  userMustHavePostingAuth(_userId: UserId, _companyCode: CompanyCode): boolean {
    // Binding-specific implementation
    return true;
  },

  minimumTwoLineItems(lineItems: readonly JournalLineItem[]): boolean {
    return lineItems.length >= 2;
  }
};

/** Postcondition predicates */
export const PostJournalEntryPostconditionPredicates: PostJournalEntryPostconditions = {
  documentNumberAssigned(output: PostJournalEntryOutput): boolean {
    return output.documentNumber !== undefined && output.documentNumber.length > 0;
  },

  accountBalancesUpdated(_lineItems: readonly JournalLineItem[]): boolean {
    // Verified by binding
    return true;
  },

  auditTrailCreated(_documentNumber: DocumentNumber): boolean {
    // Verified by binding
    return true;
  },

  stateIsPosted(_documentNumber: DocumentNumber): boolean {
    // Verified by binding
    return true;
  }
};

// ============================================================================
// GET ACCOUNT BALANCE CONTRACT
// ============================================================================

/** Balance type */
export type BalanceType =
  | 'PERIOD'      // Balance for specific period
  | 'CUMULATIVE'  // Year-to-date balance
  | 'CARRIED';    // Balance carried forward

/** Get Account Balance input */
export interface GetAccountBalanceInput {
  readonly accountNumber: AccountNumber;
  readonly companyCode: CompanyCode;
  readonly fiscalYear: FiscalYear;
  readonly period: FiscalPeriod;
  readonly balanceType: BalanceType;
  readonly correlationId: CorrelationId;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
}

/** Get Account Balance output */
export interface GetAccountBalanceOutput {
  readonly accountNumber: AccountNumber;
  readonly balance: MonetaryAmount;
  readonly currency: CurrencyCode;
  readonly lastPostingDate: DateString | null;
  readonly transactionCount: number;
  readonly debitTotal: MonetaryAmount;
  readonly creditTotal: MonetaryAmount;
  readonly fiscalYear: FiscalYear;
  readonly fiscalPeriod: FiscalPeriod;
}

/** Get Account Balance error types */
export type GetAccountBalanceError =
  | AccountNotFoundError
  | InvalidPeriodError;

/** Account not found error */
export interface AccountNotFoundError extends ValidationError {
  readonly errorCode: 'GL_ACCOUNT_NOT_FOUND';
  readonly accountNumber: AccountNumber;
  readonly companyCode: CompanyCode;
}

/** Invalid period error */
export interface InvalidPeriodError extends ValidationError {
  readonly errorCode: 'GL_INVALID_PERIOD';
  readonly fiscalYear: FiscalYear;
  readonly fiscalPeriod: FiscalPeriod;
}

/** Get Account Balance contract */
export interface GetAccountBalanceContract {
  /** Contract identifier */
  readonly contractId: 'GetAccountBalance';

  /** Surface identifier */
  readonly surface: typeof GENERAL_LEDGER_SURFACE;

  /** Contract version */
  readonly version: typeof GENERAL_LEDGER_VERSION;

  /** Input type */
  readonly input: GetAccountBalanceInput;

  /** Output type */
  readonly output: GetAccountBalanceOutput;

  /** Preconditions */
  readonly preconditions: GetAccountBalancePreconditions;

  /** Postconditions */
  readonly postconditions: GetAccountBalancePostconditions;

  /** State transitions (none for query) */
  readonly stateTransitions: null;

  /** Observable events */
  readonly observableEvents: GetAccountBalanceEvents;

  /** Possible error types */
  readonly errorTypes: GetAccountBalanceError;
}

/** Get Account Balance preconditions */
export interface GetAccountBalancePreconditions {
  /** Account must exist */
  accountMustExist(accountNumber: AccountNumber, companyCode: CompanyCode): boolean;

  /** Period must be valid */
  periodMustBeValid(fiscalYear: FiscalYear, period: FiscalPeriod): boolean;

  /** User must have read authorization */
  userMustHaveReadAuth(userId: UserId, accountNumber: AccountNumber): boolean;
}

/** Get Account Balance postconditions */
export interface GetAccountBalancePostconditions {
  /** Balance returned matches account records */
  balanceMatchesRecords(output: GetAccountBalanceOutput): boolean;

  /** Debit minus credit equals balance */
  debitCreditEqualsBalance(output: GetAccountBalanceOutput): boolean;
}

/** Get Account Balance observable events */
export interface GetAccountBalanceEvents {
  /** Events emitted on query received */
  readonly onReceived: BalanceQueryReceivedEvent;

  /** Events emitted on query completed */
  readonly onCompleted: BalanceQueryCompletedEvent;
}

/** Get Account Balance precondition predicates */
export const GetAccountBalancePreconditionPredicates: GetAccountBalancePreconditions = {
  accountMustExist(_accountNumber: AccountNumber, _companyCode: CompanyCode): boolean {
    // Binding-specific implementation
    return true;
  },

  periodMustBeValid(fiscalYear: FiscalYear, period: FiscalPeriod): boolean {
    return fiscalYear > 1900 && fiscalYear < 2100 && period >= 1 && period <= 16;
  },

  userMustHaveReadAuth(_userId: UserId, _accountNumber: AccountNumber): boolean {
    // Binding-specific implementation
    return true;
  }
};

/** Get Account Balance postcondition predicates */
export const GetAccountBalancePostconditionPredicates: GetAccountBalancePostconditions = {
  balanceMatchesRecords(_output: GetAccountBalanceOutput): boolean {
    // Verified by binding
    return true;
  },

  debitCreditEqualsBalance(output: GetAccountBalanceOutput): boolean {
    const calculatedBalance = output.debitTotal.value - output.creditTotal.value;
    return Math.abs(calculatedBalance - output.balance.value) < 0.01;
  }
};

// ============================================================================
// GENERAL LEDGER SURFACE INTERFACE
// ============================================================================

/** General Ledger Surface interface */
export interface GeneralLedgerSurface {
  /** Surface identifier */
  readonly surfaceId: typeof GENERAL_LEDGER_SURFACE;

  /** Surface version */
  readonly version: typeof GENERAL_LEDGER_VERSION;

  /** Post a journal entry */
  postJournalEntry(
    input: PostJournalEntryInput
  ): Promise<Result<PostJournalEntryOutput, PostJournalEntryError>>;

  /** Get account balance */
  getAccountBalance(
    input: GetAccountBalanceInput
  ): Promise<Result<GetAccountBalanceOutput, GetAccountBalanceError>>;
}

// ============================================================================
// CONTRACT REGISTRY
// ============================================================================

/** All contracts in the General Ledger surface */
export type GeneralLedgerContracts =
  | PostJournalEntryContract
  | GetAccountBalanceContract;

/** Contract registry for General Ledger surface */
export const GeneralLedgerContractRegistry = {
  PostJournalEntry: {
    contractId: 'PostJournalEntry',
    surface: GENERAL_LEDGER_SURFACE,
    version: GENERAL_LEDGER_VERSION,
    preconditions: PostJournalEntryPreconditionPredicates,
    postconditions: PostJournalEntryPostconditionPredicates
  },
  GetAccountBalance: {
    contractId: 'GetAccountBalance',
    surface: GENERAL_LEDGER_SURFACE,
    version: GENERAL_LEDGER_VERSION,
    preconditions: GetAccountBalancePreconditionPredicates,
    postconditions: GetAccountBalancePostconditionPredicates
  }
} as const;
