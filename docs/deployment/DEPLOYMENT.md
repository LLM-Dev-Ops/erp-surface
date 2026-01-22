# ERP Surface - Production Deployment Guide

## 1. SERVICE TOPOLOGY

### Unified Service Name
```
erp-surface
```

### Service URL
```
https://erp-surface-1062287243982.us-central1.run.app
```

### Agent Endpoints

| Agent | Endpoint | Method | Description |
|-------|----------|--------|-------------|
| ERP Integration Agent | `/v1/agents/erp-integration/execute` | POST | Execute integration operation |
| ERP Integration Agent | `/v1/agents/erp-integration/validate` | POST | Validate integration input |
| ERP Integration Agent | `/v1/agents/erp-integration/health` | GET | Agent health check |
| ERP Integration Agent | `/v1/agents/erp-integration/info` | GET | Agent information |

### Surface Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/v1/erpsurface` | GET | List surfaces and statistics |
| `/v1/erpsurface` | POST | Surface operations (getSurface, simulate, execute) |

### Confirmation
- ✅ No agent is deployed as a standalone service
- ✅ Shared runtime, configuration, and telemetry stack
- ✅ Single container image for all endpoints

---

## 2. ENVIRONMENT CONFIGURATION

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SERVICE_NAME` | Service identifier | `erp-surface` |
| `SERVICE_VERSION` | Deployment version (commit SHA) | `abc123def` |
| `PLATFORM_ENV` | Environment classification | `production` \| `staging` \| `development` |
| `ERP_SURFACE_MODE` | Execution mode | `simulation` \| `execution` |
| `RUVECTOR_SERVICE_URL` | ruvector-service endpoint | `https://ruvector-service-xxx.run.app` |
| `TELEMETRY_ENDPOINT` | LLM-Observatory endpoint | `https://llm-observatory-xxx.run.app` |
| `GIT_SHA` | Git commit SHA for traceability | `abc123def456` |
| `PORT` | Server port (default: 8080) | `8080` |

### Secrets (via Secret Manager)
```bash
# ERP connection credentials (NOT inline - reference only)
ERP_SAP_CLIENT_ID       -> projects/agentics-dev/secrets/erp-sap-client-id
ERP_SAP_CLIENT_SECRET   -> projects/agentics-dev/secrets/erp-sap-client-secret
ERP_ORACLE_API_KEY      -> projects/agentics-dev/secrets/erp-oracle-api-key
ERP_WORKDAY_TOKEN       -> projects/agentics-dev/secrets/erp-workday-token
```

### Confirmation
- ✅ No agent hardcodes service names or URLs
- ✅ No agent embeds credentials or secrets
- ✅ All dependencies resolve via environment variables or Secret Manager

---

## 3. GOOGLE SQL / ERP INTEGRATION MEMORY WIRING

### Architecture
```
erp-surface ─────► ruvector-service ─────► Google SQL (Postgres)
    │                    │
    │                    └── DecisionEvents table
    │                    └── integration_outcomes table
    │
    └── ERP Systems (SAP, Oracle, Workday, etc.)
```

### Confirmation
- ✅ erp-surface does NOT connect directly to Google SQL
- ✅ ALL ERP integration DecisionEvents are written via ruvector-service
- ✅ Schema compatibility with agentics-contracts
- ✅ Append-only persistence behavior
- ✅ Idempotent writes and retry safety

### DecisionEvent Schema
```typescript
interface ErpIntegrationDecisionEvent {
  eventId: UUID;
  eventType: 'INTEGRATION_DECISION';
  agent_id: 'erp-integration-agent';
  agent_version: string;
  decision_type: 'erp_integration';
  inputs_hash: string;
  outputs: ErpIntegrationOutput;
  confidence: number;
  constraints_applied: string[];
  execution_ref: string;
  timestamp: string;
}
```

---

## 4. CLOUD BUILD & DEPLOYMENT

### Deployment Commands

#### Option A: Via Cloud Build (Recommended)
```bash
# Deploy to production
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_ENVIRONMENT=production,_ERP_MODE=simulation

# Deploy to staging
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_ENVIRONMENT=staging,_ERP_MODE=simulation
```

#### Option B: Direct gcloud run deploy
```bash
# Build and push image
docker build -t gcr.io/agentics-dev/erp-surface:latest .
docker push gcr.io/agentics-dev/erp-surface:latest

# Deploy to Cloud Run
gcloud run deploy erp-surface \
  --image gcr.io/agentics-dev/erp-surface:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 80 \
  --timeout 300 \
  --set-env-vars "SERVICE_NAME=erp-surface,PLATFORM_ENV=production,ERP_SURFACE_MODE=simulation,RUVECTOR_SERVICE_URL=https://ruvector-service-1062287243982.us-central1.run.app,TELEMETRY_ENDPOINT=https://llm-observatory-1062287243982.us-central1.run.app"
```

