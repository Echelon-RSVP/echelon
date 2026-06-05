/**
 * Gmail sign-in needs a Google OAuth Web Client ID (NOT the Gemini API key).
 * Run: node setup-google-oauth.mjs
 */
console.log(`
Gmail sign-in setup for echelon.rsvp
====================================

1. Open Google Cloud Console → Credentials:
   https://console.cloud.google.com/apis/credentials

2. Create OAuth 2.0 Client ID → Web application

3. Authorized JavaScript origins:
   https://echelon.rsvp

4. Authorized redirect URIs:
   https://echelon.rsvp/app/

5. Copy the Client ID (ends with .apps.googleusercontent.com)

6. Add to api/config.local.php:
   'google_client_id' => 'YOUR_ID.apps.googleusercontent.com',

7. Deploy API:
   node deploy-api.mjs

Then hard-refresh https://echelon.rsvp/app/
`);
