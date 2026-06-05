import https from "https";

const auth = Buffer.from("echelon:hLabEM@i2B2Mkkn").toString("base64");

function apiForm(path, payload = {}) {
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
          catch { resolve({ raw: data.slice(0, 1000) }); }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

const certId = "echelon_rsvp_e5b21_4bf1d_1811707575_f8871e833c570e59b6b6ec22a3a8b91a";

const tries = [
  ["/execute/SSL/set_certificate_for_domains", { domains: "echelon.rsvp", cert_id: certId }],
  ["/execute/SSL/set_certificate_for_domain", { domain: "echelon.rsvp", cert_id: certId }],
  ["/execute/SSL/install_ssl", { domain: "echelon.rsvp", cert_id: certId }],
  ["/execute/SSL/set_user_certificate_for_domain", { domain: "echelon.rsvp", cert_id: certId }],
  ["/execute/SSL/fetch_best_for_domain", { domain: "echelon.rsvp" }],
];

for (const [path, payload] of tries) {
  console.log("\n===", path, "===");
  console.log(JSON.stringify(await apiForm(path, payload), null, 2));
}

console.log("\n=== HTTPS test ===");
try {
  const res = await fetch("https://echelon.rsvp/app/", { redirect: "follow" });
  console.log("status", res.status, res.url);
} catch (e) {
  console.log("fetch error:", e.message);
}
