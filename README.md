# 🌱 ESG Reporting Application

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

A comprehensive **Environmental, Social, and Governance (ESG)** reporting platform for organizations to track, calculate, and report greenhouse gas (GHG) emissions following international standards including **EU CBAM**, **GHG Protocol**, and regional ESG frameworks.

![ESG Dashboard](https://img.shields.io/badge/Dashboard-Interactive-brightgreen)
![GHG Calculations](https://img.shields.io/badge/GHG-Scope%201%2C2%2C3-orange)
![Standards](https://img.shields.io/badge/Standards-EU%20CBAM%20%7C%20GHG%20Protocol-purple)

---

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Demo Accounts](#-demo-accounts)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [GHG Calculation Methods](#-ghg-calculation-methods)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 📊 **Emissions Management**
- **Scope 1, 2, 3 Tracking** - Complete GHG emissions coverage
- **Activity Data Entry** - Record fuel consumption, electricity use, transport, and more
- **Automatic Calculations** - Built-in GHG calculation engines with industry emission factors
- **Custom Emission Factors** - Add organization-specific conversion factors

### 📈 **Analytics & Reporting**
- **Interactive Dashboard** - Real-time emissions overview with charts
- **Trend Analysis** - Year-over-year comparisons and monthly tracking
- **Industry Benchmarks** - Compare performance against sector averages
- **AI-Powered Insights** - Automated recommendations for emission reductions

### 📑 **Standards Compliance**
- **EU CBAM** - Carbon Border Adjustment Mechanism reporting
- **GHG Protocol** - Full Scope 1, 2, 3 categorization
- **Thai ESG** - Thailand ESG disclosure requirements
- **K-ESG** - Korean ESG framework support
- **China Carbon Market** - Chinese emission trading compliance

### 🔒 **Security & Collaboration**
- **Role-Based Access** - Admin, Editor, Viewer, Auditor roles
- **Digital Signatures** - Document approval workflows
- **Audit Trail** - Complete activity logging
- **Multi-Organization** - Support for enterprise hierarchies

### 🛠️ **Tools & Utilities**
- **Data Import/Export** - CSV, JSON, Excel support
- **File Attachments** - Evidence documentation
- **Vector Search** - AI-powered document similarity search
- **Report Generation** - Automated compliance reports

---

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** (recommended) or:
  - Node.js 18+
  - PostgreSQL 16 with pgvector
  - Redis 7+

### One-Command Start (Docker)

```bash
# Clone the repository
git clone https://github.com/chiraleo2000/ESG-Reporting-App.git
cd ESG-Reporting-App

# Start all services
docker compose up -d

# Wait for services to initialize (30 seconds)
# Then open http://localhost:2048
```

### Manual Setup

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Configure environment
cp backend/.env.example backend/.env

# Start services
docker compose up -d postgres redis  # Database & Cache
npm run dev --prefix backend         # API Server
npm run dev --prefix frontend        # Web App
```

---

## 👤 Demo Accounts

All demo accounts use password: **`Demo@123`**

| Email | Role | Description |
|-------|------|-------------|
| `admin@esgdemo.com` | Admin | Full system access, manage users & settings |
| `manager@esgdemo.com` | Editor | Create/edit projects, activities, reports |
| `viewer@esgdemo.com` | Viewer | Read-only access to all data |
| `auditor@esgdemo.com` | Auditor | Review and audit capabilities |
| `demo@esgdemo.com` | Editor | **Clean user with no data** - Start fresh! |

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool |
| **Tailwind CSS** | Styling |
| **Framer Motion** | Animations |
| **Chart.js** | Data Visualization |
| **Zustand** | State Management |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime |
| **Express** | Web Framework |
| **TypeScript** | Type Safety |
| **PostgreSQL 16** | Primary Database |
| **pgvector** | Vector Embeddings |
| **Redis** | Caching & Sessions |
| **Bull** | Job Queues |

### DevOps
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Local Orchestration |
| **Kubernetes** | Production Deployment |
| **Nginx** | Reverse Proxy |

---

## 📁 Project Structure

```
esg-reporting-app/
├── backend/                 # Node.js API Server
│   ├── src/
│   │   ├── config/         # Database, Redis, Environment configs
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic
│   │   ├── db/             # Database seeds & migrations
│   │   └── utils/          # Helper functions
│   └── Dockerfile
│
├── frontend/               # React Web Application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── store/          # State management
│   │   ├── lib/            # API client & utilities
│   │   └── styles/         # Global styles
│   └── Dockerfile
│
├── database/               # PostgreSQL schema & migrations
├── docs/                   # Documentation
├── k8s/                    # Kubernetes manifests
├── standards/              # ESG standard reference files
│
├── docker-compose.yml      # Production Docker config
├── docker-compose.dev.yml  # Development Docker config
└── README.md
```

---

## 🔢 GHG Calculation Methods

The application implements industry-standard GHG calculation methodologies:

### Scope 1 - Direct Emissions

**Stationary Combustion**
```
CO₂e = Fuel Quantity × Emission Factor
```
- Supports: Natural Gas, Diesel, LPG, Coal, Biomass

**Mobile Combustion**
```
CO₂e = Fuel Consumed × (CO₂ EF + CH₄ EF × 25 + N₂O EF × 298)
```
- Vehicle fleet, forklifts, machinery

### Scope 2 - Indirect Energy

**Location-Based**
```
CO₂e = Electricity Consumed (kWh) × Grid Emission Factor
```

**Market-Based**
```
CO₂e = Electricity Consumed × Supplier-Specific Factor
       - Renewable Energy Certificates
```

### Scope 3 - Value Chain

**Category 4: Upstream Transport**
```
CO₂e = Mass × Distance × Mode Factor
```

**Category 1: Purchased Goods**
```
CO₂e = Spend × Industry Emission Factor
```

**Category 6: Business Travel**
```
CO₂e = Distance × Mode Factor × Class Factor
```

### Built-in Emission Factor Database
- 100+ fuel emission factors (IPCC 2006/2019)
- Grid emission factors for 50+ countries
- Transport mode factors (truck, rail, ship, air)
- Industry-specific spend factors

---

## 📡 API Documentation

### Base URL
```
http://localhost:2047/api/v1
```

### Authentication
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "admin@esgdemo.com",
  "password": "Demo@123"
}

# Response: { "token": "jwt...", "user": {...} }
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Auth** | | |
| POST | `/auth/login` | User login |
| POST | `/auth/register` | Create account |
| GET | `/auth/me` | Current user info |
| **Projects** | | |
| GET | `/projects` | List all projects |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Get project details |
| **Activities** | | |
| GET | `/activities` | List activities |
| POST | `/activities` | Create activity |
| GET | `/activities/project/:id` | Project activities |
| **Calculations** | | |
| POST | `/calculations/emissions` | Calculate emissions |
| GET | `/calculations/summary/:projectId` | Emission summary |
| **Reports** | | |
| POST | `/reports/generate` | Generate report |
| GET | `/reports` | List reports |

For complete API documentation, see [docs/API-REFERENCE.md](docs/API-REFERENCE.md)

---

## 💻 Development

### Running Locally

```bash
# Start database services
docker compose up -d postgres redis

# Backend (Terminal 1)
cd backend
npm install
npm run dev
# API running at http://localhost:2047

# Frontend (Terminal 2)
cd frontend
npm install
npm run dev
# App running at http://localhost:5173
```

### Environment Variables

**Backend `.env`**
```env
NODE_ENV=development
PORT=2047
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/esg_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-... (optional, for AI features)
```

### Database Seeding

```bash
cd backend
npm run seed
```

This creates demo users, projects, activities, and emission factors.

---

## 🚢 Deployment

### Docker Production

```bash
# Build and start all services
docker compose -f docker-compose.yml up -d --build

# Services:
# - Frontend: http://localhost:2048 (nginx)
# - Backend:  http://localhost:2047 (internal)
# - Postgres: localhost:5434
# - Redis:    localhost:6379
```

### Kubernetes

```bash
# Apply all manifests
kubectl apply -k k8s/

# Or use the deployment script
./deploy-k8s.sh  # Linux/Mac
./deploy-k8s.ps1 # Windows
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Documentation**: See the [docs/](docs/) folder
- **Issues**: [GitHub Issues](https://github.com/chiraleo2000/ESG-Reporting-App/issues)

---

<div align="center">

**Built with ❤️ for a sustainable future**

</div>
