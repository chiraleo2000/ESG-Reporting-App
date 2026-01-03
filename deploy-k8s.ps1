# =============================================================================
# ESG Reporting App - Kubernetes Deployment Script (PowerShell)
# =============================================================================
# Usage: .\deploy-k8s.ps1

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ESG Reporting App - K8s Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check prerequisites
function Test-Prerequisites {
    Write-Host "`nChecking prerequisites..." -ForegroundColor Yellow
    
    try {
        kubectl version --client | Out-Null
        Write-Host "✓ kubectl found" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: kubectl not found" -ForegroundColor Red
        exit 1
    }
    
    try {
        docker version | Out-Null
        Write-Host "✓ docker found" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: docker not found" -ForegroundColor Red
        exit 1
    }
}

# Build Docker images
function Build-Images {
    Write-Host "`nBuilding Docker images..." -ForegroundColor Yellow
    
    Write-Host "Building backend image..."
    docker build -t esg-backend:latest -f backend/Dockerfile --target production backend/
    if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }
    
    Write-Host "Building frontend image..."
    docker build -t esg-frontend:latest -f frontend/Dockerfile --target production frontend/
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
    
    Write-Host "✓ Images built successfully" -ForegroundColor Green
}

# Deploy to Kubernetes
function Deploy-K8s {
    Write-Host "`nDeploying to Kubernetes..." -ForegroundColor Yellow
    
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -k k8s/
    
    Write-Host "✓ Resources deployed" -ForegroundColor Green
}

# Wait for deployments
function Wait-Deployments {
    Write-Host "`nWaiting for deployments..." -ForegroundColor Yellow
    
    kubectl -n esg-reporting rollout status deployment/postgres --timeout=120s
    kubectl -n esg-reporting rollout status deployment/redis --timeout=60s
    kubectl -n esg-reporting rollout status deployment/backend --timeout=120s
    kubectl -n esg-reporting rollout status deployment/frontend --timeout=60s
    
    Write-Host "✓ All deployments ready" -ForegroundColor Green
}

# Show status
function Show-Status {
    Write-Host "`n==========================================" -ForegroundColor Cyan
    Write-Host "Deployment Status" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
    kubectl -n esg-reporting get pods
    Write-Host ""
    kubectl -n esg-reporting get services
    
    Write-Host "`n==========================================" -ForegroundColor Cyan
    Write-Host "Access URLs (NodePort)" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Frontend: http://localhost:32048" -ForegroundColor White
    Write-Host "Backend:  http://localhost:32047" -ForegroundColor White
    Write-Host "Health:   http://localhost:32047/health" -ForegroundColor White
}

# Main
try {
    Test-Prerequisites
    Build-Images
    Deploy-K8s
    Wait-Deployments
    Show-Status
    
    Write-Host "`n✓ Deployment complete!" -ForegroundColor Green
} catch {
    Write-Host "`nERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
