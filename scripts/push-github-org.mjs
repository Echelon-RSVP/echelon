/**
 * Push Echelon-RSVP organization profile + repo metadata via GitHub CLI.
 * Requires: gh auth login (once)
 *
 * Usage: node scripts/push-github-org.mjs
 */
import { execSync } from "child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const ORG = "Echelon-RSVP";
const REPO = "echelon";
const root = process.cwd();

function gh(cmd) {
  console.log(">", cmd);
  execSync(`gh ${cmd}`, { stdio: "inherit", cwd: root });
}

function ghJson(cmd) {
  const out = execSync(`gh ${cmd}`, { cwd: root, encoding: "utf8" });
  return JSON.parse(out);
}

function main() {
  try {
    execSync("gh auth status", { stdio: "pipe", cwd: root });
  } catch {
    console.error("Run: gh auth login");
    process.exit(1);
  }

  const profileDir = join(root, "org-github");
  if (!existsSync(join(profileDir, "profile", "README.md"))) {
    console.error("Missing org-github/profile/README.md");
    process.exit(1);
  }

  console.log("\n=== Organization profile (API) ===\n");
  gh(`api -X PATCH orgs/${ORG} -f name='Echelon RSVP' -f email='hi@echelon.rsvp' -f blog='https://echelon.rsvp/' -f location='Portugal' -f description='Echelon is where your best self is finally measurable. Social reputation app: feed, stories, messages, ratings, and discovery. iOS + web at echelon.rsvp.'`);

  console.log("\n=== Repository About ===\n");
  gh(`repo edit ${ORG}/${REPO} --description "Echelon · social reputation app (Capacitor iOS + PWA)" --homepage "https://echelon.rsvp/"`);

  const topics = ["social-networking", "reputation", "capacitor", "ios", "react", "pwa"];
  const topicArgs = topics.map((t) => `-f names[]='${t}'`).join(" ");
  gh(`api -X PUT repos/${ORG}/${REPO}/topics ${topicArgs}`);

  console.log("\n=== Organization profile README (.github repo) ===\n");
  let hasDotGithub = false;
  try {
    ghJson(`repo view ${ORG}/.github --json name`);
    hasDotGithub = true;
  } catch {
    console.log(`Creating ${ORG}/.github ...`);
    gh(`repo create ${ORG}/.github --public --description "Echelon RSVP organization profile"`);
    hasDotGithub = true;
  }

  if (hasDotGithub) {
    const tmp = join(root, ".org-github-push");
    execSync(`git clone https://github.com/${ORG}/.github.git "${tmp}"`, { stdio: "inherit", cwd: root });
    execSync("git checkout -B main", { cwd: tmp, stdio: "inherit" });
    mkdirSync(join(tmp, "profile"), { recursive: true });
    cpSync(join(profileDir, "profile", "README.md"), join(tmp, "profile", "README.md"));
    execSync("git add profile", { cwd: tmp, stdio: "inherit" });
    try {
      execSync('git commit -m "Update organization profile README"', { cwd: tmp, stdio: "inherit" });
    } catch {
      console.log("No profile changes to commit.");
    }
    execSync("git push origin main", { cwd: tmp, stdio: "inherit" });
    rmSync(tmp, { recursive: true, force: true });
  }

  console.log("\nDone. Verify:");
  console.log(`  https://github.com/${ORG}`);
  console.log(`  https://github.com/${ORG}/${REPO}`);
}

main();
