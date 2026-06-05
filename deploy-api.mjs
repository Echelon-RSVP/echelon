import { Client } from "basic-ftp";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";

const CPANEL_HOST = "199.188.205.52";
const CPANEL_USER = "echelon";
const CPANEL_PASS = process.env.ECHELON_CPANEL_PASS || "hLabEM@i2B2Mkkn";

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

async function main() {
  const local = join(process.cwd(), "api");
  const client = new Client(60000);
  client.ftp.verbose = true;
  await client.access({
    host: CPANEL_HOST,
    user: CPANEL_USER,
    password: CPANEL_PASS,
    port: 21,
    secure: false,
  });

  await client.ensureDir("public_html/api");
  for (const file of walk(local)) {
    if (file.endsWith("config.local.php") && !existsSync(file)) continue;
    const rel = relative(local, file).replace(/\\/g, "/");
    const parts = rel.split("/");
    const filename = parts.pop();
    await client.cd("/public_html/api");
    if (parts.length) await client.ensureDir(parts.join("/"));
    await client.cd("/public_html/api/" + (parts.length ? parts.join("/") : ""));
    const { Readable } = await import("stream");
    await client.uploadFrom(Readable.from(readFileSync(file)), filename);
    console.log("Uploaded api/" + rel);
  }
  client.close();
  console.log("API deploy complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
