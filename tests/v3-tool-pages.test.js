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
  const splitTopLevel = group => {
    const parts = [];
    let depth = 0;
    let current = "";
    for (const character of group) {
      if (character === "(") depth += 1;
      if (character === ")") depth -= 1;
      if (character === "," && depth === 0) {
        parts.push(current);
        current = "";
      } else {
        current += character;
      }
    }
    return [...parts, current];
  };
  selectors.forEach(group => splitTopLevel(group).forEach(selector => {
    assert.match(selector.trim(), /^html\[data-theme\](?::lang\(zh\))? main\.v3-tool-page\b/, selector);
  }));
});

test("Chord Dictionary groups the selected chord into a dark band without changing its controls", () => {
  const view = read("src/views/ChordDictionaryView.vue");
  assert.match(view, /<div class="v3-selected-band">\s*<div class="dictionary-detail-heading">[\s\S]*?id="playChordButton"[\s\S]*?<dl class="dictionary-facts">[\s\S]*?id="dictionaryRelatedActions"[\s\S]*?<\/div>\s*<\/div>\s*<div class="dictionary-shape-heading">/);
  assert.match(css, /main\.v3-tool-page \.v3-selected-band \{[^}]*background: var\(--band\);/);
  assert.match(css, /\.dictionary-position-filter button\)\.is-selected/);
});

