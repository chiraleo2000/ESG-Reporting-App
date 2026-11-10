#!/usr/bin/env bash
# Shared helpers for ZAP / Sonar security scripts.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECURITY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_ROOT="$(cd "${SECURITY_DIR}/.." && pwd)"
REPORTS_DIR="${SECURITY_DIR}/reports"

# Compose project name defaults to directory name (esg-reporting-app)
COMPOSE_PROJECT="${COMPOSE_PROJECT:-esg-reporting-app}"
NETWORK_NAME="${NETWORK_NAME:-${COMPOSE_PROJECT}_esg-network}"

# compose = join app network and use service DNS (frontend/backend)
# host   = use host.docker.internal published ports
TARGET_MODE="${TARGET_MODE:-compose}"

FRONTEND_URL_COMPOSE="${FRONTEND_URL_COMPOSE:-http://frontend:2048}"
BACKEND_URL_COMPOSE="${BACKEND_URL_COMPOSE:-http://backend:2047}"
FRONTEND_URL_HOST="${FRONTEND_URL_HOST:-http://host.docker.internal:2048}"
BACKEND_URL_HOST="${BACKEND_URL_HOST:-http://host.docker.internal:2047}"

ZAP_IMAGE="${ZAP_IMAGE:-zaproxy/zap-stable}"
SONAR_IMAGE="${SONAR_IMAGE:-sonarqube:community}"
SONAR_SCANNER_IMAGE="${SONAR_SCANNER_IMAGE:-sonarsource/sonar-scanner-cli}"
SONAR_URL_HOST="${SONAR_URL_HOST:-http://host.docker.internal:9000}"
SONAR_URL_COMPOSE="${SONAR_URL_COMPOSE:-http://sonarqube:9000}"

ensure_reports_dir() {
  mkdir -p "${REPORTS_DIR}"
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: docker CLI not found. Install Docker Desktop and retry." >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Docker daemon is not running. Start Docker Desktop and retry." >&2
    exit 1
  fi
}

resolve_targets() {
  if [[ "${TARGET_MODE}" == "host" ]]; then
    FRONTEND_TARGET="${FRONTEND_URL_HOST}"
    BACKEND_TARGET="${BACKEND_URL_HOST}"
    DOCKER_NET_ARGS=()
  else
    FRONTEND_TARGET="${FRONTEND_URL_COMPOSE}"
    BACKEND_TARGET="${BACKEND_URL_COMPOSE}"
    if ! docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
      echo "ERROR: Docker network '${NETWORK_NAME}' not found." >&2
      echo "Start the app stack first: docker compose up -d" >&2
      echo "Or set TARGET_MODE=host to scan via host.docker.internal." >&2
      exit 1
    fi
    DOCKER_NET_ARGS=(--network "${NETWORK_NAME}")
  fi
}

echo_banner() {
  echo "========================================"
  echo "$1"
  echo "========================================"
}
