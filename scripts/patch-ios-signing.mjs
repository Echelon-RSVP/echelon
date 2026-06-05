/**
 * Inject DEVELOPMENT_TEAM + App Store distribution signing for CI archives.
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
const distLine = 'CODE_SIGN_IDENTITY = "Apple Distribution";';

if (text.includes("DEVELOPMENT_TEAM")) {
  text = text.replace(/DEVELOPMENT_TEAM = [^;]+;/g, teamLine);
} else {
  text = text.replace(
    /(CODE_SIGN_STYLE = Automatic;\n)/g,
    `$1\t\t\t\t${teamLine}\n`,
  );
}

// Project-level Release must not force "iPhone Developer" during archive.
text = text.replace(
  /CODE_SIGN_IDENTITY = "iPhone Developer";/g,
  distLine,
);

// App target Release: App Store archive needs distribution profile (no registered devices).
if (!text.includes('504EC3181FED79650016851F /* Release */')) {
  console.warn("patch-ios-signing: Release target block not found.");
} else if (!text.match(/504EC318[\s\S]*?CODE_SIGN_IDENTITY = "Apple Distribution"/)) {
  text = text.replace(
    /(504EC3181FED79650016851F \/\* Release \*\/ = \{[\s\S]*?CODE_SIGN_STYLE = Automatic;\n)/,
    `$1\t\t\t\t${distLine}\n`,
  );
}

fs.writeFileSync(pbx, text);
console.log(`patch-ios-signing: DEVELOPMENT_TEAM = ${team}, Release = Apple Distribution`);
