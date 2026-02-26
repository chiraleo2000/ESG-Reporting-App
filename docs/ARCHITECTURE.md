# Open ESG Reporting Application — Architecture & Design Specification

> **Version:** 3.0.0 | **License:** Apache 2.0

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

The application follows a **layered architecture** with clear separation of concerns:

```
┌────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                          │
│   React 18 + TypeScript + Tailwind CSS + Zustand               │
│   (SPA with client-side routing, state management)             │
├────────────────────────────────────────────────────────────────┤
│                    API GATEWAY LAYER                            │
│   Express.js Routes + Middleware (Auth, Validation, CORS)      │
├────────────────────────────────────────────────────────────────┤
│                    CONTROLLER LAYER                             │
│   13 Controllers: Request handling, response formatting         │
├────────────────────────────────────────────────────────────────┤
│                    SERVICE / BUSINESS LOGIC LAYER              │
│   GHG Engine, Reports, Signatures, Audit, AI, Data Sources     │
├────────────────────────────────────────────────────────────────┤
│                    INTEGRATION LAYER                            │
│   REST API Connector | SSH/SFTP | File Parser | Sync Scheduler │
├────────────────────────────────────────────────────────────────┤
│                    DATA ACCESS LAYER                            │
│   Database Adapter (PostgreSQL) | Redis Cache | File Storage   │
└────────────────────────────────────────────────────────────────┘
```

### 1.2 Design Principles

| Principle | Application |
|-----------|-------------|
| **Separation of Concerns** | Controllers handle HTTP, Services handle logic, DB handles data |
| **Dependency Injection** | Services receive dependencies through config, not global state |
| **Fail Gracefully** | Redis optional, DB health checks, background jobs fault-tolerant |
| **Type Safety** | Full TypeScript with Zod runtime validation |
| **Audit Everything** | All state-changing operations logged with user context |
| **Security by Default** | Helmet, CORS, parameterized queries, bcrypt, JWT rotation |

---

## 2. Backend Architecture Detail

### 2.1 Request Processing Pipeline

```
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

### 2.2 Service Layer Design

Each service encapsulates a **bounded context** of the domain:

| Service | Responsibility | Dependencies |
|---------|---------------|--------------|
| `ghgService` | GHG calculations, emission factors, CFP/CFO | Database, Redis cache |
| `reportService` | PDF/Excel generation, batch processing | Database, File storage |
| `signatureService` | Cryptographic sign/verify/revoke | Database, crypto |
| `auditService` | CRUD, retention, cleanup, export | Database |
| `embeddingService` | Vector search, AI features | Database (pgvector), Redis |
| `serpAPIService` | External emission factor lookup | HTTP client, Redis cache |
| `dataSourceService` | External data orchestration | Integration connectors |

### 2.3 Error Handling Strategy

```typescript
// Error hierarchy
AppError (base)
├── BadRequestError (400)
├── UnauthorizedError (401)
├── ForbiddenError (403)
├── NotFoundError (404)
├── ConflictError (409)
└── ValidationError (422)
```

All errors flow through the global `errorHandler` middleware which:
1. Logs error with full context (stack, request info)
2. Maps to appropriate HTTP status code
3. Returns standardized error response
4. Sanitizes error details in production

---

## 3. Database Design

### 3.1 Connection Management

```typescript
// Database adapter with health-aware pooling
const db = {
  query()      // Parameterized query execution
  queryOne()   // Single-row convenience wrapper
  transaction() // ACID transaction with auto-rollback
  healthCheck() // Connection validation with timeout
  close()      // Graceful pool shutdown
}
```

**Pool Configuration:**
- Min connections: 2 (configurable)
- Max connections: 10 (configurable)
- Idle timeout: 30 seconds
- Connection timeout: 3 seconds (fast failure)

### 3.2 Schema Design Principles

- **UUID primary keys** — globally unique, no sequence conflicts
- **Timestamp tracking** — `created_at`, `updated_at` on all tables
- **Referential integrity** — foreign keys with appropriate cascade rules
- **Indexing strategy** — B-tree on FKs, GIN on text search, HNSW on vectors
- **Views** — `project_summary`, `user_activity_summary` for reporting

### 3.3 Data Integrity

| Mechanism | Implementation |
|-----------|----------------|
| **Transactions** | All multi-table writes wrapped in transactions |
| **Constraints** | CHECK, UNIQUE, NOT NULL, FK on all tables |
| **Triggers** | Column sync triggers for compatibility layer |
| **Indexes** | Strategic B-tree, GIN, and HNSW indexes |
| **Backups** | Docker volume persistence, pg_dump scripted |

---

## 4. Frontend Architecture Detail

### 4.1 State Management (Zustand)

```
appStore
├── auth: { user, tokens, isAuthenticated }
├── projects: Project[]
├── activities: Activity[]
├── calculations: CalculationResult[]
├── reports: Report[]
└── ui: { loading, error, success, selectedProject }

