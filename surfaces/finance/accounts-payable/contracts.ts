/**
 * Accounts Payable Surface Contracts
 *
 * Vendor-neutral behavioral contracts for accounts payable operations.
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
  SupplierId,
  PONumber,
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

/** Accounts Payable Surface identifier */
export const ACCOUNTS_PAYABLE_SURFACE = 'finance.accounts-payable' as const;

/** Surface version */
export const ACCOUNTS_PAYABLE_VERSION = '1.0.0' as const;

// ============================================================================
// STATE DEFINITIONS
// ============================================================================

/** Invoice states */
export const InvoiceState = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  POSTED: 'POSTED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED'
} as const;

export type InvoiceState = typeof InvoiceState[keyof typeof InvoiceState];

/** Payment states */
export const PaymentState = {
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REVERSED: 'REVERSED'
} as const;

export type PaymentState = typeof PaymentState[keyof typeof PaymentState];

// ============================================================================
// CREATE INVOICE CONTRACT
// ============================================================================

/** Invoice line item */
export interface InvoiceLineItem {
  readonly lineNumber: number;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: MonetaryAmount;
  readonly totalAmount: MonetaryAmount;
  readonly accountNumber: AccountNumber;
  readonly costCenter?: string;
  readonly purchaseOrderNumber?: PONumber;
  readonly purchaseOrderLine?: number;
  readonly taxCode?: string;
}

/** Invoice header */
export interface InvoiceHeader {
  readonly supplierId: SupplierId;
  readonly supplierInvoiceNumber: string;
  readonly invoiceDate: DateString;
  readonly dueDate: DateString;
  readonly paymentTerms: PaymentTerms;
  readonly companyCode: CompanyCode;
  readonly currency: CurrencyCode;
  readonly description?: string;
}

/** Create Invoice input */
export interface CreateInvoiceInput {
  readonly header: InvoiceHeader;
  readonly lineItems: readonly InvoiceLineItem[];
  readonly taxAmounts: readonly TaxAmount[];
  readonly attachments?: readonly AttachmentReference[];
  readonly correlationId: CorrelationId;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
}

/** Attachment reference */
export interface AttachmentReference {
  readonly attachmentId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
}

/** Create Invoice output */
export interface CreateInvoiceOutput {
  readonly invoiceNumber: InvoiceNumber;
  readonly documentNumber: DocumentNumber;
  readonly status: InvoiceState;
  readonly totalAmount: MonetaryAmount;
  readonly taxTotal: MonetaryAmount;
  readonly dueDate: DateString;
  readonly createdAt: Timestamp;
}

/** Create Invoice error types */
export type CreateInvoiceError =
  | DuplicateInvoiceError
  | InvalidSupplierError
  | InvalidPOMatchError
  | ClosedPeriodError;

/** Duplicate invoice error */
export interface DuplicateInvoiceError extends ValidationError {
  readonly errorCode: 'AP_DUPLICATE_INVOICE';
  readonly supplierId: SupplierId;
  readonly supplierInvoiceNumber: string;
  readonly existingInvoiceNumber: InvoiceNumber;
}

/** Invalid supplier error */
export interface InvalidSupplierError extends ValidationError {
  readonly errorCode: 'AP_INVALID_SUPPLIER';
  readonly supplierId: SupplierId;
  readonly reason: string;
}

/** Invalid PO match error */
export interface InvalidPOMatchError extends ValidationError {
  readonly errorCode: 'AP_INVALID_PO_MATCH';
  readonly purchaseOrderNumber: PONumber;
  readonly reason: string;
}

/** Closed period error */
export interface ClosedPeriodError extends StateError {
  readonly errorCode: 'AP_CLOSED_PERIOD';
  readonly fiscalYear: FiscalYear;
  readonly fiscalPeriod: FiscalPeriod;
}

/** Create Invoice preconditions */
export interface CreateInvoicePreconditions {
  /** Supplier must exist and be active */
  supplierMustBeActive(supplierId: SupplierId): boolean;

  /** Invoice must not be duplicate */
  invoiceMustNotBeDuplicate(supplierId: SupplierId, supplierInvoiceNumber: string): boolean;

  /** Fiscal period must be open */
  fiscalPeriodMustBeOpen(invoiceDate: DateString, companyCode: CompanyCode): boolean;

