const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const view = read("src/views/TracksView.vue");

test("Tracks no longer renders the scroll windmill decoration", () => {
  assert.doesNotMatch(view, /track-scroll-windmill|track-scroll-five-blade|<Teleport/);
});

test("sort is a two-button segmented control that skips no-op re-sorts", () => {
  assert.match(view, /<div class="v3-sort-buttons" role="group" aria-labelledby="trackSortCaption">/);
  assert.match(view, /:aria-pressed="String\(sortMode === 'newest'\)"\s*@click="setSortMode\(false\)"/);
  assert.match(view, /:aria-pressed="String\(sortMode === 'oldest'\)"\s*@click="setSortMode\(true\)"/);
  assert.match(view, /if \(nextMode === sortMode\.value\) return;/);
  assert.doesNotMatch(view, /trackSortToggle|uiverse-toggle/);
});

test("library eyebrow counts the loaded tracks in both locales", () => {
  const en = JSON.parse(read("locales/en/common.json")).pages.tracks;
  const zh = JSON.parse(read("locales/zh-TW/common.json")).pages.tracks;
  assert.equal(en.libraryCount, "{{count}} original tracks");
  assert.equal(zh.libraryCount, "{{count}} 首原創即興伴奏");
  assert.match(view, /<p v-if="tracks\.length" class="v3-tracks-eyebrow">\{\{ libraryEyebrow \}\}<\/p>/);
});

test("v3 Tracks styles outrank the legacy light-theme rules and keep 40px key options", () => {
  const css = read("styles/pages.css");
  const block = css.slice(css.indexOf("v3 Tracks: Liner Notes catalog"));
  assert.ok(block.length > 0);
  assert.doesNotMatch(block, /html\[data-theme\] \.tracks-library-page/);
  assert.match(block, /html\[data-theme\] main\.tracks-library-page \.track-controls \{[^}]*border-bottom: 1px solid var\(--line\);[^}]*background: none;[^}]*box-shadow: none;/);
  assert.match(block, /\.track-key-checkbox-visual \{\s*height: 40px;/);
});

test("each track row is a record sleeve with a decorative disc and no nested links", () => {
  const card = read("src/components/tracks/TrackCard.vue");
  assert.match(card, /<span class="v3-track-no" aria-hidden="true">\{\{ track\.id \}\}<\/span>/);
  assert.match(card, /<div class="track-cover-media v3-sleeve" aria-hidden="true">\s*<span class="v3-disc">/);
  assert.match(card, /<span v-if="hasYouTubeLink" class="v3-open-hint" aria-hidden="true">YouTube ↗<\/span>/);
  assert.match(card, /class="v3-download-button"[\s\S]*data-card-action="slides"[\s\S]*download[\s\S]*@click\.stop="activateDownload"/);
  assert.doesNotMatch(card, /uiverse-download-button/);
  assert.equal((card.match(/<a\b/g) || []).length, 1);
});

test("the record slides out only for hover-capable pointers without reduced motion", () => {
  const css = read("styles/pages.css");
  const block = css.slice(css.indexOf("v3 Tracks rows"));
  assert.match(block, /@media \(hover: hover\) and \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\.track-card:hover \.v3-disc,[\s\S]*?\.track-card:focus-visible \.v3-disc,[\s\S]*?\.track-card:focus-within \.v3-disc \{\s*left: 180px;\s*transform: rotate\(60deg\);/);
  assert.match(block, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?transition: none;/);
  assert.match(block, /@media \(max-width: 760px\) \{[\s\S]*?\.track-card \{\s*grid-template-columns: 1fr;/);
  assert.match(block, /\.v3-download-button \{[^}]*width: 44px;[^}]*height: 44px;/);
});

test("pages.css carries a fresh cache key so v3.1 markup never meets the cached v3.0 stylesheet", () => {
  const pages = ["tracks.html", "index.html", "song-workspace.html"];
  pages.forEach(page => assert.match(read(page), /styles\/pages\.css\?v=20261017-polish/, page));
  assert.doesNotMatch(read("tracks.html"), /styles\/pages\.css\?v=20261014-v3-liner-notes/);
});

test("the Tracks toolbar animates in once, from the entrance timeline only", () => {
  const animations = read("scripts/site-animations.js");
  assert.match(animations, /timeline\.from\("\.tracks-library-page \.track-controls"/);
  assert.match(animations, /\.filter\(target => !target\.matches\("\.tracks-library-page \.track-controls"\)\)/);
  const key = "scripts/site-animations.js?v=20261018-v4-jazz-stage";
  fs.readdirSync(root).filter(file => file.endsWith(".html") && read(file).includes("site-animations.js"))
    .forEach(file => assert.ok(read(file).includes(key), file));
  assert.equal(read("vite.config.mjs").split("scripts/site-animations.js?v=").length - 1, 1);
});

test("Tracks shares the tool pages' column, heading size and compact centred phone heading", () => {
  const css = read("styles/pages.css");
  assert.match(css, /html\[data-theme\] main\.tracks-library-page \{\s*max-width: 1200px;/);
  assert.match(css, /html\[data-theme\] main\.tracks-library-page h1 \{[^}]*font-size: clamp\(46px, 6vw, 76px\);[^}]*line-height: 1\.02;/);
  assert.match(css, /@media \(max-width: 760px\) \{\s*html\[data-theme\] main\.tracks-library-page \{\s*padding: 0 16px;\s*\}\s*html\[data-theme\] main\.tracks-library-page \.page-heading-row \{\s*justify-items: center;\s*text-align: center;\s*\}[\s\S]*?main\.tracks-library-page h1 \{\s*margin-bottom: 6px;\s*font-size: 34px;/);
});

test("Tracks toolbar labels never break onto two lines", () => {
  assert.match(read("styles/pages.css"), /main\.tracks-library-page \.track-sort-caption \{[^}]*white-space: nowrap;/);
});
