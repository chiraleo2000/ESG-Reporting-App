#!/usr/bin/env bash
# Run SonarScanner CLI against local SonarQube (compose profile: security).
#
# Prerequisites:
#   docker compose --profile security up -d sonarqube
#   Wait until http://localhost:9000 is up; change default admin password;
#   create a project token and export SONAR_TOKEN.
#
# Usage:
#   SONAR_TOKEN=squ_xxx ./security/scripts/sonar-scan.sh
#   TARGET_MODE=host SONAR_TOKEN=squ_xxx ./security/scripts/sonar-scan.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

require_docker
ensure_reports_dir

if [[ -z "${SONAR_TOKEN:-}" ]]; then
  echo "ERROR: set SONAR_TOKEN to a SonarQube user/project token." >&2
  echo "  1) docker compose --profile security up -d sonarqube" >&2
  echo "  2) Open http://localhost:9000 (default admin/admin), change password" >&2
  echo "  3) My Account → Security → Generate Token" >&2
  exit 1
fi

if [[ "${TARGET_MODE}" == "host" ]]; then
  SONAR_HOST_URL="${SONAR_URL_HOST}"
  DOCKER_NET_ARGS=()
else
  SONAR_HOST_URL="${SONAR_URL_COMPOSE}"
  if ! docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
    echo "ERROR: network '${NETWORK_NAME}' not found. Start Sonar with:" >&2
    echo "  docker compose --profile security up -d sonarqube" >&2
    echo "Or use TARGET_MODE=host." >&2
    exit 1
  fi
  DOCKER_NET_ARGS=(--network "${NETWORK_NAME}")
fi

echo_banner "SonarScanner → ${SONAR_HOST_URL}"
docker run --rm \
  "${DOCKER_NET_ARGS[@]}" \
  -e SONAR_HOST_URL="${SONAR_HOST_URL}" \
  -e SONAR_TOKEN="${SONAR_TOKEN}" \
  -v "${APP_ROOT}:/usr/src" \
  -w /usr/src \
  "${SONAR_SCANNER_IMAGE}"

echo "Open ${SONAR_URL_HOST} (or http://localhost:9000) to view the quality gate / issues."
echo "Scanner logs are in the container output; HTML export is optional via Sonar UI."