  /** PO match must be valid (if applicable) */
  poMatchMustBeValid(lineItems: readonly InvoiceLineItem[]): boolean;

  /** User must have create authorization */
  userMustHaveCreateAuth(userId: UserId, companyCode: CompanyCode): boolean;
}

/** Create Invoice postconditions */
export interface CreateInvoicePostconditions {
  /** Invoice number assigned */
  invoiceNumberAssigned(output: CreateInvoiceOutput): boolean;

  /** Total amount equals line items plus tax */
  totalAmountCorrect(output: CreateInvoiceOutput): boolean;

  /** State is DRAFT or SUBMITTED */
  stateIsValid(output: CreateInvoiceOutput): boolean;
}

/** Create Invoice contract */
export interface CreateInvoiceContract {
  readonly contractId: 'CreateInvoice';
  readonly surface: typeof ACCOUNTS_PAYABLE_SURFACE;
  readonly version: typeof ACCOUNTS_PAYABLE_VERSION;
  readonly input: CreateInvoiceInput;
  readonly output: CreateInvoiceOutput;
  readonly preconditions: CreateInvoicePreconditions;
  readonly postconditions: CreateInvoicePostconditions;
  readonly stateTransitions: {
    readonly invoiceState: {
      readonly from: null;
      readonly to: typeof InvoiceState.DRAFT;
      readonly trigger: 'CREATE';
    };
  };
  readonly observableEvents: {
    readonly onReceived: 'AP.INVOICE_CREATE_RECEIVED';
    readonly onValidated: 'AP.INVOICE_VALIDATED';
    readonly onCreated: 'AP.INVOICE_CREATED';
  };
  readonly errorTypes: CreateInvoiceError;
}

/** Precondition predicates */
export const CreateInvoicePreconditionPredicates: CreateInvoicePreconditions = {
  supplierMustBeActive(_supplierId: SupplierId): boolean {
    // Binding-specific implementation
    return true;
  },

  invoiceMustNotBeDuplicate(_supplierId: SupplierId, _supplierInvoiceNumber: string): boolean {
    // Binding-specific implementation
    return true;
  },

  fiscalPeriodMustBeOpen(_invoiceDate: DateString, _companyCode: CompanyCode): boolean {
    // Binding-specific implementation
    return true;
  },

  poMatchMustBeValid(_lineItems: readonly InvoiceLineItem[]): boolean {
    // Binding-specific implementation
    return true;
  },

  userMustHaveCreateAuth(_userId: UserId, _companyCode: CompanyCode): boolean {
    // Binding-specific implementation
    return true;
  }
};

/** Postcondition predicates */
export const CreateInvoicePostconditionPredicates: CreateInvoicePostconditions = {
  invoiceNumberAssigned(output: CreateInvoiceOutput): boolean {
    return output.invoiceNumber !== undefined && output.invoiceNumber.length > 0;
  },

  totalAmountCorrect(_output: CreateInvoiceOutput): boolean {
    // Verified by binding
    return true;
  },

  stateIsValid(output: CreateInvoiceOutput): boolean {
    return output.status === InvoiceState.DRAFT || output.status === InvoiceState.SUBMITTED;
  }
};

// ============================================================================
// PROCESS PAYMENT CONTRACT
// ============================================================================

/** Payment method */
export type PaymentMethod =
  | 'CHECK'
  | 'ACH'
  | 'WIRE'
  | 'CREDIT_CARD'
  | 'VIRTUAL_CARD';

/** Payment input */
export interface ProcessPaymentInput {
  readonly invoiceNumber: InvoiceNumber;
  readonly paymentAmount: MonetaryAmount;
  readonly paymentMethod: PaymentMethod;
  readonly paymentDate: DateString;
  readonly bankAccountId: string;
  readonly reference?: string;
  readonly correlationId: CorrelationId;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
}

/** Payment output */
export interface ProcessPaymentOutput {
  readonly paymentId: string;
  readonly invoiceNumber: InvoiceNumber;
  readonly amountPaid: MonetaryAmount;
  readonly remainingBalance: MonetaryAmount;
  readonly paymentStatus: PaymentState;
  readonly invoiceStatus: InvoiceState;
  readonly paymentReference: string;
  readonly processedAt: Timestamp;
}

