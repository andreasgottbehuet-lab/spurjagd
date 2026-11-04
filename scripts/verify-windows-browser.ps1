# Optional browser acceptance on Windows, after scripts/verify-windows.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
New-Item -ItemType Directory -Path verification -Force | Out-Null
$server = $null
try {
  if (-not (Test-Path 'dist/index.html')) { throw 'Build fehlt. Zuerst scripts/verify-windows.ps1 ausfuehren.' }
  npm install --no-save --no-audit --no-fund playwright
  if ($LASTEXITCODE -ne 0) { throw 'Playwright-Installation fehlgeschlagen.' }
  npx playwright install chromium
  if ($LASTEXITCODE -ne 0) { throw 'Chromium-Installation fehlgeschlagen.' }
  $server = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort' -PassThru -WindowStyle Hidden -RedirectStandardOutput 'verification/windows-preview.log' -RedirectStandardError 'verification/windows-preview-error.log'
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    if ($server.HasExited) { break }
    try {
      $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4173/' -TimeoutSec 2 -UseBasicParsing
      if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Vite-Vorschau nicht erreichbar. Siehe verification/windows-preview-error.log.' }
  node scripts/verify-project-browser.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Browser-Projektverwaltung fehlgeschlagen.' }
  if ((Get-Command pdfinfo -ErrorAction SilentlyContinue) -and (Get-Command pdftotext -ErrorAction SilentlyContinue) -and (Get-Command pdftoppm -ErrorAction SilentlyContinue)) {
    node scripts/verify-a5-browser.mjs
    if ($LASTEXITCODE -ne 0) { throw 'A5-Browserabnahme fehlgeschlagen.' }
  } else {
    Write-Warning 'A5-PDF-Pruefung uebersprungen: Poppler (pdfinfo, pdftotext, pdftoppm) fehlt im PATH.'
  }
  Write-Host 'Browserabnahme beendet. Berichte und Druckdateien unter verification/.'
} finally {
  if ($server -and -not $server.HasExited) {
    & taskkill.exe /PID $server.Id /T /F | Out-Null
  }
}
