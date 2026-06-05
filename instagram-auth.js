import { isIos } from "./pwa-install.js";

/**
 * Instagram Login must complete in the mobile browser (Safari / Chrome).
 * Deep links and Android intents open the Instagram app but break the OAuth
 * redirect back to Echelon — never use instagram:// or intent:// for OAuth.
 *
 * iOS: #weblink keeps the flow in Safari instead of a broken in-app handoff.
 * @see https://developers.facebook.com/community/threads/922374286525063/
 */
export function openInstagramAuth(authUrl) {
  if (!authUrl || typeof window === "undefined") return;

  let url = authUrl;
  if (isIos() && !url.includes("#weblink")) {
    url = `${url}#weblink`;
  }

  window.location.assign(url);
}
