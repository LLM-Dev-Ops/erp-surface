/**
 * Asset Service Surface Contracts
 *
 * Contract definitions for IT asset management operations.
 * Each contract defines typed inputs, outputs, preconditions, postconditions,
 * state transitions, observable events, and error types.
 */

import {
  UUID,
  UserId,
  Identifier,
  Timestamp,
  DateString,
  CorrelationId,
  EntityReference,
  OrgUnitReference,
  Result,
  ValidationResult,
  ValidationViolation,
  StateTransitionResult,
  SurfaceError,
  ValidationError,
  StateError,
  ErrorFactory
} from '../../../common';

// ============================================================================
// Surface Constants
// ============================================================================

const SURFACE_NAME = 'AssetServiceSurface';

// ============================================================================
// Asset State Machine
// ============================================================================

/** Asset lifecycle states */
export type AssetState =
  | 'ORDERED'
  | 'RECEIVED'
  | 'IN_STOCK'
  | 'DEPLOYED'
  | 'IN_MAINTENANCE'
  | 'RETIRED'
  | 'DISPOSED';

/** Valid asset state transitions */
export const AssetStateTransitions: Record<AssetState, AssetState[]> = {
  ORDERED: ['RECEIVED'],
  RECEIVED: ['IN_STOCK'],
  IN_STOCK: ['DEPLOYED', 'RETIRED'],
  DEPLOYED: ['IN_STOCK', 'IN_MAINTENANCE', 'RETIRED'],
  IN_MAINTENANCE: ['DEPLOYED', 'IN_STOCK', 'RETIRED'],
  RETIRED: ['DISPOSED'],
  DISPOSED: []
};

/** Check if a state transition is valid */
export const isValidAssetTransition = (
  from: AssetState,
  to: AssetState
): boolean => {
  return AssetStateTransitions[from].includes(to);
};

/** Asset state machine */
export const AssetStateMachine = {
  getValidTransitions(state: AssetState): AssetState[] {
    return AssetStateTransitions[state];
  },

  canTransition(from: AssetState, to: AssetState): boolean {
    return isValidAssetTransition(from, to);
  },

  getTerminalStates(): AssetState[] {
    return ['DISPOSED'];
  },

  isTerminal(state: AssetState): boolean {
    return state === 'DISPOSED';
  },

  getInitialState(): AssetState {
    return 'ORDERED';
  }
};

// ============================================================================
// Asset Types
// ============================================================================

/** Asset categories */
export type AssetCategory =
  | 'HARDWARE'
  | 'SOFTWARE'
  | 'NETWORK'
  | 'VIRTUAL'
  | 'CLOUD'
  | 'FACILITY';

/** Hardware asset types */
export type HardwareType =
  | 'SERVER'
  | 'WORKSTATION'
  | 'LAPTOP'
  | 'MOBILE_DEVICE'
  | 'PRINTER'
  | 'NETWORK_DEVICE'
  | 'STORAGE'
  | 'PERIPHERAL';

/** Software asset types */
export type SoftwareType =
  | 'OPERATING_SYSTEM'
  | 'APPLICATION'
  | 'DATABASE'
  | 'MIDDLEWARE'
  | 'SECURITY'
  | 'UTILITY';

// ============================================================================
// Asset Entity
// ============================================================================

/** Core asset entity */
export interface Asset {
  readonly id: UUID;
  readonly assetTag: string;
  readonly name: string;
  readonly description: string;
  readonly category: AssetCategory;
  readonly type: string;  // HardwareType | SoftwareType based on category
  readonly state: AssetState;
  readonly manufacturer?: string;
  readonly model?: string;
  readonly serialNumber?: string;
  readonly assignedTo?: UserId;
  readonly location?: AssetLocation;
  readonly orgUnit: OrgUnitReference;
  readonly purchaseInfo?: PurchaseInfo;
  readonly warrantyInfo?: WarrantyInfo;
  readonly maintenanceInfo?: MaintenanceInfo;
  readonly relationships: AssetRelationship[];
  readonly customAttributes: Record<string, string>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly retiredAt?: Timestamp;
  readonly disposedAt?: Timestamp;
  readonly version: number;
}

