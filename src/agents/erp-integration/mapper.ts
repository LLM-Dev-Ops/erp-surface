/**
 * ERP Mapping and Transmission Logic
 *
 * Core logic for mapping Agentics artifacts to ERP-compatible payloads
 * and transmitting them to external ERP systems.
 *
 * This agent MAY:
 * - Map Agentics artifacts to ERP payloads
 * - Push records into ERP systems
 * - Pull reference data when explicitly requested
 * - Emit structured integration outcomes
 *
 * This agent MUST NOT:
 * - Execute inference
 * - Modify Agentics platform state
 * - Enforce business decisions
 * - Trigger orchestration
 *
 * @module agents/erp-integration/mapper
 */

import type { VendorCoverage, SurfaceDomain } from '../../registry';
import { registry } from '../../registry';
import type {
  ErpIntegrationInput,
  IntegrationOutcome,
  TransmissionResult,
  ErpTarget,
} from './types';
import { createError } from './types';

// =============================================================================
// VENDOR ADAPTERS
// =============================================================================

/**
 * Vendor-specific field mappings
 */
const VENDOR_FIELD_MAPPINGS: Record<keyof VendorCoverage, Record<string, string>> = {
  sap: {
    'id': 'DOCUMENT_NUMBER',
    'companyCode': 'BUKRS',
    'fiscalYear': 'GJAHR',
    'postingDate': 'BUDAT',
    'documentDate': 'BLDAT',
    'amount': 'DMBTR',
    'currency': 'WAERS',
    'reference': 'BKTXT',
    'employeeId': 'PERNR',
    'costCenter': 'KOSTL',
    'profitCenter': 'PRCTR',
  },
  oracle: {
    'id': 'DOCUMENT_ID',
    'companyCode': 'ORG_ID',
    'fiscalYear': 'FISCAL_YEAR',
    'postingDate': 'GL_DATE',
    'documentDate': 'INVOICE_DATE',
    'amount': 'AMOUNT',
    'currency': 'CURRENCY_CODE',
    'reference': 'DESCRIPTION',
    'employeeId': 'EMPLOYEE_NUMBER',
    'costCenter': 'COST_CENTER',
  },
  salesforce: {
    'id': 'Id',
    'name': 'Name',
    'companyCode': 'AccountId',
    'amount': 'Amount',
    'currency': 'CurrencyIsoCode',
    'reference': 'Description',
    'status': 'Status',
    'ownerId': 'OwnerId',
  },
  workday: {
    'id': 'Workday_ID',
    'employeeId': 'Employee_ID',
    'costCenter': 'Cost_Center_Reference',
    'profitCenter': 'Profit_Center_Reference',
    'companyCode': 'Company_Reference',
    'amount': 'Amount',
    'currency': 'Currency_Reference',
    'postingDate': 'Effective_Date',
  },
  dynamics: {
    'id': 'recId',
    'companyCode': 'DataAreaId',
    'fiscalYear': 'FiscalYear',
    'postingDate': 'TransDate',
    'amount': 'AmountMST',
    'currency': 'CurrencyCode',
    'reference': 'Txt',
    'costCenter': 'DefaultDimension',
  },
  netsuite: {
    'id': 'internalid',
    'companyCode': 'subsidiary',
    'postingDate': 'trandate',
    'amount': 'amount',
    'currency': 'currency',
    'reference': 'memo',
    'employeeId': 'employee',
  },
  servicenow: {
    'id': 'sys_id',
    'reference': 'number',
    'description': 'short_description',
    'status': 'state',
    'priority': 'priority',
    'assignee': 'assigned_to',
    'category': 'category',
  },
};

/**
 * Domain-specific entity mappings
 */
const DOMAIN_ENTITY_MAPPINGS: Record<SurfaceDomain, string[]> = {
  finance: ['JournalEntry', 'Invoice', 'Payment', 'Account', 'Budget'],
  procurement: ['PurchaseOrder', 'Supplier', 'Contract', 'Requisition'],
  hcm: ['Employee', 'Position', 'Payroll', 'TimeEntry', 'Benefits'],
  'supply-chain': ['Inventory', 'Shipment', 'Warehouse', 'Material'],
  customer: ['Account', 'Contact', 'Opportunity', 'Quote', 'Case'],
  service: ['Incident', 'ChangeRequest', 'Asset', 'Workflow'],
};

// =============================================================================
// MAPPING FUNCTIONS
// =============================================================================

/**
 * Maps an Agentics payload to ERP-compatible format
 */
export function mapToErpPayload(
  payload: Record<string, unknown>,
  target: ErpTarget
): Record<string, unknown> {
  const vendorMappings = VENDOR_FIELD_MAPPINGS[target.vendor];
  const mappedPayload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    // Apply vendor-specific mapping if available
    const mappedKey = vendorMappings[key] || key;
    mappedPayload[mappedKey] = transformValue(value, key, target.vendor);
  }

  // Add vendor-specific metadata
  mappedPayload['_erp_metadata'] = {
    vendor: target.vendor,
    domain: target.domain,
    entityType: target.entityType,
    mappedAt: new Date().toISOString(),
    sourceFormat: 'agentics',
  };

  return mappedPayload;
}

