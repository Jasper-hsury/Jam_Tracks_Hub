const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const css = read("styles/tool-pages.css");
const TOOL_STYLESHEET = "styles/tool-pages.css?v=20261014-v3-tools";

const toolPages = [
  { html: "chord-dictionary.html", view: "ChordDictionaryView", side: "A", track: 5, aside: "standardTuning" },
  { html: "scale.html", view: "ScaleExplorerView", side: "A", track: 4, aside: "standardTuning" },
  { html: "chord-progressions.html", view: "ChordProgressionsView", side: "B", track: 1, aside: null },
  { html: "progression-writer.html", view: "ProgressionWriterView", side: "B", track: 1, aside: "standardTuning" },
  { html: "fretboard-trainer.html", view: "FretboardTrainerView", side: "A", track: 2, aside: "standardTuning" },
  { html: "key-finder.html", view: "KeyFinderView", side: "A", track: 3, aside: "uploadFirst" }
];

test("every tool page loads the v3 tool stylesheet last", () => {
  toolPages.forEach(({ html }) => {
    const source = read(html);
    const links = source.match(/<link rel="stylesheet" href="styles\/[^"]+">/g);
    assert.equal(links.at(-1), `<link rel="stylesheet" href="${TOOL_STYLESHEET}">`, html);
  });
  assert.ok(read("vite.config.mjs").includes(`"${TOOL_STYLESHEET}"`));
  const verifier = read("tools/scripts/verify-cloudflare-build.js");
  assert.equal(verifier.split(`"${TOOL_STYLESHEET}"`).length - 1, toolPages.length);
});

test("other pages keep their stylesheets unchanged", () => {
  ["index.html", "tracks.html", "feedback.html", "song-workspace.html", "legal.html", "privacy-policy.html"]
    .forEach(html => assert.doesNotMatch(read(html), /tool-pages\.css/, html));
});

test("each tool page renders the shared heading with its tracklist number", () => {
  toolPages.forEach(({ view, side, track, aside }) => {
    const source = read(`src/views/${view}.vue`);
    assert.match(source, /import ToolPageHeading from "\.\.\/components\/site\/ToolPageHeading\.vue";/, view);
    assert.match(source, /<main\b[^>]*class="[^"]*\bv3-tool-page\b/, view);
    assert.match(source, new RegExp(`<ToolPageHeading[\\s\\S]*?side="${side}"[\\s\\S]*?:track="${track}"`), view);
    if (aside) assert.match(source, new RegExp(`aside="${aside}"`), view);
    else assert.doesNotMatch(source, /aside="/, view);
    assert.equal((source.match(/<h1\b/g) || []).length, 1, view);
  });
});

test("the shared heading keeps the number decorative and the meta row localized", () => {
  const heading = read("src/components/site/ToolPageHeading.vue");
  assert.match(heading, /<span class="v3-tool-no" aria-hidden="true">\{\{ side \}\}\{\{ track \}\}<\/span>/);
  assert.match(heading, /<div class="v3-tool-meta">/);
  assert.doesNotMatch(heading, /<h1\b|v-html/);
  const en = JSON.parse(read("locales/en/common.json")).pages;
  const zh = JSON.parse(read("locales/zh-TW/common.json")).pages;
  assert.deepEqual(Object.keys(en.toolShell), Object.keys(zh.toolShell));
  assert.equal(en.toolShell.sideTrack, "Side {{side}} · Track {{track}}");
  assert.equal(zh.toolShell.sideTrack, "{{side}} 面 · 第 {{track}} 首");
  ["chordProgressions", "keyFinder", "progressionWriter"].forEach(page => {
    assert.ok(en[page].eyebrow, page);
    assert.ok(zh[page].eyebrow, page);
  });
});

test("tool page rules are scoped so Feedback and other pages keep their look", () => {
  const selectors = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .match(/[^{}]+(?=\{)/g)
    .map(selector => selector.trim())
    .filter(selector => selector && !selector.startsWith("@"));
  assert.ok(selectors.length > 0);
  selectors.forEach(group => group.split(",").forEach(selector => {
    assert.match(selector.trim(), /^html\[data-theme\](?::lang\(zh\))? main\.v3-tool-page\b/, selector);
  }));
});
