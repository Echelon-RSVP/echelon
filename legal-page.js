/** Standalone legal pages (privacy.html, terms.html, cookies.html). */

function isAppLegalPage() {
  return location.pathname.includes("/app/");
}

function legalHomeHref() {
  return isAppLegalPage() ? "/app/" : "/";
}

const FILE_DOC = {
  "privacy.html": "privacy",
  "terms.html": "terms",
  "cookies.html": "cookies",
  "data-deletion.html": "data_deletion",
};

function pageDoc() {
  const file = (location.pathname.split("/").pop() || "privacy.html").toLowerCase();
  return FILE_DOC[file] || "privacy";
}

function t(lang, key) {
  return window.EchelonI18n?.t(lang, key) ?? key;
}

function renderLegalNav(lang, activeDoc) {
  const nav = document.getElementById("legal-nav");
  if (!nav) return;
  const prefix = isAppLegalPage() ? "" : "/";
  const links = [
    ["privacy", `${prefix}privacy.html`, "legal.privacy"],
    ["terms", `${prefix}terms.html`, "legal.terms"],
    ["cookies", `${prefix}cookies.html`, "legal.cookies"],
    ["data_deletion", `${prefix}data-deletion.html`, "legal.dataDeletion"],
    ["settings", `${prefix}cookies.html#settings`, "legal.cookieSettings"],
  ];
  nav.innerHTML = links.map(([doc, href, key]) => {
    const isActive = doc === "settings"
      ? activeDoc === "cookies" && location.hash === "#settings"
      : doc === "data_deletion"
        ? activeDoc === "data_deletion"
        : doc === activeDoc && (doc !== "cookies" || location.hash !== "#settings");
    return `<a href="${href}"${isActive ? ' aria-current="page"' : ""}>${t(lang, key)}</a>`;
  }).join("");
}

function showDeletionConfirmation(lang) {
  if (pageDoc() !== "data_deletion") return;
  const code = new URLSearchParams(location.search).get("code");
  if (!code) return;
  const bodyEl = document.getElementById("legal-page-body");
  if (!bodyEl) return;
  const note = document.createElement("div");
  note.className = "legal-deletion-status";
  note.style.cssText = "margin-bottom:20px;padding:16px 18px;background:rgba(255,255,255,.75);border:1px solid rgba(183,156,240,.45);border-radius:16px;font-size:14px;line-height:1.55;color:#5A4A60";
  note.innerHTML = `<strong>${t(lang, "legal.deletionConfirmed")}</strong><br><span style="font-size:13px;color:#7B6A86">${t(lang, "legal.deletionCode")}: <code style="font-weight:800;color:#6B4FA8">${code.replace(/[<>&"']/g, "")}</code></span>`;
  bodyEl.prepend(note);
}

function renderLegalContent(lang, docType) {
  const L = window.EchelonLegal;
  const I = window.EchelonI18n;
  if (!L || !I) return;
  const meta = L.getLegalDoc(lang, docType);
  if (!meta) return;
  document.title = `${meta.title} · echelon`;
  document.documentElement.lang = lang;
  const titleEl = document.getElementById("legal-page-title");
  if (titleEl) titleEl.textContent = meta.title;
  const bodyEl = document.getElementById("legal-page-body");
  if (bodyEl) bodyEl.innerHTML = L.renderLegalBodyHtml(lang, docType);
  showDeletionConfirmation(lang);
}

function initCookieBanner(lang) {
  const L = window.EchelonLegal;
  const banner = document.getElementById("cookie-banner");
  if (!L || !banner || L.hasCookieConsent()) return;
  banner.hidden = false;
  const prefs = document.getElementById("cookie-prefs-panel");
  const manage = document.getElementById("cookie-manage");
  const save = document.getElementById("cookie-save");
  const accept = document.getElementById("cookie-accept");
  const reject = document.getElementById("cookie-reject");
  const functional = document.getElementById("cookie-functional");
  let managing = false;

  const hide = (consent) => {
    L.saveCookieConsent(consent);
    banner.hidden = true;
  };

  manage.addEventListener("click", () => {
    managing = !managing;
    prefs.hidden = !managing;
    save.hidden = !managing;
    manage.textContent = managing ? t(lang, "legal.close") : t(lang, "cookie.manage");
  });

  accept.addEventListener("click", () => hide({ functional: true, analytics: false }));
  reject.addEventListener("click", () => hide({ functional: false, analytics: false }));
  save.addEventListener("click", () => hide({ functional: functional.checked, analytics: false }));
}

function initCookieSettingsPanel(lang) {
  const panel = document.getElementById("cookie-settings-panel");
  if (!panel || pageDoc() !== "cookies") return;
  const L = window.EchelonLegal;
  const functional = document.getElementById("page-cookie-functional");
  const save = document.getElementById("page-cookie-save");
  if (!L || !functional || !save) return;

  const c = L.getCookieConsent();
  if (c) functional.checked = !!c.functional;

  save.addEventListener("click", () => {
    L.saveCookieConsent({ functional: functional.checked, analytics: false });
    save.textContent = t(lang, "cookie.saved") || "Saved";
    setTimeout(() => { save.textContent = t(lang, "cookie.save"); }, 1800);
  });

  if (location.hash === "#settings") {
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function initLegalCloseButton(lang) {
  const inner = document.querySelector(".legal-top-inner");
  if (!inner || document.getElementById("legal-page-close")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "legal-page-close";
  btn.className = "legal-page-close";
  btn.setAttribute("aria-label", t(lang, "legal.close") || "Close");
  btn.innerHTML = "&#10005;";
  btn.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    const ref = document.referrer || "";
    window.location.href = legalHomeHref();
  });
  inner.appendChild(btn);
}

function initLangTabs(getLang, setLang, onLang) {
  const I = window.EchelonI18n;
  const tabsEl = document.getElementById("lang-tabs");
  if (!I || !tabsEl) return;

  function renderTabs() {
    const lang = getLang();
    tabsEl.innerHTML = "";
    I.LANGS.forEach(({ id, label }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "langtab" + (lang === id ? " on" : "");
      btn.textContent = label;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", lang === id ? "true" : "false");
      btn.addEventListener("click", () => {
        setLang(id);
        I.saveLang(id, true);
        onLang(id);
        renderTabs();
      });
      tabsEl.appendChild(btn);
    });
  }

  renderTabs();
}

export function initLegalPage() {
  const I = window.EchelonI18n;
  const L = window.EchelonLegal;
  if (!I || !L) return;

  const docType = pageDoc();

  (async () => {
    let lang = localStorage.getItem(I.LANG_KEY);
    if (!lang || !I.LANGS.some((l) => l.id === lang)) {
      const consent = L.getCookieConsent();
      const fromIp = consent?.functional ? await I.detectLangFromIp() : null;
      lang = fromIp || I.langFromBrowser();
      localStorage.setItem(I.LANG_KEY, lang);
    }

    function applyLang(nextLang) {
      lang = nextLang;
      I.applyHomeI18n(lang);
      renderLegalNav(lang, docType);
      renderLegalContent(lang, docType);
      initCookieSettingsPanel(lang);
      initLegalCloseButton(lang);
    }

    const brand = document.querySelector(".legal-brand");
    if (brand) brand.href = legalHomeHref();

    applyLang(lang);
    initLangTabs(() => lang, (id) => applyLang(id), () => {});
    initCookieBanner(lang);
  })();
}

if (typeof window !== "undefined") {
  window.EchelonLegalPage = { initLegalPage, pageDoc };
}
