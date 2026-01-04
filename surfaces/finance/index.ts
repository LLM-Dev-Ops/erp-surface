/**
 * Finance Surfaces Module Index
 *
 * Re-exports all finance surface contracts, models, and events.
 */

// General Ledger
export * from './general-ledger';

// Accounts Payable
export * from './accounts-payable';

// Accounts Receivable
export * from './accounts-receivable';

// Fixed Assets
export * from './fixed-assets';

// Cash Management
export * from './cash-management';

// ============================================================================
// FINANCE DOMAIN SURFACE REGISTRY
// ============================================================================

import { GENERAL_LEDGER_SURFACE, GENERAL_LEDGER_VERSION } from './general-ledger/contracts';
import { ACCOUNTS_PAYABLE_SURFACE, ACCOUNTS_PAYABLE_VERSION } from './accounts-payable/contracts';
import { ACCOUNTS_RECEIVABLE_SURFACE, ACCOUNTS_RECEIVABLE_VERSION } from './accounts-receivable/contracts';
import { FIXED_ASSETS_SURFACE, FIXED_ASSETS_VERSION } from './fixed-assets/contracts';
import { CASH_MANAGEMENT_SURFACE, CASH_MANAGEMENT_VERSION } from './cash-management/contracts';

/** Finance domain surface identifiers */
export const FinanceSurfaces = {
  GENERAL_LEDGER: GENERAL_LEDGER_SURFACE,
  ACCOUNTS_PAYABLE: ACCOUNTS_PAYABLE_SURFACE,
  ACCOUNTS_RECEIVABLE: ACCOUNTS_RECEIVABLE_SURFACE,
  FIXED_ASSETS: FIXED_ASSETS_SURFACE,
  CASH_MANAGEMENT: CASH_MANAGEMENT_SURFACE
} as const;

/** Finance domain surface versions */
export const FinanceSurfaceVersions = {
  [GENERAL_LEDGER_SURFACE]: GENERAL_LEDGER_VERSION,
  [ACCOUNTS_PAYABLE_SURFACE]: ACCOUNTS_PAYABLE_VERSION,
  [ACCOUNTS_RECEIVABLE_SURFACE]: ACCOUNTS_RECEIVABLE_VERSION,
  [FIXED_ASSETS_SURFACE]: FIXED_ASSETS_VERSION,
  [CASH_MANAGEMENT_SURFACE]: CASH_MANAGEMENT_VERSION
} as const;

/** Finance domain metadata */
export const FinanceDomainMetadata = {
  domainId: 'finance',
  domainName: 'Finance',
  description: 'Financial management surfaces including GL, AP, AR, FA, and Cash Management',
  surfaces: Object.values(FinanceSurfaces),
  version: '1.0.0'
} as const;
