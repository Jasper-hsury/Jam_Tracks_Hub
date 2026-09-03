const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

async function tracksService() {
  return import(pathToFileURL(path.join(root, "src/services/tracksData.mjs")).href);
}

test("makes Tracks the seventh production Vue-owned MPA page without legacy runtime ownership", () => {
  const config = read("vite.config.mjs");
  const html = read("tracks.html");
  const entry = read("src/entries/tracks.js");

  assert.match(config, /tracks:\s*resolve\(root,\s*"tracks\.html"\)/);
  assert.match(html, /<body data-i18n-title="titles\.tracks" data-vue-page="tracks">/);
  assert.match(html, /<div id="vue-tracks-root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/entries\/tracks\.js"><\/script>/);
  assert.doesNotMatch(html, /<nav class="navbar"|<main class="tracks-page"|<footer class="footer"/);
  assert.doesNotMatch(html, /scripts\/(?:site|i18n|tracks)\.js/);
  assert.match(entry, /activePage: "tracks"/);
  assert.match(entry, /mountId: "vue-tracks-root"/);
  assert.match(entry, /showBackToTop: true/);
});

test("preserves Tracks SEO, analytics, CSS, and GSAP dependencies", () => {
  const html = read("tracks.html");

  assert.match(html, /<title>Backing Tracks \| Jam Tracks Hub<\/title>/);
  assert.match(html, /content="Browse original weekly guitar backing tracks by key, mood, and release order, then download slide decks for focused practice\."/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jamtrackshub\.com\/tracks\.html">/);
  assert.match(html, /property="og:url" content="https:\/\/jamtrackshub\.com\/tracks\.html"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/);
  assert.match(html, /assets\/vendor\/gsap\/gsap\.min\.js/);
  assert.match(html, /assets\/vendor\/gsap\/Flip\.min\.js/);
  assert.match(html, /assets\/vendor\/gsap\/ScrollTrigger\.min\.js/);
  assert.match(html, /scripts\/site-animations\.js\?v=20260720-track-windmill-heartless/);
  assert.doesNotMatch(html, /data-umami-event|unsafe-eval|unsafe-inline/);
});

test("keeps canonical track data byte-identical, complete, and free of W9", () => {
  const bytes = fs.readFileSync(path.join(root, "data/tracks.json"));
  const tracks = JSON.parse(bytes);

  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), "9084c5d939445c1352c652ea80f0eb1f94708fe6a4ca094585ac9a53d002cbc8");
  assert.equal(tracks.length, 18);
  assert.deepEqual(tracks.map(track => track.id), [
    "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W10",
    "W11", "W12", "W13", "W14", "W15", "W16", "W17", "W18", "W19"
  ]);
  assert.equal(tracks.some(track => track.id === "W9"), false);
});

