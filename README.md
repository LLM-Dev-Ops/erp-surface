# ERP Surface

[![Cloud Run](https://img.shields.io/badge/Cloud%20Run-Deployed-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://erp-surface-1062287243982.us-central1.run.app)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](Dockerfile)

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square&logo=github-actions)](https://github.com)
[![API Status](https://img.shields.io/badge/API-Online-success?style=flat-square&logo=statuspage)](https://erp-surface-1062287243982.us-central1.run.app/health)
[![Surfaces](https://img.shields.io/badge/Surfaces-26-blue?style=flat-square)](https://erp-surface-1062287243982.us-central1.run.app/v1/erpsurface)
[![Operations](https://img.shields.io/badge/Operations-94-blue?style=flat-square)]()
[![Events](https://img.shields.io/badge/Events-112-blue?style=flat-square)]()

---

A **surface abstraction layer** for ERP systems that enables simulation-to-execution conversion without contract redesign. Provides a unified API across multiple ERP vendors with strict contract validation.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ERP Surface API                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   HTTP      │  │  Contract   │  │    Surface Registry     │  │
│  │  Boundary   │──│  Validation │──│    (26 Surfaces)        │  │
│  │  (server)   │  │    (Ajv)    │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        Domain Surfaces                          │
│  ┌──────────┐ ┌──────────────┐ ┌─────┐ ┌──────────────┐        │
│  │ Finance  │ │ Procurement  │ │ HCM │ │ Supply Chain │  ...   │
│  │(5 surfs) │ │  (4 surfs)   │ │(5)  │ │   (4 surfs)  │        │
│  └──────────┘ └──────────────┘ └─────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────────┤
│                      Vendor Bindings                            │
│  ┌─────┐ ┌────────┐ ┌────────────┐ ┌─────────┐ ┌──────────┐    │
│  │ SAP │ │ Oracle │ │ Salesforce │ │ Workday │ │ Dynamics │    │
│  │(21) │ │  (22)  │ │    (9)     │ │  (13)   │ │   (14)   │    │
│  └─────┘ └────────┘ └────────────┘ └─────────┘ └──────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Live API

The API is deployed and accessible at:

```bash
# Health check
curl https://erp-surface-1062287243982.us-central1.run.app/health

# List all surfaces
curl https://erp-surface-1062287243982.us-central1.run.app/v1/erpsurface

# Get a specific surface
curl -X POST https://erp-surface-1062287243982.us-central1.run.app/v1/erpsurface \
  -H 'Content-Type: application/json' \
  -d '{"action":"getSurface","surfaceId":"finance.general-ledger"}'
```

### Local Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Start server
npm start

# Run tests
npm test
```

### Docker

```bash
# Build image
docker build -t erp-surface .

# Run container
docker run -p 8080:8080 erp-surface
```

## 📡 API Reference

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/v1/erpsurface` | List surfaces and statistics |
| `POST` | `/v1/erpsurface` | Surface operations |

### POST Actions

| Action | Description |
|--------|-------------|
| `getSurface` | Retrieve a specific surface definition |
| `simulate` | Run simulation on a surface operation |
| `execute` | Execute a surface operation (future binding) |

### Request Schema

```typescript
{
  "action": "getSurface" | "simulate" | "execute",
  "surfaceId": string,      // e.g., "finance.general-ledger"
  "operationId"?: string,   // Required for simulate/execute
  "input"?: object          // Operation input payload
}
```

### Response Schema

All responses include mandatory execution proof:

```typescript
{
  "success": boolean,
  "execution_id": string,           // UUID
  "layers_executed": string[],      // Execution trace
  "data"?: object,                  // Success payload
  "error"?: {
    "code": string,
    "message": string,
    "details"?: object
  },
  "timestamp": string               // ISO 8601
}
```

## 📦 Domain Surfaces

### Finance (5 Surfaces)
- `finance.general-ledger` - General Ledger operations
- `finance.accounts-payable` - AP invoice and payment processing
- `finance.accounts-receivable` - AR billing and collections
- `finance.fixed-assets` - Asset lifecycle management
- `finance.cash-management` - Cash flow and treasury

### Procurement (4 Surfaces)
- `procurement.purchase-orders` - PO creation and management
- `procurement.suppliers` - Supplier master data
- `procurement.contracts` - Contract lifecycle
- `procurement.sourcing` - Strategic sourcing

### HCM (5 Surfaces)
- `hcm.employee` - Employee master data
- `hcm.payroll` - Payroll processing
- `hcm.time` - Time and attendance
- `hcm.talent` - Talent management
- `hcm.benefits` - Benefits administration

### Supply Chain (4 Surfaces)
- `supply-chain.inventory` - Inventory management
- `supply-chain.warehouse` - Warehouse operations
- `supply-chain.manufacturing` - Production planning
- `supply-chain.logistics` - Shipping and logistics

### Customer (4 Surfaces)
- `customer.customer-master` - Customer data management
- `customer.opportunity` - Sales opportunities
- `customer.case` - Case management
- `customer.quote` - Quote generation

### Service (4 Surfaces)
- `service.incident` - Incident management
- `service.change` - Change management
- `service.asset` - IT asset management
- `service.workflow` - Workflow automation

## 🔌 Vendor Coverage

| Vendor | Surfaces | Operations |
|--------|----------|------------|
| SAP S/4HANA | 21 | Full ERP coverage |
| Oracle ERP Cloud | 22 | Finance, SCM, HCM |
| Salesforce | 9 | CRM, Service Cloud |
| Workday | 13 | HCM, Finance |
| Microsoft Dynamics 365 | 14 | Finance, SCM, CE |
| NetSuite | 6 | Core ERP |
| ServiceNow | 6 | ITSM, ITOM |

## 🔒 Contract Validation

All requests pass through strict Ajv validation:

- ✅ No type coercion
- ✅ No default value injection
- ✅ Rejects unknown properties
- ✅ Throws `ContractValidationError` on any violation

```typescript
import { validateRequest, ContractValidationError } from '@agentics/contracts';

try {
  const validated = validateRequest(payload);
  // Process validated request
} catch (error) {
  if (error instanceof ContractValidationError) {
    // Handle validation failure
  }
}
```

## 🛠️ Conversion Model

```
Stage 1: Surface Definition
├── Define behavioral model
├── Specify input/output contracts
└── Declare observable events

Stage 2: Simulation Mode (Current)
├── Deterministic responses
├── Full observability
└── Test-bench integration

Stage 3: Execution Binding (Future)
├── Connect to actual ERP systems
├── Surface contract unchanged
└── Only backing implementation changes
```

## ☁️ Deployment

### Google Cloud Run

```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Deploy using script
./scripts/deploy-cloud-run.sh

# Or using Cloud Build
gcloud builds submit --config cloudbuild.yaml
```

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `NODE_ENV` | `production` | Environment |

## 📁 Project Structure

```
erp-surface/
├── src/
│   ├── server.ts           # HTTP server with validation boundary
│   ├── index.ts            # Main exports
│   ├── registry.ts         # Surface registry
│   ├── core/               # Core modules
│   │   ├── conversion/     # Conversion model
│   │   ├── contracts/      # Contract definitions
│   │   └── simulation/     # Simulation engine
│   ├── contracts/          # Type definitions
│   ├── composition.ts      # Platform composition
│   ├── surfaces/           # Surface implementations
│   └── bindings/           # Vendor bindings
├── packages/
│   └── contracts/          # @agentics/contracts package
├── tests/                  # Test suites
├── scripts/                # Deployment scripts
├── Dockerfile              # Multi-stage Docker build
├── cloudbuild.yaml         # GCP Cloud Build config
└── .gcloudignore          # GCP deployment exclusions
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>ERP Surface</strong> - Unified ERP abstraction layer
  <br>
  <a href="https://erp-surface-1062287243982.us-central1.run.app/health">API Status</a> •
  <a href="https://erp-surface-1062287243982.us-central1.run.app/v1/erpsurface">Surfaces</a>
</p>
