/**
 * Apple Sign In setup for Echelon iOS + web.
 * Run: node setup-apple-signin.mjs
 */
console.log(`
Apple Sign In setup for Echelon
===============================

SERVER (required — fixes missing Apple button)
----------------------------------------------
1. On production server, edit api/config.local.php:

   'apple_client_id' => 'rsvp.echelon.app',
   'apple_redirect_uri' => 'https://echelon.rsvp/app/',

2. Deploy API:
   node deploy-api.mjs

3. Verify:
   https://echelon.rsvp/api/v1/auth/config
   should include "apple" in methods and appleClientId.

APPLE DEVELOPER (one-time)
--------------------------
1. https://developer.apple.com/account → Identifiers
2. App ID rsvp.echelon.app → enable Sign in with Apple
3. Create a Services ID (for web Safari login) if you use Apple JS on the web:
   - Identifier: e.g. rsvp.echelon.app.web
   - Domains: echelon.rsvp
   - Return URL: https://echelon.rsvp/app/
   For the native iOS app, the bundle ID rsvp.echelon.app is the client ID.

GOOGLE GMAIL ON iOS (TestFlight / App Store)
--------------------------------------------
Google blocks sign-in inside embedded WebViews. The iOS app uses native Google Sign-In.

1. Google Cloud Console → Credentials → Create OAuth Client ID → iOS
   - Bundle ID: rsvp.echelon.app
2. Copy the iOS URL scheme (reversed client ID, e.g. com.googleusercontent.apps.123456)
3. Add GitHub secrets (repo → Settings → Secrets):
   GOOGLE_IOS_CLIENT_ID = the iOS OAuth client ID (....apps.googleusercontent.com)
   GOOGLE_IOS_URL_SCHEME = the reversed client ID (e.g. com.googleusercontent.apps.123456-abc)
4. On the server, set in api/config.local.php:
   'google_ios_client_id' => 'SAME_IOS_CLIENT_ID',
5. Re-run the iOS App Store build workflow.

After server + Apple + new build:
- Sign in with Apple button appears on login
- Opening the TestFlight app prompts Apple sign-in automatically
- Gmail uses native Google picker (after GOOGLE_IOS_URL_SCHEME secret is set)
`);
