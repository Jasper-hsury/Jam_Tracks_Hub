const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const V4 = "styles/v4.css?v=20261019-tablet-releases";
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

test("page titles are Anton capitals, section headings are DM Serif in their own case", () => {
  assert.match(css, /html\[data-theme\] #main-content h1 \{\s*font-family: var\(--font-display\);[^}]*text-transform: uppercase;/);
  assert.match(css, /html\[data-theme\] main :is\(h2, h3\) \{\s*text-transform: none;/);
  assert.match(css, /#main-content :is\(\.hero-tagline, \.signature-slogan\) \{[^}]*font-family: var\(--font-display\);/);
  for (const selector of [".v3-band h2", ".home-releases h2", ".about-copy h2", ".release-copy h3", ".v3-track-name"]) {
    const block = css.match(new RegExp(`\\.v3-home ${selector.replace(/[.]/g, "\\$&")} \\{([^}]*)\\}`));
    assert.ok(block && /font-family: var\(--font-serif\);/.test(block[1]), selector);
  }
  assert.match(css, /:is\(\[data-track-heading\], \.track-title-display, \.track-title-name, \.track-title-key\) \{\s*text-transform: none;/);
});

test("the hero record keeps still for reduced motion", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*html\[data-theme\] \.v3-home \.v4-record \{\s*transition: none;/);
});

test("chord, scale and song names use the section serif like every other heading", () => {
  assert.doesNotMatch(css, /#selectedChordName[^{]*\{[^}]*font-display/);
  assert.match(css, /html\[data-theme\] main :is\(h2, h3\) \{\s*text-transform: none;/);
});

test("Anton falls back to a metric-matched Impact while the web font loads", () => {
  assert.match(css, /@font-face \{\s*font-family: "Anton Fallback";\s*src: local\("Impact"\);\s*size-adjust: 92%;\s*ascent-override: 128%;\s*descent-override: 36%;\s*line-gap-override: 0%;/);
});

test("the long Feedback tagline reads in DM Serif italic instead of Anton", () => {
  assert.match(css, /#main-content\.feedback-page \.hero-tagline \{[^}]*font-family: var\(--font-serif\);[^}]*font-style: italic;/);
});

test("labels above headings are sentence case, and About is written that way", () => {
  assert.match(css, /#main-content :is\(\.home-eyebrow, \.hero-eyebrow, \.v3-page-eyebrow, \.v3-tracks-eyebrow, \.result-kicker, \.dictionary-kicker, \.scale-section-kicker, \.trainer-kicker, \.workspace-import-type\) \{[^}]*letter-spacing: 0;\s*text-transform: none;/);
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

test("the hero record uses the same hover as the Tracks page records", () => {
  const pages = fs.readFileSync(path.join(root, "styles/pages.css"), "utf8");
  const easing = "cubic-bezier\\(0\\.2, 0\\.7, 0\\.2, 1\\)";
  assert.match(pages, new RegExp(`main\\.tracks-library-page \\.v3-disc \\{[^}]*left 0\\.5s ${easing},\\s*transform 0\\.7s ${easing};`));
  assert.match(pages, /\.track-card:hover \.v3-disc,[\s\S]*?transform: rotate\(60deg\);/);
  assert.match(css, new RegExp(`\\.v3-home \\.v4-record \\{[^}]*transition:\\s*translate 0\\.5s ${easing},\\s*rotate 0\\.7s ${easing};`));
  assert.match(css, /@media \(hover: hover\) and \(prefers-reduced-motion: no-preference\) \{\s*html\[data-theme\] \.v3-home \.v4-stage-tray:hover \.v4-record \{\s*translate: 14% 0;\s*rotate: 60deg;/);
  assert.doesNotMatch(css, /v4-spin/);
});

test("Contact, Give Feedback, Subscribe, Play scale and Download PNG share the button hover", () => {
  const animations = fs.readFileSync(path.join(root, "scripts/site-animations.js"), "utf8");
  [".v3-connect-button", ".home-subscribe-button", ".scale-play-button", ".scale-download-button"].forEach(selector => {
    assert.ok(animations.includes(`"${selector}"`), selector);
  });
  assert.match(animations, /y: -3,\s*scale: 1\.012,\s*duration: 0\.22,/);
  // A hover overwrites tweens on its target, so the About buttons must not run their own entrance.
  assert.match(animations, /\.about-copy > p:not\(\.home-eyebrow\), \.about-links", about\);/);
  assert.doesNotMatch(animations, /\.about-links > \*/);
});

test("the PNG background toggle turns yellow with navy text on hover", () => {
  assert.match(css, /\.scale-image-theme button:not\(\.is-selected\):hover \{\s*color: #0f2b4c;\s*background: #f2b705;/);
});

test("the retired v3 hero layout rules are gone from pages.css", () => {
  const pages = fs.readFileSync(path.join(root, "styles/pages.css"), "utf8");
  assert.doesNotMatch(pages, /v3-hero-grid|v3-hero-copy|\.v3-home \.home-hero \.(?:signature-slogan|home-eyebrow)/);
});

test("tablets keep the hero left-aligned, with the title beside a wider record", () => {
  assert.match(css, /html\[data-theme\] \.v3-home \.home-hero\.v4-hero \.home-section-inner \{\s*text-align: left;/);
  assert.match(css, /@media \(min-width: 641px\) and \(max-width: 980px\) \{\s*html\[data-theme\] \.v3-home \.v4-hero-title-block \{\s*grid-column: span 5;\s*\}\s*html\[data-theme\] \.v3-home \.v4-stage-tray \{\s*grid-column: span 7;/);
  assert.match(css, /\.v4-record-stage \.v3-sleeve \{\s*container-type: inline-size;/);
  assert.match(css, /\.v4-record-stage \.v3-sleeve-tagline \{\s*font-size: min\(15px, 4\.1cqi\);/);
});

test("the hero title rises in once with CSS, and stays still for reduced motion", () => {
  assert.match(css, /@keyframes v4-title-rise \{\s*from \{\s*opacity: 0;\s*translate: 0 28px;/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) \{\s*html\[data-theme\] \.v3-home \.v4-hero-title > span,\s*html\[data-theme\] \.v3-home \.v4-hero-title-block > \.v4-volume \{\s*animation: v4-title-rise 0\.62s cubic-bezier\(0\.2, 0\.7, 0\.2, 1\) 0\.15s both;/);
  const animations = fs.readFileSync(path.join(root, "scripts/site-animations.js"), "utf8");
  assert.doesNotMatch(animations, /v4-hero-title/);
});

test("tablets keep the releases heading on the left and the hero buttons unclipped", () => {
  assert.match(css, /html\[data-theme\] \.v3-home \.home-releases \.home-section-heading \{\s*flex-direction: row;\s*align-items: flex-end;/);
  assert.match(css, /@supports \(overflow: clip\) \{\s*html\[data-theme\] \.v3-home \.home-hero\.v4-hero \{\s*overflow-x: clip;\s*overflow-y: visible;/);
  assert.match(css, /html\[data-theme\] \.v3-home \.home-eyebrow,\s*html\[data-theme\] \.v3-home \.home-hero \.home-metrics \{\s*text-align: start;/);
});

test("Song Workspace prints the chart in day colours, inside the Vue root", () => {
  const print = css.slice(css.indexOf("/* Song Workspace print and PDF."));
  assert.match(print, /body\[data-vue-page="song-workspace"\] > #vue-song-workspace-root \{\s*display: block !important;/);
  assert.match(print, /#vue-song-workspace-root > :not\(\.song-workspace-page\) \{\s*display: none !important;/);
  assert.match(print, /:is\(\.workspace-score-kicker-row \.result-kicker, \.workspace-chord-chip\) \{\s*color: #1d6b6b !important;/);
  assert.match(print, /:is\(\.workspace-title-trigger small, \.workspace-section-edit-hint, \.workspace-inline-edit-button\) \{\s*display: none !important;/);
  assert.match(read("song-workspace.html"), /<body[^>]*data-vue-page="song-workspace"/);
});

test("track slide pages use the v4 night stage instead of the v2 grey", () => {
  const slides = fs.readdirSync(path.join(root, "slides")).filter(file => /^w\d+\.html$/.test(file));
  assert.equal(slides.length, 18);
  slides.forEach(file => {
    const html = read(`slides/${file}`);
    assert.doesNotMatch(html, /#121212/, file);
    if (html.includes("<img")) {
      assert.match(html, /family=DM\+Serif\+Display/, file);
      assert.match(html, /background: #081627;/, file);
      assert.match(html, /<p class="kicker">Jam Tracks Hub · Slides<\/p>/, file);
    } else {
      assert.match(html, /background-color: #081627;/, file);
    }
  });
});

test("the shape picker uses v4 rounded trays and cards, and print white only applies to Song Workspace", () => {
  assert.match(css, /html\[data-theme\] \.progression-writer-shape-picker-dialog \{\s*border-radius: var\(--radius-panel\);/);
  assert.match(css, /\.progression-writer-shape-picker-dialog \.progression-writer-shape-picker-card \{\s*border-radius: 22px;/);
  assert.match(css, /html\[data-theme\]:has\(> body\[data-vue-page="song-workspace"\]\),/);
  assert.doesNotMatch(css, /@media print \{\s*html\[data-theme\],/);
});

test("chord-tone dots meet contrast in both themes, on every diagram and in the image download", () => {
  const lum = hex => {
    const channels = hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16) / 255)
      .map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const palettes = {
    light: { text: "#fffaf2", cards: ["#f7f0e7", "#ece7de", "#f8f5ef"], fills: { root: "#1d6b6b", third: "#8a5528", fifth: "#7a6118", seventh: "#9a4a5e", extension: "#4f6a48" } },
    default: { text: "#0f2b4c", cards: ["#132a47", "#0f223a", "#081627"], fills: { root: "#f1e9d8", third: "#eab183", fifth: "#e6cb6e", seventh: "#eba7b6", extension: "#b9cfa9" } }
  };
  const exporter = read("src/services/progressionWriterExport.mjs");
  for (const [theme, palette] of Object.entries(palettes)) {
    for (const [family, fill] of Object.entries(palette.fills)) {
      assert.ok(contrast(fill, palette.text) >= 4.5, `${theme} ${family} label`);
      palette.cards.forEach(card => assert.ok(contrast(fill, card) >= 3, `${theme} ${family} on ${card}`));
      assert.match(css, new RegExp(`html\\[data-theme="${theme}"\\] :is\\(\\.chord-dictionary-page[^{]*\\{[^}]*--diagram-${family}-fill: ${fill};\\s*--diagram-${family}-text: ${palette.text};`), `${theme} ${family} diagram`);
      assert.match(css, new RegExp(`html\\[data-theme="${theme}"\\] main\\.v3-tool-page\\.chord-progressions-page [^{]*\\[data-tone-family="${family}"\\] \\{\\s*--tone-bg: ${fill};\\s*--tone-fg: ${palette.text};`), `${theme} ${family} progressions`);
      assert.match(exporter, new RegExp(`${family}: \\{ fill: "${fill}", stroke: "#[0-9a-f]{6}", text: "${palette.text}"`), `${theme} ${family} export`);
    }
  }
});
