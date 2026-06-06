# iOS deploy method (Windows, no Mac)

This is the **proven method** used for Echelon (June 2026). Use it for future Capacitor apps that follow the same GitHub Actions + automatic signing pattern.

**Quick start (already set up):** see [BUILD-FREE.md](BUILD-FREE.md).

---

## Method in one sentence

Push code to GitHub, run **iOS App Store build** on a **macos-26** runner with an **Admin** App Store Connect API key; Xcode archives, exports, and uploads to TestFlight in the cloud. You never need a Mac.

---

## What actually works (lessons learned)

These were the blockers we hit. Do not skip them on a new app.

| Requirement | Why |
|-------------|-----|
| **Admin** API key (not App Manager) | App Manager can archive but **cannot** cloud-sign the IPA on export (`Cloud signing permission error`). |
| **CI_DEVICE_UDID** secret | Apple requires at least one registered device before automatic development/distribution profiles work on CI. |
| **macos-26** + **Xcode 26** | As of 2026, Apple rejects uploads built with Xcode 16 / iOS 18 SDK. Use `maxim-lobanov/setup-xcode@v1` with `latest-stable`. |
| **No global `CODE_SIGN_IDENTITY`** on `xcodebuild` | Passing it on the CLI breaks CocoaPods targets. Team ID only on CLI; pods unsigned via `patch-pods-signing.mjs`. |
| **No pinned `Apple Distribution` in pbxproj** | Conflicts with automatic signing. `patch-ios-signing.mjs` clears inherited `iPhone Developer` on Release instead. |
| **API key on both archive and export** | `-authenticationKeyPath`, `-authenticationKeyID`, `-authenticationKeyIssuerID`, `-allowProvisioningUpdates`. |
| **`.p8` only from Apple web UI** | API keys cannot be created programmatically. Download once; store in `APPSTORE_PRIVATE_KEY`. |

**Do not use** the old manual path (`provision-ios-signing.mjs` + p12 secrets) unless Admin cloud signing is impossible. Echelon production workflow does **not** use it.

---

## Architecture

```
Windows PC
  → git push to GitHub
  → Actions: workflow_dispatch "iOS App Store build"
       macos-26 runner
       Xcode 26 (latest-stable)
       npm build + Capacitor sync
       patch plist / signing / pods
       register device (register-asc-device.mjs)
       xcodebuild archive  (automatic + API key)
       xcodebuild export   (automatic + API key, app-store-connect)
       upload TestFlight   (apple-actions/upload-testflight-build@v3)
  → App Store Connect → TestFlight → select build on version
```

---

## GitHub secrets (5 required)

Set at **repo** or **org** level. Org secrets must grant access to the target repo.

