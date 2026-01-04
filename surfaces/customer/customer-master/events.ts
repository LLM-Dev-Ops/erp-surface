/**
 * Customer Master Events
 * Observable events for customer management operations
 */

import { DomainEvent, createEvent, Observable } from '../../common/events';
import { EntityId, Address, Money } from '../../common/types';
import { CustomerState, CustomerSegment } from './models';

// ============================================================================
// Event Type Constants
// ============================================================================

export const CUSTOMER_EVENT_TYPES = {
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_SEGMENTED: 'customer.segmented',
  HIERARCHY_MODIFIED: 'customer.hierarchy.modified',
  CUSTOMER_STATE_CHANGED: 'customer.state.changed',
  CUSTOMER_CREDIT_UPDATED: 'customer.credit.updated',
  CUSTOMER_RELATIONSHIP_CREATED: 'customer.relationship.created',
  CUSTOMER_RELATIONSHIP_REMOVED: 'customer.relationship.removed',
} as const;

// ============================================================================
// CustomerCreatedEvent
// ============================================================================

export interface CustomerCreatedPayload {
  readonly customerId: EntityId;
  readonly accountNumber: string;
  readonly legalName: string;
  readonly tradingName?: string;
  readonly industry: string;
  readonly segment: CustomerSegment;
  readonly state: CustomerState;
  readonly billingAddress: Address;
  readonly shippingAddress?: Address;
  readonly currency: string;
  readonly creditLimit?: Money;
  readonly paymentTermsDays: number;
}

export interface CustomerCreatedEvent extends DomainEvent<CustomerCreatedPayload> {
  readonly eventType: typeof CUSTOMER_EVENT_TYPES.CUSTOMER_CREATED;
  readonly aggregateType: 'Customer';
}

export function createCustomerCreatedEvent(
  customerId: EntityId,
  payload: CustomerCreatedPayload,
  metadata?: { correlationId?: string; userId?: EntityId }
): CustomerCreatedEvent {
  return createEvent(
    CUSTOMER_EVENT_TYPES.CUSTOMER_CREATED,
    customerId,
    'Customer',
    payload,
    {
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      source: 'customer-master',
      schemaVersion: '1.0.0',
    }
  ) as CustomerCreatedEvent;
}

// ============================================================================
// CustomerUpdatedEvent
// ============================================================================

export interface CustomerFieldChange {
  readonly field: string;
  readonly previousValue: unknown;
  readonly newValue: unknown;
}

export interface CustomerUpdatedPayload {
  readonly customerId: EntityId;
  readonly changes: readonly CustomerFieldChange[];
  readonly previousVersion: number;
  readonly newVersion: number;
}

export interface CustomerUpdatedEvent extends DomainEvent<CustomerUpdatedPayload> {
  readonly eventType: typeof CUSTOMER_EVENT_TYPES.CUSTOMER_UPDATED;
  readonly aggregateType: 'Customer';
}

export function createCustomerUpdatedEvent(
  customerId: EntityId,
  changes: readonly CustomerFieldChange[],
  previousVersion: number,
  newVersion: number,
  metadata?: { correlationId?: string; userId?: EntityId }
): CustomerUpdatedEvent {
  return createEvent(
    CUSTOMER_EVENT_TYPES.CUSTOMER_UPDATED,
    customerId,
    'Customer',
    {
      customerId,
      changes,
      previousVersion,
      newVersion,
    },
    {
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      source: 'customer-master',
      schemaVersion: '1.0.0',
    }
  ) as CustomerUpdatedEvent;
}

// ============================================================================
// CustomerSegmentedEvent
// ============================================================================

export interface CustomerSegmentedPayload {
  readonly customerId: EntityId;
  readonly previousSegment: CustomerSegment;
  readonly newSegment: CustomerSegment;
  readonly reason: string;
  readonly effectiveDate: string;
  readonly classificationFactors?: {
    readonly annualRevenue?: Money;
    readonly employeeCount?: number;
    readonly industry?: string;
  };
}

export interface CustomerSegmentedEvent extends DomainEvent<CustomerSegmentedPayload> {
  readonly eventType: typeof CUSTOMER_EVENT_TYPES.CUSTOMER_SEGMENTED;
  readonly aggregateType: 'Customer';
}

export function createCustomerSegmentedEvent(
  customerId: EntityId,
  payload: CustomerSegmentedPayload,
  metadata?: { correlationId?: string; userId?: EntityId }
): CustomerSegmentedEvent {
  return createEvent(
    CUSTOMER_EVENT_TYPES.CUSTOMER_SEGMENTED,
    customerId,
    'Customer',
    payload,
    {
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      source: 'customer-master',
      schemaVersion: '1.0.0',
    }
  ) as CustomerSegmentedEvent;
}

// ============================================================================
// HierarchyModifiedEvent
// ============================================================================

export type HierarchyModificationType =
  | 'NODE_ADDED'
  | 'NODE_REMOVED'
  | 'NODE_MOVED'
  | 'RELATIONSHIP_CHANGED';

export interface HierarchyModifiedPayload {
  readonly rootCustomerId: EntityId;
  readonly modificationType: HierarchyModificationType;
  readonly affectedCustomerId: EntityId;
  readonly previousParentId?: EntityId;
  readonly newParentId?: EntityId;
  readonly previousHierarchyDepth: number;
  readonly newHierarchyDepth: number;
}

export interface HierarchyModifiedEvent extends DomainEvent<HierarchyModifiedPayload> {
  readonly eventType: typeof CUSTOMER_EVENT_TYPES.HIERARCHY_MODIFIED;
  readonly aggregateType: 'CustomerHierarchy';
}

