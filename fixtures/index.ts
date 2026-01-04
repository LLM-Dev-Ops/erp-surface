/**
 * Fixtures Index
 *
 * Central export for all ERP Surface fixtures.
 * Used for deterministic testing and benchmarking.
 */

export * from './finance/general-ledger.fixtures';
export * from './procurement/purchase-order.fixtures';
export * from './hcm/employee.fixtures';

/** Fixture catalog */
export interface FixtureCatalog {
  readonly domain: string;
  readonly surface: string;
  readonly fixtures: FixtureEntry[];
}

/** Fixture entry */
export interface FixtureEntry {
  readonly fixtureId: string;
  readonly description: string;
  readonly operation: string;
  readonly tags: string[];
}

/** Get all fixture catalogs */
export const getFixtureCatalogs = (): FixtureCatalog[] => [
  {
    domain: 'finance',
    surface: 'GeneralLedgerSurface',
    fixtures: [
      { fixtureId: 'gl-fixture-001', description: 'Balanced journal entry', operation: 'PostJournalEntry', tags: ['balanced', 'standard'] },
      { fixtureId: 'gl-fixture-002', description: 'Multi-line journal entry', operation: 'PostJournalEntry', tags: ['balanced', 'multi-line'] },
      { fixtureId: 'gl-fixture-003', description: 'Cash account balance', operation: 'GetAccountBalance', tags: ['balance', 'closing'] }
    ]
  },
  {
    domain: 'procurement',
    surface: 'PurchaseOrderSurface',
    fixtures: [
      { fixtureId: 'po-fixture-001', description: 'Standard purchase order', operation: 'CreatePurchaseOrder', tags: ['standard', 'auto-approved'] },
      { fixtureId: 'po-fixture-002', description: 'High value purchase order', operation: 'CreatePurchaseOrder', tags: ['high-value', 'approval-required'] },
      { fixtureId: 'po-fixture-003', description: 'Full goods receipt', operation: 'ReceiveGoods', tags: ['full-receipt'] }
    ]
  },
  {
    domain: 'hcm',
    surface: 'EmployeeSurface',
    fixtures: [
      { fixtureId: 'emp-fixture-001', description: 'Standard employee hire', operation: 'HireEmployee', tags: ['full-time', 'standard'] },
      { fixtureId: 'emp-fixture-002', description: 'Voluntary termination', operation: 'TerminateEmployee', tags: ['resignation', 'voluntary'] }
    ]
  }
];

/** Get fixtures by tag */
export const getFixturesByTag = (tag: string): FixtureEntry[] => {
  return getFixtureCatalogs()
    .flatMap(c => c.fixtures)
    .filter(f => f.tags.includes(tag));
};

/** Get fixtures by surface */
export const getFixturesBySurface = (surface: string): FixtureEntry[] => {
  const catalog = getFixtureCatalogs().find(c => c.surface === surface);
  return catalog?.fixtures || [];
};
