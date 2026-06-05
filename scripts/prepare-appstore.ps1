# Echelon App Store prep from Windows. Run in PowerShell:
#   .\scripts\prepare-appstore.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Echelon App Store prep (Windows)" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Install Node.js 22+ from https://nodejs.org" -ForegroundColor Red
  exit 1
}

Write-Host "Installing npm dependencies (includes Capacitor)..."
npm install

Write-Host "Verifying web build..."
npm run build
npm run ios:prepare

$checks = @(
  "capacitor.config.ts",
  "codemagic.yaml",
  ".github/workflows/ios-appstore.yml",
  "store-listing/en-US/description.txt",
  "public/icons/icon-1024.png",
  "APP-STORE-FROM-WINDOWS.md"
)

foreach ($f in $checks) {
  if (-not (Test-Path $f)) {
    Write-Host "Missing: $f" -ForegroundColor Red
    exit 1
  }
}

Write-Host ""
Write-Host "Ready. Next steps (all from Windows browser):" -ForegroundColor Green
Write-Host "  1. Read APP-STORE-FROM-WINDOWS.md"
Write-Host "  2. Enroll Apple Developer Program (`$99)"
Write-Host "  3. Push repo to GitHub"
Write-Host "  4. Connect Codemagic OR GitHub Actions secrets"
Write-Host "  5. Click Start build -> TestFlight -> Submit for review"
Write-Host ""
Write-Host "Store copy is in store-listing/en-US/" -ForegroundColor Green
