# Open ESG Reporting Application — Specification Kit

> **Version:** 3.0.0  
> **License:** Apache 2.0  
> **Last Updated:** 2026-02-26  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Architecture](#3-architecture)
4. [Feature Specifications](#4-feature-specifications)
5. [Workflow Processes](#5-workflow-processes)
6. [Data Model](#6-data-model)
7. [API Specification](#7-api-specification)
8. [Integration Layer](#8-integration-layer)
9. [Security Specification](#9-security-specification)
10. [Testing Specification](#10-testing-specification)
11. [Deployment Specification](#11-deployment-specification)
12. [Standards Compliance](#12-standards-compliance)
13. [Appendices](#appendices)

---

## 1. Executive Summary

### 1.1 Purpose

The **Open ESG Reporting Application** is an enterprise-grade, open-source Environmental, Social, and Governance (ESG) reporting platform. It provides organizations with a complete carbon accounting and GHG emissions management system compliant with the GHG Protocol Corporate Standard, EU CBAM regulation, and six regional ESG frameworks.

### 1.2 Scope

| Dimension | Coverage |
|-----------|----------|
| **Emissions** | Scope 1, 2, 3 (all 15 GHG Protocol categories) |
| **Standards** | EU CBAM, UK CBAM, China Carbon Market, Japan MAFF, K-ESG, Thai-ESG |
| **Calculations** | CFP (Carbon Footprint of Product), CFO (Carbon Footprint of Organization) |
| **Reports** | PDF, Excel, multi-standard compliance reports |
| **Goals** | SBTi/Paris-aligned target setting with progress tracking |
| **Audit** | 7-year audit trail, digital signatures, role-based access |
| **Data Sources** | Manual upload (CSV/Excel), REST API, OpenSSH/SFTP, scheduled sync |

### 1.3 Key Differentiators

- **Full GHG Protocol coverage** — All Scope 1/2/3 categories with Tier 1/2/3 calculation methods
- **Multi-standard compliance** — Single data entry, automatic mapping to 6+ ESG frameworks
- **Database flexibility** — PostgreSQL (default), with pluggable adapter pattern
- **External data integration** — REST API connectors, SFTP/SSH data sync, file upload parsing
- **AI-powered features** — pgvector semantic search, emission factor suggestions, document similarity
- **Enterprise security** — Cryptographic digital signatures, RBAC, audit trail, JWT with refresh tokens

---

## 2. System Overview

### 2.1 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18.x | Single-page application UI |
| **Frontend** | TypeScript | 5.x | Type-safe development |
| **Frontend** | Vite | 5.x | Build tooling & HMR |
| **Frontend** | Tailwind CSS | 3.x | Utility-first styling |
| **Frontend** | Zustand | 4.x | State management |
| **Backend** | Node.js | 18+ | Runtime environment |
| **Backend** | Express | 4.x | HTTP framework |
| **Backend** | TypeScript | 5.x | Type-safe API development |
| **Database** | PostgreSQL | 16 | Primary data store |
| **Database** | pgvector | latest | Vector similarity search |
| **Cache** | Redis | 7 | Session cache, query cache |
| **Container** | Docker | latest | Containerized deployment |
| **Orchestration** | Kubernetes | 1.28+ | Production orchestration |

### 2.2 System Topology

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          LOAD BALANCER / INGRESS                        │
├────────────────────────────────┬─────────────────────────────────────────┤
│        Frontend (React)        │           Backend (Express)             │
│        Port: 2048              │           Port: 2047                    │
│   ┌─────────────────────┐      │   ┌──────────────────────────────┐     │
│   │  React SPA           │     │   │  REST API (/api/v1)          │     │
│   │  Zustand Store       │     │   │  Auth / RBAC Middleware       │     │
│   │  API Client          │────▶│   │  Controllers → Services       │     │
│   │  Chart/Visualization │     │   │  GHG Calculation Engine       │     │
│   └─────────────────────┘      │   │  Report Generator             │     │
│                                │   └──────────┬───────────────────┘     │
├────────────────────────────────┤              │                          │
│                                │   ┌──────────▼───────────────────┐     │
│                                │   │  Data Integration Layer       │     │
│                                │   │  ├── REST API Connector       │     │
│                                │   │  ├── SSH/SFTP Connector       │     │
│                                │   │  ├── File Upload Parser       │     │
│                                │   │  └── Scheduled Sync Jobs      │     │
│                                │   └──────────┬───────────────────┘     │
├────────────────────────────────┴──────────────┴─────────────────────────┤
│                          DATA LAYER                                      │
│   ┌─────────────────┐   ┌──────────────┐   ┌────────────────────┐       │
│   │  PostgreSQL 16   │   │  Redis 7     │   │  File Storage      │       │
│   │  + pgvector      │   │  Cache Layer │   │  uploads/          │       │
│   │  Primary DB      │   │  Token Store │   │  reports/          │       │
│   └─────────────────┘   └──────────────┘   └────────────────────┘       │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Service Ports

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Frontend | 2048 | HTTP | React SPA served via nginx/Vite |
| Backend API | 2047 | HTTP | Express REST API |
| PostgreSQL | 5434 | TCP | Database (mapped from internal 5432) |
| Redis | 6379 | TCP | Cache and session store |

---

## 3. Architecture

### 3.1 Backend Architecture (MVC + Service Layer)

```
src/
├── config/                    # Application configuration
│   ├── env.ts                 # Zod-validated environment config
│   ├── database.ts            # Database connection pool & adapter
│   ├── redis.ts               # Redis cache with graceful fallback
│   └── index.ts               # Config barrel export
│
├── controllers/               # Request handlers (thin layer)
│   ├── authController.ts      # Authentication & authorization
│   ├── projectController.ts   # Project CRUD
│   ├── activityController.ts  # Emission activity management
│   ├── calculationController.ts # GHG calculations
│   ├── reportController.ts    # Report generation & management
│   ├── fileController.ts      # File upload/download
│   ├── emissionFactorController.ts # Emission factors
│   ├── goalsController.ts     # ESG goal tracking
│   ├── auditController.ts     # Audit trail
│   ├── signatureController.ts # Digital signatures
│   ├── standardController.ts  # Standards configuration
│   ├── embeddingController.ts # AI/vector search
│   └── dataSourceController.ts # External data connections
│
├── services/                  # Business logic (core domain)
│   ├── ghgService.ts          # GHG Protocol calculation engine
│   ├── reportService.ts       # PDF/Excel report generation
│   ├── signatureService.ts    # Cryptographic signatures
│   ├── auditService.ts        # Audit log management
│   ├── embeddingService.ts    # Vector search & AI features
│   ├── serpAPIService.ts      # External EF lookup
│   └── dataSourceService.ts   # Data integration orchestration
│
├── integrations/              # External data source connectors
│   ├── index.ts               # Integration registry
│   ├── restApiConnector.ts    # REST API data fetching
│   ├── sshConnector.ts        # SSH/SFTP file transfer
│   ├── fileParser.ts          # CSV/Excel/JSON parsing
│   └── syncScheduler.ts       # Automated sync scheduling
│
├── middleware/                 # Express middleware
│   ├── auth.ts                # JWT authentication & RBAC
│   ├── validation.ts          # Zod request validation
│   └── errorHandler.ts        # Error handling & logging
│
├── routes/                    # Route definitions
│   ├── index.ts               # Route registry
│   └── [14 route files]       # Versioned API routes
│
├── types/                     # TypeScript type definitions
│   └── index.ts               # All interfaces & types
│
├── db/                        # Database operations
│   ├── seed.ts                # Demo data seeding
│   └── seed-sugar-factory.ts  # Sugar factory demo data
│
├── jobs/                      # Background scheduled tasks
│   └── index.ts               # Cron job definitions
│
├── utils/                     # Shared utilities
│   ├── helpers.ts             # General utility functions
│   └── logger.ts              # Winston logging config
│
├── app.ts                     # Express app setup
└── server.ts                  # Server startup & shutdown
```

### 3.2 Frontend Architecture

```
src/
├── pages/                     # Route-level components (15 pages)
│   ├── Dashboard.tsx          # Overview with KPIs
│   ├── Projects.tsx           # Project management
│   ├── Activities.tsx         # Emission activities
│   ├── Calculations.tsx       # GHG calculations
│   ├── Reports.tsx            # Report generation
│   ├── ESGGoals.tsx          # Goal tracking
│   ├── Analytics.tsx          # Charts & trends
│   ├── EmissionFactors.tsx    # Factor management
│   ├── Signatures.tsx         # Digital signatures
│   ├── AuditLog.tsx          # Audit trail
│   ├── DataImport.tsx         # File upload & import
│   ├── DataExport.tsx         # Export & download
│   ├── AIAssistant.tsx        # AI-powered insights
│   ├── Settings.tsx           # User preferences
│   └── Login.tsx              # Authentication
│
├── components/                # Reusable UI components
│   ├── layout/                # Header, Sidebar, Layout
│   └── ui/                    # Badge, Button, Card, Input, Modal, etc.
│
├── store/                     # State management (Zustand)
│   ├── appStore.ts            # Main application state
│   ├── authStore.ts           # Authentication state
│   └── themeStore.ts          # UI theme preferences
│
├── lib/                       # Shared libraries
│   ├── api.ts                 # Typed API client
│   ├── hooks/                 # Custom React hooks
│   └── utils.ts               # Frontend utilities
│
├── styles/                    # Global CSS
├── App.tsx                    # Root component with routing
└── main.tsx                   # Application entry point
```

### 3.3 Database Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CORE TABLES                                   │
│  users ─── projects ─── activities ─── emission_factors          │
│              │              │                                     │
│              ├── project_members     cfp_results                 │
│              ├── esg_goals           cfo_results                 │
│              ├── reports             precursor_calculations      │
│              ├── signatures                                      │
│              ├── audit_logs                                      │
│              └── files                                           │
│                                                                  │
│                    REFERENCE TABLES                               │
│  grid_emission_factors    precursor_factors    cbam_default_vals │
│  grid_ef_overrides        precursor_factor_overrides             │
│                                                                  │
│                    AI/VECTOR TABLES                               │
│  embedding_models         document_embeddings                    │
│  activity_embeddings      emission_factor_embeddings             │
│  llm_conversations        semantic_search_cache                  │
│                                                                  │
│                    SYSTEM TABLES                                  │
│  refresh_tokens           scheduled_jobs                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Feature Specifications

### 4.1 Authentication & Authorization

| Feature | Description |
|---------|-------------|
| **Registration** | Email/password with organization, validated via Zod |
| **Login** | JWT access + refresh token pair |
| **Token Refresh** | Automatic silent refresh with rotation |
| **RBAC** | 6 roles: Admin, Owner, Director, Editor, Viewer, Auditor |
| **Project Ownership** | Database-verified project access control |
| **Password Management** | bcrypt hashing, change password, secure reset |
| **Session Blacklist** | Redis-backed token blacklist on logout |

#### Role Permission Matrix

| Action | Admin | Owner | Director | Editor | Viewer | Auditor |
|--------|:-----:|:-----:|:--------:|:------:|:------:|:-------:|
| Create Project | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit Project | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| View Project | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Delete Project | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Run Calculations | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Generate Reports | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Sign Reports | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| View Audit Logs | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| Manage Standards | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Configure Settings | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

### 4.2 Project Management

- **CRUD operations** for ESG projects with metadata (industry, baseline year, reporting year)
- **Multi-standard assignment** — associate projects with one or more ESG frameworks
- **Project comparison** — side-by-side metrics across projects
- **Calculation history** — versioned calculation runs with result tracking
- **Project-scoped reports, goals, audit logs, and signatures**

### 4.3 Activity Management (Emission Sources)

| Scope | Categories |
|-------|-----------|
| **Scope 1** | Stationary combustion, Mobile combustion, Process emissions, Fugitive emissions |
| **Scope 2** | Purchased electricity, Steam, Heating, Cooling |
| **Scope 3** | Purchased goods (Cat 1), Capital goods (Cat 2), Fuel/energy (Cat 3), Transport upstream (Cat 4), Waste (Cat 5), Business travel (Cat 6), Commuting (Cat 7), Leased assets upstream (Cat 8), Transport downstream (Cat 9), Processing (Cat 10), Product use (Cat 11), End-of-life (Cat 12), Leased assets downstream (Cat 13), Franchises (Cat 14), Investments (Cat 15) |

**Activity Features:**
- Dual-column support for raw/converted values
- Tier 1/2/3 methodology selection per activity
- Data quality scoring (1-5 scale)
- Batch create & delete operations
- CSV/Excel import & export
- Per-project activity summaries

### 4.4 GHG Calculation Engine

#### 4.4.1 Carbon Footprint of Product (CFP)

Calculates lifecycle emissions per functional unit across:
- Raw material acquisition
- Manufacturing
- Distribution
- Use phase
- End-of-life treatment

**Formula (Tier 1):** `Emission = Activity Data × Emission Factor × GWP`  
**Formula (Tier 2+):** `Emission = Activity Data × Emission Factor × GWP × Tier Multiplier (1.3)`

#### 4.4.2 Carbon Footprint of Organization (CFO)

Calculates total organizational emissions:
- Scope 1 + Scope 2 + Scope 3 totals
- Intensity metrics (per revenue, per employee, per unit product)
- Baseline year comparison
- Year-over-year change tracking

#### 4.4.3 CBAM Precursor Calculations

- Material-specific precursor emission tracking
- Default factors for 13 material categories (Steel, Aluminium, Cement, Fertilizers, etc.)
- Project-specific overrides
- Hotspot identification across supply chain

#### 4.4.4 Data Quality Assessment

- 5-point quality scoring per activity
- Uncertainty quantification
- Tier methodology tracking
- Completeness validation

### 4.5 Report Generation

| Format | Description |
|--------|-------------|
| **PDF** | Formatted reports with charts, tables, executive summary |
| **Excel** | Data-rich spreadsheets with calculation details |
| **Multi-standard** | Automatic mapping to selected ESG framework requirements |

**Report Workflow:**
1. Select project and reporting period
2. Choose standard(s) and report format
3. Generate report (background processing for batch)
4. Review and validate
5. Digital signature (for standards requiring approval)
6. Export and distribute

**Batch Processing:**
- Generate multiple reports simultaneously
- Status tracking per batch
- Manifest generation for batch downloads

### 4.6 ESG Goals & Targets

- **SBTi-aligned** target setting (1.5°C or well-below 2°C pathways)
- **Paris Agreement** compatible reduction trajectories
- **Progress tracking** with milestone-based monitoring
- **Financial integration** — cost tracking per goal
- **Bulk progress update** for efficient reporting cycles
- **Visual progress** — charts and trend indicators

### 4.7 Digital Signatures

- **Cryptographic signing** using HMAC-SHA256
- **Signature verification** with certificate data
- **Role-restricted** — only Owner, Director, and Auditor can sign
- **Revocation support** for invalid signatures
- **Per-report** signature linking

### 4.8 Audit Trail

- **7-year retention** (configurable, default 2555 days)
- **Comprehensive logging** — all CRUD operations recorded
- **Request context** — IP address, user agent, HTTP method
- **Export capability** — CSV/JSON audit log export
- **Automated cleanup** — configurable monthly purge of expired records
- **Per-project filtering** — view audit history scoped to project

### 4.9 AI & Vector Search

- **pgvector-powered** semantic search across documents
- **Emission factor suggestions** — AI-matched factors based on activity description
- **Similar activity discovery** — find related activities across projects
- **Document embeddings** — RAG-ready document store
- **Conversation history** — tracked AI interactions with token usage
- **Multiple embedding models** — OpenAI ada-002, text-embedding-3-small/large, Azure

### 4.10 Data Integration

| Method | Description | Use Case |
|--------|-------------|----------|
| **Manual Upload** | CSV, Excel, JSON file parsing | One-time data import, spreadsheet migration |
| **REST API** | Configurable HTTP endpoints | Real-time data from external systems (ERP, IoT) |
| **SSH/SFTP** | Secure file transfer from remote servers | Automated data collection from industrial systems |
| **Scheduled Sync** | Cron-based automatic data refresh | Periodic data updates from external sources |

---

## 5. Workflow Processes

### 5.1 Complete ESG Reporting Cycle

```
┌─────────────┐     ┌───────────────┐     ┌──────────────────┐
│  1. PROJECT  │────▶│  2. DATA      │────▶│  3. CALCULATION  │
│  SETUP       │     │  COLLECTION   │     │                  │
│              │     │               │     │  • CFP            │
│  • Create    │     │  • Manual     │     │  • CFO            │
│  • Configure │     │  • API Sync   │     │  • Precursors     │
│  • Standards │     │  • SSH/SFTP   │     │  • Data Quality   │
│  • Team      │     │  • File Upload│     │  • Hotspots       │
└─────────────┘     └───────────────┘     └────────┬─────────┘
                                                    │
┌─────────────┐     ┌───────────────┐     ┌────────▼─────────┐
│  6. ARCHIVE  │◀────│  5. APPROVAL  │◀────│  4. REPORTING    │
│  & AUDIT     │     │               │     │                  │
│              │     │  • Review     │     │  • Generate PDF  │
│  • 7-year    │     │  • Signature  │     │  • Generate XLSX │
│    retention │     │  • Verify     │     │  • Multi-standard│
│  • Export    │     │  • Publish    │     │  • Batch process │
└─────────────┘     └───────────────┘     └──────────────────┘
```

### 5.2 Activity Data Entry Workflow

```
User uploads CSV/Excel or enters data manually
         │
         ▼
   ┌─────────────────┐
   │  Parse & Validate │
   │  (Zod schemas)   │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐     ┌─────────────────┐
   │  Match Emission  │────▶│  AI Suggestion  │
   │  Factors         │     │  (pgvector)     │
   └────────┬────────┘     └─────────────────┘
            │
            ▼
   ┌─────────────────┐
   │  Calculate       │
   │  Emissions       │
   │  (GHG Service)   │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Quality Score   │
   │  & Validation    │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Store & Audit   │
   │  Log Entry       │
   └─────────────────┘
```

### 5.3 Goal Setting & Tracking Workflow

```
   ┌─────────────────┐
   │  Set Baseline    │
   │  (Base Year)     │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Define Target   │
   │  • SBTi pathway  │
   │  • Reduction %   │
   │  • Timeline      │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Create          │
   │  Milestones      │
   │  (Interim goals) │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Track Progress  │◀──── Calculation results feed
   │  • Auto-update   │      into goal progress
   │  • Manual adjust │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Report &        │
   │  Visualize       │
   └─────────────────┘
```

### 5.4 External Data Sync Workflow

```
   ┌──────────────────────────────────────────────────┐
   │                DATA SOURCE CONFIG                  │
   │  • REST API endpoint + auth credentials           │
   │  • SSH host + key/password                        │
   │  • Upload template + mapping rules                │
   │  • Sync schedule (cron expression)                │
   └────────────────────┬─────────────────────────────┘
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ REST API │  │ SSH/SFTP │  │  Manual  │
   │ Fetch    │  │ Download │  │  Upload  │
   └────┬─────┘  └────┬─────┘  └────┬─────┘
        │              │              │
        └──────────────┼──────────────┘
                       ▼
              ┌──────────────┐
              │  Parse Data  │
              │  (CSV/JSON/  │
              │   Excel)     │
              └──────┬───────┘
                     ▼
              ┌──────────────┐
              │  Transform & │
              │  Validate    │
              └──────┬───────┘
                     ▼
              ┌──────────────┐
              │  Merge into  │
              │  Activities  │
              └──────┬───────┘
                     ▼
              ┌──────────────┐
              │  Audit Log   │
              │  + Notify    │
              └──────────────┘
```

---

## 6. Data Model

### 6.1 Entity Relationship Summary

| Entity | Primary Key | Relationships |
|--------|------------|---------------|
| **users** | UUID | → projects (owner), → project_members, → refresh_tokens |
| **projects** | UUID | → activities, → reports, → signatures, → goals, → audit_logs, → files |
| **activities** | UUID | → emission_factors (FK), → calculation results |
| **emission_factors** | UUID | → activities (used by) |
| **grid_emission_factors** | UUID | → grid_ef_overrides |
| **precursor_factors** | UUID | → precursor_factor_overrides, → precursor_calculations |
| **cfp_results** | UUID | → projects (FK) |
| **cfo_results** | UUID | → projects (FK) |
| **reports** | UUID | → projects (FK), → signatures |
| **esg_goals** | UUID | → projects (FK) |
| **signatures** | UUID | → reports (FK), → users (FK) |
| **audit_logs** | UUID | → projects (FK), → users (FK) |
| **files** | UUID | → projects (FK), → users (FK) |

### 6.2 Key Constraints

- All tables use UUID primary keys
- Cascade delete from projects → activities, goals, reports
- Unique constraints on user email, project names per owner
- Check constraints on scope values ('scope_1', 'scope_2', 'scope_3')
- Foreign key integrity across all relationships
- Soft delete not used — hard delete with audit log backup

---

## 7. API Specification

### 7.1 Base URL

```
http://localhost:2047/api/v1
```

### 7.2 Authentication

All endpoints (except auth routes and health check) require:
```
Authorization: Bearer <JWT_TOKEN>
```

### 7.3 Endpoint Summary

| Group | Base Path | Methods | Auth | Description |
|-------|-----------|---------|------|-------------|
| **Auth** | `/v1/auth` | POST, GET, PUT | Mixed | Registration, login, token refresh, profile |
| **Projects** | `/v1/projects` | GET, POST, PUT, DELETE | All | Project CRUD, comparison, history |
| **Activities** | `/v1/activities` | GET, POST, PUT, DELETE | All | Activity CRUD, batch, summary, export |
| **Calculations** | `/v1/calculate` | POST, GET | All | CFP, CFO, precursors, single/batch, quality |
| **Reports** | `/v1/reports` | GET, POST, DELETE | All | Generate, download, batch, delete |
| **Files** | `/v1/files` | GET, POST, DELETE | All | Upload, download, template, reparse |
| **Emission Factors** | `/v1/emission-factors` | GET, POST, PUT, DELETE | All | CRUD, search, SERPAPI lookup, overrides |
| **Goals** | `/v1/goals` | GET, POST, PUT, DELETE | All | CRUD, progress update, bulk update |
| **Audit Logs** | `/v1/audit-logs` | GET | All | View, filter, summary, export |
| **Signatures** | `/v1/signatures` | GET, POST, PUT | All | Sign, verify, revoke |
| **Standards** | `/v1/standards` | GET, POST | Mixed | List, details, requirements, config |
| **Embeddings** | `/v1/embeddings` | GET, POST | All | Search, store, suggest, conversations |
| **Data Sources** | `/v1/data-sources` | GET, POST, PUT, DELETE | All | External data connection management |
| **Health** | `/health` | GET | None | System health check |

### 7.4 Standard Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 7.5 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

---

## 8. Integration Layer

### 8.1 REST API Connector

**Configuration:**
```json
{
  "name": "ERP Emissions Data",
  "type": "rest_api",
  "config": {
    "baseUrl": "https://erp.company.com/api/v2",
    "authType": "bearer",
    "authToken": "encrypted_token",
    "headers": { "X-API-Key": "key" },
    "endpoints": {
      "activities": "/emissions/activities",
      "factors": "/emissions/factors"
    },
    "timeout": 30000,
    "retryAttempts": 3
  },
  "schedule": "0 2 * * *",
  "mapping": {
    "activity_name": "$.description",
    "scope": "$.ghg_scope",
    "quantity": "$.amount",
    "unit": "$.measurement_unit"
  }
}
```

### 8.2 SSH/SFTP Connector

**Configuration:**
```json
{
  "name": "Factory SCADA Export",
  "type": "ssh_sftp",
  "config": {
    "host": "scada.factory.local",
    "port": 22,
    "username": "esg_sync",
    "authMethod": "key",
    "privateKeyPath": "/secrets/sftp_key",
    "remotePath": "/exports/emissions/",
    "filePattern": "emissions_*.csv",
    "localPath": "./uploads/sync/"
  },
  "schedule": "0 6 * * 1",
  "parser": {
    "type": "csv",
    "delimiter": ",",
    "headerRow": true
  }
}
```

### 8.3 File Upload (Manual)

**Supported Formats:**
| Format | Extension | Max Size | Features |
|--------|-----------|----------|----------|
| CSV | `.csv` | 100 MB | Auto-detect delimiter, header mapping |
| Excel | `.xlsx`, `.xls` | 100 MB | Multi-sheet support, template matching |
| JSON | `.json` | 100 MB | Schema validation, nested data flatten |

**Upload Workflow:**
1. User selects file via drag-and-drop or browse
2. Server validates format and size
3. Parser extracts data with column mapping
4. Preview shown to user for validation
5. User confirms and data is imported into activities
6. Audit log records the import event

---

## 9. Security Specification

### 9.1 Authentication Security

| Measure | Implementation |
|---------|----------------|
| **Password hashing** | bcrypt with configurable salt rounds |
| **JWT tokens** | Short-lived access (24h) + long-lived refresh (7d) |
| **Token rotation** | Refresh token rotation on use |
| **Token blacklist** | Redis-backed blacklist on logout |
| **Secret management** | Environment variable injection, never hardcoded |
| **CORS** | Configurable origin whitelist |

### 9.2 API Security

| Measure | Implementation |
|---------|----------------|
| **Helmet** | Security headers (CSP, HSTS, X-Frame-Options, etc.) |
| **Rate limiting** | Configurable per-endpoint rate limits |
| **Input validation** | Zod schemas on all request bodies |
| **SQL injection** | Parameterized queries only |
| **XSS prevention** | Content-Type enforcement, output encoding |
| **File upload** | Type whitelist, size limits, virus scan hooks |

### 9.3 Data Security

| Measure | Implementation |
|---------|----------------|
| **Encryption at rest** | PostgreSQL TDE (configurable) |
| **Encryption in transit** | TLS/HTTPS enforced in production |
| **Sensitive data** | Credentials stored as encrypted environment variables |
| **Audit trail** | Immutable 7-year retention with tamper detection |
| **Digital signatures** | HMAC-SHA256 with per-user certificates |

---

## 10. Testing Specification

### 10.1 Test Strategy

| Level | Framework | Target Coverage | Description |
|-------|-----------|----------------|-------------|
| **Unit** | Jest (backend), Vitest (frontend) | >95% | Individual function/component testing |
| **Integration** | Jest + supertest | >90% | API endpoint testing with real DB |
| **E2E** | Playwright | Critical paths | Full user journey through UI |
| **Performance** | k6/Artillery | N/A | Load testing for production readiness |

### 10.2 GHG Calculation Test Cases

| Test Category | Test Cases | Standard |
|---------------|-----------|----------|
| Scope 1 stationary combustion | Fuel types, tier methods, GWP | GHG Protocol Ch. 2 |
| Scope 1 mobile combustion | Vehicle types, distance vs fuel | GHG Protocol Ch. 3 |
| Scope 1 fugitive emissions | Refrigerant types, leak rates | GHG Protocol Ch. 4 |
| Scope 2 location-based | Grid EF by country, year | GHG Protocol Scope 2 |
| Scope 2 market-based | Contractual instruments | GHG Protocol Scope 2 |
| Scope 3 all 15 categories | Category-specific methods | GHG Protocol Scope 3 |
| CFP lifecycle stages | Cradle-to-grave, per unit | ISO 14067 |
| CFO organizational total | Boundary setting, intensity | GHG Protocol Corporate |
| CBAM precursors | Material categories, defaults | EU CBAM Regulation |
| Data quality scoring | Tier method impact, uncertainty | GHG Protocol guidance |

### 10.3 ESG Goal Validation Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| SBTi 1.5°C aligned target | Verify reduction rate ≥ 4.2% per year |
| Paris well-below 2°C target | Verify reduction rate ≥ 2.5% per year |
| Baseline year validation | Cannot be after target year |
| Progress calculation | Correct percentage based on current vs target |
| Milestone tracking | Interim target validation against final target |
| Financial cost tracking | Budget vs actual per goal |

---

## 11. Deployment Specification

### 11.1 Docker Compose (Default)

```bash
# Production deployment
docker compose up -d

# Development (DB + Redis only)
docker compose -f docker-compose.dev.yml up -d
```

### 11.2 Kubernetes

```bash
# Apply all manifests
kubectl apply -k k8s/

# Resources created:
# - Namespace: esg-reporting
# - ConfigMap: environment config
# - Secrets: credentials (encrypted)
# - Deployments: backend, frontend, postgres, redis
# - Services: ClusterIP for each deployment
# - Ingress: domain routing
```

### 11.3 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Runtime environment |
| `PORT` | No | 5000 | Backend server port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `REDIS_URL` | No | redis://localhost:6379 | Redis connection string |
| `JWT_SECRET` | **Yes** | — | Min 32 chars, cryptographically random |
| `CORS_ORIGIN` | No | http://localhost:5173 | Allowed CORS origins (comma-separated) |
| `SERPAPI_KEY` | No | — | SerpAPI key for emission factor lookup |
| `LOG_LEVEL` | No | info | Logging verbosity |

---

## 12. Standards Compliance

### 12.1 Supported Frameworks

| Standard | Region | Key Requirements | Status |
|----------|--------|------------------|--------|
| **GHG Protocol** | Global | Scope 1/2/3, reporting boundaries | ✅ Full |
| **EU CBAM** | European Union | Precursor emissions, CBAM reporting | ✅ Full |
| **UK CBAM** | United Kingdom | UK-specific CBAM requirements | ✅ Full |
| **China Carbon** | China | National ETS reporting requirements | ✅ Full |
| **MAFF ESG** | Japan | Agricultural sector ESG reporting | ✅ Full |
| **K-ESG** | South Korea | Korean ESG disclosure framework | ✅ Full |
| **Thai-ESG** | Thailand | Thai ESG compliance framework | ✅ Full |
| **SBTi** | Global | Science-based targets, 1.5°C/2°C pathways | ✅ Goal setting |
| **ISO 14067** | Global | Carbon footprint of products | ✅ CFP calculations |

### 12.2 Calculation Methodology Compliance

| Method | Standard Reference | Implementation |
|--------|-------------------|----------------|
| Scope 1 Direct | GHG Protocol Ch. 2-5 | `ghgService.ts` — fuel-specific EFs |
| Scope 2 Location | GHG Protocol Scope 2 | Grid EF database by country/year |
| Scope 2 Market | GHG Protocol Scope 2 | Contractual + residual mix |
| Scope 3 Categories | GHG Protocol Scope 3 | All 15 categories implemented |
| CFP Lifecycle | ISO 14067 | 5-stage lifecycle assessment |
| CFO Boundary | GHG Protocol Corporate | Control + equity approaches |
| CBAM Precursors | EU CBAM Annex III | Default + country-specific factors |
| Data Quality | GHG Protocol guidance | 5-point score with uncertainty |

---

## Appendices

### A. Glossary

| Term | Definition |
|------|-----------|
| **CFP** | Carbon Footprint of Product — lifecycle GHG emissions per functional unit |
| **CFO** | Carbon Footprint of Organization — total organizational GHG emissions |
| **CBAM** | Carbon Border Adjustment Mechanism — EU import carbon pricing |
| **EF** | Emission Factor — conversion ratio from activity data to GHG emissions |
| **GWP** | Global Warming Potential — relative warming impact vs CO2 |
| **SBTi** | Science Based Targets initiative — standard for corporate climate targets |
| **GHG** | Greenhouse Gas — gases that trap heat in Earth's atmosphere |
| **Scope 1** | Direct emissions from owned/controlled sources |
| **Scope 2** | Indirect emissions from purchased energy |
| **Scope 3** | All other indirect emissions in value chain |

### B. Change Log

| Version | Date | Changes |
|---------|------|---------|
| 3.0.0 | 2026-02-26 | Apache 2.0 license, data integration layer, database adapter pattern, security hardening, comprehensive test improvements |
| 2.1.1 | 2025-06-29 | Sugar factory demo, ESG goals, bug fixes |
| 2.0.0 | 2025-01-15 | Multi-standard support, AI features, digital signatures |
| 1.0.0 | 2024-06-01 | Initial release — GHG Protocol, EU CBAM |

### C. References

1. GHG Protocol Corporate Accounting and Reporting Standard (Revised Edition)
2. GHG Protocol Scope 2 Guidance
3. GHG Protocol Corporate Value Chain (Scope 3) Standard
4. EU CBAM Regulation (EU) 2023/956
5. ISO 14067:2018 — Carbon footprint of products
6. SBTi Corporate Net-Zero Standard (v1.1)
7. IPCC AR6 GWP values
