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
| **Prune orphan certs before every archive** | Each CI run with automatic signing can create a new iOS Development certificate. Apple caps the account at ~3 certs. Without pruning, archive fails in ~50s with "maximum number of certificates". See [Certificate pruning](#certificate-pruning-required) below. |
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
       prune orphan certs (prune-ios-certificates.mjs)   ← required
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
| `scripts/patch-google-signin-privacy.mjs` | Forces GoogleSignIn 7.1+ (PrivacyInfo.xcprivacy, fixes ITMS-91061) |
| `scripts/register-asc-device.mjs` | Registers `CI_DEVICE_UDID` via App Store Connect API |
| `scripts/prune-ios-certificates.mjs` | **Revokes orphan dev certs before archive** (prevents Apple cert quota failures) |
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
   - Expect ~3–5 minutes on `macos-26` (Echelon reference: ~4m after cert pruning)
   - TestFlight processing: 5–30 extra minutes

6. **Certificate pruning (do not skip on new apps)**
   - Copy `scripts/prune-ios-certificates.mjs` into the new repo
   - Add the workflow step from Echelon (see [Certificate pruning](#certificate-pruning-required))
   - Confirm `patch-ios-signing.mjs` clears `iPhone Developer` on Release builds

---

## Certificate pruning (required)

### The problem

GitHub Actions + Xcode **automatic signing** creates a fresh **iOS Development** certificate when it cannot reuse an existing one. Failed or cancelled runs, rapid re-triggers, and `concurrency: cancel-in-progress` can leave **orphan dev certs** on your Apple Developer account.

Apple allows only a **small number of active certificates** per team (typically 3). Once the quota is full, archive fails fast (~50s, exit code 65) with messages like:

```
error: Choose a certificate to revoke. Your account has reached the maximum number of certificates.
error: No profiles for 'com.your.bundle' were found: Xcode couldn't find any iOS App Development provisioning profiles
```

You do **not** need a Mac to fix this. The prune script uses the same **Admin** App Store Connect API key you already have for export.

### The fix: `prune-ios-certificates.mjs`

The script runs **after** the API key is configured and **before** `xcodebuild archive`. It:

1. Lists all certificates via App Store Connect API (`GET /v1/certificates`)
2. **Revokes every iOS Development certificate** (orphans from past CI runs)
3. Keeps only the **newest** iOS Distribution certificate; revokes older duplicates
4. If 3+ certs still remain, keeps the 2 newest and revokes the rest
5. Revokes expired certs of any type

Safe to run on every build. Distribution signing for App Store export is unaffected.

### Workflow step (copy into `.github/workflows/ios-appstore.yml`)

Place this **after** "Configure App Store Connect API key" and **before** "Build archive":

```yaml
      - name: Prune orphan signing certificates
        env:
          APPSTORE_KEY_ID: ${{ secrets.APPSTORE_KEY_ID }}
          APPSTORE_ISSUER_ID: ${{ secrets.APPSTORE_ISSUER_ID }}
          APPSTORE_PRIVATE_KEY: ${{ secrets.APPSTORE_PRIVATE_KEY }}
          API_KEY_PATH: ${{ env.API_KEY_PATH }}
        run: node scripts/prune-ios-certificates.mjs
```

The script reads the key from either `API_KEY_PATH` (set by the configure step) or `APPSTORE_PRIVATE_KEY` inline. If secrets are missing, it logs a warning and skips (archive may then fail on a full account).

### Copy to a future app (checklist)

| Step | Action |
|------|--------|
| 1 | Copy `scripts/prune-ios-certificates.mjs` (no edits needed; uses standard ASC API) |
| 2 | Add the workflow step above in the same position |
| 3 | Ensure `patch-ios-signing.mjs` removes `CODE_SIGN_IDENTITY = "iPhone Developer"` from Release in `project.pbxproj` |
| 4 | Use the same 5 secrets (`APPSTORE_*` + `APPLE_TEAM_ID` + `CI_DEVICE_UDID`) |
| 5 | Trigger one build; confirm log line `prune-ios-certificates: revoked N, M certificate(s) remain` |
| 6 | Archive should pass in ~3–5 min |

### Run manually from Windows (one-off cleanup)

If builds are already failing and you want to clear certs before pushing the script:

```powershell
# Requires Node 18+, same secrets as CI (paste .p8 into env or point API_KEY_PATH)
$env:APPSTORE_KEY_ID = "YOUR_KEY_ID"
$env:APPSTORE_ISSUER_ID = "YOUR_ISSUER_ID"
$env:APPSTORE_PRIVATE_KEY = Get-Content -Raw "$HOME\Downloads\AuthKey_XXX.p8"
node scripts/prune-ios-certificates.mjs
```

Then re-run the workflow:

```powershell
gh workflow run "iOS App Store build" --ref main --repo OWNER/REPO
gh run watch --repo OWNER/REPO
```

### Manual fallback (browser)

If the API key cannot revoke certs (wrong role, expired key):

1. Open [developer.apple.com/account/resources/certificates/list](https://developer.apple.com/account/resources/certificates/list)
2. Revoke all **Apple Development** / **iOS Development** certificates you do not actively use on a physical Mac
3. Keep **one** **Apple Distribution** / **iOS Distribution** certificate
4. Re-run the workflow

### Prevent recurrence

| Practice | Why |
|----------|-----|
| Keep the prune step in CI | Frees slots before every archive |
| Avoid spamming workflow_dispatch | Each attempt can mint another dev cert before prune runs |
| `cancel-in-progress: true` is fine | Prune runs at the start of each new run; cancelled runs may still leave orphans until the next successful prune |
| Do not add `CODE_SIGN_IDENTITY` on Release | Forces dev profiles and extra cert churn; use `patch-ios-signing.mjs` |

### Echelon incident reference (June 2026)

| Item | Detail |
|------|--------|
| Symptom | 4 consecutive failures (~50s–1m37s), exit 65 |
| Cause | Orphan dev certs from repeated workflow triggers filled Apple quota |
| Fix commit | `4a3a945` (prune script + workflow step + Release signing patch) |
| First green run after fix | [actions run 27069274455](https://github.com/Echelon-RSVP/echelon/actions/runs/27069274455) (~4m21s) |

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
| Cert-quota fix + stable deploys | 2026-06-06, [actions run 27069274455](https://github.com/Echelon-RSVP/echelon/actions/runs/27069274455) |

---

## Troubleshooting (symptom → fix)

| Symptom | Fix |
|---------|-----|
| Exit **65**, fast fail (~30s) | Missing `App.xcscheme` or signing conflict. Use latest `patch-ios-signing.mjs`; no CLI `CODE_SIGN_IDENTITY`. |
| Exit **65**, fast fail (~50s) + `maximum number of certificates` | Cert quota full. Add/run `prune-ios-certificates.mjs` before archive ([section above](#certificate-pruning-required)). |
| `No profiles for '…' were found` + dev provisioning | Usually follows cert quota failure. Prune dev certs, then re-run. |
| `no devices` / Development profile | Set `CI_DEVICE_UDID` or register device in Developer portal. |
| `maximum number of certificates` / revoke (manual) | Revoke extras in [Certificates](https://developer.apple.com/account/resources/certificates/list), or run prune script locally with Admin API key. |
| `Cloud signing permission error` on export | API key must be **Admin**. |
| `conflicting provisioning settings` (Pods) | Do not pass global signing identity; run `patch-pods-signing.mjs` after `pod install`. |
| `iOS 26 SDK` / Xcode 26 required on upload | Use `macos-26`, not `macos-15`. |
| Secret empty in workflow | Org secret → Repository access must include the repo. |
| Invalid `.p8` | Paste full PEM with headers; check newlines in GitHub secret UI. |
| **Missing Compliance** (TestFlight) | App uses only HTTPS/TLS (exempt). `patch-ios-plist.mjs` sets `ITSAppUsesNonExemptEncryption=false`. Fix current build in ASC: TestFlight → build → Manage Export Compliance → uses encryption, qualifies for exemption. |
| **ITMS-91061** missing privacy manifest (GoogleSignIn, GTMAppAuth, GTMSessionFetcher) | `@codetrix-studio/capacitor-google-auth` pins GoogleSignIn 6.2.4 (no manifest). Run `patch-google-signin-privacy.mjs` before `pod install` (CI does this automatically). Requires GoogleSignIn **7.1+**. Upload a **new build** (bump `CURRENT_PROJECT_VERSION`), then resubmit. |

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
