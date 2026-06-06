/**
 * Enables Sign in with Apple entitlement and optional Google iOS URL scheme.
 * Run on CI after cap sync. Requires APPLE_TEAM_ID for signing; optional GOOGLE_IOS_URL_SCHEME.
 */
import fs from "fs";
import path from "path";

const appDir = path.join("ios", "App", "App");
const entitlementsPath = path.join(appDir, "App.entitlements");
const plistPath = path.join(appDir, "Info.plist");
const pbxPath = path.join("ios", "App", "App.xcodeproj", "project.pbxproj");

if (!fs.existsSync(plistPath)) {
  console.warn("patch-ios-auth: Info.plist not found, skipping.");
  process.exit(0);
}

const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.developer.applesignin</key>
  <array>
    <string>Default</string>
  </array>
</dict>
</plist>
`;
fs.writeFileSync(entitlementsPath, entitlements);
console.log("patch-ios-auth: wrote App.entitlements (Sign in with Apple)");

const capConfigPath = path.join(appDir, "capacitor.config.json");
const googleIosClientId = (process.env.GOOGLE_IOS_CLIENT_ID || "").trim();
if (fs.existsSync(capConfigPath) && googleIosClientId) {
  const capCfg = JSON.parse(fs.readFileSync(capConfigPath, "utf8"));
  capCfg.plugins = capCfg.plugins || {};
  capCfg.plugins.GoogleAuth = capCfg.plugins.GoogleAuth || {};
  capCfg.plugins.GoogleAuth.iosClientId = googleIosClientId;
  fs.writeFileSync(capConfigPath, `${JSON.stringify(capCfg, null, "\t")}\n`);
  console.log("patch-ios-auth: iosClientId set in capacitor.config.json");
}

const googleScheme = (process.env.GOOGLE_IOS_URL_SCHEME || "").trim();
if (googleScheme) {
  let plist = fs.readFileSync(plistPath, "utf8");
  const urlTypeBlock = `    <dict>
      <key>CFBundleURLName</key>
      <string>com.googleusercontent.apps</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>${googleScheme}</string>
      </array>
    </dict>`;
  if (plist.includes("com.googleusercontent.apps")) {
    plist = plist.replace(
      /<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>[^<]+<\/string>\s*<\/array>/,
      `<key>CFBundleURLSchemes</key>\n      <array>\n        <string>${googleScheme}</string>\n      </array>`,
    );
  } else if (plist.includes("<key>CFBundleURLTypes</key>")) {
    plist = plist.replace(
      /<key>CFBundleURLTypes<\/key>\s*<array>/,
      `<key>CFBundleURLTypes</key>\n  <array>\n${urlTypeBlock}`,
    );
  } else {
    plist = plist.replace(
      "</dict>\n</plist>",
      `  <key>CFBundleURLTypes</key>\n  <array>\n${urlTypeBlock}\n  </array>\n</dict>\n</plist>`,
    );
  }
  fs.writeFileSync(plistPath, plist);
  console.log(`patch-ios-auth: Google URL scheme ${googleScheme} added to Info.plist`);
} else {
  console.warn(
    "patch-ios-auth: GOOGLE_IOS_URL_SCHEME not set. Native Gmail on iOS needs an iOS OAuth client in Google Cloud Console.",
  );
}

if (fs.existsSync(pbxPath)) {
  let pbx = fs.readFileSync(pbxPath, "utf8");
  const entRef = "App/App.entitlements";
  const entUuid = "E1E1E1E1E1E1E1E1E1E1E1E1";
  if (!pbx.includes("App.entitlements")) {
    pbx = pbx.replace(
      "\t\t504EC3131FED79650016851F /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = \"<group>\"; };",
      `\t\t${entUuid} /* App.entitlements */ = {isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = App.entitlements; sourceTree = \"<group>\"; };\n\t\t504EC3131FED79650016851F /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = \"<group>\"; };`,
    );
    pbx = pbx.replace(
      "\t\t\t\t504EC3131FED79650016851F /* Info.plist */,",
      `\t\t\t\t${entUuid} /* App.entitlements */,\n\t\t\t\t504EC3131FED79650016851F /* Info.plist */,`,
    );
  }
  pbx = pbx.replace(
    /CODE_SIGN_ENTITLEMENTS = [^;]*;/g,
    `CODE_SIGN_ENTITLEMENTS = ${entRef};`,
  );
  if (!pbx.includes("CODE_SIGN_ENTITLEMENTS")) {
    pbx = pbx.replace(
      /PRODUCT_BUNDLE_IDENTIFIER = rsvp\.echelon\.app;/g,
      `CODE_SIGN_ENTITLEMENTS = ${entRef};\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = rsvp.echelon.app;`,
    );
  }
  fs.writeFileSync(pbxPath, pbx);
  console.log("patch-ios-auth: CODE_SIGN_ENTITLEMENTS set in project.pbxproj");
}
