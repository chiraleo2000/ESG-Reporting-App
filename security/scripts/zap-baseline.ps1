# OWASP ZAP baseline (spider + passive) against frontend and backend.
# Usage:
#   .\security\scripts\zap-baseline.ps1
#   $env:TARGET_MODE="host"; .\security\scripts\zap-baseline.ps1
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"
Require-Docker
Ensure-ReportsDir
Resolve-Targets

# Docker Desktop on Windows: mount with forward-ish path docker accepts
$ReportsMount = ($ReportsDir -replace "\\", "/")

Write-Banner "ZAP baseline — frontend ($FrontendTarget)"
$zapArgs = @("run", "--rm") + $DockerNetArgs + @(
  "-v", "${ReportsMount}:/zap/wrk:rw",
  $ZapImage,
  "zap-baseline.py", "-t", $FrontendTarget,
  "-r", "zap-baseline-frontend.html",
  "-J", "zap-baseline-frontend.json",
  "-I"
)
& docker @zapArgs
$frontendRc = $LASTEXITCODE

Write-Banner "ZAP baseline — backend ($BackendTarget)"
$zapArgs = @("run", "--rm") + $DockerNetArgs + @(
  "-v", "${ReportsMount}:/zap/wrk:rw",
  $ZapImage,
  "zap-baseline.py", "-t", $BackendTarget,
  "-r", "zap-baseline-backend.html",
  "-J", "zap-baseline-backend.json",
  "-I"
)
& docker @zapArgs
$backendRc = $LASTEXITCODE

Write-Host "Reports written to $ReportsDir"
Write-Host "Frontend baseline exit: $frontendRc (0 ok / 1 warn / 2 fail / other error)"
Write-Host "Backend baseline exit:  $backendRc"
exit 0
