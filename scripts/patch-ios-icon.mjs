/**
 * Copy Echelon 1024px icon into the iOS AppIcon asset catalog.
 * Run after `npm run build` (creates public/icons/icon-1024.png) and `cap sync ios`.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "public", "icons", "icon-1024.png");
const appIconSet = path.join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset");
const contentsPath = path.join(appIconSet, "Contents.json");
const targetName = "AppIcon-512@2x.png";
const target = path.join(appIconSet, targetName);

if (!fs.existsSync(source)) {
  console.error("patch-ios-icon: public/icons/icon-1024.png missing. Run npm run build first.");
  process.exit(1);
}
if (!fs.existsSync(appIconSet)) {
  console.error("patch-ios-icon: AppIcon.appiconset not found. Run cap sync ios first.");
  process.exit(1);
}

fs.mkdirSync(appIconSet, { recursive: true });
fs.copyFileSync(source, target);

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

console.log(`patch-ios-icon: installed ${targetName} from public/icons/icon-1024.png`);
