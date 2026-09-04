const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const sha256 = relativePath => crypto.createHash("sha256").update(read(relativePath)).digest("hex");
const html = read("song-workspace.html");
const view = read("src/views/SongWorkspaceView.vue");
const workspace = read("src/composables/useSongWorkspace.js");
const fixture = JSON.parse(read("tests/fixtures/song-workspace-phase6a-contract.json"));

test("mounts Song Workspace as the fourteenth Vue-owned Vite MPA page", () => {
  const entry = read("src/entries/song-workspace.js");
  const config = read("vite.config.mjs");

  assert.match(html, /data-vue-page="song-workspace"/);
  assert.match(html, /<div id="vue-song-workspace-root"><\/div>/);
  assert.match(html, /<script type="module" src="\/src\/entries\/song-workspace\.js"><\/script>/);
  assert.doesNotMatch(html, /<nav class="navbar"|<main class="song-workspace-page"|<footer class="footer"/);
  assert.doesNotMatch(html, /scripts\/(?:site|i18n|song-workspace)\.js/);
  assert.match(entry, /mountSitePage/);
  assert.match(entry, /activePage: "song-workspace"/);
  assert.match(entry, /view: SongWorkspaceView/);
  assert.match(config, /"song-workspace": resolve\(root, "song-workspace\.html"\)/);
  assert.equal((config.match(/resolve\(root, "[^"]+\.html"\)/g) || []).length, 14);
});

test("uses one Vue view and one composable lifecycle with no parallel legacy controller", () => {
  assert.match(view, /<script setup>/);
  assert.match(view, /useSongWorkspace\(\)/);
  assert.match(view, /<main class="song-workspace-page" id="main-content">/);
  assert.equal((view.match(/<dialog\b/g) || []).length, 7);
  assert.match(workspace, /export function useSongWorkspace\(\)/);
  assert.match(workspace, /onMounted\(function\(\) \{\s*initialize\(\)/);
  assert.match(workspace, /onBeforeUnmount\(function\(\)/);
  assert.match(workspace, /function bindElements\(\)/);
  assert.doesNotMatch(workspace, /DOMContentLoaded|window\.JamSongController/);
  assert.equal(fs.existsSync(path.join(root, "scripts/song-workspace.js")), false);
});

test("preserves the Phase 6A domain, storage, import, shared-shape, and CSS sources byte-for-byte", () => {
  Object.entries(fixture.legacyRuntimeSha256).forEach(([relativePath, expected]) => {
    assert.equal(sha256(relativePath), expected, relativePath);
  });
});

test("preserves Song Document v2 and IndexedDB/localStorage contracts", () => {
  const core = read("scripts/song-workspace-core.js");
  const storage = read("scripts/song-workspace-storage.js");

  assert.match(core, /const SCHEMA = "jamtrackshub-song"/);
  assert.match(core, /const VERSION = 2/);
  assert.match(storage, /const DB_NAME = "jamtrackshub-song-workspace"/);
  assert.match(storage, /const DB_VERSION = 1/);
  assert.match(storage, /const STORE_NAME = "songs"/);
  assert.match(storage, /const PREFERENCES_KEY = "jamTracksHubSongWorkspacePreferences"/);
  assert.match(storage, /getAll\(undefined, MAX_STORED_RECORDS \+ 1\)/);
  assert.match(storage, /const MAX_PREFERENCES_BYTES = 256 \* 1024/);
  assert.match(workspace, /window\.setTimeout\(saveCurrentSong, 500\)/);
});

test("preserves all editing, read, performance, import, export, and dialog owners under Vue lifecycle", () => {
  [
    "renderLibrary", "renderEditor", "renderLine", "renderAnchorEditor", "renderShapePicker",
    "renderCapoOptions", "openCreateDialog", "createSongFromDialog", "openGlobalAddDialog",
    "openLineEditor", "openPerformance", "autoScrollFrame", "importSong", "restoreSongs",
    "backupSongs", "downloadSong", "lockDialogBackground", "restoreDialogBackground",
    "setReadMode", "attachEvents"
  ].forEach(owner => assert.match(workspace, new RegExp(`function ${owner}\\b`), owner));
  assert.match(workspace, /Core\.toChordPro/);
  assert.match(workspace, /Core\.toPlainText/);
  assert.match(workspace, /window\.print\(\)/);
});

test("keeps one bounded performance RAF owner with explicit cleanup", () => {
  assert.match(workspace, /scrollFrame: 0/);
  assert.match(workspace, /state\.scrollFrame = requestAnimationFrame\(autoScrollFrame\)/);
  assert.match(workspace, /cancelAnimationFrame\(state\.scrollFrame\)/);
  assert.match(workspace, /Core\.scrollDistanceForElapsed\(state\.song\?\.bpm, multiplier, elapsed\)/);
  assert.match(workspace, /Math\.min\(50, timestamp - state\.lastScrollTime\)/);
  assert.match(workspace, /stopAutoScroll\(\)/);
});

test("keeps URL, title, analytics, network, and remote-log surfaces content-free", () => {
  const sources = [view, workspace, read("scripts/song-workspace-core.js"), read("scripts/song-workspace-storage.js"), read("scripts/song-workspace-import.js")].join("\n");

  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  assert.match(html, /<title>Song Workspace \| Jam Tracks Hub<\/title>/);
  assert.match(html, /data-exclude-search="true"/);
  assert.match(html, /data-exclude-hash="true"/);
  assert.doesNotMatch(html + sources, /data-umami-event|\bumami\.(?:track|identify)|analytics\.track/i);
  assert.doesNotMatch(sources, /document\.title|\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|FormData|sentry|logrocket|posthog|mixpanel|telemetry/i);
  assert.doesNotMatch(workspace, /console\.(?:log|warn|error)|\/api\/|\bworker\b/i);
  Object.values(fixture.privacyCanaries).forEach(canary => assert.doesNotMatch(html + workspace, new RegExp(canary)));
});

test("gives Vue locale code sole ownership of Song Workspace DOM translations", () => {
  assert.match(workspace, /useSiteLocale/);
  assert.match(workspace, /function applyStaticTranslations\(\)/);
  assert.match(workspace, /listenGlobal\(window, "jasper:language-change"/);
  assert.match(workspace, /globalDisposers\.splice\(0\)\.forEach\(dispose => dispose\(\)\)/);
  assert.doesNotMatch(workspace, /JasperI18n/);
  assert.doesNotMatch(html, /scripts\/i18n\.js/);
  assert.deepEqual(
    Object.keys(JSON.parse(read("locales/en/common.json")).pages.songWorkspace).sort(),
    Object.keys(JSON.parse(read("locales/zh-TW/common.json")).pages.songWorkspace).sort()
  );
});

test("extends deterministic Cloudflare verification for Vue ownership and privacy", () => {
  const verifier = read("tools/scripts/verify-cloudflare-build.js");

  assert.match(verifier, /"song-workspace\.html"/);
  assert.match(verifier, /Song Workspace canonical metadata differs/);
  assert.match(verifier, /Song Workspace privacy-preserving Umami loader differs/);
  assert.match(verifier, /Song Workspace still loads a legacy page controller or shell runtime/);
  assert.match(verifier, /compiled Vue Song Workspace mount marker is missing/);
});

test("keeps dependency, backend, schema, and release boundaries unchanged", () => {
  const packageJson = JSON.parse(read("package.json"));

  assert.equal(packageJson.version, "2.0.4");
  assert.deepEqual(packageJson.dependencies, { vue: "3.5.42" });
  ["vue-router", "pinia", "vue-i18n", "@vueuse/core"].forEach(name => {
    assert.equal(packageJson.dependencies?.[name], undefined);
    assert.equal(packageJson.devDependencies?.[name], undefined);
  });
  ["worker.js", "wrangler.jsonc", "functions/api/feedback.js", "functions/api/subscribe.js"].forEach(relativePath => {
    assert.ok(fs.existsSync(path.join(root, relativePath)), relativePath);
  });
});
