# OWASP ZAP API scan using security/openapi.yaml against the backend.
# Usage:
#   .\security\scripts\zap-api-scan.ps1
#   $env:TARGET_MODE="host"; .\security\scripts\zap-api-scan.ps1
#   $env:ZAP_AUTH_TOKEN="<token>"; .\security\scripts\zap-api-scan.ps1
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"
Require-Docker
Ensure-ReportsDir
Resolve-Targets

$OpenApiSrc = Join-Path $SecurityDir "openapi.yaml"
if (-not (Test-Path $OpenApiSrc)) { throw "missing $OpenApiSrc" }

$ApiBase = "$($BackendTarget.TrimEnd('/'))/api/v1"
$OpenApiRuntime = Join-Path $ReportsDir "openapi.runtime.yaml"

$lines = Get-Content -Path $OpenApiSrc
$out = New-Object System.Collections.Generic.List[string]
$replaced = $false
$inServers = $false
foreach ($line in $lines) {
  if ($line.StartsWith("servers:")) {
    $inServers = $true
    $out.Add($line) | Out-Null
    continue
  }
  if ($inServers -and -not $replaced -and ($line.Trim().StartsWith("- url:"))) {
    $out.Add("  - url: $ApiBase") | Out-Null
    $replaced = $true
    continue
  }
  if ($inServers -and $line -and ($line[0] -notmatch "\s")) {
    $inServers = $false
  }
  $out.Add($line) | Out-Null
}
$out | Set-Content -Path $OpenApiRuntime -Encoding utf8

$ReportsMount = ($ReportsDir -replace "\\", "/")
$zapCmd = @(
  "zap-api-scan.py", "-t", "/zap/wrk/openapi.runtime.yaml", "-f", "openapi",
  "-r", "zap-api-scan.html", "-J", "zap-api-scan.json", "-I"
)
if ($env:ZAP_AUTH_TOKEN) {
  $replacer = "-config replacer.full_list(0).description=auth -config replacer.full_list(0).enabled=true -config replacer.full_list(0).matchtype=REQ_HEADER -config replacer.full_list(0).matchstr=Authorization -config replacer.full_list(0).replacement=Bearer $($env:ZAP_AUTH_TOKEN)"
  $zapCmd += @("-z", $replacer)
}

Write-Banner "ZAP API scan — $ApiBase"
$dockerArgs = @("run", "--rm") + $DockerNetArgs + @(
  "-v", "${ReportsMount}:/zap/wrk:rw",
  $ZapImage
) + $zapCmd
& docker @dockerArgs
$apiRc = $LASTEXITCODE

Write-Host "Report: $ReportsDir\zap-api-scan.html"
Write-Host "API scan exit: $apiRc (0 ok / 1 warn / 2 fail / other error)"
exit 0
