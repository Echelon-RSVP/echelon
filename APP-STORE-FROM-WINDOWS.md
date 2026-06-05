# Publish Echelon on the App Store from Windows (no Mac)

You do **not** need to buy a Mac or pay for Codemagic. Apple still requires an iOS build signed on macOS, but that happens for **free** on **GitHub Actions** (cloud Mac). See **`store-listing/BUILD-FREE.md`** first.

## What is already done in this repo

| Item | Location |
|------|----------|
| iOS shell config (loads live app) | `capacitor.config.ts` |
| **Free** cloud Mac build (GitHub Actions) | `.github/workflows/ios-appstore.yml` + `store-listing/BUILD-FREE.md` |
| Optional paid CI (Codemagic) | `codemagic.yaml` |
| App Store copy (description, keywords) | `store-listing/en-US/` |
| URLs, bundle ID, review notes | `store-listing/` |
| App icon 1024 | `public/icons/icon-1024.png` |
| iOS permission patcher | `scripts/patch-ios-plist.mjs` |
| App Store web meta injector | `scripts/ios-inject-appstore-meta.mjs` |
| Windows prep script | `scripts/prepare-appstore.ps1` |

## What you still must do (Apple rules, cannot be automated)

1. Pay **$99/year** for [Apple Developer Program](https://developer.apple.com/programs/) (browser on Windows is fine).
2. Create the app in [App Store Connect](https://appstoreconnect.apple.com) (browser on Windows).
3. Push to **GitHub** and add **4 Actions secrets** (see `BUILD-FREE.md`).
4. Upload **screenshots** (checklist in `store-listing/screenshot-checklist.txt`).
5. Paste **demo login** into review notes before submit.

---

## Path A: GitHub Actions (free, recommended)

See **`store-listing/BUILD-FREE.md`** for step-by-step instructions.

Summary:

1. Push repo to GitHub (public repo recommended for free unlimited minutes).
2. App Store Connect → create API key → add 4 secrets to GitHub.
3. Actions → **iOS App Store build** → **Run workflow**.
4. TestFlight → select build in App Store Connect.

```powershell
.\scripts\setup-github-ios-build.ps1
```

---

## Path B: Codemagic (paid, optional)

### Step 1: Apple Developer enrollment
1. Open https://developer.apple.com/programs/ in Edge/Chrome.
2. Enroll as Individual or Organization ($99/year).
3. Wait for approval email.

### Step 2: App Store Connect app record
1. Open https://appstoreconnect.apple.com
2. **Apps** → **+** → **New App**
3. Platform: **iOS**
4. Name: **Echelon**
5. Bundle ID: **rsvp.echelon.app** (create under Certificates, Identifiers & Profiles → Identifiers if missing)
6. SKU: **echelon-ios-001**
7. Copy text from `store-listing/en-US/*.txt` into the listing fields.
8. Privacy Policy: `https://echelon.rsvp/app/docs.html#privacy`
9. Support URL: `https://echelon.rsvp/app/`

### Step 3: App Store Connect API key (for uploads)
1. App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API**
2. **+** → Name: `Codemagic` → Access: **App Manager**
3. Download the `.p8` file once (you cannot download it again).
4. Note **Issuer ID** and **Key ID**.

### Step 4: Push code to GitHub
```powershell
cd "C:\Users\migue\OneDrive\Documentos\echelon"
git init
git add .
git commit -m "Add iOS App Store cloud build"
git branch -M main
git remote add origin https://github.com/YOUR_USER/echelon.git
git push -u origin main
```

### Step 5: Codemagic setup
1. https://codemagic.io → Sign up with GitHub.
2. **Add application** → select your `echelon` repo.
3. Codemagic detects `codemagic.yaml` automatically.
4. **Team settings** → **codemagic.yaml settings** → enable.
5. **App settings** → **Distribution** → **iOS code signing**:
   - Connect Apple Developer account (follow Codemagic wizard), or
   - Upload distribution certificate + provisioning profile.
6. **App Store Connect** integration: paste Issuer ID, Key ID, upload `.p8`.
7. Edit `codemagic.yaml` line `APP_STORE_APP_ID: 0000000000` → your numeric App Store Connect app ID (Apps → App Information → Apple ID).

### Step 6: Build from Windows
1. In Codemagic, click **Start new build** → workflow **Echelon iOS App Store**.
2. Wait ~15–25 minutes.
3. IPA uploads to **TestFlight** automatically.

### Step 7: TestFlight (browser)
1. App Store Connect → your app → **TestFlight**.
2. Add yourself as internal tester.
3. Install **TestFlight** on iPhone → open Echelon build → test login, camera, chat.

### Step 8: Submit for App Review
1. App Store Connect → **App Store** tab → **Prepare for Submission**.
2. Upload screenshots (see checklist).
3. Paste `store-listing/en-US/review_notes.txt` (add demo password).
4. **Age Rating** questionnaire: answer honestly (social networking, UGC, location).
5. **App Privacy** labels: email, user content, location, identifiers.
6. Select the TestFlight build → **Add for Review**.

Review usually takes 1–3 days.

---

---


## Windows prep (one command)

```powershell
cd "C:\Users\migue\OneDrive\Documentos\echelon"
.\scripts\prepare-appstore.ps1
```

This installs npm dependencies including Capacitor and verifies store-listing files.

---

## After approval

- Choose **manual** or **automatic** release in App Store Connect.
- Web updates still deploy with `npm run deploy:app` (the iOS shell loads `https://echelon.rsvp/app/`).
- Submit a new native build only when you change permissions, bundle ID, or native shell behavior.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Sign in with Apple rejected | Enable **Sign In with Apple** on App ID `rsvp.echelon.app` in Developer portal |
| Camera/mic not working in TestFlight | Rebuild after `patch-ios-plist.mjs` runs in CI |
| Blank white screen | Confirm `https://echelon.rsvp/app/` loads in Safari on iPhone |
| Build fails on Capacitor | Ensure `npm run build` succeeds before `cap sync` in CI |

Support: hi@echelon.rsvp
