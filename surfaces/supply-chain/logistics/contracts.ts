/**
 * Logistics Surface Contracts
 *
 * Defines typed contracts for logistics and transportation management operations.
 * All contracts include preconditions, postconditions, state transitions, and observable events.
 */

import {
  Result,
  Results,
  SurfaceError,
  ErrorFactory,
  ValidationError,
  Identifier,
  CompanyCode,
  CorrelationId,
  CausationId,
  UUID,
  Timestamp,
  DateString,
  MonetaryAmount,
  TimestampProvider,
  SystemTimestampProvider,
  IdentityOperations,
  BaseEvent,
  CorrelatedEvent,
  SemanticVersion,
  SONumber,
  PONumber
} from '../../../common';

// ============================================================================
// Surface Constants
// ============================================================================

export const LOGISTICS_SURFACE = 'LogisticsSurface';
export const LOGISTICS_SURFACE_VERSION: SemanticVersion = '1.0.0';

// ============================================================================
// Logistics Domain Types
// ============================================================================

/** Shipment identifier */
export type ShipmentId = Identifier;

/** Transport order identifier */
export type TransportOrderId = Identifier;

/** Carrier identifier */
export type CarrierId = Identifier;

/** Vehicle identifier */
export type VehicleId = Identifier;

/** Route identifier */
export type RouteId = Identifier;

/** Location identifier */
export type LocationId = Identifier;

// ============================================================================
// Shipment Status State Machine
// ============================================================================

/**
 * Shipment Status State Machine
 *
 * States:
 *   CREATED -> PLANNED -> DISPATCHED -> IN_TRANSIT -> DELIVERED -> CANCELLED
 *
 * Valid Transitions:
 *   CREATED -> PLANNED (via PLAN)
 *   PLANNED -> DISPATCHED (via DISPATCH)
 *   PLANNED -> CANCELLED (via CANCEL)
 *   DISPATCHED -> IN_TRANSIT (via DEPART)
 *   IN_TRANSIT -> DELIVERED (via DELIVER)
 *   IN_TRANSIT -> EXCEPTION (via EXCEPTION)
 *   EXCEPTION -> IN_TRANSIT (via RESUME)
 *   EXCEPTION -> RETURNED (via RETURN)
 */
export type ShipmentStatus =
  | 'CREATED'
  | 'PLANNED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'EXCEPTION'
  | 'RETURNED'
  | 'CANCELLED';

export type ShipmentTransition =
  | 'PLAN'
  | 'DISPATCH'
  | 'DEPART'
  | 'DELIVER'
  | 'EXCEPTION'
  | 'RESUME'
  | 'RETURN'
  | 'CANCEL';

export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, Partial<Record<ShipmentTransition, ShipmentStatus>>> = {
  CREATED: {
    PLAN: 'PLANNED'
  },
  PLANNED: {
    DISPATCH: 'DISPATCHED',
    CANCEL: 'CANCELLED'
  },
  DISPATCHED: {
    DEPART: 'IN_TRANSIT'
  },
  IN_TRANSIT: {
    DELIVER: 'DELIVERED',
    EXCEPTION: 'EXCEPTION'
  },
  DELIVERED: {},
  EXCEPTION: {
    RESUME: 'IN_TRANSIT',
    RETURN: 'RETURNED'
  },
  RETURNED: {},
  CANCELLED: {}
};

/** Check if transition is valid */
export function isValidShipmentTransition(
  currentStatus: ShipmentStatus,
  transition: ShipmentTransition
): boolean {
  const validTransitions = SHIPMENT_TRANSITIONS[currentStatus];
  return transition in validTransitions;
}

/** Get next status for a transition */
export function getNextShipmentStatus(
  currentStatus: ShipmentStatus,
  transition: ShipmentTransition
): ShipmentStatus | null {
  const validTransitions = SHIPMENT_TRANSITIONS[currentStatus];
  return validTransitions[transition] || null;
}

// ============================================================================
// Transport Order Status State Machine
// ============================================================================

/**
 * Transport Order Status State Machine
 */
export type TransportOrderStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_EXECUTION'
  | 'COMPLETED'
  | 'CANCELLED';

export type TransportOrderTransition =
  | 'SCHEDULE'
  | 'CONFIRM'
  | 'START'
  | 'COMPLETE'
  | 'CANCEL';

export const TRANSPORT_ORDER_TRANSITIONS: Record<TransportOrderStatus, Partial<Record<TransportOrderTransition, TransportOrderStatus>>> = {
  DRAFT: {
    SCHEDULE: 'SCHEDULED'
  },
  SCHEDULED: {
    CONFIRM: 'CONFIRMED',
    CANCEL: 'CANCELLED'
  },
  CONFIRMED: {
    START: 'IN_EXECUTION',
    CANCEL: 'CANCELLED'
  },
  IN_EXECUTION: {
    COMPLETE: 'COMPLETED'
  },
  COMPLETED: {},
  CANCELLED: {}
};

