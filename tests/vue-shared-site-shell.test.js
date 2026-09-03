const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const vuePages = [
  ["index.html", "src/entries/home.js", "vue-home-root"],
  ["404.html", "src/entries/404.js", "vue-404-root"],
  ["legal.html", "src/entries/legal.js", "vue-legal-root"],
  ["privacy-policy.html", "src/entries/privacy.js", "vue-privacy-root"],
  ["service-waking.html", "src/entries/service-waking.js", "vue-service-waking-root"],
  ["feedback.html", "src/entries/feedback.js", "vue-feedback-root"]
];
const legacyPages = [
  "tracks.html",
  "chord-progressions.html",
  "chord-dictionary.html",
  "scale.html",
  "fretboard-trainer.html",
  "progression-writer.html",
  "key-finder.html",
  "song-workspace.html"
];

test("provides one reusable Vue-owned site shell composition", () => {
  const shell = read("src/components/site/SiteShell.vue");
  const mountHelper = read("src/app/mountSitePage.js");

  assert.match(shell, /<a class="skip-link" href="#main-content">/);
  assert.equal((shell.match(/<SiteHeader/g) || []).length, 1);
  assert.equal((shell.match(/<SiteFooter/g) || []).length, 1);
  assert.match(shell, /<slot><\/slot>/);
  assert.match(mountHelper, /h\(SiteShell/);
  assert.match(mountHelper, /default: \(\) => h\(view\)/);
});

test("moves shared shell ownership off the six Vue HTML documents", () => {
  vuePages.forEach(([htmlPath, entryPath, mountId]) => {
    const html = read(htmlPath);
    const entry = read(entryPath);

    assert.match(html, new RegExp(`<div id="${mountId}"><\\/div>`), htmlPath);
    assert.doesNotMatch(html, /<nav class="navbar"|<footer class="footer"|class="skip-link"/, htmlPath);
    assert.doesNotMatch(html, /scripts\/(?:site|i18n)\.js/, htmlPath);
    assert.match(entry, /mountSitePage\(\{/, entryPath);
  });
});

test("retains early bootstrap, Umami, and animation compatibility assets per page", () => {
  vuePages.forEach(([htmlPath]) => {
    const html = read(htmlPath);
    assert.match(html, /scripts\/theme-init\.js/);
    assert.match(html, /scripts\/i18n-init\.js/);
    assert.match(html, /https:\/\/cloud\.umami\.is\/script\.js/);
  });

  ["index.html", "404.html", "privacy-policy.html", "service-waking.html", "feedback.html"].forEach(htmlPath => {
    assert.match(read(htmlPath), /scripts\/site-animations\.js/);
  });
});

test("owns navigation, mobile state, current state, and accessibility in SiteHeader", () => {
  const header = read("src/components/site/SiteHeader.vue");
  const smartNavbar = read("src/composables/useSmartNavbar.js");

  [
    "/index.html#home",
    "/tracks.html",
    "/chord-dictionary.html",
    "/scale.html",
    "/key-finder.html",
    "/chord-progressions.html",
    "/song-workspace.html",
    "/fretboard-trainer.html",
    "/index.html#about"
  ].forEach(href => assert.match(header, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));

  assert.match(header, /aria-label="Primary navigation"/);
  assert.match(header, /:aria-expanded="String\(menuOpen\)"/);
  assert.match(header, /:aria-current="isCurrent\(item\) \? 'page' : null"/);
  assert.match(smartNavbar, /event\.key !== "Escape"/);
  assert.match(smartNavbar, /closeMenu\(true\)/);
  assert.match(smartNavbar, /window\.innerWidth > 1180/);
  assert.match(smartNavbar, /document\.body\.classList\.toggle\("nav-drawer-open"/);
  assert.match(smartNavbar, /directionOriginY - currentScrollY >= 3/);
  assert.match(smartNavbar, /currentScrollY - directionOriginY >= 14/);
});

test("normalizes current-page state for extensionless and html routes", () => {
  const smartNavbar = read("src/composables/useSmartNavbar.js");

  assert.ok(smartNavbar.includes('.replace(/^\\/+|\\/+$/g, "")'));
  assert.ok(smartNavbar.includes('.replace(/\\.html$/i, "")'));
  assert.match(smartNavbar, /return path \|\| "index"/);
});

test("preserves language and theme storage and compatibility contracts", () => {
  const locale = read("src/i18n/useSiteLocale.js");
  const languageSwitcher = read("src/components/site/LanguageSwitcher.vue");
  const theme = read("src/composables/useTheme.js");
  const themeToggle = read("src/components/site/ThemeToggle.vue");

  assert.match(locale, /jasperMusicLanguage/);
  assert.match(locale, /document\.documentElement\.lang/);
  assert.match(locale, /document\.title = title/);
  assert.match(locale, /jasper:language-change/);
  assert.match(languageSwitcher, /targetLanguage\.value === "zh-TW" \? "中" : "EN"/);
  assert.match(theme, /jasperMusicTheme/);
  assert.match(theme, /document\.documentElement\.dataset\.theme/);
  assert.match(theme, /jasper:theme-change/);
  assert.match(themeToggle, /class="theme-toggle-input"/);
});

test("preserves footer content and external-link safety", () => {
  const footer = read("src/components/site/SiteFooter.vue");

  assert.match(footer, /footer\.rights/);
  assert.match(footer, /class="footer-legal-link" href="\/legal\.html"/);
  assert.match(footer, /youtube\.com\/\@weekly_backing_track/);
  assert.match(footer, /instagram\.com\/reyu_jasper/);
  assert.equal((footer.match(/rel="noopener noreferrer"/g) || []).length, 2);
});

test("keeps every legacy page on the legacy shell with no Vue mount", () => {
  legacyPages.forEach(htmlPath => {
    const html = read(htmlPath);
    assert.match(html, /<nav class="navbar"/i, htmlPath);
    assert.match(html, /<footer class="footer"/i, htmlPath);
    assert.match(html, /scripts\/site\.js/, htmlPath);
    assert.match(html, /scripts\/i18n\.js/, htmlPath);
    assert.doesNotMatch(html, /src\/entries\/(?:404|legal|privacy|service-waking|feedback)\.js|vue-(?:404|legal|privacy|service-waking|feedback)-root/i, htmlPath);
  });
});

test("keeps migrated page views on Vue locale ownership without legacy DOM translation", () => {
  ["FeedbackView.vue", "LegalView.vue", "NotFoundView.vue", "PrivacyView.vue", "ServiceWakingView.vue"].forEach(fileName => {
    const view = read(`src/views/${fileName}`);
    assert.match(view, /useSiteLocale/);
    assert.doesNotMatch(view, /useLegacyLocale|data-i18n|v-html/);
  });
});

test("keeps the Phase 3B version and dependency boundary unchanged", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.version, "2.0.3");
  assert.deepEqual(packageJson.dependencies, { vue: "3.5.42" });
  ["vue-router", "pinia", "vue-i18n", "@vueuse/core"].forEach(name => {
    assert.equal(packageJson.dependencies[name], undefined);
  });
});
