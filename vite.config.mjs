import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "/",
  publicDir: false,
  plugins: [vue()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets/vue",
    rollupOptions: {
      preserveEntrySignatures: "strict",
      input: {
        "vue-foundation": resolve(root, "src/entries/vue-foundation.js")
      },
      output: {
        entryFileNames: "assets/vue/[name]-[hash].js",
        chunkFileNames: "assets/vue/[name]-[hash].js",
        assetFileNames: "assets/vue/[name]-[hash][extname]"
      }
    }
  }
});
