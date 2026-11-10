# Security scanning harness (OWASP ZAP + SonarQube)

Local Docker-based security scanning for the ESG Reporting App compose stack.

| Target | URL (host) | Compose DNS |
|--------|------------|-------------|
| Frontend | http://localhost:2048 | `http://frontend:2048` |
| Backend API | http://localhost:2047 | `http://backend:2047` |
| SonarQube UI | http://localhost:9000 | `http://sonarqube:9000` |

Reports are written to `security/reports/` (gitignored). This harness does **not** run the full scan-and-fix loop by itself.

## Prerequisites

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
2. App stack healthy: `docker compose up -d` (from `esg-reporting-app/`)
3. Images pulled (see below)

## Pull images

```bash
# Bash / Git Bash / WSL
./security/scripts/pull-images.sh
```

```powershell
# PowerShell
.\security\scripts\pull-images.ps1
```

Or manually:

```bash
docker pull zaproxy/zap-stable
docker pull sonarqube:community
docker pull sonarsource/sonar-scanner-cli
```

If pull fails (daemon stopped, network, auth), start Docker Desktop and retry. Scanning cannot proceed without these images.

## OWASP ZAP

Scripts join the compose network `esg-reporting-app_esg-network` by default (`TARGET_MODE=compose`) so ZAP can reach `frontend` / `backend` by service name. Use `TARGET_MODE=host` to hit `host.docker.internal` published ports instead.

### Baseline (spider + passive)

```bash
./security/scripts/zap-baseline.sh
# or
TARGET_MODE=host ./security/scripts/zap-baseline.sh
```

```powershell
.\security\scripts\zap-baseline.ps1
# or
$env:TARGET_MODE = "host"; .\security\scripts\zap-baseline.ps1
```

**One-liner (compose network):**

```bash
docker run --rm --network esg-reporting-app_esg-network \
  -v "%CD%/security/reports:/zap/wrk:rw" \
  zaproxy/zap-stable \
  zap-baseline.py -t http://frontend:2048 -r zap-baseline-frontend.html -J zap-baseline-frontend.json -I
```

```bash
docker run --rm --network esg-reporting-app_esg-network \
  -v "%CD%/security/reports:/zap/wrk:rw" \
  zaproxy/zap-stable \
  zap-baseline.py -t http://backend:2047 -r zap-baseline-backend.html -J zap-baseline-backend.json -I
```

Outputs: `security/reports/zap-baseline-frontend.{html,json}`, `zap-baseline-backend.{html,json}`.

ZAP exit codes: `0` = OK, `1` = warnings, `2` = failures. Scripts use `-I` and always exit `0` so findings are reviewed from reports rather than failing CI prematurely during harness setup.

### API scan

Uses [`openapi.yaml`](./openapi.yaml) (minimal surface for scanning, not a full product OpenAPI).

```bash
./security/scripts/zap-api-scan.sh
```

```powershell
.\security\scripts\zap-api-scan.ps1
```

**Authenticated API scan** (after login / MFA helpers exist):

```bash
ZAP_AUTH_TOKEN="<access_jwt>" ./security/scripts/zap-api-scan.sh
```

```powershell
$env:ZAP_AUTH_TOKEN = "<access_jwt>"; .\security\scripts\zap-api-scan.ps1
```

Outputs: `security/reports/zap-api-scan.{html,json}` and `openapi.runtime.yaml`.

## SonarQube Community

SonarQube is an **optional compose profile** (`security`) so it does not start with the normal app stack.

### Start SonarQube

```bash
docker compose --profile security up -d sonarqube
```

Wait until http://localhost:9000 responds (first boot can take 1–2 minutes). Default login: `admin` / `admin` (change on first login). Create a user token under **My Account → Security**.

### Scan source (`backend/src` + `frontend/src`)

Config: [`../sonar-project.properties`](../sonar-project.properties).

```bash
SONAR_TOKEN=squ_xxx ./security/scripts/sonar-scan.sh
```

```powershell
$env:SONAR_TOKEN = "squ_xxx"; .\security\scripts\sonar-scan.ps1
```

**One-liner:**

```bash
docker run --rm --network esg-reporting-app_esg-network \
  -e SONAR_HOST_URL=http://sonarqube:9000 \
  -e SONAR_TOKEN=squ_xxx \
  -v "%CD%:/usr/src" -w /usr/src \
  sonarsource/sonar-scanner-cli
```

View issues and quality gate in the SonarQube UI. Optional coverage paths are declared in `sonar-project.properties` if you generate LCOV reports.

### Stop SonarQube

```bash
docker compose --profile security stop sonarqube
# or remove with volumes when resetting:
# docker compose --profile security down
```

## Suggested order (when ready to scan-and-fix)

1. `docker compose up -d` — app stack
2. `./security/scripts/pull-images.sh`
3. `./security/scripts/zap-baseline.sh` then `./security/scripts/zap-api-scan.sh`
4. `docker compose --profile security up -d sonarqube` → token → `./security/scripts/sonar-scan.sh`
5. Triage High/Critical findings in app code; re-scan (tracked separately as plan todo `zap-sonar-scan-fix`)

## Environment overrides

| Variable | Default | Purpose |
|----------|---------|---------|
| `TARGET_MODE` | `compose` | `compose` or `host` |
| `NETWORK_NAME` | `esg-reporting-app_esg-network` | Compose bridge network |
| `COMPOSE_PROJECT` | `esg-reporting-app` | Used to derive network name |
| `ZAP_IMAGE` | `zaproxy/zap-stable` | ZAP image |
| `SONAR_TOKEN` | _(required for sonar)_ | Scanner auth |
| `ZAP_AUTH_TOKEN` | _(optional)_ | Bearer JWT for API scan |

## Layout

```
security/
  README.md              # this file
  openapi.yaml           # ZAP API scan target definition
  reports/               # gitignored scan outputs
  scripts/
    common.sh|.ps1
    pull-images.sh|.ps1
    zap-baseline.sh|.ps1
    zap-api-scan.sh|.ps1
    sonar-scan.sh|.ps1
```
