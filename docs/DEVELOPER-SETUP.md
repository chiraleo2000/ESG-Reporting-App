# 🛠️ Developer Setup

Quick guide for development environment setup.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 18+](https://nodejs.org/) (for local development)
- [Git](https://git-scm.com/)

---

## Quick Start (Docker)

```bash
# Clone and start
git clone https://github.com/chiraleo2000/ESG-Reporting-App.git
cd ESG-Reporting-App
docker compose up -d

# Seed demo data
docker compose exec backend node dist/db/seed.js

# Open http://localhost:2048
```

---

## Local Development

For developing with hot reload:

### 1. Start Database Services

```bash
docker compose up -d postgres redis
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
# API at http://localhost:2047
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App at http://localhost:5173
```

---

## Environment Variables

### Backend `.env`

```env
NODE_ENV=development
PORT=2047
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/esg_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:2047/api/v1
```

---

## Database

### Connect to PostgreSQL

```bash
docker compose exec postgres psql -U postgres -d esg_db
```

### Useful Commands

```sql
-- List tables
\dt

-- View users
SELECT email, name, role FROM users;

-- View projects
SELECT name, organization FROM projects;
```

### Reset Database

```bash
docker compose down -v
docker compose up -d
docker compose exec backend node dist/db/seed.js
```

---

## Project Structure

```
backend/
├── src/
│   ├── config/         # Database, Redis, environment
│   ├── controllers/    # Route handlers
│   ├── middleware/     # Auth, validation
│   ├── routes/         # API endpoints
│   ├── services/       # Business logic
│   ├── db/seed.ts      # Demo data seeder
│   └── types/          # TypeScript types

frontend/
├── src/
│   ├── components/     # Reusable UI
│   ├── pages/          # Route pages
│   ├── store/          # State management
│   └── lib/            # API client, utils
```

---

## Useful Commands

```bash
# Rebuild containers
docker compose up -d --build

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Shell into container
docker compose exec backend sh

# Stop everything
docker compose down
```

---

## Troubleshooting

### Port in use
```bash
# Check what's using port 2048
netstat -ano | findstr :2048
```

### Database connection failed
```bash
# Check postgres is running
docker compose ps
docker compose logs postgres
```

### Frontend not loading
```bash
# Rebuild frontend
docker compose up -d --build frontend
```

---

*Last updated: January 2026*
