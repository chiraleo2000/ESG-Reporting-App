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

## Testing

The project has **864 total tests** (822 backend + 42 frontend) with **95.82% statement coverage**.

### Backend Tests (Jest)

```bash
cd backend

# Run all tests
npx jest --forceExit

# Run with coverage report
npx jest --forceExit --coverage

# Run a single test file
npx jest tests/unit/goalsController.test.ts --forceExit

# Run tests matching a pattern
npx jest --testPathPattern="unit" --forceExit

# Run tests for a specific controller
npx jest --testPathPattern="authController" --forceExit

# Run only service tests
npx jest --testPathPattern="Service" --forceExit

# Run with verbose output
npx jest --forceExit --verbose

# Run in watch mode (re-runs on file change)
npx jest --watch

# Generate HTML coverage report
npx jest --forceExit --coverage --coverageReporters=html
# Open backend/coverage/index.html in a browser
```

#### Backend Test File Inventory (32 suites)

**Controllers** (`backend/tests/unit/`):
| Test File | Source File | Tests | Description |
|-----------|-------------|-------|-------------|
| `authController.test.ts` | `controllers/authController.ts` | ~45 | Login, register, refresh token, logout, profile, password change, users list, role update |
| `activityController.test.ts` | `controllers/activityController.ts` | ~40 | CRUD, bulk operations, file evidence upload, filtering, validation |
| `projectController.test.ts` | `controllers/projectController.ts` | ~50 | Create, read, update, delete, members, compliance status |
| `calculationController.test.ts` | `controllers/calculationController.ts` | ~15 | Basic scope 1/2/3 calculations |
| `calculationControllerDeep.test.ts` | `controllers/calculationController.ts` | ~40 | calculateBoth, calculatePrecursors, compareYears, edge cases, data quality ratings, biogenic carbon |
| `reportController.test.ts` | `controllers/reportController.ts` | ~15 | Basic report generation |
| `reportControllerComplete.test.ts` | `controllers/reportController.ts` | ~50 | All 14 exports: generate, batch, download, status, preview, requirements, manifest |
| `goalsController.test.ts` | `controllers/goalsController.ts` | ~30 | ESG goal CRUD, progress tracking, summary |
| `signatureController.test.ts` | `controllers/signatureController.ts` | ~35 | Digital signatures, verification, report signing |
| `auditController.test.ts` | `controllers/auditController.ts` | ~20 | Audit log retrieval, filtering |
| `emissionFactorController.test.ts` | `controllers/emissionFactorController.ts` | ~42 | All 21 exports: CRUD, search, categories, custom factors |
| `fileController.test.ts` | `controllers/fileController.ts` | ~26 | Upload, download, delete, reparse, list files |
| `standardController.test.ts` | `controllers/standardController.ts` | ~16 | All 6 ESG standards requirements |
| `embeddingController.test.ts` | `controllers/embeddingController.ts` | ~25 | AI embedding search, document similarity, suggestions |

**Services** (`backend/tests/unit/`):
| Test File | Source File | Tests | Description |
|-----------|-------------|-------|-------------|
| `ghgService.test.ts` | `services/ghgService.ts` | ~25 | Core GHG calculation methods |
| `ghgServiceExports.test.ts` | `services/ghgService.ts` | ~55 | All 6 exports: calculateEmissions, batchCalculate, getEmissionFactors, calculateUncertainty, getCalculationMethods, formatCalculationResult |
| `reportServiceComplete.test.ts` | `services/reportService.ts` | ~25 | All 6 standards validation, PDF/Excel generation, requirements |
| `embeddingServiceComplete.test.ts` | `services/embeddingService.ts` | ~35 | All 13 methods: initialize, generateEmbedding, store, search, suggest, conversation history |
| `serpAPIServiceComplete.test.ts` | `services/serpAPIService.ts` | ~25 | Emission factor search, grid factors, precursor factors, caching |
| `signatureService.test.ts` | `services/signatureService.ts` | ~30 | Sign, verify, report signatures |

