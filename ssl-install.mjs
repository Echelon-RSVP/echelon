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
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data.slice(0, 800) }); }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

const tries = [
  ["GET", "/execute/SSL/list_available_ssl_items"],
  ["GET", "/execute/SSL/get_ssl_status_for_domains?domains=echelon.rsvp"],
  ["GET", "/execute/Market/get_all_installed_packages"],
  ["POST", "/execute/SSL/start_autossl_check", ""],
  ["POST", "/execute/SSL/enable_ssl_redirect_for_domains", JSON.stringify({ domains: ["echelon.rsvp"] })],
  ["GET", "/execute/SSL/get_autossl_providers"],
];

for (const [method, path, body] of tries) {
  console.log("\n===", method, path, "===");
  console.log(JSON.stringify(await api(path, method, body), null, 2));
}
