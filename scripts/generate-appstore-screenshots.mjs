/**
 * Generate App Store screenshots for all iPhone display sizes.
 * Uses beautiful screenshot demo data (no test user).
 * Usage: npm run appstore:screenshots
 */
import { chromium } from "playwright";
import { spawn } from "child_process";
import { mkdirSync, cpSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = join(root, "store-listing", "screenshots");
const imessageRoot = join(outRoot, "imessage");
const PREVIEW_PORT = Number(process.env.SCREENSHOT_PORT || 4173);
const APP_URL = process.env.SCREENSHOT_APP_URL
  || `http://127.0.0.1:${PREVIEW_PORT}/app/?screenshotDemo=1`;

/** App Store Connect iPhone display sizes (portrait pixel output = width * scale) */
const DEVICE_PRESETS = [
  { folder: "6.9-inch", label: "1320 x 2868", width: 440, height: 956, scale: 3 },
  { folder: "6.7-inch", label: "1290 x 2796", width: 430, height: 932, scale: 3 },
  { folder: "6.5-inch", label: "1284 x 2778", width: 428, height: 926, scale: 3 },
  { folder: "6.5-inch-alt", label: "1242 x 2688", width: 414, height: 896, scale: 3 },
  { folder: "6.3-inch", label: "1206 x 2622", width: 402, height: 874, scale: 3 },
  { folder: "6.1-inch", label: "1170 x 2532", width: 390, height: 844, scale: 3 },
  { folder: "5.5-inch", label: "1242 x 2208", width: 414, height: 736, scale: 3 },
  { folder: "4.7-inch", label: "750 x 1334", width: 375, height: 667, scale: 2 },
  { folder: "4-inch", label: "640 x 1136", width: 320, height: 568, scale: 2 },
  { folder: "3.5-inch", label: "640 x 960", width: 320, height: 480, scale: 2 },
];

/** iPad Pro 12.9" / 13" (App Store Connect "iPad 13" Display") */
const IPAD_PRESETS = [
  { folder: "ipad-13-inch", label: "2048 x 2732", width: 1024, height: 1366, scale: 2 },
];

const HIDE_CHROME_CSS = `
  .cookie-banner, .install-banner, .stage-note, .pwa-hint,
  .statusbar-install, .dm-tip, .install-coach-backdrop { display: none !important; }
`;

const IPAD_LAYOUT_CSS = `
  html, body, #root { height: 100%; }
  .stage { min-height: 100%; height: 100%; padding: 0; gap: 0; justify-content: stretch; }
  .phone {
    width: 100%; max-width: 430px; margin: 0 auto; height: 100%; min-height: 100%; max-height: none;
    box-shadow: none; border-radius: 0;
  }
`;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: true, ...opts });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function waitForUrl(url, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status < 500) return;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server not reachable: ${url}`);
}

async function startPreview() {
  if (process.env.SCREENSHOT_APP_URL) {
    console.log("Using SCREENSHOT_APP_URL:", APP_URL);
    await waitForUrl(APP_URL);
    return null;
  }
  console.log("Starting vite preview on port", PREVIEW_PORT);
  const proc = spawn("npx", ["vite", "preview", "--port", String(PREVIEW_PORT), "--strictPort", "--host", "127.0.0.1"], {
    cwd: root,
    shell: true,
    stdio: "ignore",
    detached: false,
  });
  const base = `http://127.0.0.1:${PREVIEW_PORT}/app/`;
  await waitForUrl(base);
  console.log("Preview ready:", base);
  return proc;
}

async function waitForApp(page) {
  await page.waitForSelector(".ech-dock, .feed-masthead", { timeout: 90000 });
  await page.waitForSelector(".feed-post, .ech-profile-screen, .ech-messages-screen", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function snap(page, path) {
  await page.addStyleTag({ content: HIDE_CHROME_CSS }).catch(() => {});
  await page.evaluate(() => {
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = "eager"; });
  }).catch(() => {});
  await page.waitForTimeout(400);
  await page.evaluate(() => Promise.all(
    [...document.images].map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
        setTimeout(resolve, 6000);
      });
    }),
  )).catch(() => {});
  await page.waitForFunction(
    () => {
      const key = document.querySelector(".feed-post-media img, .ech-momentum-thumb, .post-media");
      if (!key) return true;
      return [...document.querySelectorAll(".feed-post-media img, .ech-momentum-thumb, .post-media, .spark-card-img")]
        .every((img) => img.complete && img.naturalWidth > 0);
    },
    { timeout: 12000 },
  ).catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path, type: "png", fullPage: false });
  console.log("  ", path.split(/[/\\]/).slice(-2).join("/"));
}

