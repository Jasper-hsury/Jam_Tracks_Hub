const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const css = read("styles/song-workspace-v3.css");
const STYLESHEET = "styles/song-workspace-v3.css?v=20261016-inner-pages";
const SCOPE = /^html\[data-theme(?:="default")?\](?::lang\(zh\))? body\[data-vue-page="song-workspace"\]/;

function splitTopLevel(group) {
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
}

test("Song Workspace loads the v3 stylesheet last, and only Song Workspace loads it", () => {
  const html = read("song-workspace.html");
  const links = html.match(/<link rel="stylesheet" href="styles\/[^"]+">/g);
  assert.equal(links.at(-1), `<link rel="stylesheet" href="${STYLESHEET}">`);
  assert.ok(read("vite.config.mjs").includes(`"${STYLESHEET}"`));
  assert.ok(read("tools/scripts/verify-cloudflare-build.js").includes(`"${STYLESHEET}"`));
  fs.readdirSync(root).filter(file => file.endsWith(".html") && file !== "song-workspace.html")
    .forEach(file => assert.doesNotMatch(read(file), /song-workspace-v3\.css/, file));
});

test("every v3 Song Workspace rule is screen-only and scoped to the Song Workspace body", () => {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  assert.match(body, /^@media screen \{/);
  const selectors = body
    .replace(/^@media screen \{/, "")
    .match(/[^{}]+(?=\{)/g)
    .map(selector => selector.trim())
    .filter(selector => selector && !selector.startsWith("@"));
  assert.ok(selectors.length > 0);
  selectors.forEach(group => splitTopLevel(group).forEach(selector => {
    assert.match(selector.trim(), SCOPE, selector);
  }));
});

test("the workspace keeps its local-first runtime untouched by the restyle", () => {
  const view = read("src/views/SongWorkspaceView.vue");
  assert.match(view, /id="autosaveState"/);
  assert.match(view, /data-disclosure="local-first"/);
  assert.match(view, /data-create-mode="chords-lyrics"/);
  assert.doesNotMatch(css, /url\(\s*["']?https?:/);
});

test("the home view reads as liner notes: one promise line, numbered create rows and catalog rows", () => {
  assert.match(css, /\.song-workspace-promises \{[^}]*border-top: 3px double var\(--ink\);/);
  assert.match(css, /\.workspace-entry-card \{[^}]*grid-template-areas: "index title go" "index copy go";/);
  assert.match(css, /\.workspace-song-card \{[^}]*grid-template-areas: "identity actions" "meta actions" "menu menu";/);
  assert.match(css, /\.workspace-button \{[^}]*border-radius: var\(--radius-control\);/);
});

test("the editor compacts the heading, numbers sections and selects in cocoa", () => {
  assert.match(css, /\.song-workspace-page:has\(#workspaceEditorView:not\(\[hidden\]\)\) \.song-workspace-hero \{/);
  assert.match(css, /\.workspace-chart \{\s*counter-reset: workspace-section;/);
  assert.match(css, /\.workspace-section-heading-row h3::before \{\s*content: counter\(workspace-section, decimal-leading-zero\);/);
  assert.match(css, /html\[data-theme="default"\] body\[data-vue-page="song-workspace"\] \{\s*--workspace-selected: #5c4b3f;/);
  assert.match(css, /\.workspace-segmented button:is\(\.is-selected, \[aria-pressed="true"\]\):hover \{\s*color: var\(--on-band\);\s*background: var\(--workspace-selected\);/);
  assert.match(css, /button\.workspace-line:is\(:hover, :focus-visible\)::after \{\s*opacity: 1;/);
});

test("read mode hides the heading, performance mode follows the theme and dialogs are flat", () => {
  assert.match(css, /\.song-workspace-read-mode \.song-workspace-page:has\(#workspaceEditorView:not\(\[hidden\]\)\) \.song-workspace-hero \{\s*display: none;/);
  assert.match(css, /\.workspace-performance \{\s*color: var\(--ink\);\s*background: var\(--paper\);\s*\}/);
  assert.doesNotMatch(css, /color-scheme: dark/);
  assert.match(css, /\.workspace-dialog:not\(\.workspace-performance\) \{[^}]*border-top: 3px double var\(--ink\);/);
  assert.match(css, /#createSourceInput \{\s*font-family: ui-monospace/);
});

test("the line editor reads as a word strip and a chord tracklist on wider screens", () => {
  const wide = css.slice(css.indexOf("@media (min-width: 721px)"), css.indexOf("@media (max-width: 760px)"));
  assert.ok(wide.length > 0);
  assert.match(css, /\.workspace-anchor-preview button\.is-selected \{\s*color: var\(--on-band\);\s*background: var\(--workspace-selected\);/);
  assert.match(wide, /\.workspace-anchor-list-heading \{\s*display: flex;/);
  assert.match(wide, /\.workspace-anchor-item \{[^}]*background: transparent;[^}]*border-bottom: 1px solid var\(--line\);/);
  assert.match(css, /\.workspace-entry-card \{[^}]*padding: 22px 20px;/);
});

test("phones get one column, scrollable chord views and a swipeable shape strip", () => {
  const phone = css.slice(css.indexOf("@media (max-width: 760px)"));
  assert.ok(phone.length > 0);
  assert.match(phone, /\.workspace-create-area \{\s*grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(phone, /\.workspace-song-card \{[^}]*grid-template-areas: "identity" "meta" "actions" "menu";/);
  assert.match(phone, /\.workspace-segmented \{[^}]*flex-wrap: nowrap;[^}]*overflow-x: auto;/);
  assert.match(phone, /\.workspace-editor:not\(\.is-read-mode\) \.workspace-shape-cards \{[^}]*overflow-x: auto;/);
});

test("Song Workspace uses the tool pages' column and starts its heading as high as theirs", () => {
  const page = 'html\\[data-theme\\] body\\[data-vue-page="song-workspace"\\]';
  assert.match(css, new RegExp(`${page} \\.song-workspace-page \\{[^}]*box-sizing: content-box;[^}]*max-width: 1200px;[^}]*margin-inline: auto;[^}]*padding-inline: 40px;`));
  assert.match(css, new RegExp(`${page}:not\\(\\.song-workspace-read-mode\\) \\.song-workspace-page \\{\\s*padding-top: 0;`));
  assert.match(css, new RegExp(`@media \\(max-width: 760px\\) \\{\\s*${page} \\.song-workspace-page \\{\\s*margin-top: 32px;\\s*padding-inline: 16px;`));
});

test("the Song Workspace start screen gets the compact, centred phone heading; the editor keeps its own", () => {
  const start = 'body\\[data-vue-page="song-workspace"\\] \\.song-workspace-page:not\\(:has\\(#workspaceEditorView:not\\(\\[hidden\\]\\)\\)\\)';
  assert.match(css, new RegExp(`${start} \\.song-workspace-hero \\{\\s*text-align: center;`));
  assert.match(css, new RegExp(`${start} \\.song-workspace-hero h1 \\{\\s*font-size: 34px;`));
  assert.match(css, new RegExp(`${start} \\.song-workspace-promises \\{\\s*justify-content: center;`));
});
