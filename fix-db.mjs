import https from "https";
import { writeFileSync } from "fs";
import { Client } from "basic-ftp";

const CPANEL_USER = "echelon";
const CPANEL_PASS = process.env.ECHELON_CPANEL_PASS || "hLabEM@i2B2Mkkn";
const auth = Buffer.from(`${CPANEL_USER}:${CPANEL_PASS}`).toString("base64");
const dbPass = "EchelonLive2026";
const installKey = "f735c2661e3ebd8f4f8983f7436cabcb";

function api(path, payload) {
  const body = new URLSearchParams(payload).toString();
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "199.188.205.52",
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
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(d));
          } catch {
            resolve({ raw: d });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

console.log("delete user:", JSON.stringify(await api("/execute/Mysql/delete_user", { name: "echelon_app" }), null, 2));
console.log("create user:", JSON.stringify(await api("/execute/Mysql/create_user", { name: "echelon_app", password: dbPass }), null, 2));
console.log("grant:", JSON.stringify(await api("/execute/Mysql/set_privileges_on_database", { user: "echelon_app", database: "echelon_app", privileges: "ALL PRIVILEGES" }), null, 2));

const configLocal = `<?php
return [
    'db_host' => 'localhost',
    'db_name' => 'echelon_app',
    'db_user' => 'echelon_app',
    'db_pass' => '${dbPass}',
    'install_key' => '${installKey}',
    'upload_dir' => __DIR__ . '/uploads',
    'upload_url' => '/api/uploads',
    'session_days' => 90,
];
`;
writeFileSync("api/config.local.php", configLocal);

const client = new Client(60000);
await client.access({ host: "199.188.205.52", user: CPANEL_USER, password: CPANEL_PASS, port: 21, secure: false });
await client.cd("/public_html/api");
const { Readable } = await import("stream");
await client.uploadFrom(Readable.from(Buffer.from(configLocal)), "config.local.php");
client.close();

console.log("db-test:", await (await fetch("https://echelon.rsvp/api/db-test.php")).text());
console.log("install:", await (await fetch(`https://echelon.rsvp/api/install.php?key=${installKey}`)).text());
console.log("health:", await (await fetch("https://echelon.rsvp/api/v1/health")).text());
