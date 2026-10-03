import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        dexamethasone: resolve(__dirname, "dexamethasone.html"),
        parathyroid: resolve(__dirname, "parathyroid.html"),
        hepatitisB: resolve(__dirname, "hepatitis-b.html"),
        lft: resolve(__dirname, "liver-function.html"),
        bacteria: resolve(__dirname, "bacteria.html"),
        recallDrill: resolve(__dirname, "recall-drill.html"),
      },
    },
  },
});
