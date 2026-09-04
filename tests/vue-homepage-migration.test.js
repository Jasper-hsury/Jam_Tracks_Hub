const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

test("makes Homepage the sixth production Vue-owned MPA entry", () => {
  const config = read("vite.config.mjs");
  const html = read("index.html");
  const entry = read("src/entries/home.js");

  assert.match(config, /home:\s*resolve\(root,\s*"index\.html"\)/);
  assert.match(html, /<div id="vue-home-root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/entries\/home\.js"><\/script>/);
  assert.doesNotMatch(html, /<nav class="navbar"|<main class="home-page"|<footer class="footer"/);
  assert.doesNotMatch(html, /scripts\/(?:site|i18n)\.js/);
  assert.match(entry, /activePage: "index"/);
  assert.match(entry, /mountId: "vue-home-root"/);
  assert.match(entry, /showBackToTop: true/);
  assert.match(entry, /view: HomeView/);
});

test("preserves Homepage SEO, analytics, CSP-compatible assets, and route metadata", () => {
  const html = read("index.html");

  assert.match(html, /<title>Jam Tracks Hub \| Backing Tracks and Guitar Tools<\/title>/);
  assert.match(html, /content="Original weekly backing tracks and focused guitar tools for chords, scales, keys, fretboard practice, and custom progression diagrams\."/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jamtrackshub\.com\/" \/>/);
  assert.match(html, /property="og:url" content="https:\/\/jamtrackshub\.com\/"/);
  assert.match(html, /property="og:image" content="https:\/\/jamtrackshub\.com\/share_icon\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /rel="icon" href="assets\/images\/icon\.png"/);
  assert.match(html, /<body data-i18n-title="titles\.home" data-vue-page="home">/);
  assert.match(html, /<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/);
  assert.match(html, /assets\/vendor\/gsap\/gsap\.min\.js/);
  assert.match(html, /assets\/vendor\/gsap\/ScrollTrigger\.min\.js/);
  assert.match(html, /assets\/vendor\/gsap\/SplitText\.min\.js/);
  assert.doesNotMatch(html, /data-umami-event|unsafe-eval|unsafe-inline/);
});

test("preserves Homepage content, links, media, and accessibility contracts in Vue", () => {
  const view = read("src/views/HomeView.vue");

  assert.match(view, /<main class="home-page" id="main-content">/);
  assert.match(view, /<section class="home-hero" id="home">/);
  assert.match(view, /<h1>\{\{ home\.hero\.title \}\}<\/h1>/);
  assert.match(view, /aria-label="Site overview"/);
  assert.match(view, /aria-labelledby="homeToolsTitle"/);
  assert.match(view, /aria-labelledby="featuredAudioTitle"/);
  assert.match(view, /aria-labelledby="latestReleasesTitle"/);
  assert.match(view, /aria-labelledby="aboutTitle"/);
  assert.match(view, /<h2 id="featuredAudioTitle" class="is-wrapped" data-track-heading>/);
  assert.match(view, /<h3 class="is-wrapped" data-track-heading/);
  [
    "tracks.html",
    "chord-dictionary.html",
    "scale.html",
    "key-finder.html",
    "chord-progressions.html",
    "fretboard-trainer.html",
    "feedback.html",
    "mailto:Jamtrackshubwork@gmail.com",
    "https://www.youtube.com/@Weekly_Backing_Track"
  ].forEach(href => assert.ok(view.includes(href), href));
  assert.match(view, /src="https:\/\/www\.youtube\.com\/embed\/nNlJNDU-Xgw"/);
  assert.match(view, /title="W19 Roaming Alone Backing Track in C"/);
  assert.match(view, /loading="lazy"/);
  assert.match(view, /referrerpolicy="strict-origin-when-cross-origin"/);
  assert.match(view, /allowfullscreen/);
  assert.match(view, /rel="noopener noreferrer"/);
  assert.doesNotMatch(view, /data-i18n|v-html|innerHTML/);
});

test("keeps Homepage locale rendering in Vue and track labels deterministic", () => {
  const view = read("src/views/HomeView.vue");
  const trackTitle = read("src/components/home/TrackTitle.vue");

  assert.match(view, /useSiteLocale\(\)/);
  assert.match(view, /englishMessages/);
  assert.match(view, /traditionalChineseMessages/);
  assert.match(view, /tracks\.value\.openOnYouTube\.replace\("\{\{title\}\}"/);
  assert.match(trackTitle, /language\.value === "zh-TW"/);
  assert.match(trackTitle, /class="track-title-week"/);
  assert.match(trackTitle, /class="track-title-name"/);
  assert.match(trackTitle, /class="track-title-separator"/);
  assert.match(trackTitle, /class="track-title-key"/);
});

test("preserves Subscribe validation and POST payload with controlled fetch only", async () => {
  const serviceUrl = pathToFileURL(path.join(root, "src/services/subscribeApi.mjs"));
  const { submitSubscription, validateSubscriberEmail } = await import(serviceUrl.href);
  assert.deepEqual(validateSubscriberEmail("  MUSICIAN@Example.COM "), {
    email: "musician@example.com",
    valid: true
  });
  assert.deepEqual(validateSubscriberEmail("not-an-email"), {
    email: "not-an-email",
    valid: false
  });

  const payload = {
    email: "synthetic@example.test",
    website: "",
    source: "homepage-about",
    page: "/"
  };
  let request;
  const result = await submitSubscription({
    endpoint: "/api/subscribe",
    payload,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ ok: true, status: "subscribed" }) };
    }
  });

  assert.deepEqual(request, {
    url: "/api/subscribe",
    options: {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  });
  assert.deepEqual(result, { ok: true, status: "subscribed" });
  await assert.rejects(submitSubscription({
    endpoint: "/api/subscribe",
    payload,
    fetchImpl: async () => ({
      ok: false,
      json: async () => ({ ok: false, message: "Rejected" })
    })
  }), /Rejected/);
});

