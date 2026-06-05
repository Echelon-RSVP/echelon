/** @deprecated Use scripts/sync-browser-scripts.mjs */
import { execSync } from "child_process";
execSync("node scripts/sync-browser-scripts.mjs", { stdio: "inherit", cwd: process.cwd() });
