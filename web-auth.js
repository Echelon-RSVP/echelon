const GOOGLE_SRC = "https://accounts.google.com/gsi/client";

let googleReady = false;
let googleClientId = null;

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

export async function initGoogleAuth(clientId) {
  if (!clientId) throw new Error("Google Sign In not configured");
  await loadScript(GOOGLE_SRC);
  if (!window.google?.accounts?.id) throw new Error("Google Sign In unavailable");
  googleClientId = clientId;
  googleReady = true;
}

/** Custom "Continue with Gmail" — opens Google account picker (popup). */
export function signInWithGmail() {
  if (!googleReady || !googleClientId) {
    return Promise.reject(new Error("Gmail sign-in not configured"));
  }
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
        // Fallback: render official button in a light overlay
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
        // One Tap skipped — popup may still open; wait for callback
      }
    });

    setTimeout(() => {
      if (!settled) done(reject)(new Error("Gmail sign-in timed out"));
    }, 120000);
  });
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
