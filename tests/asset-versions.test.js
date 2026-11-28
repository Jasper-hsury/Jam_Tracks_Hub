const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  HASHED_ASSETS,
  assetVersion,
  versionedAsset,
  addAssetVersions
} = require("../tools/scripts/asset-versions.js");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("every local stylesheet and classic script is content-hashed", () => {
  const expected = [
    ...fs.readdirSync(path.join(root, "styles")).filter(name => name.endsWith(".css")).sort().map(name => `styles/${name}`),
    ...fs.readdirSync(path.join(root, "scripts")).filter(name => name.endsWith(".js")).sort().map(name => `scripts/${name}`)
  ];
  assert.deepEqual(HASHED_ASSETS, expected);
  ["styles/pages.css", "styles/v4.css", "styles/chord-lab.css", "styles/base.css", "scripts/i18n-init.js", "scripts/site-animations.js"]
    .forEach(file => assert.ok(HASHED_ASSETS.includes(file), file));
});

test("the cache key is the first ten hex digits of the file's SHA-256", () => {
  HASHED_ASSETS.forEach(file => {
    const expected = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex").slice(0, 10);
    assert.equal(assetVersion(file), expected, file);
    assert.equal(versionedAsset(file), `${file}?v=${expected}`);
  });
});

test("adds the key to relative and root-relative links and leaves everything else alone", () => {
  const v4 = versionedAsset("styles/v4.css");
  const i18n = versionedAsset("scripts/i18n-init.js");
  const workspace = versionedAsset("styles/song-workspace.css");
  const html = [
    '<link rel="stylesheet" href="styles/v4.css">',
    '<link rel="stylesheet" href="/styles/v4.css">',
    '<script src="scripts/i18n-init.js"></script>',
    '<script src="/scripts/i18n-init.js"></script>',
    '<link rel="stylesheet" href="styles/song-workspace.css">',
    '<link rel="stylesheet" href="styles/v4.css?v=already">',
    '<script src="assets/vendor/gsap/gsap.min.js"></script>',
    '<script type="module" src="/src/entries/home.js"></script>'
  ].join("\n");
  assert.equal(addAssetVersions(html), [
    `<link rel="stylesheet" href="${v4}">`,
    `<link rel="stylesheet" href="/${v4}">`,
    `<script src="${i18n}"></script>`,
    `<script src="/${i18n}"></script>`,
    `<link rel="stylesheet" href="${workspace}">`,
    '<link rel="stylesheet" href="styles/v4.css?v=already">',
    '<script src="assets/vendor/gsap/gsap.min.js"></script>',
    '<script type="module" src="/src/entries/home.js"></script>'
  ].join("\n"));
  assert.equal(addAssetVersions(addAssetVersions(html)), addAssetVersions(html));
});

test("source HTML links local stylesheets and scripts without a hand-written key", () => {
  const pages = fs.readdirSync(root).filter(file => file.endsWith(".html"));
  pages.forEach(page => {
    assert.doesNotMatch(read(page), /(?:href|src)="\/?(?:styles|scripts)\/[^"]+\?/, page);
  });
  const config = read("vite.config.mjs") + read("tools/scripts/verify-cloudflare-build.js");
  assert.doesNotMatch(config, /(?:styles|scripts)\/[\w.-]+\.(?:css|js)\?v=/);
});

test("the version check script covers the helper", () => {
  assert.match(JSON.parse(read("package.json")).scripts.check, /node --check tools\/scripts\/asset-versions\.js/);
});
