# Get a build into App Store Connect (from Windows)

The **Build** section stays empty until an **IPA** is uploaded.

## Recommended: GitHub Actions (free)

See **`store-listing/BUILD-FREE.md`** for the full guide.

Quick version:

1. Push repo to GitHub (public repo = free unlimited Actions)
2. Add 4 secrets: `APPLE_TEAM_ID`, `APPSTORE_ISSUER_ID`, `APPSTORE_KEY_ID`, `APPSTORE_PRIVATE_KEY`
3. **Actions** → **iOS App Store build** → **Run workflow**
4. Pick the build in App Store Connect → **TestFlight** → version **Build** section

```powershell
.\scripts\setup-github-ios-build.ps1
```

## Paid alternative

Codemagic (`codemagic.yaml`) works but is not free. Use only if you prefer their UI.

## Local prep (already done once)

```powershell
npm run build && npm run ios:prepare && npm run cap:sync:ios
```

Web-only updates later: `npm run deploy:app` (no new IPA needed).
