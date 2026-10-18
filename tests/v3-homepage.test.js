const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const view = read("src/views/HomeView.vue");
const css = read("styles/pages.css");

test("workflows read as a two-sided tracklist numbered A1 to B2", () => {
  const numbers = [...view.matchAll(/no: "([AB]\d)"/g)].map(match => match[1]);
  assert.deepEqual(numbers, ["A1", "A2", "A3", "A4", "A5", "B1", "B2"]);
  assert.match(view, /id: "practice",\s*side: "a",\s*sideStart: true/);
  assert.match(view, /id: "understand",\s*side: "a",/);
  assert.match(view, /id: "create",\s*side: "b",\s*sideStart: true/);
  assert.match(view, /id: "playSongs",\s*side: "b",/);
  assert.match(view, /<p v-if="group\.sideStart" class="v3-side-title">\{\{ home\.tracklist\.sides\[group\.side\] \}\}<\/p>/);
  assert.match(view, /<span class="v3-track-no" aria-hidden="true">\{\{ tool\.no \}\}<\/span>/);
});

test("tracklist copy is localized in English and Traditional Chinese", () => {
  const en = JSON.parse(read("locales/en/common.json")).home.tracklist;
  const zh = JSON.parse(read("locales/zh-TW/common.json")).home.tracklist;
  assert.deepEqual(en, {
    label: "Tracklist",
    recordSide: "Side A",
    sides: { a: "Side A — Practice & Understand", b: "Side B — Create & Play" }
  });
  assert.deepEqual(zh, {
    label: "曲目表",
    recordSide: "A 面",
    sides: { a: "A 面 — 練習與理解", b: "B 面 — 創作與演奏" }
  });
});

test("record sleeve hero is decorative, uses the site silhouette, and shows no portrait", () => {
  assert.match(view, /<div class="v3-sleeve-stage v4-record-stage" aria-hidden="true">/);
  assert.match(view, /:src="'assets\/images\/icon\.png'" alt=""/);
  assert.doesNotMatch(view, /cover\.jpeg|about-portrait|home-jam-mark/);
  assert.match(css, /html\[data-theme\] \.v3-home \.v3-sleeve \{[^}]*z-index: 2;[^}]*background: var\(--sleeve\);/);
  assert.match(css, /html\[data-theme\] \.v3-home \.v3-record \{[^}]*z-index: 1;/);
});

test("homepage keeps the featured embed and never reads Song Workspace data", () => {
  assert.match(view, /src="https:\/\/www\.youtube\.com\/embed\/nNlJNDU-Xgw"/);
  assert.match(view, /<section class="home-feature-band v3-band v3-band--feature" id="piano-track" aria-labelledby="featuredAudioTitle">/);
  assert.doesNotMatch(view, /useSongWorkspace|indexedDB|localStorage|sessionStorage/);
});

test("Chinese homepage headings and taglines never use synthesized italics", () => {
  assert.match(css, /html\[data-theme\]:lang\(zh\) \.v3-home \.home-hero \.signature-slogan \{\s*font-style: normal;/);
  assert.match(css, /html\[data-theme\]:lang\(zh\) \.v3-home \.about-copy h2 \{[^}]*font-style: normal;/);
  assert.match(css, /html\[data-theme\]:lang\(zh\) \.v3-home \.v3-side-title \{[^}]*font-style: normal;/);
});
