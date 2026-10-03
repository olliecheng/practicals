import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  // Recall Drill accounts: run `npm run api` (wrangler, local KV) alongside the dev server
  server: { proxy: { "/api": "http://localhost:8788" } },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        dexamethasone: resolve(__dirname, "dexamethasone.html"),
        parathyroid: resolve(__dirname, "parathyroid.html"),
        hepatitisB: resolve(__dirname, "hepatitis-b.html"),
        lft: resolve(__dirname, "liver-function.html"),
        bacteria: resolve(__dirname, "bacteria.html"),
        recallDrill: resolve(__dirname, "recall-drill/index.html"),
        recallDrillLogin: resolve(__dirname, "recall-drill/login/index.html"),
      },
    },
  },
});
