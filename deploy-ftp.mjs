import SftpClient from "ssh2-sftp-client";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const LOCAL = join(process.cwd(), "dist");
const CONFIG_FILE = join(process.cwd(), "deploy-ftp.config.json");
const DEFAULT_REMOTE = "/home/echelon/htdocs/echelon.rsvp/app";

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function loadConfig() {
  const fileConfig = existsSync(CONFIG_FILE)
    ? JSON.parse(readFileSync(CONFIG_FILE, "utf8").replace(/^\uFEFF/, ""))
    : {};
  const config = {
    host: process.env.ECHELON_SSH_HOST || fileConfig.host || "13.140.151.211",
    port: Number(process.env.ECHELON_SSH_PORT || fileConfig.port || 22),
    username: process.env.ECHELON_SSH_USER || fileConfig.username || "echelon",
    password: process.env.ECHELON_SSH_PASS || fileConfig.password,
    remotePath: process.env.ECHELON_APP_REMOTE || fileConfig.remotePath || DEFAULT_REMOTE,
  };
  if (!config.password) {
    throw new Error("Missing SFTP password. Set ECHELON_SSH_PASS or create ignored deploy-ftp.config.json.");
  }
  return config;
}

async function main() {
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

    console.log(`Connected via SFTP. Deploying app to ${config.remotePath}`);
    await client.mkdir(config.remotePath, true);

    for (const file of walk(LOCAL)) {
      const rel = relative(LOCAL, file).replace(/\\/g, "/");
      const remote = `${config.remotePath}/${rel}`;
      const remoteDir = remote.slice(0, remote.lastIndexOf("/"));
      console.log("Uploading", rel);
      await client.mkdir(remoteDir, true);
      await client.put(readFileSync(file), remote);
    }

    const htaccess = `Options -MultiViews
RewriteEngine On
RewriteBase /app/
RewriteRule ^index\\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /app/index.html [L]
`;
    await client.put(Buffer.from(htaccess), `${config.remotePath}/.htaccess`);

    console.log("SFTP app deploy complete.");
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