async function tapDock(page, label) {
  const btn = page.locator(`nav.ech-dock button[aria-label="${label}"]`).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(1100);
    return true;
  }
  return false;
}

async function captureSet(browser, preset, { tablet = false } = {}) {
  const dir = join(outRoot, preset.folder);
  mkdirSync(dir, { recursive: true });
  const px = `${preset.width * preset.scale}x${preset.height * preset.scale}`;
  console.log(`\n${preset.folder} (${preset.label} → ${px})`);

  const context = await browser.newContext({
    viewport: { width: preset.width, height: preset.height },
    deviceScaleFactor: preset.scale,
    isMobile: !tablet,
    hasTouch: true,
    locale: "en-US",
    userAgent: tablet
      ? "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      : "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });

  await context.addInitScript(() => {
    try {
      localStorage.setItem("echelon-screenshot-demo", "1");
      localStorage.setItem("echelon-cookie-consent", JSON.stringify({ functional: true, analytics: false, ts: Date.now(), version: "2.0" }));
      localStorage.setItem("echelon-install-dismiss", "1");
      localStorage.removeItem("echelon-token");
    } catch { /* ignore */ }
  });

  const page = await context.newPage();
  if (tablet) await page.addStyleTag({ content: IPAD_LAYOUT_CSS }).catch(() => {});
  await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  await waitForApp(page);

  await tapDock(page, "Home");
  await snap(page, join(dir, "01-feed.png"));

  await tapDock(page, "Profile");
  await snap(page, join(dir, "02-profile.png"));

  await tapDock(page, "Messages");
  await snap(page, join(dir, "03-messages.png"));

  await tapDock(page, "Discover");
  await snap(page, join(dir, "04-discover.png"));

  await tapDock(page, "Map");
  await snap(page, join(dir, "05-map.png"));

  await tapDock(page, "Match");
  await page.waitForSelector(".spark-card, .spark-card-img", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  await snap(page, join(dir, "06-spark.png"));

  await context.close();
}

function copyScreenshots(srcFolder, destFolder) {
  const src = join(outRoot, srcFolder);
  const dest = join(imessageRoot, destFolder);
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  for (let i = 1; i <= 6; i++) {
    const name = `0${i}-${["feed", "profile", "messages", "discover", "map", "spark"][i - 1]}.png`;
    const from = join(src, name);
    if (existsSync(from)) cpSync(from, join(dest, name));
  }
  console.log(`  imessage/${destFolder}/ ← ${srcFolder}/`);
}

async function main() {
  console.log("Ensuring local screenshot assets...");
  await run("node", ["scripts/download-screenshot-assets.mjs"], { cwd: root });
  console.log("Building app with screenshot demo data...");
  await run("npm", ["run", "build"], { cwd: root });

  let previewProc = null;
  try {
    previewProc = await startPreview();
    console.log("Launching browser...");
    const browser = await chromium.launch({ headless: true });
    try {
      for (const preset of DEVICE_PRESETS) {
        await captureSet(browser, preset);
      }
      for (const preset of IPAD_PRESETS) {
        await captureSet(browser, preset, { tablet: true });
      }
    } finally {
      await browser.close();
    }
  } finally {
    if (previewProc) previewProc.kill();
  }

  console.log("\nPackaging iMessage App screenshot folders...");
  copyScreenshots("6.5-inch", "iphone-6.5-inch");
  copyScreenshots("ipad-13-inch", "ipad-13-inch");

  console.log("\nDone. Upload folders to matching App Store Connect display sizes:");
  console.log(`  ${outRoot}`);
  console.log(`  iMessage tab: ${imessageRoot}`);
  console.log("\nNote: 6.5-inch-alt (1242x2688) also goes in the 6.5\" slot if Apple asks for that size.");
  console.log("Routing App Coverage + App Clip: see store-listing/optional-assets.txt (skip unless you ship those features).");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
