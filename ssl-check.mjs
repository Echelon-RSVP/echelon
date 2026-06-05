import https from "https";

const auth = Buffer.from("echelon:hLabEM@i2B2Mkkn").toString("base64");

function api(path, method = "GET", body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "199.188.205.52",
        port: 2083,
        path,
        method,
        headers: {
          Authorization: `Basic ${auth}`,
          ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {}),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve({ status: res.statusCode, raw: data.slice(0, 500) }); }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

const endpoints = [
  "/execute/SSL/list_certs",
  "/execute/AutoSSL/check",
  "/execute/SSL/fetch_best_for_domain?domain=echelon.rsvp",
  "/execute/SSL/get_autossl_status",
];

for (const ep of endpoints) {
  console.log("\n===", ep, "===");
  try {
    console.log(JSON.stringify(await api(ep), null, 2));
  } catch (e) {
    console.error(e.message);
  }
}
