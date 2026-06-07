/**
 * Creates/syncs the iOS Capacitor project. Intended for cloud Mac CI (Codemagic / GitHub Actions).
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const iosDir = path.join("ios");
if (!fs.existsSync(iosDir)) {
  console.log("cap-sync-ios: adding iOS platform...");
  execSync("npx cap add ios", { stdio: "inherit" });
}
console.log("cap-sync-ios: patching GoogleSignIn for ITMS-91061...");
execSync("node scripts/patch-google-signin-privacy.mjs", { stdio: "inherit" });
console.log("cap-sync-ios: syncing...");
execSync("npx cap sync ios", { stdio: "inherit" });