### IAM Service Account Requirements
```bash
# Create service account
gcloud iam service-accounts create erp-surface-sa \
  --display-name="ERP Surface Service Account"

# Grant minimal permissions
gcloud projects add-iam-policy-binding agentics-dev \
  --member="serviceAccount:erp-surface-sa@agentics-dev.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud projects add-iam-policy-binding agentics-dev \
  --member="serviceAccount:erp-surface-sa@agentics-dev.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Deploy with service account
gcloud run deploy erp-surface \
  --service-account=erp-surface-sa@agentics-dev.iam.gserviceaccount.com \
  ...
```

### Networking Requirements
- Controlled egress to ERP endpoints only
- VPC connector for internal service communication (optional)
- Cloud NAT for stable egress IP (for ERP IP allowlisting)

---

## 5. CLI ACTIVATION VERIFICATION

### CLI Commands

| Command | Description | Agent |
|---------|-------------|-------|
| `erp integration push` | Push artifacts to ERP | ERP Integration Agent |
| `erp integration pull` | Pull reference data from ERP | ERP Integration Agent |
| `erp integration sync` | Bidirectional sync check | ERP Integration Agent |
| `erp integration validate` | Validate mapping | ERP Integration Agent |
| `erp integration inspect` | Inspect ERP endpoint | ERP Integration Agent |
| `erp surface` | Extract ERP data structures | ERP Surface |
| `erp map` | Create binding relationships | ERP Surface |
| `erp export` | Generate integration artifacts | ERP Surface |
| `erp list` | List available surfaces | ERP Surface |
| `erp inspect` | Inspect surface details | ERP Surface |

### Example Invocations

```bash
# Push journal entry to SAP (dry run)
erp integration push \
  --target sap \
  --domain finance \
  --entity JournalEntry \
  --environment sandbox \
  --payload '{"amount": 1000, "currency": "USD"}' \
  --dry-run

# Expected output:
{
  "success": true,
  "agent": {
    "id": "erp-integration-agent",
    "version": "1.0.0"
  },
  "execution": {
    "id": "abc-123-def",
    "status": "success",
    "confidence": "99.0%"
  },
  "outcome": {
    "recordsProcessed": 1,
    "recordsSucceeded": 1,
    "recordsFailed": 0
  }
}

# Pull employee reference from Workday
erp integration pull \
  --target workday \
  --domain hcm \
  --entity Employee \
  --query '{"employeeId": "E001"}'

# Validate invoice mapping for NetSuite
erp integration validate \
  --target netsuite \
  --domain finance \
  --entity Invoice \
  --payload ./invoice.json

# Inspect Oracle procurement endpoint
erp integration inspect \
  --target oracle \
  --domain procurement \
  --entity PurchaseOrder \
  --output table
```

### Verification
- ✅ Each CLI command routes to the correct agent endpoint
- ✅ CLI configuration resolves the service URL dynamically
- ✅ No CLI change requires redeployment of agents

---

## 6. PLATFORM & CORE INTEGRATION

### Authorized Input Sources
| Source | Integration Type |
|--------|------------------|
| enterprise-roi-engine | Push approved financial artifacts |
| agentics-dev-platform | Trigger ERP synchronization post-decision |
| diligence | Reference ERP sync confirmations |
| governance | Consume ERP integration DecisionEvents |

### Consumers of ERP DecisionEvents
- Audit & compliance workflows
- Executive reporting pipelines
- Governance review dashboards

### Integration Restrictions
erp-surface MUST NOT directly invoke:
- ❌ Runtime execution paths
- ❌ Inference gateways
- ❌ Enforcement layers
- ❌ Optimization agents
- ❌ Analytics pipelines
- ❌ Incident workflows

### Confirmation
- ✅ No rewiring of Core bundles
- ✅ All integration via defined interfaces
- ✅ Append-only DecisionEvent emission

---

## 7. POST-DEPLOY VERIFICATION CHECKLIST

