import https from "https";

const CPANEL_USER = "echelon";
const CPANEL_PASS = process.env.ECHELON_CPANEL_PASS || "hLabEM@i2B2Mkkn";
const auth = Buffer.from(`${CPANEL_USER}:${CPANEL_PASS}`).toString("base64");

function api(path, payload = {}) {
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
            resolve({ raw: d.slice(0, 2000) });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

const users = await api("/execute/Mysql/list_users", {});
console.log("users:", JSON.stringify(users, null, 2));
const dbs = await api("/execute/Mysql/list_databases", {});
console.log("dbs:", JSON.stringify(dbs, null, 2));

// Try get privileges
const priv = await api("/execute/Mysql/get_privileges_on_database", { user: "echelon_app", database: "echelon_app" });
console.log("priv:", JSON.stringify(priv, null, 2));
