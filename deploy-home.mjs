import { Client } from "basic-ftp";
import { readFileSync } from "fs";
import { join } from "path";
import { Readable } from "stream";
import { execSync } from "child_process";

const SOURCE = join(process.cwd(), "home.hrml");
const BROWSER = join(process.cwd(), ".browser");
const LEGAL_PAGES = ["privacy.html", "terms.html", "cookies.html", "data-deletion.html"];
const BROWSER_SCRIPTS = ["i18n.js", "legal.js", "legal-page.js"];

async function upload(client, localPath, remoteName) {
  const data = readFileSync(localPath);
  await client.uploadFrom(Readable.from(data), remoteName);
  console.log(`Uploaded ${remoteName}:`, data.length, "bytes");
}

async function main() {
  execSync("node scripts/build-legal-pages.mjs", { stdio: "inherit", cwd: process.cwd() });
  execSync("node scripts/build-browser-scripts.mjs", { stdio: "inherit", cwd: process.cwd() });

  const client = new Client(60000);
  try {
    await client.access({
      host: "199.188.205.52",
      user: "echelon",
      password: "hLabEM@i2B2Mkkn",
      port: 21,
      secure: false,
    });

    console.log("Connected. Uploading homepage + legal pages");
    await client.cd("/public_html");
    await upload(client, SOURCE, "index.html");
    for (const name of BROWSER_SCRIPTS) {
      await upload(client, join(BROWSER, name), name);
    }
    for (const page of LEGAL_PAGES) {
      await upload(client, join(process.cwd(), page), page);
    }
    console.log("Home deploy complete.");
  } finally {
    client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
