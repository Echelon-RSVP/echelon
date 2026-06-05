import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const root = process.cwd();
const src = readFileSync(join(root, "legal-page.html"), "utf8");
const pages = ["privacy.html", "terms.html", "cookies.html", "data-deletion.html"];

for (const name of pages) {
  writeFileSync(join(root, name), src);
  console.log("Wrote", name);
}

const appSrc = src
  .replace('href="/"', 'href="/app/"')
  .replace('src="/i18n.js"', 'src="i18n.js"')
  .replace('src="/legal.js"', 'src="legal.js"')
  .replace('src="/legal-page.js"', 'src="legal-page.js"')
  .replace('href="/privacy.html"', 'href="privacy.html"')
  .replace('href="/cookies.html"', 'href="cookies.html"');

mkdirSync(join(root, "public"), { recursive: true });
for (const name of pages) {
  writeFileSync(join(root, "public", name), appSrc);
  console.log("Wrote public/", name);
}
