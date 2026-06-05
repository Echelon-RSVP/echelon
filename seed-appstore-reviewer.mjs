/**
 * Seed Apple App Store review demo account on production.
 */
import { readFileSync } from "fs";
import { join } from "path";

const DOMAIN = "https://echelon.rsvp";
const cfgPath = join(process.cwd(), "api", "config.local.php");
const cfgText = readFileSync(cfgPath, "utf8");
const keyMatch = cfgText.match(/'install_key'\s*=>\s*'([^']+)'/);
const key = keyMatch?.[1];
if (!key) {
  console.error("install_key not found in api/config.local.php");
  process.exit(1);
}

const url = `${DOMAIN}/api/seed-appstore-reviewer.php?key=${encodeURIComponent(key)}`;
console.log("Seeding App Store review account…");
const res = await fetch(url);
const body = await res.text();
let json;
try {
  json = JSON.parse(body);
} catch {
  console.error("Non-JSON response:", body.slice(0, 500));
  process.exit(1);
}
console.log(JSON.stringify(json, null, 2));
if (!res.ok || json.error) process.exit(1);

console.log("\nApp Store Connect → App Review Information:");
console.log("  User name:", json.email || "review@echelon.rsvp");
console.log("  Password:", json.password || "EchelonReview2026!");
console.log("  App:", json.loginUrl || `${DOMAIN}/app/`);
