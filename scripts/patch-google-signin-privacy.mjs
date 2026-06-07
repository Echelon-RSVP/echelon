/**
 * ITMS-91061: Codetrix Google Auth pins GoogleSignIn ~> 6.2.4 (no PrivacyInfo.xcprivacy).
 * Force GoogleSignIn 7.1+ so GTMAppAuth / GTMSessionFetcher also resolve to manifest versions.
 */
import fs from "fs";
import path from "path";

const GOOGLE_SIGNIN = "~> 7.1.0";
const podspecPath = path.join(
  "node_modules",
  "@codetrix-studio",
  "capacitor-google-auth",
  "CodetrixStudioCapacitorGoogleAuth.podspec",
);
const podfilePath = path.join("ios", "App", "Podfile");

function patchPodspec() {
  if (!fs.existsSync(podspecPath)) {
    console.warn("patch-google-signin-privacy: podspec not found (npm ci first).");
    return;
  }
  let spec = fs.readFileSync(podspecPath, "utf8");
  const patched = spec.replace(/GoogleSignIn', '~> [^']+'/, `GoogleSignIn', '${GOOGLE_SIGNIN}'`);
  if (patched === spec) {
    console.log("patch-google-signin-privacy: podspec already on GoogleSignIn 7.1+");
    return;
  }
  fs.writeFileSync(podspecPath, patched);
  console.log(`patch-google-signin-privacy: podspec -> GoogleSignIn ${GOOGLE_SIGNIN}`);
}

function patchPodfile() {
  if (!fs.existsSync(podfilePath)) {
    console.warn("patch-google-signin-privacy: Podfile not found. Run cap sync first.");
    return;
  }
  let podfile = fs.readFileSync(podfilePath, "utf8");
  const line = `  pod 'GoogleSignIn', '${GOOGLE_SIGNIN}'  # ITMS-91061 privacy manifest`;

  if (/pod 'GoogleSignIn', '~> 7\.1\.0'/.test(podfile)) {
    console.log("patch-google-signin-privacy: Podfile already overrides GoogleSignIn 7.1+");
    return;
  }

  if (/pod 'GoogleSignIn'/.test(podfile)) {
    podfile = podfile.replace(/^\s*pod 'GoogleSignIn', '[^']+'.*$/m, line);
  } else {
    podfile = podfile.replace(
      /(target 'App' do\n  capacitor_pods\n)/,
      `$1${line}\n`,
    );
  }

  fs.writeFileSync(podfilePath, podfile);
  console.log("patch-google-signin-privacy: Podfile override added");
}

patchPodspec();
patchPodfile();