themeStore
├── theme: 'light' | 'dark' | 'system'
├── accentColor: string (8 options)
├── sidebarCollapsed: boolean
├── compactMode: boolean
└── animations: boolean
```

### 4.2 API Client Architecture

```typescript
// Typed API client with interceptors
const api = axios.create({
  baseURL: '/api/v1',
  headers: { Authorization: `Bearer ${token}` }
});

// Domain-specific API modules:
authApi      // register, login, refresh, profile
projectsApi  // CRUD, compare, history
activitiesApi // CRUD, batch, summary, export
calculationsApi // CFP, CFO, precursors
reportsApi   // generate, batch, download
// ... (11 total modules)
```

### 4.3 Routing Architecture

```
/login                    → PublicRoute → Login
/                         → ProtectedRoute → Layout
├── /dashboard            → Dashboard
├── /projects/*           → Projects
├── /activities/*         → Activities
├── /calculations/*       → Calculations
├── /reports/*            → Reports
├── /goals/*              → ESGGoals
├── /analytics            → Analytics
├── /emission-factors     → EmissionFactors
├── /signatures           → Signatures
├── /audit-log            → AuditLog
├── /import               → DataImport
├── /export               → DataExport
├── /ai-assistant         → AIAssistant
└── /settings             → Settings
```

---

## 5. Integration Architecture

### 5.1 Connector Pattern

```typescript
interface DataSourceConnector {
  name: string;
  type: 'rest_api' | 'ssh_sftp' | 'manual_upload';
  
  connect(): Promise<void>;
  fetchData(config: SourceConfig): Promise<RawData[]>;
  parseData(raw: RawData[]): Promise<ParsedActivity[]>;
  validate(data: ParsedActivity[]): ValidationResult;
  disconnect(): Promise<void>;
}
```

Each connector implements this interface, allowing the `dataSourceService` to orchestrate data fetching regardless of the source type.

### 5.2 Sync Flow

```
ScheduledJob → DataSourceService → Connector.fetchData()
                    │
                    ▼
              FileParser.parse() → Validator.validate()
                    │
                    ▼
              ActivityService.batchCreate() → AuditService.log()
```

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
Login Request (email + password)
    │
    ▼
bcrypt.compare(password, hash)
    │
    ▼ (success)
Generate JWT Access Token (24h)
Generate JWT Refresh Token (7d)
Store refresh token in DB
    │
    ▼
Return { accessToken, refreshToken }

---

Token Refresh Flow:
Refresh Request (refreshToken)
    │
    ▼
Verify token signature + expiry
Check token exists in DB (not revoked)
    │
    ▼ (valid)
Revoke old refresh token
Generate new token pair
    │
    ▼
Return { accessToken, refreshToken }
```

### 6.2 Authorization Flow

```
Authenticated Request
    │
    ▼
Extract user from JWT
    │
    ▼
Check role against endpoint requirements
    │
    ▼ (authorized)
Check project ownership (if project-scoped)
    │
    ▼ (owner/member)
Proceed to controller
```

---

## 7. Deployment Architecture

### 7.1 Container Topology

```
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
│        ┌──────────┐ ┌──────────┐    │   │
│        │ postgres │ │  redis   │    │   │
│        │ :5434    │ │  :6379   │    │   │
│        │ (pg16)   │ │  (7-alp) │    │   │
│        └──────────┘ └──────────┘    │   │
│                                     │   │
└─────────────────────────────────────────┘
        Volumes:
        - postgres_data (persistent)
        - redis_data (persistent)
        - upload_data (shared)
        - logs_data (shared)
```

### 7.2 Health Check Chain

```
Frontend → HTTP GET / → 200 OK
Backend  → HTTP GET /health → { status: 'healthy', db: true, redis: true }
Postgres → pg_isready -U postgres -d esg_reporting
Redis    → redis-cli ping → PONG
```

### 7.3 Kubernetes Resources

| Resource | Type | Replicas | Notes |
|----------|------|----------|-------|
| Frontend | Deployment + Service | 2 | Stateless, nginx |
| Backend | Deployment + Service | 2 | Stateless, Express |
| PostgreSQL | StatefulSet + PVC | 1 | Persistent volume |
| Redis | Deployment + PVC | 1 | AOF persistence |
| Ingress | Ingress | — | Domain routing |
| ConfigMap | ConfigMap | — | Non-sensitive config |
| Secrets | Secret | — | Encoded credentials |
