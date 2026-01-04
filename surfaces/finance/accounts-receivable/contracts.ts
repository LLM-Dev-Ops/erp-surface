/**
 * Accounts Receivable Surface Contracts
 *
 * Vendor-neutral behavioral contracts for accounts receivable operations.
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
  CustomerId,
  SONumber,
  InvoiceNumber,
  PaymentTerms,
  TaxAmount,
  Result,
  SurfaceError,
  ValidationError,
  StateError
} from '../../../common';

// ============================================================================
// SURFACE DEFINITION
// ============================================================================

/** Accounts Receivable Surface identifier */
export const ACCOUNTS_RECEIVABLE_SURFACE = 'finance.accounts-receivable' as const;

/** Surface version */
export const ACCOUNTS_RECEIVABLE_VERSION = '1.0.0' as const;

// ============================================================================
// STATE DEFINITIONS
// ============================================================================

/** Customer invoice states */
export const CustomerInvoiceState = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  POSTED: 'POSTED',
  SENT: 'SENT',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  WRITTEN_OFF: 'WRITTEN_OFF',
  CANCELLED: 'CANCELLED'
} as const;

export type CustomerInvoiceState = typeof CustomerInvoiceState[keyof typeof CustomerInvoiceState];

/** Customer payment states */
export const CustomerPaymentState = {
  PENDING: 'PENDING',
  RECEIVED: 'RECEIVED',
  APPLIED: 'APPLIED',
  CLEARED: 'CLEARED',
  BOUNCED: 'BOUNCED',
  REVERSED: 'REVERSED'
} as const;

export type CustomerPaymentState = typeof CustomerPaymentState[keyof typeof CustomerPaymentState];

// ============================================================================
// CREATE CUSTOMER INVOICE CONTRACT
// ============================================================================

/** Customer invoice line item */
export interface CustomerInvoiceLineItem {
  readonly lineNumber: number;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: MonetaryAmount;
  readonly totalAmount: MonetaryAmount;
  readonly revenueAccountNumber: AccountNumber;
  readonly costCenter?: string;
  readonly profitCenter?: string;
  readonly salesOrderNumber?: SONumber;
  readonly salesOrderLine?: number;
  readonly taxCode?: string;
  readonly discountPercent?: number;
}

/** Customer invoice header */
export interface CustomerInvoiceHeader {
  readonly customerId: CustomerId;
  readonly invoiceDate: DateString;
  readonly dueDate: DateString;
  readonly paymentTerms: PaymentTerms;
  readonly companyCode: CompanyCode;
  readonly currency: CurrencyCode;
  readonly billingAddress: Address;
  readonly shippingAddress?: Address;
  readonly description?: string;
  readonly customerPONumber?: string;
}

/** Address structure */
export interface Address {
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;
}

/** Create Customer Invoice input */
export interface CreateCustomerInvoiceInput {
  readonly header: CustomerInvoiceHeader;
  readonly lineItems: readonly CustomerInvoiceLineItem[];
  readonly taxAmounts: readonly TaxAmount[];
  readonly notes?: string;
  readonly correlationId: CorrelationId;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
}

/** Create Customer Invoice output */
export interface CreateCustomerInvoiceOutput {
  readonly invoiceNumber: InvoiceNumber;
  readonly documentNumber: DocumentNumber;
  readonly status: CustomerInvoiceState;
  readonly subtotal: MonetaryAmount;
  readonly taxTotal: MonetaryAmount;
  readonly totalAmount: MonetaryAmount;
  readonly dueDate: DateString;
  readonly createdAt: Timestamp;
}

/** Create Customer Invoice error types */
export type CreateCustomerInvoiceError =
  | InvalidCustomerError
  | CustomerCreditExceededError
  | InvalidSOMatchError
  | ARClosedPeriodError;

/** Invalid customer error */
export interface InvalidCustomerError extends ValidationError {
  readonly errorCode: 'AR_INVALID_CUSTOMER';
  readonly customerId: CustomerId;
  readonly reason: string;
}

/** Customer credit exceeded error */
export interface CustomerCreditExceededError extends ValidationError {
  readonly errorCode: 'AR_CREDIT_EXCEEDED';
  readonly customerId: CustomerId;
  readonly creditLimit: MonetaryAmount;
  readonly currentBalance: MonetaryAmount;
  readonly invoiceAmount: MonetaryAmount;
}

/** Invalid SO match error */
export interface InvalidSOMatchError extends ValidationError {
  readonly errorCode: 'AR_INVALID_SO_MATCH';
  readonly salesOrderNumber: SONumber;
  readonly reason: string;
}

