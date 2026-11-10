#!/usr/bin/env bash
# Pull OWASP ZAP + SonarQube images used by the security harness.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

require_docker

echo_banner "Pulling security scan images"
docker pull "${ZAP_IMAGE}"
docker pull "${SONAR_IMAGE}"
docker pull "${SONAR_SCANNER_IMAGE}"
echo "Done."
