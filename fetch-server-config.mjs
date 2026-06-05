import { Client } from "basic-ftp";
import { writeFileSync } from "fs";
import { join } from "path";
import { Readable } from "stream";
import { createWriteStream } from "fs";

const client = new Client(60000);
await client.access({
  host: "199.188.205.52",
  user: "echelon",
  password: process.env.ECHELON_CPANEL_PASS || "hLabEM@i2B2Mkkn",
  port: 21,
  secure: false,
});
const dest = join(process.cwd(), "api", "config.local.server.php");
await client.downloadTo(dest, "/public_html/api/config.local.php");
client.close();
console.log("Downloaded server config to api/config.local.server.php");