/** AR Closed period error */
export interface ARClosedPeriodError extends StateError {
  readonly errorCode: 'AR_CLOSED_PERIOD';
  readonly fiscalYear: FiscalYear;
  readonly fiscalPeriod: FiscalPeriod;
}

/** Create Customer Invoice preconditions */
export interface CreateCustomerInvoicePreconditions {
  /** Customer must exist and be active */
  customerMustBeActive(customerId: CustomerId): boolean;

  /** Customer credit limit must not be exceeded */
  creditLimitMustNotBeExceeded(
    customerId: CustomerId,
    invoiceAmount: MonetaryAmount
  ): boolean;

  /** Fiscal period must be open */
  fiscalPeriodMustBeOpen(invoiceDate: DateString, companyCode: CompanyCode): boolean;

  /** SO match must be valid (if applicable) */
  soMatchMustBeValid(lineItems: readonly CustomerInvoiceLineItem[]): boolean;

  /** User must have create authorization */
  userMustHaveCreateAuth(userId: UserId, companyCode: CompanyCode): boolean;
}

/** Create Customer Invoice postconditions */
export interface CreateCustomerInvoicePostconditions {
  /** Invoice number assigned */
  invoiceNumberAssigned(output: CreateCustomerInvoiceOutput): boolean;

  /** Total equals subtotal plus tax */
  totalAmountCorrect(output: CreateCustomerInvoiceOutput): boolean;

  /** State is DRAFT */
  stateIsDraft(output: CreateCustomerInvoiceOutput): boolean;

  /** Customer balance updated */
  customerBalanceUpdated(customerId: CustomerId, amount: MonetaryAmount): boolean;
}

/** Create Customer Invoice contract */
export interface CreateCustomerInvoiceContract {
  readonly contractId: 'CreateCustomerInvoice';
  readonly surface: typeof ACCOUNTS_RECEIVABLE_SURFACE;
  readonly version: typeof ACCOUNTS_RECEIVABLE_VERSION;
  readonly input: CreateCustomerInvoiceInput;
  readonly output: CreateCustomerInvoiceOutput;
  readonly preconditions: CreateCustomerInvoicePreconditions;
  readonly postconditions: CreateCustomerInvoicePostconditions;
  readonly stateTransitions: {
    readonly invoiceState: {
      readonly from: null;
      readonly to: typeof CustomerInvoiceState.DRAFT;
      readonly trigger: 'CREATE';
    };
  };
  readonly observableEvents: {
    readonly onReceived: 'AR.INVOICE_CREATE_RECEIVED';
    readonly onValidated: 'AR.INVOICE_VALIDATED';
    readonly onCreated: 'AR.INVOICE_CREATED';
  };
  readonly errorTypes: CreateCustomerInvoiceError;
}

/** Precondition predicates */
export const CreateCustomerInvoicePreconditionPredicates: CreateCustomerInvoicePreconditions = {
  customerMustBeActive(_customerId: CustomerId): boolean {
    return true;
  },

  creditLimitMustNotBeExceeded(
    _customerId: CustomerId,
    _invoiceAmount: MonetaryAmount
  ): boolean {
    return true;
  },

  fiscalPeriodMustBeOpen(_invoiceDate: DateString, _companyCode: CompanyCode): boolean {
    return true;
  },

  soMatchMustBeValid(_lineItems: readonly CustomerInvoiceLineItem[]): boolean {
    return true;
  },

  userMustHaveCreateAuth(_userId: UserId, _companyCode: CompanyCode): boolean {
    return true;
  }
};

// ============================================================================
// RECORD PAYMENT CONTRACT
// ============================================================================

/** Payment source */
export type PaymentSource =
  | 'CHECK'
  | 'ACH'
  | 'WIRE'
  | 'CREDIT_CARD'
  | 'CASH'
  | 'LOCKBOX';

/** Payment application */
export interface PaymentApplication {
  readonly invoiceNumber: InvoiceNumber;
  readonly appliedAmount: MonetaryAmount;
  readonly discountTaken: MonetaryAmount;
  readonly writeOffAmount: MonetaryAmount;
}

/** Record Payment input */
export interface RecordPaymentInput {
  readonly customerId: CustomerId;
  readonly paymentAmount: MonetaryAmount;
  readonly paymentSource: PaymentSource;
  readonly paymentDate: DateString;
  readonly reference: string;
  readonly bankAccountId: string;
  readonly applications: readonly PaymentApplication[];
  readonly correlationId: CorrelationId;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
}

/** Record Payment output */
export interface RecordPaymentOutput {
  readonly paymentId: string;
  readonly receiptNumber: string;
  readonly customerId: CustomerId;
  readonly totalReceived: MonetaryAmount;
  readonly totalApplied: MonetaryAmount;
  readonly unappliedAmount: MonetaryAmount;
  readonly paymentStatus: CustomerPaymentState;
  readonly applicationResults: readonly PaymentApplicationResult[];
  readonly processedAt: Timestamp;
}

