/**
 * CI signing for App Store archive:
 * - DEVELOPMENT_TEAM on App target
 * - Drop inherited "iPhone Developer" from project Release (automatic signing picks distribution)
 * - Pods are unsigned separately (patch-pods-signing.mjs)
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

// Project Release: inherited iPhone Developer forces dev profiles; automatic signing sets identity.
text = text.replace(
  /(504EC3151FED79650016851F \/\* Release \*\/[\s\S]*?)\t\t\t\tCODE_SIGN_IDENTITY = "iPhone Developer";\n/,
  "$1",
);

// App target Release: never pin CODE_SIGN_IDENTITY (conflicts with automatic signing).
text = text.replace(
  /(504EC3181FED79650016851F \/\* Release \*\/[\s\S]*?)\t\t\t\tCODE_SIGN_IDENTITY = "[^"]*";\n/g,
  "$1",
);

fs.writeFileSync(pbx, text);
console.log(`patch-ios-signing: team=${team}, Release identity cleared for automatic signing`);
