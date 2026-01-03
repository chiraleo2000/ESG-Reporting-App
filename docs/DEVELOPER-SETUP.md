# 🛠️ Developer Setup Guide

Complete guide for setting up the ESG Reporting Application development environment.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Setup (Docker)](#quick-setup-docker)
3. [Manual Setup](#manual-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Development Workflow](#development-workflow)
8. [Testing](#testing)
9. [Debugging](#debugging)
10. [Deployment](#deployment)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ | Runtime |
| npm | 9+ | Package manager |
| Docker Desktop | Latest | Containerization |
| Git | 2.0+ | Version control |

### Optional Software

| Software | Purpose |
|----------|---------|
| VS Code | Recommended IDE |
| PostgreSQL Client | Direct DB access |
| Redis CLI | Cache inspection |
| Postman | API testing |

### Check Installation

```bash
node --version    # v18.0.0+
npm --version     # 9.0.0+
docker --version  # 24.0.0+
git --version     # 2.0.0+
```

---

## Quick Setup (Docker)

The fastest way to get started:

```bash
# Clone repository
git clone https://github.com/chiraleo2000/ESG-Reporting-App.git
cd ESG-Reporting-App

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Check status
docker ps
```

### Services Started

| Service | Port | URL |
|---------|------|-----|
| Frontend | 2048 | http://localhost:2048 |
| Backend | 2047 | http://localhost:2047 |
| PostgreSQL | 5434 | localhost:5434 |
| Redis | 6379 | localhost:6379 |

---

## Manual Setup

For local development without full Docker.

### 1. Clone Repository

```bash
git clone https://github.com/chiraleo2000/ESG-Reporting-App.git
cd ESG-Reporting-App
```

### 2. Start Database Services

```bash
# Start only PostgreSQL and Redis in Docker
docker compose up -d postgres redis
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
code .env

# Start development server
npm run dev
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## Environment Configuration

### Backend `.env`

```env
# Application
NODE_ENV=development
PORT=2047
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/esg_db

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# AI Features (Optional)
OPENAI_API_KEY=sk-your-api-key
SERP_API_KEY=your-serp-api-key
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:2047/api/v1
VITE_APP_NAME=ESG Reporting App
VITE_APP_VERSION=1.0.0
```

### Production Environment

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db.example.com:5432/esg_prod
REDIS_URL=redis://cache.example.com:6379
JWT_SECRET=<strong-random-secret>
```

---

## Database Setup

### PostgreSQL with pgvector

The application requires PostgreSQL 16 with the pgvector extension for vector similarity search.

### Initial Setup

```bash
# Connect to database
docker compose exec postgres psql -U postgres -d esg_db

# Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

# Manual extension creation (if needed)
CREATE EXTENSION IF NOT EXISTS vector;
```

### Schema

The schema is automatically applied on first startup. See `database/schema.sql` for details.

### Seeding Demo Data

```bash
# Via Docker
docker compose exec backend npm run seed

# Local development
cd backend
npm run seed
```

### Database Migrations

```bash
# Create migration
npm run migrate:create migration_name

# Run migrations
npm run migrate:up

# Rollback
npm run migrate:down
```

---

## Running the Application

### Development Mode

```bash
# Terminal 1: Database services
docker compose up -d postgres redis

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev
```

### Full Docker Mode

```bash
# Build and start all
docker compose up -d --build

# Rebuild specific service
docker compose up -d --build backend

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

### Stopping Services

```bash
# Stop all
docker compose down

# Stop and remove volumes (reset database)
docker compose down -v
```

---

## Development Workflow

### Project Structure

```
esg-reporting-app/
├── backend/
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── db/            # Database scripts
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── store/         # State management
│   │   ├── lib/           # Utilities & API client
│   │   └── styles/        # Global styles
│   ├── package.json
│   └── vite.config.ts
│
└── docker-compose.yml
```

### Adding a New Feature

1. **Backend Route**
   ```typescript
   // routes/featureRoutes.ts
   router.get('/feature', featureController.list);
   router.post('/feature', featureController.create);
   ```

2. **Backend Controller**
   ```typescript
   // controllers/featureController.ts
   export const list = async (req, res) => {
     const data = await featureService.findAll();
     res.json({ success: true, data });
   };
   ```

3. **Frontend Page**
   ```tsx
   // pages/Feature.tsx
   export default function Feature() {
     const { data } = useQuery('features', api.getFeatures);
     return <FeatureList data={data} />;
   }
   ```

4. **Add to Router**
   ```tsx
   // App.tsx
   <Route path="/feature" element={<Feature />} />
   ```

### Code Style

- Use TypeScript for all code
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful commit messages

```bash
# Lint check
npm run lint

# Auto-fix
npm run lint:fix

# Format
npm run format
```

---

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e
```

### API Testing

Use the included Postman collection or:

```bash
# Health check
curl http://localhost:2047/api/v1/health

# Login
curl -X POST http://localhost:2047/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@esgdemo.com","password":"Demo@123"}'
```

---

## Debugging

### Backend Debugging

VS Code launch.json:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "program": "${workspaceFolder}/backend/src/server.ts",
  "preLaunchTask": "tsc: build",
  "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"]
}
```

### Frontend Debugging

Use React Developer Tools and VS Code debugger for Chrome.

### Viewing Logs

```bash
# Backend logs
docker compose logs -f backend

# All logs
docker compose logs -f

# Specific time range
docker compose logs --since 1h backend
```

### Database Debugging

```bash
# Connect to database
docker compose exec postgres psql -U postgres -d esg_db

# View tables
\dt

# Query data
SELECT * FROM users;
```

---

## Deployment

### Docker Production Build

```bash
# Build production images
docker compose -f docker-compose.yml build

# Start production
docker compose -f docker-compose.yml up -d
```

### Kubernetes

```bash
# Apply manifests
kubectl apply -k k8s/

# Check status
kubectl get pods -n esg-app

# View logs
kubectl logs -f deployment/esg-backend -n esg-app
```

### Manual Deployment

```bash
# Backend
cd backend
npm run build
NODE_ENV=production node dist/server.js

# Frontend
cd frontend
npm run build
# Serve dist/ with nginx or static host
```

### Environment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure proper database credentials
- [ ] Set up SSL/TLS
- [ ] Configure CORS properly
- [ ] Set up monitoring
- [ ] Configure log aggregation
- [ ] Set up backups

---

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Find process
netstat -ano | findstr :2047
# Kill process
taskkill /PID <pid> /F
```

**Database connection failed**
```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check connection
docker compose exec postgres pg_isready
```

**Frontend build fails**
```bash
# Clear cache
rm -rf node_modules
npm install
```

**Docker build fails**
```bash
# Clean rebuild
docker compose down
docker system prune -f
docker compose up -d --build
```

### Getting Help

- Check logs: `docker compose logs -f`
- Search issues: GitHub Issues
- Debug mode: Set `LOG_LEVEL=debug`

---

## VS Code Extensions

Recommended extensions:

- ESLint
- Prettier
- TypeScript Importer
- Docker
- PostgreSQL
- GitLens
- REST Client

Settings.json:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

---

*Last updated: January 2026*
