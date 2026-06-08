/**
 * Run production SQL migrations via HTTP (uses install_key from api/config.local.php).
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

const migrations = [
  "migrate-auth.php",
  "migrate-friends-instagram.php",
  "migrate-presence.php",
  "migrate-chat-replies.php",
  "migrate-chat-inbox.php",
  "migrate-chat-typing.php",
  "migrate-stories.php",
  "migrate-spark.php",
  "migrate-spark-pass-count.php",
  "migrate-party-events.php",
  "migrate-profile-spark.php",
  "migrate-social-features.php",
  "migrate-post-overlays.php",
  "migrate-post-likes.php",
  "migrate-party-extras.php",
  "migrate-rating-engine.php",
];

for (const file of migrations) {
  const url = `${DOMAIN}/api/${file}?key=${encodeURIComponent(key)}`;
  console.log("Running", file, "…");
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
  if (!res.ok || json.error) {
    process.exit(1);
  }
}

console.log("All migrations applied.");
