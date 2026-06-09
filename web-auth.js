import { isCapacitorIos, useNativeGoogleSignIn } from "./native-shell.js";

const GOOGLE_SRC = "https://accounts.google.com/gsi/client";

let googleReady = false;
let googleClientId = null;
let googleIosClientId = null;
let googleIosRedirectUri = null;
let googleNative = false;
let googleBrowser = false;
let googleInitError = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Google Sign-In"));
    document.head.appendChild(s);
  });
}

async function initGoogleAuthNative(webClientId, iosClientId) {
  const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
  GoogleAuth.initialize({
    clientId: iosClientId || webClientId,
    scopes: ["profile", "email"],
  });
}

async function initGoogleAuthWeb(clientId) {
  await loadScript(GOOGLE_SRC);
  if (!window.google?.accounts?.id) throw new Error("Google Sign In unavailable");
  googleClientId = clientId;
}

function base64Url(bytes) {
  const str = btoa(String.fromCharCode(...bytes));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Base64Url(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return base64Url(new Uint8Array(digest));
}

function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64Url(arr);
}

function iosSchemeFromClientId(clientId) {
  const suffix = ".apps.googleusercontent.com";
  if (!clientId?.endsWith(suffix)) return null;
  return `com.googleusercontent.apps.${clientId.slice(0, -suffix.length)}`;
}

function iosRedirectUri(clientId) {
  const scheme = iosSchemeFromClientId(clientId);
  return scheme ? `${scheme}:/oauth2redirect/google` : null;
}

export async function initGoogleAuth(clientIdOrCfg) {
  const webClientId =
    typeof clientIdOrCfg === "string" ? clientIdOrCfg : clientIdOrCfg?.googleClientId;
  const iosClientId =
    typeof clientIdOrCfg === "object" ? clientIdOrCfg?.googleIosClientId : null;
  if (!webClientId) throw new Error("Google Sign In not configured");
  googleInitError = null;
  googleBrowser = false;
  googleNative = useNativeGoogleSignIn();
  googleIosClientId = iosClientId || null;
  googleIosRedirectUri = googleIosClientId ? iosRedirectUri(googleIosClientId) : null;

  if (isCapacitorIos() && googleIosClientId && googleIosRedirectUri) {
    googleClientId = webClientId;
    googleReady = true;
    googleBrowser = true;
    return;
  }

  if (googleNative) {
    try {
      await initGoogleAuthNative(webClientId, iosClientId);
      googleClientId = webClientId;
      googleReady = true;
      return;
    } catch (err) {
      googleNative = false;
      googleInitError = err;
    }
  }

  try {
    await initGoogleAuthWeb(webClientId);
    googleReady = true;
  } catch (err) {
    googleInitError = err;
    throw err;
  }
}

export function isGoogleAuthUnavailable() {
  return !googleReady && !!googleInitError;
}

async function signInWithGmailNative() {
  const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
  const res = await GoogleAuth.signIn();
  const token = res?.authentication?.idToken;
  if (!token) throw new Error("Gmail sign-in cancelled");
  return token;
}

