/**
 * Inject DEVELOPMENT_TEAM into the Capacitor Xcode project for CI automatic signing.
 * Set APPLE_TEAM_ID in the environment (GitHub secret).
 */
import fs from "fs";
import path from "path";

const team = (process.env.APPLE_TEAM_ID || "").trim();
const pbx = path.join("ios", "App", "App.xcodeproj", "project.pbxproj");

if (!fs.existsSync(pbx)) {
  console.warn("patch-ios-signing: project.pbxproj not found. Run cap sync first.");
  process.exit(0);
}

if (!team) {
  console.warn("patch-ios-signing: APPLE_TEAM_ID not set, skipping.");
  process.exit(0);
}

let text = fs.readFileSync(pbx, "utf8");

const teamLine = `DEVELOPMENT_TEAM = ${team};`;
if (text.includes("DEVELOPMENT_TEAM")) {
  text = text.replace(/DEVELOPMENT_TEAM = [^;]+;/g, teamLine);
} else {
  text = text.replace(
    /(CODE_SIGN_STYLE = Automatic;\n)/g,
    `$1\t\t\t\t${teamLine}\n`,
  );
}

// Release archive needs distribution identity (not "iPhone Developer" at project level).
text = text.replace(
  /CODE_SIGN_IDENTITY = "iPhone Developer";/g,
  'CODE_SIGN_IDENTITY = "Apple Distribution";',
);

fs.writeFileSync(pbx, text);
console.log(`patch-ios-signing: DEVELOPMENT_TEAM = ${team}, distribution signing`);
