import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import assetVersions from "./tools/scripts/asset-versions.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const viteOwnedHtml = new Set(["/", "/index.html", "/404.html", "/legal.html", "/privacy-policy.html", "/service-waking.html", "/feedback.html", "/tracks", "/tracks.html", "/fretboard-trainer", "/fretboard-trainer.html", "/chord-progressions", "/chord-progressions.html", "/scale", "/scale.html", "/chord-dictionary", "/chord-dictionary.html", "/chord-lab", "/chord-lab.html", "/progression-writer", "/progression-writer.html", "/key-finder", "/key-finder.html", "/song-workspace", "/song-workspace.html"]);
const legacyHtmlAssets = [
  "assets/images/icon.png",
  "assets/vendor/gsap/gsap.min.js",
  "assets/vendor/gsap/Flip.min.js",
  "assets/vendor/gsap/ScrollTrigger.min.js",
  "assets/vendor/gsap/SplitText.min.js",
  ...assetVersions.HASHED_ASSETS.map(assetVersions.versionedAsset)
];
const legacyAssetSentinel = "https://vite-preserved-legacy.invalid/";

function isViteOwned(context) {
  return viteOwnedHtml.has(context.path)
    || Array.from(viteOwnedHtml).some(page => context.filename?.endsWith(page));
}

// Runs before the legacy-asset hooks so they see the versioned asset paths.
function versionHashedAssets() {
  return {
    name: "jth:version-hashed-assets",
    enforce: "pre",
    transformIndexHtml: {
      order: "pre",
      handler(html, context) {
        return isViteOwned(context) ? assetVersions.addAssetVersions(html) : html;
      }
    }
  };
}

function preserveLegacyHtmlAssets() {
  function usesRootRelativeLegacyAssets(context) {
    return context.path === "/404.html" || context.filename?.endsWith("/404.html");
  }

  return [
    {
      name: "jth:preserve-legacy-404-assets-pre",
      enforce: "pre",
      transformIndexHtml: {
        order: "pre",
        handler(html, context) {
          if (!isViteOwned(context)) return html;
          return legacyHtmlAssets.reduce(
            (result, asset) => result
              .replaceAll(`"/${asset}"`, `"${legacyAssetSentinel}${asset}"`)
              .replaceAll(`"${asset}"`, `"${legacyAssetSentinel}${asset}"`),
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
          if (!isViteOwned(context)) return html;
          const restoredPrefix = usesRootRelativeLegacyAssets(context) ? "/" : "";
          return html.replaceAll(legacyAssetSentinel, restoredPrefix);
        }
      }
    }
  ];
}

export default defineConfig({
  base: "/",
  publicDir: false,
  plugins: [versionHashedAssets(), ...preserveLegacyHtmlAssets(), vue()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets/vue",
    rollupOptions: {
      preserveEntrySignatures: "strict",
      input: {
        home: resolve(root, "index.html"),
        "404": resolve(root, "404.html"),
        legal: resolve(root, "legal.html"),
        privacy: resolve(root, "privacy-policy.html"),
        "service-waking": resolve(root, "service-waking.html"),
        feedback: resolve(root, "feedback.html"),
        tracks: resolve(root, "tracks.html"),
        "fretboard-trainer": resolve(root, "fretboard-trainer.html"),
        "chord-progressions": resolve(root, "chord-progressions.html"),
        "scale-explorer": resolve(root, "scale.html"),
        "chord-dictionary": resolve(root, "chord-dictionary.html"),
        "chord-lab": resolve(root, "chord-lab.html"),
        "progression-writer": resolve(root, "progression-writer.html"),
        "key-finder": resolve(root, "key-finder.html"),
        "song-workspace": resolve(root, "song-workspace.html"),
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
