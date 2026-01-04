# ADR-001: Platform Composition Model for erp-surface

## Status

**Accepted**

## Date

2026-01-04

## Context

The Agentics Platform ecosystem consists of multiple specialized repositories:
- **erp-surface**: Surface contract authority (this repository)
- **LLM-Test-Bench**: Deterministic benchmarking
- **LLM-Observatory**: Telemetry and drift detection
- **LLM-Shield**: Security and policy enforcement
- **LLM-Sentinel**: Runtime anomaly detection
- **LLM-Memory-Graph**: Context lineage tracking
- **Agentics Platform Core**: Orchestration and simulation control

Each repository has distinct responsibilities that must not overlap. This ADR establishes how erp-surface composes with these repositories without implying integration ownership or responsibility overlap.

## Decision

### 1. erp-surface as Surface Contract Authority

erp-surface is the **sole authority** for surface contract definitions. It:

1. **Defines** all surface contracts, schemas, and behavioral models
2. **Publishes** immutable, versioned contract specifications
3. **Provides** read-only access to all platform consumers
4. **Never** executes, enforces, detects, stores, or orchestrates

### 2. Composition Over Integration

We chose **composition** semantics over **integration** semantics:

| Aspect | Composition (Chosen) | Integration (Rejected) |
|--------|---------------------|----------------------|
| Coupling | Loose | Tight |
| Ownership | Clear boundaries | Shared responsibility |
| Dependencies | Unidirectional | Bidirectional |
| Vocabulary | Surface, contract, binding | SDK, API client, webhook |

### 3. Unidirectional Data Flow

All data flows FROM erp-surface TO consumers. Consumers:
- Subscribe to contract publications
- Poll for updates
- Never push back to erp-surface

### 4. Immutable Contracts

Published surface contracts are immutable:
- No modification after publication
- Versioned releases only
- Deprecation requires migration period
- Breaking changes require major version bump

### 5. Explicit Boundary Guarantees

Six guarantees define composition boundaries:

| Guarantee | erp-surface Provides | erp-surface Never Does |
|-----------|---------------------|----------------------|
| G1: Definition vs Execution | Surface definitions | Execute surfaces |
| G2: Schema vs Enforcement | Validation schemas | Enforce policies |
| G3: Model vs Detection | Behavioral models | Detect anomalies |
| G4: Event vs Observation | Event schemas | Collect telemetry |
| G5: Context vs Lineage | Context structures | Track lineage |
| G6: Contract vs Orchestration | Surface contracts | Orchestrate agents |

## Consequences

### Positive

1. **Clear Ownership**: Each repository owns its domain completely
2. **No Overlap**: Explicit boundaries prevent responsibility confusion
3. **Loose Coupling**: Consumers can evolve independently
4. **Testability**: Each component testable in isolation
5. **Scalability**: Components scale independently

### Negative

1. **Coordination Overhead**: Version alignment requires coordination
2. **Discovery Challenge**: Consumers must know where to find contracts
3. **Duplication Risk**: Similar patterns may emerge in consumers

### Neutral

1. **Schema Evolution**: Requires careful versioning strategy
2. **Documentation**: Must maintain clear boundary documentation

## Alternatives Considered

### Alternative 1: Shared Library Approach

**Rejected** because:
- Creates tight coupling
- Blurs ownership boundaries
- Makes independent evolution difficult

### Alternative 2: Event-Driven Integration

**Rejected** because:
- Implies bidirectional communication
- Suggests integration ownership
- Vocabulary conflicts with composition model

### Alternative 3: Monorepo Structure

**Rejected** because:
- Reduces autonomy
- Complicates access control
- Increases coordination burden

## Compliance

This ADR complies with:
- Platform composition constraints
- Vocabulary restrictions (surface, contract, binding only)
- No integration terminology (SDK, API client, webhook, OAuth)

## References

- Platform Composition Model: `/docs/architecture/platform-composition-model.md`
- Surface Contract Types: `/src/contracts/types.ts`
- Consumer Interfaces: `/src/bindings/consumer-interfaces.ts`

## Appendix: Vocabulary Guidelines

### Allowed Terms
- Surface
- Contract
- Interface
- Behavioral model
- Binding
- Schema
- Composition
- Boundary

### Prohibited Terms
- Integration
- SDK
- API client
- Webhook
- Credentials
- OAuth
- Endpoint (in integration context)
- Service (in service-mesh context)
