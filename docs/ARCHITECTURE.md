# Open ESG Reporting Application — Architecture & Design Specification

> **Version:** 3.0.0 | **License:** Apache 2.0 | **Last Updated:** 2025-02-26

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [ESG Data Pipeline Architecture](#2-esg-data-pipeline-architecture)
3. [Backend Architecture Detail](#3-backend-architecture-detail)
4. [GHG Calculation Engine](#4-ghg-calculation-engine)
5. [Master Data Management](#5-master-data-management)
6. [Integration Architecture (ERP/SAP Patterns)](#6-integration-architecture-erpsap-patterns)
7. [Report Generation Pipeline](#7-report-generation-pipeline)
8. [Database Design](#8-database-design)
9. [Frontend Architecture Detail](#9-frontend-architecture-detail)
10. [Security & Compliance Architecture](#10-security--compliance-architecture)
11. [Deployment Architecture](#11-deployment-architecture)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

The application implements a **domain-driven layered architecture** inspired by enterprise ERP/SAP
reporting patterns. The design follows the **Extract → Transform → Calculate → Report** pipeline
common in SAP Sustainability Control Tower and similar ESG platforms.

```text
┌────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                          │
│   React 18 + TypeScript + Tailwind CSS + Zustand               │
│   (SPA with client-side routing, charts, dashboards)           │
├────────────────────────────────────────────────────────────────┤
│                    API GATEWAY LAYER                            │
│   Express.js Routes + Middleware (Auth, Validation, CORS)      │
├────────────────────────────────────────────────────────────────┤
│                    CONTROLLER LAYER                             │
│   13 Controllers: Request handling, response formatting         │
├────────────────────────────────────────────────────────────────┤
│                    SERVICE / BUSINESS LOGIC LAYER              │
│   GHG Calculation Engine │ Report Generator │ Data Sources     │
│   Digital Signatures │ Audit Trail │ AI/Vector Search          │
├────────────────────────────────────────────────────────────────┤
│                    INTEGRATION LAYER (ERP/SAP Pattern)         │
│   REST API Connector │ SSH/SFTP │ File Parser │ Sync Scheduler │
│   Field Mapping │ Data Validation │ Connector Registry         │
├────────────────────────────────────────────────────────────────┤
│                    DATA ACCESS LAYER                            │
│   Database Adapter (PostgreSQL) │ Redis Cache │ File Storage   │
└────────────────────────────────────────────────────────────────┘
```

### 1.2 Design Principles (ESG/ERP Best Practices)

| Principle | Application | ERP/SAP Parallel |
| --- | --- | --- |
| **Data Lineage** | Full audit trail from source to report | SAP Data Intelligence lineage |
| **Master Data Governance** | Centralized emission factors, units, scopes | SAP MDG patterns |
| **Idempotent Processing** | Re-running calculations yields same results | SAP batch job principles |
| **Multi-Standard Output** | Single data entry → 6+ standard-compliant reports | SAP multi-ledger reporting |
| **Role-Based Access** | 5-level RBAC (owner→viewer) with project scoping | SAP authorization objects |
| **Fail Gracefully** | Redis optional, DB health checks, fault-tolerant jobs | ERP resilience patterns |
| **Type Safety** | Full TypeScript with Zod runtime validation | SAP ABAP type system |
| **Audit Everything** | All state-changing operations logged with context | SOX/GRC compliance patterns |

### 1.3 ESG Reporting Workflow (End-to-End)

The complete ESG reporting lifecycle follows industry-standard ERP practices:

```text
┌──────────┐   ┌───────────┐   ┌──────────────┐   ┌────────────┐
│  1. DATA │──▶│ 2. MASTER │──▶│ 3. CALCULATE │──▶│ 4. REPORT  │
│  COLLECT │   │ DATA MAP  │   │ GHG/CFP/CFO  │   │ GENERATE   │
└──────────┘   └───────────┘   └──────────────┘   └────────────┘
     │               │                │                   │
  Sources:       Emission         GHG Protocol       Multi-Standard:
  - REST API     factors,         Scope 1/2/3,       - EU CBAM
  - SSH/SFTP     conversion       15 categories,     - UK CBAM
  - CSV/Excel    tables,          Tier 1/2/3         - China Carbon
  - JSON/API     org hierarchy    methods            - K-ESG
  - Manual                                           - MAFF ESG
                                                     - Thai-ESG
     │                                                    │
     ▼                                                    ▼
┌──────────┐                                     ┌────────────┐
│ 5. AUDIT │◀────────────────────────────────────│ 6. SIGN &  │
│ TRAIL    │   7-year retention, SOX-ready       │ APPROVE    │
└──────────┘                                     └────────────┘
```

---

## 2. ESG Data Pipeline Architecture

### 2.1 Data Collection Layer (SAP-Inspired ETL)

Following SAP Data Intelligence and ERP integration patterns, the data pipeline
implements a structured **Extract → Transform → Load → Validate** workflow:

```text
┌─────────────────────────────────────────────────────────────────┐
│                   DATA SOURCE REGISTRY                          │
│   Connector Factory Pattern (like SAP Connection Manager)       │
├──────────┬──────────────┬──────────────┬───────────────────────┤
│ REST API │  SSH / SFTP  │  File Upload │  Scheduled Sync       │
│ Connector│  Connector   │  Parser      │  (Cron-based)         │
│          │              │              │                        │
│ • OAuth  │ • Key auth   │ • CSV        │ • Configurable        │
│ • Bearer │ • Password   │ • XLSX/XLS   │   cron expressions    │
│ • Custom │ • SCP/SFTP   │ • JSON       │ • Retry with backoff  │
│   headers│ • Glob match │ • Auto-detect│ • Audit on completion │
└──────────┴──────────────┴──────────────┴───────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FIELD MAPPING ENGINE                           │
│   Source Field → Target Field (case-insensitive matching)       │
│   Like SAP BAPI/RFC field mappings                              │
├─────────────────────────────────────────────────────────────────┤
│   Source: "CO2_amount"  →  Target: "quantity"                   │
│   Source: "ghg_scope"   →  Target: "scope"                      │
│   Source: "ef_value"    →  Target: "emission_factor"            │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   VALIDATION ENGINE                              │
│   Data Quality Scoring (1-5 scale, per GHG Protocol guidance)   │
├─────────────────────────────────────────────────────────────────┤
│   • Required field checks (name, scope, activity type)          │
│   • Scope classification (Scope 1/2/3 normalization)            │
│   • Numeric range validation (quantity > 0, EF > 0)             │
│   • Unit standardization (kg, tonne, kWh, litre)                │
│   • Duplicate detection and merge strategies                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Traceability

Every data record maintains full lineage from source to report, following GRI and
GHG Protocol data quality requirements:

| Stage | Tracked Metadata | Purpose |
| --- | --- | --- |
| **Collection** | Source ID, connector type, timestamp, raw payload | Audit trail origin |
| **Mapping** | Field mapping version, transformation rules applied | Reproducibility |
| **Validation** | Quality score (1-5), validation errors, warnings | Data confidence |
| **Calculation** | Method used (Tier 1/2/3), emission factors applied | Methodology proof |
| **Reporting** | Standard version, report template, generation date | Compliance record |
| **Approval** | Digital signature, signer role, approval timestamp | Legal validity |

---

## 3. Backend Architecture Detail

### 3.1 Request Processing Pipeline

```text
HTTP Request
    │
    ▼
┌─────────┐   ┌──────────┐   ┌────────────┐   ┌──────────┐
│ Helmet   │──▶│  CORS    │──▶│  Body      │──▶│  Morgan  │
│ Security │   │  Config  │   │  Parser    │   │  Logger  │
└─────────┘   └──────────┘   └────────────┘   └──────────┘
    │
    ▼
┌─────────────┐   ┌──────────────┐
│ Auth        │──▶│  Validation  │
│ Middleware  │   │  (Zod)       │
│ (JWT/RBAC)  │   │              │
└─────────────┘   └──────────────┘
    │
    ▼
┌─────────────┐   ┌──────────────┐   ┌──────────┐
│ Controller  │──▶│  Service     │──▶│  Database │
│ (Thin)      │   │  (Logic)     │   │  / Cache  │
└─────────────┘   └──────────────┘   └──────────┘
    │
    ▼
┌──────────────┐   ┌──────────────┐
│ Response     │──▶│ Error        │
│ Formatting   │   │ Handler      │
└──────────────┘   └──────────────┘
```

### 3.2 Service Layer Design (Bounded Contexts)

Each service encapsulates a **bounded context** following domain-driven design,
similar to SAP module separation (FI, CO, MM, SD):

| Service | Responsibility | SAP Module Parallel |
| --- | --- | --- |
| `ghgService` | GHG calculations, emission factors, CFP/CFO | CO-PA (Profitability Analysis) |
| `reportService` | PDF/Excel generation, batch processing | SAP Crystal Reports |
| `signatureService` | Cryptographic sign/verify/revoke | SAP Digital Signatures |
| `auditService` | CRUD, retention, cleanup, export | SAP GRC Audit Management |
| `embeddingService` | Vector search, AI features | SAP AI Core |
| `serpAPIService` | External emission factor lookup | SAP API Business Hub |
| `dataSourceService` | External data orchestration | SAP Data Intelligence |

### 3.3 Error Handling Strategy

```typescript
// Error hierarchy (like SAP exception classes)
AppError (base)
├── BadRequestError (400)    // Invalid input data
├── UnauthorizedError (401)  // Authentication failure
├── ForbiddenError (403)     // Insufficient permissions
├── NotFoundError (404)      // Resource not found
├── ConflictError (409)      // Duplicate/version conflict
└── ValidationError (422)    // Schema validation failure
```

All errors flow through the global `errorHandler` middleware which:

1. Logs error with full context (stack, request info, correlation ID)
2. Maps to appropriate HTTP status code
3. Returns standardized error response envelope
4. Sanitizes error details in production mode

---

## 4. GHG Calculation Engine

### 4.1 Calculation Architecture

The GHG calculation engine implements the complete GHG Protocol Corporate Standard,
similar to SAP Sustainability Control Tower's calculation framework:

```text
┌────────────────────────────────────────────────────────────────┐
│                   GHG CALCULATION ENGINE                        │
├────────────────┬───────────────────┬──────────────────────────┤
│   SCOPE 1      │     SCOPE 2       │       SCOPE 3            │
│   Direct       │     Energy         │       Value Chain        │
├────────────────┼───────────────────┼──────────────────────────┤
│ • Stationary   │ • Location-based  │ • Purchased Goods (Cat1) │
│   Combustion   │ • Market-based    │ • Capital Goods (Cat2)   │
│ • Mobile       │ • Grid emission   │ • Fuel/Energy (Cat3)     │
│   Combustion   │   factors per     │ • Transport (Cat4/Cat9)  │
│ • Process      │   country/region  │ • Waste (Cat5)           │
│   Emissions    │                   │ • Business Travel (Cat6) │
│ • Fugitive     │                   │ • Employee Commute (Cat7)│
│   Emissions    │                   │ • Leased Assets (Cat8)   │
│                │                   │ • ... all 15 categories  │
└────────────────┴───────────────────┴──────────────────────────┘
```

### 4.2 Calculation Methods (Tier System)

| Tier | Method | Accuracy | Data Required |
| --- | --- | --- | --- |
| **Tier 1** | Spend-based | Low | Financial data + spend EFs |
| **Tier 2** | Activity-based | Medium | Activity data + generic EFs |
| **Tier 3** | Supplier-specific | High | Primary data + specific EFs |

### 4.3 Carbon Footprint Calculations

```text
CFP (Carbon Footprint of Product):
  Emissions = Σ (Activity Data × Emission Factor × GWP)
  Per GHG: CO₂, CH₄, N₂O, HFCs, PFCs, SF₆, NF₃

CFO (Carbon Footprint of Organization):
  Total = Scope1 + Scope2 + Scope3
  Scope1 = Σ (Fuel consumed × Fuel-specific EF)
  Scope2 = Σ (Electricity purchased × Grid EF for region)
  Scope3 = Σ (Activity data × Category-specific EF)

Precursor Emissions (for EU CBAM):
  Embedded = Direct + Indirect (Scope 1 + Scope 2)
  Per product unit = Total Embedded / Production quantity
```

### 4.4 Emission Factor Database

The system maintains a comprehensive emission factor database following IPCC,
DEFRA, EPA, and regional government sources:

| Source | Coverage | Update Frequency |
| --- | --- | --- |
| IPCC AR6 | Global GWP values | Per IPCC report cycle |
| DEFRA/BEIS | UK emission factors | Annual |
| EPA | US emission factors | Annual |
| Thai TGO | Thai grid factor (0.4561 kgCO₂e/kWh) | Annual |
| EU ETS | EU allowance benchmarks | Quarterly |
| Custom | User-defined factors | On demand |

---

## 5. Master Data Management

### 5.1 Organizational Hierarchy

Following SAP's organizational unit model:

```text
Organization (Tenant)
└── Project (Reporting Entity / Legal Entity)
    ├── Activities (Emission Sources)
    │   ├── Scope 1 Activities
    │   ├── Scope 2 Activities
    │   └── Scope 3 Activities (15 categories)
    ├── Data Sources (Integration Connections)
    ├── Calculations (GHG Results)
    ├── Reports (Standard-Specific Outputs)
    └── Goals (Reduction Targets)
```

### 5.2 Master Data Entities

| Entity | Purpose | SAP Equivalent |
| --- | --- | --- |
| **Users** | Authentication, role assignment | SAP User Master (SU01) |
| **Projects** | Reporting boundary, ownership | SAP Controlling Area |
| **Emission Factors** | Conversion rates by source/region | SAP Material Master pricing |
| **Unit Conversions** | kg↔tonne, kWh↔MWh, litre↔m³ | SAP UoM conversion |
| **Standard Templates** | EU CBAM, K-ESG field mappings | SAP Output Master |
| **Scope Definitions** | GHG Protocol scope classifications | SAP Cost Element groups |

### 5.3 Data Quality Framework

Following GHG Protocol guidance on data quality scoring:

| Score | Level | Description | Example |
| --- | --- | --- | --- |
| 5 | Measured | Direct metering or supplier invoices | Utility bill kWh |
| 4 | Calculated | Engineering calculations from known parameters | Fuel efficiency × distance |
| 3 | Estimated | Industry averages or proxy data | Regional grid factor |
| 2 | Extrapolated | Scaled from partial data | Q1 data × 4 for annual |
| 1 | Default | IPCC/generic defaults | Global average EF |

---

## 6. Integration Architecture (ERP/SAP Patterns)

### 6.1 Connector Pattern (SAP Connection Manager)

The integration layer implements the **IDataConnector** interface, following
SAP's adapter pattern for external system connectivity:

```typescript
interface IDataConnector {
  // Connect: Establish connection (like SAP RFC destination)
  connect(config: Record<string, any>): Promise<boolean>;
  // Fetch: Extract raw data (like SAP BAPI call)
  fetchData(config: Record<string, any>): Promise<any[]>;
  // Parse: Transform with field mapping (like SAP mapping rules)
  parseData(rawData: any[], mapping?: Record<string, string>): Promise<any[]>;
  // Validate: Data quality checks (like SAP input validation)
  validate(data: any[]): Promise<{ valid: any[]; errors: any[] }>;
  // Disconnect: Release resources (like SAP connection pooling)
  disconnect(): Promise<void>;
}
```

### 6.2 Connector Registry (Factory Pattern)

```text
ConnectorRegistry (Singleton)
├── createConnector('rest_api')  → RestApiConnector
├── createConnector('ssh_sftp')  → SshConnector
├── createConnector('file_upload') → FileParser
└── registerConnector(id, instance) → activeConnectors Map
```

### 6.3 REST API Connector

Supports connecting to external carbon accounting APIs, ERP systems, and
IoT data platforms:

- **Authentication**: OAuth 2.0, Bearer tokens, API keys, custom headers
- **Methods**: GET/POST with configurable body and query parameters
- **Response Parsing**: JSON path extraction for nested API responses
- **Rate Limiting**: Configurable request throttling
- **Retry Logic**: Exponential backoff on transient failures

### 6.4 SSH/SFTP Connector

Enterprise-grade file transfer for batch data ingestion
(similar to SAP file transfer via PI/PO):

- **Authentication**: SSH key-based (preferred) and password authentication
- **File Discovery**: Glob pattern matching on remote directories
- **Transfer**: SCP-based secure file download
- **Processing**: Automatic file type detection and parsing after download
- **Cleanup**: Temporary file cleanup on disconnect

### 6.5 File Upload Parser

Direct file ingestion supporting common ERP export formats:

| Format | Features |
| --- | --- |
| **CSV** | Auto-delimiter detection (comma, tab, semicolon, pipe), quoted fields |
| **XLSX/XLS** | Multi-sheet support, named sheet selection, header row detection |
| **JSON** | Nested path extraction, array/object normalization |

### 6.6 Scheduled Sync (SAP Job Scheduling Pattern)

```text
SyncScheduler (like SAP SM36/SM37 Job Scheduling)
    │
    ├── Schedule: Cron expression (standard 5-field cron)
    ├── Execute: Connector.fetch() → parse() → validate() → import()
    ├── Monitor: Status tracking (success/error/pending)
    ├── Audit: Every sync run logged with duration and record counts
    └── Control: Start/Stop/Reschedule individual sync jobs
```

---

## 7. Report Generation Pipeline

### 7.1 Multi-Standard Report Engine

Following the "single data entry, multiple report output" pattern used in
SAP Sustainability Performance Management:

```text
                    Activity Data (Single Source)
                              │
                    ┌─────────┴─────────┐
                    │ Calculation Engine │
                    │ (GHG Protocol)     │
                    └─────────┬─────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌───────────┐      ┌───────────┐      ┌───────────┐
    │ Standard  │      │ Standard  │      │ Standard  │
    │ Mapper 1  │      │ Mapper 2  │      │ Mapper N  │
    │ (EU CBAM) │      │ (K-ESG)   │      │ (Thai-ESG)│
    └─────┬─────┘      └─────┬─────┘      └─────┬─────┘
          │                   │                   │
          ▼                   ▼                   ▼
    ┌───────────┐      ┌───────────┐      ┌───────────┐
    │ PDF/Excel │      │ PDF/Excel │      │ PDF/Excel │
    │ Template  │      │ Template  │      │ Template  │
    └───────────┘      └───────────┘      └───────────┘
```

### 7.2 Supported Reporting Standards

| Standard | Region | Key Requirements | Report Sections |
| --- | --- | --- | --- |
| **EU CBAM** | European Union | CN codes, embedded emissions, country of origin | Installation data, production, emissions |
| **UK CBAM** | United Kingdom | UK commodity codes, embedded carbon | Goods description, emissions breakdown |
| **China Carbon Market** | China | Enterprise name, unified social credit code | Enterprise info, emissions inventory |
| **K-ESG** | South Korea | Governance structure, reduction targets | ESG governance, environmental data |
| **MAFF ESG** | Japan | Agricultural emissions, food loss reduction | Agricultural metrics, supply chain |
| **Thai-ESG** | Thailand | SET industry group, energy consumption | Thai regulatory metrics, energy data |

### 7.3 Report Output Formats

| Format | Use Case | Engine |
| --- | --- | --- |
| **PDF** | Official submission, audit documentation | Server-side HTML→PDF |
| **Excel (XLSX)** | Data analysis, regulatory filing attachments | ExcelJS library |
| **CSV** | Data exchange, database import | Native generation |
| **JSON** | API consumption, system integration | Native serialization |

---

## 8. Database Design

### 8.1 Connection Management

```typescript
// Database adapter with health-aware pooling
const db = {
  query()       // Parameterized query execution (SQL injection safe)
  queryOne()    // Single-row convenience wrapper
  transaction() // ACID transaction with auto-rollback
  healthCheck() // Connection validation with timeout
  close()       // Graceful pool shutdown
};
```

**Pool Configuration:**

- Min connections: 2 (configurable via `DB_POOL_MIN`)
- Max connections: 10 (configurable via `DB_POOL_MAX`)
- Idle timeout: 30 seconds
- Connection timeout: 3 seconds (fast failure)

### 8.2 Schema Design Principles

- **UUID primary keys** — Globally unique, no sequence conflicts across environments
- **Timestamp tracking** — `created_at`, `updated_at` on all tables
- **Referential integrity** — Foreign keys with appropriate cascade rules
- **Indexing strategy** — B-tree on FKs, GIN on text search, HNSW on vectors
- **Views** — `project_summary`, `user_activity_summary` for reporting queries
- **Soft deletes** — Status flags instead of hard deletes for audit compliance

### 8.3 Core Tables

| Table | Purpose | Key Relationships |
| --- | --- | --- |
| `users` | Authentication, profiles, roles | Has many projects |
| `projects` | Reporting entities (org boundaries) | Has many activities |
| `activities` | Emission source data records | Belongs to project |
| `calculations` | GHG calculation results | References activities |
| `reports` | Generated report metadata | Belongs to project |
| `digital_signatures` | Cryptographic approvals | References reports |
| `audit_logs` | Complete operation history | References all entities |
| `esg_goals` | Reduction targets and tracking | Belongs to project |
| `emission_factors` | Conversion rate database | Referenced by calculations |
| `data_sources` | External connection configs | Belongs to project |

### 8.4 Data Integrity Mechanisms

| Mechanism | Implementation |
| --- | --- |
| **Transactions** | All multi-table writes wrapped in ACID transactions |
| **Constraints** | CHECK, UNIQUE, NOT NULL, FK on all tables |
| **Triggers** | Column sync triggers for backward compatibility |
| **Indexes** | Strategic B-tree, GIN full-text, HNSW vector indexes |
| **Backups** | Docker volume persistence, pg_dump automation |
| **Retention** | 7-year audit log retention per SOX/GRC requirements |

---

## 9. Frontend Architecture Detail

### 9.1 State Management (Zustand)

```text
appStore
├── auth: { user, tokens, isAuthenticated }
├── projects: Project[]
├── activities: Activity[]
├── calculations: CalculationResult[]
├── reports: Report[]
└── ui: { loading, error, success, selectedProject }

themeStore
├── theme: 'light' | 'dark' | 'system'
├── accentColor: string (8 preset options)
├── sidebarCollapsed: boolean
├── compactMode: boolean
└── animations: boolean
```

### 9.2 API Client Architecture

```typescript
// Typed API client with interceptors
const api = axios.create({
  baseURL: '/api/v1',
  headers: { Authorization: `Bearer ${token}` }
});

// Domain-specific API modules (11 total):
authApi         // register, login, refresh, profile
projectsApi     // CRUD, compare, history
activitiesApi   // CRUD, batch, summary, export
calculationsApi // CFP, CFO, precursors
reportsApi      // generate, batch, download
goalsApi        // target CRUD, progress tracking
signaturesApi   // sign, verify, revoke
auditApi        // query, export, retention
embeddingsApi   // vector search, AI features
standardsApi    // standard configs per region
dataSourcesApi  // external source management
```

### 9.3 Routing Architecture (15 Pages)

```text
/login                    → PublicRoute → Login
/                         → ProtectedRoute → Layout
├── /dashboard            → Dashboard (KPIs, charts, alerts)
├── /projects/*           → Projects (CRUD, comparison)
├── /activities/*         → Activities (emission records)
├── /calculations/*       → Calculations (GHG engine)
├── /reports/*            → Reports (multi-standard)
├── /goals/*              → ESGGoals (SBTi/Paris targets)
├── /analytics            → Analytics (trends, benchmarks)
├── /emission-factors     → EmissionFactors (EF database)
├── /signatures           → Signatures (digital approval)
├── /audit-log            → AuditLog (compliance history)
├── /import               → DataImport (sources, sync)
├── /export               → DataExport (bulk export)
├── /ai-assistant         → AIAssistant (vector search)
└── /settings             → Settings (profile, theme)
```

---

## 10. Security & Compliance Architecture

### 10.1 Authentication Flow

```text
Login Request (email + password)
    │
    ▼
bcrypt.compare(password, hash)  [12 salt rounds]
    │
    ▼ (success)
Generate JWT Access Token (24h expiry)
Generate JWT Refresh Token (7d expiry)
Store refresh token in database (revocable)
    │
    ▼
Return { accessToken, refreshToken }
```

### 10.2 Token Refresh Flow

```text
Refresh Request (refreshToken)
    │
    ▼
Verify token signature + expiry
Check token exists in DB (not revoked)
    │
    ▼ (valid)
Revoke old refresh token (single-use enforcement)
Generate new token pair
    │
    ▼
Return { accessToken, refreshToken }
```

### 10.3 Authorization Model (RBAC)

Following enterprise RBAC patterns (similar to SAP authorization objects):

| Role | Permissions | Use Case |
| --- | --- | --- |
| **Owner** | Full CRUD + user management + delete project | Organization admin |
| **Director** | Full CRUD + approve reports | Department head |
| **Auditor** | Read + validate + sign reports | External/internal auditor |
| **Editor** | Create + read + update data | Data entry staff |
| **Viewer** | Read-only access | Stakeholder review |

### 10.4 Security Controls

| Control | Implementation |
| --- | --- |
| **Transport** | HTTPS/TLS termination at ingress |
| **Headers** | Helmet.js (CSP, HSTS, X-Frame-Options) |
| **Input** | Zod schema validation + parameterized SQL queries |
| **Authentication** | JWT (RS256 capable) with refresh token rotation |
| **Authorization** | Middleware-level RBAC with project scoping |
| **Passwords** | bcrypt with 12 salt rounds |
| **Signatures** | Ed25519/RSA digital signatures for report approval |
| **Audit** | Immutable audit log with 7-year retention |
| **CORS** | Configurable origin whitelist |

---

## 11. Deployment Architecture

### 11.1 Container Topology

```text
Docker Compose Network (esg-network)
┌─────────────────────────────────────────┐
│                                         │
│  ┌──────────┐    ┌──────────────────┐   │
│  │ frontend │───▶│    backend       │   │
│  │ :2048    │    │    :2047         │   │
│  │ (nginx)  │    │    (Express)     │   │
│  └──────────┘    └───────┬──────────┘   │
│                          │              │
│              ┌───────────┼──────────┐   │
│              ▼           ▼          │   │
│        ┌──────────┐ ┌──────────┐   │   │
│        │ postgres │ │  redis   │   │   │
│        │ :5434    │ │  :6379   │   │   │
│        │ (pg16+   │ │  (v7     │   │   │
│        │ pgvector)│ │  alpine) │   │   │
│        └──────────┘ └──────────┘   │   │
│                                    │   │
└────────────────────────────────────────┘

Persistent Volumes:
  - postgres_data  (database files)
  - redis_data     (AOF persistence)
  - upload_data    (shared file storage)
  - logs_data      (application logs)
```

### 11.2 Health Check Chain

```text
Frontend → HTTP GET /          → 200 OK (nginx serves SPA)
Backend  → HTTP GET /health    → { status: 'healthy', db: true, redis: true }
Postgres → pg_isready          → Connection validated
Redis    → redis-cli ping      → PONG response
```

### 11.3 Kubernetes Resources

| Resource | Type | Replicas | Notes |
| --- | --- | --- | --- |
| Frontend | Deployment + Service | 2 | Stateless, nginx reverse proxy |
| Backend | Deployment + Service | 2 | Stateless, horizontal scaling |
| PostgreSQL | StatefulSet + PVC | 1 | Persistent volume, backup CronJob |
| Redis | Deployment + PVC | 1 | AOF persistence, optional |
| Ingress | Ingress | — | Path-based routing to services |
| ConfigMap | ConfigMap | — | Non-sensitive configuration |
| Secrets | Secret | — | Base64-encoded credentials |

### 11.4 Environment Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `2047` | Backend listening port |
| `DB_HOST` | `localhost` | PostgreSQL hostname |
| `DB_PORT` | `5434` | PostgreSQL port |
| `DB_NAME` | `esg_reporting` | Database name |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | (required) | JWT signing secret |
| `JWT_EXPIRES_IN` | `24h` | Access token expiry |
| `CORS_ORIGIN` | `http://localhost:2048` | Allowed CORS origin |
