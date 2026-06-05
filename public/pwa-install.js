let deferredPrompt = typeof window !== "undefined" ? window.__echelonBip || null : null;

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true
  );
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isMobile() {
  return isIos() || /android/i.test(navigator.userAgent);
}

export function isSafariBrowser() {
  const ua = navigator.userAgent || "";
  if (!isIos()) return /safari/i.test(ua) && !/chrome|crios|fxios|edgios|opios/i.test(ua);
  return /safari/i.test(ua) && !/crios|fxios|edgios|opios|gsa/i.test(ua);
}

/** Instagram, Facebook, TikTok, etc. — A2HS usually fails until opened in real browser. */
export function isInAppBrowser() {
  const ua = navigator.userAgent || "";
  if (/(FBAN|FBAV|Instagram|Line\/|Twitter|TweetDeck|TikTok|Snapchat|LinkedInApp|Pinterest|MicroMessenger|GSA\/)/i.test(ua)) {
    return true;
  }
  if (isIos() && /AppleWebKit/i.test(ua) && !isSafariBrowser()) return true;
  return false;
}

/** True when running inside the iOS App Store build (native shell or marked distribution). */
export function isEchelonIosAppStore() {
  if (typeof window === "undefined") return false;
  const native = window.EchelonNative;
  if (native?.fromAppStore === true || native?.distribution === "appstore") return true;
  if (document.querySelector('meta[name="echelon-distribution"][content="appstore"]')) return true;
  try {
    return isIos() && isStandalone() && localStorage.getItem("echelon-channel") === "appstore";
  } catch {
    return false;
  }
}

/**
 * Install UX mode:
 * - native: Chrome/Edge/Samsung beforeinstallprompt available → one-tap browser dialog
 * - ios-coach: Safari on iOS → visual coach (Share → Add to Home Screen)
 * - external: in-app browser → open in Safari/Chrome first
 * - android-coach: Android without prompt yet → menu instructions
 * - installed: already standalone
 */
export function getInstallKind(state = {}) {
  if (isStandalone()) return "installed";
  if (state.native || deferredPrompt) return "native";
  if (isInAppBrowser()) return "external";
  if (isIos()) return "ios-coach";
  if (isMobile()) return "android-coach";
  return "android-coach";
}

/** Subscribe to install availability. Returns cleanup. */
export function initPwaInstall(onChange) {
  const emit = () => {
    if (isStandalone()) {
      onChange({
        installed: true,
        native: false,
        ios: isIos(),
        mobile: isMobile(),
        kind: "installed",
        inApp: false,
        safari: isSafariBrowser(),
      });
      return;
    }
    const native = !!deferredPrompt;
    onChange({
      installed: false,
      native,
      ios: isIos(),
      mobile: isMobile(),
      kind: getInstallKind({ native }),
      inApp: isInAppBrowser(),
      safari: isSafariBrowser(),
    });
  };

  if (isStandalone()) {
    emit();
    return () => {};
  }

  const onPrompt = (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (typeof window !== "undefined") window.__echelonBip = e;
    emit();
  };
  const onInstalled = () => {
    deferredPrompt = null;
    onChange({
      installed: true,
      native: false,
      ios: isIos(),
      mobile: isMobile(),
      kind: "installed",
      inApp: false,
      safari: isSafariBrowser(),
    });
  };

  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  emit();

  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

/** Native install prompt (Chrome/Edge Android). Returns true if accepted. */
export async function triggerInstall() {
  if (!deferredPrompt) return false;
  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === "accepted";
  } catch {
    deferredPrompt = null;
    return false;
  }
}

/**
 * Single entry: try native install, else return which coach UI to show.
 * @returns {{ action: 'installed'|'accepted'|'dismissed'|'coach'|'external', kind?: string }}
 */
export async function requestInstall() {
  if (isStandalone()) return { action: "installed" };
  if (deferredPrompt) {
    const accepted = await triggerInstall();
    return { action: accepted ? "accepted" : "dismissed" };
  }
  if (isInAppBrowser()) return { action: "external", kind: "external" };
  return { action: "coach", kind: getInstallKind() };
}

/** Opens the native share sheet (iOS/Android) — user picks Add to Home Screen there. */
export async function triggerWebShareInstall() {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    const url = `${window.location.origin}/app/`;
    await navigator.share({
      title: "Echelon",
      text: "Add Echelon to your home screen for one-tap access.",
      url,
    });
    return true;
  } catch (e) {
    return e?.name !== "AbortError" ? false : false;
  }
}

/** Best-effort jump from in-app webview to system browser. */
export function openInExternalBrowser() {
  const url = window.location.href;
  try {
    if (/android/i.test(navigator.userAgent)) {
      const path = url.replace(/^https?:\/\//, "");
      window.location.href = `intent://${path}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end`;
      setTimeout(() => { window.location.href = url; }, 600);
      return;
    }
    if (isIos()) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
  } catch { /* fall through */ }
  window.location.href = url;
}

/** For homepage script tag (non-module). */
if (typeof window !== "undefined") {
  window.EchelonPwa = {
    isStandalone,
    isIos,
    isMobile,
    isSafariBrowser,
    isInAppBrowser,
    isEchelonIosAppStore,
    getInstallKind,
    initPwaInstall,
    triggerInstall,
    requestInstall,
    triggerWebShareInstall,
    openInExternalBrowser,
  };
}
