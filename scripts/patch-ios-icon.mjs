/**
 * Install opaque 1024px Echelon icon into the iOS AppIcon asset catalog.
 * App Store rejects icons with an alpha channel (error 90717).
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "public", "icons", "icon-1024.png");
const svgSource = path.join(root, "public", "icons", "icon-512.svg");
const appIconSet = path.join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset");
const contentsPath = path.join(appIconSet, "Contents.json");
const targetName = "AppIcon-512@2x.png";
const target = path.join(appIconSet, targetName);
const iconBg = "#FF9DC0";

if (!fs.existsSync(appIconSet)) {
  console.error("patch-ios-icon: AppIcon.appiconset not found. Run cap sync ios first.");
  process.exit(1);
}

async function writeOpaqueIcon() {
  fs.mkdirSync(appIconSet, { recursive: true });
  let input = source;
  if (!fs.existsSync(input)) {
    if (!fs.existsSync(svgSource)) {
      console.error("patch-ios-icon: icon-1024.png missing. Run npm run build first.");
      process.exit(1);
    }
    input = svgSource;
  }
  await sharp(input)
    .resize(1024, 1024)
    .flatten({ background: iconBg })
    .png({ compressionLevel: 9, force: true })
    .toFile(target);

  const contents = {
    images: [
      {
        filename: targetName,
        idiom: "universal",
        platform: "ios",
        size: "1024x1024",
      },
    ],
    info: { author: "xcode", version: 1 },
  };
  fs.writeFileSync(contentsPath, `${JSON.stringify(contents, null, 2)}\n`);
  console.log(`patch-ios-icon: installed opaque ${targetName} (no alpha channel)`);
}

writeOpaqueIcon().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
