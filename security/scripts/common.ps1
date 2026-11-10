# Shared helpers for ZAP / Sonar security scripts (Windows PowerShell).

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
  $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$SecurityDir = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$AppRoot = (Resolve-Path (Join-Path $SecurityDir "..")).Path
$ReportsDir = Join-Path $SecurityDir "reports"

$ComposeProject = if ($env:COMPOSE_PROJECT) { $env:COMPOSE_PROJECT } else { "esg-reporting-app" }
$NetworkName = if ($env:NETWORK_NAME) { $env:NETWORK_NAME } else { "${ComposeProject}_esg-network" }
$TargetMode = if ($env:TARGET_MODE) { $env:TARGET_MODE } else { "compose" }

$FrontendUrlCompose = if ($env:FRONTEND_URL_COMPOSE) { $env:FRONTEND_URL_COMPOSE } else { "http://frontend:2048" }
$BackendUrlCompose = if ($env:BACKEND_URL_COMPOSE) { $env:BACKEND_URL_COMPOSE } else { "http://backend:2047" }
$FrontendUrlHost = if ($env:FRONTEND_URL_HOST) { $env:FRONTEND_URL_HOST } else { "http://host.docker.internal:2048" }
$BackendUrlHost = if ($env:BACKEND_URL_HOST) { $env:BACKEND_URL_HOST } else { "http://host.docker.internal:2047" }

$ZapImage = if ($env:ZAP_IMAGE) { $env:ZAP_IMAGE } else { "zaproxy/zap-stable" }
$SonarImage = if ($env:SONAR_IMAGE) { $env:SONAR_IMAGE } else { "sonarqube:community" }
$SonarScannerImage = if ($env:SONAR_SCANNER_IMAGE) { $env:SONAR_SCANNER_IMAGE } else { "sonarsource/sonar-scanner-cli" }
$SonarUrlHost = if ($env:SONAR_URL_HOST) { $env:SONAR_URL_HOST } else { "http://host.docker.internal:9000" }
$SonarUrlCompose = if ($env:SONAR_URL_COMPOSE) { $env:SONAR_URL_COMPOSE } else { "http://sonarqube:9000" }

function Ensure-ReportsDir {
  New-Item -ItemType Directory -Force -Path $ReportsDir | Out-Null
}

function Require-Docker {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "docker CLI not found. Install Docker Desktop and retry."
  }
  docker info 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker daemon is not running. Start Docker Desktop and retry."
  }
}

function Resolve-Targets {
  if ($TargetMode -eq "host") {
    $script:FrontendTarget = $FrontendUrlHost
    $script:BackendTarget = $BackendUrlHost
    $script:DockerNetArgs = @()
  } else {
    $script:FrontendTarget = $FrontendUrlCompose
    $script:BackendTarget = $BackendUrlCompose
    docker network inspect $NetworkName 1>$null 2>$null
    if ($LASTEXITCODE -ne 0) {
      throw "Docker network '$NetworkName' not found. Start: docker compose up -d  (or set TARGET_MODE=host)"
    }
    $script:DockerNetArgs = @("--network", $NetworkName)
  }
}

function Write-Banner([string]$Message) {
  Write-Host "========================================"
  Write-Host $Message
  Write-Host "========================================"
}
