import { StrictMode } from "react";

import { createRoot } from "react-dom/client";

import EchelonApp from "../mob";
import { isCapacitorIos } from "../native-shell.js";

function applyShellLayoutClass() {
  const root = document.documentElement;
  try {
    if (isCapacitorIos()) root.classList.add("echelon-native", "echelon-ios");
    const ua = navigator.userAgent || "";
    const ipad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ipad) root.classList.add("echelon-tablet");
  } catch { /* ignore */ }
}
applyShellLayoutClass();

if ("serviceWorker" in navigator && !import.meta.env.DEV && !isCapacitorIos()) {
  navigator.serviceWorker.register("/app/sw.js").catch(() => {});
}



createRoot(document.getElementById("root")!).render(

  <StrictMode>

    <EchelonApp />

  </StrictMode>

);