**Middleware** (`backend/tests/unit/`):
| Test File | Source File | Tests | Description |
|-----------|-------------|-------|-------------|
| `authMiddleware.test.ts` | `middleware/auth.ts` | ~31 | All 10 exports: authenticate, requireRole, requireProjectAccess, optionalAuth, expired tokens |
| `validationMiddleware.test.ts` | `middleware/validation.ts` | ~50 | validate() factory + all 17 Zod schemas |
| `errorHandler.test.ts` | `middleware/errorHandler.ts` | ~10 | Error formatting, status codes |

**Config & Utils** (`backend/tests/unit/`):
| Test File | Source File | Tests | Description |
|-----------|-------------|-------|-------------|
| `databaseConfig.test.ts` | `config/database.ts` | ~15 | Pool connection, query, transaction methods |
| `redisConfig.test.ts` | `config/redis.ts` | ~30 | cacheKeys, redisClient, cache get/set/del/clear |
| `helpersComplete.test.ts` | `utils/helpers.ts` | ~67 | All 24 utility functions: pagination, formatting, hashing, dates |
| `logger.test.ts` | `utils/logger.ts` | ~10 | Logging levels, formats |

### Frontend Tests (Vitest)

```bash
cd frontend

# Run all tests
npx vitest run

# Run with UI
npx vitest --ui

# Run with coverage
npx vitest run --coverage

# Run specific test file
npx vitest run src/__tests__/pages.test.tsx

# Run in watch mode
npx vitest
```

#### Frontend Test File Inventory (2 suites)

| Test File | Tests | Description |
|-----------|-------|-------------|
| `src/__tests__/components.test.tsx` | ~5 | Core UI component rendering |
| `src/__tests__/pages.test.tsx` | ~37 | All 15 page exports, barrel re-exports, domain-specific formatting, text content validation |

**Pages covered:** Dashboard, Projects, ProjectDetail, Activities, Calculations, Analytics, Reports, EmissionFactors, Tools, Login, Register, Settings, ESGGoals, AuditLog, Signatures

### E2E Tests (Playwright)

```bash
# From project root (requires running app)
npx playwright test

# With headed browser
npx playwright test --headed

# Show report
npx playwright show-report

# Run specific test
npx playwright test e2e/app.spec.ts
```

### Coverage Breakdown

```
Overall: 95.82% Stmts | 84.87% Branch | 91.62% Funcs | 95.98% Lines

Controllers:        96.3% average
  authController       97.32%    signatureController   98.70%
  activityController   94.73%    auditController      100.00%
  projectController    98.35%    emissionFactorCtrl    97.54%
  calculationCtrl      96.42%    fileController        91.62%
  reportController     98.70%    standardController   100.00%
  goalsController      89.00%    embeddingController   91.74%

Services:           97.2% average
  ghgService           99.00%    embeddingService     100.00%
  reportService        95.56%    signatureService      97.61%
  serpAPIService       93.93%

Middleware:          98.5% average
  auth.ts              97.67%    errorHandler.ts      100.00%
  validation.ts        97.77%

Utils:              94.1% average
  helpers.ts          100.00%    logger.ts             88.23%

Config:             86.5% average
  database.ts          ~93%     redis.ts              ~85%
  env.ts               ~72%
```

### Writing New Tests

1. Create a test file in `backend/tests/unit/` named `<module>.test.ts`
2. Follow the mocking pattern used in existing tests:

```typescript
// Standard mock setup
jest.mock('../../src/config/database');
jest.mock('../../src/utils/logger');
jest.mock('../../src/utils/helpers', () => ({
  ...jest.requireActual('../../src/utils/helpers'),
  logAudit: jest.fn(),
}));

// Standard request/response mocks
const mockRequest = (overrides = {}) => ({
  params: {}, query: {}, body: {},
  user: { id: 1, role: 'owner', email: 'test@test.com' },
  ...overrides,
});

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};
```

3. Run the specific test file: `npx jest tests/unit/<module>.test.ts --forceExit`
4. Check coverage: `npx jest tests/unit/<module>.test.ts --forceExit --coverage`

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
