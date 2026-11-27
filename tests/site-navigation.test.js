const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const header = read("src/components/site/SiteHeader.vue");
const v4 = read("styles/v4.css");

const navPages = () => [...header.match(/const navItems = \[([\s\S]*?)\];/)[1].matchAll(/page: "([^"]+)"/g)].map(match => match[1]);

test("header links are grouped by task: play, chords, then fretboard and analysis", () => {
  assert.deepEqual(navPages(), [
    "index",
    "tracks",
    "song-workspace",
    "chord-dictionary",
    "chord-lab",
    "chord-progressions",
    "scale",
    "fretboard-trainer",
    "key-finder",
    "about"
  ]);
});

test("the Tools menu holds the last tool group on mid-size screens", () => {
  const compact = header.match(/const compactToolItems = navItems\.filter\(item => \[([\s\S]*?)\]\.includes/)[1];
  assert.deepEqual([...compact.matchAll(/"([^"]+)"/g)].map(match => match[1]), ["scale", "fretboard-trainer", "key-finder"]);
  assert.match(header, /:class="\{ 'nav-item-in-tools': compactToolItems\.includes\(item\) \}"/);
  const rule = v4.match(/@media \(min-width: 1181px\) and \(max-width: 1460px\) \{([\s\S]*?)\n\}/)[1];
  assert.match(rule, /li\.nav-item-in-tools \{\s*display: none;/);
  assert.doesNotMatch(rule, /nth-child|display: list-item/, "links are hidden by class, not by position");
});

test("no stylesheet hides header links by their position", () => {
  ["styles/pages.css", "styles/components.css", "styles/base.css", "styles/themes.css", "styles/v4.css"].forEach(file => {
    const css = fs.readFileSync(path.join(root, file), "utf8");
    const hidden = [...css.matchAll(/([^{}]*nav-links\s*>\s*li:nth-child[^{}]*)\{([^}]*)\}/g)]
      .filter(([, , body]) => /display:\s*none/.test(body));
    assert.deepEqual(hidden.map(([, selector]) => selector.trim()), [], file);
  });
});
