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
