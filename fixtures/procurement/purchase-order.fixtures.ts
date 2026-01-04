/**
 * Purchase Order Fixtures
 *
 * Deterministic fixtures for PurchaseOrderSurface benchmarking and testing.
 */

import { MonetaryAmount } from '../../common/types/monetary';

/** Purchase order fixture */
export interface PurchaseOrderFixture {
  readonly fixtureId: string;
  readonly description: string;
  readonly input: PurchaseOrderInput;
  readonly expectedOutput: PurchaseOrderOutput;
  readonly tags: string[];
}

interface PurchaseOrderInput {
  readonly header: {
    readonly supplierId: string;
    readonly supplierName: string;
    readonly orderDate: string;
    readonly deliveryDate: string;
    readonly paymentTerms: string;
    readonly currency: string;
  };
  readonly lineItems: Array<{
    readonly lineNumber: number;
    readonly materialId: string;
    readonly description: string;
    readonly quantity: number;
    readonly unitOfMeasure: string;
    readonly unitPrice: MonetaryAmount;
  }>;
  readonly requestor: string;
  readonly costCenter: string;
}

interface PurchaseOrderOutput {
  readonly poNumber: string;
  readonly status: string;
  readonly approvalRoute: {
    readonly required: boolean;
    readonly approvers: string[];
  };
  readonly lineResults: Array<{
    readonly lineNumber: number;
    readonly status: string;
    readonly totalValue: MonetaryAmount;
  }>;
}

/** Standard purchase order */
export const STANDARD_PURCHASE_ORDER: PurchaseOrderFixture = {
  fixtureId: 'po-fixture-001',
  description: 'Standard purchase order for office supplies',
  input: {
    header: {
      supplierId: 'SUP-001',
      supplierName: 'Office Supplies Inc.',
      orderDate: '2024-01-15',
      deliveryDate: '2024-01-25',
      paymentTerms: 'NET30',
      currency: 'USD'
    },
    lineItems: [
      {
        lineNumber: 1,
        materialId: 'MAT-001',
        description: 'A4 Paper (Box of 10)',
        quantity: 50,
        unitOfMeasure: 'BOX',
        unitPrice: { value: 25.00, currency: 'USD', precision: 2 }
      },
      {
        lineNumber: 2,
        materialId: 'MAT-002',
        description: 'Ballpoint Pens (Pack of 12)',
        quantity: 20,
        unitOfMeasure: 'PACK',
        unitPrice: { value: 8.50, currency: 'USD', precision: 2 }
      }
    ],
    requestor: 'USER-001',
    costCenter: 'CC100'
  },
  expectedOutput: {
    poNumber: 'PO-2024-000001',
    status: 'APPROVED',
    approvalRoute: {
      required: false,
      approvers: []
    },
    lineResults: [
      {
        lineNumber: 1,
        status: 'CREATED',
        totalValue: { value: 1250.00, currency: 'USD', precision: 2 }
      },
      {
        lineNumber: 2,
        status: 'CREATED',
        totalValue: { value: 170.00, currency: 'USD', precision: 2 }
      }
    ]
  },
  tags: ['standard', 'auto-approved', 'office-supplies']
};

/** High value purchase order requiring approval */
export const HIGH_VALUE_PURCHASE_ORDER: PurchaseOrderFixture = {
  fixtureId: 'po-fixture-002',
  description: 'High value purchase order requiring manager approval',
  input: {
    header: {
      supplierId: 'SUP-002',
      supplierName: 'IT Equipment Corp.',
      orderDate: '2024-01-20',
      deliveryDate: '2024-02-10',
      paymentTerms: 'NET45',
      currency: 'USD'
    },
    lineItems: [
      {
        lineNumber: 1,
        materialId: 'MAT-100',
        description: 'Enterprise Server',
        quantity: 2,
        unitOfMeasure: 'EACH',
        unitPrice: { value: 15000.00, currency: 'USD', precision: 2 }
      },
      {
        lineNumber: 2,
        materialId: 'MAT-101',
        description: 'Network Switch 48-Port',
        quantity: 5,
        unitOfMeasure: 'EACH',
        unitPrice: { value: 2500.00, currency: 'USD', precision: 2 }
      }
    ],
    requestor: 'USER-002',
    costCenter: 'CC-IT'
  },
  expectedOutput: {
    poNumber: 'PO-2024-000002',
    status: 'PENDING_APPROVAL',
    approvalRoute: {
      required: true,
      approvers: ['MGR-001', 'DIR-001']
    },
    lineResults: [
      {
        lineNumber: 1,
        status: 'PENDING',
        totalValue: { value: 30000.00, currency: 'USD', precision: 2 }
      },
      {
        lineNumber: 2,
        status: 'PENDING',
        totalValue: { value: 12500.00, currency: 'USD', precision: 2 }
      }
    ]
  },
  tags: ['high-value', 'approval-required', 'it-equipment']
};

/** Goods receipt fixture */
export interface GoodsReceiptFixture {
  readonly fixtureId: string;
  readonly description: string;
  readonly input: GoodsReceiptInput;
  readonly expectedOutput: GoodsReceiptOutput;
  readonly tags: string[];
}

interface GoodsReceiptInput {
  readonly poNumber: string;
  readonly receiptLines: Array<{
    readonly poLineNumber: number;
    readonly receivedQuantity: number;
    readonly lotNumber?: string;
  }>;
  readonly receiptDate: string;
  readonly deliveryNote: string;
}

interface GoodsReceiptOutput {
  readonly receiptNumber: string;
  readonly receiptStatus: string;
  readonly varianceReport: {
    readonly hasVariance: boolean;
    readonly variances: Array<{
      readonly lineNumber: number;
      readonly varianceType: string;
      readonly varianceQuantity: number;
    }>;
  };
}

/** Full goods receipt */
export const FULL_GOODS_RECEIPT: GoodsReceiptFixture = {
  fixtureId: 'po-fixture-003',
  description: 'Full receipt of all ordered items',
  input: {
    poNumber: 'PO-2024-000001',
    receiptLines: [
      { poLineNumber: 1, receivedQuantity: 50 },
      { poLineNumber: 2, receivedQuantity: 20 }
    ],
    receiptDate: '2024-01-25',
    deliveryNote: 'DN-2024-001'
  },
  expectedOutput: {
    receiptNumber: 'GR-2024-000001',
    receiptStatus: 'COMPLETE',
    varianceReport: {
      hasVariance: false,
      variances: []
    }
  },
  tags: ['full-receipt', 'no-variance']
};

/** All fixtures */
export const PO_FIXTURES = {
  purchaseOrders: [
    STANDARD_PURCHASE_ORDER,
    HIGH_VALUE_PURCHASE_ORDER
  ],
  goodsReceipts: [
    FULL_GOODS_RECEIPT
  ]
};