// ============================================================================
// Domain Models
// ============================================================================

/** Address model */
export interface Address {
  readonly addressLine1: string;
  readonly addressLine2?: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;
  readonly latitude?: number;
  readonly longitude?: number;
}

/** Shipment model */
export interface Shipment {
  readonly shipmentId: ShipmentId;
  readonly companyCode: CompanyCode;
  readonly shipmentType: ShipmentType;
  readonly status: ShipmentStatus;
  readonly referenceDocumentType: ReferenceDocumentType;
  readonly referenceDocumentNumber: string;
  readonly origin: ShipmentLocation;
  readonly destination: ShipmentLocation;
  readonly carrier: CarrierInfo | null;
  readonly items: ShipmentItem[];
  readonly scheduledPickupDate: DateString;
  readonly scheduledDeliveryDate: DateString;
  readonly actualPickupDate: DateString | null;
  readonly actualDeliveryDate: DateString | null;
  readonly trackingNumber: string | null;
  readonly proofOfDelivery: ProofOfDelivery | null;
  readonly totalWeight: Weight;
  readonly totalVolume: Volume;
  readonly freightCost: MonetaryAmount | null;
  readonly trackingEvents: TrackingEvent[];
  readonly createdAt: Timestamp;
  readonly createdBy: string;
}

/** Shipment type */
export type ShipmentType =
  | 'OUTBOUND'
  | 'INBOUND'
  | 'TRANSFER'
  | 'RETURN';

/** Reference document type */
export type ReferenceDocumentType =
  | 'SALES_ORDER'
  | 'PURCHASE_ORDER'
  | 'TRANSFER_ORDER'
  | 'RETURN_ORDER';

/** Shipment location */
export interface ShipmentLocation {
  readonly locationId: LocationId;
  readonly locationType: LocationType;
  readonly name: string;
  readonly address: Address;
  readonly contactName: string;
  readonly contactPhone: string;
  readonly contactEmail?: string;
}

/** Location type */
export type LocationType =
  | 'WAREHOUSE'
  | 'DISTRIBUTION_CENTER'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'PORT'
  | 'CROSS_DOCK';

/** Carrier info */
export interface CarrierInfo {
  readonly carrierId: CarrierId;
  readonly carrierName: string;
  readonly serviceLevel: ServiceLevel;
  readonly accountNumber?: string;
}

/** Service level */
export type ServiceLevel =
  | 'STANDARD'
  | 'EXPRESS'
  | 'OVERNIGHT'
  | 'ECONOMY'
  | 'FREIGHT';

/** Shipment item */
export interface ShipmentItem {
  readonly itemId: Identifier;
  readonly materialId: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitOfMeasure: string;
  readonly weight: Weight;
  readonly volume: Volume;
  readonly lotNumber?: string;
  readonly serialNumber?: string;
}

/** Weight measurement */
export interface Weight {
  readonly value: number;
  readonly unit: WeightUnit;
}

/** Weight unit */
export type WeightUnit = 'KG' | 'LB' | 'G' | 'OZ';

/** Volume measurement */
export interface Volume {
  readonly value: number;
  readonly unit: VolumeUnit;
}

/** Volume unit */
export type VolumeUnit = 'M3' | 'FT3' | 'L' | 'GAL';

/** Tracking event */
export interface TrackingEvent {
  readonly eventId: Identifier;
  readonly eventType: TrackingEventType;
  readonly timestamp: Timestamp;
  readonly location: string;
  readonly description: string;
  readonly signedBy?: string;
}

/** Tracking event type */
export type TrackingEventType =
  | 'PICKED_UP'
  | 'DEPARTED'
  | 'ARRIVED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'EXCEPTION'
  | 'RETURNED';

/** Proof of delivery */
export interface ProofOfDelivery {
  readonly signedBy: string;
  readonly signatureTimestamp: Timestamp;
  readonly signatureData?: string;
  readonly deliveryNotes?: string;
  readonly photoEvidence?: string[];
}

/** Transport order model */
export interface TransportOrder {
  readonly transportOrderId: TransportOrderId;
  readonly companyCode: CompanyCode;
  readonly status: TransportOrderStatus;
  readonly shipmentIds: ShipmentId[];
  readonly carrier: CarrierInfo;
  readonly vehicle: VehicleInfo | null;
  readonly driver: DriverInfo | null;
  readonly route: RouteInfo;
  readonly scheduledDate: DateString;
  readonly estimatedDuration: number;
  readonly actualDuration: number | null;
  readonly transportCost: MonetaryAmount;
  readonly createdAt: Timestamp;
  readonly createdBy: string;
}

/** Vehicle info */
export interface VehicleInfo {
  readonly vehicleId: VehicleId;
  readonly vehicleType: VehicleType;
  readonly licensePlate: string;
  readonly capacity: Weight;
  readonly volumeCapacity: Volume;
}

/** Vehicle type */
export type VehicleType =
  | 'TRUCK'
  | 'VAN'
  | 'TRAILER'
  | 'CONTAINER'
  | 'AIR_FREIGHT'
  | 'OCEAN_FREIGHT'
  | 'RAIL';

