const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const V4 = "styles/v4.css?v=20261018-v4-jazz-stage";
const css = read("styles/v4.css");
const themes = read("styles/themes.css");
const pages = fs.readdirSync(root).filter(file => file.endsWith(".html") && read(file).includes("themes.css"));
const en = JSON.parse(read("locales/en/common.json"));
const zh = JSON.parse(read("locales/zh-TW/common.json"));

test("every page loads the v4 stylesheet last, and the build keeps it as a legacy asset", () => {
  assert.equal(pages.length, 14);
  pages.forEach(page => {
    const links = read(page).match(/<link rel="stylesheet" href="\/?styles\/[^"]+"\s*\/?>/g);
    assert.match(links.at(-1), new RegExp(`href="/?${V4.replace(/[.?]/g, "\\$&")}"`), page);
  });
  assert.ok(read("vite.config.mjs").includes(`"${V4}"`));
  assert.equal(read("tools/scripts/verify-cloudflare-build.js").split(`"${V4}"`).length - 1, 14);
});

test("day and night themes use the Jazz Stage palette and the stored theme values stay the same", () => {
  assert.match(themes, /v4 Jazz Stage tokens: night theme \(stored as "default"\)[\s\S]*--paper: #081627;[\s\S]*--ink: #f1e9d8;[\s\S]*--accent: #f2b705;/);
  assert.match(themes, /html\[data-theme="light"\] \{[\s\S]*v4 Jazz Stage tokens: day theme[\s\S]*--paper: #ece7de;[\s\S]*--ink: #0f2b4c;[\s\S]*--accent: #1d6b6b;/);
  assert.match(themes, /--highlight: #f2b705;\s*--on-highlight: #0f2b4c;\s*--stage: #0f2b4c;/);
  const useTheme = read("src/composables/useTheme.js");
  assert.match(useTheme, /const LIGHT_THEME = "light";/);
  assert.match(useTheme, /const DEFAULT_THEME = "default";/);
});

test("each theme has its own homepage tagline, and only the active one is shown", () => {
  assert.deepEqual(en.home.hero.stageTaglines, { day: ["House lights up.", "Let's rehearse."], night: ["Lights down.", "You're on."] });
  assert.deepEqual(zh.home.hero.stageTaglines, { day: ["燈光亮起，", "來排練吧。"], night: ["燈光暗下，", "換你上場。"] });
  const view = read("src/views/HomeView.vue");
  assert.match(view, /class="v4-stage-tagline" data-theme-copy="day"/);
  assert.match(view, /class="v4-stage-tagline" data-theme-copy="night"/);
  assert.match(css, /html\[data-theme="light"\] \[data-theme-copy="night"\],\s*html\[data-theme\]:not\(\[data-theme="light"\]\) \[data-theme-copy="day"\] \{\s*display: none;/);
});

test("the homepage hero names the site once and keeps the record decorative", () => {
  const view = read("src/views/HomeView.vue");
  assert.match(view, /<h1 class="v4-hero-title" :aria-label="home\.hero\.title">/);
  assert.equal((view.match(/<h1\b/g) || []).length, 1);
  assert.match(view, /<div class="v3-sleeve-stage v4-record-stage" aria-hidden="true">/);
  assert.equal(en.home.hero.volume, "Volume {{number}}");
  assert.equal(zh.home.hero.volume, "第 {{number}} 輯");
});

test("display headings are capitals, but track titles keep keys such as Cm and F#m", () => {
  assert.match(css, /html\[data-theme\] :is\(h1, h2\) \{[^}]*font-family: var\(--font-display\);[^}]*text-transform: uppercase;/);
  assert.match(css, /:is\(\[data-track-heading\], \.track-title-display, \.track-title-name, \.track-title-key\) \{\s*text-transform: none;/);
});

test("the spinning record stops for reduced motion", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.v4-record \{\s*animation: none;/);
});

test("chord, scale and song names keep their case under capital display headings", () => {
  assert.match(css, /:is\(#selectedChordName, #scaleTitle, #songChartTitle, #performanceTitle, \.progression-selected-heading h2\) \{\s*text-transform: none;/);
});

test("buttons and fields use the page fonts instead of the browser default", () => {
  assert.match(css, /:where\(button, input, select, textarea\) \{\s*font-family: inherit;/);
});

test("inner pages share the yellow rule, rounded trays and one selected style in both themes", () => {
  assert.match(css, /main\.v3-tool-page \.v3-tool-meta,[\s\S]*?border-top: 6px solid var\(--highlight\);/);
  assert.match(css, /\.dictionary-browser, \.dictionary-detail,[^{]*\.key-finder-panel\),[\s\S]*?border-radius: var\(--radius-card\);/);
  assert.match(css, /html\[data-theme\] main\.v3-tool-page \{\s*--tool-selected-bg: var\(--ink\);\s*--tool-selected-border: var\(--ink\);\s*--tool-selected-text: var\(--paper\);/);
  assert.match(css, /html\[data-theme="default"\] body\[data-vue-page="song-workspace"\] \{\s*--workspace-selected: #2a5d92;/);
});

test("Song Workspace chart lines are not turned into pills", () => {
  assert.doesNotMatch(css, /html\[data-theme\] main :is\(button,/);
});

test("404 and the waking page use the homepage's red sleeve and black record", () => {
  assert.match(css, /main\.status-page \{\s*--record-vinyl: #16130f;[\s\S]*?--record-label: #f2b705;/);
  assert.match(css, /main\.status-page \.status-page-sleeve \{[^}]*background: var\(--sleeve\);/);
});

test("homepage covers show without any tint, and the hero title lines never overlap", () => {
  assert.match(css, /\.v3-home \.release-cover-link::after \{\s*content: none;/);
  assert.doesNotMatch(css, /release-cover-link::after \{\s*content: "";/);
  assert.match(css, /h1\.v4-hero-title \{\s*display: flex;\s*flex-direction: column;\s*gap: 0\.1em;/);
});

test("the hero record slides out of its sleeve slowly on hover", () => {
  assert.match(css, /\.v3-home \.v4-record \{[^}]*transition: translate 1\.6s cubic-bezier\(0\.45, 0, 0\.25, 1\);/);
  assert.match(css, /\.v4-stage-tray:hover \.v4-record \{\s*translate: 40px 0;/);
});