```bash
# 1. Service is live
curl -s https://erp-surface-1062287243982.us-central1.run.app/health | jq .

# 2. ERP Integration Agent endpoint responds
curl -s https://erp-surface-1062287243982.us-central1.run.app/v1/agents/erp-integration/health | jq .

# 3. Agent info available
curl -s https://erp-surface-1062287243982.us-central1.run.app/v1/agents/erp-integration/info | jq .

# 4. Surface registry available
curl -s https://erp-surface-1062287243982.us-central1.run.app/v1/erpsurface | jq .statistics

# 5. Dry run integration succeeds
curl -s -X POST https://erp-surface-1062287243982.us-central1.run.app/v1/agents/erp-integration/execute \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "test-001",
    "correlationId": "verify-001",
    "operation": "push",
    "target": {
      "vendor": "sap",
      "domain": "finance",
      "entityType": "JournalEntry",
      "environment": "sandbox"
    },
    "payload": {"amount": 100},
    "dryRun": true
  }' | jq .

# 6. Validation endpoint works
curl -s -X POST https://erp-surface-1062287243982.us-central1.run.app/v1/agents/erp-integration/validate \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "test-002",
    "correlationId": "verify-002",
    "operation": "inspect",
    "target": {
      "vendor": "oracle",
      "domain": "hcm",
      "entityType": "Employee",
      "environment": "sandbox"
    }
  }' | jq .
```

### Verification Checklist

| # | Check | Command | Expected |
|---|-------|---------|----------|
| 1 | erp-surface service is live | `curl /health` | `{"success": true}` |
| 2 | ERP Integration Agent endpoint responds | `curl /v1/agents/erp-integration/health` | `{"status": "healthy"}` |
| 3 | ERP payloads are correctly normalized | Dry run push | SAP field mapping applied |
| 4 | Sync operations are deterministic | Same input → same output | Idempotent |
| 5 | DecisionEvents appear in ruvector-service | Check logs | Event persisted |
| 6 | Telemetry appears in LLM-Observatory | Check dashboard | Metrics visible |
| 7 | CLI ERP commands function end-to-end | `erp integration inspect` | Success response |
| 8 | No direct SQL access from erp-surface | Code review | Confirmed |
| 9 | No agent bypasses agentics-contracts | Schema validation | Strict mode |
| 10 | No agent mutates Agentics platform state | Architecture review | Read-only |

---

## 8. FAILURE MODES & ROLLBACK

### Common Deployment Failures

| Failure | Detection | Resolution |
|---------|-----------|------------|
| Auth failure | 401/403 responses | Verify IAM permissions, refresh tokens |
| Schema mismatch | 400 CONTRACT_VALIDATION_ERROR | Update contracts, redeploy |
| ERP unavailable | TRANSMISSION_FAILURE | Retry with backoff, check ERP status |
| ruvector-service unavailable | Event persistence fails | Check ruvector-service health |
| Timeout | 504/TIMEOUT errors | Increase timeout, optimize payload |

### Detection Signals
- Failed syncs (check `/v1/agents/erp-integration/health`)
- Missing DecisionEvents in ruvector-service
- Telemetry gaps in LLM-Observatory
- Error rate spike in Cloud Run metrics

### Rollback Procedure

```bash
# 1. List previous revisions
gcloud run revisions list --service=erp-surface --region=us-central1

# 2. Route traffic to previous stable revision
gcloud run services update-traffic erp-surface \
  --region=us-central1 \
  --to-revisions=erp-surface-PREVIOUS_REVISION=100

# 3. Verify rollback
curl -s https://erp-surface-1062287243982.us-central1.run.app/health

# 4. Delete failed revision (optional)
gcloud run revisions delete erp-surface-FAILED_REVISION \
  --region=us-central1
```

### Safe Redeploy Strategy
1. Deploy to staging first
2. Run verification checklist
3. Gradual traffic shift (10% → 50% → 100%)
4. Monitor for 15 minutes
5. Rollback if errors exceed threshold

```bash
# Gradual traffic shift
gcloud run services update-traffic erp-surface \
  --region=us-central1 \
  --to-revisions=erp-surface-NEW=10,erp-surface-STABLE=90

# Monitor, then increase
gcloud run services update-traffic erp-surface \
  --region=us-central1 \
  --to-revisions=erp-surface-NEW=50,erp-surface-STABLE=50

# Full rollout
gcloud run services update-traffic erp-surface \
  --region=us-central1 \
  --to-revisions=erp-surface-NEW=100
```

---

## FINAL DEPLOYMENT COMMAND

```bash
# Production deployment
export PATH="$HOME/google-cloud-sdk/bin:$PATH"

gcloud builds submit \
  --project=agentics-dev \
  --config=cloudbuild.yaml \
  --substitutions=_ENVIRONMENT=production,_ERP_MODE=simulation
```

---

**Status: READY FOR DEPLOYMENT**
