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
  ["feedback.html", "src/entries/feedback.js", "vue-feedback-root"],
  ["tracks.html", "src/entries/tracks.js", "vue-tracks-root"],
  ["fretboard-trainer.html", "src/entries/fretboard-trainer.js", "vue-fretboard-trainer-root"],
  ["chord-progressions.html", "src/entries/chord-progressions.js", "vue-chord-progressions-root"],
  ["scale.html", "src/entries/scale-explorer.js", "vue-scale-explorer-root"],
  ["chord-dictionary.html", "src/entries/chord-dictionary.js", "vue-chord-dictionary-root"],
  ["progression-writer.html", "src/entries/progression-writer.js", "vue-progression-writer-root"],
  ["key-finder.html", "src/entries/key-finder.js", "vue-key-finder-root"],
  ["song-workspace.html", "src/entries/song-workspace.js", "vue-song-workspace-root"]
];
const legacyPages = [];

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

test("moves shared shell ownership off the thirteen Vue HTML documents", () => {
  vuePages.forEach(([htmlPath, entryPath, mountId]) => {
    const html = read(htmlPath);
    const entry = read(entryPath);

    assert.match(html, new RegExp(`<div id="${mountId}"`), htmlPath);
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

  ["index.html", "404.html", "privacy-policy.html", "service-waking.html", "feedback.html", "fretboard-trainer.html", "chord-progressions.html", "chord-dictionary.html", "progression-writer.html", "key-finder.html"].forEach(htmlPath => {
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

  assert.match(header, /:aria-label="translate\('nav\.primaryLabel', 'Primary navigation'\)"/);
  assert.match(header, /translate\('nav\.closeMenu', 'Close navigation menu'\)/);
  assert.match(header, /translate\('nav\.openMenu', 'Open navigation menu'\)/);
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

test("localizes shared shell controls and social accessibility labels", () => {
  const header = read("src/components/site/SiteHeader.vue");
  const footer = read("src/components/site/SiteFooter.vue");
  const themeToggle = read("src/components/site/ThemeToggle.vue");
  const backToTop = read("src/components/site/BackToTopButton.vue");
  const locale = read("src/i18n/useSiteLocale.js");
  const languageSwitcher = read("src/components/site/LanguageSwitcher.vue");
  const en = JSON.parse(read("locales/en/common.json"));
  const zh = JSON.parse(read("locales/zh-TW/common.json"));

  assert.equal(en.nav.primaryLabel, "Primary navigation");
  assert.equal(zh.nav.primaryLabel, "主要導覽");
  assert.equal(en.nav.openMenu, "Open navigation menu");
  assert.equal(zh.nav.openMenu, "開啟導覽選單");
  assert.equal(en.nav.closeMenu, "Close navigation menu");
  assert.equal(zh.nav.closeMenu, "關閉導覽選單");
  assert.equal(en.theme.switchToLight, "Switch to light theme");
  assert.equal(zh.theme.switchToLight, "切換至淺色主題");
  assert.equal(en.theme.switchToDark, "Switch to dark theme");
  assert.equal(zh.theme.switchToDark, "切換至深色主題");
  assert.equal(en.common.backToTop, "Back to top");
  assert.equal(zh.common.backToTop, "返回頂端");
  assert.equal(zh.footer.youtubeLabel, "前往 Jam Tracks Hub 的 YouTube 頻道");
  assert.equal(zh.footer.instagramLabel, "前往 Jasper 的 Instagram 個人頁面");

  assert.match(header, /translate\('nav\.primaryLabel'/);
  assert.match(header, /translate\('nav\.openMenu'/);
  assert.match(header, /translate\('nav\.closeMenu'/);
  assert.match(footer, /translate\('footer\.youtubeLabel'/);
  assert.match(footer, /translate\('footer\.instagramLabel'/);
  assert.match(themeToggle, /useSiteLocale\(\)/);
  assert.match(themeToggle, /translate\("theme\.switchToDark"/);
  assert.match(themeToggle, /translate\("theme\.switchToLight"/);
  assert.match(themeToggle, /translate\("nav\.appearance"/);
  assert.match(backToTop, /translate\('common\.backToTop'/);
  assert.match(locale, /language\.value === "zh-TW" \? "zh-TW" : "en"/);
  assert.match(languageSwitcher, /切換至繁體中文/);
  assert.match(languageSwitcher, /Switch to English/);

  [header, footer, themeToggle, backToTop].forEach(component => {
    assert.doesNotMatch(component, /aria-label="(?:Primary navigation|Back to top|Visit Jam Tracks Hub|Switch to)/);
  });
});

test("preserves footer content and external-link safety", () => {
  const footer = read("src/components/site/SiteFooter.vue");

  assert.match(footer, /footer\.rights/);
  assert.match(footer, /class="footer-legal-link" href="\/legal\.html"/);
  assert.match(footer, /youtube\.com\/\@weekly_backing_track/);
  assert.match(footer, /instagram\.com\/reyu_jasper/);
  assert.equal((footer.match(/rel="noopener noreferrer"/g) || []).length, 2);
});

test("keeps any remaining legacy pages on the legacy shell with no Vue mount", () => {
  legacyPages.forEach(htmlPath => {
    const html = read(htmlPath);
    assert.match(html, /<nav class="navbar"/i, htmlPath);
    assert.match(html, /<footer class="footer"/i, htmlPath);
    assert.match(html, /scripts\/site\.js/, htmlPath);
    assert.match(html, /scripts\/i18n\.js/, htmlPath);
    assert.doesNotMatch(html, /src\/entries\/(?:404|legal|privacy|service-waking|feedback|fretboard-trainer|chord-progressions|scale-explorer|chord-dictionary|progression-writer|key-finder|song-workspace)\.js|vue-(?:404|legal|privacy|service-waking|feedback|fretboard-trainer|chord-progressions|scale-explorer|chord-dictionary|progression-writer|key-finder|song-workspace)-root/i, htmlPath);
  });
});

test("keeps migrated page views on Vue locale ownership without legacy DOM translation", () => {
  ["ChordDictionaryView.vue", "ChordProgressionsView.vue", "FeedbackView.vue", "FretboardTrainerView.vue", "KeyFinderView.vue", "LegalView.vue", "NotFoundView.vue", "PrivacyView.vue", "ProgressionWriterView.vue", "ScaleExplorerView.vue", "ServiceWakingView.vue", "TracksView.vue"].forEach(fileName => {
    const view = read(`src/views/${fileName}`);
    assert.match(view, /useSiteLocale/);
    assert.doesNotMatch(view, /useLegacyLocale|data-i18n|v-html/);
  });
});

test("keeps proven-dead frontend resources out of source and production HTML", () => {
  [
    "scripts/home.js",
    "scripts/tracks.js",
    "scripts/site.js",
    "scripts/i18n.js",
    "styles/style.css",
    "src/i18n/useLegacyLocale.js"
  ].forEach(relativePath => {
    assert.equal(fs.existsSync(path.join(root, relativePath)), false, relativePath);
  });

  vuePages.forEach(([htmlPath]) => {
    assert.doesNotMatch(
      read(htmlPath),
      /scripts\/(?:home|tracks|site|i18n)\.js|styles\/style\.css/,
      htmlPath
    );
  });
});

test("keeps the Phase 4D version and dependency boundary unchanged", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.version, "2.0.5");
  assert.deepEqual(packageJson.dependencies, { vue: "3.5.42" });
  ["vue-router", "pinia", "vue-i18n", "@vueuse/core"].forEach(name => {
    assert.equal(packageJson.dependencies[name], undefined);
  });
});
