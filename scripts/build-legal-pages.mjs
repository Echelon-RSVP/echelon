import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(process.cwd(), "legal-page.html"));
for (const name of ["privacy.html", "terms.html", "cookies.html", "data-deletion.html"]) {
  writeFileSync(join(process.cwd(), name), src);
  console.log("Wrote", name);
}