test("preserves Subscribe UI states without production mutation", () => {
  const view = read("src/views/HomeView.vue");
  const source = read("tests/vue-homepage-migration.test.js");

  assert.match(view, /id="homeSubscribeForm"/);
  assert.match(view, /data-subscribe-endpoint="\/api\/subscribe"/);
  assert.match(view, /data-subscribe-source="homepage-about"/);
  assert.match(view, /name="email"[\s\S]*type="email"[\s\S]*autocomplete="email"[\s\S]*required/);
  assert.match(view, /name="website"[\s\S]*tabindex="-1"[\s\S]*aria-hidden="true"/);
  assert.match(view, /Saving your email\.\.\./);
  assert.match(view, /You're already on the list\./);
  assert.match(view, /You're on the list\. Thank you!/);
  assert.match(view, /Subscription is not available yet\. Please try again later\./);
  assert.match(view, /id="homeSubscribeStatus" aria-live="polite"/);
  assert.match(view, /:disabled="subscribing"/);
  assert.doesNotMatch(source, /https:\/\/jamtrackshub\.com\/api\/subscribe/);
});

test("owns SplitText lifecycle after Vue locale render and font readiness", () => {
  const animations = read("scripts/site-animations.js");

  assert.match(animations, /async function waitForHomeAnimationLayout\(\)/);
  assert.match(animations, /await document\.fonts\.ready/);
  assert.match(animations, /await nextAnimationFrame\(\);\s*await nextAnimationFrame\(\);/);
  assert.match(animations, /function disposeHomeTextAnimation\(\)/);
  assert.match(animations, /homeHeroTimeline\?\.kill\?\.\(\)/);
  assert.match(animations, /homeHeroSplits\.forEach\(split => split\?\.revert\?\.\(\)\)/);
  assert.match(animations, /homeStepIntroTimeline\?\.scrollTrigger\?\.kill\?\.\(\)/);
  assert.match(animations, /delete card\._homeStepTextReady/);
  assert.match(animations, /const generation = \+\+homeTextAnimationGeneration/);
  assert.match(animations, /generation !== homeTextAnimationGeneration/);
  assert.match(animations, /animateHomeHeroText\(\)/);
  assert.match(animations, /animateHomeHeroText\(\);\s*rebuildHomeStepTextAnimation\(\);/);
  assert.match(animations, /window\.addEventListener\("jasper:language-change", rebuildHomeTextAnimation\)/);
});

test("keeps Tracks independently Vue-owned and other legacy pages outside the Homepage Vue scope", () => {
  const packageJson = JSON.parse(read("package.json"));
  const tracksHtml = read("tracks.html");
  const keyFinderHtml = read("key-finder.html");
  const workspaceHtml = read("song-workspace.html");

  assert.equal(packageJson.version, "2.0.4");
  assert.match(tracksHtml, /src\/entries\/tracks\.js/);
  assert.doesNotMatch(tracksHtml, /scripts\/tracks\.js/);
  assert.match(keyFinderHtml, /src\/entries\/key-finder\.js/);
  assert.doesNotMatch(keyFinderHtml, /scripts\/key-finder\.js/);
  assert.match(workspaceHtml, /scripts\/song-workspace\.js/);
  [tracksHtml, keyFinderHtml, workspaceHtml].forEach(html => {
    assert.doesNotMatch(html, /vue-home-root|src\/entries\/home\.js/);
  });
});
