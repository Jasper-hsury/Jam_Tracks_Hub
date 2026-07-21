const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

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
  const target = path.join(dist, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(relativePath) {
  const source = path.join(root, relativePath);
  if (!fs.existsSync(source)) {
    return;
  }
  fs.cpSync(source, path.join(dist, relativePath), {
    recursive: true,
    force: true
  });
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

rootFiles.forEach(copyFile);
directories.forEach(copyDirectory);

console.log(`Cloudflare static site prepared at ${path.relative(root, dist)}`);