/** Payment application result */
export interface PaymentApplicationResult {
  readonly invoiceNumber: InvoiceNumber;
  readonly appliedAmount: MonetaryAmount;
  readonly invoiceStatus: CustomerInvoiceState;
  readonly remainingBalance: MonetaryAmount;
}

/** Record Payment error types */
export type RecordPaymentError =
  | CustomerNotFoundError
  | InvoiceNotFoundError
  | OverPaymentError
  | InvalidApplicationError;

/** Customer not found error */
export interface CustomerNotFoundError extends ValidationError {
  readonly errorCode: 'AR_CUSTOMER_NOT_FOUND';
  readonly customerId: CustomerId;
}

/** Invoice not found error */
export interface InvoiceNotFoundError extends ValidationError {
  readonly errorCode: 'AR_INVOICE_NOT_FOUND';
  readonly invoiceNumber: InvoiceNumber;
}

/** Over payment error */
export interface OverPaymentError extends ValidationError {
  readonly errorCode: 'AR_OVER_PAYMENT';
  readonly invoiceNumber: InvoiceNumber;
  readonly invoiceBalance: MonetaryAmount;
  readonly paymentAmount: MonetaryAmount;
}

/** Invalid application error */
export interface InvalidApplicationError extends ValidationError {
  readonly errorCode: 'AR_INVALID_APPLICATION';
  readonly reason: string;
  readonly totalPayment: MonetaryAmount;
  readonly totalApplications: MonetaryAmount;
}

/** Record Payment preconditions */
export interface RecordPaymentPreconditions {
  /** Customer must exist */
  customerMustExist(customerId: CustomerId): boolean;

  /** All invoices must exist and be open */
  invoicesMustBeOpen(applications: readonly PaymentApplication[]): boolean;

  /** Application amounts must not exceed invoice balances */
  applicationsMustNotExceedBalances(applications: readonly PaymentApplication[]): boolean;

  /** Total applications must equal payment amount */
  applicationsMustBalance(paymentAmount: MonetaryAmount, applications: readonly PaymentApplication[]): boolean;

  /** User must have payment recording authorization */
  userMustHavePaymentAuth(userId: UserId, paymentAmount: MonetaryAmount): boolean;
}

/** Record Payment postconditions */
export interface RecordPaymentPostconditions {
  /** Payment ID assigned */
  paymentIdAssigned(output: RecordPaymentOutput): boolean;

  /** Invoice balances updated correctly */
  invoiceBalancesUpdated(output: RecordPaymentOutput): boolean;

  /** Bank deposit recorded */
  bankDepositRecorded(bankAccountId: string, paymentAmount: MonetaryAmount): boolean;

  /** Customer balance reduced */
  customerBalanceReduced(customerId: CustomerId, appliedAmount: MonetaryAmount): boolean;
}

/** Record Payment contract */
export interface RecordPaymentContract {
  readonly contractId: 'RecordPayment';
  readonly surface: typeof ACCOUNTS_RECEIVABLE_SURFACE;
  readonly version: typeof ACCOUNTS_RECEIVABLE_VERSION;
  readonly input: RecordPaymentInput;
  readonly output: RecordPaymentOutput;
  readonly preconditions: RecordPaymentPreconditions;
  readonly postconditions: RecordPaymentPostconditions;
  readonly stateTransitions: {
    readonly invoiceState: {
      readonly from: typeof CustomerInvoiceState.POSTED | typeof CustomerInvoiceState.SENT | typeof CustomerInvoiceState.PARTIALLY_PAID;
      readonly to: typeof CustomerInvoiceState.PARTIALLY_PAID | typeof CustomerInvoiceState.PAID;
      readonly trigger: 'PAYMENT_APPLIED';
    };
    readonly paymentState: {
      readonly from: typeof CustomerPaymentState.PENDING;
      readonly to: typeof CustomerPaymentState.APPLIED;
      readonly trigger: 'APPLICATION';
    };
  };
  readonly observableEvents: {
    readonly onReceived: 'AR.PAYMENT_RECEIVED';
    readonly onValidated: 'AR.PAYMENT_VALIDATED';
    readonly onApplied: 'AR.PAYMENT_APPLIED';
    readonly onCompleted: 'AR.PAYMENT_COMPLETED';
  };
  readonly errorTypes: RecordPaymentError;
}

// ============================================================================
// GET CUSTOMER BALANCE CONTRACT
// ============================================================================