/** Process Payment error types */
export type ProcessPaymentError =
  | InvoiceNotFoundError
  | InvoiceNotPayableError
  | InsufficientFundsError
  | PaymentExceedsBalanceError;

/** Invoice not found error */
export interface InvoiceNotFoundError extends ValidationError {
  readonly errorCode: 'AP_INVOICE_NOT_FOUND';
  readonly invoiceNumber: InvoiceNumber;
}

/** Invoice not payable error */
export interface InvoiceNotPayableError extends StateError {
  readonly errorCode: 'AP_INVOICE_NOT_PAYABLE';
  readonly invoiceNumber: InvoiceNumber;
  readonly currentState: InvoiceState;
}

/** Insufficient funds error */
export interface InsufficientFundsError extends ValidationError {
  readonly errorCode: 'AP_INSUFFICIENT_FUNDS';
  readonly bankAccountId: string;
  readonly requestedAmount: MonetaryAmount;
  readonly availableAmount: MonetaryAmount;
}

/** Payment exceeds balance error */
export interface PaymentExceedsBalanceError extends ValidationError {
  readonly errorCode: 'AP_PAYMENT_EXCEEDS_BALANCE';
  readonly invoiceNumber: InvoiceNumber;
  readonly paymentAmount: MonetaryAmount;
  readonly invoiceBalance: MonetaryAmount;
}

/** Process Payment preconditions */
export interface ProcessPaymentPreconditions {
  /** Invoice must exist */
  invoiceMustExist(invoiceNumber: InvoiceNumber): boolean;

  /** Invoice must be in payable state */
  invoiceMustBePayable(invoiceNumber: InvoiceNumber): boolean;

  /** Payment must not exceed balance */
  paymentMustNotExceedBalance(invoiceNumber: InvoiceNumber, paymentAmount: MonetaryAmount): boolean;

  /** Bank account must have sufficient funds */
  bankAccountMustHaveFunds(bankAccountId: string, paymentAmount: MonetaryAmount): boolean;

  /** User must have payment authorization */
  userMustHavePaymentAuth(userId: UserId, paymentAmount: MonetaryAmount): boolean;
}

/** Process Payment postconditions */
export interface ProcessPaymentPostconditions {
  /** Payment ID assigned */
  paymentIdAssigned(output: ProcessPaymentOutput): boolean;

  /** Invoice balance updated correctly */
  invoiceBalanceUpdated(output: ProcessPaymentOutput): boolean;

  /** Bank account balance reduced */
  bankAccountBalanceReduced(bankAccountId: string, paymentAmount: MonetaryAmount): boolean;
}

/** Process Payment contract */
export interface ProcessPaymentContract {
  readonly contractId: 'ProcessPayment';
  readonly surface: typeof ACCOUNTS_PAYABLE_SURFACE;
  readonly version: typeof ACCOUNTS_PAYABLE_VERSION;
  readonly input: ProcessPaymentInput;
  readonly output: ProcessPaymentOutput;
  readonly preconditions: ProcessPaymentPreconditions;
  readonly postconditions: ProcessPaymentPostconditions;
  readonly stateTransitions: {
    readonly invoiceState: {
      readonly from: typeof InvoiceState.POSTED | typeof InvoiceState.PARTIALLY_PAID;
      readonly to: typeof InvoiceState.PARTIALLY_PAID | typeof InvoiceState.PAID;
      readonly trigger: 'PAYMENT';
    };
    readonly paymentState: {
      readonly from: typeof PaymentState.PENDING;
      readonly to: typeof PaymentState.COMPLETED;
      readonly trigger: 'PROCESS';
    };
  };
  readonly observableEvents: {
    readonly onReceived: 'AP.PAYMENT_RECEIVED';
    readonly onAuthorized: 'AP.PAYMENT_AUTHORIZED';
    readonly onCompleted: 'AP.PAYMENT_COMPLETED';
    readonly onFailed: 'AP.PAYMENT_FAILED';
  };
  readonly errorTypes: ProcessPaymentError;
}

// ============================================================================
// GET VENDOR BALANCE CONTRACT
// ============================================================================

