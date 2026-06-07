/**
 * ITMS-91061: @codetrix-studio/capacitor-google-auth pins GoogleSignIn 6.2.4 without
 * PrivacyInfo.xcprivacy. GoogleSignIn 7.x breaks the plugin Swift API.
 * Strip native Google Auth from the iOS Podfile; Gmail uses web GIS in the WKWebView shell.
 */
import fs from "fs";
import path from "path";

const podfilePath = path.join("ios", "App", "Podfile");

if (!fs.existsSync(podfilePath)) {
  console.warn("patch-ios-strip-native-google: Podfile not found.");
  process.exit(0);
}

let podfile = fs.readFileSync(podfilePath, "utf8");
const before = podfile;

podfile = podfile.replace(/^\s*pod 'CodetrixStudioCapacitorGoogleAuth'.*\n/gm, "");
podfile = podfile.replace(/^\s*pod 'GoogleSignIn'.*\n/gm, "");

if (podfile === before) {
  console.log("patch-ios-strip-native-google: Podfile already excludes native Google Auth");
} else {
  fs.writeFileSync(podfilePath, podfile);
  console.log("patch-ios-strip-native-google: removed native GoogleSignIn pods from Podfile");
}
