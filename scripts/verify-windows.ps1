# Start from the repository root:
# powershell -ExecutionPolicy Bypass -File scripts/verify-windows.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$logPath = Join-Path (Get-Location) 'spurjagd-verification.log'
Start-Transcript -Path $logPath -Force | Out-Null
try {
  Write-Host 'SPURJAGD: Windows-Pruefung gestartet'
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js fehlt. Bitte Node.js 22 oder neuer installieren.' }
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm fehlt.' }
  $major = [int]((node --version).TrimStart('v').Split('.')[0])
  if ($major -lt 22) { throw 'Mindestens Node.js 22 erforderlich.' }
  Write-Host ('Node: ' + (node --version))
  Write-Host ('npm: ' + (npm --version))
  if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Host ('Git-Commit: ' + (git rev-parse HEAD))
  } else {
    Write-Host 'Git nicht gefunden: Commit-Stand bitte manuell im Abnahmeprotokoll eintragen.'
  }
  Write-Host '1/3 Abhaengigkeiten installieren'
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm install fehlgeschlagen.' }
  Write-Host '2/3 Automatische Tests'
  npm test
  if ($LASTEXITCODE -ne 0) { throw 'Tests fehlgeschlagen.' }
  Write-Host '3/3 TypeScript und Produktions-Build'
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Build fehlgeschlagen.' }
  Write-Host 'OK: Tests und Build erfolgreich.'
  Write-Host 'Die automatische Prüfung ist keine Bestätigung für einen korrekten A5-Ausdruck.'
  Write-Host 'A5-Druckvorschau anschliessend manuell im Browser pruefen.'
}
catch {
  Write-Host ('FEHLER: ' + $_.Exception.Message) -ForegroundColor Red
  throw
}
finally {
  Write-Host ('Pruefprotokoll: ' + $logPath)
  Stop-Transcript | Out-Null
}
