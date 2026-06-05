import { Client } from "basic-ftp";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const LOCAL = join(process.cwd(), "dist");

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
  const client = new Client(60000);
  client.ftp.verbose = true;
  try {
    await client.access({
      host: "199.188.205.52",
      user: "echelon",
      password: "hLabEM@i2B2Mkkn",
      port: 21,
      secure: false,
    });

    console.log("Connected via FTP");
    const listing = await client.list("/");
    console.log("Root:", listing.map((e) => e.name).join(", "));

    await client.ensureDir("public_html/app/assets");
    await client.cd("/public_html/app");

    for (const file of walk(LOCAL)) {
      const rel = relative(LOCAL, file).replace(/\\/g, "/");
      const parts = rel.split("/");
      const filename = parts.pop();
      console.log("Uploading", rel);
      if (parts.length) {
        await client.cd("/public_html/app");
        await client.ensureDir(parts.join("/"));
        await client.cd("/public_html/app/" + parts.join("/"));
      } else {
        await client.cd("/public_html/app");
      }
      const { Readable } = await import("stream");
      const stream = Readable.from(readFileSync(file));
      await client.uploadFrom(stream, filename);
    }

    await client.cd("/public_html/app");

    const htaccess = `Options -MultiViews
RewriteEngine On
RewriteBase /app/
RewriteRule ^index\\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /app/index.html [L]
`;
    const { Readable } = await import("stream");
    await client.uploadFrom(Readable.from(Buffer.from(htaccess)), ".htaccess");

    console.log("FTP deploy complete.");
  } finally {
    client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
