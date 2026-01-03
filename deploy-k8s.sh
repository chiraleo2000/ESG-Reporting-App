#!/bin/bash
# =============================================================================
# ESG Reporting App - Kubernetes Deployment Script
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
K8S_DIR="$SCRIPT_DIR/k8s"

echo "=========================================="
echo "ESG Reporting App - K8s Deployment"
echo "=========================================="

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        echo "ERROR: kubectl not found. Please install kubectl first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo "ERROR: docker not found. Please install Docker first."
        exit 1
    fi
    
    echo "✓ All prerequisites met"
}

# Build Docker images
build_images() {
    echo ""
    echo "Building Docker images..."
    
    echo "Building backend image..."
    docker build -t esg-backend:latest -f backend/Dockerfile --target production backend/
    
    echo "Building frontend image..."
    docker build -t esg-frontend:latest -f frontend/Dockerfile --target production frontend/
    
    echo "✓ Images built successfully"
}

# Deploy to Kubernetes
deploy_k8s() {
    echo ""
    echo "Deploying to Kubernetes..."
    
    # Create namespace first
    kubectl apply -f "$K8S_DIR/namespace.yaml"
    
    # Apply all resources
    kubectl apply -k "$K8S_DIR"
    
    echo "✓ Resources deployed"
}

# Wait for deployments
wait_for_deployments() {
    echo ""
    echo "Waiting for deployments to be ready..."
    
    kubectl -n esg-reporting rollout status deployment/postgres --timeout=120s
    kubectl -n esg-reporting rollout status deployment/redis --timeout=60s
    kubectl -n esg-reporting rollout status deployment/backend --timeout=120s
    kubectl -n esg-reporting rollout status deployment/frontend --timeout=60s
    
    echo "✓ All deployments ready"
}

# Show status
show_status() {
    echo ""
    echo "=========================================="
    echo "Deployment Status"
    echo "=========================================="
    
    kubectl -n esg-reporting get pods
    echo ""
    kubectl -n esg-reporting get services
    echo ""
    
    echo "=========================================="
    echo "Access URLs (NodePort)"
    echo "=========================================="
    echo "Frontend: http://localhost:32048"
    echo "Backend:  http://localhost:32047"
    echo "Health:   http://localhost:32047/health"
    echo ""
}

# Main
main() {
    check_prerequisites
    build_images
    deploy_k8s
    wait_for_deployments
    show_status
}

# Run
main "$@"
