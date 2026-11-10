# Run SonarScanner CLI against local SonarQube (compose profile: security).
# Usage:
#   $env:SONAR_TOKEN="squ_xxx"; .\security\scripts\sonar-scan.ps1
#   $env:TARGET_MODE="host"; $env:SONAR_TOKEN="squ_xxx"; .\security\scripts\sonar-scan.ps1
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"
Require-Docker
Ensure-ReportsDir

if (-not $env:SONAR_TOKEN) {
  throw @"
Set SONAR_TOKEN to a SonarQube user/project token.
  1) docker compose --profile security up -d sonarqube
  2) Open http://localhost:9000 (default admin/admin), change password
  3) My Account → Security → Generate Token
"@
}

if ($TargetMode -eq "host") {
  $sonarHostUrl = $SonarUrlHost
  $netArgs = @()
} else {
  $sonarHostUrl = $SonarUrlCompose
  docker network inspect $NetworkName 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "network '$NetworkName' not found. Start: docker compose --profile security up -d sonarqube (or TARGET_MODE=host)"
  }
  $netArgs = @("--network", $NetworkName)
}

$AppMount = ($AppRoot -replace "\\", "/")
Write-Banner "SonarScanner → $sonarHostUrl"
$dockerArgs = @("run", "--rm") + $netArgs + @(
  "-e", "SONAR_HOST_URL=$sonarHostUrl",
  "-e", "SONAR_TOKEN=$($env:SONAR_TOKEN)",
  "-v", "${AppMount}:/usr/src",
  "-w", "/usr/src",
  $SonarScannerImage
)
& docker @dockerArgs

Write-Host "Open http://localhost:9000 to view the quality gate / issues."
