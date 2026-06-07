/** True when running inside the Echelon Capacitor iOS shell (TestFlight / App Store). */
export function isCapacitorIos() {
  if (typeof window === "undefined") return false;
  try {
    const cap = window.Capacitor;
    return !!(cap?.isNativePlatform?.() && cap?.getPlatform?.() === "ios");
  } catch {
    return false;
  }
}

/** Native Capacitor plugin compiled into the IPA (false on older TestFlight builds). */
export function isCapacitorPluginAvailable(name) {
  if (!isCapacitorIos()) return false;
  try {
    const cap = window.Capacitor;
    if (typeof cap?.isPluginAvailable === "function") {
      return cap.isPluginAvailable(name);
    }
  } catch {
    return false;
  }
  return false;
}

export function useNativeAppleSignIn() {
  return isCapacitorPluginAvailable("SignInWithApple");
}

export function useNativeGoogleSignIn() {
  // ITMS-91061: iOS IPA excludes GoogleSignIn native SDK; Gmail uses web GIS in WKWebView.
  if (isCapacitorIos()) return false;
  return isCapacitorPluginAvailable("GoogleAuth");
}

/** App Store / TestFlight distribution (native shell, meta tag, or injected bridge). */
export function isEchelonAppStoreShell() {
  if (typeof window === "undefined") return false;
  const native = window.EchelonNative;
  if (native?.fromAppStore === true || native?.distribution === "appstore") return true;
  if (document.querySelector('meta[name="echelon-distribution"][content="appstore"]')) return true;
  if (isCapacitorIos()) return true;
  try {
    return /iphone|ipad|ipod/i.test(navigator.userAgent)
      && window.navigator.standalone === true
      && localStorage.getItem("echelon-channel") === "appstore";
  } catch {
    return false;
  }
}