/** Asset location */
export interface AssetLocation {
  readonly siteId: Identifier;
  readonly building?: string;
  readonly floor?: string;
  readonly room?: string;
  readonly rack?: string;
  readonly position?: string;
}

/** Purchase information */
export interface PurchaseInfo {
  readonly purchaseOrderId: Identifier;
  readonly vendorId: Identifier;
  readonly purchaseDate: DateString;
  readonly cost: number;
  readonly currency: string;
  readonly invoiceNumber?: string;
}

/** Warranty information */
export interface WarrantyInfo {
  readonly warrantyType: string;
  readonly startDate: DateString;
  readonly endDate: DateString;
  readonly vendorId: Identifier;
  readonly contractNumber?: string;
  readonly supportLevel?: string;
}

/** Maintenance information */
export interface MaintenanceInfo {
  readonly lastMaintenanceDate?: DateString;
  readonly nextMaintenanceDate?: DateString;
  readonly maintenanceSchedule?: string;
  readonly maintenanceProvider?: Identifier;
}

/** Asset relationship */
export interface AssetRelationship {
  readonly relationshipId: UUID;
  readonly relationshipType: RelationshipType;
  readonly relatedAssetId: UUID;
  readonly direction: 'OUTGOING' | 'INCOMING';
  readonly attributes?: Record<string, string>;
}

/** Relationship types */
export type RelationshipType =
  | 'PARENT_OF'
  | 'CHILD_OF'
  | 'DEPENDS_ON'
  | 'USED_BY'
  | 'CONNECTED_TO'
  | 'HOSTED_ON'
  | 'RUNS_ON'
  | 'BACKUP_OF';

// ============================================================================
// Event Types
// ============================================================================

/** Asset registered event */
export interface AssetRegisteredEvent {
  readonly eventType: 'ASSET_REGISTERED';
  readonly assetId: UUID;
  readonly assetTag: string;
  readonly category: AssetCategory;
  readonly registeredBy: UserId;
}

/** Asset updated event */
export interface AssetUpdatedEvent {
  readonly eventType: 'ASSET_UPDATED';
  readonly assetId: UUID;
  readonly assetTag: string;
  readonly fieldsUpdated: string[];
  readonly updatedBy: UserId;
}

/** Asset retired event */
export interface AssetRetiredEvent {
  readonly eventType: 'ASSET_RETIRED';
  readonly assetId: UUID;
  readonly assetTag: string;
  readonly retiredBy: UserId;
  readonly reason: string;
}

/** Asset relationships retrieved event */
export interface AssetRelationshipsRetrievedEvent {
  readonly eventType: 'ASSET_RELATIONSHIPS_RETRIEVED';
  readonly assetId: UUID;
  readonly relationshipCount: number;
}

// ============================================================================
// RegisterAssetContract
// ============================================================================

