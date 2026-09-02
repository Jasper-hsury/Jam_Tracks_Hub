const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

test("makes Privacy the third production Vue-owned MPA entry", () => {
  const config = read("vite.config.mjs");
  const html = read("privacy-policy.html");
  const entry = read("src/entries/privacy.js");

  assert.match(config, /privacy:\s*resolve\(root,\s*"privacy-policy\.html"\)/);
  assert.match(config, /viteOwnedHtml = new Set\(\["\/404\.html", "\/legal\.html", "\/privacy-policy\.html", "\/service-waking\.html"\]\)/);
  assert.match(html, /<div id="vue-privacy-root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/entries\/privacy\.js"><\/script>/);
  assert.match(entry, /createApp\(PrivacyView\)\.mount\(mountTarget\)/);
  assert.match(entry, /restoreInitialFragment\(\)/);
});

test("restores initial bookmark fragments after Vue mounts their targets", () => {
  const helper = read("src/utils/restoreInitialFragment.js");

  assert.match(helper, /window\.location\.hash\.slice\(1\)/);
  assert.match(helper, /decodeURIComponent\(encodedId\)/);
  assert.match(helper, /window\.requestAnimationFrame/);
  assert.match(helper, /document\.getElementById\(id\)\?\.scrollIntoView\(\)/);
  assert.doesNotMatch(helper, /history\.|pushState|replaceState|scrollBehavior/);
});

test("preserves Privacy metadata, analytics, theme, locale, shell, and animation assets", () => {
  const html = read("privacy-policy.html");

  assert.match(html, /<title>Privacy &amp; User Content \| Jam Tracks Hub<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jamtrackshub\.com\/privacy-policy\.html">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/jamtrackshub\.com\/privacy-policy\.html">/);
  assert.match(html, /<body data-i18n-title="titles\.privacy">/);
  assert.match(html, /scripts\/theme-init\.js\?v=20260725-friendly-insect-switch/);
  assert.match(html, /scripts\/i18n-init\.js\?v=20260804-no-language-flash/);
  assert.match(html, /<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/);
  assert.match(html, /<nav class="navbar" aria-label="Primary navigation">/);
  assert.match(html, /assets\/vendor\/gsap\/gsap\.min\.js/);
  assert.match(html, /scripts\/site-animations\.js\?v=20260830-privacy-static-policy/);
});

test("renders the established Privacy structure from canonical locale resources", () => {
  const view = read("src/views/PrivacyView.vue");
  const english = JSON.parse(read("locales/en/common.json"));
  const traditionalChinese = JSON.parse(read("locales/zh-TW/common.json"));

  assert.match(view, /import \{ privacy as englishPrivacy \} from "\.\.\/\.\.\/locales\/en\/common\.json"/);
  assert.match(view, /import \{ privacy as traditionalChinesePrivacy \} from "\.\.\/\.\.\/locales\/zh-TW\/common\.json"/);
  assert.match(view, /useLegacyLocale\(\)/);
  assert.match(view, /<main id="main-content" class="tracks-page privacy-page">/);
  assert.match(view, /class="key-finder-panel privacy-policy-panel"/);
  assert.match(view, /id="song-workspace-local-storage"/);
  assert.match(view, /id="user-content"/);
  ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "18", "19", "20", "21", "22", "23", "24", "25", "16", "17"].forEach(key => {
    assert.match(view, new RegExp(`privacy\\.body\\["${key}"\\]`));
  });
  assert.doesNotMatch(view, /data-i18n|umami|analytics|data-umami-event/i);
  assert.deepEqual(Object.keys(english.privacy.body).sort(), Object.keys(traditionalChinese.privacy.body).sort());
  assert.equal(Object.keys(english.privacy.body).length, 25);
});

test("keeps Privacy static and its migration bounded at the current patch version", () => {
  const packageJson = JSON.parse(read("package.json"));
  const pagesCss = read("styles/pages.css");
  const verifier = read("tools/scripts/verify-cloudflare-build.js");

  assert.equal(packageJson.version, "2.0.3");
  assert.match(pagesCss, /\.privacy-policy-panel\s*\{[^}]*animation:\s*none/s);
  assert.match(verifier, /const viteOwnedRootHtml = new Set\(\["404\.html", "legal\.html", "privacy-policy\.html", "service-waking\.html"\]\)/);
  assert.match(verifier, /Privacy canonical metadata differs/);
  assert.match(verifier, /compiled Vue Privacy mount marker is missing/);
});
