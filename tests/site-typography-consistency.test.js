const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const publicPages = [
  "tracks.html",
  "chord-dictionary.html",
  "scale.html",
  "key-finder.html",
  "chord-progressions.html",
  "progression-writer.html",
  "fretboard-trainer.html",
  "song-workspace.html",
  "feedback.html",
  "legal.html",
  "privacy-policy.html",
  "404.html",
  "service-waking.html",
];

test("publishes homepage-derived role tokens without changing homepage role declarations", () => {
  const base = read("styles/base.css");
  const pages = read("styles/pages.css");

  for (const token of [
    "--font-display",
    "--font-body",
    "--type-page-title-size",
    "--type-section-heading-size",
    "--type-subsection-heading-size",
    "--type-card-title-size",
    "--type-body-size",
    "--type-secondary-size",
    "--type-metadata-size",
    "--type-navigation-size",
    "--type-button-size",
    "--type-form-input-size",
  ]) {
    assert.match(base, new RegExp(token));
  }

  assert.match(pages, /\.home-hero h1\s*\{[^}]*font-size:\s*68px;[^}]*line-height:\s*1;/s);
  assert.match(pages, /\.home-section-heading h2,[\s\S]*?font-size:\s*34px;[\s\S]*?line-height:\s*1\.2;/);
  assert.match(pages, /\.home-release-card h3\s*\{[^}]*font-size:\s*18px;[^}]*line-height:\s*1\.35;/s);
});

test("marks every non-home public page title with the canonical major-title role", () => {
  for (const page of publicPages) {
    const html = read(page);
    assert.match(html, /<h1\s+class="type-page-title"/, `${page} needs the canonical page-title role`);
  }

  assert.doesNotMatch(read("index.html"), /<h1[^>]*type-page-title/, "homepage remains the unchanged source of truth");
});

test("classifies section, subsection, policy, card, and form roles explicitly", () => {
  const pages = read("styles/pages.css");
  const workspace = read("styles/song-workspace.css");

  assert.match(read("key-finder.html"), /class="section-title type-section-heading"/);
  assert.match(read("feedback.html"), /class="section-title type-section-heading"/);
  assert.match(read("song-workspace.html"), /class="type-section-heading" id="createSongTitle"/);
  assert.match(read("chord-dictionary.html"), /class="type-subsection-heading" id="dictionaryBrowseTitle"/);
  assert.match(read("legal.html"), /class="tracks-page policy-page"/);
  assert.match(read("privacy-policy.html"), /class="tracks-page policy-page"/);
  assert.match(pages, /\.policy-page \.result-section h2/);
  assert.match(pages, /body \.track-title-display/);
  assert.match(workspace, /\.workspace-import-card h3[\s\S]*?font-family:\s*var\(--font-body\)/);
  assert.match(read("feedback.html"), /<input class="type-form-input"/);
  assert.match(read("feedback.html"), /<textarea class="type-form-input"/);
  assert.match(read("key-finder.html"), /<input class="type-form-input" id="youtubeKeyUrl"/);
  assert.match(read("chord-dictionary.html"), /<input class="type-form-input" id="chordSearch"/);
  assert.match(read("scale.html"), /<select class="type-form-input" id="scaleType"/);
});

test("preserves code, chord, diagram, and user-song typography as explicit technical or music exceptions", () => {
  assert.doesNotMatch(read("privacy-policy.html"), /<code[^>]*type-/);
  assert.doesNotMatch(read("chord-dictionary.html"), /id="selectedChordName"[^>]*type-/);
  assert.doesNotMatch(read("scale.html"), /id="scaleTitle"[^>]*type-/);
  assert.doesNotMatch(read("song-workspace.html"), /id="songChartTitle"[^>]*type-/);

  const pages = read("styles/pages.css");
  assert.match(pages, /#codeOutput[\s\S]*?font-family:\s*monospace/);
});

test("uses responsive homepage page-title and section-heading behavior", () => {
  const base = read("styles/base.css");
  const pages = read("styles/pages.css");

  assert.match(base, /--type-page-title-size:\s*68px/);
  assert.match(pages, /@media \(max-width:\s*768px\)[\s\S]*?--type-page-title-size:\s*clamp\(42px, 12vw, 58px\)/);
  assert.match(pages, /@media \(max-width:\s*768px\)[\s\S]*?--type-section-heading-size:\s*28px/);
  assert.match(pages, /@media \(max-width:\s*430px\)[\s\S]*?--type-page-title-size:\s*clamp\(38px, 13vw, 50px\)/);
});
