import { StrictMode } from "react";

import { createRoot } from "react-dom/client";

import EchelonApp from "../mob";



if ("serviceWorker" in navigator && !import.meta.env.DEV) {
  navigator.serviceWorker.register("/app/sw.js").catch(() => {});
}



createRoot(document.getElementById("root")!).render(

  <StrictMode>

    <EchelonApp />

  </StrictMode>

);


