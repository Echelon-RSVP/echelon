/** Seed test@test.com / @test / password: test */
import { readFileSync } from "fs";
import { join } from "path";

const DOMAIN = "https://echelon.rsvp";
const cfgText = readFileSync(join(process.cwd(), "api", "config.local.php"), "utf8");
const keyMatch = cfgText.match(/'install_key'\s*=>\s*'([^']+)'/);
const key = keyMatch?.[1];
if (!key) {
  console.error("install_key not found");
  process.exit(1);
}

const url = `${DOMAIN}/api/seed-test-user.php?key=${encodeURIComponent(key)}`;
const res = await fetch(url);
const json = await res.json();
console.log(JSON.stringify(json, null, 2));
if (!res.ok || json.error) process.exit(1);
