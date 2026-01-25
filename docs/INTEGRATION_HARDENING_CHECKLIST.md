# ERP-SURFACE INTEGRATION HARDENING CHECKLIST

**Repository**: erp-surface
**Role**: External ERP Integration Boundary (TRUST BOUNDARY)
**Agent**: ERP Integration Agent
**Cloud Target**: Google Cloud Run

---

## ✅ TRUST BOUNDARY CONTROLS

### DecisionEvent Signals (Required)

| Signal | Status | Implementation |
|--------|--------|----------------|
| `integration_readiness_signal` | ✅ Implemented | `src/hardening/signals.ts:createReadinessSignal()` |
| `mapping_validation_signal` | ✅ Implemented | `src/hardening/signals.ts:createMappingValidationSignal()` |
| `external_risk_signal` | ✅ Implemented | `src/hardening/signals.ts:createExternalRiskSignal()` |

### Trust Boundary Enforcement

| Control | Status | Location |
|---------|--------|----------|
| Rate limiting per vendor/domain/environment | ✅ Implemented | `src/hardening/rate-limiter.ts` |
| Request signing (JOSE/ES256) | ✅ Implemented | `src/hardening/request-signing.ts` |
| Data masking (PII/Financial) | ✅ Implemented | `src/hardening/data-masking.ts` |
| Audit trail | ✅ Implemented | `src/hardening/audit-trail.ts` |
| Input validation (Ajv strict mode) | ✅ Pre-existing | `src/server.ts` |
| SHA-256 integrity hashing | ✅ Pre-existing | `src/agents/erp-integration/types.ts` |

---

## ✅ AGENT RULES COMPLIANCE

### Agent MAY (Permitted Operations)

| Operation | Status | Implementation |
|-----------|--------|----------------|
| Map schemas | ✅ | `src/agents/erp-integration/mapper.ts:mapToErpPayload()` |
| Validate integration readiness | ✅ | `src/hardening/index.ts:performTrustBoundaryChecks()` |
| Emit integration risk signals | ✅ | `src/hardening/signals.ts:createExternalRiskSignal()` |

### Agent MUST NOT (Enforced Restrictions)

| Restriction | Status | Enforcement |
|-------------|--------|-------------|
| Execute external writes without approval | ✅ Enforced | Governance approval required for production |
| Bypass governance | ✅ Enforced | `artifact.governanceApprovalRef` checked |
| Direct SQL access | ✅ Enforced | All persistence via ruvector-service |
| Execute inference | ✅ Enforced | Agent is non-inferential |
| Modify Agentics platform state | ✅ Enforced | Read-only for platform |
| Trigger orchestration | ✅ Enforced | No orchestration logic |

---

## ✅ PERFORMANCE BUDGET

| Metric | Budget | Implementation |
|--------|--------|----------------|
| MAX_LATENCY_MS | 3000ms | `src/hardening/index.ts:MAX_LATENCY_MS` |
| Latency budget check | ✅ | `src/hardening/index.ts:checkLatencyBudget()` |
| Latency risk signal | ✅ | Emitted when budget exceeded |

---

## ✅ SECURITY CONTROLS

### Secrets Management
- ✅ All credentials via Google Secret Manager
- ✅ No hardcoded secrets in code
- ✅ Environment variable injection at deploy time

### Contract Validation
- ✅ Ajv strict mode (no coercion, no defaults)
- ✅ Single validation boundary at HTTP level
- ✅ Unknown properties rejected

### Data Protection
- ✅ PII detection and masking
- ✅ Financial data masking
- ✅ Credential field masking
- ✅ Masked telemetry emission

---

## ✅ INFRASTRUCTURE REQUIREMENTS

| Requirement | Status | Configuration |
|-------------|--------|---------------|
| Ruvector REQUIRED | ✅ | `RUVECTOR_SERVICE_URL` in cloudbuild.yaml |
| Secrets in Google Secret Manager | ✅ | Environment variable references |
| Cloud Run deployment | ✅ | `cloudbuild.yaml` configured |

---

## ✅ RATE LIMIT CONFIGURATION

### By Environment
| Environment | Max Requests/min | Burst Allowance |
|-------------|-----------------|-----------------|
| Production | 100 | 10 |
| Staging | 200 | 20 |
| Development | 500 | 50 |
| Sandbox | 1000 | 100 |

### Vendor Multipliers
| Vendor | Multiplier | Effective Production Limit |
|--------|------------|---------------------------|
| SAP | 0.5 | 50/min |
| Oracle | 0.7 | 70/min |
| Workday | 0.8 | 80/min |
| Others | 1.0 | 100/min |

---

## ✅ AUDIT TRAIL EVENTS

| Event Type | Trigger |
|------------|---------|
| `request_received` | HTTP request received |
| `validation_passed` | Input validation succeeds |
| `validation_failed` | Input validation fails |
| `rate_limit_checked` | Rate limit check passed |
| `rate_limit_exceeded` | Rate limit exceeded |
| `readiness_checked` | Trust boundary check |
| `mapping_validated` | Schema mapping validated |
| `execution_started` | Integration execution begins |
| `execution_completed` | Integration execution succeeds |
| `execution_failed` | Integration execution fails |
| `risk_detected` | External risk identified |
| `response_sent` | HTTP response sent |

---

## DEPLOYMENT COMMAND

```bash
# Deploy to production with all hardening enabled
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=\
_ENVIRONMENT=production,\
_ERP_MODE=simulation,\
_REGION=us-central1,\
_MEMORY=512Mi,\
_CPU=1,\
_MIN_INSTANCES=1,\
_MAX_INSTANCES=10,\
_CONCURRENCY=80,\
_TIMEOUT=300,\
_RUVECTOR_URL=https://ruvector-service-1062287243982.us-central1.run.app,\
_TELEMETRY_URL=https://llm-observatory-1062287243982.us-central1.run.app

# For execution mode (requires binding layer):
# _ERP_MODE=execution
```

---

## POST-DEPLOYMENT VERIFICATION

```bash
# 1. Health check
curl https://erp-surface-XXXXX.run.app/health

# 2. Agent info
curl https://erp-surface-XXXXX.run.app/v1/agents/erp-integration/info

# 3. Validate input (should return validation result)
curl -X POST https://erp-surface-XXXXX.run.app/v1/agents/erp-integration/validate \
  -H "Content-Type: application/json" \
  -d '{"requestId":"test-1","correlationId":"corr-1","operation":"inspect","target":{"vendor":"sap","domain":"finance","entityType":"JournalEntry","environment":"sandbox"}}'

# 4. Execute integration (with rate limit headers)
curl -X POST https://erp-surface-XXXXX.run.app/v1/agents/erp-integration/execute \
  -H "Content-Type: application/json" \
  -d '{"requestId":"test-2","correlationId":"corr-2","operation":"inspect","target":{"vendor":"sap","domain":"finance","entityType":"JournalEntry","environment":"sandbox"}}' \
  -v  # Check X-RateLimit-* headers
```

---

## HARDENING MODULE STRUCTURE

```
src/hardening/
├── index.ts              # Main exports + integration helpers
├── signals.ts            # Trust boundary signal emission
├── rate-limiter.ts       # Per-vendor/domain rate limiting
├── data-masking.ts       # PII/financial data masking
├── audit-trail.ts        # Request lifecycle auditing
└── request-signing.ts    # JOSE/ES256 request signing
```

---

**Last Updated**: 2026-01-25
**Hardening Version**: 1.0.0
**Agent Version**: 1.0.0
