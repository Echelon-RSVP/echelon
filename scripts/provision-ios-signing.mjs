/**
 * Ensure iOS Distribution cert + App Store profile for CI export (manual signing).
 * Uses App Store Connect API with the existing API key (App Manager is enough).
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.env.IOS_SIGNING_DIR || path.join(root, ".ios-signing");
const BUNDLE_ID = "rsvp.echelon.app";
const PROFILE_NAME = process.env.IOS_PROVISIONING_PROFILE_NAME || "Echelon App Store CI";
const CERT_NAME = "Echelon GitHub Actions Distribution";

const keyId = process.env.APPSTORE_KEY_ID?.trim();
const issuerId = process.env.APPSTORE_ISSUER_ID?.trim();
const apiKeyPath = process.env.APPSTORE_KEY_PATH?.trim() || process.env.API_KEY_PATH?.trim();
const p12Password = process.env.IOS_P12_PASSWORD?.trim() || "echelon-ci-signing";

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

async function asc(method, route, body) {
  const privateKey = fs.readFileSync(apiKeyPath, "utf8");
  const res = await fetch(`https://api.appstoreconnect.apple.com${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${ascToken(privateKey)}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ASC ${method} ${route} -> ${res.status}: ${text.slice(0, 600)}`);
  return JSON.parse(text);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeOutputs(p12File, profileFile, profileName) {
  const meta = {
    p12: p12File,
    profile: profileFile,
    profileName,
    p12Password,
    p12Base64: fs.readFileSync(p12File).toString("base64"),
    profileBase64: fs.readFileSync(profileFile).toString("base64"),
  };
  fs.writeFileSync(path.join(outDir, "signing-meta.json"), JSON.stringify(meta, null, 2));
  if (process.env.GITHUB_ENV) {
    const envPath = process.env.GITHUB_ENV;
    fs.appendFileSync(envPath, `IOS_SIGNING_P12=${p12File}\n`);
    fs.appendFileSync(envPath, `IOS_SIGNING_PROFILE=${profileFile}\n`);
    fs.appendFileSync(envPath, `IOS_PROVISIONING_PROFILE_NAME=${profileName}\n`);
    fs.appendFileSync(envPath, `IOS_P12_PASSWORD=${p12Password}\n`);
  }
  console.log(`provision-ios-signing: p12=${p12File}`);
  console.log(`provision-ios-signing: profile=${profileFile} (${profileName})`);
}

function generateCsr() {
  const keyFile = path.join(outDir, "distribution.key");
  const csrFile = path.join(outDir, "distribution.csr");
  if (!fs.existsSync(keyFile)) {
    execSync(`openssl genrsa -out "${keyFile}" 2048`, { stdio: "inherit" });
  }
  if (!fs.existsSync(csrFile)) {
    execSync(
      `openssl req -new -key "${keyFile}" -out "${csrFile}" -subj "/CN=${CERT_NAME}/O=Echelon RSVP/C=PT"`,
      { stdio: "inherit" },
    );
  }
  return { keyFile, csrFile, csrContent: fs.readFileSync(csrFile, "utf8") };
}

function buildP12(keyFile, certPem) {
  const certFile = path.join(outDir, "distribution.cer.pem");
  const p12File = path.join(outDir, "distribution.p12");
  fs.writeFileSync(certFile, certPem);
  execSync(
    `openssl pkcs12 -export -out "${p12File}" -inkey "${keyFile}" -in "${certFile}" -password pass:${p12Password}`,
    { stdio: "inherit" },
  );
  return p12File;
}

async function getBundleIdId() {
  const data = await asc("GET", `/v1/bundleIds?filter[identifier]=${BUNDLE_ID}`);
  const id = data.data?.[0]?.id;
  if (!id) throw new Error(`Bundle ID ${BUNDLE_ID} not found`);
  return id;
}

async function getOrCreateDistributionCert(csrContent) {
  const existing = await asc("GET", "/v1/certificates?filter[certificateType]=DISTRIBUTION&limit=20");
  if (existing.data?.length) {
    console.log(`provision-ios-signing: found distribution cert ${existing.data[0].id}`);
    return existing.data[0];
  }
  for (const certificateType of ["DISTRIBUTION", "IOS_DISTRIBUTION"]) {
    try {
      const created = await asc("POST", "/v1/certificates", {
        data: { type: "certificates", attributes: { certificateType, csrContent } },
      });
      console.log(`provision-ios-signing: created distribution cert ${created.data.id}`);
      return created.data;
    } catch (err) {
      console.warn(`provision-ios-signing: ${certificateType}: ${err.message}`);
    }
  }
  throw new Error("Could not create distribution certificate");
}

async function getOrCreateProfile(bundleIdId, certificateId) {
  const all = await asc("GET", "/v1/profiles?filter[profileType]=IOS_APP_STORE&limit=50");
  const match = all.data?.find((p) => p.attributes?.name === PROFILE_NAME);
  if (match) {
    console.log(`provision-ios-signing: found profile ${match.id}`);
    return match;
  }
  const created = await asc("POST", "/v1/profiles", {
    data: {
      type: "profiles",
      attributes: { name: PROFILE_NAME, profileType: "IOS_APP_STORE" },
      relationships: {
        bundleId: { data: { type: "bundleIds", id: bundleIdId } },
        certificates: { data: [{ type: "certificates", id: certificateId }] },
      },
    },
  });
  console.log(`provision-ios-signing: created profile ${created.data.id}`);
  return created.data;
}

async function loadFromSecrets() {
  const p12B64 = process.env.IOS_DISTRIBUTION_P12_BASE64?.trim();
  const profileB64 = process.env.IOS_PROVISIONING_PROFILE_BASE64?.trim();
  if (!p12B64 || !profileB64) return false;

  ensureDir(outDir);
  const p12File = path.join(outDir, "distribution.p12");
  const profileFile = path.join(outDir, "Echelon_App_Store.mobileprovision");
  fs.writeFileSync(p12File, Buffer.from(p12B64, "base64"));
  fs.writeFileSync(profileFile, Buffer.from(profileB64, "base64"));
  console.log("provision-ios-signing: loaded signing assets from GitHub secrets");
  writeOutputs(p12File, profileFile, process.env.IOS_PROVISIONING_PROFILE_NAME || PROFILE_NAME);
  return true;
}

async function bootstrap() {
  ensureDir(outDir);
  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, "IOS_SIGNING_BOOTSTRAPPED=true\n");
  }
  const { keyFile, csrContent } = generateCsr();
  const bundleIdId = await getBundleIdId();
  const cert = await getOrCreateDistributionCert(csrContent);
  const profile = await getOrCreateProfile(bundleIdId, cert.id);

  const certDetail = await asc("GET", `/v1/certificates/${cert.id}`);
  const profileDetail = await asc("GET", `/v1/profiles/${profile.id}`);
  const certPem = Buffer.from(certDetail.data.attributes.certificateContent, "base64").toString("utf8");
  const profileFile = path.join(outDir, "Echelon_App_Store.mobileprovision");
  fs.writeFileSync(profileFile, Buffer.from(profileDetail.data.attributes.profileContent, "base64"));

  const p12File = buildP12(keyFile, certPem);
  writeOutputs(p12File, profileFile, PROFILE_NAME);
}

async function main() {
  if (!keyId || !issuerId || !apiKeyPath) {
    throw new Error("APPSTORE_KEY_ID, APPSTORE_ISSUER_ID, and API_KEY_PATH are required");
  }
  if (!(await loadFromSecrets())) {
    await bootstrap();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
