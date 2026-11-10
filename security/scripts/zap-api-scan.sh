#!/usr/bin/env bash
# OWASP ZAP API scan using security/openapi.yaml against the backend.
# Prerequisites: app stack up, zaproxy/zap-stable pulled.
#
# Usage:
#   ./security/scripts/zap-baseline.sh   # optional companion
#   ./security/scripts/zap-api-scan.sh
#   TARGET_MODE=host ./security/scripts/zap-api-scan.sh
#
# Authenticated scanning (after MFA/login helpers exist): obtain a Bearer token,
# then re-run with ZAP_AUTH_TOKEN set. The harness injects an Authorization header.
#   ZAP_AUTH_TOKEN="<access_token>" ./security/scripts/zap-api-scan.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

require_docker
ensure_reports_dir
resolve_targets

OPENAPI_SRC="${SECURITY_DIR}/openapi.yaml"
if [[ ! -f "${OPENAPI_SRC}" ]]; then
  echo "ERROR: missing ${OPENAPI_SRC}" >&2
  exit 1
fi

API_BASE="${BACKEND_TARGET%/}/api/v1"
OPENAPI_RUNTIME="${REPORTS_DIR}/openapi.runtime.yaml"

if command -v python >/dev/null 2>&1 || command -v python3 >/dev/null 2>&1; then
  PY="$(command -v python3 2>/dev/null || command -v python)"
  "${PY}" - "${OPENAPI_SRC}" "${OPENAPI_RUNTIME}" "${API_BASE}" <<'PY'
import sys
src, dst, base = sys.argv[1], sys.argv[2], sys.argv[3]
lines = open(src, encoding="utf-8").read().splitlines()
out, replaced, in_servers = [], False, False
for line in lines:
    if line.startswith("servers:"):
        in_servers = True
        out.append(line)
        continue
    if in_servers and not replaced and line.strip().startswith("- url:"):
        out.append(f"  - url: {base}")
        replaced = True
        continue
    if in_servers and line and not line[0].isspace():
        in_servers = False
    out.append(line)
open(dst, "w", encoding="utf-8").write("\n".join(out) + "\n")
PY
else
  cp "${OPENAPI_SRC}" "${OPENAPI_RUNTIME}"
  echo "WARN: Python not found; using openapi.yaml servers as-is (prefer compose TARGET_MODE)." >&2
fi

ZAP_CMD=(zap-api-scan.py -t /zap/wrk/openapi.runtime.yaml -f openapi -r zap-api-scan.html -J zap-api-scan.json -I)
if [[ -n "${ZAP_AUTH_TOKEN:-}" ]]; then
  ZAP_CMD+=(-z "-config replacer.full_list(0).description=auth -config replacer.full_list(0).enabled=true -config replacer.full_list(0).matchtype=REQ_HEADER -config replacer.full_list(0).matchstr=Authorization -config replacer.full_list(0).replacement=Bearer ${ZAP_AUTH_TOKEN}")
fi

echo_banner "ZAP API scan — ${API_BASE}"
set +e
docker run --rm \
  "${DOCKER_NET_ARGS[@]}" \
  -v "${REPORTS_DIR}:/zap/wrk:rw" \
  "${ZAP_IMAGE}" \
  "${ZAP_CMD[@]}"
API_RC=$?
set -e

echo "Report: ${REPORTS_DIR}/zap-api-scan.html"
echo "API scan exit: ${API_RC} (0 ok / 1 warn / 2 fail / other error)"
exit 0
