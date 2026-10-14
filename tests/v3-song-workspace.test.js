const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const css = read("styles/song-workspace-v3.css");
const STYLESHEET = "styles/song-workspace-v3.css?v=20261015-v3-song-workspace";
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
