# 🌱 ESG Reporting Application

A comprehensive **Environmental, Social, and Governance (ESG)** reporting platform for tracking, calculating, and reporting greenhouse gas (GHG) emissions following **GHG Protocol**, **EU CBAM**, and regional ESG standards.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-864_passing-brightgreen.svg)](#-testing)
[![Coverage](https://img.shields.io/badge/Coverage-95.82%25-brightgreen.svg)](#-testing)

---

## ✨ Features

- **📊 Complete GHG Protocol Coverage**
  - **Scope 1**: Stationary combustion, Mobile combustion, Process emissions, Fugitive emissions
  - **Scope 2**: Purchased electricity, Steam, Heating, Cooling (4 categories)
  - **Scope 3**: All 14 categories as per GHG Protocol
- **🧮 Built-in Calculator** - Tier 1/2/3 calculation methods with formula display
- **📈 Analytics Dashboard** - Real-time trends, benchmarks, AI-powered insights
- **📑 Multi-Standard Compliance** - EU CBAM, UK CBAM, China Carbon Market, K-ESG, MAFF ESG, Thai ESG
- **🔐 Role-Based Access** - Admin, Director, Editor, Viewer, Auditor roles
- **📤 Import/Export** - CSV, JSON, Excel, PDF support with file parsing
- **🔍 Vector Search** - AI-powered document similarity (pgvector)
- **✍️ Digital Signatures** - Report approval workflow with cryptographic signatures

---

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Run with Docker

```bash
# Clone repository
git clone https://github.com/chiraleo2000/ESG-Reporting-App.git
cd ESG-Reporting-App

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
| admin@esgdemo.com | Demo@123 | Full admin access |
| director@esgdemo.com | Demo@123 | Sustainability Director |
| editor@esgdemo.com | Demo@123 | Project Editor |
| viewer@esgdemo.com | Demo@123 | Read-only access |
| auditor@esgdemo.com | Demo@123 | External Auditor |

**Note:** Demo accounts come with 3 sample projects, 30+ activities covering all scopes, and comprehensive emission factors.

---

## 📁 Project Structure

```
esg-reporting-app/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
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

**864 total tests** across backend and frontend with **95.82% code coverage**.

### Quick Test Commands

```bash
# Backend tests (822 tests, 32 suites)
cd backend && npx jest --forceExit

# Backend with coverage report
cd backend && npx jest --forceExit --coverage

# Frontend tests (42 tests, 2 suites)
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

### Frontend Test Suites (2 suites, 42 tests)

| Suite | Tests | Description |
|-------|-------|-------------|
| components.test.tsx | ~5 | UI component rendering |
| pages.test.tsx | ~37 | All 15 pages + barrel exports + domain formatting |

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
| Frontend | 2048 | http://localhost:2048 |
| Backend API | 2047 | http://localhost:2047/api/v1 |
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

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

<div align="center">
<b>Built for a sustainable future 🌍</b>
</div>
