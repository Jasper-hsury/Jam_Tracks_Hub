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
  assert.match(view, /:aria-label="home\.accessibility\.siteOverview"/);
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
    "/song-workspace",
    "feedback.html",
    "mailto:Jamtrackshubwork@gmail.com",
    "https://www.youtube.com/@Weekly_Backing_Track"
  ].forEach(href => assert.ok(view.includes(href), href));
  assert.match(view, /src="https:\/\/www\.youtube\.com\/embed\/nNlJNDU-Xgw"/);
  assert.match(view, /:title="home\.accessibility\.featuredPlayerTitle"/);
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

test("derives localized release details from canonical track identities", () => {
  const view = read("src/views/HomeView.vue");
  const catalog = JSON.parse(read("data/tracks.json"));
  const en = JSON.parse(read("locales/en/common.json"));
  const zh = JSON.parse(read("locales/zh-TW/common.json"));
  const latest = ["W19", "W18", "W17"].map(id => catalog.find(track => track.id === id));

  assert.ok(latest.every(Boolean));
  assert.deepEqual(latest.map(track => track.id), ["W19", "W18", "W17"]);
  assert.deepEqual(latest.map(track => track.key), ["C major", "C minor", "E major"]);
  assert.deepEqual(latest.map(track => track.style), ["Guitar", "Rock", "Pop"]);
  assert.deepEqual(latest.map(track => track.mood), ["Alone", "Missing", "Amazing"]);
  assert.ok(latest.every(track => track.bpm === ""));

  assert.match(view, /import trackCatalog from "\.\.\/\.\.\/data\/tracks\.json"/);
  assert.match(view, /const releaseIds = \["W19", "W18", "W17"\]/);
  assert.match(view, /trackCatalog\.find\(track => track\.id === id\)/);
  assert.doesNotMatch(view, /const releases = \[\s*\{/);
  assert.match(view, /localizedTrackDescription\(track\)/);
  assert.match(view, /localizedTrackKey\(track\.key\)/);
  assert.match(view, /localizedTrackMetadata\("styles", track\.style\)/);
  assert.match(view, /localizedTrackMetadata\("moods", track\.mood\)/);
  assert.match(view, /v-if="track\.bpm"/);
  assert.doesNotMatch(view, /0 BPM/);

  assert.deepEqual(en.home.releases.modes, { major: "Major", minor: "Minor" });
  assert.deepEqual(zh.home.releases.modes, { major: "大調", minor: "小調" });
  assert.deepEqual(zh.home.releases.styles, { Guitar: "吉他", Rock: "搖滾", Pop: "流行" });
  assert.deepEqual(zh.home.releases.moods, { Alone: "孤寂", Missing: "思念", Amazing: "驚艷" });
  assert.equal(zh.home.releases.descriptions.W19, "一首以開闊和弦與旋律推進為特色的 C 大調吉他即興伴奏，適合練習帶有漫遊感與省思氛圍的旋律。");
  assert.equal(zh.home.releases.descriptions.W18, "一首帶有情緒張力的 C 小調搖滾伴奏，適合練習推弦、長音與具有力度變化的旋律。");
  assert.equal(zh.home.releases.descriptions.W17, "一首明亮的 E 大調流行伴奏，適合練習旋律 Hook、段落推進與副歌式的情緒提升。");
  assert.match(en.home.releases.descriptions.W19, /^A C major guitar track/);
  assert.match(en.home.releases.descriptions.W18, /^A C minor rock track/);
  assert.match(en.home.releases.descriptions.W17, /^A bright E major pop track/);
});

test("localizes Homepage form, image, and accessibility text without changing behavior", () => {
  const view = read("src/views/HomeView.vue");
  const en = JSON.parse(read("locales/en/common.json"));
  const zh = JSON.parse(read("locales/zh-TW/common.json"));

  assert.equal(en.home.subscribe.emailPlaceholder, "Email address");
  assert.equal(zh.home.subscribe.emailPlaceholder, "輸入電子郵件");
  assert.equal(en.home.about.imageCaption, "Jasper, guitarist and music creator");
  assert.equal(zh.home.about.imageCaption, "Jasper｜吉他手與音樂創作者");
  assert.equal(zh.home.about.imageAlt, "Jasper 在舞台上彈奏木吉他");
  assert.deepEqual(Object.keys(en.home.subscribe.status), ["saving", "already", "success", "error"]);
  assert.deepEqual(Object.keys(zh.home.subscribe.status), ["saving", "already", "success", "error"]);

  assert.match(view, /:placeholder="home\.subscribe\.emailPlaceholder"/);
  assert.match(view, /:aria-label="home\.subscribe\.emailLabel"/);
  assert.match(view, /aria-describedby="homeSubscribeStatus"/);
  assert.match(view, /@invalid="handleInvalidEmail"/);
  assert.match(view, /subscribeStatusCode\.value = "saving"/);
  assert.match(view, /subscribeStatusCode\.value = result\.status === "already_subscribed" \? "already" : "success"/);
  assert.match(view, /subscribeStatusCode\.value = "error"/);
  assert.match(view, /:alt="home\.about\.imageAlt"/);
  assert.match(view, /<figcaption>\{\{ home\.about\.imageCaption \}\}<\/figcaption>/);
  assert.match(view, /:aria-label="home\.accessibility\.watchYouTube"/);
  assert.match(view, /:aria-label="home\.accessibility\.emailJamTracksHub"/);
  assert.match(view, /:aria-label="home\.accessibility\.openFeedback"/);
  assert.doesNotMatch(view, /placeholder="Your Email"|Jasper playing acoustic guitar on stage|>Jasper, guitarist and music creator</);
});

test("surfaces Song Workspace through the hero and four purpose-led workflow groups", () => {
  const view = read("src/views/HomeView.vue");
  const config = read("vite.config.mjs");
  const en = JSON.parse(read("locales/en/common.json"));
  const zh = JSON.parse(read("locales/zh-TW/common.json"));

  assert.match(config, /"\/song-workspace", "\/song-workspace\.html"/);
  assert.match(view, /<a href="tracks\.html" class="primary-button">\{\{ home\.hero\.exploreTracks \}\}<\/a>/);
  assert.match(view, /<a href="\/song-workspace" class="secondary-button">\{\{ home\.hero\.openSongWorkspace \}\}<\/a>/);
  assert.ok(view.indexOf('href="tracks.html" class="primary-button"') < view.indexOf('href="/song-workspace" class="secondary-button"'));

  assert.equal((view.match(/id: "(?:practice|understand|create|playSongs)"/g) || []).length, 4);
  ["practice", "understand", "create", "playSongs"].forEach(group => {
    assert.ok(view.includes(`id: "${group}"`), group);
  });
  [
    "tracks.html",
    "fretboard-trainer.html",
    "key-finder.html",
    "scale.html",
    "chord-dictionary.html",
    "chord-progressions.html"
  ].forEach(href => assert.ok(view.includes(`href: "${href}"`), href));
  assert.match(view, /v-for="group in workflowGroups"/);
  assert.match(view, /home-workflow-group--workspace/);
  assert.match(view, /home\.workflow\.songWorkspace\.description/);
  assert.match(view, /home\.workflow\.songWorkspace\.badges/);
  assert.match(view, /href="\/song-workspace" class="secondary-button home-workspace-link"/);
  assert.doesNotMatch(view, /useSongWorkspace|indexedDB|localStorage|getItem\(|setItem\(/);

  assert.equal(en.home.hero.exploreTracks, "Browse Backing Tracks");
  assert.equal(en.home.hero.openSongWorkspace, "Open Song Workspace");
  assert.equal(zh.home.hero.exploreTracks, "瀏覽即興伴奏");
  assert.equal(zh.home.hero.openSongWorkspace, "開啟歌曲工作區");
  assert.deepEqual([
    en.home.workflow.practice,
    en.home.workflow.understand,
    en.home.workflow.create,
    en.home.workflow.playSongs
  ], ["Practice", "Understand", "Create", "Play your songs"]);
  assert.deepEqual([
    zh.home.workflow.practice,
    zh.home.workflow.understand,
    zh.home.workflow.create,
    zh.home.workflow.playSongs
  ], ["練習", "理解", "創作", "彈奏自己的歌曲"]);
  assert.equal(en.home.workflow.songWorkspace.description, "Build chord-and-lyric sheets, transpose songs, and find a comfortable capo position. Your songs stay in this browser.");
  assert.equal(zh.home.workflow.songWorkspace.description, "建立和弦歌詞譜、移調並尋找適合的 Capo 位置。歌曲只會保存在這個瀏覽器中。");
  assert.deepEqual(en.home.workflow.songWorkspace.badges, ["Free", "No sign-in", "Stored locally"]);
  assert.deepEqual(zh.home.workflow.songWorkspace.badges, ["免費", "無需登入", "儲存於本機"]);
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
  const en = JSON.parse(read("locales/en/common.json"));
  const zh = JSON.parse(read("locales/zh-TW/common.json"));

  assert.match(view, /id="homeSubscribeForm"/);
  assert.match(view, /data-subscribe-endpoint="\/api\/subscribe"/);
  assert.match(view, /data-subscribe-source="homepage-about"/);
  assert.match(view, /name="email"[\s\S]*type="email"[\s\S]*autocomplete="email"[\s\S]*pattern="\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$"[\s\S]*required/);
  assert.match(view, /name="website"[\s\S]*tabindex="-1"[\s\S]*aria-hidden="true"/);
  assert.equal(en.home.subscribe.status.saving, "Saving your email...");
  assert.equal(en.home.subscribe.status.already, "You're already on the list.");
  assert.equal(en.home.subscribe.status.success, "You're on the list. Thank you!");
  assert.equal(en.home.subscribe.status.error, "Subscription is not available yet. Please try again later.");
  assert.equal(zh.home.subscribe.status.saving, "正在儲存你的電子郵件……");
  assert.equal(zh.home.subscribe.status.already, "你已經在通知名單中。");
  assert.equal(zh.home.subscribe.status.success, "已加入通知名單，謝謝！");
  assert.equal(zh.home.subscribe.status.error, "訂閱功能目前無法使用，請稍後再試。");
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

  assert.equal(packageJson.version, "2.0.5");
  assert.match(tracksHtml, /src\/entries\/tracks\.js/);
  assert.doesNotMatch(tracksHtml, /scripts\/tracks\.js/);
  assert.match(keyFinderHtml, /src\/entries\/key-finder\.js/);
  assert.doesNotMatch(keyFinderHtml, /scripts\/key-finder\.js/);
  assert.match(workspaceHtml, /src\/entries\/song-workspace\.js/);
  assert.doesNotMatch(workspaceHtml, /scripts\/song-workspace\.js/);
  [tracksHtml, keyFinderHtml, workspaceHtml].forEach(html => {
    assert.doesNotMatch(html, /vue-home-root|src\/entries\/home\.js/);
  });
});
