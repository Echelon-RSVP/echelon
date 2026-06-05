import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "sync-shared-assets",
      buildStart() {
        cpSync("i18n.js", "public/i18n.js");
        cpSync("legal.js", "public/legal.js");
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