import https from "https";

const auth = Buffer.from("echelon:hLabEM@i2B2Mkkn").toString("base64");

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
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve({ raw: data.slice(0, 500) }); }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

const endpoints = [
  "/execute/LetsEncrypt/create",
  "/execute/LetsEncrypt/issue",
  "/execute/LetsEncrypt/request",
  "/execute/SSL/generate_ssl",
  "/execute/SSL/install_ssl_for_domain",
  "/execute/SSL/rebuild_ssl_files",
  "/execute/SSL/installed_host",
  "/execute/SSL/is_autossl_check_in_progress",
  "/execute/Market/get_provider_info",
  "/execute/SSL/start_autossl_check",
];

for (const ep of endpoints) {
  console.log("\n===", ep, "===");
  console.log(JSON.stringify(await api(ep, { domain: "echelon.rsvp", domains: "echelon.rsvp" }), null, 2));
}
