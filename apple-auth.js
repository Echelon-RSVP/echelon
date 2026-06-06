import {
  isCapacitorIos,
  isEchelonAppStoreShell,
  useNativeAppleSignIn,
} from "./native-shell.js";

const APPLE_NATIVE_CLIENT_ID = "rsvp.echelon.app";

let appleReady = false;
let appleConfig = null;
let appleNative = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Sign in with Apple"));
    document.head.appendChild(s);
  });
}

const APPLE_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

async function initAppleAuthWeb(config) {
  await loadScript(APPLE_SRC);
  if (!window.AppleID?.auth) throw new Error("Apple Sign In unavailable");
  window.AppleID.auth.init({
    clientId: config.clientId,
    scope: "name email",
    redirectURI: config.redirectUri || `${window.location.origin}/app/`,
    state: "echelon",
    usePopup: true,
  });
}

export async function initAppleAuth(config) {
  if (!config?.clientId) throw new Error("Apple Sign In is not configured");
  appleConfig = config;
  appleNative = useNativeAppleSignIn();
  if (appleNative) {
    appleReady = true;
    return;
  }
  await initAppleAuthWeb(config);
  appleReady = true;
}

async function signInWithAppleNative() {
  const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
  const clientId = appleConfig?.clientId || APPLE_NATIVE_CLIENT_ID;
  const redirectURI = appleConfig?.redirectUri || "https://echelon.rsvp/app/";
  const res = await SignInWithApple.authorize({
    clientId,
    redirectURI,
    scopes: "email name",
    state: "echelon",
    nonce: "echelon-native",
  });
  const body = res?.response;
  const idToken = body?.identityToken;
  if (!idToken) throw new Error("Apple did not return an identity token");
  const name = [body?.givenName, body?.familyName].filter(Boolean).join(" ").trim() || null;
  return {
    idToken,
    name,
    email: body?.email || null,
  };
}

async function signInWithAppleWeb() {
  if (!appleReady || !window.AppleID?.auth) {
    throw new Error("Apple Sign In not initialized");
  }
  const res = await window.AppleID.auth.signIn();
  const idToken = res?.authorization?.id_token;
  if (!idToken) throw new Error("Apple did not return an identity token");

  let name = null;
  const u = res.user;
  if (u?.name) {
    name = [u.name.firstName, u.name.lastName].filter(Boolean).join(" ").trim() || null;
  }

  return {
    idToken,
    name,
    email: u?.email || null,
  };
}

export async function signInWithApple() {
  if (!appleReady) throw new Error("Apple Sign In not initialized");
  if (appleNative) {
    try {
      return await signInWithAppleNative();
    } catch (err) {
      const msg = String(err?.message || err || "");
      if (msg.includes("not implemented") || msg.includes("UNIMPLEMENTED")) {
        appleNative = false;
        if (!window.AppleID?.auth && appleConfig) {
          await initAppleAuthWeb(appleConfig);
        }
        return signInWithAppleWeb();
      }
      throw err;
    }
  }
  return signInWithAppleWeb();
}

export function shouldAutoSignInWithApple() {
  return isEchelonAppStoreShell() && useNativeAppleSignIn();
}

/** Native App Store shell: silent Apple sign-in only when the native plugin exists. */
export async function tryAutoSignInWithApple() {
  if (!shouldAutoSignInWithApple()) return null;

  const native = window.EchelonNative;
  if (native?.getAppleCredential) {
    const cred = await native.getAppleCredential();
    if (cred?.idToken) {
      return {
        idToken: cred.idToken,
        name: cred.name || null,
        email: cred.email || null,
      };
    }
  }

  if (!appleReady || !appleNative) return null;

  try {
    return await signInWithAppleNative();
  } catch (err) {
    const code = err?.code || err?.message || "";
    if (String(code).includes("1001") || String(code).toLowerCase().includes("cancel")) {
      return null;
    }
    return null;
  }
}

export async function fetchAppleConfig() {
  const base =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
    "/api/v1";
  const res = await fetch(`${base}/auth/apple/config`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Apple Sign In not configured");
  return data;
}
