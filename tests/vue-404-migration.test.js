const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

test("makes 404.html the first production Vue-owned MPA input", () => {
  const config = read("vite.config.mjs");
  const html = read("404.html");

  assert.match(config, /"404":\s*resolve\(root,\s*"404\.html"\)/);
  assert.match(config, /"vue-foundation":\s*resolve\(root,\s*"src\/entries\/vue-foundation\.js"\)/);
  assert.match(config, /preserveLegacyHtmlAssets/);
  assert.match(config, /vite-preserved-legacy\.invalid/);
  assert.match(html, /<div id="vue-404-root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/entries\/404\.js"><\/script>/);
});

test("preserves the public 404 metadata and action contract", () => {
  const html = read("404.html");

  assert.match(html, /<title>Page Not Found \| Jam Tracks Hub<\/title>/);
  assert.match(html, /<meta name="description" content="The requested Jam Tracks Hub page could not be found\. Return to backing tracks or guitar tools\.">/);
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jamtrackshub\.com\/404\.html">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/jamtrackshub\.com\/404\.html">/);
  assert.match(html, /<body data-i18n-title="titles\.notFound">/);
  assert.match(html, /<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/);

  const view = read("src/views/NotFoundView.vue");
  assert.match(view, /<main id="main-content" class="status-page">/);
  assert.match(view, /<p class="status-page-code">404<\/p>/);
  assert.match(view, /class="primary-button" href="\/index\.html"/);
  assert.match(view, /class="secondary-button" href="\/key-finder\.html"/);
  assert.doesNotMatch(view, /umami|analytics|data-umami-event/i);
});

test("keeps Vue and legacy i18n DOM ownership separate", () => {
  const entry = read("src/entries/404.js");
  const view = read("src/views/NotFoundView.vue");
  const localeBridge = read("src/i18n/useSiteLocale.js");
  const english = JSON.parse(read("locales/en/common.json"));
  const traditionalChinese = JSON.parse(read("locales/zh-TW/common.json"));

  assert.match(entry, /mountSitePage\(\{[\s\S]*mountId: "vue-404-root"[\s\S]*view: NotFoundView/);
  assert.doesNotMatch(view, /data-i18n/);
  assert.match(localeBridge, /jasper:language-change/);
  assert.match(localeBridge, /document\.documentElement\.dataset\.language/);
  assert.match(localeBridge, /jasperMusicLanguage/);
  assert.match(localeBridge, /locales\/en\/common\.json/);
  assert.match(localeBridge, /locales\/zh-TW\/common\.json/);
  assert.deepEqual(english.notFound, {
    title: "This page missed the downbeat.",
    copy: "The link may have moved, but the music is still here.",
    returnHome: "Return Home",
    openKeyFinder: "Open Key Finder"
  });
  assert.deepEqual(traditionalChinese.notFound, {
    title: "這個頁面錯過了第一拍。",
    copy: "連結可能已移動，但音樂仍在這裡。",
    returnHome: "返回首頁",
    openKeyFinder: "開啟調性分析"
  });
});

test("keeps every production HTML entry outside the declared Vue set legacy-owned", () => {
  const htmlFiles = fs.readdirSync(root)
    .filter(fileName => fileName.endsWith(".html") && !["404.html", "legal.html", "privacy-policy.html", "service-waking.html", "feedback.html"].includes(fileName));

  assert.ok(htmlFiles.length > 0);
  htmlFiles.forEach(fileName => {
    const html = read(fileName);
    assert.doesNotMatch(html, /vue-404-root|src\/entries\/404\.js|assets\/vue\/404-/i, fileName);
  });

  const verifier = read("tools/scripts/verify-cloudflare-build.js");
  assert.match(verifier, /const viteOwnedRootHtml = new Set\(\["index\.html", "404\.html", "legal\.html", "privacy-policy\.html", "service-waking\.html", "feedback\.html", "tracks\.html"\]\)/);
  assert.match(verifier, /if \(viteOwnedRootHtml\.has\(relativePath\)\) return;/);
  assert.match(verifier, /root HTML is not byte-identical/);
  assert.match(verifier, /track slide HTML inventory differs/);
});

test("does not expand the Vue application architecture", () => {
  const packageJson = JSON.parse(read("package.json"));

  ["vue-router", "pinia", "@vueuse/core", "vue-i18n", "vitest", "@vue/test-utils"].forEach(name => {
    assert.equal(packageJson.dependencies?.[name], undefined);
    assert.equal(packageJson.devDependencies?.[name], undefined);
  });
  assert.equal(packageJson.version, "2.0.3");
});

test("keeps the complete Phase 2A responsive matrix on established shared breakpoints", () => {
  const requestedWidths = [375, 390, 430, 768, 820, 834, 1024, 1180, 1194, 1280, 1440];
  const compactWidths = requestedWidths.filter(width => width <= 1180);
  const desktopWidths = requestedWidths.filter(width => width > 1180);
  const pagesCss = read("styles/pages.css");

  assert.deepEqual(compactWidths, [375, 390, 430, 768, 820, 834, 1024, 1180]);
  assert.deepEqual(desktopWidths, [1194, 1280, 1440]);
  assert.match(pagesCss, /\.status-page \{[\s\S]*?width: min\(760px, calc\(100% - 36px\)\);/);
  assert.match(pagesCss, /\.status-page-actions \{[\s\S]*?display: flex;[\s\S]*?flex-wrap: wrap;/);
  assert.match(pagesCss, /@media \(max-width: 1180px\) \{[\s\S]*?\.status-page \{\s*justify-items: stretch;[\s\S]*?\.status-page h1 \{\s*font-size: 38px;[\s\S]*?\.status-page-actions \{\s*display: grid;\s*grid-template-columns: 1fr;/);
  assert.match(pagesCss, /@media \(max-width: 1180px\) \{[\s\S]*?html,\s*body \{\s*overflow-x: hidden;\s*overflow-x: clip;/);
});
