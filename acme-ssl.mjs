import acme from "acme-client";
import https from "https";
import { Client as FtpClient } from "basic-ftp";
import { Readable } from "stream";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const DOMAIN = "echelon.rsvp";
const CPANEL = { host: "199.188.205.52", user: "echelon", pass: "hLabEM@i2B2Mkkn" };
const OUT = join(process.cwd(), "ssl-local");

async function ftpUpload(remotePath, content) {
  const client = new FtpClient(60000);
  try {
    await client.access({
      host: CPANEL.host,
      user: CPANEL.user,
      password: CPANEL.pass,
      port: 21,
      secure: false,
    });
    const parts = remotePath.split("/").filter(Boolean);
    const file = parts.pop();
    await client.cd("/");
    for (const p of parts) {
      try { await client.send(`MKD ${p}`); } catch {}
      await client.cd(p);
    }
    await client.uploadFrom(Readable.from(Buffer.from(content)), file);
  } finally {
    client.close();
  }
}

async function ftpRemove(remotePath) {
  const client = new FtpClient(60000);
  try {
    await client.access({
      host: CPANEL.host,
      user: CPANEL.user,
      password: CPANEL.pass,
      port: 21,
      secure: false,
    });
    const parts = remotePath.split("/").filter(Boolean);
    const file = parts.pop();
    await client.cd("/" + parts.join("/"));
    await client.remove(file);
  } catch {
    // ignore cleanup errors
  } finally {
    client.close();
  }
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
  mkdirSync(OUT, { recursive: true });

  console.log("Creating ACME account...");
  const accountKey = await acme.crypto.createPrivateKey();
  const client = new acme.Client({
    directoryUrl: acme.directory.letsencrypt.production,
    accountKey,
  });
  await client.createAccount({
    termsOfServiceAgreed: true,
    contact: ["mailto:admin@" + DOMAIN],
  });

  console.log("Ordering certificate for", DOMAIN);
  const [key, csr] = await acme.crypto.createCsr({
    commonName: DOMAIN,
    altNames: [DOMAIN, `www.${DOMAIN}`],
  });

  const order = await client.createOrder({
    identifiers: [{ type: "dns", value: DOMAIN }, { type: "dns", value: `www.${DOMAIN}` }],
  });

  const authz = await client.getAuthorizations(order);
  const challenges = [];

  for (const auth of authz) {
    const challenge = auth.challenges.find((c) => c.type === "http-01");
    if (!challenge) throw new Error(`No http-01 challenge for ${auth.identifier.value}`);
    const keyAuth = await client.getChallengeKeyAuthorization(challenge);
    const token = challenge.token;
    const remote = `public_html/.well-known/acme-challenge/${token}`;
    console.log(`Uploading challenge for ${auth.identifier.value} -> /${remote}`);
    await ftpUpload(remote, keyAuth);
    challenges.push({ auth, challenge, remote });
  }

  console.log("Waiting for HTTP propagation...");
  await new Promise((r) => setTimeout(r, 5000));

  for (const { auth, challenge } of challenges) {
    console.log("Validating", auth.identifier.value);
    await client.verifyChallenge(auth, challenge);
    await client.completeChallenge(challenge);
    await client.waitForValidStatus(challenge);
  }

  console.log("Finalizing order...");
  await client.finalizeOrder(order, csr);
  const cert = await client.getCertificate(order);

  const [leaf, ...chainParts] = cert.split(/(?=-----BEGIN CERTIFICATE-----)/g).filter(Boolean);
  const cabundle = chainParts.join("");

  writeFileSync(join(OUT, "cert.pem"), leaf);
  writeFileSync(join(OUT, "key.pem"), key);
  writeFileSync(join(OUT, "cabundle.pem"), cabundle);
  writeFileSync(join(OUT, "fullchain.pem"), cert);

  console.log("Installing certificate via cPanel...");
  const install = await cpanelApi("/execute/SSL/install_ssl", {
    domain: DOMAIN,
    cert: leaf,
    key,
    cabundle,
    key_algorithm: "rsa",
  });
  console.log(JSON.stringify(install, null, 2));

  for (const { remote } of challenges) {
    await ftpRemove(remote);
  }

  console.log("Verifying live certificate...");
  await new Promise((r) => setTimeout(r, 8000));
  await new Promise((resolve, reject) => {
    const s = require("tls").connect(
      { host: DOMAIN, port: 443, servername: DOMAIN, rejectUnauthorized: true },
      () => {
        const c = s.getPeerCertificate();
        console.log("Live CN:", c.subject?.CN);
        console.log("Live SAN:", c.subjectaltname);
        console.log("Issuer:", c.issuer?.O || c.issuer?.CN);
        s.end();
        resolve();
      }
    );
    s.on("error", reject);
  });
}

main().catch((e) => {
  console.error("SSL install failed:", e.message || e);
  process.exit(1);
});
