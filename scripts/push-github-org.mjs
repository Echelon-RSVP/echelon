/**
 * Push Echelon-RSVP organization profile + repo metadata via GitHub CLI.
 * Requires: gh auth login (once)
 *
 * Usage: node scripts/push-github-org.mjs
 */
import { execSync } from "child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const ORG = "Echelon-RSVP";
const REPO = "echelon";
const root = process.cwd();

function gh(cmd) {
  console.log(">", cmd);
  execSync(cmd, { stdio: "inherit", cwd: root, shell: true });
}

function ghApi(method, endpoint, body) {
  const bodyFile = join(root, ".gh-api-body.json");
  writeFileSync(bodyFile, JSON.stringify(body));
  gh(`gh api -X ${method} ${endpoint} --input "${bodyFile}"`);
}

function ghJson(cmd) {
  const out = execSync(cmd, { cwd: root, encoding: "utf8", shell: true });
  return JSON.parse(out);
}

function main() {
  try {
    execSync("gh auth status", { stdio: "pipe", cwd: root, shell: true });
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
  ghApi("PATCH", `orgs/${ORG}`, {
    name: "Echelon RSVP",
    email: "hi@echelon.rsvp",
    blog: "https://echelon.rsvp/",
    location: "Portugal",
    description:
      "Echelon is where your best self is finally measurable. Social reputation app: feed, stories, messages, ratings, and discovery. iOS + web at echelon.rsvp.",
  });

  console.log("\n=== Repository About ===\n");
  gh(`gh repo edit ${ORG}/${REPO} --description "Echelon social reputation app (Capacitor iOS + PWA)" --homepage "https://echelon.rsvp/"`);

  console.log("\n=== Repository topics ===\n");
  ghApi("PUT", `repos/${ORG}/${REPO}/topics`, {
    names: ["social-networking", "reputation", "capacitor", "ios", "react", "pwa"],
  });

  console.log("\n=== Organization profile README (.github repo) ===\n");
  let hasDotGithub = false;
  try {
    ghJson(`gh repo view ${ORG}/.github --json name`);
    hasDotGithub = true;
  } catch {
    console.log(`Creating ${ORG}/.github ...`);
    gh(`gh repo create ${ORG}/.github --public --description "Echelon RSVP organization profile"`);
    hasDotGithub = true;
  }

  if (hasDotGithub) {
    const tmp = join(root, ".org-github-push");
    if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
    gh(`git clone https://github.com/${ORG}/.github.git "${tmp}"`);
    execSync("git checkout -B main", { cwd: tmp, stdio: "inherit", shell: true });
    mkdirSync(join(tmp, "profile"), { recursive: true });
    cpSync(join(profileDir, "profile", "README.md"), join(tmp, "profile", "README.md"));
    const gitLocal = (args) =>
      execSync(`git -c user.email=hi@echelon.rsvp -c user.name="Echelon RSVP" ${args}`, {
        cwd: tmp,
        stdio: "inherit",
        shell: true,
      });
    gitLocal("add profile");
    try {
      gitLocal('commit -m "Update organization profile README"');
    } catch {
      console.log("No profile changes to commit.");
    }
    gitLocal("push origin main");
    rmSync(tmp, { recursive: true, force: true });
  }

  console.log("\nDone. Verify:");
  console.log(`  https://github.com/${ORG}`);
  console.log(`  https://github.com/${ORG}/${REPO}`);
  console.log("\nUpload profile picture manually: public/icons/icon-1024.png");
}

main();