/** Driver info */
export interface DriverInfo {
  readonly driverId: Identifier;
  readonly name: string;
  readonly licenseNumber: string;
  readonly phone: string;
}

/** Route info */
export interface RouteInfo {
  readonly routeId: RouteId;
  readonly stops: RouteStop[];
  readonly totalDistance: number;
  readonly distanceUnit: 'KM' | 'MI';
  readonly estimatedTime: number;
}

/** Route stop */
export interface RouteStop {
  readonly sequence: number;
  readonly locationId: LocationId;
  readonly locationType: LocationType;
  readonly address: Address;
  readonly stopType: StopType;
  readonly plannedArrival: Timestamp;
  readonly plannedDeparture: Timestamp;
  readonly actualArrival?: Timestamp;
  readonly actualDeparture?: Timestamp;
}

/** Stop type */
export type StopType =
  | 'PICKUP'
  | 'DELIVERY'
  | 'CROSS_DOCK'
  | 'FUEL'
  | 'REST';

// ============================================================================
// Logistics Events
// ============================================================================

/** Event: Shipment created */
export interface ShipmentCreatedEvent extends CorrelatedEvent {
  readonly eventType: 'SHIPMENT_CREATED';
  readonly shipmentId: ShipmentId;
  readonly shipmentType: ShipmentType;
  readonly origin: string;
  readonly destination: string;
  readonly scheduledDeliveryDate: DateString;
}

/** Event: Shipment tracked */
export interface ShipmentTrackedEvent extends CorrelatedEvent {
  readonly eventType: 'SHIPMENT_TRACKED';
  readonly shipmentId: ShipmentId;
  readonly currentStatus: ShipmentStatus;
  readonly currentLocation: string;
  readonly estimatedDelivery: DateString | null;
  readonly lastTrackingEvent: TrackingEventType;
}

/** Event: Delivery confirmed */
export interface DeliveryConfirmedEvent extends CorrelatedEvent {
  readonly eventType: 'DELIVERY_CONFIRMED';
  readonly shipmentId: ShipmentId;
  readonly deliveredAt: Timestamp;
  readonly signedBy: string;
  readonly deliveryLocation: string;
}

/** Event: Transport scheduled */
export interface TransportScheduledEvent extends CorrelatedEvent {
  readonly eventType: 'TRANSPORT_SCHEDULED';
  readonly transportOrderId: TransportOrderId;
  readonly carrierId: CarrierId;
  readonly scheduledDate: DateString;
  readonly shipmentCount: number;
  readonly totalStops: number;
}

/** All logistics events */
export type LogisticsEvent =
  | ShipmentCreatedEvent
  | ShipmentTrackedEvent
  | DeliveryConfirmedEvent
  | TransportScheduledEvent;

// ============================================================================
// Event Factory
// ============================================================================

export const LogisticsEventFactory = {
  shipmentCreated(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    shipmentId: ShipmentId,
    shipmentType: ShipmentType,
    origin: string,
    destination: string,
    scheduledDeliveryDate: DateString,
    timestamp: Timestamp,
    eventId: UUID
  ): ShipmentCreatedEvent {
    return {
      eventId,
      eventType: 'SHIPMENT_CREATED',
      timestamp,
      surface: LOGISTICS_SURFACE,
      operation: 'CreateShipment',
      surfaceVersion: LOGISTICS_SURFACE_VERSION,
      correlationId,
      causationId,
      shipmentId,
      shipmentType,
      origin,
      destination,
      scheduledDeliveryDate
    };
  },

  shipmentTracked(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    shipmentId: ShipmentId,
    currentStatus: ShipmentStatus,
    currentLocation: string,
    estimatedDelivery: DateString | null,
    lastTrackingEvent: TrackingEventType,
    timestamp: Timestamp,
    eventId: UUID
  ): ShipmentTrackedEvent {
    return {
      eventId,
      eventType: 'SHIPMENT_TRACKED',
      timestamp,
      surface: LOGISTICS_SURFACE,
      operation: 'TrackShipment',
      surfaceVersion: LOGISTICS_SURFACE_VERSION,
      correlationId,
      causationId,
      shipmentId,
      currentStatus,
      currentLocation,
      estimatedDelivery,
      lastTrackingEvent
    };
  },

  deliveryConfirmed(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    shipmentId: ShipmentId,
    deliveredAt: Timestamp,
    signedBy: string,
    deliveryLocation: string,
    timestamp: Timestamp,
    eventId: UUID
  ): DeliveryConfirmedEvent {
    return {
      eventId,
      eventType: 'DELIVERY_CONFIRMED',
      timestamp,
      surface: LOGISTICS_SURFACE,
      operation: 'ConfirmDelivery',
      surfaceVersion: LOGISTICS_SURFACE_VERSION,
      correlationId,
      causationId,
      shipmentId,
      deliveredAt,
      signedBy,
      deliveryLocation
    };
  },

  transportScheduled(
    correlationId: CorrelationId,
    causationId: CausationId | null,
    transportOrderId: TransportOrderId,
    carrierId: CarrierId,
    scheduledDate: DateString,
    shipmentCount: number,
    totalStops: number,
    timestamp: Timestamp,
    eventId: UUID
  ): TransportScheduledEvent {
    return {
      eventId,
      eventType: 'TRANSPORT_SCHEDULED',
      timestamp,
      surface: LOGISTICS_SURFACE,
      operation: 'ScheduleTransport',
      surfaceVersion: LOGISTICS_SURFACE_VERSION,
      correlationId,
      causationId,
      transportOrderId,
      carrierId,
      scheduledDate,
      shipmentCount,
      totalStops
    };
  }
};

