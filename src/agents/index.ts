/**
 * ERP Surface Agents
 *
 * Agent implementations for the ERP Surface repository.
 *
 * All agents in this repository follow the ERP Surface Infrastructure Constitution:
 * - Stateless at runtime
 * - Deterministic
 * - Side-effect constrained to explicit external system calls
 * - Append-only DecisionEvent writes via ruvector-service
 *
 * @module agents
 */

// =============================================================================
// ERP INTEGRATION AGENT
// =============================================================================

export * from './erp-integration';
