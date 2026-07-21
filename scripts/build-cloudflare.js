const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const renderAssetBaseUrl = "https://jasper-music.onrender.com";
const maxWorkerAssetBytes = 24 * 1024 * 1024;
const skippedLargeAssets = [];

const rootFiles = [
  "404.html",
  "chord-dictionary.html",
  "chord-dictionary.js",
  "chords.html",
  "chords.js",
  "cover.jpeg",
  "fretboard-trainer.html",
  "fretboard-trainer.js",
  "googlec8a4768d207b3044.html",
  "home.js",
  "icon.png",
  "index.html",
  "key-finder.html",
  "key-finder.js",
  "privacy-policy.html",
  "scale.html",
  "scale.js",
  "service-waking.html",
  "site-animations.js",
  "site-config.js",
  "site.js",
  "style.css",
  "theme-init.js",
  "tracks.html",
  "tracks.js",
  "tracks.json"
];

const directories = ["downloads", "samples", "slides", "styles", "vendor"];

function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  if (!fs.existsSync(source)) {
    return;
  }
  const stats = fs.statSync(source);
  if (stats.size > maxWorkerAssetBytes) {
    skippedLargeAssets.push(relativePath);
    return;
  }
  const target = path.join(dist, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (relativePath.startsWith("slides/") && relativePath.endsWith(".html")) {
    const html = fs.readFileSync(source, "utf8").replace(
      /src="([^"]+\.pdf)(#[^"]*)?"/g,
      (_, pdfPath, hash = "") =>
        `src="${renderAssetBaseUrl}/slides/${pdfPath}${hash}"`
    );
    fs.writeFileSync(target, html);
    return;
  }
  fs.copyFileSync(source, target);
}

function copyDirectory(relativePath) {
  const source = path.join(root, relativePath);
  if (!fs.existsSync(source)) {
    return;
  }
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(child);
    } else if (entry.isFile()) {
      copyFile(child);
    }
  }
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

rootFiles.forEach(copyFile);
directories.forEach(copyDirectory);

console.log(`Cloudflare static site prepared at ${path.relative(root, dist)}`);
if (skippedLargeAssets.length) {
  console.log("Skipped large assets for Cloudflare Workers:");
  skippedLargeAssets.forEach(asset => console.log(`- ${asset}`));
}
