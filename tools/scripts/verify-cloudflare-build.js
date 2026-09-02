const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const dist = path.join(root, "dist");
const maxWorkerAssetBytes = 24 * 1024 * 1024;
const renderAssetBaseUrl = "https://api.jamtrackshub.com";
const copiedDirectories = ["assets", "data", "downloads", "locales", "scripts", "slides", "styles"];

function fail(message) {
  throw new Error(`Cloudflare build verification failed: ${message}`);
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(function(entry) {
    const child = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(child) : [child];
  });
}

function relativeFromRoot(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function read(filePath) {
  return fs.readFileSync(filePath);
}

function expectedSlideHtml(source) {
  return source.replace(
    /src="([^"]+\.pdf)(#[^"]*)?"/g,
    function(_, pdfPath, hash = "") {
      return `src="${renderAssetBaseUrl}/slides/${pdfPath}${hash}"`;
    }
  );
}

if (!fs.existsSync(dist)) fail("dist/ does not exist");

const rootHtml = fs.readdirSync(root, { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith(".html"))
  .map(entry => entry.name)
  .sort();

if (!rootHtml.length) fail("no root HTML entries were discovered");

rootHtml.forEach(function(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(dist, relativePath);
  if (!fs.existsSync(target)) fail(`missing root HTML entry ${relativePath}`);
  if (!read(source).equals(read(target))) fail(`root HTML is not byte-identical: ${relativePath}`);
});

const sourceHeaders = path.join(root, "_headers");
const distHeaders = path.join(dist, "_headers");
if (!fs.existsSync(distHeaders)) fail("missing _headers");
if (!read(sourceHeaders).equals(read(distHeaders))) fail("_headers differs from source");

copiedDirectories.forEach(function(relativeDirectory) {
  const sourceDirectory = path.join(root, relativeDirectory);
  listFiles(sourceDirectory).forEach(function(source) {
    const relativePath = relativeFromRoot(source);
    const target = path.join(dist, relativePath);
    const stats = fs.statSync(source);

    if (stats.size > maxWorkerAssetBytes) {
      if (fs.existsSync(target)) fail(`oversized asset was copied: ${relativePath}`);
      return;
    }

    if (!fs.existsSync(target)) fail(`missing static asset ${relativePath}`);

    if (relativePath.startsWith("slides/") && relativePath.endsWith(".html")) {
      const expected = expectedSlideHtml(fs.readFileSync(source, "utf8"));
      const actual = fs.readFileSync(target, "utf8");
      if (actual !== expected) fail(`slide PDF rewrite differs: ${relativePath}`);
      return;
    }

    if (!read(source).equals(read(target))) fail(`static asset differs: ${relativePath}`);
  });
});

const sourceSlides = listFiles(path.join(root, "slides"))
  .map(relativeFromRoot)
  .filter(relativePath => relativePath.endsWith(".html"))
  .sort();
const distSlides = listFiles(path.join(dist, "slides"))
  .map(filePath => path.relative(dist, filePath).split(path.sep).join("/"))
  .filter(relativePath => relativePath.endsWith(".html"))
  .sort();
if (JSON.stringify(sourceSlides) !== JSON.stringify(distSlides)) fail("track slide HTML inventory differs");

const vueAssetsDirectory = path.join(dist, "assets", "vue");
const vueJavaScript = listFiles(vueAssetsDirectory).filter(filePath => filePath.endsWith(".js"));
if (!vueJavaScript.length) fail("missing compiled Vue foundation JavaScript");

vueJavaScript.forEach(function(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  if (!source.trim()) fail(`empty Vue foundation bundle: ${path.basename(filePath)}`);
  if (!source.includes("data-vue-foundation-smoke")) {
    fail(`compiled smoke marker missing from ${path.basename(filePath)}`);
  }
  if (/\beval\s*\(|new\s+Function\s*\(/.test(source)) fail(`CSP-incompatible runtime code in ${path.basename(filePath)}`);
});

rootHtml.forEach(function(relativePath) {
  const html = fs.readFileSync(path.join(dist, relativePath), "utf8");
  if (/vue-foundation|src\/entries\/vue-foundation/i.test(html)) {
    fail(`production HTML references the Vue foundation: ${relativePath}`);
  }
});

["worker.js", "wrangler.jsonc", "functions", "api-server"].forEach(function(relativePath) {
  if (fs.existsSync(path.join(dist, relativePath))) fail(`backend boundary leaked into dist: ${relativePath}`);
});

listFiles(dist).forEach(function(filePath) {
  if (!/\.(?:css|html|js|json|md|svg|txt)$/.test(filePath) && path.basename(filePath) !== "_headers") return;
  const source = fs.readFileSync(filePath, "utf8");
  if (/\/Users\/[^/]+\/|[A-Za-z]:\\\\Users\\\\/.test(source)) {
    fail(`local absolute path leaked into ${path.relative(dist, filePath)}`);
  }
});

console.log(`Cloudflare build verification passed: ${rootHtml.length} root HTML entries`);
console.log(`Track slide parity passed: ${sourceSlides.length} slide HTML entries`);
console.log(`Vue foundation assets passed: ${vueJavaScript.length} JavaScript bundle(s)`);
