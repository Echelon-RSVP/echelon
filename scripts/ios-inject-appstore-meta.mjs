/**
 * Marks production web build as App Store distribution for native shell behavior.
 */
import fs from "fs";
import path from "path";

const indexPath = path.join("dist", "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("ios-inject-appstore-meta: dist/index.html missing. Run npm run build first.");
  process.exit(1);
}

let html = fs.readFileSync(indexPath, "utf8");
const meta = '<meta name="echelon-distribution" content="appstore" />';
if (!html.includes("echelon-distribution")) {
  html = html.replace("</head>", `    ${meta}\n  </head>`);
} else {
  html = html.replace(
    /<meta name="echelon-distribution" content="[^"]*"\s*\/?>/,
    meta,
  );
}
fs.writeFileSync(indexPath, html);
console.log("ios-inject-appstore-meta: appstore meta tag set in dist/index.html");