/**
 * Transforms a value for vendor compatibility
 */
function transformValue(
  value: unknown,
  fieldName: string,
  vendor: keyof VendorCoverage
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Date transformations
  if (fieldName.toLowerCase().includes('date')) {
    return formatDateForVendor(value, vendor);
  }

  // Amount/currency transformations
  if (fieldName.toLowerCase().includes('amount')) {
    return formatAmountForVendor(value, vendor);
  }

  return value;
}

/**
 * Formats a date for vendor compatibility
 */
function formatDateForVendor(value: unknown, vendor: keyof VendorCoverage): string {
  const date = typeof value === 'string' ? new Date(value) : value as Date;

  switch (vendor) {
    case 'sap':
      // SAP uses YYYYMMDD format
      return date.toISOString().slice(0, 10).replace(/-/g, '');
    case 'oracle':
    case 'dynamics':
      // Oracle/Dynamics use YYYY-MM-DD
      return date.toISOString().slice(0, 10);
    default:
      // ISO 8601 for others
      return date.toISOString();
  }
}

/**
 * Formats an amount for vendor compatibility
 */
function formatAmountForVendor(value: unknown, vendor: keyof VendorCoverage): number | string {
  const amount = typeof value === 'string' ? parseFloat(value) : value as number;

  switch (vendor) {
    case 'sap':
      // SAP stores amounts in smallest unit (cents)
      return Math.round(amount * 100);
    default:
      return amount;
  }
}

/**
 * Maps an ERP response back to Agentics format
 */
export function mapFromErpResponse(
  response: Record<string, unknown>,
  target: ErpTarget
): Record<string, unknown> {
  const vendorMappings = VENDOR_FIELD_MAPPINGS[target.vendor];
  const reverseMappings: Record<string, string> = {};

  // Build reverse mapping
  for (const [agenticsKey, erpKey] of Object.entries(vendorMappings)) {
    reverseMappings[erpKey] = agenticsKey;
  }

  const mappedResponse: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(response)) {
    if (key === '_erp_metadata') continue; // Skip metadata

    const mappedKey = reverseMappings[key] || key;
    mappedResponse[mappedKey] = value;
  }

  return mappedResponse;
}

// =============================================================================
// TRANSMISSION LOGIC
// =============================================================================

/**
 * Transmission context
 */
export interface TransmissionContext {
  readonly target: ErpTarget;
  readonly dryRun: boolean;
  readonly timeoutMs: number;
}

/**
 * Simulates transmission to ERP system
 *
 * NOTE: This is simulation mode only. In execution mode,
 * this would use vendor-specific connectors.
 */
export async function transmitToErp(
  payload: Record<string, unknown>,
  context: TransmissionContext
): Promise<TransmissionResult> {
  const sourceRecordId = (payload['id'] || payload['_source_id'] || 'unknown') as string;

  // Validate entity type exists in domain
  const domainEntities = DOMAIN_ENTITY_MAPPINGS[context.target.domain];
  if (!domainEntities.includes(context.target.entityType)) {
    return {
      sourceRecordId,
      success: false,
      error: `Entity type '${context.target.entityType}' not valid for domain '${context.target.domain}'`,
    };
  }

  // Dry run mode - validate only
  if (context.dryRun) {
    return {
      sourceRecordId,
      targetRecordId: `dry-run-${Date.now()}`,
      success: true,
      warnings: ['Dry run mode - no actual transmission'],
    };
  }

  // Simulation mode - simulate success
  if (process.env['ERP_SURFACE_MODE'] === 'simulation') {
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 50));

    // Generate simulated target record ID
    const targetRecordId = generateSimulatedRecordId(context.target.vendor);

    return {
      sourceRecordId,
      targetRecordId,
      success: true,
    };
  }

  // Execution mode would use vendor connectors
  // This is a placeholder for binding layer integration
  throw createError('UNAUTHORIZED', {
    message: 'Execution mode requires binding layer integration',
  });
}

/**
 * Generates a simulated record ID for testing
 */
function generateSimulatedRecordId(vendor: keyof VendorCoverage): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);

  switch (vendor) {
    case 'sap':
      return `SAP${timestamp.toUpperCase()}${random.toUpperCase()}`;
    case 'oracle':
      return `ORA-${timestamp}-${random}`;
    case 'salesforce':
      return `001${timestamp}${random}`.substring(0, 18);
    case 'workday':
      return `WD-${timestamp}-${random}`;
    case 'dynamics':
      return `DYN-${timestamp}-${random}`;
    case 'netsuite':
      return `NS-${timestamp}-${random}`;
    case 'servicenow':
      return `SN-${timestamp}-${random}`;
    default:
      return `ERP-${timestamp}-${random}`;
  }
}

/**
 * Pulls reference data from ERP (read-only)
 *
 * NOTE: This is simulation mode only.
 */
