# Run from the repository root: powershell -ExecutionPolicy Bypass -File scripts/verify-windows.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js fehlt. Bitte Node.js 22 oder neuer installieren.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm fehlt.' }
$major = [int]((node --version).TrimStart('v').Split('.')[0])
if ($major -lt 22) { throw 'Mindestens Node.js 22 erforderlich.' }
Write-Host 'SPURJAGD: Abhaengigkeiten installieren'
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'npm install fehlgeschlagen.' }
Write-Host 'SPURJAGD: Automatische Tests'
npm test
if ($LASTEXITCODE -ne 0) { throw 'Tests fehlgeschlagen.' }
Write-Host 'SPURJAGD: TypeScript und Produktions-Build'
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build fehlgeschlagen.' }
Write-Host 'OK: Tests und Build erfolgreich. A5-Druckvorschau bitte separat im Browser pruefen.'
