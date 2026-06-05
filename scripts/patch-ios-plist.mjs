/**
 * Adds required iOS permission strings after `npx cap sync ios`.
 * Run on the cloud Mac (Codemagic / GitHub Actions), not on Windows.
 */
import fs from "fs";
import path from "path";

const plistPath = path.join("ios", "App", "App", "Info.plist");
if (!fs.existsSync(plistPath)) {
  console.warn("patch-ios-plist: ios/App/App/Info.plist not found yet. Run cap sync first.");
  process.exit(0);
}

// Standard HTTPS/TLS only (no proprietary crypto). Skips export compliance prompts per build.
const booleans = {
  ITSAppUsesNonExemptEncryption: false,
};

const entries = {
  NSCameraUsageDescription:
    "Echelon uses the camera for photos, videos, stories, and chat.",
  NSMicrophoneUsageDescription:
    "Echelon uses the microphone for voice messages, video, and calls.",
  NSPhotoLibraryUsageDescription:
    "Echelon lets you pick photos and videos from your library.",
  NSPhotoLibraryAddUsageDescription:
    "Echelon can save photos you create in the app.",
  NSLocationWhenInUseUsageDescription:
    "Echelon uses your location for nearby discovery on the map.",
};

let xml = fs.readFileSync(plistPath, "utf8");

for (const [key, value] of Object.entries(booleans)) {
  const boolTag = value ? "<true/>" : "<false/>";
  const block = `  <key>${key}</key>\n  ${boolTag}\n`;
  if (xml.includes(`<key>${key}</key>`)) {
    xml = xml.replace(
      new RegExp(`<key>${key}</key>\\s*<(?:true|false)\\/>`, "m"),
      block.trimEnd(),
    );
  } else {
    xml = xml.replace("</dict>\n</plist>", `${block}</dict>\n</plist>`);
  }
}

for (const [key, value] of Object.entries(entries)) {
  if (xml.includes(`<key>${key}</key>`)) continue;
  const block = `  <key>${key}</key>\n  <string>${value}</string>\n`;
  xml = xml.replace("</dict>\n</plist>", `${block}</dict>\n</plist>`);
}

fs.writeFileSync(plistPath, xml);
console.log("patch-ios-plist: permissions + export compliance (ITSAppUsesNonExemptEncryption=false) applied.");
