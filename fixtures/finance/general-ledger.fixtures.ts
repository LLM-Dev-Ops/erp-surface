/**
 * General Ledger Fixtures
 *
 * Deterministic fixtures for GeneralLedgerSurface benchmarking and testing.
 */

import { MonetaryAmount } from '../../common/types/monetary';

/** Journal entry fixture */
export interface JournalEntryFixture {
  readonly fixtureId: string;
  readonly description: string;
  readonly input: JournalEntryInput;
  readonly expectedOutput: JournalEntryOutput;
  readonly tags: string[];
}

interface JournalEntryInput {
  readonly journalHeader: {
    readonly companyCode: string;
    readonly journalType: string;
    readonly documentDate: string;
    readonly postingDate: string;
    readonly reference: string;
    readonly description: string;
  };
  readonly lineItems: Array<{
    readonly lineNumber: number;
    readonly accountNumber: string;
    readonly debitAmount: MonetaryAmount;
    readonly creditAmount: MonetaryAmount;
    readonly costCenter?: string;
    readonly description: string;
  }>;
}

interface JournalEntryOutput {
  readonly documentNumber: string;
  readonly postingStatus: string;
  readonly lineResults: Array<{
    readonly lineNumber: number;
    readonly status: string;
  }>;
}

/** Balanced journal entry - standard case */
export const BALANCED_JOURNAL_ENTRY: JournalEntryFixture = {
  fixtureId: 'gl-fixture-001',
  description: 'Balanced journal entry with two lines',
  input: {
    journalHeader: {
      companyCode: 'US01',
      journalType: 'JE',
      documentDate: '2024-01-15',
      postingDate: '2024-01-15',
      reference: 'INV-2024-001',
      description: 'Record invoice payment'
    },
    lineItems: [
      {
        lineNumber: 1,
        accountNumber: '1000-0001',
        debitAmount: { value: 1000.00, currency: 'USD', precision: 2 },
        creditAmount: { value: 0, currency: 'USD', precision: 2 },
        costCenter: 'CC100',
        description: 'Cash account debit'
      },
      {
        lineNumber: 2,
        accountNumber: '2000-0001',
        debitAmount: { value: 0, currency: 'USD', precision: 2 },
        creditAmount: { value: 1000.00, currency: 'USD', precision: 2 },
        costCenter: 'CC100',
        description: 'Revenue credit'
      }
    ]
  },
  expectedOutput: {
    documentNumber: 'DOC-2024-000001',
    postingStatus: 'POSTED',
    lineResults: [
      { lineNumber: 1, status: 'POSTED' },
      { lineNumber: 2, status: 'POSTED' }
    ]
  },
  tags: ['balanced', 'standard', 'two-lines']
};

/** Multi-line journal entry */
export const MULTI_LINE_JOURNAL_ENTRY: JournalEntryFixture = {
  fixtureId: 'gl-fixture-002',
  description: 'Balanced journal entry with four lines',
  input: {
    journalHeader: {
      companyCode: 'US01',
      journalType: 'JE',
      documentDate: '2024-01-20',
      postingDate: '2024-01-20',
      reference: 'EXP-2024-001',
      description: 'Expense allocation'
    },
    lineItems: [
      {
        lineNumber: 1,
        accountNumber: '5100-0001',
        debitAmount: { value: 500.00, currency: 'USD', precision: 2 },
        creditAmount: { value: 0, currency: 'USD', precision: 2 },
        costCenter: 'CC200',
        description: 'Rent expense'
      },
      {
        lineNumber: 2,
        accountNumber: '5200-0001',
        debitAmount: { value: 300.00, currency: 'USD', precision: 2 },
        creditAmount: { value: 0, currency: 'USD', precision: 2 },
        costCenter: 'CC200',
        description: 'Utilities expense'
      },
      {
        lineNumber: 3,
        accountNumber: '5300-0001',
        debitAmount: { value: 200.00, currency: 'USD', precision: 2 },
        creditAmount: { value: 0, currency: 'USD', precision: 2 },
        costCenter: 'CC200',
        description: 'Supplies expense'
      },
      {
        lineNumber: 4,
        accountNumber: '2100-0001',
        debitAmount: { value: 0, currency: 'USD', precision: 2 },
        creditAmount: { value: 1000.00, currency: 'USD', precision: 2 },
        description: 'Accounts payable credit'
      }
    ]
  },
  expectedOutput: {
    documentNumber: 'DOC-2024-000002',
    postingStatus: 'POSTED',
    lineResults: [
      { lineNumber: 1, status: 'POSTED' },
      { lineNumber: 2, status: 'POSTED' },
      { lineNumber: 3, status: 'POSTED' },
      { lineNumber: 4, status: 'POSTED' }
    ]
  },
  tags: ['balanced', 'multi-line', 'expenses']
};

/** Account balance query fixture */
export interface AccountBalanceFixture {
  readonly fixtureId: string;
  readonly description: string;
  readonly input: AccountBalanceInput;
  readonly expectedOutput: AccountBalanceOutput;
  readonly tags: string[];
}

interface AccountBalanceInput {
  readonly accountNumber: string;
  readonly companyCode: string;
  readonly fiscalYear: number;
  readonly period: number;
  readonly balanceType: 'OPENING' | 'CLOSING' | 'PERIOD';
}

interface AccountBalanceOutput {
  readonly balance: MonetaryAmount;
  readonly currency: string;
  readonly lastPostingDate: string;
  readonly transactionCount: number;
}

/** Cash account balance */
export const CASH_ACCOUNT_BALANCE: AccountBalanceFixture = {
  fixtureId: 'gl-fixture-003',
  description: 'Cash account closing balance',
  input: {
    accountNumber: '1000-0001',
    companyCode: 'US01',
    fiscalYear: 2024,
    period: 1,
    balanceType: 'CLOSING'
  },
  expectedOutput: {
    balance: { value: 50000.00, currency: 'USD', precision: 2 },
    currency: 'USD',
    lastPostingDate: '2024-01-31',
    transactionCount: 45
  },
  tags: ['balance', 'cash', 'closing']
};

/** All fixtures */
export const GL_FIXTURES = {
  journalEntries: [
    BALANCED_JOURNAL_ENTRY,
    MULTI_LINE_JOURNAL_ENTRY
  ],
  accountBalances: [
    CASH_ACCOUNT_BALANCE
  ]
};
