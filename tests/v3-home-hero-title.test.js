const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const loadStrokes = () => import(pathToFileURL(path.join(root, "src/components/home/heroTitleStrokes.mjs")).href);
const component = read("src/components/home/HomeHeroTitle.vue");
const css = read("styles/home-title.css");
const indexHtml = read("index.html");
const titleCssKey = "styles/home-title.css?v=20261016-tagline-stagger";

test("homepage title reads Jam Tracks Hub in both languages", () => {
  assert.equal(JSON.parse(read("locales/en/common.json")).home.hero.title, "Jam Tracks Hub");
  assert.equal(JSON.parse(read("locales/zh-TW/common.json")).home.hero.title, "Jam Tracks Hub");
});

test("every letter of the title has pen strokes, in writing order, inside the title box", async () => {
  const strokes = await loadStrokes();
  const glyphs = Array.from(strokes.HERO_TITLE_GLYPHS);
  assert.equal(strokes.HERO_TITLE_GLYPHS, "JamTracks Hub");
  assert.equal(strokes.HERO_TITLE_TEXT, "Jam Tracks Hub");

  const covered = new Set(strokes.HERO_TITLE_STROKES.map(([index]) => index));
  glyphs.forEach((character, index) => {
    assert.equal(covered.has(index), character !== " ", `glyph ${index} "${character}"`);
  });

  const order = strokes.HERO_TITLE_STROKES.map(([index]) => index);
  assert.deepEqual(order, [...order].sort((a, b) => a - b), "strokes are grouped left to right");

  strokes.HERO_TITLE_STROKES.forEach(([, points]) => {
    assert.ok(points.length >= 2);
    points.forEach(([u, v]) => {
      assert.ok(Number.isFinite(u) && u > -0.1 && u < 1.1, `u ${u}`);
      assert.ok(Number.isFinite(v) && v > -0.8 && v < 0.3, `v ${v}`);
    });
  });

  assert.match(strokes.strokePath([[0, 0], [1, 1], [2, 0]]), /^M0\.0 0\.0 C[\d. -]+ C[\d. -]+$/);
});

test("the title is one accessible h1 with a decorative, per-glyph masked SVG", () => {
  assert.match(component, /<h1 class="home-hero-title">\s*<span class="home-hero-title-text">\{\{ title \}\}<\/span>/);
  assert.match(component, /<svg class="home-hero-title-art" :viewBox="viewBox" aria-hidden="true" focusable="false">/);
  assert.match(component, /<mask\s+v-for="glyph in glyphs"/);
  assert.match(component, /<g v-for="glyph in glyphs" :key="glyph\.maskId" :mask="`url\(#\$\{glyph\.maskId\}\)`">\s*<rect [^>]*fill="none" \/>/);
  assert.match(component, /<p class="signature-slogan home-hero-tagline">/);
  assert.match(component, /<span class="home-hero-tagline-line">\{\{ line \}\}<\/span>/);
  assert.match(component, /class="home-hero-title-wave" aria-hidden="true"/);
  assert.match(component, /class="home-hero-title-rule" aria-hidden="true"/);
});

test("writing waits for Yellowtail, respects reduced motion, and never leaves the title hidden", () => {
  assert.match(component, /window\.matchMedia\?\.\("\(prefers-reduced-motion: reduce\)"\)\.matches/);
  assert.match(component, /const phase = ref\(prefersReducedMotion \? "done" : "pending"\)/);
  assert.match(component, /document\.fonts\.load\(fontSpec, HERO_TITLE_TEXT\)/);
  assert.match(component, /if \(!fontReady \|\| !solidText\.value\?\.getExtentOfChar\) \{\s*phase\.value = "done";/);
  assert.match(component, /catch \(error\) \{[\s\S]*glyphs\.value = \[\];\s*phase\.value = "done";/);
  assert.match(component, /onBeforeUnmount\(function\(\) \{\s*disposed = true;\s*window\.cancelAnimationFrame\(frame\);/);
});

test("title stylesheet hides the solid copy only while writing and drops transitions for reduced motion", () => {
  assert.match(css, /:is\(\[data-phase="pending"\], \[data-phase="writing"\]\) \.home-hero-title-solid \{\s*opacity: 0;/);
  assert.match(css, /\[data-phase="done"\] \.home-hero-title-solid \{\s*opacity: 1;\s*transition: opacity 0\.6s ease;/);
  assert.match(css, /\[data-phase="done"\] \.signature-slogan \{[^}]*transition: opacity 0\.5s 0\.6s ease/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*html\[data-theme\] \.v3-home \.home-hero-title-block \* \{\s*transition: none !important;/);
  assert.match(css, /font-family: "Yellowtail", "Brush Script MT", cursive;/);
});

test("homepage alone loads Yellowtail and the title stylesheet, with the cache key wired through the build", () => {
  assert.match(indexHtml, /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Yellowtail&display=swap" rel="stylesheet" \/>/);
  assert.ok(indexHtml.indexOf(titleCssKey) > indexHtml.indexOf("styles/themes.css?v="), "title stylesheet loads last");
  fs.readdirSync(root).filter(file => file.endsWith(".html") && file !== "index.html")
    .forEach(file => {
      assert.doesNotMatch(read(file), /Yellowtail|home-title\.css/, file);
    });
  assert.ok(read("vite.config.mjs").includes(`"${titleCssKey}"`));
  assert.ok(read("tools/scripts/verify-cloudflare-build.js").includes(`"${titleCssKey}"`));
});

test("the tagline splits after its first sentence into a left line and a right line", () => {
  const split = tagline => {
    const match = tagline.match(/^(.+?[.!?。！？，,])\s*(\S.*)$/u);
    return match ? [match[1], match[2]] : [tagline];
  };
  assert.match(component, /props\.tagline\.match\(\/\^\(\.\+\?\[\.!\?。！？，,\]\)\\s\*\(\\S\.\*\)\$\/u\)/);
  const en = JSON.parse(read("locales/en/common.json")).home.hero.tagline;
  const zh = JSON.parse(read("locales/zh-TW/common.json")).home.hero.tagline;
  assert.deepEqual(split(en), ["Capture the Feeling.", "Compose the Meaning."]);
  assert.deepEqual(split(zh), ["捕捉感受，", "譜出心聲。"]);

  assert.match(css, /\.home-hero-tagline \{\s*display: flex;\s*flex-direction: column;\s*width: fit-content;/);
  assert.match(css, /\.home-hero-tagline-line:first-child \{\s*align-self: flex-start;/);
  assert.match(css, /\.home-hero-tagline-line:last-child \{\s*align-self: flex-end;/);
  assert.match(css, /\.home-hero-tagline-line:first-child:last-child \{\s*align-self: center;/);
});
