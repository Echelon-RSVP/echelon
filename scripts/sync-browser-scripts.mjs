/** Strip ESM exports for classic <script> tags (homepage + /app/ legal + docs). */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const root = process.cwd();

function stripExports(src) {
  return src.replace(/^export /gm, "");
}

function writeBrowserScript(name, src, { publicName = name } = {}) {
  const stripped = stripExports(src);
  mkdirSync(join(root, ".browser"), { recursive: true });
  writeFileSync(join(root, ".browser", name), stripped);
  mkdirSync(join(root, "public"), { recursive: true });
  writeFileSync(join(root, "public", publicName), stripped);
  console.log("Wrote", name, "to .browser/ and public/" + publicName);
}

writeBrowserScript("i18n.js", readFileSync(join(root, "i18n.js"), "utf8"), {
  publicName: "i18n.browser.js",
});
writeBrowserScript("legal.js", readFileSync(join(root, "legal.js"), "utf8"), {
  publicName: "legal.browser.js",
});

const legalPage = stripExports(readFileSync(join(root, "legal-page.js"), "utf8"));
const legalPageBundle = `${legalPage}
initLegalPage();
(function () {
  var panel = document.getElementById("cookie-settings-panel");
  if (panel && pageDoc() === "cookies") panel.hidden = false;
})();
`;

mkdirSync(join(root, ".browser"), { recursive: true });
writeFileSync(join(root, ".browser", "legal-page.js"), legalPageBundle);
mkdirSync(join(root, "public"), { recursive: true });
writeFileSync(join(root, "public", "legal-page.browser.js"), legalPageBundle);
console.log("Wrote legal-page.js to .browser/ and public/legal-page.browser.js");
