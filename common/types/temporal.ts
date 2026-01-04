/**
 * Temporal Types for ERP Surface Contracts
 *
 * Vendor-neutral temporal representations supporting deterministic replay.
 * All timestamps are injectable to ensure reproducibility.
 */

/** ISO 8601 timestamp string */
export type Timestamp = string;

/** ISO 8601 date string (YYYY-MM-DD) */
export type DateString = string;

/** ISO 8601 time string (HH:mm:ss) */
export type TimeString = string;

/** Duration in milliseconds */
export type DurationMs = number;

/** Fiscal year identifier */
export type FiscalYear = number;

/** Fiscal period (1-12 for monthly, 1-4 for quarterly) */
export type FiscalPeriod = number;

/** Fiscal period definition */
export interface FiscalPeriodDef {
  readonly fiscalYear: FiscalYear;
  readonly period: FiscalPeriod;
  readonly startDate: DateString;
  readonly endDate: DateString;
  readonly status: FiscalPeriodStatus;
}

/** Fiscal period status */
export type FiscalPeriodStatus =
  | 'OPEN'
  | 'CLOSED'
  | 'SOFT_CLOSED'
  | 'YEAR_END';

/** Date range */
export interface DateRange {
  readonly startDate: DateString;
  readonly endDate: DateString;
}

/** Timestamp range */
export interface TimestampRange {
  readonly startTimestamp: Timestamp;
  readonly endTimestamp: Timestamp;
}

/** Effective dating for temporal records */
export interface EffectiveDating {
  readonly effectiveStartDate: DateString;
  readonly effectiveEndDate: DateString | null;
  readonly createdAt: Timestamp;
  readonly modifiedAt: Timestamp;
}

/** Injectable timestamp provider for deterministic replay */
export interface TimestampProvider {
  /** Get current timestamp (injectable for replay) */
  now(): Timestamp;
  /** Get current date (injectable for replay) */
  today(): DateString;
}

/** Default timestamp provider using system time */
export const SystemTimestampProvider: TimestampProvider = {
  now: () => new Date().toISOString(),
  today: () => new Date().toISOString().split('T')[0]
};

/** Factory for creating deterministic timestamp providers */
export const createFixedTimestampProvider = (
  fixedTimestamp: Timestamp
): TimestampProvider => ({
  now: () => fixedTimestamp,
  today: () => fixedTimestamp.split('T')[0]
});

/** Temporal operations */
export const TemporalOperations = {
  /** Check if date is within fiscal period */
  isWithinPeriod(date: DateString, period: FiscalPeriodDef): boolean {
    return date >= period.startDate && date <= period.endDate;
  },

  /** Check if fiscal period is open for posting */
  isPeriodOpen(period: FiscalPeriodDef): boolean {
    return period.status === 'OPEN';
  },

  /** Calculate duration between two timestamps in milliseconds */
  durationBetween(start: Timestamp, end: Timestamp): DurationMs {
    return new Date(end).getTime() - new Date(start).getTime();
  },

  /** Check if date range is valid */
  isValidDateRange(range: DateRange): boolean {
    return range.startDate <= range.endDate;
  },

  /** Check if date is within range */
  isWithinRange(date: DateString, range: DateRange): boolean {
    return date >= range.startDate && date <= range.endDate;
  }
};
