/**
 * Monetary Types for ERP Surface Contracts
 *
 * Vendor-neutral monetary representations for financial operations.
 * These types are mode-invariant and support deterministic replay.
 */

/** ISO 4217 currency code */
export type CurrencyCode = string;

/** Monetary amount with currency */
export interface MonetaryAmount {
  readonly value: number;
  readonly currency: CurrencyCode;
  readonly precision: number;
}

/** Exchange rate between currencies */
export interface ExchangeRate {
  readonly fromCurrency: CurrencyCode;
  readonly toCurrency: CurrencyCode;
  readonly rate: number;
  readonly effectiveDate: string;
  readonly rateType: RateType;
}

/** Rate type for currency conversion */
export type RateType =
  | 'SPOT'
  | 'AVERAGE'
  | 'CLOSING'
  | 'HISTORICAL';

/** Tax amount with breakdown */
export interface TaxAmount {
  readonly baseAmount: MonetaryAmount;
  readonly taxAmount: MonetaryAmount;
  readonly taxRate: number;
  readonly taxCode: string;
  readonly taxJurisdiction: string;
}

/** Payment terms */
export interface PaymentTerms {
  readonly termCode: string;
  readonly netDays: number;
  readonly discountDays: number;
  readonly discountPercent: number;
  readonly description: string;
}

/** Budget allocation */
export interface BudgetAllocation {
  readonly budgetId: string;
  readonly allocatedAmount: MonetaryAmount;
  readonly consumedAmount: MonetaryAmount;
  readonly availableAmount: MonetaryAmount;
  readonly fiscalYear: number;
  readonly fiscalPeriod: number;
}

/** Factory functions for monetary operations */
export const MonetaryOperations = {
  /** Create a monetary amount */
  create(value: number, currency: CurrencyCode, precision: number = 2): MonetaryAmount {
    return { value, currency, precision };
  },

  /** Add two monetary amounts (must be same currency) */
  add(a: MonetaryAmount, b: MonetaryAmount): MonetaryAmount {
    if (a.currency !== b.currency) {
      throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
    }
    return {
      value: a.value + b.value,
      currency: a.currency,
      precision: Math.max(a.precision, b.precision)
    };
  },

  /** Subtract two monetary amounts (must be same currency) */
  subtract(a: MonetaryAmount, b: MonetaryAmount): MonetaryAmount {
    if (a.currency !== b.currency) {
      throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
    }
    return {
      value: a.value - b.value,
      currency: a.currency,
      precision: Math.max(a.precision, b.precision)
    };
  },

  /** Check if amount is zero */
  isZero(amount: MonetaryAmount): boolean {
    return amount.value === 0;
  },

  /** Check if amount is positive */
  isPositive(amount: MonetaryAmount): boolean {
    return amount.value > 0;
  },

  /** Check if amount is negative */
  isNegative(amount: MonetaryAmount): boolean {
    return amount.value < 0;
  }
};
