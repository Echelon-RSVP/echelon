import https from "https";
import { readFileSync } from "fs";
import { join } from "path";

const cfgText = readFileSync(join(process.cwd(), "acme-ssl.mjs"), "utf8");
const CPANEL = {
  host: "199.188.205.52",
  user: cfgText.match(/user:\s*"([^"]+)"/)?.[1],
  pass: cfgText.match(/pass:\s*"([^"]+)"/)?.[1],
};

function cpanelApi(path, payload = {}) {
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

const res = await cpanelApi("/execute/Email/get_client_settings");
console.log(JSON.stringify(res, null, 2));
