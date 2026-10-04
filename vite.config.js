import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { resolve } from "path";

// The Cloudflare plugin runs worker/index.js (and a local D1) inside the dev server, so /api works without a second process.
export default defineConfig({
  plugins: [react(), cloudflare()],
  // Scope the HTML entries to the client build: a top-level build.rollupOptions.input is inherited by the Worker environment too, which then fails with 'Entry module "index.html" cannot be external'.
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: {
            main: resolve(__dirname, "index.html"),
            dexamethasone: resolve(__dirname, "dexamethasone.html"),
            parathyroid: resolve(__dirname, "parathyroid.html"),
            hepatitisB: resolve(__dirname, "hepatitis-b.html"),
            lft: resolve(__dirname, "liver-function.html"),
            bacteria: resolve(__dirname, "bacteria.html"),
            // SPA shell for /recall-drill/*; the Worker serves it for every client route
            recallDrill: resolve(__dirname, "recall-drill/index.html"),
          },
        },
      },
    },
  },
});
