/** Standalone docs page (/app/docs.html). */

const DOC_SECTIONS = [
  { id: "rating", core: true },
  { id: "score", core: true },
  { id: "feed" },
  { id: "spark" },
  { id: "lens" },
  { id: "messages" },
  { id: "friends" },
  { id: "profile" },
  { id: "events" },
  { id: "parties" },
  { id: "perks" },
];

const DOC_TIPS = ["docs.tip1", "docs.tip2", "docs.tip3", "docs.tip4", "docs.tip5"];

const LEGAL_LINKS = [
  ["/app/privacy.html", "legal.privacy"],
  ["/app/terms.html", "legal.terms"],
  ["/app/cookies.html", "legal.cookies"],
  ["/app/data-deletion.html", "legal.dataDeletion"],
];

const HASH_TO_LEGAL = {
  privacy: "privacy.html",
  terms: "terms.html",
  cookies: "cookies.html",
  "data-deletion": "data-deletion.html",
  data_deletion: "data-deletion.html",
};

function redirectLegalHash() {
  const hash = (location.hash || "").replace(/^#/, "").toLowerCase();
  const target = HASH_TO_LEGAL[hash];
  if (target) location.replace(`/app/${target}`);
}

let tipIdx = 0;
let quizPick = null;
const expanded = { rating: true, score: true };

function t(lang, key) {
  return window.EchelonI18n?.t(lang, key) ?? key;
}

function hasKey(lang, key) {
  const val = t(lang, key);
  return val !== key;
}

function renderLangTabs(lang, onChange) {
  const el = document.getElementById("lang-tabs");
  if (!el || !window.EchelonI18n?.LANGS) return;
  el.innerHTML = window.EchelonI18n.LANGS.map(({ id, label }) =>
    `<button type="button" role="tab" aria-selected="${lang === id}" class="langtab${lang === id ? " on" : ""}" data-lang="${id}">${label}</button>`,
  ).join("");
  el.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => onChange(btn.dataset.lang));
  });
}

function bindInteractions(lang) {
  const tipBtn = document.getElementById("docs-tip-card");
  if (tipBtn) {
    tipBtn.onclick = () => {
      tipIdx = (tipIdx + 1) % DOC_TIPS.length;
      const p = tipBtn.querySelector("p");
      if (p) p.textContent = t(lang, DOC_TIPS[tipIdx]);
    };
  }

  document.querySelectorAll("[data-quiz]").forEach((btn) => {
    btn.onclick = () => {
      quizPick = btn.dataset.quiz;
      document.querySelectorAll("[data-quiz]").forEach((b) => b.classList.toggle("picked", b.dataset.quiz === quizPick));
      const result = document.getElementById("docs-quiz-result");
      if (result) {
        result.textContent = quizPick === "no" ? t(lang, "docs.quizRight") : t(lang, "docs.quizWrong");
        result.className = "docs-quiz-result " + (quizPick === "no" ? "right" : "wrong");
        result.hidden = false;
      }
    };
  });

  document.querySelectorAll("[data-docs-toggle]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.docsToggle;
      expanded[id] = !expanded[id];
      const section = document.getElementById(`docs-${id}`);
      if (section) {
        section.classList.toggle("open", expanded[id]);
        const body = section.querySelector(".docs-section-body");
        if (body) body.hidden = !expanded[id];
        const chev = btn.querySelector(".docs-chevron");
        if (chev) chev.classList.toggle("open", expanded[id]);
      }
    };
  });
}

function renderDocs(lang) {
  const I = window.EchelonI18n;
  if (!I) return;
  document.documentElement.lang = lang;
  document.title = `${t(lang, "docs.pageTitle")} · echelon`;

  const titleEl = document.getElementById("docs-page-title");
  const leadEl = document.getElementById("docs-page-lead");
  if (titleEl) titleEl.textContent = t(lang, "docs.pageTitle");
  if (leadEl) leadEl.textContent = t(lang, "docs.pageLead");

  const coreEl = document.getElementById("docs-score-core");
  if (coreEl) {
    coreEl.innerHTML = `<b>${t(lang, "docs.ratingTitle")}</b>${t(lang, "docs.ratingBody")}`;
  }

  const tipEl = document.getElementById("docs-tip-text");
  if (tipEl) tipEl.textContent = t(lang, DOC_TIPS[tipIdx]);

  const nav = document.getElementById("docs-nav");
  if (nav) {
    nav.innerHTML = DOC_SECTIONS.map(({ id }) =>
      `<a href="#docs-${id}">${t(lang, `docs.${id}Title`)}</a>`,
    ).join("");
  }

  const sectionsEl = document.getElementById("docs-sections");
  if (sectionsEl) {
    sectionsEl.innerHTML = DOC_SECTIONS.map(({ id, core }) => {
      const isOpen = expanded[id] ?? false;
      const extra = hasKey(lang, `docs.${id}Extra`) ? `<p class="docs-extra">${t(lang, `docs.${id}Extra`)}</p>` : "";
      return `
      <article class="docs-section${core ? " docs-section--core" : ""}${isOpen ? " open" : ""}" id="docs-${id}">
        <button type="button" class="docs-section-toggle" data-docs-toggle="${id}">
          <h2>
            ${t(lang, `docs.${id}Title`)}
            ${core ? `<span class="docs-core-pill">${t(lang, "docs.corePill")}</span>` : ""}
          </h2>
          <span class="docs-chevron${isOpen ? " open" : ""}" aria-hidden>⌄</span>
        </button>
        <div class="docs-section-body" ${isOpen ? "" : "hidden"}>
          <p>${t(lang, `docs.${id}Body`)}</p>
          ${extra}
        </div>
      </article>
    `;
    }).join("");
  }

  const legalEl = document.getElementById("docs-legal-links");
  if (legalEl) {
    legalEl.innerHTML = LEGAL_LINKS.map(([href, key]) =>
      `<a href="${href}">${t(lang, key)}</a>`,
    ).join("");
  }

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (key) node.textContent = t(lang, key);
  });

  bindInteractions(lang);
}

function init() {
  redirectLegalHash();
  const I = window.EchelonI18n;
  if (!I) return;
  let lang = localStorage.getItem(I.LANG_KEY);
  if (!lang || !I.LANGS.some((l) => l.id === lang)) {
    lang = I.langFromBrowser();
    localStorage.setItem(I.LANG_KEY, lang);
  }

  const setLang = (next) => {
    lang = next;
    I.saveLang(next, true);
    renderDocs(lang);
    renderLangTabs(lang, setLang);
  };

  setLang(lang);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
