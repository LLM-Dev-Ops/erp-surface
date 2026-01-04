/**
 * Surface Registry for ERP Surface Contracts
 *
 * Central registry for surface discovery and composition with platform.
 * Supports binding interface publication for Agentics Platform Core.
 */

import { SemanticVersion } from '../common/types/identity';

/** Surface domain */
export type SurfaceDomain =
  | 'finance'
  | 'procurement'
  | 'hcm'
  | 'supply-chain'
  | 'customer'
  | 'service';

/** Surface registration */
export interface SurfaceRegistration {
  /** Surface identifier */
  readonly surfaceId: string;

  /** Surface name */
  readonly name: string;

  /** Surface version */
  readonly version: SemanticVersion;

  /** Domain */
  readonly domain: SurfaceDomain;

  /** Description */
  readonly description: string;

  /** Operations provided */
  readonly operations: OperationRegistration[];

  /** Events emitted */
  readonly events: string[];

  /** Error codes */
  readonly errorCodes: string[];

  /** Vendor coverage */
  readonly vendorCoverage: VendorCoverage;
}

/** Operation registration */
export interface OperationRegistration {
  /** Operation name */
  readonly name: string;

  /** Operation description */
  readonly description: string;

  /** Input contract type name */
  readonly inputType: string;

  /** Output contract type name */
  readonly outputType: string;

  /** Whether operation modifies state */
  readonly mutating: boolean;

  /** Observable events */
  readonly emittedEvents: string[];
}

/** Vendor coverage matrix */
export interface VendorCoverage {
  readonly sap: boolean;
  readonly oracle: boolean;
  readonly salesforce: boolean;
  readonly workday: boolean;
  readonly dynamics: boolean;
  readonly netsuite: boolean;
  readonly servicenow: boolean;
}

/** Registry entry with lifecycle info */
export interface RegistryEntry extends SurfaceRegistration {
  /** Registration timestamp */
  readonly registeredAt: string;

  /** Last updated timestamp */
  readonly updatedAt: string;

  /** Deprecation info (if applicable) */
  readonly deprecation?: DeprecationInfo;
}

/** Deprecation information */
export interface DeprecationInfo {
  readonly deprecated: boolean;
  readonly deprecatedAt: string;
  readonly replacement?: string;
  readonly removalDate?: string;
  readonly message: string;
}

/** Surface registry */
export class SurfaceRegistry {
  private surfaces: Map<string, RegistryEntry> = new Map();

  /** Register a surface */
  register(registration: SurfaceRegistration): void {
    const now = new Date().toISOString();
    const entry: RegistryEntry = {
      ...registration,
      registeredAt: now,
      updatedAt: now
    };
    this.surfaces.set(registration.surfaceId, entry);
  }

  /** Get a surface by ID */
  get(surfaceId: string): RegistryEntry | undefined {
    return this.surfaces.get(surfaceId);
  }

  /** Get all surfaces */
  getAll(): RegistryEntry[] {
    return Array.from(this.surfaces.values());
  }

  /** Get surfaces by domain */
  getByDomain(domain: SurfaceDomain): RegistryEntry[] {
    return this.getAll().filter(s => s.domain === domain);
  }

  /** Search surfaces */
  search(query: string): RegistryEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      s =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.description.toLowerCase().includes(lowerQuery) ||
        s.operations.some(o => o.name.toLowerCase().includes(lowerQuery))
    );
  }

  /** Get surfaces supporting a vendor */
  getByVendor(vendor: keyof VendorCoverage): RegistryEntry[] {
    return this.getAll().filter(s => s.vendorCoverage[vendor]);
  }

  /** Deprecate a surface */
  deprecate(surfaceId: string, replacement?: string, removalDate?: string, message?: string): boolean {
    const entry = this.surfaces.get(surfaceId);
    if (!entry) return false;

    const updated: RegistryEntry = {
      ...entry,
      updatedAt: new Date().toISOString(),
      deprecation: {
        deprecated: true,
        deprecatedAt: new Date().toISOString(),
        replacement,
        removalDate,
        message: message || 'This surface has been deprecated'
      }
    };
    this.surfaces.set(surfaceId, updated);
    return true;
  }

  /** Get registry statistics */
  getStatistics(): RegistryStatistics {
    const all = this.getAll();
    const byDomain: Record<SurfaceDomain, number> = {
      finance: 0,
      procurement: 0,
      hcm: 0,
      'supply-chain': 0,
      customer: 0,
      service: 0
    };

    const vendorCounts: Record<keyof VendorCoverage, number> = {
      sap: 0,
      oracle: 0,
      salesforce: 0,
      workday: 0,
      dynamics: 0,
      netsuite: 0,
      servicenow: 0
    };

    let totalOperations = 0;
    let totalEvents = 0;

    for (const surface of all) {
      byDomain[surface.domain]++;
      totalOperations += surface.operations.length;
      totalEvents += surface.events.length;

      for (const vendor of Object.keys(surface.vendorCoverage) as Array<keyof VendorCoverage>) {
        if (surface.vendorCoverage[vendor]) {
          vendorCounts[vendor]++;
        }
      }
    }

    return {
      totalSurfaces: all.length,
      byDomain,
      totalOperations,
      totalEvents,
      vendorCoverage: vendorCounts,
      deprecatedCount: all.filter(s => s.deprecation?.deprecated).length
    };
  }
}

