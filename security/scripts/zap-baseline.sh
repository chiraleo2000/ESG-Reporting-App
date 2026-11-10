#!/usr/bin/env bash
# OWASP ZAP baseline (spider + passive) against frontend and backend.
# Prerequisites: app stack up (docker compose up -d), image zaproxy/zap-stable pulled.
#
# Usage:
#   ./security/scripts/zap-baseline.sh
#   TARGET_MODE=host ./security/scripts/zap-baseline.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

require_docker
ensure_reports_dir
resolve_targets

echo_banner "ZAP baseline — frontend (${FRONTEND_TARGET})"
# Exit codes: 0=ok, 1=warnings, 2=failures — do not fail the script on findings alone
set +e
docker run --rm \
  "${DOCKER_NET_ARGS[@]}" \
  -v "${REPORTS_DIR}:/zap/wrk:rw" \
  "${ZAP_IMAGE}" \
  zap-baseline.py -t "${FRONTEND_TARGET}" \
    -r zap-baseline-frontend.html \
    -J zap-baseline-frontend.json \
    -I
FRONTEND_RC=$?

echo_banner "ZAP baseline — backend (${BACKEND_TARGET})"
docker run --rm \
  "${DOCKER_NET_ARGS[@]}" \
  -v "${REPORTS_DIR}:/zap/wrk:rw" \
  "${ZAP_IMAGE}" \
  zap-baseline.py -t "${BACKEND_TARGET}" \
    -r zap-baseline-backend.html \
    -J zap-baseline-backend.json \
    -I
BACKEND_RC=$?
set -e

echo "Reports written to ${REPORTS_DIR}"
echo "Frontend baseline exit: ${FRONTEND_RC} (0 ok / 1 warn / 2 fail / other error)"
echo "Backend baseline exit:  ${BACKEND_RC}"
exit 0
