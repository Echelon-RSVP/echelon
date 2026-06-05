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
          catch { resolve({ raw: data.slice(0, 2000) }); }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const checks = [
    ["/execute/SSL/list_certs", {}],
    ["/execute/SSL/fetch_best_for_domain", { domain: "echelon.rsvp" }],
    ["/execute/SSL/fetch_best_for_domain", { domain: "www.echelon.rsvp" }],
    ["/execute/SSL/get_domains", {}],
    ["/execute/DomainInfo/list_domains", {}],
    ["/execute/SSL/get_installed_ssl_info", { domain: "echelon.rsvp" }],
  ];
  for (const [path, payload] of checks) {
    console.log("\n===", path, JSON.stringify(payload), "===");
    console.log(JSON.stringify(await api(path, payload), null, 2));
  }
}

main().catch(console.error);
