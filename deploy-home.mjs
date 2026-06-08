import SftpClient from "ssh2-sftp-client";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const SOURCE = join(process.cwd(), "home.hrml");
const BROWSER = join(process.cwd(), ".browser");
const CONFIG_FILE = join(process.cwd(), "deploy-ftp.config.json");
const DEFAULT_REMOTE = "/home/echelon/htdocs/echelon.rsvp";
const LEGAL_PAGES = ["privacy.html", "terms.html", "cookies.html", "data-deletion.html"];
const BROWSER_SCRIPTS = ["i18n.js", "legal.js", "legal-page.js"];

function loadConfig() {
  const fileConfig = existsSync(CONFIG_FILE)
    ? JSON.parse(readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, ""))
    : {};
  const config = {
    host: process.env.ECHELON_SSH_HOST || fileConfig.host || "13.140.151.211",
    port: Number(process.env.ECHELON_SSH_PORT || fileConfig.port || 22),
    username: process.env.ECHELON_SSH_USER || fileConfig.username || "echelon",
    password: process.env.ECHELON_SSH_PASS || fileConfig.password,
    remotePath: process.env.ECHELON_HOME_REMOTE || fileConfig.homeRemotePath || DEFAULT_REMOTE,
  };
  if (!config.password) {
    throw new Error("Missing SFTP password. Set ECHELON_SSH_PASS or create ignored deploy-ftp.config.json.");
  }
  return config;
}

async function upload(client, remotePath, localPath, remoteName) {
  const data = readFileSync(localPath);
  await client.put(data, `${remotePath}/${remoteName}`);
  console.log(`Uploaded ${remoteName}:`, data.length, "bytes");
}

async function main() {
  execSync("node scripts/build-legal-pages.mjs", { stdio: "inherit", cwd: process.cwd() });
  execSync("node scripts/build-browser-scripts.mjs", { stdio: "inherit", cwd: process.cwd() });

  const config = loadConfig();
  const client = new SftpClient();
  try {
    await client.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      readyTimeout: 30000,
    });

    console.log(`Connected via SFTP. Uploading homepage + legal pages to ${config.remotePath}`);
    await client.mkdir(config.remotePath, true);
    await upload(client, config.remotePath, SOURCE, "index.html");
    for (const name of BROWSER_SCRIPTS) {
      await upload(client, config.remotePath, join(BROWSER, name), name);
    }
    for (const page of LEGAL_PAGES) {
      await upload(client, config.remotePath, join(process.cwd(), page), page);
    }
    console.log("Home deploy complete.");
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
