/** Strip ESM exports for classic <script> tags on homepage + legal pages. */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const root = process.cwd();
const outDir = join(root, ".browser");
mkdirSync(outDir, { recursive: true });

function stripExports(src) {
  return src.replace(/^export /gm, "");
}

for (const name of ["i18n.js", "legal.js"]) {
  const src = readFileSync(join(root, name), "utf8");
  writeFileSync(join(outDir, name), stripExports(src));
  console.log("Wrote", name);
}

const legalPage = stripExports(readFileSync(join(root, "legal-page.js"), "utf8"));
writeFileSync(
  join(outDir, "legal-page.js"),
  `${legalPage}
initLegalPage();
(function () {
  var panel = document.getElementById("cookie-settings-panel");
  if (panel && pageDoc() === "cookies") panel.hidden = false;
})();
`,
);
console.log("Wrote legal-page.js");
