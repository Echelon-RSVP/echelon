import https from "https";
import { Client } from "basic-ftp";
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { randomBytes } from "crypto";

const CPANEL_HOST = "199.188.205.52";
const CPANEL_USER = "echelon";
const CPANEL_PASS = process.env.ECHELON_CPANEL_PASS || "hLabEM@i2B2Mkkn";
const DOMAIN = "echelon.rsvp";
const DB_NAME = "echelon_app";
const DB_USER = "echelon_app";

const auth = Buffer.from(`${CPANEL_USER}:${CPANEL_PASS}`).toString("base64");

function apiForm(path, payload) {
  const body = new URLSearchParams(payload).toString();
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: CPANEL_HOST,
        port: 2083,
        path,
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ raw: data.slice(0, 2000) });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

async function uploadApi(configLocal) {
  const client = new Client(60000);
  await client.access({
    host: CPANEL_HOST,
    user: CPANEL_USER,
    password: CPANEL_PASS,
    port: 21,
    secure: false,
  });
  const local = join(process.cwd(), "api");
  await client.ensureDir("public_html/api");
  for (const file of walk(local)) {
    const rel = relative(local, file).replace(/\\/g, "/");
    const parts = rel.split("/");
    const filename = parts.pop();
    await client.cd("/public_html/api");
    if (parts.length) await client.ensureDir(parts.join("/"));
    await client.cd("/public_html/api/" + (parts.length ? parts.join("/") : ""));
    const { Readable } = await import("stream");
    await client.uploadFrom(Readable.from(readFileSync(file)), filename);
    console.log("  uploaded api/" + rel);
  }
  await client.cd("/public_html/api");
  const { Readable } = await import("stream");
  await client.uploadFrom(Readable.from(Buffer.from(configLocal)), "config.local.php");
  client.close();
}

async function main() {
  const dbPass = randomBytes(12).toString("base64url");
  const installKey = randomBytes(16).toString("hex");

  console.log("Creating MySQL database…");
  console.log(JSON.stringify(await apiForm("/execute/Mysql/create_database", { name: DB_NAME }), null, 2));

  console.log("Creating MySQL user…");
  console.log(JSON.stringify(await apiForm("/execute/Mysql/create_user", { name: DB_USER, password: dbPass }), null, 2));

  console.log("Granting privileges…");
  console.log(
    JSON.stringify(
      await apiForm("/execute/Mysql/set_privileges_on_database", {
        user: DB_USER,
        database: DB_NAME,
        privileges: "ALL PRIVILEGES",
      }),
      null,
      2
    )
  );

  const configLocal = `<?php
return [
    'db_host' => 'localhost',
    'db_name' => '${DB_NAME}',
    'db_user' => '${DB_USER}',
    'db_pass' => '${dbPass}',
    'install_key' => '${installKey}',
    'upload_dir' => __DIR__ . '/uploads',
    'upload_url' => '/api/uploads',
    'session_days' => 90,
];
`;

  writeFileSync(join(process.cwd(), "api", "config.local.php"), configLocal);
  console.log("Wrote api/config.local.php (local copy — not for git)");

  console.log("Uploading API via FTP…");
  await uploadApi(configLocal);

  const installUrl = `https://${DOMAIN}/api/install.php?key=${installKey}`;
  console.log("Running installer:", installUrl);
  const installRes = await fetch(installUrl);
  const installJson = await installRes.json();
  console.log(JSON.stringify(installJson, null, 2));

  if (!installJson.ok) {
    console.error("Install failed — check cPanel error log.");
    process.exit(1);
  }

  console.log("\n✓ Database live at echelon_app");
  console.log("✓ API health:", `https://${DOMAIN}/api/v1/health`);
  console.log("⚠ Delete install.php on server after verifying.");
  console.log("⚠ Remove api/config.local.php from disk before committing.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