| Secret | Example (Echelon) | Notes |
|--------|-------------------|-------|
| `APPLE_TEAM_ID` | `4W6N6K8TQ9` | [developer.apple.com/account](https://developer.apple.com/account) → Membership |
| `APPSTORE_ISSUER_ID` | `28ac4946-339a-4837-9504-aaa5a981a137` | App Store Connect → Integrations → API → Issuer ID |
| `APPSTORE_KEY_ID` | `U38L5AUZ77` | Key ID of **Admin** team key |
| `APPSTORE_PRIVATE_KEY` | full `.p8` PEM | Include `BEGIN` / `END` lines; newlines matter |
| `CI_DEVICE_UDID` | `00008030-000945090102402E` | iPhone UDID from Finder (click serial until UDID shows) |

### Set secrets from Windows (after `gh auth login`)

```powershell
gh secret set APPSTORE_KEY_ID --body "YOUR_KEY_ID" --repo OWNER/REPO
gh secret set CI_DEVICE_UDID --body "00008030-000945090102402E" --repo OWNER/REPO
# For multiline .p8, use a here-string in PowerShell or paste via GitHub UI
gh secret set APPSTORE_PRIVATE_KEY --body (Get-Content -Raw "$HOME\Downloads\AuthKey_XXX.p8") --repo OWNER/REPO
```

### Trigger a build from CLI

```powershell
gh workflow run "iOS App Store build" --ref main --repo OWNER/REPO
gh run watch --repo OWNER/REPO
```

---

## Repo files (copy to new apps)

| File | Role |
|------|------|
| `.github/workflows/ios-appstore.yml` | Main CI pipeline |
| `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` | Required or archive fails in ~30s |
| `scripts/patch-ios-signing.mjs` | Injects `DEVELOPMENT_TEAM`; clears Release identity for automatic signing |
| `scripts/patch-pods-signing.mjs` | `CODE_SIGNING_ALLOWED=NO` on all Pod targets |
| `scripts/patch-ios-plist.mjs` | Permission strings for App Store review |
| `scripts/patch-ios-icon.mjs` | Copies `public/icons/icon-1024.png` into `AppIcon.appiconset` |
| `scripts/register-asc-device.mjs` | Registers `CI_DEVICE_UDID` via App Store Connect API |
| `scripts/ios-inject-appstore-meta.mjs` | App Store distribution meta in web build |
| `scripts/cap-sync-ios.mjs` | Capacitor sync wrapper |
| `ios/App/Podfile` | CocoaPods; includes signing-off hooks for CI |
| `capacitor.config.ts` | Loads live web app URL in native shell |
| `store-listing/BUILD-FREE.md` | Short operator guide |
| `scripts/setup-github-ios-build.ps1` | Opens Apple/GitHub pages, lists secret names |

---

## One-time setup for a **new** app

1. **Apple Developer**
   - Create App ID (bundle ID, e.g. `com.company.app`)
   - Enable capabilities (Sign in with Apple, Push, etc.)
   - Register at least one iPhone UDID under Devices (or rely on `register-asc-device.mjs`)

2. **App Store Connect**
   - Create app record (name, bundle ID, SKU)
   - Create **Admin** API key → download `.p8` once
   - Copy Issuer ID + Key ID

3. **GitHub**
   - Push Capacitor iOS project (or run `npm run cap:sync:ios` locally once and commit `ios/`)
   - Add the 5 secrets above
   - Confirm workflow file uses `runs-on: macos-26` and `setup-xcode` with `latest-stable`

4. **Project config**
   - Set `PRODUCT_BUNDLE_IDENTIFIER` / `capacitor.config.ts` `appId` to match App ID
   - Set `APPLE_TEAM_ID` in secrets to match membership Team ID
   - Update `ExportOptions` / workflow only if bundle ID changes

5. **First successful run**
   - Actions → **iOS App Store build** → Run workflow
   - Expect ~3 minutes on `macos-26` (Echelon reference: run succeeded in ~2m46s)
   - TestFlight processing: 5–30 extra minutes

---

## Every deploy (Echelon)

1. Commit and push to `main` (or branch you build from).
2. https://github.com/Echelon-RSVP/echelon/actions → **iOS App Store build** → **Run workflow**.
3. Wait for green check (archive → export → TestFlight → artifact).
4. App Store Connect → **TestFlight** → wait for processing.
5. App version → **Build** → **+** → select build → submit for review.

Optional local sanity check before push:

```powershell
npm run build
npm run ios:prepare
npm run cap:sync:ios
```

---

## Echelon reference values

| Item | Value |
|------|-------|
| GitHub repo | https://github.com/Echelon-RSVP/echelon |
| Bundle ID | `rsvp.echelon.app` |
| App Store Connect app | Echelon RSVP |
| Team | FORTUNE COMET, UNIPESSOAL, LDA |
| Workflow name | `iOS App Store build` |
| Live web app URL | https://echelon.rsvp/app/ |
| First full green run | 2026-06-05, [actions run 27037917700](https://github.com/Echelon-RSVP/echelon/actions/runs/27037917700) |

---

## Troubleshooting (symptom → fix)

| Symptom | Fix |
|---------|-----|
| Exit **65**, fast fail | Missing `App.xcscheme` or signing conflict. Use latest `patch-ios-signing.mjs`; no CLI `CODE_SIGN_IDENTITY`. |
| `no devices` / Development profile | Set `CI_DEVICE_UDID` or register device in Developer portal. |
| `maximum number of certificates` / revoke | CI created too many dev certs. Workflow runs `prune-ios-certificates.mjs` before archive; or revoke extras in [Certificates](https://developer.apple.com/account/resources/certificates/list). |
| `Cloud signing permission error` on export | API key must be **Admin**. |
| `conflicting provisioning settings` (Pods) | Do not pass global signing identity; run `patch-pods-signing.mjs` after `pod install`. |
| `iOS 26 SDK` / Xcode 26 required on upload | Use `macos-26`, not `macos-15`. |
| Secret empty in workflow | Org secret → Repository access must include the repo. |
| Invalid `.p8` | Paste full PEM with headers; check newlines in GitHub secret UI. |
| **Missing Compliance** (TestFlight) | App uses only HTTPS/TLS (exempt). `patch-ios-plist.mjs` sets `ITSAppUsesNonExemptEncryption=false`. Fix current build in ASC: TestFlight → build → Manage Export Compliance → uses encryption, qualifies for exemption. |

---

## Security

- Never commit `.p8`, `.p12`, or `.mobileprovision` (see `.gitignore`).
- Rotate API keys if a private key was exposed in chat, email, or logs.
- Revoke old keys (e.g. App Manager key) after Admin key works.
- `APPSTORE_PRIVATE_KEY` in GitHub secrets is sufficient; no cert files in the repo.

---

## Cost

| Item | Cost |
|------|------|
| GitHub Actions (public repo) | Free (macOS minutes still count toward fair use) |
| Apple Developer Program | $99/year |
| Mac / Codemagic | Not required |

Support: hi@echelon.rsvp
