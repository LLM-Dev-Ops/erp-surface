/**
 * Supply Chain Domain Module
 *
 * Re-exports all supply chain surfaces:
 * - Inventory: Stock levels, movements, valuations, counts
 * - Warehouse: Pick lists, packing slips, shipments
 * - Manufacturing: Production orders, operations, confirmations
 * - Logistics: Shipments, tracking, delivery, transport
 */

export * from './inventory';
export * from './warehouse';
export * from './manufacturing';
export * from './logistics';
