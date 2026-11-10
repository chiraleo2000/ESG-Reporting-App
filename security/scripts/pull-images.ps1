# Pull OWASP ZAP + SonarQube images used by the security harness.
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"
Require-Docker
Write-Banner "Pulling security scan images"
docker pull $ZapImage
docker pull $SonarImage
docker pull $SonarScannerImage
Write-Host "Done."