/** Get Customer Balance input */
export interface GetCustomerBalanceInput {
  readonly customerId: CustomerId;
  readonly companyCode: CompanyCode;
  readonly asOfDate?: DateString;
  readonly includeDisputed?: boolean;
  readonly correlationId: CorrelationId;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
}

/** AR Aging bucket */
export interface ARAgingBucket {
  readonly label: string;
  readonly daysFrom: number;
  readonly daysTo: number | null;
  readonly amount: MonetaryAmount;
  readonly invoiceCount: number;
}

/** Get Customer Balance output */
export interface GetCustomerBalanceOutput {
  readonly customerId: CustomerId;
  readonly customerName: string;
  readonly totalBalance: MonetaryAmount;
  readonly currency: CurrencyCode;
  readonly openInvoiceCount: number;
  readonly overdueAmount: MonetaryAmount;
  readonly overdueInvoiceCount: number;
  readonly aging: readonly ARAgingBucket[];
  readonly lastPaymentDate: DateString | null;
  readonly lastPaymentAmount: MonetaryAmount | null;
  readonly creditLimit: MonetaryAmount;
  readonly availableCredit: MonetaryAmount;
  readonly asOfDate: DateString;
}

/** Get Customer Balance error types */
export type GetCustomerBalanceError = CustomerBalanceNotFoundError;

/** Customer balance not found error */
export interface CustomerBalanceNotFoundError extends ValidationError {
  readonly errorCode: 'AR_CUSTOMER_BALANCE_NOT_FOUND';
  readonly customerId: CustomerId;
  readonly companyCode: CompanyCode;
}

/** Get Customer Balance contract */
export interface GetCustomerBalanceContract {
  readonly contractId: 'GetCustomerBalance';
  readonly surface: typeof ACCOUNTS_RECEIVABLE_SURFACE;
  readonly version: typeof ACCOUNTS_RECEIVABLE_VERSION;
  readonly input: GetCustomerBalanceInput;
  readonly output: GetCustomerBalanceOutput;
  readonly preconditions: {
    customerMustExist(customerId: CustomerId, companyCode: CompanyCode): boolean;
    userMustHaveReadAuth(userId: UserId, customerId: CustomerId): boolean;
  };
  readonly postconditions: {
    balanceMatchesRecords(output: GetCustomerBalanceOutput): boolean;
    agingTotalMatchesBalance(output: GetCustomerBalanceOutput): boolean;
    availableCreditCorrect(output: GetCustomerBalanceOutput): boolean;
  };
  readonly stateTransitions: null;
  readonly observableEvents: {
    readonly onReceived: 'AR.BALANCE_QUERY_RECEIVED';
    readonly onCompleted: 'AR.BALANCE_QUERY_COMPLETED';
  };
  readonly errorTypes: GetCustomerBalanceError;
}

// ============================================================================
// ACCOUNTS RECEIVABLE SURFACE INTERFACE
// ============================================================================

/** Accounts Receivable Surface interface */
export interface AccountsReceivableSurface {
  readonly surfaceId: typeof ACCOUNTS_RECEIVABLE_SURFACE;
  readonly version: typeof ACCOUNTS_RECEIVABLE_VERSION;

  /** Create a customer invoice */
  createCustomerInvoice(
    input: CreateCustomerInvoiceInput
  ): Promise<Result<CreateCustomerInvoiceOutput, CreateCustomerInvoiceError>>;

  /** Record a customer payment */
  recordPayment(
    input: RecordPaymentInput
  ): Promise<Result<RecordPaymentOutput, RecordPaymentError>>;

  /** Get customer balance */
  getCustomerBalance(
    input: GetCustomerBalanceInput
  ): Promise<Result<GetCustomerBalanceOutput, GetCustomerBalanceError>>;
}

// ============================================================================
// CONTRACT REGISTRY
// ============================================================================

/** All contracts in the Accounts Receivable surface */
export type AccountsReceivableContracts =
  | CreateCustomerInvoiceContract
  | RecordPaymentContract
  | GetCustomerBalanceContract;

/** Contract registry */
export const AccountsReceivableContractRegistry = {
  CreateCustomerInvoice: {
    contractId: 'CreateCustomerInvoice',
    surface: ACCOUNTS_RECEIVABLE_SURFACE,
    version: ACCOUNTS_RECEIVABLE_VERSION
  },
  RecordPayment: {
    contractId: 'RecordPayment',
    surface: ACCOUNTS_RECEIVABLE_SURFACE,
    version: ACCOUNTS_RECEIVABLE_VERSION
  },
  GetCustomerBalance: {
    contractId: 'GetCustomerBalance',
    surface: ACCOUNTS_RECEIVABLE_SURFACE,
    version: ACCOUNTS_RECEIVABLE_VERSION
  }
} as const;
