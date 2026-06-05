# Opens the pages you need and lists GitHub secrets for the free iOS build.
# Run: .\scripts\setup-github-ios-build.ps1

$ErrorActionPreference = "Stop"
Write-Host ""
Write-Host "Echelon — free iOS build via GitHub Actions" -ForegroundColor Cyan
Write-Host ""

Write-Host "Add these 4 secrets in GitHub → Settings → Secrets → Actions:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  APPLE_TEAM_ID          = 10-char Team ID (developer.apple.com/account → Membership)"
Write-Host "  APPSTORE_ISSUER_ID     = App Store Connect → Users and Access → Integrations → API"
Write-Host "  APPSTORE_KEY_ID        = Same page, from your API key"
Write-Host "  APPSTORE_PRIVATE_KEY   = Full .p8 file contents (BEGIN/END lines included)"
Write-Host ""

$p8 = Get-ChildItem -Path $HOME -Filter "AuthKey_*.p8" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if ($p8) {
  Write-Host "Found API key file: $($p8.FullName)" -ForegroundColor Green
  Write-Host "Copy its contents into APPSTORE_PRIVATE_KEY." -ForegroundColor Green
} else {
  Write-Host "Download AuthKey_XXXXX.p8 from App Store Connect when you create the API key." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "Then: GitHub repo → Actions → iOS App Store build → Run workflow" -ForegroundColor Green
Write-Host "Full guide: store-listing/BUILD-FREE.md" -ForegroundColor Green
Write-Host ""

$open = Read-Host "Open helpful pages in browser? (y/n)"
if ($open -eq "y") {
  Start-Process "https://github.com/new"
  Start-Process "https://appstoreconnect.apple.com/access/integrations/api"
  Start-Process "https://developer.apple.com/account"
}