test("preserves deterministic newest, oldest, single-group, multi-group, and empty results", async () => {
  const { filterAndSortTracks } = await tracksService();
  const tracks = JSON.parse(read("data/tracks.json"));
  const ids = (groups, sort = "newest") => filterAndSortTracks(tracks, groups, sort).map(track => track.id);

  assert.deepEqual(ids([]), ["W19", "W18", "W17", "W16", "W15", "W14", "W13", "W12", "W11", "W10", "W8", "W7", "W6", "W5", "W4", "W3", "W2", "W1"]);
  assert.deepEqual(ids([], "oldest"), ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W10", "W11", "W12", "W13", "W14", "W15", "W16", "W17", "W18", "W19"]);
  assert.deepEqual(ids(["c-am"]), ["W19", "W5", "W1"]);
  assert.deepEqual(ids(["c-am", "e-csharpm"], "oldest"), ["W1", "W5", "W12", "W17", "W19"]);
  assert.deepEqual(ids(["csharp-bbm"]), []);
});

test("preserves all relative-key group counts and URL initialization aliases", async () => {
  const { filterAndSortTracks, groupsFromSearch, RELATIVE_KEY_GROUPS } = await tracksService();
  const tracks = JSON.parse(read("data/tracks.json"));
  const counts = Object.fromEntries(RELATIVE_KEY_GROUPS.map(group => [
    group.id,
    filterAndSortTracks(tracks, [group.id]).length
  ]));

  assert.deepEqual(counts, {
    "c-am": 3,
    "csharp-bbm": 0,
    "d-bm": 2,
    "eb-cm": 1,
    "e-csharpm": 2,
    "f-dm": 3,
    "fsharp-ebm": 0,
    "g-em": 4,
    "ab-fm": 0,
    "a-fsharpm": 3,
    "bb-gm": 0,
    "b-gsharpm": 0
  });
  assert.deepEqual(groupsFromSearch("?key=C%20major&key=E%2FC%23m"), ["c-am", "e-csharpm"]);
  assert.deepEqual(groupsFromSearch("?key=g-em,a-fsharpm"), ["g-em", "a-fsharpm"]);
});

test("keeps data loading local and normalized without mutating its payload", async () => {
  const { loadTracks } = await tracksService();
  const source = [{ id: " W20 ", title: " Test ", key: " G major ", youtubeUrl: "#" }];
  let request;
  const tracks = await loadTracks({
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => source };
    }
  });

  assert.deepEqual(request, { url: "data/tracks.json", options: { cache: "no-store" } });
  assert.equal(tracks[0].id, "W20");
  assert.equal(tracks[0].title, "Test");
  assert.deepEqual(source, [{ id: " W20 ", title: " Test ", key: " G major ", youtubeUrl: "#" }]);
});

test("keeps Vue-owned filters, card links, localization, and rapid-safe Flip lifecycle", () => {
  const view = read("src/views/TracksView.vue");
  const card = read("src/components/tracks/TrackCard.vue");

  assert.match(view, /useSiteLocale\(\)/);
  assert.match(view, /RELATIVE_KEY_GROUPS/);
  assert.match(view, /groupsFromSearch\(window\.location\.search\)/);
  assert.match(view, /filterAndSortTracks/);
  assert.match(view, /const generation = \+\+updateGeneration/);
  assert.match(view, /generation !== updateGeneration/);
  assert.match(view, /activeFlip\?\.kill\?\.\(\)/);
  assert.match(view, /window\.Flip\?\.killFlipsOf/);
  assert.match(view, /prefers-reduced-motion: reduce/);
  assert.match(view, /duration: 0\.74/);
  assert.match(view, /window\.dispatchEvent\(new CustomEvent\("tracks:rendered"\)\)/);
  assert.match(card, /window\.open\(props\.track\.youtubeUrl, "_blank", "noopener,noreferrer"\)/);
  assert.match(card, /:href="track\.downloadUrl"/);
  assert.match(card, /download/);
  assert.match(card, /activationTimer = window\.setTimeout/);
  assert.match(card, /new ResizeObserver\(updateTitleWrapState\)/);
  assert.match(card, /key\.getBoundingClientRect\(\)\.top > name\.getBoundingClientRect\(\)\.top \+ 2/);
  assert.doesNotMatch(view + card, /v-html|innerHTML|data-umami-event|window\.umami|analytics/i);
});

test("keeps Phase 3C bounded at version 2.0.3 and preserves non-Tracks runtimes", () => {
  const packageJson = JSON.parse(read("package.json"));
  const keyFinder = read("key-finder.html");
  const workspace = read("song-workspace.html");

  assert.equal(packageJson.version, "2.0.3");
  assert.deepEqual(packageJson.dependencies, { vue: "3.5.42" });
  assert.match(keyFinder, /scripts\/key-finder\.js/);
  assert.match(workspace, /scripts\/song-workspace\.js/);
  assert.doesNotMatch(keyFinder + workspace, /vue-tracks-root|src\/entries\/tracks\.js/);
});