export function createHierarchyModifiedEvent(
  rootCustomerId: EntityId,
  payload: HierarchyModifiedPayload,
  metadata?: { correlationId?: string; userId?: EntityId }
): HierarchyModifiedEvent {
  return createEvent(
    CUSTOMER_EVENT_TYPES.HIERARCHY_MODIFIED,
    rootCustomerId,
    'CustomerHierarchy',
    payload,
    {
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      source: 'customer-master',
      schemaVersion: '1.0.0',
    }
  ) as HierarchyModifiedEvent;
}

// ============================================================================
// CustomerStateChangedEvent
// ============================================================================

export interface CustomerStateChangedPayload {
  readonly customerId: EntityId;
  readonly previousState: CustomerState;
  readonly newState: CustomerState;
  readonly trigger: string;
  readonly reason?: string;
}

export interface CustomerStateChangedEvent extends DomainEvent<CustomerStateChangedPayload> {
  readonly eventType: typeof CUSTOMER_EVENT_TYPES.CUSTOMER_STATE_CHANGED;
  readonly aggregateType: 'Customer';
}

export function createCustomerStateChangedEvent(
  customerId: EntityId,
  payload: CustomerStateChangedPayload,
  metadata?: { correlationId?: string; userId?: EntityId }
): CustomerStateChangedEvent {
  return createEvent(
    CUSTOMER_EVENT_TYPES.CUSTOMER_STATE_CHANGED,
    customerId,
    'Customer',
    payload,
    {
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
      source: 'customer-master',
      schemaVersion: '1.0.0',
    }
  ) as CustomerStateChangedEvent;
}

// ============================================================================
// Event Stream Types
// ============================================================================

export type CustomerEvent =
  | CustomerCreatedEvent
  | CustomerUpdatedEvent
  | CustomerSegmentedEvent
  | HierarchyModifiedEvent
  | CustomerStateChangedEvent;

// ============================================================================
// Event Observable
// ============================================================================

export class CustomerEventStream extends Observable<CustomerEvent> {
  private static instance: CustomerEventStream | null = null;

  private constructor() {
    super();
  }

  static getInstance(): CustomerEventStream {
    if (!CustomerEventStream.instance) {
      CustomerEventStream.instance = new CustomerEventStream();
    }
    return CustomerEventStream.instance;
  }

  async publishCustomerCreated(
    customerId: EntityId,
    payload: CustomerCreatedPayload,
    metadata?: { correlationId?: string; userId?: EntityId }
  ): Promise<void> {
    const event = createCustomerCreatedEvent(customerId, payload, metadata);
    await this.publish(event);
  }

  async publishCustomerUpdated(
    customerId: EntityId,
    changes: readonly CustomerFieldChange[],
    previousVersion: number,
    newVersion: number,
    metadata?: { correlationId?: string; userId?: EntityId }
  ): Promise<void> {
    const event = createCustomerUpdatedEvent(
      customerId,
      changes,
      previousVersion,
      newVersion,
      metadata
    );
    await this.publish(event);
  }

  async publishCustomerSegmented(
    customerId: EntityId,
    payload: CustomerSegmentedPayload,
    metadata?: { correlationId?: string; userId?: EntityId }
  ): Promise<void> {
    const event = createCustomerSegmentedEvent(customerId, payload, metadata);
    await this.publish(event);
  }

  async publishHierarchyModified(
    rootCustomerId: EntityId,
    payload: HierarchyModifiedPayload,
    metadata?: { correlationId?: string; userId?: EntityId }
  ): Promise<void> {
    const event = createHierarchyModifiedEvent(rootCustomerId, payload, metadata);
    await this.publish(event);
  }

  async publishStateChanged(
    customerId: EntityId,
    payload: CustomerStateChangedPayload,
    metadata?: { correlationId?: string; userId?: EntityId }
  ): Promise<void> {
    const event = createCustomerStateChangedEvent(customerId, payload, metadata);
    await this.publish(event);
  }
}

// ============================================================================
// Event Handlers Interface
// ============================================================================

export interface CustomerEventHandlers {
  onCustomerCreated?: (event: CustomerCreatedEvent) => void | Promise<void>;
  onCustomerUpdated?: (event: CustomerUpdatedEvent) => void | Promise<void>;
  onCustomerSegmented?: (event: CustomerSegmentedEvent) => void | Promise<void>;
  onHierarchyModified?: (event: HierarchyModifiedEvent) => void | Promise<void>;
  onCustomerStateChanged?: (event: CustomerStateChangedEvent) => void | Promise<void>;
}

export function subscribeToCustomerEvents(
  handlers: CustomerEventHandlers
): () => void {
  const stream = CustomerEventStream.getInstance();
  
  return stream.subscribe(async (event) => {
    switch (event.eventType) {
      case CUSTOMER_EVENT_TYPES.CUSTOMER_CREATED:
        await handlers.onCustomerCreated?.(event as CustomerCreatedEvent);
        break;
      case CUSTOMER_EVENT_TYPES.CUSTOMER_UPDATED:
        await handlers.onCustomerUpdated?.(event as CustomerUpdatedEvent);
        break;
      case CUSTOMER_EVENT_TYPES.CUSTOMER_SEGMENTED:
        await handlers.onCustomerSegmented?.(event as CustomerSegmentedEvent);
        break;
      case CUSTOMER_EVENT_TYPES.HIERARCHY_MODIFIED:
        await handlers.onHierarchyModified?.(event as HierarchyModifiedEvent);
        break;
      case CUSTOMER_EVENT_TYPES.CUSTOMER_STATE_CHANGED:
        await handlers.onCustomerStateChanged?.(event as CustomerStateChangedEvent);
        break;
    }
  });
}
