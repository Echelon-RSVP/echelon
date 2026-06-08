/** Seed 100 world test profiles on production. */
import { readFileSync } from "fs";
import { join } from "path";

const DOMAIN = "https://echelon.rsvp";
const cfgText = readFileSync(join(process.cwd(), "api", "config.local.php"), "utf8");
const keyMatch = cfgText.match(/'install_key'\s*=>\s*'([^']+)'/);
const key = keyMatch?.[1];
if (!key) {
  console.error("install_key not found in api/config.local.php");
  process.exit(1);
}

const url = `${DOMAIN}/api/seed-world-profiles.php?key=${encodeURIComponent(key)}`;
const res = await fetch(url);
const json = await res.json();
console.log(JSON.stringify(json, null, 2));
if (!res.ok || json.error) process.exit(1);
