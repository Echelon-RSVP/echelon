/**
 * CI signing for App Store archive:
 * - DEVELOPMENT_TEAM on App target
 * - Apple Distribution on Release only (in pbxproj, not xcodebuild CLI)
 * - Pods are unsigned separately (patch-pods-signing.mjs)
 */
import fs from "fs";
import path from "path";

const team = (process.env.APPLE_TEAM_ID || "").trim();
const pbx = path.join("ios", "App", "App.xcodeproj", "project.pbxproj");
const distLine = 'CODE_SIGN_IDENTITY = "Apple Distribution";';

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

// Project Release config: iPhone Developer forces development profiles on archive.
text = text.replace(
  /(504EC3151FED79650016851F \/\* Release \*\/[\s\S]*?)CODE_SIGN_IDENTITY = "iPhone Developer";/,
  `$1${distLine}`,
);

// App target Release only (not Debug, not pods).
if (!text.match(/504EC318[\s\S]*?CODE_SIGN_IDENTITY = "Apple Distribution"/)) {
  text = text.replace(
    /(504EC3181FED79650016851F \/\* Release \*\/[\s\S]*?CODE_SIGN_STYLE = Automatic;\n)/,
    `$1\t\t\t\t${distLine}\n`,
  );
}

fs.writeFileSync(pbx, text);
console.log(`patch-ios-signing: team=${team}, Release=Apple Distribution (App target + project Release)`);
