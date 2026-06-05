/**
 * Prepare Meta / Instagram App Review testing.
 * - Echelon integration uses Instagram Login with messaging + comments scopes.
 * - Dashboard permissions like pages_read_engagement require separate Graph API Explorer tests.
 */
const API = "https://echelon.rsvp/api/v1";
const APP = "https://echelon.rsvp/app/";
const EMAIL = "meta.reviewer@echelon.rsvp";
const PASS = "EchelonMeta2026!";
const FB_APP_ID = "4273823969497618";

async function main() {
  console.log("=== Echelon Meta testing initiation ===\n");

  const loginRes = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  const login = await loginRes.json();
  if (!loginRes.ok || !login.token) {
    console.error("Login failed:", login);
    process.exit(1);
  }
  console.log("✓ Logged in as", login.user?.name, login.user?.handle);

  const igRes = await fetch(`${API}/instagram/auth`, {
    headers: { Authorization: `Bearer ${login.token}` },
  });
  const ig = await igRes.json();
  if (!igRes.ok || !ig.url) {
    console.error("Instagram auth URL failed:", ig);
    process.exit(1);
  }

  const connected = !!login.user?.instagram?.verified;
  console.log("Instagram connected:", connected ? "yes" : "no");
  console.log("\n--- META DASHBOARD SETUP ---");
  console.log("1. Permissions: click Add all required permissions in Meta dashboard");
  console.log("2. Add account: Roles → Instagram Testers → Add account");
  console.log("3. Webhooks:");
  console.log("   Callback URL: https://echelon.rsvp/api/v1/instagram/webhook");
  console.log("   Verify token: echelon_ig_webhook_2026");
  console.log("   → Verify and save");

  console.log("\n--- PRIMARY TEST (what Echelon uses) ---");
  console.log("Permissions: instagram_business_basic");
  console.log("Steps:");
  console.log("  1. Open", APP);
  console.log("  2. Sign in:", EMAIL);
  console.log("  3. Me tab → Connect Instagram (or open OAuth URL below)");
  console.log("  4. Use an Instagram Professional account added as Instagram Tester");
  console.log("  5. Approve → app calls graph.instagram.com/me + /me/media");
  console.log("\nOAuth URL (valid ~15 min):\n");
  console.log(ig.url);

  if (connected) {
    const syncRes = await fetch(`${API}/instagram/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${login.token}` },
    });
    const sync = await syncRes.json();
    console.log("\n✓ Instagram sync API call:", syncRes.ok ? `ok (${sync.synced ?? 0} posts)` : sync);
  }

  console.log("\n--- DASHBOARD PERMISSIONS (pages_read_engagement, etc.) ---");
  console.log("Echelon does NOT use Facebook Login or these Page permissions.");
  console.log("They appear because the Meta use case bundle includes them.");
  console.log("To mark them as tested, use Graph API Explorer (once, as app admin):\n");
  console.log("  https://developers.facebook.com/tools/explorer/");
  console.log(`  App: Echelon (${FB_APP_ID})`);
  console.log("  Add permissions: public_profile, pages_show_list, pages_read_engagement, business_management");
  console.log("  Generate User Access Token → log in with Facebook admin account");
  console.log("  Run these calls:");
  console.log("    GET /me?fields=id,name");
  console.log("    GET /me/accounts");
  console.log("    GET /{page-id}?fields=name,fan_count,engagement");
  console.log("    GET /me/businesses");
  console.log("\nOr remove unused permissions and submit only instagram_business_basic.\n");

  return ig.url;
}

const url = await main();
if (process.argv.includes("--open") && url) {
  const { exec } = await import("child_process");
  exec(`start "" "${url}"`);
  console.log("Opened OAuth URL in default browser.");
}
