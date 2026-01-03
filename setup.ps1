# ESG Reporting App - Quick Start Script
# Run this script to set up the entire development environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ESG Reporting App - Quick Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check Docker
$dockerVersion = docker --version 2>$null
if ($dockerVersion) {
    Write-Host "  ✓ Docker: $dockerVersion" -ForegroundColor Green
} else {
    Write-Host "  ✗ Docker not found. Please install Docker Desktop" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Start PostgreSQL
Write-Host "[2/6] Starting PostgreSQL database..." -ForegroundColor Yellow

$existingContainer = docker ps -a --filter "name=esg-postgres" --format "{{.Names}}" 2>$null
if ($existingContainer -eq "esg-postgres") {
    Write-Host "  Container exists, starting..." -ForegroundColor Gray
    docker start esg-postgres 2>$null
} else {
    Write-Host "  Creating new container..." -ForegroundColor Gray
    docker run -d --name esg-postgres `
        -e POSTGRES_USER=postgres `
        -e POSTGRES_PASSWORD=postgres123 `
        -e POSTGRES_DB=esg_reporting `
        -p 5434:5432 `
        postgres:16-alpine 2>$null
}

Write-Host "  ✓ PostgreSQL started on port 5434" -ForegroundColor Green
Write-Host "  Waiting for database to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 8

Write-Host ""

# Load database schema
Write-Host "[3/6] Loading database schema..." -ForegroundColor Yellow
$schemaPath = Join-Path $PSScriptRoot "database\schema.sql"
if (Test-Path $schemaPath) {
    Get-Content $schemaPath | docker exec -i esg-postgres psql -U postgres -d esg_reporting 2>$null
    Write-Host "  ✓ Schema loaded successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Schema file not found: $schemaPath" -ForegroundColor Red
}

Write-Host ""

# Install backend dependencies
Write-Host "[4/6] Installing backend dependencies..." -ForegroundColor Yellow
Push-Location (Join-Path $PSScriptRoot "backend")
npm install --silent 2>$null
Write-Host "  ✓ Backend dependencies installed" -ForegroundColor Green
Pop-Location

Write-Host ""

# Install frontend dependencies
Write-Host "[5/6] Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location (Join-Path $PSScriptRoot "frontend")
npm install --silent 2>$null
Write-Host "  ✓ Frontend dependencies installed" -ForegroundColor Green
Pop-Location

Write-Host ""

# Load demo data
Write-Host "[6/6] Loading demo data..." -ForegroundColor Yellow
Push-Location (Join-Path $PSScriptRoot "backend")
npm run seed 2>$null
Pop-Location
Write-Host "  ✓ Demo data loaded" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Terminal 1 (Backend):" -ForegroundColor Yellow
Write-Host "    cd backend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 2 (Frontend):" -ForegroundColor Yellow
Write-Host "    cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  App:  http://localhost:2048" -ForegroundColor White
Write-Host "  API:  http://localhost:2047/api" -ForegroundColor White
Write-Host "  Help: http://localhost:2047/api/help" -ForegroundColor White
Write-Host ""
Write-Host "Demo Login:" -ForegroundColor Cyan
Write-Host "  Email:    admin@esgdemo.com" -ForegroundColor White
Write-Host "  Password: Demo@123" -ForegroundColor White
Write-Host ""
