/**
 * Register an iOS device in App Store Connect (required for automatic signing).
 * Set CI_DEVICE_UDID in GitHub secrets to your iPhone UDID.
 */
import crypto from "crypto";

const API = "https://api.appstoreconnect.apple.com/v1/devices";
const CI_UDID = process.env.CI_DEVICE_UDID?.trim();
const CI_NAME = process.env.CI_DEVICE_NAME?.trim() || "Echelon iPhone";

function base64url(data) {
  return Buffer.from(data).toString("base64url");
}

function ascToken(keyId, issuerId, privateKeyPem) {
  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(JSON.stringify({
    iss: issuerId,
    iat: now,
    exp: now + 1200,
    aud: "appstoreconnect-v1",
  }));
  const input = `${header}.${payload}`;
  const sig = crypto.sign("sha256", Buffer.from(input), {
    key: crypto.createPrivateKey(privateKeyPem),
    dsaEncoding: "ieee-p1363",
  });
  return `${input}.${sig.toString("base64url")}`;
}

async function main() {
  const keyId = process.env.APPSTORE_KEY_ID?.trim();
  const issuerId = process.env.APPSTORE_ISSUER_ID?.trim();
  const privateKey = process.env.APPSTORE_PRIVATE_KEY?.trim();

  if (!keyId || !issuerId || !privateKey) {
    console.warn("register-asc-device: missing API key env, skipping.");
    return;
  }
  if (!CI_UDID) {
    console.warn("register-asc-device: CI_DEVICE_UDID not set, skipping.");
    return;
  }

  const token = ascToken(keyId, issuerId, privateKey);
  const body = {
    data: {
      type: "devices",
      attributes: {
        name: CI_NAME,
        platform: "IOS",
        udid: CI_UDID,
      },
    },
  };

  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    console.log(`register-asc-device: registered ${CI_NAME} (${CI_UDID})`);
    return;
  }

  const text = await res.text();
  if (res.status === 409 || text.includes("already exists") || text.includes("ENTITY_ERROR")) {
    console.log("register-asc-device: device already registered, continuing.");
    return;
  }

  console.warn(`register-asc-device: API ${res.status} ${text}`);
  console.warn("register-asc-device: continuing anyway (distribution signing may still work).");
}

main().catch((err) => {
  console.warn("register-asc-device:", err.message);
});
