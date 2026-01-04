/**
 * Identity Types for ERP Surface Contracts
 *
 * Vendor-neutral identity and reference types.
 * All identifiers are opaque strings to maintain vendor neutrality.
 */

/** Generic identifier type */
export type Identifier = string;

/** UUID v4 format identifier */
export type UUID = string;

/** Correlation ID for tracing */
export type CorrelationId = string;

/** Causation ID for event chains */
export type CausationId = string;

/** Document number (system-assigned) */
export type DocumentNumber = string;

/** Company code identifier */
export type CompanyCode = string;

/** Cost center identifier */
export type CostCenter = string;

/** Profit center identifier */
export type ProfitCenter = string;

/** Account number in chart of accounts */
export type AccountNumber = string;

/** User identifier */
export type UserId = string;

/** Employee identifier */
export type EmployeeId = string;

/** Position identifier */
export type PositionId = string;

/** Supplier/Vendor identifier */
export type SupplierId = string;

/** Customer identifier */
export type CustomerId = string;

/** Contact identifier */
export type ContactId = string;

/** Material/Item identifier */
export type MaterialId = string;

/** Purchase order number */
export type PONumber = string;

/** Sales order number */
export type SONumber = string;

/** Invoice number */
export type InvoiceNumber = string;

/** Receipt number */
export type ReceiptNumber = string;

/** Case number */
export type CaseNumber = string;

/** Incident number */
export type IncidentNumber = string;

/** Change request number */
export type ChangeNumber = string;

/** Queue identifier */
export type QueueId = string;

/** Semantic version string */
export type SemanticVersion = string;

/** Reference to another entity */
export interface EntityReference {
  readonly entityType: string;
  readonly entityId: Identifier;
  readonly displayName?: string;
}

/** Organizational unit reference */
export interface OrgUnitReference {
  readonly companyCode: CompanyCode;
  readonly costCenter?: CostCenter;
  readonly profitCenter?: ProfitCenter;
  readonly department?: string;
}

/** ID generation utilities */
export const IdentityOperations = {
  /** Generate a UUID v4 (injectable for deterministic replay) */
  generateUUID(seed?: string): UUID {
    if (seed) {
      // Deterministic UUID from seed for replay
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const hex = Math.abs(hash).toString(16).padStart(32, '0');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    }
    // Random UUID for non-replay scenarios
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /** Generate a correlation ID */
  generateCorrelationId(prefix: string = 'corr'): CorrelationId {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  },

  /** Create an entity reference */
  createReference(entityType: string, entityId: Identifier, displayName?: string): EntityReference {
    return { entityType, entityId, displayName };
  }
};
