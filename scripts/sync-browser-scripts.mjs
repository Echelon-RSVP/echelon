/** Strip ESM exports for classic <script> tags (homepage + /app/ legal + docs). */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const root = process.cwd();

function stripExports(src) {
  return src.replace(/^export /gm, "");
}

function writeBrowserScript(name, src) {
  const stripped = stripExports(src);
  for (const dir of [join(root, ".browser"), join(root, "public")]) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, name), stripped);
  }
  console.log("Wrote", name, "to .browser/ and public/");
}

writeBrowserScript("i18n.js", readFileSync(join(root, "i18n.js"), "utf8"));
writeBrowserScript("legal.js", readFileSync(join(root, "legal.js"), "utf8"));

const legalPage = stripExports(readFileSync(join(root, "legal-page.js"), "utf8"));
const legalPageBundle = `${legalPage}
initLegalPage();
(function () {
  var panel = document.getElementById("cookie-settings-panel");
  if (panel && pageDoc() === "cookies") panel.hidden = false;
})();
`;

for (const dir of [join(root, ".browser"), join(root, "public")]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "legal-page.js"), legalPageBundle);
}
console.log("Wrote legal-page.js to .browser/ and public/");
