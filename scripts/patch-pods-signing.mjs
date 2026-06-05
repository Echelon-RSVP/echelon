/**
 * Disable code signing on CocoaPods targets (required for Capacitor CI archives).
 * Run after `pod install`.
 */
import fs from "fs";
import path from "path";

const pbx = path.join("ios", "App", "Pods", "Pods.xcodeproj", "project.pbxproj");
const team = (process.env.APPLE_TEAM_ID || "").trim();

if (!fs.existsSync(pbx)) {
  console.warn("patch-pods-signing: Pods project not found. Run pod install first.");
  process.exit(0);
}

let text = fs.readFileSync(pbx, "utf8");
const teamLine = team ? `DEVELOPMENT_TEAM = ${team};` : "";

// Insert signing-off flags into every Pods build configuration block.
text = text.replace(
  /(isa = XCBuildConfiguration;\n\t\t\tbaseConfigurationReference = [^\n]+\n\t\t\tbuildSettings = \{\n)/g,
  (match) => {
    if (match.includes("CODE_SIGNING_ALLOWED")) return match;
    let extra = "\t\t\t\tCODE_SIGNING_ALLOWED = NO;\n\t\t\t\tCODE_SIGNING_REQUIRED = NO;\n";
    if (teamLine) extra += `\t\t\t\t${teamLine}\n`;
    return match + extra;
  },
);

fs.writeFileSync(pbx, text);
console.log("patch-pods-signing: disabled code signing on CocoaPods targets");