/** Input for registering an asset */
export interface RegisterAssetInput {
  readonly name: string;
  readonly description: string;
  readonly category: AssetCategory;
  readonly type: string;
  readonly manufacturer?: string;
  readonly model?: string;
  readonly serialNumber?: string;
  readonly orgUnit: OrgUnitReference;
  readonly location?: AssetLocation;
  readonly purchaseInfo?: PurchaseInfo;
  readonly warrantyInfo?: WarrantyInfo;
  readonly customAttributes?: Record<string, string>;
  readonly registeredBy: UserId;
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Output from registering an asset */
export interface RegisterAssetOutput {
  readonly asset: Asset;
  readonly events: AssetRegisteredEvent[];
}

/** RegisterAsset preconditions */
export const RegisterAssetPreconditions = {
  /** Validate name is not empty */
  nameNotEmpty(input: RegisterAssetInput): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!input.name || input.name.trim().length === 0) {
      violations.push({
        field: 'name',
        rule: 'required',
        message: 'Asset name is required',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Validate category is valid */
  validCategory(input: RegisterAssetInput): ValidationResult {
    const violations: ValidationViolation[] = [];
    const validCategories: AssetCategory[] = ['HARDWARE', 'SOFTWARE', 'NETWORK', 'VIRTUAL', 'CLOUD', 'FACILITY'];
    if (!validCategories.includes(input.category)) {
      violations.push({
        field: 'category',
        rule: 'enum',
        message: `Invalid asset category: ${input.category}`,
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Validate serial number uniqueness if provided */
  serialNumberUnique(
    input: RegisterAssetInput,
    isSerialUnique: (serial: string) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (input.serialNumber && !isSerialUnique(input.serialNumber)) {
      violations.push({
        field: 'serialNumber',
        rule: 'unique',
        message: `Serial number ${input.serialNumber} already exists`,
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Validate registrar has permission */
  registrarHasPermission(
    registeredBy: UserId,
    hasPermission: (userId: UserId, permission: string) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!hasPermission(registeredBy, 'asset.register')) {
      violations.push({
        field: 'registeredBy',
        rule: 'permission',
        message: 'User does not have permission to register assets',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  }
};

/** RegisterAsset postconditions */
export const RegisterAssetPostconditions = {
  /** Verify asset is in initial state */
  assetInOrderedState(output: RegisterAssetOutput): boolean {
    return output.asset.state === 'ORDERED';
  },

  /** Verify asset tag is assigned */
  assetTagAssigned(output: RegisterAssetOutput): boolean {
    return output.asset.assetTag !== undefined && output.asset.assetTag.length > 0;
  },

  /** Verify registered event is emitted */
  registeredEventEmitted(output: RegisterAssetOutput): boolean {
    return output.events.some(e => e.eventType === 'ASSET_REGISTERED');
  }
};

/** RegisterAsset contract */
export interface RegisterAssetContract {
  readonly name: 'RegisterAsset';
  readonly surface: typeof SURFACE_NAME;
  readonly input: RegisterAssetInput;
  readonly output: RegisterAssetOutput;
  readonly preconditions: typeof RegisterAssetPreconditions;
  readonly postconditions: typeof RegisterAssetPostconditions;
  readonly errors: ValidationError;
  readonly events: AssetRegisteredEvent[];
}

// ============================================================================
// UpdateAssetContract
// ============================================================================

/** Input for updating an asset */
export interface UpdateAssetInput {
  readonly assetId: UUID;
  readonly updates: Partial<{
    readonly name: string;
    readonly description: string;
    readonly location: AssetLocation;
    readonly assignedTo: UserId | null;
    readonly maintenanceInfo: MaintenanceInfo;
    readonly customAttributes: Record<string, string>;
  }>;
  readonly updatedBy: UserId;
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Output from updating an asset */
export interface UpdateAssetOutput {
  readonly asset: Asset;
  readonly fieldsUpdated: string[];
  readonly events: AssetUpdatedEvent[];
}

/** UpdateAsset preconditions */
export const UpdateAssetPreconditions = {
  /** Asset must exist */
  assetExists(assetId: UUID, getAsset: (id: UUID) => Asset | null): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!getAsset(assetId)) {
      violations.push({
        field: 'assetId',
        rule: 'exists',
        message: 'Asset does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Asset must not be disposed */
  assetNotDisposed(asset: Asset): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (asset.state === 'DISPOSED') {
      violations.push({
        field: 'state',
        rule: 'notDisposed',
        message: 'Cannot update disposed asset',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Updater has permission */
  updaterHasPermission(
    updatedBy: UserId,
    hasPermission: (userId: UserId, permission: string) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!hasPermission(updatedBy, 'asset.update')) {
      violations.push({
        field: 'updatedBy',
        rule: 'permission',
        message: 'User does not have permission to update assets',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  }
};

/** UpdateAsset postconditions */
export const UpdateAssetPostconditions = {
  /** Verify version incremented */
  versionIncremented(asset: Asset, previousVersion: number): boolean {
    return asset.version === previousVersion + 1;
  },

  /** Verify updated event emitted */
  updatedEventEmitted(output: UpdateAssetOutput): boolean {
    return output.events.some(e => e.eventType === 'ASSET_UPDATED');
  }
};

/** UpdateAsset contract */
export interface UpdateAssetContract {
  readonly name: 'UpdateAsset';
  readonly surface: typeof SURFACE_NAME;
  readonly input: UpdateAssetInput;
  readonly output: UpdateAssetOutput;
  readonly preconditions: typeof UpdateAssetPreconditions;
  readonly postconditions: typeof UpdateAssetPostconditions;
  readonly errors: ValidationError | StateError;
  readonly events: AssetUpdatedEvent[];
}

// ============================================================================
// RetireAssetContract
// ============================================================================

/** Input for retiring an asset */
export interface RetireAssetInput {
  readonly assetId: UUID;
  readonly retiredBy: UserId;
  readonly reason: string;
  readonly disposalMethod?: DisposalMethod;
  readonly disposalDate?: DateString;
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Disposal methods */
export type DisposalMethod =
  | 'DONATE'
  | 'RECYCLE'
  | 'SELL'
  | 'DESTROY'
  | 'RETURN_TO_VENDOR';

/** Output from retiring an asset */
export interface RetireAssetOutput {
  readonly asset: Asset;
  readonly stateTransition: StateTransitionResult<AssetState>;
  readonly events: AssetRetiredEvent[];
}

/** RetireAsset preconditions */
export const RetireAssetPreconditions = {
  /** Asset must exist */
  assetExists(assetId: UUID, getAsset: (id: UUID) => Asset | null): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!getAsset(assetId)) {
      violations.push({
        field: 'assetId',
        rule: 'exists',
        message: 'Asset does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Asset must be in retirable state */
  assetInRetirableState(asset: Asset): ValidationResult {
    const violations: ValidationViolation[] = [];
    const canRetire = AssetStateMachine.canTransition(asset.state, 'RETIRED');
    if (!canRetire) {
      violations.push({
        field: 'state',
        rule: 'validTransition',
        message: `Cannot retire asset in state ${asset.state}`,
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Reason is provided */
  reasonProvided(input: RetireAssetInput): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!input.reason || input.reason.trim().length === 0) {
      violations.push({
        field: 'reason',
        rule: 'required',
        message: 'Retirement reason is required',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Retirer has permission */
  retirerHasPermission(
    retiredBy: UserId,
    hasPermission: (userId: UserId, permission: string) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!hasPermission(retiredBy, 'asset.retire')) {
      violations.push({
        field: 'retiredBy',
        rule: 'permission',
        message: 'User does not have permission to retire assets',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  }
};

/** RetireAsset postconditions */
export const RetireAssetPostconditions = {
  /** Verify asset is retired */
  assetIsRetired(output: RetireAssetOutput): boolean {
    return output.asset.state === 'RETIRED';
  },

  /** Verify retired timestamp set */
  retiredTimestampSet(output: RetireAssetOutput): boolean {
    return output.asset.retiredAt !== undefined;
  },

  /** Verify retired event emitted */
  retiredEventEmitted(output: RetireAssetOutput): boolean {
    return output.events.some(e => e.eventType === 'ASSET_RETIRED');
  }
};

/** RetireAsset contract */
export interface RetireAssetContract {
  readonly name: 'RetireAsset';
  readonly surface: typeof SURFACE_NAME;
  readonly input: RetireAssetInput;
  readonly output: RetireAssetOutput;
  readonly preconditions: typeof RetireAssetPreconditions;
  readonly postconditions: typeof RetireAssetPostconditions;
  readonly errors: ValidationError | StateError;
  readonly events: AssetRetiredEvent[];
}

// ============================================================================
// GetAssetRelationshipsContract
// ============================================================================

/** Input for getting asset relationships */
export interface GetAssetRelationshipsInput {
  readonly assetId: UUID;
  readonly relationshipTypes?: RelationshipType[];
  readonly direction?: 'OUTGOING' | 'INCOMING' | 'BOTH';
  readonly depth?: number;  // For traversing relationship graph
  readonly requestedBy: UserId;
  readonly correlationId: CorrelationId;
  readonly timestamp: Timestamp;
}

/** Output from getting asset relationships */
export interface GetAssetRelationshipsOutput {
  readonly assetId: UUID;
  readonly relationships: AssetRelationship[];
  readonly relatedAssets: Asset[];
  readonly graphDepth: number;
  readonly events: AssetRelationshipsRetrievedEvent[];
}

/** GetAssetRelationships preconditions */
export const GetAssetRelationshipsPreconditions = {
  /** Asset must exist */
  assetExists(assetId: UUID, getAsset: (id: UUID) => Asset | null): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!getAsset(assetId)) {
      violations.push({
        field: 'assetId',
        rule: 'exists',
        message: 'Asset does not exist',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Depth is reasonable */
  validDepth(input: GetAssetRelationshipsInput): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (input.depth !== undefined && (input.depth < 1 || input.depth > 10)) {
      violations.push({
        field: 'depth',
        rule: 'range',
        message: 'Relationship depth must be between 1 and 10',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  },

  /** Requester has permission */
  requesterHasPermission(
    requestedBy: UserId,
    hasPermission: (userId: UserId, permission: string) => boolean
  ): ValidationResult {
    const violations: ValidationViolation[] = [];
    if (!hasPermission(requestedBy, 'asset.read')) {
      violations.push({
        field: 'requestedBy',
        rule: 'permission',
        message: 'User does not have permission to view assets',
        severity: 'ERROR'
      });
    }
    return { valid: violations.length === 0, violations };
  }
};

/** GetAssetRelationships postconditions */
export const GetAssetRelationshipsPostconditions = {
  /** Verify relationships are returned */
  relationshipsReturned(output: GetAssetRelationshipsOutput): boolean {
    return Array.isArray(output.relationships);
  },

  /** Verify related assets are populated */
  relatedAssetsPopulated(output: GetAssetRelationshipsOutput): boolean {
    return output.relationships.length === 0 ||
           output.relatedAssets.length > 0;
  }
};

/** GetAssetRelationships contract */
export interface GetAssetRelationshipsContract {
  readonly name: 'GetAssetRelationships';
  readonly surface: typeof SURFACE_NAME;
  readonly input: GetAssetRelationshipsInput;
  readonly output: GetAssetRelationshipsOutput;
  readonly preconditions: typeof GetAssetRelationshipsPreconditions;
  readonly postconditions: typeof GetAssetRelationshipsPostconditions;
  readonly errors: ValidationError;
  readonly events: AssetRelationshipsRetrievedEvent[];
}

// ============================================================================
// Surface Definition
// ============================================================================

/** AssetServiceSurface contract collection */
export interface AssetServiceSurface {
  readonly name: typeof SURFACE_NAME;
  readonly version: '1.0.0';
  readonly contracts: {
    readonly RegisterAsset: RegisterAssetContract;
    readonly UpdateAsset: UpdateAssetContract;
    readonly RetireAsset: RetireAssetContract;
    readonly GetAssetRelationships: GetAssetRelationshipsContract;
  };
}

/** Error factory for asset service surface */
export const AssetErrorFactory = {
  /** Create asset not found error */
  assetNotFound(assetId: UUID, operation: string): ValidationError {
    return ErrorFactory.preconditionViolation(
      SURFACE_NAME,
      operation,
      [{
        field: 'assetId',
        rule: 'exists',
        message: `Asset ${assetId} not found`,
        severity: 'ERROR'
      }]
    );
  },

  /** Create invalid state transition error */
  invalidStateTransition(
    currentState: AssetState,
    targetState: AssetState,
    operation: string
  ): StateError {
    return ErrorFactory.invalidTransition(
      SURFACE_NAME,
      operation,
      currentState,
      targetState
    );
  },

  /** Create duplicate serial number error */
  duplicateSerialNumber(serialNumber: string, operation: string): ValidationError {
    return ErrorFactory.businessRuleViolation(
      SURFACE_NAME,
      operation,
      'unique_serial',
      `Serial number ${serialNumber} already exists`
    );
  },

  /** Create unauthorized error */
  unauthorized(userId: UserId, operation: string, permission: string): ValidationError {
    return ErrorFactory.preconditionViolation(
      SURFACE_NAME,
      operation,
      [{
        field: 'authorization',
        rule: 'permission',
        message: `User ${userId} lacks permission: ${permission}`,
        severity: 'ERROR'
      }]
    );
  }
};
