const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const themes = read("styles/themes.css");
const pages = [
  "404.html", "chord-dictionary.html", "chord-progressions.html", "feedback.html",
  "fretboard-trainer.html", "index.html", "key-finder.html", "legal.html",
  "privacy-policy.html", "progression-writer.html", "scale.html", "service-waking.html",
  "song-workspace.html", "tracks.html"
];
const fontUrl = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Noto+Sans+TC:wght@400;500;600&family=Noto+Serif+TC:wght@400;600&family=Public+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap";

test("defines the v3 serif and sans font tokens with Chinese fallbacks", () => {
  assert.match(themes, /--font-serif: "DM Serif Display", "Noto Serif TC", serif;/);
  assert.match(themes, /--font-sans: "Public Sans", "Noto Sans TC", sans-serif;/);
});

test("never synthesizes bold or italic glyphs and keeps Chinese headings at 600", () => {
  assert.match(themes, /html \{\s*font-synthesis: none;\s*\}/);
  assert.match(themes, /:lang\(zh\) :is\(h1, h2, h3\) \{\s*font-weight: 600;\s*letter-spacing: 0;\s*\}/);
  assert.match(themes, /h1,\s*h2 \{\s*font-family: var\(--font-serif\);/);
});

test("every Vue page entry loads the same v3 font families", () => {
  pages.forEach(page => assert.ok(read(page).includes(fontUrl), page));
});

test("stylesheets use font tokens instead of hard-coded Noto or Georgia stacks", () => {
  const css = fs.readdirSync(path.join(root, "styles"))
    .filter(file => file.endsWith(".css"))
    .map(file => read(`styles/${file}`))
    .join("\n");
  const hardCoded = css.match(/font-family:\s*(?:Georgia|['"]Noto (?:Serif|Sans) TC['"])[^;]*;/g) || [];
  assert.deepEqual(hardCoded, []);
});
