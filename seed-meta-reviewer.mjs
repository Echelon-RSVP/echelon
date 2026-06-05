/**
 * Seed Meta App Review test account on production.
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

const url = `${DOMAIN}/api/seed-meta-reviewer.php?key=${encodeURIComponent(key)}`;
console.log("Seeding Meta reviewer account…");
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

console.log("\nTest credentials:");
console.log("  Email:", json.email || "meta.reviewer@echelon.rsvp");
console.log("  Password: EchelonMeta2026!");
console.log("  App:", json.loginUrl || `${DOMAIN}/app/`);
