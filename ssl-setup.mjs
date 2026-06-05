import https from "https";
import selfsigned from "selfsigned";

const auth = Buffer.from("echelon:hLabEM@i2B2Mkkn").toString("base64");

function apiForm(path, payload) {
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

async function main() {
  const pems = await selfsigned.generate([{ name: "commonName", value: "echelon.rsvp" }], {
    days: 365,
    keySize: 2048,
    algorithm: "sha256",
  });

  const payload = {
    domain: "echelon.rsvp",
    cert: pems.cert,
    key: pems.private,
    key_algorithm: "rsa",
  };

  console.log("cert starts:", pems.cert.slice(0, 40));
  console.log("install:", JSON.stringify(await apiForm("/execute/SSL/install_ssl", payload), null, 2));
  console.log("list:", JSON.stringify(await apiForm("/execute/SSL/list_certs", {}), null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
