import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = join(root, "public", "icons", "icon-512.svg");
const svg = readFileSync(svgPath);

const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const sizes = [
  { name: "favicon-32.png", size: 32 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-1024.png", size: 1024 },
  { name: "apple-touch-icon.png", size: 180 },
];

// App Store rejects icons with alpha; flatten on brand gradient base.
const iconBg = "#FF9DC0";

for (const { name, size } of sizes) {
  let pipeline = sharp(svg).resize(size, size).flatten({ background: iconBg });
  if (name === "icon-1024.png" || name === "apple-touch-icon.png") {
    pipeline = pipeline.png({ compressionLevel: 9, force: true });
  } else {
    pipeline = pipeline.png({ compressionLevel: 9 });
  }
  await pipeline.toFile(join(outDir, name));
  console.log("Wrote", name);
}

await sharp(svg).resize(32, 32).png().toFile(join(root, "public", "favicon.png"));
console.log("Wrote favicon.png");
