# Opens GitHub org profile settings and copies paste values to clipboard.
# For full automation (API + .github repo), run: gh auth login  then  node scripts/push-github-org.mjs

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pasteFile = Join-Path $root "store-listing\github-org-profile-paste.txt"

if (-not (Test-Path $pasteFile)) {
  Write-Error "Missing $pasteFile"
}

$text = Get-Content $pasteFile -Raw
Set-Clipboard -Value $text

Write-Host ""
Write-Host "Copied org profile values to clipboard."
Write-Host "Opening GitHub organization profile settings..."
Write-Host ""
Write-Host "Paste from clipboard into each field, upload public/icons/icon-1024.png as profile picture,"
Write-Host "then click Update profile."
Write-Host ""

Start-Process "https://github.com/organizations/Echelon-RSVP/settings/profile"
Start-Process "https://github.com/Echelon-RSVP/echelon/settings"

$gh = Get-Command gh -ErrorAction SilentlyContinue
if ($gh) {
  $authed = $true
  try { gh auth status 2>$null } catch { $authed = $false }
  if (-not $authed) {
    Write-Host "Optional: run  gh auth login  then  node scripts/push-github-org.mjs  to auto-fill via API."
  } else {
    Write-Host "GitHub CLI is authenticated. Running push-github-org.mjs ..."
    Set-Location $root
    node scripts/push-github-org.mjs
  }
}