// ============================================================================
// CreateShipment Contract
// ============================================================================

/** Input for CreateShipment operation */
export interface CreateShipmentInput {
  readonly companyCode: CompanyCode;
  readonly shipmentType: ShipmentType;
  readonly referenceDocumentType: ReferenceDocumentType;
  readonly referenceDocumentNumber: string;
  readonly origin: ShipmentLocationInput;
  readonly destination: ShipmentLocationInput;
  readonly items: ShipmentItemInput[];
  readonly scheduledPickupDate: DateString;
  readonly scheduledDeliveryDate: DateString;
  readonly carrier?: CarrierInfo;
  readonly correlationId: CorrelationId;
}

/** Shipment location input */
export interface ShipmentLocationInput {
  readonly locationId: LocationId;
  readonly locationType: LocationType;
  readonly name: string;
  readonly address: Address;
  readonly contactName: string;
  readonly contactPhone: string;
  readonly contactEmail?: string;
}

/** Shipment item input */
export interface ShipmentItemInput {
  readonly materialId: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitOfMeasure: string;
  readonly weight: Weight;
  readonly volume: Volume;
  readonly lotNumber?: string;
  readonly serialNumber?: string;
}

/** Output for CreateShipment operation */
export interface CreateShipmentOutput {
  readonly shipment: Shipment;
  readonly event: ShipmentCreatedEvent;
}

/** CreateShipment precondition predicates */
export const CreateShipmentPreconditions = {
  hasCompanyCode(input: CreateShipmentInput): boolean {
    return input.companyCode !== undefined && input.companyCode.trim().length > 0;
  },

  hasReferenceDocument(input: CreateShipmentInput): boolean {
    return input.referenceDocumentNumber !== undefined && input.referenceDocumentNumber.trim().length > 0;
  },

  hasOrigin(input: CreateShipmentInput): boolean {
    return input.origin !== undefined && input.origin.address.addressLine1.trim().length > 0;
  },

  hasDestination(input: CreateShipmentInput): boolean {
    return input.destination !== undefined && input.destination.address.addressLine1.trim().length > 0;
  },

  hasItems(input: CreateShipmentInput): boolean {
    return input.items !== undefined && input.items.length > 0;
  },

  hasValidDates(input: CreateShipmentInput): boolean {
    return input.scheduledPickupDate <= input.scheduledDeliveryDate;
  },

  all(input: CreateShipmentInput): boolean {
    return (
      this.hasCompanyCode(input) &&
      this.hasReferenceDocument(input) &&
      this.hasOrigin(input) &&
      this.hasDestination(input) &&
      this.hasItems(input) &&
      this.hasValidDates(input)
    );
  }
};

/** CreateShipment postcondition predicates */
export const CreateShipmentPostconditions = {
  hasShipment(output: CreateShipmentOutput): boolean {
    return output.shipment !== undefined;
  },

  shipmentIsCreated(output: CreateShipmentOutput): boolean {
    return output.shipment.status === 'CREATED';
  },

  hasEvent(output: CreateShipmentOutput): boolean {
    return output.event !== undefined && output.event.eventType === 'SHIPMENT_CREATED';
  },

  all(input: CreateShipmentInput, output: CreateShipmentOutput): boolean {
    return (
      this.hasShipment(output) &&
      this.shipmentIsCreated(output) &&
      this.hasEvent(output)
    );
  }
};

/** CreateShipment contract implementation */
export class CreateShipmentContract {
  readonly name = 'CreateShipment';
  readonly surface = LOGISTICS_SURFACE;
  readonly version = LOGISTICS_SURFACE_VERSION;

  constructor(
    private readonly shipmentRepository: ShipmentRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: CreateShipmentInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!CreateShipmentPreconditions.hasCompanyCode(input)) {
      violations.push({
        field: 'companyCode',
        rule: 'required',
        message: 'Company code is required',
        severity: 'ERROR'
      });
    }

    if (!CreateShipmentPreconditions.hasReferenceDocument(input)) {
      violations.push({
        field: 'referenceDocumentNumber',
        rule: 'required',
        message: 'Reference document number is required',
        severity: 'ERROR'
      });
    }

