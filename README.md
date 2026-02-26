# 🌱 Open ESG Reporting App

A comprehensive **Environmental, Social, and Governance (ESG)** reporting platform for tracking, calculating, and reporting greenhouse gas (GHG) emissions following **GHG Protocol**, **EU CBAM**, and regional ESG standards. Features external data integration via **REST API**, **SSH/SFTP**, and **manual file upload**.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-912_passing-brightgreen.svg)](#-testing)
[![Coverage](https://img.shields.io/badge/Coverage-95.82%25-brightgreen.svg)](#-testing)

---

## ✨ Features

- **📊 Complete GHG Protocol Coverage**
  - **Scope 1**: Stationary combustion, Mobile combustion, Process emissions, Fugitive emissions
  - **Scope 2**: Purchased electricity, Steam, Heating, Cooling (4 categories)
  - **Scope 3**: All 14 categories as per GHG Protocol
- **🧮 Built-in Calculator** - Tier 1/2/3 calculation methods with formula display
- **📈 Analytics Dashboard** - Real-time trends, benchmarks, AI-powered insights with dynamic API data
- **📑 Multi-Standard Compliance** - EU CBAM, UK CBAM, China Carbon Market, K-ESG, MAFF ESG, Thai ESG
- **🎯 ESG Goals & Targets** - SBTi/Paris-aligned goal tracking with progress visualization
- **🔐 Role-Based Access** - Owner, Director, Editor, Viewer, Auditor roles
- **📤 Import/Export** - CSV, JSON, Excel, PDF support with file parsing
- **🔌 External Data Integration** - REST API, SSH/SFTP, and manual file upload with scheduled sync
- **🔍 Vector Search** - AI-powered document similarity (pgvector)
- **✍️ Digital Signatures** - Report approval workflow with cryptographic signatures

---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Run with Docker

```bash
# Clone repository
git clone https://github.com/chiraleo2000/Open-ESG-Reporting-app.git
cd Open-ESG-Reporting-app

# Start all services (database auto-seeds on first run)
docker compose up -d

# Wait for services to be ready (check health)
docker compose ps

# Open application
# Frontend: http://localhost:2048
# API: http://localhost:2047/api/v1
```

### Development Setup

```bash
# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start PostgreSQL and Redis with Docker
docker compose -f docker-compose.dev.yml up -d

# Run backend (terminal 1)
cd backend && npm run dev

# Run frontend (terminal 2)
cd frontend && npm run dev

# Run tests
cd backend && npm test
cd frontend && npm test
```

### Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| <admin@esgdemo.com> | Demo@123 | Full admin access |
| <director@esgdemo.com> | Demo@123 | Sustainability Director |
| <editor@esgdemo.com> | Demo@123 | Project Editor |
| <viewer@esgdemo.com> | Demo@123 | Read-only access |
| <auditor@esgdemo.com> | Demo@123 | External Auditor |

**Sugar Factory Demo** (50 tons/year white sugar, export to China):

| Email | Password | Role |
|-------|----------|------|
| <manager@thaisugar.co.th> | Sugar@2024 | Factory Owner |
| <env@thaisugar.co.th> | Sugar@2024 | Environmental Editor |
| <auditor@thaiaudit.co.th> | Sugar@2024 | External Auditor |

**Note:** Demo accounts come with 3 sample projects, 30+ activities covering all scopes, and comprehensive emission factors. The sugar factory demo includes 16 activities across all 3 scopes with 219.3 tCO2e total emissions and 5 ESG goals.

---

## 📁 Project Structure

```
esg-reporting-app/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── integrations/   # External data connectors (REST, SSH, File)
│   │   ├── db/             # Database seed
│   │   └── config/         # Configuration
│   └── Dockerfile
│
├── frontend/               # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/          # Application pages
│   │   ├── components/     # UI components
│   │   └── lib/            # API client
│   └── Dockerfile
│
├── database/               # PostgreSQL schema
├── k8s/                    # Kubernetes manifests
├── docs/                   # Documentation
│
├── docker-compose.yml      # Production setup
└── docker-compose.dev.yml  # Development (DB only)
```

---

## 🧪 Testing

**912 total tests** across backend and frontend with **95.82% code coverage**.

### Quick Test Commands

```bash
# Backend tests (822 tests, 32 suites)
cd backend && npx jest --forceExit

# Backend with coverage report
cd backend && npx jest --forceExit --coverage

# Frontend tests (90 tests, 3 suites)
cd frontend && npx vitest run

# E2E tests (requires running app)
npx playwright test
```

### Coverage Summary

| Metric | Coverage |
|--------|----------|
| **Statements** | 95.82% |
| **Branches** | 84.87% |
| **Functions** | 91.62% |
| **Lines** | 95.98% |

### Backend Test Suites (32 suites, 822 tests)

| Category | Suite | Tests | Coverage |
|----------|-------|-------|----------|
| **Controllers** | authController | ~45 | 97.32% |
| | activityController | ~40 | 94.73% |
| | projectController | ~50 | 98.35% |
| | calculationController | ~55 | 96.42% |
| | reportController | ~65 | 98.70% |
| | goalsController | ~30 | 89.00% |
| | signatureController | ~35 | 98.70% |
| | auditController | ~20 | 100% |
| | emissionFactorController | ~42 | 97.54% |
| | fileController | ~26 | 91.62% |
| | standardController | ~16 | 100% |
| | embeddingController | ~25 | 91.74% |
| **Services** | ghgService | ~80 | 99.00% |
| | reportService | ~25 | 95.56% |
| | embeddingService | ~35 | 100% |
| | serpAPIService | ~25 | 93.93% |
| | signatureService | ~30 | 97.61% |
| **Middleware** | auth | ~31 | 97.67% |
| | validation | ~50 | 97.77% |
| | errorHandler | ~10 | 100% |
| **Config** | database | ~15 | 86.50% |
| | redis | ~30 | 86.50% |
| **Utils** | helpers | ~67 | 100% |
| | logger | ~10 | 88.23% |

### Frontend Test Suites (3 suites, 90 tests)

| Suite | Tests | Description |
|-------|-------|-------------|
| components.test.tsx | 19 | Utility functions, scope classification, emission factors, validation |
| pages.test.tsx | 23 | All 15 pages + barrel exports + domain logic + formatting |
| workflow.test.tsx | 48 | Data flow, sugar factory, standards compliance, GHG calculations, goals, analytics, roles |

> See [DEVELOPER-SETUP.md](docs/DEVELOPER-SETUP.md) for detailed test running instructions.

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL 16 + pgvector |
| **Cache** | Redis 7 |
| **Container** | Docker, Docker Compose |

---

## 📡 Services & Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 2048 | <http://localhost:2048> |
| Backend API | 2047 | <http://localhost:2047/api/v1> |
| PostgreSQL | 5434 | localhost:5434 |
| Redis | 6379 | localhost:6379 |

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [User Guide](docs/USER-GUIDE.md) | Complete feature documentation |
| [API Reference](docs/API-REFERENCE.md) | REST API endpoints |
| [GHG Calculations](docs/GHG-CALCULATIONS.md) | Emission calculation methods |
| [Standards](docs/STANDARDS-COMPLIANCE.md) | Compliance requirements |
| [Developer Setup](docs/DEVELOPER-SETUP.md) | Development environment |

---

## 🔧 Common Commands

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Rebuild after changes
docker compose up -d --build

# Stop services
docker compose down

# Reset database (removes all data)
docker compose down -v
docker compose up -d
```

---

## � Changelog
### v3.0.0 (2026-02-26)

**🔌 External Data Integration Layer**

- REST API connector with OAuth2, Bearer, API Key, and Basic auth
- SSH/SFTP connector for remote file transfer with key/password auth
- Manual file upload with CSV/Excel/JSON parsing and validation
- Sync scheduler with cron-based scheduling and audit trail
- Connector registry with factory pattern for extensibility
- Full CRUD API for data source management (`/api/v1/data-sources`)
- Database schema: `data_sources` table with type/status enums

**🏗️ Architecture Improvements**

- Integration layer (`backend/src/integrations/`) with connector pattern
- Data source service with connection testing and sync orchestration
- Role-based authorization (owner, director, editor) for data source operations
- Pagination, retry logic, and JSONPath extraction for REST connectors

**🧪 Testing**

- 822 backend tests across 32 suites — all passing
- 90 frontend tests across 3 suites — all passing
- Fixed TypeScript type errors in data source routes
### v2.1.1 (2025-06-29)

**🐛 Bug Fixes & Improvements**

- Fixed `healthCheck` URL in API client — no longer hardcoded to localhost:2047
- Fixed Sidebar to display real user name/role instead of hardcoded "John Doe"
- Fixed Settings profile page to show actual logged-in user data
- Connected Audit Log page to real backend API with fallback to demo data
- Connected Emission Factors page to backend API with live data indicator
- Connected Signatures page to backend API for real signature history
- Connected Data Import page with functional file upload (drag & drop + browse)
- Connected Data Export page with real project list from API
- All project dropdowns now load from API instead of hardcoded options

**🎯 ESG Goals (MS Cloud / SAP style)**

- Goal tracking with SBTi/Paris-aligned targets
- Progress visualization with cost tracking
- Sugar factory demo: 5 pre-configured ESG goals

**📊 Sugar Factory Demo Data**

- 16 activities across all 3 scopes (combustion, electricity, supply chain)
- CFP result: 2.026 kgCO2e per 500g sugar bag
- CFO result: 219,306 kgCO2e total annual footprint
- 5 ESG goals, 6 custom emission factors, 3 grid emission factors
- Full audit trail and compliance reports

**🧪 Testing**

- Comprehensive Playwright E2E test suite for sugar factory demo
- Full user journey: Auth → Dashboard → Projects → Activities → Calculations → Reports → Goals → Analytics
- Multi-role access testing (owner, editor, auditor)
- Responsive design tests (mobile, tablet, desktop)

---

## �📄 License

Apache License 2.0 - see [LICENSE](LICENSE)

---

<div align="center">
<b>Built for a sustainable future 🌍</b>
</div>
