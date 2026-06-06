/**
 * Free certificate slots before CI archive.
 * GitHub Actions + automatic signing creates orphan iOS Development certs until Apple blocks new ones.
 */
import crypto from "crypto";
import fs from "fs";

const keyId = process.env.APPSTORE_KEY_ID?.trim();
const issuerId = process.env.APPSTORE_ISSUER_ID?.trim();
const apiKeyPath = process.env.API_KEY_PATH?.trim();
const privateKeyInline = process.env.APPSTORE_PRIVATE_KEY?.trim();

const DEV_TYPES = new Set([
  "IOS_DEVELOPMENT",
  "DEVELOPMENT",
  "MAC_APP_DEVELOPMENT",
  "MAC_DEVELOPMENT",
]);

const DIST_TYPES = new Set([
  "IOS_DISTRIBUTION",
  "DISTRIBUTION",
  "APPLE_DISTRIBUTION",
]);

function readPrivateKey() {
  if (apiKeyPath && fs.existsSync(apiKeyPath)) return fs.readFileSync(apiKeyPath, "utf8");
  if (privateKeyInline) return privateKeyInline;
  return null;
}

function ascToken(privateKeyPem) {
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ iss: issuerId, iat: now, exp: now + 1200, aud: "appstoreconnect-v1" }),
  ).toString("base64url");
  const input = `${header}.${payload}`;
  const sig = crypto.sign("sha256", Buffer.from(input), {
    key: crypto.createPrivateKey(privateKeyPem),
    dsaEncoding: "ieee-p1363",
  });
  return `${input}.${sig.toString("base64url")}`;
}

async function asc(privateKeyPem, method, route, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${ascToken(privateKeyPem)}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ASC ${method} ${route} -> ${res.status}: ${text.slice(0, 500)}`);
  if (!text.trim()) return {};
  return JSON.parse(text);
}

async function listAllCertificates(privateKeyPem) {
  const all = [];
  let next = "/v1/certificates?limit=200";
  while (next) {
    const data = await asc(privateKeyPem, "GET", next);
    all.push(...(data.data || []));
    const link = data.links?.next;
    if (!link) break;
    const url = new URL(link);
    next = `${url.pathname}${url.search}`;
  }
  return all;
}

async function revoke(privateKeyPem, cert) {
  const id = cert.id;
  const type = cert.attributes?.certificateType || "unknown";
  const name = cert.attributes?.displayName || id;
  try {
    await asc(privateKeyPem, "DELETE", `/v1/certificates/${id}`);
    console.log(`prune-ios-certificates: revoked ${type} ${name} (${id})`);
    return true;
  } catch (err) {
    console.warn(`prune-ios-certificates: could not revoke ${id}: ${err.message}`);
    return false;
  }
}

function sortNewestFirst(certs) {
  return [...certs].sort((a, b) => {
    const ea = Date.parse(a.attributes?.expirationDate || "") || 0;
    const eb = Date.parse(b.attributes?.expirationDate || "") || 0;
    return eb - ea;
  });
}

async function main() {
  const privateKey = readPrivateKey();
  if (!keyId || !issuerId || !privateKey) {
    console.warn("prune-ios-certificates: missing API key, skipping.");
    return;
  }

  const certs = await listAllCertificates(privateKey);
  console.log(`prune-ios-certificates: found ${certs.length} certificate(s)`);

  const dev = certs.filter((c) => DEV_TYPES.has(c.attributes?.certificateType));
  const dist = certs.filter((c) => DIST_TYPES.has(c.attributes?.certificateType));
  const other = certs.filter((c) => !DEV_TYPES.has(c.attributes?.certificateType) && !DIST_TYPES.has(c.attributes?.certificateType));

  let revoked = 0;

  for (const cert of dev) {
    if (await revoke(privateKey, cert)) revoked += 1;
  }

  const distSorted = sortNewestFirst(dist);
  for (const cert of distSorted.slice(1)) {
    if (await revoke(privateKey, cert)) revoked += 1;
  }

  const remaining = await listAllCertificates(privateKey);
  if (remaining.length >= 3) {
    const sorted = sortNewestFirst(remaining);
    for (const cert of sorted.slice(2)) {
      if (await revoke(privateKey, cert)) revoked += 1;
    }
  }

  for (const cert of other) {
    const exp = Date.parse(cert.attributes?.expirationDate || "");
    if (exp && exp < Date.now()) {
      if (await revoke(privateKey, cert)) revoked += 1;
    }
  }

  const finalCount = (await listAllCertificates(privateKey)).length;
  console.log(`prune-ios-certificates: revoked ${revoked}, ${finalCount} certificate(s) remain`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