export async function pullFromErp(
  query: Record<string, unknown>,
  context: TransmissionContext
): Promise<TransmissionResult> {
  const queryId = JSON.stringify(query);

  // Validate entity type
  const domainEntities = DOMAIN_ENTITY_MAPPINGS[context.target.domain];
  if (!domainEntities.includes(context.target.entityType)) {
    return {
      sourceRecordId: queryId,
      success: false,
      error: `Entity type '${context.target.entityType}' not valid for domain '${context.target.domain}'`,
    };
  }

  // Simulation mode - return simulated reference data
  if (process.env['ERP_SURFACE_MODE'] === 'simulation') {
    await new Promise(resolve => setTimeout(resolve, 30));

    return {
      sourceRecordId: queryId,
      targetRecordId: `ref-${Date.now().toString(36)}`,
      success: true,
    };
  }

  throw createError('UNAUTHORIZED', {
    message: 'Execution mode requires binding layer integration',
  });
}

/**
 * Validates a mapping without transmission
 */
export async function validateMapping(
  payload: Record<string, unknown>,
  target: ErpTarget
): Promise<TransmissionResult> {
  const sourceRecordId = (payload['id'] || 'validation') as string;

  // Validate entity type
  const domainEntities = DOMAIN_ENTITY_MAPPINGS[target.domain];
  if (!domainEntities.includes(target.entityType)) {
    return {
      sourceRecordId,
      success: false,
      error: `Entity type '${target.entityType}' not valid for domain '${target.domain}'`,
    };
  }

  // Check if surface exists in registry
  const surfaceId = `${target.domain}.${target.entityType.toLowerCase().replace(/([A-Z])/g, '-$1').slice(1)}`;
  const surface = registry.get(surfaceId);

  const warnings: string[] = [];
  if (!surface) {
    warnings.push(`Surface '${surfaceId}' not found in registry - using default mapping`);
  }

  // Validate required fields
  const mappedPayload = mapToErpPayload(payload, target);
  if (Object.keys(mappedPayload).length <= 1) { // Only metadata
    return {
      sourceRecordId,
      success: false,
      error: 'Payload has no mappable fields',
    };
  }

  return {
    sourceRecordId,
    targetRecordId: 'validation-only',
    success: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Inspects ERP endpoint status
 */
export async function inspectErpEndpoint(
  target: ErpTarget
): Promise<TransmissionResult> {
  const inspectionId = `${target.vendor}:${target.domain}:${target.entityType}`;

  // Validate domain/entity
  const domainEntities = DOMAIN_ENTITY_MAPPINGS[target.domain];
  if (!domainEntities.includes(target.entityType)) {
    return {
      sourceRecordId: inspectionId,
      success: false,
      error: `Entity type '${target.entityType}' not valid for domain '${target.domain}'`,
    };
  }

  // In simulation mode, always return healthy
  return {
    sourceRecordId: inspectionId,
    targetRecordId: `endpoint-${target.vendor}`,
    success: true,
    warnings: process.env['ERP_SURFACE_MODE'] === 'simulation'
      ? ['Simulation mode - endpoint status simulated']
      : undefined,
  };
}

/**
 * Processes a batch of records for integration
 */
export async function processBatch(
  input: ErpIntegrationInput
): Promise<IntegrationOutcome> {
  const transmissions: TransmissionResult[] = [];
  const context: TransmissionContext = {
    target: input.target,
    dryRun: input.dryRun ?? false,
    timeoutMs: input.timeoutMs ?? 30000,
  };

  switch (input.operation) {
    case 'push': {
      if (input.payload) {
        const records = Array.isArray(input.payload) ? input.payload : [input.payload];
        for (const record of records) {
          const mappedPayload = mapToErpPayload(record as Record<string, unknown>, input.target);
          const result = await transmitToErp(mappedPayload, context);
          transmissions.push(result);
        }
      }
      break;
    }

    case 'pull': {
      if (input.query) {
        const result = await pullFromErp(input.query, context);
        transmissions.push(result);
      }
      break;
    }

    case 'sync': {
      // Sync is a combination of push and pull
      if (input.payload) {
        const records = Array.isArray(input.payload) ? input.payload : [input.payload];
        for (const record of records) {
          const mappedPayload = mapToErpPayload(record as Record<string, unknown>, input.target);
          const result = await transmitToErp(mappedPayload, context);
          transmissions.push(result);
        }
      }
      break;
    }

    case 'validate': {
      if (input.payload) {
        const records = Array.isArray(input.payload) ? input.payload : [input.payload];
        for (const record of records) {
          const result = await validateMapping(record as Record<string, unknown>, input.target);
          transmissions.push(result);
        }
      }
      break;
    }

    case 'inspect': {
      const result = await inspectErpEndpoint(input.target);
      transmissions.push(result);
      break;
    }
  }

  const recordsSucceeded = transmissions.filter(t => t.success).length;
  const recordsFailed = transmissions.filter(t => !t.success).length;

  return {
    recordsProcessed: transmissions.length,
    recordsSucceeded,
    recordsFailed,
    transmissions,
  };
}
