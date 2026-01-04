/**
 * Common Event Types for ERP Surface Contracts
 * Provides foundational event infrastructure for observable event streams
 */

import { EntityId, ISODateTimeString } from './types';

// ============================================================================
// Event Base Types
// ============================================================================

export interface DomainEvent<T = unknown> {
  eventId: string;
  eventType: string;
  aggregateId: EntityId;
  aggregateType: string;
  occurredAt: ISODateTimeString;
  version: number;
  payload: T;
  metadata: EventMetadata;
}

export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: EntityId;
  source: string;
  schemaVersion: string;
}

// ============================================================================
// Event Store Types
// ============================================================================

export interface EventStream<E extends DomainEvent> {
  subscribe(handler: EventHandler<E>): Unsubscribe;
  publish(event: E): Promise<void>;
}

export type EventHandler<E extends DomainEvent> = (event: E) => Promise<void> | void;
export type Unsubscribe = () => void;

// ============================================================================
// Event Factory
// ============================================================================

export function createEvent<T>(
  eventType: string,
  aggregateId: EntityId,
  aggregateType: string,
  payload: T,
  metadata: Partial<EventMetadata> = {}
): DomainEvent<T> {
  return {
    eventId: generateEventId(),
    eventType,
    aggregateId,
    aggregateType,
    occurredAt: new Date().toISOString(),
    version: 1,
    payload,
    metadata: {
      source: 'erp-surface',
      schemaVersion: '1.0.0',
      ...metadata,
    },
  };
}

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================================================
// Event Subscription Types
// ============================================================================

export interface EventSubscription {
  id: string;
  eventTypes: string[];
  handler: EventHandler<DomainEvent>;
  filter?: EventFilter;
}

export interface EventFilter {
  aggregateTypes?: string[];
  aggregateIds?: EntityId[];
  fromDate?: ISODateTimeString;
  toDate?: ISODateTimeString;
}

// ============================================================================
// Observable Pattern Implementation
// ============================================================================

export class Observable<E extends DomainEvent> implements EventStream<E> {
  private handlers: Set<EventHandler<E>> = new Set();

  subscribe(handler: EventHandler<E>): Unsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async publish(event: E): Promise<void> {
    const promises = Array.from(this.handlers).map((handler) =>
      Promise.resolve(handler(event))
    );
    await Promise.all(promises);
  }
}

// ============================================================================
// Event Result Types
// ============================================================================

export interface EventPublishResult {
  success: boolean;
  eventId: string;
  publishedAt: ISODateTimeString;
}

export interface EventReplayOptions {
  fromVersion?: number;
  toVersion?: number;
  fromDate?: ISODateTimeString;
  toDate?: ISODateTimeString;
}
