import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync } from "fs";
import { execSync } from "child_process";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "sync-shared-assets",
      buildStart() {
        execSync("node scripts/sync-browser-scripts.mjs", { stdio: "inherit" });
        execSync("node scripts/build-legal-pages.mjs", { stdio: "inherit" });
        cpSync("pwa-install.js", "public/pwa-install.js");
        cpSync("docs-page.js", "public/docs-page.js");
        cpSync("docs-page.html", "public/docs.html");
      },
    },
  ],
  base: "/app/",
  server: {
    proxy: {
      "/api": {
        target: "https://echelon.rsvp",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});