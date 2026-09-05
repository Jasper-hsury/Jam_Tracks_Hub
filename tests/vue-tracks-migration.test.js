const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

function zipEntries(bytes) {
  const endSignature = 0x06054b50;
  let endOffset = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (bytes.readUInt32LE(offset) === endSignature) {
      endOffset = offset;
      break;
    }
  }
  assert.notEqual(endOffset, -1, "ZIP end-of-central-directory record is missing");

  const entryCount = bytes.readUInt16LE(endOffset + 10);
  let offset = bytes.readUInt32LE(endOffset + 16);
  const entries = [];
  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(bytes.readUInt32LE(offset), 0x02014b50, "ZIP central-directory entry is malformed");
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    entries.push(bytes.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

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

test("keeps canonical track content metadata unchanged, complete, and free of W9", () => {
  const bytes = fs.readFileSync(path.join(root, "data/tracks.json"));
  const tracks = JSON.parse(bytes);
  const contentMetadata = tracks.map(({ downloadUrl, ...track }) => track);

  assert.equal(sha256(bytes), "cf51c260c2e134b9d4ded56f2bc98a376a11fc9f225bfda70566803a8ca72e82");
  assert.equal(sha256(JSON.stringify(contentMetadata)), "b175e8e89845af601520a96c340669f00bbec4529d425bafb692483c1d79b80f");
  assert.equal(tracks.length, 18);
  assert.deepEqual(tracks.map(track => track.id), [
    "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W10",
    "W11", "W12", "W13", "W14", "W15", "W16", "W17", "W18", "W19"
  ]);
  assert.equal(tracks.some(track => track.id === "W9"), false);
});

test("normalizes W2 through W8 to the established static ZIP download architecture", () => {
  const tracks = JSON.parse(read("data/tracks.json"));
  const byId = Object.fromEntries(tracks.map(track => [track.id, track]));
  const expectedPackages = {
    W2: { pages: 24, bytes: 5730027, sha256: "b931be814d3234453d7da08cb3ca392d9252497412b3405e63c55fb88a199aae" },
    W3: { pages: 25, bytes: 6201779, sha256: "95a46a6bdbc0a82d60a84d0da1d1e14eb13f837617e7bf128ba7624c8a78872c" },
    W4: { pages: 25, bytes: 7203264, sha256: "ba3cd25eeef7677bb7b3c25bc936bf7b3ad99be94c78d0f5ade413506b184460" },
    W5: { pages: 25, bytes: 4152871, sha256: "a13f64207a343ad218bb84c8f4841a8f9ca3c5835660e0e2139e9b2911d85837" },
    W6: { pages: 21, bytes: 4469219, sha256: "5f3548907a2395cc694102714b65e2fc28a88f75144ac6712209b3db92fae87b" },
    W7: { pages: 21, bytes: 4909744, sha256: "295b89431c342d81b1c2bd239b6e9088b4784bc866560b7a2446c1ac0b4ebce6" },
    W8: { pages: 11, bytes: 4869279, sha256: "8252eff67966fcf8d4ebd6b1602fead2ff38506520199d22b11625048939771a" }
  };
  const maxWorkerAssetBytes = 24 * 1024 * 1024;

  Object.entries(expectedPackages).forEach(([trackId, expected]) => {
    const relativePath = `downloads/tracks/${trackId}.zip`;
    const bytes = fs.readFileSync(path.join(root, relativePath));
    const fileEntries = zipEntries(bytes).filter(entry => !entry.endsWith("/"));
    const expectedEntries = Array.from({ length: expected.pages }, (_, index) => (
      `${trackId}/${trackId}.${String(index + 1).padStart(3, "0")}.jpeg`
    ));

    assert.equal(byId[trackId].downloadUrl, relativePath);
    assert.equal(bytes.length, expected.bytes);
    assert.equal(sha256(bytes), expected.sha256);
    assert.ok(bytes.length <= maxWorkerAssetBytes);
    assert.deepEqual(fileEntries, expectedEntries);
  });
});

test("keeps all 18 downloads valid with W1 direct PDF and W2+ static ZIP packages", () => {
  const tracks = JSON.parse(read("data/tracks.json"));
  const maxWorkerAssetBytes = 24 * 1024 * 1024;

  assert.equal(tracks.length, 18);
  tracks.forEach(track => {
    const expectedPath = track.id === "W1"
      ? "slides/W1_Lyrical_Backing_Track_in_C.pdf"
      : `downloads/tracks/${track.id}.zip`;
    const source = path.join(root, expectedPath);

    assert.equal(track.downloadUrl, expectedPath);
    assert.ok(fs.statSync(source).isFile());
    assert.ok(fs.statSync(source).size <= maxWorkerAssetBytes);
  });
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
  assert.match(view, /event\.composedPath\(\)\.includes\(controls\.value\)/);
  assert.match(card, /window\.open\(props\.track\.youtubeUrl, "_blank", "noopener,noreferrer"\)/);
  assert.match(card, /:href="track\.downloadUrl"/);
  assert.match(card, /download/);
  assert.match(card, /activationTimer = window\.setTimeout/);
  assert.match(card, /new ResizeObserver\(updateTitleWrapState\)/);
  assert.match(card, /key\.getBoundingClientRect\(\)\.top > name\.getBoundingClientRect\(\)\.top \+ 2/);
  assert.doesNotMatch(view + card, /v-html|innerHTML|data-umami-event|window\.umami|analytics/i);
});

test("keeps the download fix and non-Tracks runtimes intact at version 2.0.5", () => {
  const packageJson = JSON.parse(read("package.json"));
  const keyFinder = read("key-finder.html");
  const workspace = read("song-workspace.html");

  assert.equal(packageJson.version, "2.0.5");
  assert.deepEqual(packageJson.dependencies, { vue: "3.5.42" });
  assert.match(keyFinder, /src\/entries\/key-finder\.js/);
  assert.doesNotMatch(keyFinder, /scripts\/key-finder\.js/);
  assert.match(workspace, /src\/entries\/song-workspace\.js/);
  assert.doesNotMatch(workspace, /scripts\/song-workspace\.js/);
  assert.doesNotMatch(keyFinder + workspace, /vue-tracks-root|src\/entries\/tracks\.js/);
});
