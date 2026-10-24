import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { resolve } from "path";

// The Cloudflare plugin runs worker/index.js (and a local D1) inside the dev server, so /api works without a second process.
export default defineConfig({
  plugins: [react(), cloudflare()],
  // The preview tool assigns a free port through PORT; plain `npm run dev` keeps Vite's default
  server: process.env.PORT ? { port: Number(process.env.PORT) } : {},
  // Scope the HTML entries to the client build: a top-level build.rollupOptions.input is inherited by the Worker environment too, which then fails with 'Entry module "index.html" cannot be external'.
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: {
            // The Recall Drill SPA shell; Cloudflare serves it for every unknown client route (assets.not_found_handling)
            main: resolve(__dirname, "index.html"),
            // The minis are served at /mini/<name>
            dexamethasone: resolve(__dirname, "mini/dexamethasone.html"),
            parathyroid: resolve(__dirname, "mini/parathyroid.html"),
            hepatitisB: resolve(__dirname, "mini/hepatitis-b.html"),
            lft: resolve(__dirname, "mini/liver-function.html"),
            bacteria: resolve(__dirname, "mini/bacteria.html"),
            dermatomeNinja: resolve(__dirname, "mini/dermatome-ninja.html"),
            privacy: resolve(__dirname, "privacy.html"),
            tos: resolve(__dirname, "tos.html"),
          },
        },
      },
    },
  },
});