/** Registry statistics */
export interface RegistryStatistics {
  readonly totalSurfaces: number;
  readonly byDomain: Record<SurfaceDomain, number>;
  readonly totalOperations: number;
  readonly totalEvents: number;
  readonly vendorCoverage: Record<keyof VendorCoverage, number>;
  readonly deprecatedCount: number;
}

/** Global registry instance */
export const registry = new SurfaceRegistry();

/** Register all surfaces */
export const registerAllSurfaces = (): void => {
  // Finance surfaces
  registry.register({
    surfaceId: 'finance.general-ledger',
    name: 'GeneralLedgerSurface',
    version: '1.0.0',
    domain: 'finance',
    description: 'Journal entries, account balances, period close',
    operations: [
      { name: 'PostJournalEntry', description: 'Post a journal entry', inputType: 'PostJournalEntryInput', outputType: 'PostJournalEntryOutput', mutating: true, emittedEvents: ['JournalEntryReceived', 'ValidationCompleted', 'PostingCompleted'] },
      { name: 'GetAccountBalance', description: 'Get account balance', inputType: 'GetAccountBalanceInput', outputType: 'GetAccountBalanceOutput', mutating: false, emittedEvents: ['BalanceQueryReceived', 'BalanceQueryCompleted'] }
    ],
    events: ['JournalEntryReceived', 'ValidationCompleted', 'PostingAttempted', 'PostingCompleted', 'PostingFailed', 'BalanceQueryReceived', 'BalanceQueryCompleted'],
    errorCodes: ['ERR_UNBALANCED_ENTRY', 'ERR_INVALID_ACCOUNT', 'ERR_CLOSED_PERIOD'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: true, dynamics: true, netsuite: true, servicenow: false }
  });

  registry.register({
    surfaceId: 'finance.accounts-payable',
    name: 'AccountsPayableSurface',
    version: '1.0.0',
    domain: 'finance',
    description: 'Invoice processing, payment runs, vendor management',
    operations: [
      { name: 'CreateInvoice', description: 'Create vendor invoice', inputType: 'CreateInvoiceInput', outputType: 'CreateInvoiceOutput', mutating: true, emittedEvents: ['InvoiceCreated'] },
      { name: 'ProcessPayment', description: 'Process payment', inputType: 'ProcessPaymentInput', outputType: 'ProcessPaymentOutput', mutating: true, emittedEvents: ['PaymentProcessed'] },
      { name: 'GetVendorBalance', description: 'Get vendor balance', inputType: 'GetVendorBalanceInput', outputType: 'GetVendorBalanceOutput', mutating: false, emittedEvents: ['VendorBalanceQueried'] }
    ],
    events: ['InvoiceCreated', 'PaymentProcessed', 'VendorBalanceQueried'],
    errorCodes: ['ERR_INVALID_SUPPLIER', 'ERR_DUPLICATE_INVOICE'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: true, dynamics: true, netsuite: true, servicenow: false }
  });

  registry.register({
    surfaceId: 'finance.accounts-receivable',
    name: 'AccountsReceivableSurface',
    version: '1.0.0',
    domain: 'finance',
    description: 'Customer invoicing, collections, credit management',
    operations: [
      { name: 'CreateCustomerInvoice', description: 'Create customer invoice', inputType: 'CreateCustomerInvoiceInput', outputType: 'CreateCustomerInvoiceOutput', mutating: true, emittedEvents: ['CustomerInvoiceCreated'] },
      { name: 'RecordPayment', description: 'Record customer payment', inputType: 'RecordPaymentInput', outputType: 'RecordPaymentOutput', mutating: true, emittedEvents: ['PaymentRecorded'] },
      { name: 'GetCustomerBalance', description: 'Get customer balance', inputType: 'GetCustomerBalanceInput', outputType: 'GetCustomerBalanceOutput', mutating: false, emittedEvents: ['CustomerBalanceQueried'] }
    ],
    events: ['CustomerInvoiceCreated', 'PaymentRecorded', 'CustomerBalanceQueried'],
    errorCodes: ['ERR_INVALID_CUSTOMER', 'ERR_CREDIT_LIMIT_EXCEEDED'],
    vendorCoverage: { sap: true, oracle: true, salesforce: true, workday: true, dynamics: true, netsuite: true, servicenow: false }
  });

  registry.register({
    surfaceId: 'finance.fixed-assets',
    name: 'FixedAssetsSurface',
    version: '1.0.0',
    domain: 'finance',
    description: 'Asset lifecycle, depreciation, disposal',
    operations: [
      { name: 'AcquireAsset', description: 'Acquire asset', inputType: 'AcquireAssetInput', outputType: 'AcquireAssetOutput', mutating: true, emittedEvents: ['AssetAcquired'] },
      { name: 'DepreciateAsset', description: 'Run depreciation', inputType: 'DepreciateAssetInput', outputType: 'DepreciateAssetOutput', mutating: true, emittedEvents: ['DepreciationRun'] },
      { name: 'DisposeAsset', description: 'Dispose asset', inputType: 'DisposeAssetInput', outputType: 'DisposeAssetOutput', mutating: true, emittedEvents: ['AssetDisposed'] }
    ],
    events: ['AssetAcquired', 'DepreciationRun', 'AssetDisposed'],
    errorCodes: ['ERR_ASSET_NOT_FOUND', 'ERR_INVALID_DEPRECIATION_METHOD'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: true, dynamics: true, netsuite: false, servicenow: false }
  });

  registry.register({
    surfaceId: 'finance.cash-management',
    name: 'CashManagementSurface',
    version: '1.0.0',
    domain: 'finance',
    description: 'Bank reconciliation, cash positioning, forecasting',
    operations: [
      { name: 'ReconcileBank', description: 'Reconcile bank statement', inputType: 'ReconcileBankInput', outputType: 'ReconcileBankOutput', mutating: true, emittedEvents: ['BankReconciled'] },
      { name: 'GetCashPosition', description: 'Get cash position', inputType: 'GetCashPositionInput', outputType: 'GetCashPositionOutput', mutating: false, emittedEvents: ['CashPositionQueried'] },
      { name: 'CreateCashForecast', description: 'Create cash forecast', inputType: 'CreateCashForecastInput', outputType: 'CreateCashForecastOutput', mutating: true, emittedEvents: ['CashForecastCreated'] }
    ],
    events: ['BankReconciled', 'CashPositionQueried', 'CashForecastCreated'],
    errorCodes: ['ERR_BANK_ACCOUNT_NOT_FOUND', 'ERR_RECONCILIATION_IMBALANCE'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: true, dynamics: false, netsuite: false, servicenow: false }
  });

  // Procurement surfaces
  registry.register({
    surfaceId: 'procurement.purchase-orders',
    name: 'PurchaseOrderSurface',
    version: '1.0.0',
    domain: 'procurement',
    description: 'Requisition to PO, approval workflows, receipts',
    operations: [
      { name: 'CreatePurchaseOrder', description: 'Create purchase order', inputType: 'CreatePurchaseOrderInput', outputType: 'CreatePurchaseOrderOutput', mutating: true, emittedEvents: ['POCreationRequested', 'PONumberAssigned', 'POCreationCompleted'] },
      { name: 'ReceiveGoods', description: 'Receive goods', inputType: 'ReceiveGoodsInput', outputType: 'ReceiveGoodsOutput', mutating: true, emittedEvents: ['GoodsReceived'] },
      { name: 'ApprovePurchaseOrder', description: 'Approve PO', inputType: 'ApprovePurchaseOrderInput', outputType: 'ApprovePurchaseOrderOutput', mutating: true, emittedEvents: ['POApproved'] },
      { name: 'CancelPurchaseOrder', description: 'Cancel PO', inputType: 'CancelPurchaseOrderInput', outputType: 'CancelPurchaseOrderOutput', mutating: true, emittedEvents: ['POCancelled'] }
    ],
    events: ['POCreationRequested', 'POValidationCompleted', 'PONumberAssigned', 'ApprovalWorkflowInitiated', 'POCreationCompleted', 'POCreationFailed', 'GoodsReceived'],
    errorCodes: ['ERR_INVALID_SUPPLIER', 'ERR_BUDGET_EXCEEDED', 'ERR_MATERIAL_NOT_FOUND'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: true, dynamics: true, netsuite: true, servicenow: false }
  });

  registry.register({
    surfaceId: 'procurement.suppliers',
    name: 'SupplierSurface',
    version: '1.0.0',
    domain: 'procurement',
    description: 'Vendor master, qualification, performance',
    operations: [
      { name: 'CreateSupplier', description: 'Create supplier', inputType: 'CreateSupplierInput', outputType: 'CreateSupplierOutput', mutating: true, emittedEvents: ['SupplierCreated'] },
      { name: 'UpdateSupplier', description: 'Update supplier', inputType: 'UpdateSupplierInput', outputType: 'UpdateSupplierOutput', mutating: true, emittedEvents: ['SupplierUpdated'] },
      { name: 'QualifySupplier', description: 'Qualify supplier', inputType: 'QualifySupplierInput', outputType: 'QualifySupplierOutput', mutating: true, emittedEvents: ['SupplierQualified'] },
      { name: 'GetSupplierPerformance', description: 'Get performance', inputType: 'GetSupplierPerformanceInput', outputType: 'GetSupplierPerformanceOutput', mutating: false, emittedEvents: ['SupplierPerformanceQueried'] }
    ],
    events: ['SupplierCreated', 'SupplierUpdated', 'SupplierQualified', 'SupplierPerformanceQueried'],
    errorCodes: ['ERR_SUPPLIER_NOT_FOUND', 'ERR_QUALIFICATION_FAILED'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: false, dynamics: false, netsuite: false, servicenow: true }
  });

  registry.register({
    surfaceId: 'procurement.contracts',
    name: 'ContractSurface',
    version: '1.0.0',
    domain: 'procurement',
    description: 'Contract lifecycle, terms, compliance',
    operations: [
      { name: 'CreateContract', description: 'Create contract', inputType: 'CreateContractInput', outputType: 'CreateContractOutput', mutating: true, emittedEvents: ['ContractCreated'] },
      { name: 'AmendContract', description: 'Amend contract', inputType: 'AmendContractInput', outputType: 'AmendContractOutput', mutating: true, emittedEvents: ['ContractAmended'] },
      { name: 'TerminateContract', description: 'Terminate contract', inputType: 'TerminateContractInput', outputType: 'TerminateContractOutput', mutating: true, emittedEvents: ['ContractTerminated'] },
      { name: 'GetContractCompliance', description: 'Get compliance', inputType: 'GetContractComplianceInput', outputType: 'GetContractComplianceOutput', mutating: false, emittedEvents: ['ContractComplianceQueried'] }
    ],
    events: ['ContractCreated', 'ContractAmended', 'ContractTerminated', 'ContractComplianceQueried'],
    errorCodes: ['ERR_CONTRACT_NOT_FOUND', 'ERR_CONTRACT_EXPIRED'],
    vendorCoverage: { sap: true, oracle: true, salesforce: true, workday: false, dynamics: false, netsuite: false, servicenow: false }
  });

  registry.register({
    surfaceId: 'procurement.sourcing',
    name: 'SourcingSurface',
    version: '1.0.0',
    domain: 'procurement',
    description: 'RFx management, bid evaluation, award',
    operations: [
      { name: 'CreateRFx', description: 'Create RFx', inputType: 'CreateRFxInput', outputType: 'CreateRFxOutput', mutating: true, emittedEvents: ['RFxCreated'] },
      { name: 'SubmitBid', description: 'Submit bid', inputType: 'SubmitBidInput', outputType: 'SubmitBidOutput', mutating: true, emittedEvents: ['BidSubmitted'] },
      { name: 'EvaluateBids', description: 'Evaluate bids', inputType: 'EvaluateBidsInput', outputType: 'EvaluateBidsOutput', mutating: true, emittedEvents: ['BidsEvaluated'] },
      { name: 'AwardContract', description: 'Award contract', inputType: 'AwardContractInput', outputType: 'AwardContractOutput', mutating: true, emittedEvents: ['ContractAwarded'] }
    ],
    events: ['RFxCreated', 'BidSubmitted', 'BidsEvaluated', 'ContractAwarded'],
    errorCodes: ['ERR_RFX_CLOSED', 'ERR_BID_LATE'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: true, dynamics: false, netsuite: false, servicenow: false }
  });

  // HCM surfaces
  registry.register({
    surfaceId: 'hcm.employee',
    name: 'EmployeeSurface',
    version: '1.0.0',
    domain: 'hcm',
    description: 'Employee master, organizational assignment',
    operations: [
      { name: 'HireEmployee', description: 'Hire employee', inputType: 'HireEmployeeInput', outputType: 'HireEmployeeOutput', mutating: true, emittedEvents: ['HireRequestReceived', 'EmployeeIdAssigned', 'PositionFilled', 'HireCompleted'] },
      { name: 'TerminateEmployee', description: 'Terminate employee', inputType: 'TerminateEmployeeInput', outputType: 'TerminateEmployeeOutput', mutating: true, emittedEvents: ['TerminationRequested', 'TerminationCompleted'] },
      { name: 'TransferEmployee', description: 'Transfer employee', inputType: 'TransferEmployeeInput', outputType: 'TransferEmployeeOutput', mutating: true, emittedEvents: ['TransferCompleted'] },
      { name: 'PromoteEmployee', description: 'Promote employee', inputType: 'PromoteEmployeeInput', outputType: 'PromoteEmployeeOutput', mutating: true, emittedEvents: ['PromotionCompleted'] }
    ],
    events: ['HireRequestReceived', 'EmployeeIdAssigned', 'PositionFilled', 'PayrollRecordCreated', 'HireCompleted', 'TerminationRequested', 'TerminationCompleted'],
    errorCodes: ['ERR_POSITION_NOT_VACANT', 'ERR_COMPENSATION_OUT_OF_RANGE'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: true, dynamics: true, netsuite: false, servicenow: false }
  });

  registry.register({
    surfaceId: 'hcm.payroll',
    name: 'PayrollSurface',
    version: '1.0.0',
    domain: 'hcm',
    description: 'Payroll processing, deductions, tax reporting',
    operations: [
      { name: 'RunPayroll', description: 'Run payroll', inputType: 'RunPayrollInput', outputType: 'RunPayrollOutput', mutating: true, emittedEvents: ['PayrollRun'] },
      { name: 'CalculateDeductions', description: 'Calculate deductions', inputType: 'CalculateDeductionsInput', outputType: 'CalculateDeductionsOutput', mutating: false, emittedEvents: ['DeductionsCalculated'] },
      { name: 'GenerateTaxReport', description: 'Generate tax report', inputType: 'GenerateTaxReportInput', outputType: 'GenerateTaxReportOutput', mutating: false, emittedEvents: ['TaxReportGenerated'] }
    ],
    events: ['PayrollRun', 'DeductionsCalculated', 'TaxReportGenerated'],
    errorCodes: ['ERR_PAYROLL_ALREADY_RUN', 'ERR_MISSING_TAX_DATA'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: true, dynamics: true, netsuite: false, servicenow: false }
  });

  registry.register({
    surfaceId: 'hcm.time',
    name: 'TimeSurface',
    version: '1.0.0',
    domain: 'hcm',
    description: 'Time entry, approval, absence management',
    operations: [
      { name: 'RecordTimeEntry', description: 'Record time', inputType: 'RecordTimeEntryInput', outputType: 'RecordTimeEntryOutput', mutating: true, emittedEvents: ['TimeRecorded'] },
      { name: 'ApproveTimesheet', description: 'Approve timesheet', inputType: 'ApproveTimesheetInput', outputType: 'ApproveTimesheetOutput', mutating: true, emittedEvents: ['TimesheetApproved'] },
      { name: 'RecordAbsence', description: 'Record absence', inputType: 'RecordAbsenceInput', outputType: 'RecordAbsenceOutput', mutating: true, emittedEvents: ['AbsenceRecorded'] }
    ],
    events: ['TimeRecorded', 'TimesheetApproved', 'AbsenceRecorded'],
    errorCodes: ['ERR_DUPLICATE_TIME_ENTRY', 'ERR_EXCEEDS_MAX_HOURS'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: true, dynamics: false, netsuite: false, servicenow: false }
  });

  registry.register({
    surfaceId: 'hcm.talent',
    name: 'TalentSurface',
    version: '1.0.0',
    domain: 'hcm',
    description: 'Recruiting, performance, succession',
    operations: [
      { name: 'CreateRequisition', description: 'Create job requisition', inputType: 'CreateRequisitionInput', outputType: 'CreateRequisitionOutput', mutating: true, emittedEvents: ['RequisitionCreated'] },
      { name: 'SubmitApplication', description: 'Submit application', inputType: 'SubmitApplicationInput', outputType: 'SubmitApplicationOutput', mutating: true, emittedEvents: ['ApplicationSubmitted'] },
      { name: 'EvaluatePerformance', description: 'Evaluate performance', inputType: 'EvaluatePerformanceInput', outputType: 'EvaluatePerformanceOutput', mutating: true, emittedEvents: ['PerformanceEvaluated'] }
    ],
    events: ['RequisitionCreated', 'ApplicationSubmitted', 'PerformanceEvaluated'],
    errorCodes: ['ERR_REQUISITION_CLOSED', 'ERR_REVIEW_PERIOD_CLOSED'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: true, dynamics: false, netsuite: false, servicenow: false }
  });

  registry.register({
    surfaceId: 'hcm.benefits',
    name: 'BenefitsSurface',
    version: '1.0.0',
    domain: 'hcm',
    description: 'Benefits enrollment, eligibility, life events',
    operations: [
      { name: 'EnrollBenefits', description: 'Enroll in benefits', inputType: 'EnrollBenefitsInput', outputType: 'EnrollBenefitsOutput', mutating: true, emittedEvents: ['BenefitsEnrolled'] },
      { name: 'ProcessLifeEvent', description: 'Process life event', inputType: 'ProcessLifeEventInput', outputType: 'ProcessLifeEventOutput', mutating: true, emittedEvents: ['LifeEventProcessed'] },
      { name: 'CalculateEligibility', description: 'Calculate eligibility', inputType: 'CalculateEligibilityInput', outputType: 'CalculateEligibilityOutput', mutating: false, emittedEvents: ['EligibilityCalculated'] }
    ],
    events: ['BenefitsEnrolled', 'LifeEventProcessed', 'EligibilityCalculated'],
    errorCodes: ['ERR_ENROLLMENT_CLOSED', 'ERR_NOT_ELIGIBLE'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: true, dynamics: false, netsuite: false, servicenow: false }
  });

  // Supply Chain surfaces
  registry.register({
    surfaceId: 'supply-chain.inventory',
    name: 'InventorySurface',
    version: '1.0.0',
    domain: 'supply-chain',
    description: 'Stock levels, movements, valuation',
    operations: [
      { name: 'GetStockLevel', description: 'Get stock level', inputType: 'GetStockLevelInput', outputType: 'GetStockLevelOutput', mutating: false, emittedEvents: ['StockLevelQueried'] },
      { name: 'RecordMovement', description: 'Record movement', inputType: 'RecordMovementInput', outputType: 'RecordMovementOutput', mutating: true, emittedEvents: ['MovementRecorded'] },
      { name: 'RevalueInventory', description: 'Revalue inventory', inputType: 'RevalueInventoryInput', outputType: 'RevalueInventoryOutput', mutating: true, emittedEvents: ['InventoryRevalued'] },
      { name: 'PerformCount', description: 'Perform count', inputType: 'PerformCountInput', outputType: 'PerformCountOutput', mutating: true, emittedEvents: ['CountCompleted'] }
    ],
    events: ['StockLevelQueried', 'MovementRecorded', 'InventoryRevalued', 'CountCompleted'],
    errorCodes: ['ERR_MATERIAL_NOT_FOUND', 'ERR_INSUFFICIENT_STOCK'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: false, dynamics: true, netsuite: true, servicenow: false }
  });

  registry.register({
    surfaceId: 'supply-chain.warehouse',
    name: 'WarehouseSurface',
    version: '1.0.0',
    domain: 'supply-chain',
    description: 'Warehouse operations, picking, packing',
    operations: [
      { name: 'CreatePickList', description: 'Create pick list', inputType: 'CreatePickListInput', outputType: 'CreatePickListOutput', mutating: true, emittedEvents: ['PickListCreated'] },
      { name: 'ConfirmPick', description: 'Confirm pick', inputType: 'ConfirmPickInput', outputType: 'ConfirmPickOutput', mutating: true, emittedEvents: ['PickConfirmed'] },
      { name: 'CreatePackingSlip', description: 'Create packing slip', inputType: 'CreatePackingSlipInput', outputType: 'CreatePackingSlipOutput', mutating: true, emittedEvents: ['PackingSlipCreated'] },
      { name: 'ShipOrder', description: 'Ship order', inputType: 'ShipOrderInput', outputType: 'ShipOrderOutput', mutating: true, emittedEvents: ['OrderShipped'] }
    ],
    events: ['PickListCreated', 'PickConfirmed', 'PackingSlipCreated', 'OrderShipped'],
    errorCodes: ['ERR_ORDER_NOT_FOUND', 'ERR_LOCATION_NOT_FOUND'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: false, dynamics: true, netsuite: false, servicenow: false }
  });

  registry.register({
    surfaceId: 'supply-chain.manufacturing',
    name: 'ManufacturingSurface',
    version: '1.0.0',
    domain: 'supply-chain',
    description: 'Production orders, routing, shop floor',
    operations: [
      { name: 'CreateProductionOrder', description: 'Create production order', inputType: 'CreateProductionOrderInput', outputType: 'CreateProductionOrderOutput', mutating: true, emittedEvents: ['ProductionOrderCreated'] },
      { name: 'ReleaseProductionOrder', description: 'Release production order', inputType: 'ReleaseProductionOrderInput', outputType: 'ReleaseProductionOrderOutput', mutating: true, emittedEvents: ['ProductionOrderReleased'] },
      { name: 'ConfirmOperation', description: 'Confirm operation', inputType: 'ConfirmOperationInput', outputType: 'ConfirmOperationOutput', mutating: true, emittedEvents: ['OperationConfirmed'] },
      { name: 'CompleteProduction', description: 'Complete production', inputType: 'CompleteProductionInput', outputType: 'CompleteProductionOutput', mutating: true, emittedEvents: ['ProductionCompleted'] }
    ],
    events: ['ProductionOrderCreated', 'ProductionOrderReleased', 'OperationConfirmed', 'ProductionCompleted'],
    errorCodes: ['ERR_BOM_NOT_FOUND', 'ERR_ROUTING_NOT_FOUND'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: false, dynamics: true, netsuite: false, servicenow: false }
  });

  registry.register({
    surfaceId: 'supply-chain.logistics',
    name: 'LogisticsSurface',
    version: '1.0.0',
    domain: 'supply-chain',
    description: 'Shipping, transportation, delivery',
    operations: [
      { name: 'CreateShipment', description: 'Create shipment', inputType: 'CreateShipmentInput', outputType: 'CreateShipmentOutput', mutating: true, emittedEvents: ['ShipmentCreated'] },
      { name: 'TrackShipment', description: 'Track shipment', inputType: 'TrackShipmentInput', outputType: 'TrackShipmentOutput', mutating: false, emittedEvents: ['ShipmentTracked'] },
      { name: 'ConfirmDelivery', description: 'Confirm delivery', inputType: 'ConfirmDeliveryInput', outputType: 'ConfirmDeliveryOutput', mutating: true, emittedEvents: ['DeliveryConfirmed'] },
      { name: 'ScheduleTransport', description: 'Schedule transport', inputType: 'ScheduleTransportInput', outputType: 'ScheduleTransportOutput', mutating: true, emittedEvents: ['TransportScheduled'] }
    ],
    events: ['ShipmentCreated', 'ShipmentTracked', 'DeliveryConfirmed', 'TransportScheduled'],
    errorCodes: ['ERR_SHIPMENT_NOT_FOUND', 'ERR_CARRIER_UNAVAILABLE'],
    vendorCoverage: { sap: true, oracle: true, salesforce: false, workday: false, dynamics: true, netsuite: false, servicenow: false }
  });

  // Customer surfaces
  registry.register({
    surfaceId: 'customer.customer-master',
    name: 'CustomerSurface',
    version: '1.0.0',
    domain: 'customer',
    description: 'Customer master, hierarchy, segmentation',
    operations: [
      { name: 'CreateCustomer', description: 'Create customer', inputType: 'CreateCustomerInput', outputType: 'CreateCustomerOutput', mutating: true, emittedEvents: ['CustomerCreated'] },
      { name: 'UpdateCustomer', description: 'Update customer', inputType: 'UpdateCustomerInput', outputType: 'UpdateCustomerOutput', mutating: true, emittedEvents: ['CustomerUpdated'] },
      { name: 'GetCustomerHierarchy', description: 'Get hierarchy', inputType: 'GetCustomerHierarchyInput', outputType: 'GetCustomerHierarchyOutput', mutating: false, emittedEvents: ['HierarchyQueried'] },
      { name: 'SegmentCustomer', description: 'Segment customer', inputType: 'SegmentCustomerInput', outputType: 'SegmentCustomerOutput', mutating: true, emittedEvents: ['CustomerSegmented'] }
    ],
    events: ['CustomerCreated', 'CustomerUpdated', 'CustomerSegmented', 'HierarchyModified'],
    errorCodes: ['ERR_DUPLICATE_CUSTOMER', 'ERR_INVALID_SEGMENT'],
    vendorCoverage: { sap: true, oracle: true, salesforce: true, workday: false, dynamics: true, netsuite: true, servicenow: false }
  });

  registry.register({
    surfaceId: 'customer.opportunity',
    name: 'OpportunitySurface',
    version: '1.0.0',
    domain: 'customer',
    description: 'Pipeline, forecasting, deal management',
    operations: [
      { name: 'CreateOpportunity', description: 'Create opportunity', inputType: 'CreateOpportunityInput', outputType: 'CreateOpportunityOutput', mutating: true, emittedEvents: ['OpportunityCreated'] },
      { name: 'UpdateOpportunityStage', description: 'Update stage', inputType: 'UpdateOpportunityStageInput', outputType: 'UpdateOpportunityStageOutput', mutating: true, emittedEvents: ['StageUpdated'] },
      { name: 'ForecastOpportunity', description: 'Forecast', inputType: 'ForecastOpportunityInput', outputType: 'ForecastOpportunityOutput', mutating: true, emittedEvents: ['ForecastUpdated'] },
      { name: 'CloseOpportunity', description: 'Close opportunity', inputType: 'CloseOpportunityInput', outputType: 'CloseOpportunityOutput', mutating: true, emittedEvents: ['OpportunityClosed'] }
    ],
    events: ['OpportunityCreated', 'StageUpdated', 'ForecastUpdated', 'OpportunityClosed'],
    errorCodes: ['ERR_OPPORTUNITY_NOT_FOUND', 'ERR_INVALID_STAGE_TRANSITION'],
    vendorCoverage: { sap: true, oracle: true, salesforce: true, workday: false, dynamics: true, netsuite: false, servicenow: false }
  });

  registry.register({
    surfaceId: 'customer.case',
    name: 'CaseSurface',
    version: '1.0.0',
    domain: 'customer',
    description: 'Service cases, resolution, SLA tracking',
    operations: [
      { name: 'CreateCase', description: 'Create case', inputType: 'CreateCaseInput', outputType: 'CreateCaseOutput', mutating: true, emittedEvents: ['CaseCreationRequested', 'CaseNumberAssigned', 'SLACalculated', 'CaseRouted', 'CaseCreationCompleted'] },
      { name: 'ResolveCase', description: 'Resolve case', inputType: 'ResolveCaseInput', outputType: 'ResolveCaseOutput', mutating: true, emittedEvents: ['CaseResolved'] },
      { name: 'EscalateCase', description: 'Escalate case', inputType: 'EscalateCaseInput', outputType: 'EscalateCaseOutput', mutating: true, emittedEvents: ['CaseEscalated'] },
      { name: 'ReopenCase', description: 'Reopen case', inputType: 'ReopenCaseInput', outputType: 'ReopenCaseOutput', mutating: true, emittedEvents: ['CaseReopened'] }
    ],
    events: ['CaseCreationRequested', 'CaseNumberAssigned', 'SLACalculated', 'CaseRouted', 'CaseCreationCompleted', 'CaseResolved', 'CaseEscalated'],
    errorCodes: ['ERR_CASE_NOT_FOUND', 'ERR_SLA_BREACHED'],
    vendorCoverage: { sap: false, oracle: true, salesforce: true, workday: false, dynamics: true, netsuite: false, servicenow: true }
  });

  registry.register({
    surfaceId: 'customer.quote',
    name: 'QuoteSurface',
    version: '1.0.0',
    domain: 'customer',
    description: 'Quote generation, pricing, approval',
    operations: [
      { name: 'CreateQuote', description: 'Create quote', inputType: 'CreateQuoteInput', outputType: 'CreateQuoteOutput', mutating: true, emittedEvents: ['QuoteCreated'] },
      { name: 'AddQuoteLine', description: 'Add line', inputType: 'AddQuoteLineInput', outputType: 'AddQuoteLineOutput', mutating: true, emittedEvents: ['QuoteLineAdded'] },
      { name: 'ApplyDiscount', description: 'Apply discount', inputType: 'ApplyDiscountInput', outputType: 'ApplyDiscountOutput', mutating: true, emittedEvents: ['DiscountApplied'] },
      { name: 'ApproveQuote', description: 'Approve quote', inputType: 'ApproveQuoteInput', outputType: 'ApproveQuoteOutput', mutating: true, emittedEvents: ['QuoteApproved'] }
    ],
    events: ['QuoteCreated', 'QuoteLineAdded', 'DiscountApplied', 'QuoteApproved'],
    errorCodes: ['ERR_QUOTE_NOT_FOUND', 'ERR_DISCOUNT_EXCEEDS_LIMIT'],
    vendorCoverage: { sap: true, oracle: true, salesforce: true, workday: false, dynamics: false, netsuite: false, servicenow: false }
  });

  // Service surfaces
  registry.register({
    surfaceId: 'service.incident',
    name: 'IncidentSurface',
    version: '1.0.0',
    domain: 'service',
    description: 'Incident creation, assignment, resolution',
    operations: [
      { name: 'CreateIncident', description: 'Create incident', inputType: 'CreateIncidentInput', outputType: 'CreateIncidentOutput', mutating: true, emittedEvents: ['IncidentCreated'] },
      { name: 'AssignIncident', description: 'Assign incident', inputType: 'AssignIncidentInput', outputType: 'AssignIncidentOutput', mutating: true, emittedEvents: ['IncidentAssigned'] },
      { name: 'ResolveIncident', description: 'Resolve incident', inputType: 'ResolveIncidentInput', outputType: 'ResolveIncidentOutput', mutating: true, emittedEvents: ['IncidentResolved'] },
      { name: 'CloseIncident', description: 'Close incident', inputType: 'CloseIncidentInput', outputType: 'CloseIncidentOutput', mutating: true, emittedEvents: ['IncidentClosed'] }
    ],
    events: ['IncidentCreated', 'IncidentAssigned', 'IncidentResolved', 'IncidentClosed', 'SLABreached', 'EscalationTriggered'],
    errorCodes: ['ERR_INCIDENT_NOT_FOUND', 'ERR_INVALID_ASSIGNMENT'],
    vendorCoverage: { sap: false, oracle: false, salesforce: true, workday: false, dynamics: false, netsuite: false, servicenow: true }
  });

  registry.register({
    surfaceId: 'service.change',
    name: 'ChangeSurface',
    version: '1.0.0',
    domain: 'service',
    description: 'Change requests, approval, implementation',
    operations: [
      { name: 'CreateChangeRequest', description: 'Create change request', inputType: 'CreateChangeRequestInput', outputType: 'CreateChangeRequestOutput', mutating: true, emittedEvents: ['ChangeRequestCreated'] },
      { name: 'ApproveChange', description: 'Approve change', inputType: 'ApproveChangeInput', outputType: 'ApproveChangeOutput', mutating: true, emittedEvents: ['ChangeApproved'] },
      { name: 'ImplementChange', description: 'Implement change', inputType: 'ImplementChangeInput', outputType: 'ImplementChangeOutput', mutating: true, emittedEvents: ['ChangeImplemented'] },
      { name: 'ReviewChange', description: 'Review change', inputType: 'ReviewChangeInput', outputType: 'ReviewChangeOutput', mutating: true, emittedEvents: ['ChangeReviewed'] }
    ],
    events: ['ChangeRequestCreated', 'ChangeApproved', 'ChangeImplemented', 'ChangeReviewed'],
    errorCodes: ['ERR_CHANGE_NOT_FOUND', 'ERR_APPROVAL_REQUIRED'],
    vendorCoverage: { sap: false, oracle: false, salesforce: false, workday: false, dynamics: false, netsuite: false, servicenow: true }
  });

  registry.register({
    surfaceId: 'service.asset',
    name: 'AssetServiceSurface',
    version: '1.0.0',
    domain: 'service',
    description: 'IT asset management, CMDB operations',
    operations: [
      { name: 'RegisterAsset', description: 'Register asset', inputType: 'RegisterAssetInput', outputType: 'RegisterAssetOutput', mutating: true, emittedEvents: ['AssetRegistered'] },
      { name: 'UpdateAsset', description: 'Update asset', inputType: 'UpdateAssetInput', outputType: 'UpdateAssetOutput', mutating: true, emittedEvents: ['AssetUpdated'] },
      { name: 'RetireAsset', description: 'Retire asset', inputType: 'RetireAssetInput', outputType: 'RetireAssetOutput', mutating: true, emittedEvents: ['AssetRetired'] },
      { name: 'GetAssetRelationships', description: 'Get relationships', inputType: 'GetAssetRelationshipsInput', outputType: 'GetAssetRelationshipsOutput', mutating: false, emittedEvents: ['RelationshipsQueried'] }
    ],
    events: ['AssetRegistered', 'AssetUpdated', 'AssetRetired', 'RelationshipsQueried'],
    errorCodes: ['ERR_ASSET_NOT_FOUND', 'ERR_RELATIONSHIP_CYCLE'],
    vendorCoverage: { sap: false, oracle: false, salesforce: true, workday: false, dynamics: false, netsuite: false, servicenow: true }
  });

  registry.register({
    surfaceId: 'service.workflow',
    name: 'WorkflowSurface',
    version: '1.0.0',
    domain: 'service',
    description: 'Approval routing, task assignment, escalation',
    operations: [
      { name: 'InitiateWorkflow', description: 'Initiate workflow', inputType: 'InitiateWorkflowInput', outputType: 'InitiateWorkflowOutput', mutating: true, emittedEvents: ['WorkflowInitiated'] },
      { name: 'ApproveTask', description: 'Approve task', inputType: 'ApproveTaskInput', outputType: 'ApproveTaskOutput', mutating: true, emittedEvents: ['TaskApproved'] },
      { name: 'RejectTask', description: 'Reject task', inputType: 'RejectTaskInput', outputType: 'RejectTaskOutput', mutating: true, emittedEvents: ['TaskRejected'] },
      { name: 'EscalateTask', description: 'Escalate task', inputType: 'EscalateTaskInput', outputType: 'EscalateTaskOutput', mutating: true, emittedEvents: ['EscalationOccurred'] }
    ],
    events: ['WorkflowInitiated', 'TaskAssigned', 'TaskCompleted', 'TaskRejected', 'WorkflowCompleted', 'EscalationOccurred'],
    errorCodes: ['ERR_WORKFLOW_NOT_FOUND', 'ERR_TASK_NOT_FOUND'],
    vendorCoverage: { sap: false, oracle: false, salesforce: true, workday: true, dynamics: false, netsuite: false, servicenow: true }
  });
};

// Auto-register on module load
registerAllSurfaces();
