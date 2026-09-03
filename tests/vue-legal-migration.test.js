const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

test("makes Legal the second production Vue-owned MPA entry", () => {
  const config = read("vite.config.mjs");
  const html = read("legal.html");
  const entry = read("src/entries/legal.js");

  assert.match(config, /legal:\s*resolve\(root,\s*"legal\.html"\)/);
  assert.match(config, /viteOwnedHtml = new Set\(\["\/", "\/index\.html", "\/404\.html", "\/legal\.html", "\/privacy-policy\.html", "\/service-waking\.html", "\/feedback\.html"\]\)/);
  assert.match(html, /<div id="vue-legal-root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/entries\/legal\.js"><\/script>/);
  assert.match(entry, /mountSitePage\(\{[\s\S]*mountId: "vue-legal-root"[\s\S]*view: LegalView/);
  assert.match(entry, /restoreInitialFragment\(\)/);
});

test("preserves Legal metadata, analytics, theme, locale, and shared shell", () => {
  const html = read("legal.html");

  assert.match(html, /<title>Legal &amp; Usage Policy \| Jam Tracks Hub<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jamtrackshub\.com\/legal\.html">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/jamtrackshub\.com\/legal\.html">/);
  assert.match(html, /<body data-i18n-title="titles\.legal">/);
  assert.match(html, /scripts\/theme-init\.js\?v=20260725-friendly-insect-switch/);
  assert.match(html, /scripts\/i18n-init\.js\?v=20260827-legal-footer/);
  assert.match(html, /<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/);
  assert.doesNotMatch(html, /<nav class="navbar"/);
  assert.doesNotMatch(html, /<footer class="footer">/);
  assert.doesNotMatch(html, /scripts\/(?:site|i18n)\.js/);
});

test("renders the established Legal structure from canonical locale resources", () => {
  const view = read("src/views/LegalView.vue");
  const english = JSON.parse(read("locales/en/common.json"));
  const traditionalChinese = JSON.parse(read("locales/zh-TW/common.json"));

  assert.match(view, /import \{ legal as englishLegal \} from "\.\.\/\.\.\/locales\/en\/common\.json"/);
  assert.match(view, /import \{ legal as traditionalChineseLegal \} from "\.\.\/\.\.\/locales\/zh-TW\/common\.json"/);
  assert.match(view, /useSiteLocale\(\)/);
  assert.match(view, /<main id="main-content" class="tracks-page legal-page">/);
  assert.match(view, /class="key-finder-panel legal-policy-panel"/);
  ["terms", "song-workspace", "copyright", "exports", "privacy", "limitations"].forEach(anchor => {
    assert.match(view, new RegExp(`id="${anchor}"`));
  });
  assert.match(view, /class="secondary-button" href="privacy-policy\.html"/);
  assert.doesNotMatch(view, /data-i18n|umami|analytics|data-umami-event/i);
  assert.deepEqual(Object.keys(english.legal), Object.keys(traditionalChinese.legal));
  assert.equal(Object.keys(english.legal).length, 18);
});

test("keeps the Legal migration bounded at the current patch version", () => {
  const packageJson = JSON.parse(read("package.json"));
  const verifier = read("tools/scripts/verify-cloudflare-build.js");

  assert.equal(packageJson.version, "2.0.3");
  assert.equal(packageJson.dependencies.vue, "3.5.42");
  assert.match(verifier, /const viteOwnedRootHtml = new Set\(\["index\.html", "404\.html", "legal\.html", "privacy-policy\.html", "service-waking\.html", "feedback\.html"\]\)/);
  assert.match(verifier, /Legal canonical metadata differs/);
  assert.match(verifier, /compiled Vue Legal mount marker is missing/);
});
