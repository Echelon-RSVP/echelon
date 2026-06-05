# Free iOS build from Windows (GitHub Actions)

Codemagic is **not required**. Use **GitHub Actions** (free on public repos, or included minutes on private repos).

You need a **free GitHub account** and your **$99/year Apple Developer** membership. No Mac, no paid CI.

## One-time setup (~20 minutes)

### 1. Push this project to GitHub

```powershell
cd "C:\Users\migue\OneDrive\Documentos\echelon"
git init
git add .
git commit -m "Echelon iOS App Store"
git branch -M main
```

This project lives at **https://github.com/Echelon-RSVP/echelon** (public = unlimited free Actions minutes).

```powershell
git remote add origin https://github.com/Echelon-RSVP/echelon.git
git push -u origin main
```

Tip: a **public** repo avoids burning through private-repo macOS minute quotas. Organization secrets are already set on **Echelon-RSVP** (see `store-listing/organization-github-profile.txt`).

### 2. Create App Store Connect API key (browser)

1. https://appstoreconnect.apple.com → **Users and Access** → **Integrations** → **App Store Connect API**
2. **+** → Name: `GitHub Actions` → Access: **App Manager**
3. Download the `.p8` file once
4. Copy **Issuer ID** and **Key ID**

### 3. Find your Team ID

https://developer.apple.com/account → **Membership** → **Team ID** (10 characters, e.g. `AB12CD34EF`)

### 4. Add 4 GitHub secrets

Add secrets at **organization** level (already done for Echelon-RSVP) or per repo:

https://github.com/organizations/Echelon-RSVP/settings/secrets/actions

| Secret name | Value |
|-------------|-------|
| `APPLE_TEAM_ID` | Your 10-character Team ID |
| `APPSTORE_ISSUER_ID` | Issuer ID from App Store Connect |
| `APPSTORE_KEY_ID` | Key ID from the API key |
| `APPSTORE_PRIVATE_KEY` | Full contents of the `.p8` file (including `BEGIN` / `END` lines) |

No certificate files. No Codemagic. Xcode automatic signing creates the profile in the cloud.

### 5. Apple Developer portal checklist

- App ID **rsvp.echelon.app** exists
- **Sign in with Apple** enabled on that App ID (if you use Apple login)
- App record created in App Store Connect

## Build (every time, from Windows)

1. https://github.com/Echelon-RSVP/echelon → **Actions**
2. **iOS App Store build** → **Run workflow** → **Run workflow**
3. Wait ~12–20 minutes
4. Build appears in App Store Connect → **TestFlight** (processing may take 5–30 min more)
5. Version page → **Build** → **+** → select the build

You can also download the IPA from the workflow **Artifacts** tab.

## Local prep before pushing (optional)

```powershell
npm run build
npm run ios:prepare
npm run cap:sync:ios
```

## Helper script

Prints secret names and opens the right pages:

```powershell
.\scripts\setup-github-ios-build.ps1
```

## Cost

| Service | Cost |
|---------|------|
| GitHub Actions (public repo) | **Free** |
| GitHub Actions (private repo) | Free tier minutes (macOS counts 10×) |
| Apple Developer Program | **$99/year** (required by Apple for App Store) |
| Codemagic | Not needed |

## Troubleshooting

| Error | Fix |
|-------|-----|
| Exit code **65** (~30s fail) | Usually missing Xcode scheme. Re-run on latest `main` (includes shared `App.xcscheme`). |
| Exit code **70** at `GatherProvisioningInputs` | Archive needs App Store Connect API key on the `xcodebuild archive` command. Confirm API key role is **App Manager** or **Admin**, bundle ID `rsvp.echelon.app` exists in [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list). |
| `conflicting provisioning settings` on Capacitor/Pods | Do not pass global `CODE_SIGN_IDENTITY` to xcodebuild. Pods must have `CODE_SIGNING_ALLOWED=NO` (handled in `Podfile` + `patch-pods-signing.mjs`). |
| `no devices` / `iOS App Development provisioning profiles` | Automatic Release archive + API key should create an App Store profile. Ensure bundle ID `rsvp.echelon.app` exists in Apple Developer → Identifiers. |
| Secret is empty | Org secrets must grant access to **echelon** repo: Organization → Settings → Secrets → each secret → Repository access |
| `No signing certificate` | Check `APPLE_TEAM_ID` and that bundle ID `rsvp.echelon.app` is registered |
| API key rejected | Paste full `.p8` into `APPSTORE_PRIVATE_KEY`, including `BEGIN` / `END` lines |
| `pod install` failed | Re-run workflow; rare CocoaPods CDN glitch |
| Blank app in TestFlight | Confirm https://echelon.rsvp/app/ loads on iPhone Safari |

Support: hi@echelon.rsvp