async function signInWithGmailBrowser() {
  if (!googleIosClientId || !googleIosRedirectUri) {
    throw new Error("Gmail sign-in is not configured for iOS yet.");
  }
  const { Browser } = await import("@capacitor/browser");
  const { App } = await import("@capacitor/app");
  const state = randomToken(24);
  const codeVerifier = randomToken(48);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", googleIosClientId);
  authUrl.searchParams.set("redirect_uri", googleIosRedirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("prompt", "select_account");

  return new Promise(async (resolve, reject) => {
    let settled = false;
    let sub = null;
    const finish = async (fn, value) => {
      if (settled) return;
      settled = true;
      try { await sub?.remove?.(); } catch { /* noop */ }
      try { await Browser.close(); } catch { /* noop */ }
      fn(value);
    };
    sub = await App.addListener("appUrlOpen", ({ url }) => {
      try {
        if (!url?.startsWith(googleIosRedirectUri)) return;
        const parsed = new URL(url);
        if (parsed.searchParams.get("state") !== state) {
          finish(reject, new Error("Gmail sign-in state mismatch"));
          return;
        }
        const err = parsed.searchParams.get("error");
        if (err) {
          finish(reject, new Error(err === "access_denied" ? "Gmail sign-in cancelled" : `Gmail sign-in failed: ${err}`));
          return;
        }
        const code = parsed.searchParams.get("code");
        if (!code) {
          finish(reject, new Error("Gmail sign-in returned no code"));
          return;
        }
        finish(resolve, {
          code,
          codeVerifier,
          redirectUri: googleIosRedirectUri,
          clientId: googleIosClientId,
        });
      } catch (e) {
        finish(reject, e);
      }
    });
    try {
      await Browser.open({ url: authUrl.toString(), presentationStyle: "popover" });
    } catch (e) {
      finish(reject, e);
    }
    setTimeout(() => {
      finish(reject, new Error("Gmail sign-in timed out"));
    }, 180000);
  });
}

function signInWithGmailWeb() {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn) => (val) => {
      if (settled) return;
      settled = true;
      fn(val);
    };

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      ux_mode: "popup",
      callback: (res) => {
        if (res?.credential) done(resolve)(res.credential);
        else done(reject)(new Error("Gmail sign-in cancelled"));
      },
    });

    window.google.accounts.id.prompt((notification) => {
      if (settled) return;
      if (notification.isNotDisplayed()) {
        const reason = notification.getNotDisplayedReason?.() || "unknown";
        if (reason === "browser_not_supported" || reason === "invalid_client") {
          done(reject)(new Error("Gmail sign-in not available in this browser"));
          return;
        }
        const overlay = document.createElement("div");
        overlay.className = "gmail-signin-overlay";
        overlay.innerHTML = '<div class="gmail-signin-box"><p>Choose your Google account</p><div id="gmail-fallback-btn"></div></div>';
        document.body.appendChild(overlay);
        const box = overlay.querySelector("#gmail-fallback-btn");
        window.google.accounts.id.renderButton(box, {
          type: "standard",
          theme: "filled_blue",
          size: "large",
          text: "continue_with",
          width: 280,
        });
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) {
            overlay.remove();
            done(reject)(new Error("Gmail sign-in cancelled"));
          }
        });
        return;
      }
      if (notification.isSkippedMoment?.()) {
        /* wait for callback */
      }
    });

    setTimeout(() => {
      if (!settled) done(reject)(new Error("Gmail sign-in timed out"));
    }, 120000);
  });
}

/** Custom "Continue with Gmail" — native on iOS when compiled in, else web GIS. */
export async function signInWithGmail() {
  if (!googleReady || !googleClientId) {
    if (isCapacitorIos()) {
      throw new Error("Gmail sign-in is not configured for iOS yet.");
    }
    throw new Error("Gmail sign-in not configured");
  }

  if (googleBrowser) return signInWithGmailBrowser();

  if (googleNative) {
    try {
      return await signInWithGmailNative();
    } catch (err) {
      const msg = String(err?.message || err || "");
      if (msg.includes("not implemented") || msg.includes("UNIMPLEMENTED")) {
        googleNative = false;
        if (!window.google?.accounts?.id) {
          await initGoogleAuthWeb(googleClientId);
        }
        return signInWithGmailWeb();
      }
      throw err;
    }
  }

  return signInWithGmailWeb();
}

export async function fetchAuthConfig() {
  const base =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
    "/api/v1";
  const res = await fetch(`${base}/auth/config`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Auth not configured");
  const envClient =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_GOOGLE_CLIENT_ID;
  if (envClient && !data.googleClientId) data.googleClientId = envClient;
  if (data.googleClientId && !data.methods?.includes("google")) {
    data.methods = [...(data.methods || []), "google"];
  }
  return data;
}
