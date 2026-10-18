const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const en = JSON.parse(read("locales/en/common.json"));
const zh = JSON.parse(read("locales/zh-TW/common.json"));
const toolCss = read("styles/tool-pages.css");
const workspaceCss = read("styles/song-workspace-v3.css");
const secondaryCss = read("styles/secondary-pages.css");
const pagesCss = read("styles/pages.css");
const indexablePages = [
  "tracks", "chord-dictionary", "scale", "chord-progressions", "progression-writer",
  "fretboard-trainer", "key-finder", "song-workspace", "feedback", "legal", "privacy-policy"
];

test("every inner page tagline uses the accent colour", () => {
  assert.match(toolCss, /\.v3-tool-heading \.hero-tagline \{\s*margin: 10px 0 0;\s*color: var\(--accent\);/);
  assert.match(workspaceCss, /\.song-workspace-hero \.hero-tagline \{\s*margin: 10px 0 0;\s*color: var\(--accent\);/);
  assert.match(secondaryCss, /main\.feedback-page \.hero-tagline \{\s*max-width: 820px;\s*margin: 12px 0 0;\s*color: var\(--accent\);/);
  assert.match(pagesCss, /main\.tracks-library-page \.hero-tagline \{[^}]*color: var\(--accent\);[^}]*font-size: clamp\(19px, 2vw, 24px\);/);
});

test("section headings are 30px on every inner page and 24px on phones", () => {
  assert.match(toolCss, /\.key-finder-panel \.tool-section-heading h2 \{[^}]*font-size: 30px;/);
  assert.match(toolCss, /@media \(max-width: 760px\) \{\s*html\[data-theme\] main\.v3-tool-page :is\([^)]*\.section-title[^{]*\{\s*font-size: 24px;/);
  assert.match(workspaceCss, /\.workspace-section-heading h2 \{[^}]*font-size: 30px;/);
  assert.match(secondaryCss, /\.feedback-panel h2 \{\s*margin: 0;\s*font-size: 30px;/);
  assert.match(secondaryCss, /\.feedback-panel h2 \{\s*font-size: 24px;/);
});

test("standard buttons are 46px, 15px and weight 600 across the site", () => {
  assert.match(toolCss, /main\.v3-tool-page :is\(\.primary-button, \.secondary-button\) \{\s*min-height: 46px;[^}]*font-size: 15px;\s*font-weight: 600;/);
  assert.match(toolCss, /main\.v3-tool-page \.select-key-button \{[^}]*font-size: 15px;\s*font-weight: 600;/);
  assert.match(toolCss, /\.dictionary-play-button \{\s*min-height: 46px;\s*padding: 0 20px;\s*font-size: 15px;\s*font-weight: 600;/);
  assert.match(toolCss, /:is\(\.scale-play-button, \.scale-download-button\) \{\s*min-height: 46px;\s*padding: 0 20px;\s*font-size: 15px;\s*font-weight: 600;/);
  assert.match(toolCss, /\.key-finder-link-form :is\(input, \.secondary-button\),\s*html\[data-theme\] main\.v3-tool-page \.helper-download-link \{\s*box-sizing: border-box;\s*min-height: 46px;\s*height: 46px;/);
  assert.match(workspaceCss, /\.workspace-button \{[^}]*font-size: 15px;/);
  assert.match(pagesCss, /\.v3-home \.hero-actions \.secondary-button \{\s*display: inline-flex;\s*align-items: center;\s*min-height: 46px;/);
  assert.match(pagesCss, /main\.tracks-library-page \.v3-sort-button \{\s*min-height: 44px;/);
});

test("Tracks, Chord Progressions and Progression Writer have their own taglines", () => {
  assert.equal(en.pages.tracks.tagline, "Press play. Find your groove.");
  assert.equal(zh.pages.tracks.tagline, "按下播放，找到你的律動。");
  assert.equal(en.pages.chordProgressions.tagline, "Learn the moves songs are built on.");
  assert.equal(zh.pages.chordProgressions.tagline, "學會撐起每首歌的和弦走向。");
  assert.equal(en.pages.progressionWriter.tagline, "Your chords, your order, one clean chart.");
  assert.equal(zh.pages.progressionWriter.tagline, "你的和弦、你的順序，整理成一張乾淨的譜。");
  for (const page of ["tracks", "chordProgressions", "progressionWriter"]) {
    assert.notEqual(en.pages[page].tagline, en.home.hero.tagline);
  }
});

test("links back to another page all read Back to / 回到 and carry no arrow", () => {
  assert.equal(en.notFound.returnHome, "Back to Home");
  assert.equal(zh.notFound.returnHome, "回到首頁");
  assert.equal(zh.pages.feedback.backToHome, "回到首頁");
  assert.equal(en.pages.feedback.backToHome, "Back to Home");
  assert.match(JSON.stringify(zh), /"backToKeyFinder":"回到調性分析"/);
  assert.doesNotMatch(JSON.stringify(zh), /返回首頁|回到主頁|返回調性分析/);
});

test("canonical and share URLs point at the clean addresses the site serves", () => {
  for (const page of [...indexablePages, "service-waking", "404"]) {
    const html = read(`${page}.html`);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://jamtrackshub\\.com/${page}">`), page);
    assert.match(html, new RegExp(`<meta property="og:url" content="https://jamtrackshub\\.com/${page}">`), page);
  }
  fs.readdirSync(root).filter(file => file.endsWith(".html")).forEach(file => {
    assert.doesNotMatch(read(file), /https:\/\/jamtrackshub\.com\/[a-z0-9-]+\.html/, file);
  });
});

test("Song Workspace carries the same share tags as every other page", () => {
  const html = read("song-workspace.html");
  [
    /property="og:image:width" content="2500"/,
    /property="og:image:height" content="1230"/,
    /property="og:image:alt"/,
    /property="og:locale" content="en_US"/,
    /name="twitter:title" content="Song Workspace \| Jam Tracks Hub"/,
    /name="twitter:description"/,
    /name="twitter:image" content="https:\/\/jamtrackshub\.com\/share_icon\.png"/,
    /name="twitter:image:alt"/
  ].forEach(pattern => assert.match(html, pattern));
});

test("Privacy starts in English and Legal gets the same page entrance as Privacy", () => {
  assert.match(read("privacy-policy.html"), /<html lang="en">/);
  const legal = read("legal.html");
  assert.match(legal, /assets\/vendor\/gsap\/gsap\.min\.js[\s\S]*assets\/vendor\/gsap\/ScrollTrigger\.min\.js[\s\S]*scripts\/site-animations\.js\?v=20261018-v4-jazz-stage[\s\S]*src\/entries\/legal\.js/);
  assert.match(read("scripts/site-animations.js"), /heroPieces\.filter\(target => !target\.closest\("\.privacy-page, \.legal-page"\)\)/);
});

test("the sitemap lists every indexable page and robots.txt points to it", () => {
  const sitemap = read("sitemap.xml");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls, ["https://jamtrackshub.com/", ...indexablePages.map(page => `https://jamtrackshub.com/${page}`)]);
  assert.doesNotMatch(sitemap, /404|service-waking|\.html/);
  assert.match(read("robots.txt"), /^Sitemap: https:\/\/jamtrackshub\.com\/sitemap\.xml$/m);
  const build = read("tools/scripts/build-cloudflare.js");
  assert.match(build, /"robots\.txt",/);
  assert.match(build, /"sitemap\.xml",/);
});
