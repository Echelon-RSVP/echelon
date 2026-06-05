let appleReady = false;

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

export async function initAppleAuth(config) {
  if (!config?.clientId) throw new Error("Apple Sign In is not configured");
  await loadScript(APPLE_SRC);
  if (!window.AppleID?.auth) throw new Error("Apple Sign In unavailable");
  window.AppleID.auth.init({
    clientId: config.clientId,
    scope: "name email",
    redirectURI: config.redirectUri || `${window.location.origin}/app/`,
    state: "echelon",
    usePopup: true,
  });
  appleReady = true;
}

export async function signInWithApple() {
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

export function shouldAutoSignInWithApple() {
  if (typeof window === "undefined") return false;
  const native = window.EchelonNative;
  if (native?.fromAppStore === true || native?.distribution === "appstore") return true;
  return !!document.querySelector('meta[name="echelon-distribution"][content="appstore"]');
}

/** Native App Store shell can return stored Apple credentials without a popup. */
export async function tryAutoSignInWithApple() {
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
  return null;
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