/** Get Vendor Balance input */
export interface GetVendorBalanceInput {
  readonly supplierId: SupplierId;
  readonly companyCode: CompanyCode;
  readonly asOfDate?: DateString;
  readonly includeUnposted?: boolean;
  readonly correlationId: CorrelationId;
  readonly userId: UserId;
  readonly timestamp: Timestamp;
}

/** Aging bucket */
export interface AgingBucket {
  readonly label: string;
  readonly daysFrom: number;
  readonly daysTo: number | null;
  readonly amount: MonetaryAmount;
  readonly invoiceCount: number;
}

/** Get Vendor Balance output */
export interface GetVendorBalanceOutput {
  readonly supplierId: SupplierId;
  readonly supplierName: string;
  readonly totalBalance: MonetaryAmount;
  readonly currency: CurrencyCode;
  readonly openInvoiceCount: number;
  readonly aging: readonly AgingBucket[];
  readonly lastPaymentDate: DateString | null;
  readonly lastPaymentAmount: MonetaryAmount | null;
  readonly creditLimit: MonetaryAmount | null;
  readonly asOfDate: DateString;
}

/** Get Vendor Balance error types */
export type GetVendorBalanceError = SupplierNotFoundError;

/** Supplier not found error */
export interface SupplierNotFoundError extends ValidationError {
  readonly errorCode: 'AP_SUPPLIER_NOT_FOUND';
  readonly supplierId: SupplierId;
  readonly companyCode: CompanyCode;
}

/** Get Vendor Balance contract */
export interface GetVendorBalanceContract {
  readonly contractId: 'GetVendorBalance';
  readonly surface: typeof ACCOUNTS_PAYABLE_SURFACE;
  readonly version: typeof ACCOUNTS_PAYABLE_VERSION;
  readonly input: GetVendorBalanceInput;
  readonly output: GetVendorBalanceOutput;
  readonly preconditions: {
    supplierMustExist(supplierId: SupplierId, companyCode: CompanyCode): boolean;
    userMustHaveReadAuth(userId: UserId, supplierId: SupplierId): boolean;
  };
  readonly postconditions: {
    balanceMatchesRecords(output: GetVendorBalanceOutput): boolean;
    agingTotalMatchesBalance(output: GetVendorBalanceOutput): boolean;
  };
  readonly stateTransitions: null;
  readonly observableEvents: {
    readonly onReceived: 'AP.BALANCE_QUERY_RECEIVED';
    readonly onCompleted: 'AP.BALANCE_QUERY_COMPLETED';
  };
  readonly errorTypes: GetVendorBalanceError;
}

// ============================================================================
// ACCOUNTS PAYABLE SURFACE INTERFACE
// ============================================================================

/** Accounts Payable Surface interface */
export interface AccountsPayableSurface {
  readonly surfaceId: typeof ACCOUNTS_PAYABLE_SURFACE;
  readonly version: typeof ACCOUNTS_PAYABLE_VERSION;

  /** Create a vendor invoice */
  createInvoice(
    input: CreateInvoiceInput
  ): Promise<Result<CreateInvoiceOutput, CreateInvoiceError>>;

  /** Process a payment */
  processPayment(
    input: ProcessPaymentInput
  ): Promise<Result<ProcessPaymentOutput, ProcessPaymentError>>;

  /** Get vendor balance */
  getVendorBalance(
    input: GetVendorBalanceInput
  ): Promise<Result<GetVendorBalanceOutput, GetVendorBalanceError>>;
}

// ============================================================================
// CONTRACT REGISTRY
// ============================================================================

/** All contracts in the Accounts Payable surface */
export type AccountsPayableContracts =
  | CreateInvoiceContract
  | ProcessPaymentContract
  | GetVendorBalanceContract;

/** Contract registry */
export const AccountsPayableContractRegistry = {
  CreateInvoice: {
    contractId: 'CreateInvoice',
    surface: ACCOUNTS_PAYABLE_SURFACE,
    version: ACCOUNTS_PAYABLE_VERSION
  },
  ProcessPayment: {
    contractId: 'ProcessPayment',
    surface: ACCOUNTS_PAYABLE_SURFACE,
    version: ACCOUNTS_PAYABLE_VERSION
  },
  GetVendorBalance: {
    contractId: 'GetVendorBalance',
    surface: ACCOUNTS_PAYABLE_SURFACE,
    version: ACCOUNTS_PAYABLE_VERSION
  }
} as const;
