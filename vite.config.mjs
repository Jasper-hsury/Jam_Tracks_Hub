import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const root = fileURLToPath(new URL(".", import.meta.url));
const legacy404Assets = [
  "assets/images/icon.png",
  "scripts/theme-init.js?v=20260725-friendly-insect-switch",
  "scripts/i18n-init.js?v=20260804-no-language-flash",
  "styles/base.css?v=20260829-smart-navbar-v2",
  "styles/components.css?v=20260827-legal-footer",
  "styles/pages.css?v=20260804-feedback-consistency",
  "styles/themes.css?v=20260804-feedback-consistency",
  "scripts/site.js?v=20260829-smart-navbar-v2",
  "scripts/i18n.js?v=20260827-legal-footer",
  "assets/vendor/gsap/gsap.min.js",
  "assets/vendor/gsap/ScrollTrigger.min.js",
  "scripts/site-animations.js?v=20260718-trainer-dropdown-hover"
];
const legacyAssetSentinel = "https://vite-preserved-legacy.invalid/";

function preserveLegacy404Assets() {
  function is404(context) {
    return context.path === "/404.html" || context.filename?.endsWith("/404.html");
  }

  return [
    {
      name: "jth:preserve-legacy-404-assets-pre",
      enforce: "pre",
      transformIndexHtml: {
        order: "pre",
        handler(html, context) {
          if (!is404(context)) return html;
          return legacy404Assets.reduce(
            (result, asset) => result.replaceAll(asset, `${legacyAssetSentinel}${asset}`),
            html
          );
        }
      }
    },
    {
      name: "jth:preserve-legacy-404-assets-post",
      transformIndexHtml: {
        order: "post",
        handler(html, context) {
          return is404(context) ? html.replaceAll(legacyAssetSentinel, "") : html;
        }
      }
    }
  ];
}

export default defineConfig({
  base: "/",
  publicDir: false,
  plugins: [...preserveLegacy404Assets(), vue()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets/vue",
    rollupOptions: {
      preserveEntrySignatures: "strict",
      input: {
        "404": resolve(root, "404.html"),
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
