import { Client } from "ssh2";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const HOST = "199.188.205.52";
const PORT = 21098;
const USER = "echelon";
const PASS = "hLabEM@i2B2Mkkn";
const LOCAL = join(process.cwd(), "dist");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function sftpReaddir(sftp, dir) {
  return new Promise((resolve, reject) => {
    sftp.readdir(dir, (err, list) => (err ? reject(err) : resolve(list)));
  });
}

function sftpMkdir(sftp, dir) {
  return new Promise((resolve, reject) => {
    sftp.mkdir(dir, (err) => {
      if (!err || err.code === 4) return resolve();
      reject(err);
    });
  });
}

function sftpWrite(sftp, remotePath, data) {
  return new Promise((resolve, reject) => {
    sftp.writeFile(remotePath, data, (err) => (err ? reject(err) : resolve()));
  });
}

async function ensureDir(sftp, dir) {
  const parts = dir.split("/").filter(Boolean);
  let cur = "";
  for (const part of parts) {
    cur += "/" + part;
    await sftpMkdir(sftp, cur).catch(() => {});
  }
}

async function findAppDir(sftp) {
  const candidates = [
    "public_html/app",
    "home/echelon/public_html/app",
    "/home/echelon/public_html/app",
    "www/app",
    "app",
  ];
  for (const c of candidates) {
    try {
      await sftpReaddir(sftp, c);
      return c.replace(/^\/+/, "");
    } catch {}
  }
  const root = await sftpReaddir(sftp, ".");
  console.log("SFTP root listing:", root.map((e) => e.filename).join(", "));
  if (root.some((e) => e.filename === "public_html")) return "public_html/app";
  throw new Error("Could not locate public_html/app on SFTP");
}

const conn = new Client();
conn.on("ready", async () => {
  try {
    const sftp = await new Promise((resolve, reject) => {
      conn.sftp((err, s) => (err ? reject(err) : resolve(s)));
    });

    const appDir = await findAppDir(sftp);
    console.log(`Deploy target: ${appDir}`);

    await ensureDir(sftp, appDir);
    await ensureDir(sftp, `${appDir}/assets`);

    const files = walk(LOCAL);
    for (const file of files) {
      const rel = relative(LOCAL, file).replace(/\\/g, "/");
      const remote = `${appDir}/${rel}`;
      const remoteDir = remote.slice(0, remote.lastIndexOf("/"));
      await ensureDir(sftp, remoteDir);
      console.log(`Uploading ${rel}`);
      await sftpWrite(sftp, remote, readFileSync(file));
    }

    const htaccess = `Options -MultiViews
RewriteEngine On
RewriteBase /app/
RewriteRule ^index\\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /app/index.html [L]
`;
    await sftpWrite(sftp, `${appDir}/.htaccess`, Buffer.from(htaccess));
    console.log("Deploy complete via SFTP.");
    conn.end();
  } catch (e) {
    console.error(e);
    conn.end();
    process.exit(1);
  }
});

conn.on("error", (e) => {
  console.error("SSH error:", e.message);
  process.exit(1);
});

conn.connect({ host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 30000 });