test("Scale Explorer keeps interval colors while the current scale becomes a dark band", () => {
  assert.match(css, /main\.v3-tool-page \.scale-summary \{[^}]*background: var\(--band\);/);
  assert.match(css, /\.scale-interval-chip::before \{[^}]*background: var\(--interval-color\);/);
  assert.match(css, /main\.v3-tool-page \.segmented-control button:is\(\.is-selected, \.active\)/);
  assert.doesNotMatch(css, /\.fret-note[^{]*\{[^}]*background/);
});

test("Chord Progressions picks major or minor with two buttons and keeps the mode prompt", () => {
  const view = read("src/views/ChordProgressionsView.vue");
  assert.match(view, /<div class="v3-mode-buttons" id="keyModeToggle" role="group" :aria-label="messages\.switchMode">/);
  assert.match(view, /:aria-pressed="String\(state\.mode\.value === 'major'\)"\s*@click="setMode\('major'\)"/);
  assert.match(view, /:aria-pressed="String\(state\.mode\.value === 'minor'\)"\s*@click="setMode\('minor'\)"/);
  assert.match(view, /function setMode\(mode\) \{\s*if \(state\.mode\.value === mode\) return;\s*state\.setMode\(mode\);\s*modePrompt\.value = true;/);
  assert.doesNotMatch(view, /key-mode-toggle|type="checkbox"/);
  assert.match(css, /\.progression-selected-heading \{[^}]*background: var\(--band\);/);
  assert.match(css, /\.progression-mini-neck \{\s*--neck-line: rgba\(var\(--ink-rgb\), 0\.34\);/);
});

test("Progression Writer swaps its three switches for segmented buttons bound to the same state", () => {
  const view = read("src/views/ProgressionWriterView.vue");
  assert.match(view, /id="progressionStructureToggle" role="group" :aria-label="messages\.switchStructure"/);
  assert.match(view, /:aria-pressed="String\(writer\.mode\.value === 'single'\)" @click="setStructure\('single'\)"/);
  assert.match(view, /:aria-pressed="String\(writer\.mode\.value === 'sections'\)" @click="setStructure\('sections'\)"/);
  assert.match(view, /function setStructure\(nextMode\) \{\s*if \(writer\.mode\.value === nextMode\) return;\s*writer\.setMode\(nextMode\);/);
  assert.match(view, /id="progressionKeyQualityToggle" role="group" :aria-label="messages\.switchKeyMode"/);
  assert.match(view, /@click="writer\.keyQuality\.value = 'minor'"/);
  assert.match(view, /id="separateProgressionDownload" role="group" :aria-label="messages\.downloadLayout"/);
  assert.match(view, /@click="writer\.separateDownload\.value = true"/);
  assert.match(view, /id="downloadProgressionButton"\s*class="v3-download-button progression-download-button"/);
  assert.doesNotMatch(view, /uiverse-|type="checkbox"|track-slides-download/);
});

test("Fretboard Trainer shows the question as a dark band and marks answers without color alone", () => {
  assert.match(css, /main\.v3-tool-page \.trainer-question-card,\s*html\[data-theme\] main\.v3-tool-page \.trainer-question-card:hover \{[^}]*background: var\(--band\);/);
  assert.match(css, /\.note-answer-grid button\.is-correct \{[^}]*background: var\(--ink\);/);
  assert.match(css, /\.note-answer-grid button\.is-wrong \{[^}]*border: 2px solid var\(--danger\);[^}]*text-decoration: line-through;/);
  assert.match(css, /\.note-answer-grid button \{\s*min-height: 52px;/);
});

test("Key Finder keeps its flow and restyles upload, status and result surfaces", () => {
  const view = read("src/views/KeyFinderView.vue");
  ["key-finder-status-row", "service-wake-panel", "key-finder-divider-primary", "upload-file-label", "key-finder-link-form", "helper-install-details", "key-finder-result"]
    .forEach(name => assert.match(view, new RegExp(name), name));
  assert.match(css, /main\.v3-tool-page \.upload-file-label \{[^}]*border: 1px dashed var\(--ink\);/);
  assert.match(css, /main\.v3-tool-page \.key-finder-result\.key-finder-empty \{[^}]*font-style: italic;/);
  assert.match(css, /main\.v3-tool-page \.key-finder-panel,\s*html\[data-theme\] main\.v3-tool-page \.key-finder-panel:hover \{[^}]*border-radius: 0;/);
});

test("phones get tighter panels and a full-height Analyze File button", () => {
  assert.match(css, /\.analyze-file-button \{\s*min-height: 46px;/);
  assert.match(css, /@media \(max-width: 760px\) \{[\s\S]*?\.key-finder-panel\) \{\s*padding: 20px;/);
  assert.match(css, /@media \(max-width: 760px\) \{[\s\S]*?\.key-button-grid \{\s*grid-template-columns: repeat\(6, minmax\(0, 1fr\)\);/);
});

test("Chord Dictionary diagrams inset the neck so edge-string dots stay inside the card", () => {
  assert.match(css, /\.chord-shape-card \.diagram-neck \{\s*width: calc\(100% \* 5 \/ 6\);/);
  assert.match(css, /\.chord-shape-card \.diagram-base-fret \{\s*right: calc\(100% \+ 13px\);/);
});

test("the band is a softer cocoa brown in both themes and every page fetches the new themes.css", () => {
  const themes = read("styles/themes.css");
  assert.match(themes, /--band: #3a2f27;\s*--band-edge: #4a3d33;\s*--on-band: #f2ede3;\s*--on-band-muted: #cbbcab;\s*--accent-on-band: #ecc5b4;/);
  assert.match(themes, /--band: #4a3d33;\s*--band-edge: #4a3d33;\s*--on-band: #f2ede3;\s*--on-band-muted: #d3c6b6;\s*--accent-on-band: #ecc5b4;/);
  const pages = fs.readdirSync(root).filter(file => file.endsWith(".html") && read(file).includes("themes.css"));
  assert.ok(pages.length >= 14);
  pages.forEach(page => assert.match(read(page), /themes\.css\?v=20261014-v3-rounded"/, page));
  assert.doesNotMatch(read("vite.config.mjs") + read("tools/scripts/verify-cloudflare-build.js"), /themes\.css\?v=20261014-v3-(?:liner-notes|cocoa-band)/);
});

test("tool page fields fit their text in Safari and controls get softer corners", () => {
  assert.match(css, /main\.v3-tool-page \.dictionary-browser-heading \{\s*display: grid;/);
  assert.match(css, /:is\(\.scale-select-field select, \.progression-writer-saved-picker select\) \{\s*-webkit-appearance: none;\s*appearance: none;[^}]*min-height: 46px;/);
  assert.match(css, /--tool-control-radius: var\(--radius-control, 6px\);/);
  assert.match(css, /:is\(\.segmented-control, \.v3-mode-buttons, \.progression-extension-toggle\) \{\s*overflow: hidden;\s*border-radius: var\(--tool-control-radius\);/);
});

test("buttons, fields and dropdowns share one rounded corner across the site", () => {
  const themes = read("styles/themes.css");
  const block = themes.slice(themes.indexOf("v3 rounded controls"));
  assert.ok(block.length > 0);
  assert.match(block, /:root \{\s*--radius-control: 6px;/);
  [".navbar .language-switch-button", ".navbar .nav-compact-tools summary", ".v3-home .hero-actions .primary-button", "main.tracks-library-page .track-key-filter-toggle", "main.tracks-library-page .v3-download-button"]
    .forEach(selector => assert.ok(block.includes(`html[data-theme] ${selector}`), selector));
  assert.match(block, /\.home-subscribe-button \{\s*border-radius: 0 var\(--radius-control\) var\(--radius-control\) 0;/);
  assert.match(block, /main\.tracks-library-page \.v3-sort-buttons \{\s*overflow: hidden;\s*border-radius: var\(--radius-control\);/);
});
