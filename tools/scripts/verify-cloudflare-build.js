const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const dist = path.join(root, "dist");
const maxWorkerAssetBytes = 24 * 1024 * 1024;
const renderAssetBaseUrl = "https://api.jamtrackshub.com";
const copiedDirectories = ["assets", "data", "downloads", "locales", "scripts", "slides", "styles"];
const viteOwnedRootHtml = new Set(["index.html", "404.html", "legal.html", "privacy-policy.html", "service-waking.html", "feedback.html", "tracks.html", "fretboard-trainer.html", "chord-progressions.html"]);
const workerConfig = JSON.parse(fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8"));

function fail(message) {
  throw new Error(`Cloudflare build verification failed: ${message}`);
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(function(entry) {
    const child = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(child) : [child];
  });
}

function relativeFromRoot(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function read(filePath) {
  return fs.readFileSync(filePath);
}

function expectedSlideHtml(source) {
  return source.replace(
    /src="([^"]+\.pdf)(#[^"]*)?"/g,
    function(_, pdfPath, hash = "") {
      return `src="${renderAssetBaseUrl}/slides/${pdfPath}${hash}"`;
    }
  );
}

if (!fs.existsSync(dist)) fail("dist/ does not exist");

if (workerConfig.assets?.not_found_handling !== "404-page") {
  fail("static assets do not use the native 404-page fallback");
}
if (workerConfig.assets?.html_handling !== undefined) {
  fail("HTML handling changed from the established default");
}
if (JSON.stringify(workerConfig.assets?.run_worker_first) !== JSON.stringify(["/api", "/api/*"])) {
  fail("Worker-first routing is not limited to API paths");
}

const rootHtml = fs.readdirSync(root, { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith(".html"))
  .map(entry => entry.name)
  .sort();

if (!rootHtml.length) fail("no root HTML entries were discovered");

rootHtml.forEach(function(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(dist, relativePath);
  if (!fs.existsSync(target)) fail(`missing root HTML entry ${relativePath}`);
  if (viteOwnedRootHtml.has(relativePath)) return;
  if (!read(source).equals(read(target))) fail(`root HTML is not byte-identical: ${relativePath}`);
});

const migratedHome = fs.readFileSync(path.join(dist, "index.html"), "utf8");
if (!/<link\s+rel="canonical"\s+href="https:\/\/jamtrackshub\.com\/"\s*\/?\s*>/.test(migratedHome)) {
  fail("Homepage canonical metadata differs");
}
if (!/<meta\s+name="description"\s+content="Original weekly backing tracks and focused guitar tools for chords, scales, keys, fretboard practice, and custom progression diagrams\."\s*\/?\s*>/.test(migratedHome)) {
  fail("Homepage description metadata differs");
}
if (!/<meta\s+property="og:url"\s+content="https:\/\/jamtrackshub\.com\/"\s*\/?\s*>/.test(migratedHome)) {
  fail("Homepage Open Graph URL differs");
}
if (!/<div id="vue-home-root"><\/div>/.test(migratedHome)) fail("Homepage Vue mount target is missing");
if (!/<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/.test(migratedHome)) {
  fail("Homepage Umami loader differs");
}
if (!/<script type="module" crossorigin src="\/assets\/vue\/home-[^"]+\.js"><\/script>/.test(migratedHome)) {
  fail("Homepage compiled Vue entry is missing");
}
if (/src\/entries\/home\.js/.test(migratedHome)) fail("Homepage source entry leaked into production HTML");
[
  "scripts/theme-init.js?v=20260725-friendly-insect-switch",
  "scripts/i18n-init.js?v=20260804-no-language-flash",
  "styles/base.css?v=20260829-smart-navbar-v2",
  "styles/components.css?v=20260827-legal-footer",
  "styles/pages.css?v=20260804-feedback-consistency",
  "styles/themes.css?v=20260804-feedback-consistency",
  "assets/vendor/gsap/gsap.min.js",
  "assets/vendor/gsap/ScrollTrigger.min.js",
  "assets/vendor/gsap/SplitText.min.js",
  "scripts/site-animations.js?v=20260903-vue-home-lifecycle"
].forEach(function(asset) {
  if (!migratedHome.includes(asset)) fail(`Homepage legacy asset path differs: ${asset}`);
});
if (/assets\/vue\/home-[^"]+\.css/.test(migratedHome)) fail("Homepage shared CSS was incorrectly rebundled");

const migrated404 = fs.readFileSync(path.join(dist, "404.html"), "utf8");
if (!/<meta name="robots" content="noindex">/.test(migrated404)) fail("404 noindex metadata is missing");
if (!/<link rel="canonical" href="https:\/\/jamtrackshub\.com\/404\.html">/.test(migrated404)) {
  fail("404 canonical metadata differs");
}
if (!/<div id="vue-404-root"><\/div>/.test(migrated404)) fail("404 Vue mount target is missing");
if (!/<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/.test(migrated404)) {
  fail("404 Umami loader differs");
}
if (!/<script type="module" crossorigin src="\/assets\/vue\/404-[^"]+\.js"><\/script>/.test(migrated404)) {
  fail("404 compiled Vue entry is missing");
}
if (/src\/entries\/404\.js/.test(migrated404)) fail("404 source entry leaked into production HTML");
Array.from(migrated404.matchAll(/(?:href|src)="([^"]+)"/g), match => match[1])
  .filter(reference => !/^(?:https?:|data:|#)/.test(reference))
  .forEach(function(reference) {
    if (!reference.startsWith("/")) fail(`404 local reference is not root-relative: ${reference}`);
  });
[
  "scripts/i18n-init.js?v=20260902-404-route-root",
  "styles/base.css?v=20260829-smart-navbar-v2",
  "styles/components.css?v=20260827-legal-footer",
  "styles/pages.css?v=20260804-feedback-consistency",
  "styles/themes.css?v=20260804-feedback-consistency",
  "scripts/site-animations.js?v=20260718-trainer-dropdown-hover"
].forEach(function(asset) {
  if (!migrated404.includes(asset)) fail(`404 legacy asset path differs: ${asset}`);
});
if (/assets\/vue\/404-[^"]+\.css/.test(migrated404)) fail("404 shared CSS was incorrectly rebundled");

const migratedLegal = fs.readFileSync(path.join(dist, "legal.html"), "utf8");
if (!/<link rel="canonical" href="https:\/\/jamtrackshub\.com\/legal\.html">/.test(migratedLegal)) {
  fail("Legal canonical metadata differs");
}
if (!/<div id="vue-legal-root"><\/div>/.test(migratedLegal)) fail("Legal Vue mount target is missing");
if (!/<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/.test(migratedLegal)) {
  fail("Legal Umami loader differs");
}
if (!/<script type="module" crossorigin src="\/assets\/vue\/legal-[^"]+\.js"><\/script>/.test(migratedLegal)) {
  fail("Legal compiled Vue entry is missing");
}
if (/src\/entries\/legal\.js/.test(migratedLegal)) fail("Legal source entry leaked into production HTML");
[
  "styles/base.css?v=20260829-smart-navbar-v2",
  "styles/components.css?v=20260827-legal-footer",
  "styles/pages.css?v=20260830-legal-static-panel",
  "styles/themes.css?v=20260804-feedback-consistency"
].forEach(function(asset) {
  if (!migratedLegal.includes(asset)) fail(`Legal legacy asset path differs: ${asset}`);
});
if (/assets\/vue\/legal-[^"]+\.css/.test(migratedLegal)) fail("Legal shared CSS was incorrectly rebundled");

const migratedPrivacy = fs.readFileSync(path.join(dist, "privacy-policy.html"), "utf8");
if (!/<link rel="canonical" href="https:\/\/jamtrackshub\.com\/privacy-policy\.html">/.test(migratedPrivacy)) {
  fail("Privacy canonical metadata differs");
}
if (!/<div id="vue-privacy-root"><\/div>/.test(migratedPrivacy)) fail("Privacy Vue mount target is missing");
if (!/<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/.test(migratedPrivacy)) {
  fail("Privacy Umami loader differs");
}
if (!/<script type="module" crossorigin src="\/assets\/vue\/privacy-[^"]+\.js"><\/script>/.test(migratedPrivacy)) {
  fail("Privacy compiled Vue entry is missing");
}
if (/src\/entries\/privacy\.js/.test(migratedPrivacy)) fail("Privacy source entry leaked into production HTML");
[
  "styles/base.css?v=20260829-smart-navbar-v2",
  "styles/components.css?v=20260827-legal-footer",
  "styles/pages.css?v=20260830-policy-static-panels",
  "styles/themes.css?v=20260804-feedback-consistency",
  "assets/vendor/gsap/gsap.min.js",
  "assets/vendor/gsap/ScrollTrigger.min.js",
  "scripts/site-animations.js?v=20260830-privacy-static-policy"
].forEach(function(asset) {
  if (!migratedPrivacy.includes(asset)) fail(`Privacy legacy asset path differs: ${asset}`);
});
if (/assets\/vue\/privacy-[^"]+\.css/.test(migratedPrivacy)) fail("Privacy shared CSS was incorrectly rebundled");

const migratedServiceWaking = fs.readFileSync(path.join(dist, "service-waking.html"), "utf8");
if (!/<meta name="robots" content="noindex">/.test(migratedServiceWaking)) {
  fail("Service Waking noindex metadata is missing");
}
if (!/<link rel="canonical" href="https:\/\/jamtrackshub\.com\/service-waking\.html">/.test(migratedServiceWaking)) {
  fail("Service Waking canonical metadata differs");
}
if (!/<div id="vue-service-waking-root"><\/div>/.test(migratedServiceWaking)) {
  fail("Service Waking Vue mount target is missing");
}
if (!/<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/.test(migratedServiceWaking)) {
  fail("Service Waking Umami loader differs");
}
if (!/<script type="module" crossorigin src="\/assets\/vue\/service-waking-[^"]+\.js"><\/script>/.test(migratedServiceWaking)) {
  fail("Service Waking compiled Vue entry is missing");
}
if (/src\/entries\/service-waking\.js/.test(migratedServiceWaking)) {
  fail("Service Waking source entry leaked into production HTML");
}
[
  "scripts/theme-init.js?v=20260725-friendly-insect-switch",
  "scripts/i18n-init.js?v=20260804-no-language-flash",
  "styles/base.css?v=20260829-smart-navbar-v2",
  "styles/components.css?v=20260827-legal-footer",
  "styles/pages.css?v=20260804-feedback-consistency",
  "styles/themes.css?v=20260804-feedback-consistency",
  "scripts/site-config.js?v=20260729-youtube-key-api",
  "assets/vendor/gsap/gsap.min.js",
  "assets/vendor/gsap/ScrollTrigger.min.js",
  "scripts/site-animations.js?v=20260718-trainer-dropdown-hover"
].forEach(function(asset) {
  if (!migratedServiceWaking.includes(asset)) fail(`Service Waking legacy asset path differs: ${asset}`);
});
if (/assets\/vue\/service-waking-[^"]+\.css/.test(migratedServiceWaking)) {
  fail("Service Waking shared CSS was incorrectly rebundled");
}

const migratedFeedback = fs.readFileSync(path.join(dist, "feedback.html"), "utf8");
if (!/<link rel="canonical" href="https:\/\/jamtrackshub\.com\/feedback\.html">/.test(migratedFeedback)) {
  fail("Feedback canonical metadata differs");
}
if (!/<div id="vue-feedback-root"><\/div>/.test(migratedFeedback)) {
  fail("Feedback Vue mount target is missing");
}
if (!/<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/.test(migratedFeedback)) {
  fail("Feedback Umami loader differs");
}
if (!/<script type="module" crossorigin src="\/assets\/vue\/feedback-[^"]+\.js"><\/script>/.test(migratedFeedback)) {
  fail("Feedback compiled Vue entry is missing");
}
if (/src\/entries\/feedback\.js/.test(migratedFeedback)) {
  fail("Feedback source entry leaked into production HTML");
}
[
  "scripts/theme-init.js?v=20260725-friendly-insect-switch",
  "scripts/i18n-init.js?v=20260804-no-language-flash",
  "styles/base.css?v=20260829-smart-navbar-v2",
  "styles/components.css?v=20260827-legal-footer",
  "styles/pages.css?v=20260804-feedback-consistency",
  "styles/themes.css?v=20260804-feedback-consistency",
  "assets/vendor/gsap/gsap.min.js",
  "assets/vendor/gsap/ScrollTrigger.min.js",
  "scripts/site-animations.js?v=20260718-trainer-dropdown-hover"
].forEach(function(asset) {
  if (!migratedFeedback.includes(asset)) fail(`Feedback legacy asset path differs: ${asset}`);
});
if (/assets\/vue\/feedback-[^"]+\.css/.test(migratedFeedback)) {
  fail("Feedback shared CSS was incorrectly rebundled");
}

const migratedTracks = fs.readFileSync(path.join(dist, "tracks.html"), "utf8");
if (!/<link rel="canonical" href="https:\/\/jamtrackshub\.com\/tracks\.html">/.test(migratedTracks)) {
  fail("Tracks canonical metadata differs");
}
if (!/<meta name="description" content="Browse original weekly guitar backing tracks by key, mood, and release order, then download slide decks for focused practice\.">/.test(migratedTracks)) {
  fail("Tracks description metadata differs");
}
if (!/<div id="vue-tracks-root"><\/div>/.test(migratedTracks)) {
  fail("Tracks Vue mount target is missing");
}
if (!/<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/.test(migratedTracks)) {
  fail("Tracks Umami loader differs");
}
if (!/<script type="module" crossorigin src="\/assets\/vue\/tracks-[^"]+\.js"><\/script>/.test(migratedTracks)) {
  fail("Tracks compiled Vue entry is missing");
}
if (/src\/entries\/tracks\.js/.test(migratedTracks)) {
  fail("Tracks source entry leaked into production HTML");
}
[
  "scripts/theme-init.js?v=20260725-friendly-insect-switch",
  "scripts/i18n-init.js?v=20260804-no-language-flash",
  "styles/base.css?v=20260829-smart-navbar-v2",
  "styles/components.css?v=20260827-legal-footer",
  "styles/pages.css?v=20260804-feedback-consistency",
  "styles/themes.css?v=20260804-feedback-consistency",
  "assets/vendor/gsap/gsap.min.js",
  "assets/vendor/gsap/Flip.min.js",
  "assets/vendor/gsap/ScrollTrigger.min.js",
  "scripts/site-animations.js?v=20260720-track-windmill-heartless"
].forEach(function(asset) {
  if (!migratedTracks.includes(asset)) fail(`Tracks legacy asset path differs: ${asset}`);
});
if (/assets\/vue\/tracks-[^"]+\.css/.test(migratedTracks)) {
  fail("Tracks shared CSS was incorrectly rebundled");
}
if (/scripts\/(?:site|i18n|tracks)\.js/.test(migratedTracks)) {
  fail("Tracks still loads a legacy page runtime");
}

const migratedFretboardTrainer = fs.readFileSync(path.join(dist, "fretboard-trainer.html"), "utf8");
if (!/<link rel="canonical" href="https:\/\/jamtrackshub\.com\/fretboard-trainer\.html">/.test(migratedFretboardTrainer)) {
  fail("Fretboard Trainer canonical metadata differs");
}
if (!/<meta name="description" content="Practice guitar fretboard note names with random string and fret questions across standard tuning\.">/.test(migratedFretboardTrainer)) {
  fail("Fretboard Trainer description metadata differs");
}
if (!/<div id="vue-fretboard-trainer-root"><\/div>/.test(migratedFretboardTrainer)) {
  fail("Fretboard Trainer Vue mount target is missing");
}
if (!/<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/.test(migratedFretboardTrainer)) {
  fail("Fretboard Trainer Umami loader differs");
}
if (!/<script type="module" crossorigin src="\/assets\/vue\/fretboard-trainer-[^"]+\.js"><\/script>/.test(migratedFretboardTrainer)) {
  fail("Fretboard Trainer compiled Vue entry is missing");
}
if (/src\/entries\/fretboard-trainer\.js/.test(migratedFretboardTrainer)) {
  fail("Fretboard Trainer source entry leaked into production HTML");
}
[
  "scripts/theme-init.js?v=20260725-friendly-insect-switch",
  "scripts/i18n-init.js?v=20260804-no-language-flash",
  "styles/base.css?v=20260829-smart-navbar-v2",
  "styles/components.css?v=20260827-legal-footer",
  "styles/pages.css?v=20260804-feedback-consistency",
  "styles/themes.css?v=20260804-feedback-consistency",
  "styles/fretboard-trainer.css?v=20260718-fretboard-trainer-polish",
  "assets/vendor/gsap/gsap.min.js",
  "assets/vendor/gsap/ScrollTrigger.min.js",
  "scripts/site-animations.js?v=20260718-trainer-dropdown-hover"
].forEach(function(asset) {
  if (!migratedFretboardTrainer.includes(asset)) fail(`Fretboard Trainer legacy asset path differs: ${asset}`);
});
if (/assets\/vue\/fretboard-trainer-[^"]+\.css/.test(migratedFretboardTrainer)) {
  fail("Fretboard Trainer shared CSS was incorrectly rebundled");
}
if (/scripts\/(?:site|i18n|fretboard-trainer)\.js/.test(migratedFretboardTrainer)) {
  fail("Fretboard Trainer still loads a legacy page runtime");
}

const migratedChordProgressions = fs.readFileSync(path.join(dist, "chord-progressions.html"), "utf8");
if (!/<link rel="canonical" href="https:\/\/jamtrackshub\.com\/chord-progressions\.html">/.test(migratedChordProgressions)) {
  fail("Chord Progressions canonical metadata differs");
}
if (!/<meta name="description" content="Explore common major and minor chord progressions by key with guitar-friendly chord shapes\.">/.test(migratedChordProgressions)) {
  fail("Chord Progressions description metadata differs");
}
if (!/<div id="vue-chord-progressions-root"><\/div>/.test(migratedChordProgressions)) {
  fail("Chord Progressions Vue mount target is missing");
}
if (!/<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/.test(migratedChordProgressions)) {
  fail("Chord Progressions Umami loader differs");
}
if (!/<script type="module" crossorigin src="\/assets\/vue\/chord-progressions-[^"]+\.js"><\/script>/.test(migratedChordProgressions)) {
  fail("Chord Progressions compiled Vue entry is missing");
}
if (/src\/entries\/chord-progressions\.js/.test(migratedChordProgressions)) {
  fail("Chord Progressions source entry leaked into production HTML");
}
[
  "scripts/theme-init.js?v=20260725-friendly-insect-switch",
  "scripts/i18n-init.js?v=20260804-no-language-flash",
  "styles/base.css?v=20260829-smart-navbar-v2",
  "styles/components.css?v=20260827-legal-footer",
  "styles/pages.css?v=20260804-feedback-consistency",
  "styles/themes.css?v=20260804-feedback-consistency",
  "assets/vendor/gsap/gsap.min.js",
  "assets/vendor/gsap/ScrollTrigger.min.js",
  "scripts/site-animations.js?v=20260718-trainer-dropdown-hover"
].forEach(function(asset) {
  if (!migratedChordProgressions.includes(asset)) fail(`Chord Progressions legacy asset path differs: ${asset}`);
});
if (/assets\/vue\/chord-progressions-[^"]+\.css/.test(migratedChordProgressions)) {
  fail("Chord Progressions shared CSS was incorrectly rebundled");
}
if (/scripts\/(?:site|i18n|chords)\.js/.test(migratedChordProgressions)) {
  fail("Chord Progressions still loads a legacy page runtime");
}

[
  ["Homepage", migratedHome],
  ["404", migrated404],
  ["Legal", migratedLegal],
  ["Privacy", migratedPrivacy],
  ["Service Waking", migratedServiceWaking],
  ["Feedback", migratedFeedback],
  ["Tracks", migratedTracks],
  ["Fretboard Trainer", migratedFretboardTrainer],
  ["Chord Progressions", migratedChordProgressions]
].forEach(function([pageName, html]) {
  if (/<nav class="navbar"|<footer class="footer"|class="skip-link"/.test(html)) {
    fail(`${pageName} still contains legacy shell markup`);
  }
  if (/scripts\/(?:site|i18n)\.js/.test(html)) {
    fail(`${pageName} still loads a legacy shell runtime`);
  }
});

const sourceHeaders = path.join(root, "_headers");
const distHeaders = path.join(dist, "_headers");
if (!fs.existsSync(distHeaders)) fail("missing _headers");
if (!read(sourceHeaders).equals(read(distHeaders))) fail("_headers differs from source");

copiedDirectories.forEach(function(relativeDirectory) {
  const sourceDirectory = path.join(root, relativeDirectory);
  listFiles(sourceDirectory).forEach(function(source) {
    const relativePath = relativeFromRoot(source);
    const target = path.join(dist, relativePath);
    const stats = fs.statSync(source);

    if (stats.size > maxWorkerAssetBytes) {
      if (fs.existsSync(target)) fail(`oversized asset was copied: ${relativePath}`);
      return;
    }

    if (!fs.existsSync(target)) fail(`missing static asset ${relativePath}`);

    if (relativePath.startsWith("slides/") && relativePath.endsWith(".html")) {
      const expected = expectedSlideHtml(fs.readFileSync(source, "utf8"));
      const actual = fs.readFileSync(target, "utf8");
      if (actual !== expected) fail(`slide PDF rewrite differs: ${relativePath}`);
      return;
    }

    if (!read(source).equals(read(target))) fail(`static asset differs: ${relativePath}`);
  });
});

const canonicalTracks = JSON.parse(fs.readFileSync(path.join(root, "data", "tracks.json"), "utf8"));
const canonicalTrackIds = canonicalTracks.map(track => String(track.id || "").trim());
if (canonicalTracks.length !== 18) fail(`expected 18 track downloads, found ${canonicalTracks.length}`);
if (new Set(canonicalTrackIds).size !== canonicalTracks.length) fail("duplicate track download records found");
if (canonicalTrackIds.includes("W9")) fail("invented W9 track download found");

canonicalTracks.forEach(function(track) {
  const trackId = String(track.id || "").trim();
  const downloadPath = String(track.downloadUrl || "").trim();
  const expectedPath = trackId === "W1"
    ? "slides/W1_Lyrical_Backing_Track_in_C.pdf"
    : `downloads/tracks/${trackId}.zip`;

  if (downloadPath !== expectedPath) fail(`${trackId} download architecture differs: ${downloadPath}`);
  if (downloadPath.includes("?") || downloadPath.includes("#") || path.posix.normalize(downloadPath) !== downloadPath) {
    fail(`${trackId} download path is not a canonical static path: ${downloadPath}`);
  }

  const source = path.join(root, downloadPath);
  const target = path.join(dist, downloadPath);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) fail(`${trackId} source download is missing: ${downloadPath}`);
  if (fs.statSync(source).size > maxWorkerAssetBytes) fail(`${trackId} download exceeds the static asset policy: ${downloadPath}`);
  if (!fs.existsSync(target)) fail(`${trackId} deployed download is missing: ${downloadPath}`);
  if (!read(source).equals(read(target))) fail(`${trackId} deployed download differs: ${downloadPath}`);
});

const sourceSlides = listFiles(path.join(root, "slides"))
  .map(relativeFromRoot)
  .filter(relativePath => relativePath.endsWith(".html"))
  .sort();
const distSlides = listFiles(path.join(dist, "slides"))
  .map(filePath => path.relative(dist, filePath).split(path.sep).join("/"))
  .filter(relativePath => relativePath.endsWith(".html"))
  .sort();
if (JSON.stringify(sourceSlides) !== JSON.stringify(distSlides)) fail("track slide HTML inventory differs");

const vueAssetsDirectory = path.join(dist, "assets", "vue");
const vueJavaScript = listFiles(vueAssetsDirectory).filter(filePath => filePath.endsWith(".js"));
if (!vueJavaScript.length) fail("missing compiled Vue foundation JavaScript");

vueJavaScript.forEach(function(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  if (!source.trim()) fail(`empty Vue bundle: ${path.basename(filePath)}`);
  if (/\beval\s*\(|new\s+Function\s*\(/.test(source)) fail(`CSP-incompatible runtime code in ${path.basename(filePath)}`);
});

const foundationBundle = vueJavaScript.find(filePath => path.basename(filePath).startsWith("vue-foundation-"));
if (!foundationBundle) fail("missing compiled Vue foundation entry");
if (!fs.readFileSync(foundationBundle, "utf8").includes("data-vue-foundation-smoke")) {
  fail("compiled Vue foundation smoke marker is missing");
}

const migrated404Bundle = vueJavaScript.find(filePath => path.basename(filePath).startsWith("404-"));
if (!migrated404Bundle) fail("missing compiled Vue 404 entry");
if (!fs.readFileSync(migrated404Bundle, "utf8").includes("vue-404-root")) {
  fail("compiled Vue 404 mount marker is missing");
}

const migratedLegalBundle = vueJavaScript.find(filePath => path.basename(filePath).startsWith("legal-"));
if (!migratedLegalBundle) fail("missing compiled Vue Legal entry");
if (!fs.readFileSync(migratedLegalBundle, "utf8").includes("vue-legal-root")) {
  fail("compiled Vue Legal mount marker is missing");
}

const migratedPrivacyBundle = vueJavaScript.find(filePath => path.basename(filePath).startsWith("privacy-"));
if (!migratedPrivacyBundle) fail("missing compiled Vue Privacy entry");
if (!fs.readFileSync(migratedPrivacyBundle, "utf8").includes("vue-privacy-root")) {
  fail("compiled Vue Privacy mount marker is missing");
}

const migratedServiceWakingBundle = vueJavaScript.find(filePath => path.basename(filePath).startsWith("service-waking-"));
if (!migratedServiceWakingBundle) fail("missing compiled Vue Service Waking entry");
if (!fs.readFileSync(migratedServiceWakingBundle, "utf8").includes("vue-service-waking-root")) {
  fail("compiled Vue Service Waking mount marker is missing");
}

const migratedFeedbackBundle = vueJavaScript.find(filePath => path.basename(filePath).startsWith("feedback-"));
if (!migratedFeedbackBundle) fail("missing compiled Vue Feedback entry");
if (!fs.readFileSync(migratedFeedbackBundle, "utf8").includes("vue-feedback-root")) {
  fail("compiled Vue Feedback mount marker is missing");
}

const migratedHomeBundle = vueJavaScript.find(filePath => path.basename(filePath).startsWith("home-"));
if (!migratedHomeBundle) fail("missing compiled Vue Homepage entry");
if (!fs.readFileSync(migratedHomeBundle, "utf8").includes("vue-home-root")) {
  fail("compiled Vue Homepage mount marker is missing");
}

const migratedTracksBundle = vueJavaScript.find(filePath => path.basename(filePath).startsWith("tracks-"));
if (!migratedTracksBundle) fail("missing compiled Vue Tracks entry");
if (!fs.readFileSync(migratedTracksBundle, "utf8").includes("vue-tracks-root")) {
  fail("compiled Vue Tracks mount marker is missing");
}

const migratedFretboardTrainerBundle = vueJavaScript.find(filePath => path.basename(filePath).startsWith("fretboard-trainer-"));
if (!migratedFretboardTrainerBundle) fail("missing compiled Vue Fretboard Trainer entry");
if (!fs.readFileSync(migratedFretboardTrainerBundle, "utf8").includes("vue-fretboard-trainer-root")) {
  fail("compiled Vue Fretboard Trainer mount marker is missing");
}

const migratedChordProgressionsBundle = vueJavaScript.find(filePath => path.basename(filePath).startsWith("chord-progressions-"));
if (!migratedChordProgressionsBundle) fail("missing compiled Vue Chord Progressions entry");
if (!fs.readFileSync(migratedChordProgressionsBundle, "utf8").includes("vue-chord-progressions-root")) {
  fail("compiled Vue Chord Progressions mount marker is missing");
}

const sharedShellBundle = vueJavaScript.find(filePath => path.basename(filePath).startsWith("mountSitePage-"));
if (!sharedShellBundle) fail("missing compiled shared Vue shell");
const sharedShellSource = fs.readFileSync(sharedShellBundle, "utf8");
["primaryNavigation", "footer-rights", "skip-link", "jasperMusicLanguage", "jasperMusicTheme"].forEach(function(marker) {
  if (!sharedShellSource.includes(marker)) fail(`compiled shared Vue shell marker is missing: ${marker}`);
});

rootHtml.forEach(function(relativePath) {
  const html = fs.readFileSync(path.join(dist, relativePath), "utf8");
  if (/vue-foundation|src\/entries\/vue-foundation/i.test(html)) {
    fail(`production HTML references the Vue foundation: ${relativePath}`);
  }
  if (relativePath !== "404.html" && /assets\/vue\/404-|src\/entries\/404\.js/i.test(html)) {
    fail(`unmigrated production HTML references the Vue 404 entry: ${relativePath}`);
  }
  if (relativePath !== "legal.html" && /assets\/vue\/legal-|src\/entries\/legal\.js/i.test(html)) {
    fail(`unmigrated production HTML references the Vue Legal entry: ${relativePath}`);
  }
  if (relativePath !== "privacy-policy.html" && /assets\/vue\/privacy-|src\/entries\/privacy\.js/i.test(html)) {
    fail(`unmigrated production HTML references the Vue Privacy entry: ${relativePath}`);
  }
  if (relativePath !== "service-waking.html" && /assets\/vue\/service-waking-|src\/entries\/service-waking\.js/i.test(html)) {
    fail(`unmigrated production HTML references the Vue Service Waking entry: ${relativePath}`);
  }
  if (relativePath !== "feedback.html" && /assets\/vue\/feedback-|src\/entries\/feedback\.js/i.test(html)) {
    fail(`unmigrated production HTML references the Vue Feedback entry: ${relativePath}`);
  }
  if (relativePath !== "index.html" && /assets\/vue\/home-|src\/entries\/home\.js/i.test(html)) {
    fail(`unmigrated production HTML references the Vue Homepage entry: ${relativePath}`);
  }
  if (relativePath !== "tracks.html" && /assets\/vue\/tracks-|src\/entries\/tracks\.js/i.test(html)) {
    fail(`unmigrated production HTML references the Vue Tracks entry: ${relativePath}`);
  }
  if (relativePath !== "fretboard-trainer.html" && /assets\/vue\/fretboard-trainer-|src\/entries\/fretboard-trainer\.js/i.test(html)) {
    fail(`unmigrated production HTML references the Vue Fretboard Trainer entry: ${relativePath}`);
  }
  if (relativePath !== "chord-progressions.html" && /assets\/vue\/chord-progressions-|src\/entries\/chord-progressions\.js/i.test(html)) {
    fail(`unmigrated production HTML references the Vue Chord Progressions entry: ${relativePath}`);
  }
});

["worker.js", "wrangler.jsonc", "functions", "api-server"].forEach(function(relativePath) {
  if (fs.existsSync(path.join(dist, relativePath))) fail(`backend boundary leaked into dist: ${relativePath}`);
});

listFiles(dist).forEach(function(filePath) {
  if (!/\.(?:css|html|js|json|md|svg|txt)$/.test(filePath) && path.basename(filePath) !== "_headers") return;
  const source = fs.readFileSync(filePath, "utf8");
  if (/\/Users\/[^/]+\/|[A-Za-z]:\\\\Users\\\\/.test(source)) {
    fail(`local absolute path leaked into ${path.relative(dist, filePath)}`);
  }
});

console.log(`Cloudflare build verification passed: ${rootHtml.length} root HTML entries`);
console.log(`Track slide parity passed: ${sourceSlides.length} slide HTML entries`);
console.log(`Vue assets passed: ${vueJavaScript.length} JavaScript bundle(s)`);
console.log(`Vite-owned root HTML passed: ${Array.from(viteOwnedRootHtml).join(", ")}`);
