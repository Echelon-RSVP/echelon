import https from "https";
import crypto from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

const cfgPath = join(process.cwd(), "acme-ssl.mjs");
const cfgText = readFileSync(cfgPath, "utf8");
const userMatch = cfgText.match(/user:\s*"([^"]+)"/);
const passMatch = cfgText.match(/pass:\s*"([^"]+)"/);
const CPANEL = {
  host: "199.188.205.52",
  user: userMatch?.[1],
  pass: passMatch?.[1],
};

if (!CPANEL.user || !CPANEL.pass) {
  console.error("cPanel credentials not found in acme-ssl.mjs");
  process.exit(1);
}

function cpanelApi(path, payload) {
  const auth = Buffer.from(`${CPANEL.user}:${CPANEL.pass}`).toString("base64");
  const body = new URLSearchParams(payload).toString();
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: CPANEL.host,
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
            resolve({ raw: data.slice(0, 500) });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

const password = crypto.randomBytes(12).toString("base64url") + "A1!";
const list = await cpanelApi("/execute/Email/list_pops", { domain: "echelon.rsvp" });
const accounts = list?.data || [];
const exists = accounts.some((a) => a.email === "hi@echelon.rsvp" || a.user === "hi");

if (exists) {
  console.log(JSON.stringify({ ok: true, status: "already_exists", email: "hi@echelon.rsvp" }, null, 2));
  process.exit(0);
}

const res = await cpanelApi("/execute/Email/add_pop", {
  email: "hi",
  domain: "echelon.rsvp",
  password,
  quota: 1024,
});

if (res?.status !== 1 && !res?.data) {
  console.error(JSON.stringify(res, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, email: "hi@echelon.rsvp", password, quotaMb: 1024 }, null, 2));
