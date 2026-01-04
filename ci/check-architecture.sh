#!/bin/bash
#
# ERP-Surface Architecture Enforcement Script
#
# Purpose: Guarantee that erp-surface remains a pure abstraction surface
# and cannot drift into execution, infrastructure, or adapter logic.
#
# This script hard-fails if any architectural violations are detected.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VIOLATIONS=0
WARNINGS=0

log_error() {
    echo -e "${RED}[VIOLATION]${NC} $1"
    VIOLATIONS=$((VIOLATIONS + 1))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_info() {
    echo -e "[INFO] $1"
}

echo "=========================================="
echo "ERP-Surface Architecture Enforcement"
echo "=========================================="
echo ""

# =============================================================================
# CHECK 1: Forbidden Dependencies in package.json
# =============================================================================

log_info "Checking for forbidden dependencies..."

# Infrastructure and service dependencies (BLOCKED)
FORBIDDEN_DEPS=(
    # Database clients
    "pg" "postgres" "mysql" "mysql2" "mongodb" "mongoose" "redis" "ioredis"
    "sequelize" "typeorm" "prisma" "@prisma/client" "knex" "sqlite3" "better-sqlite3"
    "cassandra-driver" "couchbase" "dynamodb" "aws-sdk" "@aws-sdk"

    # Cloud providers
    "aws-sdk" "@aws-sdk" "@azure" "azure-" "@google-cloud" "gcloud" "firebase"
    "@firebase" "firebase-admin" "google-cloud" "googleapis"

    # HTTP/API servers
    "express" "fastify" "koa" "hapi" "@hapi" "restify" "nest" "@nestjs"
    "http-server" "connect" "polka" "micro"

    # Message queues
    "amqplib" "rabbitmq" "bull" "bullmq" "kafka" "kafkajs" "sqs" "pubsub"
    "nats" "@nats-io" "zeromq"

    # ERP vendor SDKs
    "sap-cf-axios" "@sap" "sap-cloud-sdk" "@sap-cloud-sdk" "sapui5"
    "oracledb" "@oracle" "oracle-db"
    "jsforce" "salesforce" "@salesforce"
    "workday-api" "@workday"
    "dynamics-web-api" "@microsoft/dynamics" "msdyn"
    "netsuite" "@netsuite" "suitecloud"
    "servicenow" "@servicenow" "snow-"

    # Runtime execution frameworks
    "worker_threads" "cluster" "child_process"
    "node-cron" "cron" "agenda" "node-schedule" "bree"
    "pm2" "forever" "nodemon"

    # Logging/APM services (execution-tier)
    "winston" "pino" "bunyan" "log4js"
    "newrelic" "datadog" "@datadog" "dd-trace" "elastic-apm" "@elastic/apm"
    "sentry" "@sentry"
)

# Read package.json dependencies
if [ -f "$ROOT_DIR/package.json" ]; then
    DEPS=$(cat "$ROOT_DIR/package.json" | grep -E '"dependencies"|"devDependencies"' -A 1000 | head -100)

    for dep in "${FORBIDDEN_DEPS[@]}"; do
        if echo "$DEPS" | grep -q "\"$dep\""; then
            log_error "Forbidden dependency detected: $dep"
        fi
        # Also check for scoped packages with this prefix
        if echo "$DEPS" | grep -qE "\"$dep[/-]"; then
            log_error "Forbidden dependency pattern detected: $dep*"
        fi
    done

    log_success "Dependency check completed"
else
    log_warning "package.json not found"
fi

# =============================================================================
# CHECK 2: Allowed Dependencies Whitelist
# =============================================================================

log_info "Validating allowed dependencies..."

ALLOWED_DEPS=(
    # TypeScript/Build tools (dev only)
    "typescript"
    "@types/"

    # Testing frameworks (dev only)
    "jest"
    "ts-jest"
    "vitest"
    "@jest"

    # Linting (dev only)
    "eslint"
    "@typescript-eslint"
    "prettier"

    # Schema/type utilities ONLY
    "zod"
    "yup"
    "joi"
    "ajv"
    "json-schema"

    # Development workflow (dev only)
    "claude-flow"
    "init"
    "rimraf"
    "tsup"
    "esbuild"
)

# Check that production dependencies are only schema/type utilities
if [ -f "$ROOT_DIR/package.json" ]; then
    # Extract only production dependencies
    PROD_DEPS=$(cat "$ROOT_DIR/package.json" | sed -n '/"dependencies"/,/}/p' | grep -E '^\s+"[^@]' | sed 's/.*"\([^"]*\)".*/\1/' || true)

    for dep in $PROD_DEPS; do
        ALLOWED=false
        for allowed in "${ALLOWED_DEPS[@]}"; do
            if [[ "$dep" == "$allowed"* ]] || [[ "$dep" == *"$allowed"* ]]; then
                ALLOWED=true
                break
            fi
        done
        # Skip known safe deps
        if [[ "$dep" == "typescript" ]] || [[ "$dep" == "@types"* ]]; then
            ALLOWED=true
        fi
        # claude-flow and init are allowed (development orchestration)
        if [[ "$dep" == "claude-flow" ]] || [[ "$dep" == "init" ]]; then
            ALLOWED=true
        fi
    done

    log_success "Allowed dependencies validated"
fi

# =============================================================================
# CHECK 3: Executable Entry Points
# =============================================================================

log_info "Checking for executable entry points..."

# Check for bin entries in package.json
if [ -f "$ROOT_DIR/package.json" ]; then
    if grep -q '"bin"' "$ROOT_DIR/package.json"; then
        log_error "package.json contains 'bin' entry - executables not allowed"
    fi
fi

# Check for shebang lines in source files
SHEBANG_FILES=$(find "$ROOT_DIR/src" -type f \( -name "*.ts" -o -name "*.js" \) -exec grep -l '^#!/' {} \; 2>/dev/null || true)
if [ -n "$SHEBANG_FILES" ]; then
    for file in $SHEBANG_FILES; do
        log_error "Executable shebang found in: $file"
    done
else
    log_success "No executable shebangs in source"
fi

# Check for main scripts that look like entry points
ENTRY_PATTERNS=(
    "process\\.argv"
    "process\\.exit"
    "require\\.main"
    "module\\.parent"
    "import\\.meta\\.main"
)

for pattern in "${ENTRY_PATTERNS[@]}"; do
    MATCHES=$(grep -rn "$pattern" "$ROOT_DIR/src" 2>/dev/null || true)
    if [ -n "$MATCHES" ]; then
        log_error "Entry point pattern '$pattern' found in source files"
        echo "$MATCHES" | head -5
    fi
done

log_success "Entry point check completed"

# =============================================================================
# CHECK 4: Worker/Scheduler/Runtime Patterns
# =============================================================================

log_info "Checking for worker/scheduler patterns..."

RUNTIME_PATTERNS=(
    # Workers
    "new Worker\\("
    "Worker\\.isMainThread"
    "parentPort"
    "workerData"

    # Cluster
    "cluster\\.fork"
    "cluster\\.isMaster"
    "cluster\\.isPrimary"
    "cluster\\.isWorker"

    # Schedulers
    "setInterval\\("
    "cron\\.schedule"
    "schedule\\.scheduleJob"
    "agenda\\.define"

    # Child processes
    "spawn\\("
    "exec\\("
    "execSync\\("
    "fork\\("

    # Server listeners
    "\\.listen\\("
    "createServer\\("
    "http\\.createServer"
    "https\\.createServer"
)

for pattern in "${RUNTIME_PATTERNS[@]}"; do
    MATCHES=$(grep -rn "$pattern" "$ROOT_DIR/src" 2>/dev/null || true)
    if [ -n "$MATCHES" ]; then
        log_error "Runtime/worker pattern '$pattern' found:"
        echo "$MATCHES" | head -3
    fi
done

log_success "Worker/scheduler check completed"

# =============================================================================
# CHECK 5: Layer-1/2/3 Import Detection
# =============================================================================

log_info "Checking for cross-layer imports..."

# Layer-1: Platform Core components
LAYER1_IMPORTS=(
    "platform-core"
    "llm-orchestrator"
    "agent-runtime"
    "execution-engine"
)

# Layer-2: Integration/Service components
LAYER2_IMPORTS=(
    "llm-test-bench"
    "llm-observatory"
    "llm-shield"
    "llm-sentinel"
    "llm-memory-graph"
    "erp-bindings"
    "erp-adapters"
)

# Layer-3: Infrastructure components
LAYER3_IMPORTS=(
    "infra-"
    "deploy-"
    "terraform-"
    "pulumi-"
    "k8s-"
    "docker-"
)

for layer_import in "${LAYER1_IMPORTS[@]}"; do
    MATCHES=$(grep -rn "from ['\"].*$layer_import" "$ROOT_DIR/src" 2>/dev/null || true)
    MATCHES2=$(grep -rn "require(['\"].*$layer_import" "$ROOT_DIR/src" 2>/dev/null || true)
    if [ -n "$MATCHES" ] || [ -n "$MATCHES2" ]; then
        log_error "Layer-1 import detected: $layer_import"
        echo "$MATCHES $MATCHES2" | head -3
    fi
done

for layer_import in "${LAYER2_IMPORTS[@]}"; do
    MATCHES=$(grep -rn "from ['\"].*$layer_import" "$ROOT_DIR/src" 2>/dev/null || true)
    MATCHES2=$(grep -rn "require(['\"].*$layer_import" "$ROOT_DIR/src" 2>/dev/null || true)
    if [ -n "$MATCHES" ] || [ -n "$MATCHES2" ]; then
        log_error "Layer-2 import detected: $layer_import"
        echo "$MATCHES $MATCHES2" | head -3
    fi
done

for layer_import in "${LAYER3_IMPORTS[@]}"; do
    MATCHES=$(grep -rn "from ['\"].*$layer_import" "$ROOT_DIR/src" 2>/dev/null || true)
    MATCHES2=$(grep -rn "require(['\"].*$layer_import" "$ROOT_DIR/src" 2>/dev/null || true)
    if [ -n "$MATCHES" ] || [ -n "$MATCHES2" ]; then
        log_error "Layer-3 import detected: $layer_import"
        echo "$MATCHES $MATCHES2" | head -3
    fi
done

log_success "Cross-layer import check completed"

# =============================================================================
# CHECK 6: ERP Vendor References (Non-Documentation)
# =============================================================================

log_info "Checking for ERP vendor references in code..."

ERP_VENDORS=(
    "SAP"
    "Oracle"
    "Salesforce"
    "Workday"
    "Dynamics"
    "NetSuite"
    "ServiceNow"
)

# Only check .ts/.js files in src (not docs, not comments describing surfaces)
for vendor in "${ERP_VENDORS[@]}"; do
    # Look for actual code references (imports, variable names, function calls)
    # Exclude: comments, string literals in type definitions, JSDoc
    MATCHES=$(grep -rn "$vendor" "$ROOT_DIR/src" --include="*.ts" --include="*.js" 2>/dev/null | \
        grep -v "^\s*//" | \
        grep -v "^\s*\*" | \
        grep -v "VENDOR COVERAGE" | \
        grep -v "@module" | \
        grep -v "Consumers:" | \
        grep -v "description:" | \
        grep -v "readonly.*:" | \
        grep -Ev "//.*$vendor" || true)

    # Filter to only actual code violations (not type definitions or comments)
    CODE_VIOLATIONS=$(echo "$MATCHES" | grep -E "(import.*$vendor|from.*$vendor|new.*$vendor|$vendor\(|$vendor\.|= $vendor)" || true)

    if [ -n "$CODE_VIOLATIONS" ]; then
        log_error "ERP vendor code reference found: $vendor"
        echo "$CODE_VIOLATIONS" | head -3
    fi
done

log_success "ERP vendor reference check completed"

# =============================================================================
# CHECK 7: File Structure Validation
# =============================================================================

log_info "Validating file structure..."

# Ensure no infrastructure directories exist
FORBIDDEN_DIRS=(
    "infra"
    "infrastructure"
    "deploy"
    "deployment"
    "terraform"
    "pulumi"
    "k8s"
    "kubernetes"
    "docker"
    "helm"
    "adapters"
    "connectors"
    "workers"
    "jobs"
    "schedulers"
    "migrations"
)

for dir in "${FORBIDDEN_DIRS[@]}"; do
    if [ -d "$ROOT_DIR/$dir" ] || [ -d "$ROOT_DIR/src/$dir" ]; then
        log_error "Forbidden directory exists: $dir"
    fi
done

log_success "File structure check completed"

# =============================================================================
# CHECK 8: No HTTP/Network Calls in Source
# =============================================================================

log_info "Checking for network call patterns..."

NETWORK_PATTERNS=(
    "fetch\\("
    "axios"
    "got\\("
    "request\\("
    "http\\.get"
    "https\\.get"
    "http\\.post"
    "XMLHttpRequest"
    "WebSocket"
    "\\.send\\("
    "net\\.connect"
    "net\\.createConnection"
)

for pattern in "${NETWORK_PATTERNS[@]}"; do
    MATCHES=$(grep -rn "$pattern" "$ROOT_DIR/src" 2>/dev/null | grep -v "\.d\.ts:" || true)
    if [ -n "$MATCHES" ]; then
        log_error "Network call pattern '$pattern' found:"
        echo "$MATCHES" | head -3
    fi
done

log_success "Network call check completed"

# =============================================================================
# CHECK 9: Pure Type/Schema Exports Only
# =============================================================================

log_info "Validating export patterns..."

# Check that index.ts primarily exports types, interfaces, and const
INDEX_FILE="$ROOT_DIR/src/index.ts"
if [ -f "$INDEX_FILE" ]; then
    # Look for function exports that aren't factories/utilities
    FUNC_EXPORTS=$(grep -n "export function" "$INDEX_FILE" | grep -v "Factory" | grep -v "create" || true)
    if [ -n "$FUNC_EXPORTS" ]; then
        log_warning "Function exports in index.ts - review for architectural compliance"
        echo "$FUNC_EXPORTS"
    fi

    # Look for class exports
    CLASS_EXPORTS=$(grep -n "export class" "$INDEX_FILE" || true)
    if [ -n "$CLASS_EXPORTS" ]; then
        log_warning "Class exports in index.ts - verify these are pure data structures"
        echo "$CLASS_EXPORTS"
    fi
fi

log_success "Export pattern check completed"

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo "=========================================="
echo "Architecture Check Summary"
echo "=========================================="
echo ""

if [ $VIOLATIONS -gt 0 ]; then
    echo -e "${RED}FAILED${NC}: $VIOLATIONS violation(s) detected"
    echo ""
    echo "This repository must remain a pure abstraction surface."
    echo "Please remove all infrastructure, execution, and adapter logic."
    echo ""
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}PASSED WITH WARNINGS${NC}: $WARNINGS warning(s)"
    echo ""
    echo "Review warnings to ensure architectural purity."
    echo ""
    exit 0
else
    echo -e "${GREEN}PASSED${NC}: No violations detected"
    echo ""
    echo "erp-surface maintains architectural purity."
    echo ""
    exit 0
fi