    if (!CreateShipmentPreconditions.hasOrigin(input)) {
      violations.push({
        field: 'origin',
        rule: 'required',
        message: 'Origin location is required',
        severity: 'ERROR'
      });
    }

    if (!CreateShipmentPreconditions.hasDestination(input)) {
      violations.push({
        field: 'destination',
        rule: 'required',
        message: 'Destination location is required',
        severity: 'ERROR'
      });
    }

    if (!CreateShipmentPreconditions.hasItems(input)) {
      violations.push({
        field: 'items',
        rule: 'not_empty',
        message: 'At least one item is required',
        severity: 'ERROR'
      });
    }

    if (!CreateShipmentPreconditions.hasValidDates(input)) {
      violations.push({
        field: 'scheduledDates',
        rule: 'valid_range',
        message: 'Delivery date must be on or after pickup date',
        severity: 'ERROR'
      });
    }

    if (violations.length > 0) {
      return Results.failure(
        ErrorFactory.preconditionViolation(this.surface, this.name, violations)
      );
    }

    return Results.success(undefined);
  }

  async execute(input: CreateShipmentInput): Promise<Result<CreateShipmentOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<CreateShipmentOutput, SurfaceError>;
    }

    const timestamp = this.timestampProvider.now();
    const shipmentId = IdentityOperations.generateUUID();
    const eventId = IdentityOperations.generateUUID();

    // Calculate total weight and volume
    const totalWeight: Weight = {
      value: input.items.reduce((sum, item) => sum + item.weight.value * item.quantity, 0),
      unit: input.items[0]?.weight.unit || 'KG'
    };

    const totalVolume: Volume = {
      value: input.items.reduce((sum, item) => sum + item.volume.value * item.quantity, 0),
      unit: input.items[0]?.volume.unit || 'M3'
    };

    const items: ShipmentItem[] = input.items.map((item, index) => ({
      itemId: IdentityOperations.generateUUID(),
      materialId: item.materialId,
      description: item.description,
      quantity: item.quantity,
      unitOfMeasure: item.unitOfMeasure,
      weight: item.weight,
      volume: item.volume,
      lotNumber: item.lotNumber,
      serialNumber: item.serialNumber
    }));

    const shipment: Shipment = {
      shipmentId,
      companyCode: input.companyCode,
      shipmentType: input.shipmentType,
      status: 'CREATED',
      referenceDocumentType: input.referenceDocumentType,
      referenceDocumentNumber: input.referenceDocumentNumber,
      origin: input.origin,
      destination: input.destination,
      carrier: input.carrier || null,
      items,
      scheduledPickupDate: input.scheduledPickupDate,
      scheduledDeliveryDate: input.scheduledDeliveryDate,
      actualPickupDate: null,
      actualDeliveryDate: null,
      trackingNumber: null,
      proofOfDelivery: null,
      totalWeight,
      totalVolume,
      freightCost: null,
      trackingEvents: [],
      createdAt: timestamp,
      createdBy: 'SYSTEM'
    };

    const event = LogisticsEventFactory.shipmentCreated(
      input.correlationId,
      null,
      shipmentId,
      input.shipmentType,
      input.origin.name,
      input.destination.name,
      input.scheduledDeliveryDate,
      timestamp,
      eventId
    );

    return Results.success({ shipment, event });
  }

  checkPostconditions(input: CreateShipmentInput, output: CreateShipmentOutput): Result<void, ValidationError> {
    if (!CreateShipmentPostconditions.all(input, output)) {
      return Results.failure(
        ErrorFactory.businessRuleViolation(
          this.surface,
          this.name,
          'postcondition_violation',
          'Postcondition check failed'
        )
      );
    }
    return Results.success(undefined);
  }
}

// ============================================================================
// TrackShipment Contract
// ============================================================================

/** Input for TrackShipment operation */
export interface TrackShipmentInput {
  readonly shipmentId?: ShipmentId;
  readonly trackingNumber?: string;
  readonly correlationId: CorrelationId;
}

/** Output for TrackShipment operation */
export interface TrackShipmentOutput {
  readonly shipment: Shipment;
  readonly currentLocation: string;
  readonly estimatedDelivery: DateString | null;
  readonly trackingHistory: TrackingEvent[];
  readonly event: ShipmentTrackedEvent;
}

/** TrackShipment precondition predicates */
export const TrackShipmentPreconditions = {
  hasIdentifier(input: TrackShipmentInput): boolean {
    return (
      (input.shipmentId !== undefined && input.shipmentId.trim().length > 0) ||
      (input.trackingNumber !== undefined && input.trackingNumber.trim().length > 0)
    );
  },

  all(input: TrackShipmentInput): boolean {
    return this.hasIdentifier(input);
  }
};

/** TrackShipment contract implementation */
export class TrackShipmentContract {
  readonly name = 'TrackShipment';
  readonly surface = LOGISTICS_SURFACE;
  readonly version = LOGISTICS_SURFACE_VERSION;

