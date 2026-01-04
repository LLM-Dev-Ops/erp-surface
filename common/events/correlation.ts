/**
 * Correlation Context for ERP Surface Contracts
 *
 * Provides correlation ID management for request tracing and
 * composition with LLM-Memory-Graph for context lineage.
 */

import { CorrelationId, CausationId, UUID } from '../types/identity';
import { Timestamp } from '../types/temporal';

/** Correlation context for a surface operation */
export interface CorrelationContext {
  /** Root correlation ID for the entire request chain */
  readonly correlationId: CorrelationId;

  /** Immediate parent causation ID */
  readonly causationId: CausationId | null;

  /** Current operation ID */
  readonly operationId: UUID;

  /** Context creation timestamp */
  readonly createdAt: Timestamp;

  /** Depth in the operation chain */
  readonly depth: number;

  /** Breadcrumb trail of operation names */
  readonly breadcrumbs: string[];
}

/** Context lineage hint for LLM-Memory-Graph composition */
export interface LineageHint {
  /** Relationship type */
  readonly relationshipType: LineageRelationshipType;

  /** Source entity type */
  readonly sourceEntityType: string;

  /** Source entity ID */
  readonly sourceEntityId: string;

  /** Target entity type */
  readonly targetEntityType: string;

  /** Target entity ID */
  readonly targetEntityId: string;

  /** Cardinality of the relationship */
  readonly cardinality: LineageCardinality;
}

/** Lineage relationship types */
export type LineageRelationshipType =
  | 'CREATED_BY'
  | 'MODIFIED_BY'
  | 'DERIVED_FROM'
  | 'TRIGGERED_BY'
  | 'REFERENCES'
  | 'CONTAINS'
  | 'BELONGS_TO';

/** Lineage cardinality */
export type LineageCardinality =
  | 'ONE_TO_ONE'
  | 'ONE_TO_MANY'
  | 'MANY_TO_ONE'
  | 'MANY_TO_MANY';

/** Context cardinality rules for graph validation */
export interface CardinalityRule {
  readonly sourceEntityType: string;
  readonly relationshipType: LineageRelationshipType;
  readonly targetEntityType: string;
  readonly minCount: number;
  readonly maxCount: number | null;
}

/** Correlation context factory */
export const CorrelationContextFactory = {
  /** Create root correlation context */
  createRoot(
    operationName: string,
    correlationId?: CorrelationId,
    operationId?: UUID,
    timestamp?: Timestamp
  ): CorrelationContext {
    const corrId = correlationId || generateCorrelationId();
    const opId = operationId || generateOperationId();

    return {
      correlationId: corrId,
      causationId: null,
      operationId: opId,
      createdAt: timestamp || new Date().toISOString(),
      depth: 0,
      breadcrumbs: [operationName]
    };
  },

  /** Create child correlation context */
  createChild(
    parent: CorrelationContext,
    operationName: string,
    operationId?: UUID,
    timestamp?: Timestamp
  ): CorrelationContext {
    return {
      correlationId: parent.correlationId,
      causationId: parent.operationId,
      operationId: operationId || generateOperationId(),
      createdAt: timestamp || new Date().toISOString(),
      depth: parent.depth + 1,
      breadcrumbs: [...parent.breadcrumbs, operationName]
    };
  },

  /** Create lineage hint */
  createLineageHint(
    relationshipType: LineageRelationshipType,
    sourceEntityType: string,
    sourceEntityId: string,
    targetEntityType: string,
    targetEntityId: string,
    cardinality: LineageCardinality = 'ONE_TO_ONE'
  ): LineageHint {
    return {
      relationshipType,
      sourceEntityType,
      sourceEntityId,
      targetEntityType,
      targetEntityId,
      cardinality
    };
  }
};

/** Generate correlation ID */
const generateCorrelationId = (): CorrelationId => {
  return `corr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/** Generate operation ID */
const generateOperationId = (): UUID => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/** Default cardinality rules for ERP entities */
export const DEFAULT_CARDINALITY_RULES: CardinalityRule[] = [
  // Document relationships
  {
    sourceEntityType: 'JournalEntry',
    relationshipType: 'CONTAINS',
    targetEntityType: 'JournalLineItem',
    minCount: 1,
    maxCount: null
  },
  {
    sourceEntityType: 'PurchaseOrder',
    relationshipType: 'CONTAINS',
    targetEntityType: 'PurchaseOrderLine',
    minCount: 1,
    maxCount: null
  },
  {
    sourceEntityType: 'Employee',
    relationshipType: 'BELONGS_TO',
    targetEntityType: 'Position',
    minCount: 0,
    maxCount: 1
  },
  {
    sourceEntityType: 'GoodsReceipt',
    relationshipType: 'REFERENCES',
    targetEntityType: 'PurchaseOrder',
    minCount: 1,
    maxCount: 1
  },
  {
    sourceEntityType: 'Invoice',
    relationshipType: 'DERIVED_FROM',
    targetEntityType: 'PurchaseOrder',
    minCount: 0,
    maxCount: null
  }
];
