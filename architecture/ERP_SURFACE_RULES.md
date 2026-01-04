# ERP Surface Dependency Rules

## Document Purpose

This document defines the mandatory dependency constraints for the `erp-surface` repository. All contributions, imports, and architectural changes must comply with these rules. Violations constitute blocking defects.

---

## Layer Position

`erp-surface` occupies **Layer 3 (Capability Schemas)** in the platform architecture.

```
Layer 5: Orchestration        [agentics-platform-core]
Layer 4: Planning             [agentics-simulation-planner, agentics-deployment-intent, agentics-org-manifests]
Layer 3: Capability Schemas   [erp-surface] ← THIS REPOSITORY
Layer 2: Observability        [llm-observatory, llm-sentinel, llm-shield, llm-memory-graph]
Layer 1: Test Infrastructure  [llm-test-bench]
Layer 0: Infrastructure       [FORBIDDEN]
```

---

## Allowed Dependencies

### Inbound (What May Consume erp-surface)

| Repository | Consumption Type |
|------------|------------------|
| `agentics-simulation-planner` | Surface contracts, behavioral models |
| `agentics-deployment-intent` | Capability schemas, event definitions |
| `agentics-org-manifests` | Surface registry, vendor coverage matrix |
| `llm-test-bench` | Fixtures, trace schemas, replay contracts |
| `llm-observatory` | Event schemas, telemetry points |
| `llm-shield` | Validation schemas, security boundaries |
| `llm-sentinel` | Behavioral baselines, state machines |
| `llm-memory-graph` | Context structures, correlation hints |
| `agentics-platform-core` | Binding interfaces, surface registry |

### Outbound (What erp-surface May Consume)

**NONE.**

`erp-surface` consumes from no lower layers. It is a pure schema and contract definition repository with zero runtime dependencies.

---

## Allowed Exports

`erp-surface` exposes **only** the following artifact types:

| Artifact Type | Description |
|---------------|-------------|
| Surface contracts | Input/output type definitions |
| Event schemas | Observable event structures |
| State machines | Entity lifecycle definitions |
| Behavioral models | Expected operation patterns |
| Error catalogs | Typed error hierarchies |
| Fixtures | Deterministic test data |
| Trace schemas | Replay format definitions |
| Vendor coverage | Capability matrix by ERP system |

---

## Forbidden Dependencies

The following are **explicitly prohibited** in `erp-surface`:

### Infrastructure

| Forbidden | Rationale |
|-----------|-----------|
| Database clients | No runtime data access |
| Message queues | No runtime messaging |
| Cache clients | No runtime caching |
| File system operations | No runtime I/O |
| Network clients | No runtime connectivity |
| Process spawning | No runtime execution |

### Services

| Forbidden | Rationale |
|-----------|-----------|
| HTTP clients | No API calls |
| gRPC clients | No service calls |
| WebSocket clients | No streaming connections |
| GraphQL clients | No query execution |

### Vendor Dependencies

| Forbidden | Rationale |
|-----------|-----------|
| SAP SDK | Vendor-neutral contracts only |
| Oracle SDK | Vendor-neutral contracts only |
| Salesforce SDK | Vendor-neutral contracts only |
| Workday SDK | Vendor-neutral contracts only |
| Microsoft Dynamics SDK | Vendor-neutral contracts only |
| NetSuite SDK | Vendor-neutral contracts only |
| ServiceNow SDK | Vendor-neutral contracts only |
| Any vendor API client | Vendor-neutral contracts only |

### Authentication

| Forbidden | Rationale |
|-----------|-----------|
| OAuth libraries | No authentication flows |
| JWT libraries | No token handling |
| Credential managers | No secrets access |
| API key handling | No runtime auth |

### Runtime Execution

| Forbidden | Rationale |
|-----------|-----------|
| Job schedulers | No runtime scheduling |
| Worker threads | No runtime execution |
| Event loops | No runtime processing |
| Retry logic | No runtime error handling |
| Circuit breakers | No runtime resilience |
| Connection pools | No runtime connections |

---

## Forbidden Patterns

### Code Patterns

```typescript
// FORBIDDEN: Runtime HTTP calls
import axios from 'axios';
import fetch from 'node-fetch';

// FORBIDDEN: Vendor SDKs
import { SAPClient } from '@sap/sdk';
import { SalesforceConnection } from 'jsforce';

// FORBIDDEN: Database access
import { Pool } from 'pg';
import { MongoClient } from 'mongodb';

// FORBIDDEN: Environment-dependent logic
if (process.env.NODE_ENV === 'production') { }

// FORBIDDEN: Async operations with side effects
await externalService.call();
```

### Architectural Patterns

| Forbidden Pattern | Rationale |
|-------------------|-----------|
| Repository pattern with DB | No data persistence |
| Service layer with API calls | No external communication |
| Middleware chains | No request processing |
| Event handlers with side effects | No runtime behavior |
| Dependency injection of clients | No runtime dependencies |

---

## Allowed Patterns

### Code Patterns

```typescript
// ALLOWED: Pure type definitions
export interface JournalEntryInput {
  readonly companyCode: string;
  readonly lineItems: readonly LineItem[];
}

// ALLOWED: Immutable data structures
export const GL_STATE_MACHINE = {
  states: ['DRAFT', 'POSTED', 'REVERSED'],
  transitions: [...]
} as const;

// ALLOWED: Pure functions for validation
export const validateBalance = (entry: JournalEntry): ValidationResult => {
  // Pure computation, no side effects
};

// ALLOWED: Factory functions for test fixtures
export const createJournalFixture = (): JournalEntryFixture => ({
  // Deterministic fixture data
});
```

---

## Enforcement

### Automated Checks

| Check | Enforcement |
|-------|-------------|
| Import analysis | CI blocks forbidden imports |
| Dependency audit | CI blocks forbidden packages |
| AST scanning | CI blocks forbidden patterns |
| Type-only verification | CI verifies no runtime exports |

### Review Requirements

| Change Type | Required Review |
|-------------|-----------------|
| New dependency | Architecture review required |
| New export type | Schema review required |
| Cross-layer import | Automatic rejection |

---

## Violation Consequences

| Severity | Consequence |
|----------|-------------|
| Forbidden import | PR blocked, immediate revert required |
| Forbidden pattern | PR blocked, refactor required |
| Layer violation | PR blocked, architecture review required |
| Vendor dependency | PR blocked, permanent ban on pattern |

---

## Exceptions

**There are no exceptions to these rules.**

If a use case appears to require a forbidden dependency, the use case belongs in a different repository:

| If you need... | Use this repository instead |
|----------------|----------------------------|
| Runtime API calls | `agentics-deployment-intent` |
| Vendor SDK integration | Binding layer (not erp-surface) |
| Database persistence | `agentics-platform-core` |
| Authentication | `agentics-platform-core` |
| Job scheduling | `agentics-platform-core` |

---

## Compliance Statement

All code in `erp-surface` must be:

1. **Pure** — No side effects, no I/O, no network
2. **Deterministic** — Same input produces same output
3. **Vendor-neutral** — No vendor-specific code paths
4. **Type-only** — Schemas and contracts, not implementations
5. **Immutable** — All exports are readonly

This repository defines **what** ERP operations look like, not **how** they execute.