  constructor(
    private readonly shipmentRepository: ShipmentRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: TrackShipmentInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!TrackShipmentPreconditions.hasIdentifier(input)) {
      violations.push({
        field: 'identifier',
        rule: 'required',
        message: 'Either shipment ID or tracking number is required',
        severity: 'ERROR'
      });
    }

    if (violations.length > 0) {
      return Results.failure(
        ErrorFactory.preconditionViolation(this.surface, this.name, violations)
      );
    }

    return Results.success(undefined);
  }

  async execute(input: TrackShipmentInput): Promise<Result<TrackShipmentOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<TrackShipmentOutput, SurfaceError>;
    }

    let shipmentResult: Result<Shipment, SurfaceError>;

    if (input.shipmentId) {
      shipmentResult = await this.shipmentRepository.getShipment(input.shipmentId);
    } else {
      shipmentResult = await this.shipmentRepository.getShipmentByTrackingNumber(input.trackingNumber!);
    }

    if (!shipmentResult.success) {
      return shipmentResult as Result<TrackShipmentOutput, SurfaceError>;
    }

    const shipment = shipmentResult.data;
    const timestamp = this.timestampProvider.now();
    const eventId = IdentityOperations.generateUUID();

    // Determine current location from tracking events
    const latestEvent = shipment.trackingEvents[shipment.trackingEvents.length - 1];
    const currentLocation = latestEvent?.location || shipment.origin.name;

    const event = LogisticsEventFactory.shipmentTracked(
      input.correlationId,
      null,
      shipment.shipmentId,
      shipment.status,
      currentLocation,
      shipment.scheduledDeliveryDate,
      latestEvent?.eventType || 'PICKED_UP',
      timestamp,
      eventId
    );

    return Results.success({
      shipment,
      currentLocation,
      estimatedDelivery: shipment.scheduledDeliveryDate,
      trackingHistory: shipment.trackingEvents,
      event
    });
  }
}

// ============================================================================
// ConfirmDelivery Contract
// ============================================================================

/** Input for ConfirmDelivery operation */
export interface ConfirmDeliveryInput {
  readonly shipmentId: ShipmentId;
  readonly signedBy: string;
  readonly deliveryNotes?: string;
  readonly photoEvidence?: string[];
  readonly correlationId: CorrelationId;
}

/** Output for ConfirmDelivery operation */
export interface ConfirmDeliveryOutput {
  readonly shipment: Shipment;
  readonly previousStatus: ShipmentStatus;
  readonly proofOfDelivery: ProofOfDelivery;
  readonly event: DeliveryConfirmedEvent;
}

/** ConfirmDelivery precondition predicates */
export const ConfirmDeliveryPreconditions = {
  hasShipmentId(input: ConfirmDeliveryInput): boolean {
    return input.shipmentId !== undefined && input.shipmentId.trim().length > 0;
  },

  hasSignedBy(input: ConfirmDeliveryInput): boolean {
    return input.signedBy !== undefined && input.signedBy.trim().length > 0;
  },

  all(input: ConfirmDeliveryInput): boolean {
    return this.hasShipmentId(input) && this.hasSignedBy(input);
  }
};

/** ConfirmDelivery contract implementation */
export class ConfirmDeliveryContract {
  readonly name = 'ConfirmDelivery';
  readonly surface = LOGISTICS_SURFACE;
  readonly version = LOGISTICS_SURFACE_VERSION;

  constructor(
    private readonly shipmentRepository: ShipmentRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: ConfirmDeliveryInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!ConfirmDeliveryPreconditions.hasShipmentId(input)) {
      violations.push({
        field: 'shipmentId',
        rule: 'required',
        message: 'Shipment ID is required',
        severity: 'ERROR'
      });
    }

    if (!ConfirmDeliveryPreconditions.hasSignedBy(input)) {
      violations.push({
        field: 'signedBy',
        rule: 'required',
        message: 'Signed by name is required',
        severity: 'ERROR'
      });
    }

    if (violations.length > 0) {
      return Results.failure(
        ErrorFactory.preconditionViolation(this.surface, this.name, violations)
      );
    }

