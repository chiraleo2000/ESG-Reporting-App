# 🌱 ESG Reporting Application

A comprehensive **Environmental, Social, and Governance (ESG)** reporting platform for tracking, calculating, and reporting greenhouse gas (GHG) emissions following **GHG Protocol**, **EU CBAM**, and regional ESG standards.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

---

## ✨ Features

- **📊 GHG Emissions Tracking** - Scope 1, 2, 3 emissions with automatic calculations
- **🧮 Built-in Calculator** - 6 GHG calculation methods with formula display
- **📈 Analytics Dashboard** - Trends, benchmarks, AI-powered insights
- **📑 Multi-Standard Compliance** - EU CBAM, GHG Protocol, Thai ESG, K-ESG
- **🔐 Role-Based Access** - Admin, Editor, Viewer, Auditor roles
- **📤 Import/Export** - CSV, JSON, Excel, PDF support
- **🔍 Vector Search** - AI-powered document similarity (pgvector)

---

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Run with Docker

```bash
# Clone repository
git clone https://github.com/chiraleo2000/ESG-Reporting-App.git
cd ESG-Reporting-App

# Start all services
docker compose up -d

# Seed demo data (first time)
docker compose exec backend node dist/db/seed.js

# Open application
# http://localhost:2048
```

### Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@esgdemo.com | Demo@123 | Full admin access |
| manager@esgdemo.com | Demo@123 | Project editor |
| viewer@esgdemo.com | Demo@123 | Read-only |
| demo@esgdemo.com | Demo@123 | **Clean user (no data)** |

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
