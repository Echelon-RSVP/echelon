/**
 * Download bundled images for screenshot demo (no external URLs at capture time).
 */
import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "screenshot-assets");

const ASSETS = [
  { file: "feed-golden.jpg", url: "https://picsum.photos/seed/echelonfeed1/1080/1350" },
  { file: "feed-matcha.jpg", url: "https://picsum.photos/seed/echelonfeed2/1080/1350" },
  { file: "feed-city.jpg", url: "https://picsum.photos/seed/echelonfeed3/1080/1350" },
  { file: "feed-linen.jpg", url: "https://picsum.photos/seed/echelonfeed4/1080/1350" },
  { file: "feed-style.jpg", url: "https://picsum.photos/seed/echelonfeed5/1080/1350" },
  { file: "port-workspace.jpg", url: "https://picsum.photos/seed/echelonport1/1080/1350" },
  { file: "port-gallery.jpg", url: "https://picsum.photos/seed/echelonport2/1080/1350" },
  { file: "story-sofia.jpg", url: "https://picsum.photos/seed/echelonstory1/720/1280" },
  { file: "story-maya.jpg", url: "https://picsum.photos/seed/echelonstory2/720/1280" },
  { file: "story-luca.jpg", url: "https://picsum.photos/seed/echelonstory3/720/1280" },
  { file: "story-elena.jpg", url: "https://picsum.photos/seed/echelonstory4/720/1280" },
];

async function download(file, url) {
  const dest = join(outDir, file);
  if (existsSync(dest)) return;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed ${file}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await import("fs/promises").then((fs) => fs.writeFile(dest, buf));
  console.log("  ", file);
}

mkdirSync(outDir, { recursive: true });
console.log("Screenshot assets →", outDir);
for (const { file, url } of ASSETS) {
  await download(file, url);
}
console.log("Done.");