    return Results.success(undefined);
  }

  async execute(input: ConfirmDeliveryInput): Promise<Result<ConfirmDeliveryOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<ConfirmDeliveryOutput, SurfaceError>;
    }

    const shipmentResult = await this.shipmentRepository.getShipment(input.shipmentId);
    if (!shipmentResult.success) {
      return shipmentResult as Result<ConfirmDeliveryOutput, SurfaceError>;
    }

    const existingShipment = shipmentResult.data;
    const previousStatus = existingShipment.status;

    // Check if transition is valid
    if (!isValidShipmentTransition(previousStatus, 'DELIVER')) {
      return Results.failure(
        ErrorFactory.invalidTransition(
          this.surface,
          this.name,
          previousStatus,
          'DELIVER'
        )
      );
    }

    const timestamp = this.timestampProvider.now();
    const eventId = IdentityOperations.generateUUID();

    const proofOfDelivery: ProofOfDelivery = {
      signedBy: input.signedBy,
      signatureTimestamp: timestamp,
      deliveryNotes: input.deliveryNotes,
      photoEvidence: input.photoEvidence
    };

    const deliveryEvent: TrackingEvent = {
      eventId: IdentityOperations.generateUUID(),
      eventType: 'DELIVERED',
      timestamp,
      location: existingShipment.destination.name,
      description: `Delivered and signed by ${input.signedBy}`,
      signedBy: input.signedBy
    };

    const updatedShipment: Shipment = {
      ...existingShipment,
      status: 'DELIVERED',
      actualDeliveryDate: this.timestampProvider.today(),
      proofOfDelivery,
      trackingEvents: [...existingShipment.trackingEvents, deliveryEvent]
    };

    const event = LogisticsEventFactory.deliveryConfirmed(
      input.correlationId,
      null,
      input.shipmentId,
      timestamp,
      input.signedBy,
      existingShipment.destination.name,
      timestamp,
      eventId
    );

    return Results.success({
      shipment: updatedShipment,
      previousStatus,
      proofOfDelivery,
      event
    });
  }
}

// ============================================================================
// ScheduleTransport Contract
// ============================================================================

/** Input for ScheduleTransport operation */
export interface ScheduleTransportInput {
  readonly companyCode: CompanyCode;
  readonly shipmentIds: ShipmentId[];
  readonly carrier: CarrierInfo;
  readonly vehicle?: VehicleInfo;
  readonly driver?: DriverInfo;
  readonly scheduledDate: DateString;
  readonly route: RouteInput;
  readonly correlationId: CorrelationId;
}

/** Route input */
export interface RouteInput {
  readonly stops: RouteStopInput[];
}

/** Route stop input */
export interface RouteStopInput {
  readonly locationId: LocationId;
  readonly locationType: LocationType;
  readonly address: Address;
  readonly stopType: StopType;
  readonly plannedArrival: Timestamp;
  readonly plannedDeparture: Timestamp;
}

/** Output for ScheduleTransport operation */
export interface ScheduleTransportOutput {
  readonly transportOrder: TransportOrder;
  readonly event: TransportScheduledEvent;
}

/** ScheduleTransport precondition predicates */
export const ScheduleTransportPreconditions = {
  hasCompanyCode(input: ScheduleTransportInput): boolean {
    return input.companyCode !== undefined && input.companyCode.trim().length > 0;
  },

  hasShipments(input: ScheduleTransportInput): boolean {
    return input.shipmentIds !== undefined && input.shipmentIds.length > 0;
  },

  hasCarrier(input: ScheduleTransportInput): boolean {
    return input.carrier !== undefined && input.carrier.carrierId.trim().length > 0;
  },

  hasRoute(input: ScheduleTransportInput): boolean {
    return input.route !== undefined && input.route.stops.length > 0;
  },

  all(input: ScheduleTransportInput): boolean {
    return (
      this.hasCompanyCode(input) &&
      this.hasShipments(input) &&
      this.hasCarrier(input) &&
      this.hasRoute(input)
    );
  }
};

/** ScheduleTransport contract implementation */
export class ScheduleTransportContract {
  readonly name = 'ScheduleTransport';
  readonly surface = LOGISTICS_SURFACE;
  readonly version = LOGISTICS_SURFACE_VERSION;

  constructor(
    private readonly transportOrderRepository: TransportOrderRepository,
    private readonly timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {}

  checkPreconditions(input: ScheduleTransportInput): Result<void, ValidationError> {
    const violations: Array<{ field: string; rule: string; message: string; severity: 'ERROR' | 'WARNING' }> = [];

    if (!ScheduleTransportPreconditions.hasCompanyCode(input)) {
      violations.push({
        field: 'companyCode',
        rule: 'required',
        message: 'Company code is required',
        severity: 'ERROR'
      });
    }

    if (!ScheduleTransportPreconditions.hasShipments(input)) {
      violations.push({
        field: 'shipmentIds',
        rule: 'not_empty',
        message: 'At least one shipment is required',
        severity: 'ERROR'
      });
    }

    if (!ScheduleTransportPreconditions.hasCarrier(input)) {
      violations.push({
        field: 'carrier',
        rule: 'required',
        message: 'Carrier information is required',
        severity: 'ERROR'
      });
    }

    if (!ScheduleTransportPreconditions.hasRoute(input)) {
      violations.push({
        field: 'route',
        rule: 'not_empty',
        message: 'Route with at least one stop is required',
        severity: 'ERROR'
      });
    }

    if (violations.length > 0) {
      return Results.failure(
        ErrorFactory.preconditionViolation(this.surface, this.name, violations)
      );
    }

    return Results.success(undefined);
  }

  async execute(input: ScheduleTransportInput): Promise<Result<ScheduleTransportOutput, SurfaceError>> {
    const preconditionResult = this.checkPreconditions(input);
    if (!preconditionResult.success) {
      return preconditionResult as Result<ScheduleTransportOutput, SurfaceError>;
    }

    const timestamp = this.timestampProvider.now();
    const transportOrderId = IdentityOperations.generateUUID();
    const routeId = IdentityOperations.generateUUID();
    const eventId = IdentityOperations.generateUUID();

    const stops: RouteStop[] = input.route.stops.map((stop, index) => ({
      sequence: index + 1,
      locationId: stop.locationId,
      locationType: stop.locationType,
      address: stop.address,
      stopType: stop.stopType,
      plannedArrival: stop.plannedArrival,
      plannedDeparture: stop.plannedDeparture
    }));

    const route: RouteInfo = {
      routeId,
      stops,
      totalDistance: 0, // Would be calculated by routing service
      distanceUnit: 'KM',
      estimatedTime: 0 // Would be calculated by routing service
    };

    const transportOrder: TransportOrder = {
      transportOrderId,
      companyCode: input.companyCode,
      status: 'SCHEDULED',
      shipmentIds: input.shipmentIds,
      carrier: input.carrier,
      vehicle: input.vehicle || null,
      driver: input.driver || null,
      route,
      scheduledDate: input.scheduledDate,
      estimatedDuration: 0,
      actualDuration: null,
      transportCost: { value: 0, currency: 'USD', precision: 2 },
      createdAt: timestamp,
      createdBy: 'SYSTEM'
    };

    const event = LogisticsEventFactory.transportScheduled(
      input.correlationId,
      null,
      transportOrderId,
      input.carrier.carrierId,
      input.scheduledDate,
      input.shipmentIds.length,
      stops.length,
      timestamp,
      eventId
    );

    return Results.success({ transportOrder, event });
  }
}

// ============================================================================
// Repository Interfaces
// ============================================================================

/** Shipment repository interface */
export interface ShipmentRepository {
  createShipment(shipment: Shipment): Promise<Result<Shipment, SurfaceError>>;
  getShipment(shipmentId: ShipmentId): Promise<Result<Shipment, SurfaceError>>;
  getShipmentByTrackingNumber(trackingNumber: string): Promise<Result<Shipment, SurfaceError>>;
  updateShipment(shipment: Shipment): Promise<Result<Shipment, SurfaceError>>;
}

/** Transport order repository interface */
export interface TransportOrderRepository {
  createTransportOrder(order: TransportOrder): Promise<Result<TransportOrder, SurfaceError>>;
  getTransportOrder(orderId: TransportOrderId): Promise<Result<TransportOrder, SurfaceError>>;
  updateTransportOrder(order: TransportOrder): Promise<Result<TransportOrder, SurfaceError>>;
}

// ============================================================================
// Logistics Surface
// ============================================================================

/** Logistics surface facade */
export interface LogisticsSurface {
  createShipment(input: CreateShipmentInput): Promise<Result<CreateShipmentOutput, SurfaceError>>;
  trackShipment(input: TrackShipmentInput): Promise<Result<TrackShipmentOutput, SurfaceError>>;
  confirmDelivery(input: ConfirmDeliveryInput): Promise<Result<ConfirmDeliveryOutput, SurfaceError>>;
  scheduleTransport(input: ScheduleTransportInput): Promise<Result<ScheduleTransportOutput, SurfaceError>>;
}

/** Default logistics surface implementation */
export class DefaultLogisticsSurface implements LogisticsSurface {
  private readonly createShipmentContract: CreateShipmentContract;
  private readonly trackShipmentContract: TrackShipmentContract;
  private readonly confirmDeliveryContract: ConfirmDeliveryContract;
  private readonly scheduleTransportContract: ScheduleTransportContract;

  constructor(
    shipmentRepository: ShipmentRepository,
    transportOrderRepository: TransportOrderRepository,
    timestampProvider: TimestampProvider = SystemTimestampProvider
  ) {
    this.createShipmentContract = new CreateShipmentContract(shipmentRepository, timestampProvider);
    this.trackShipmentContract = new TrackShipmentContract(shipmentRepository, timestampProvider);
    this.confirmDeliveryContract = new ConfirmDeliveryContract(shipmentRepository, timestampProvider);
    this.scheduleTransportContract = new ScheduleTransportContract(transportOrderRepository, timestampProvider);
  }

  async createShipment(input: CreateShipmentInput): Promise<Result<CreateShipmentOutput, SurfaceError>> {
    return this.createShipmentContract.execute(input);
  }

  async trackShipment(input: TrackShipmentInput): Promise<Result<TrackShipmentOutput, SurfaceError>> {
    return this.trackShipmentContract.execute(input);
  }

  async confirmDelivery(input: ConfirmDeliveryInput): Promise<Result<ConfirmDeliveryOutput, SurfaceError>> {
    return this.confirmDeliveryContract.execute(input);
  }

  async scheduleTransport(input: ScheduleTransportInput): Promise<Result<ScheduleTransportOutput, SurfaceError>> {
    return this.scheduleTransportContract.execute(input);
  }
}
