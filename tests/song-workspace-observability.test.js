const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Core = require("../scripts/song-workspace-core.js");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const workspaceHtml = read("song-workspace.html") + read("src/views/SongWorkspaceView.vue");
const workspaceJs = read("src/composables/useSongWorkspace.js");
const workspaceCore = read("scripts/song-workspace-core.js");
const workspaceStorage = read("scripts/song-workspace-storage.js");
const workspaceImport = read("scripts/song-workspace-import.js");
const indexHtml = read("index.html");
const en = JSON.parse(read("locales/en/common.json"));
const zh = JSON.parse(read("locales/zh-TW/common.json"));

const LYRIC_CANARY = "LYRIC_CANARY_NEVER_SEND";
const TITLE_CANARY = "TITLE_CANARY_NEVER_SEND";
const CHORDPRO_CANARY = "CHORDPRO_CANARY_NEVER_SEND";

test("uses bounded page-level Umami without exposing Song Workspace content", () => {
    const websiteIdPattern = /data-website-id=["']([^"']+)["']/;
    const workspaceWebsiteId = workspaceHtml.match(websiteIdPattern)?.[1];
    const siteWebsiteId = indexHtml.match(websiteIdPattern)?.[1];

    assert.match(workspaceHtml, /<script[^>]+src=["']https:\/\/cloud\.umami\.is\/script\.js["'][^>]*>/i);
    assert.equal(workspaceWebsiteId, siteWebsiteId);
    assert.match(workspaceHtml, /data-exclude-search=["']true["']/i);
    assert.match(workspaceHtml, /data-exclude-hash=["']true["']/i);
    assert.doesNotMatch(workspaceHtml, /data-umami-event/i);
    assert.doesNotMatch(workspaceJs, /\bumami\.(?:track|identify)\s*\(|analytics\.track\s*\(/i);
    assert.match(workspaceHtml, /<meta name="referrer" content="no-referrer">/);
    assert.match(indexHtml, /cloud\.umami\.is\/script\.js/);
});

test("keeps analytics-visible document titles fixed and content-free", () => {
    assert.match(workspaceHtml, /<title>Song Workspace \| Jam Tracks Hub<\/title>/);
    assert.equal(en.titles.songWorkspace, "Song Workspace | Jam Tracks Hub");
    assert.equal(zh.titles.songWorkspace, "歌曲工作區｜Jam Tracks Hub");
    assert.doesNotMatch(workspaceJs, /document\.title/);
    [workspaceHtml, en.titles.songWorkspace, zh.titles.songWorkspace].forEach(value => {
        assert.doesNotMatch(value, new RegExp(TITLE_CANARY));
        assert.doesNotMatch(value, /\{\{.*(?:title|artist).*\}\}/i);
    });
});

test("allows only generated opaque song IDs in workspace navigation URLs", () => {
    const generatedId = Core.createSong({}).id;
    const generatedUrl = Core.songWorkspaceUrl(generatedId);

    assert.equal(Core.isOpaqueSongId(generatedId), true);
    assert.equal(generatedUrl, `song-workspace.html?song=${generatedId}`);
    [TITLE_CANARY, `song-${TITLE_CANARY}`, "user supplied metadata", LYRIC_CANARY].forEach(value => {
        assert.equal(Core.isOpaqueSongId(value), false);
        assert.equal(Core.songWorkspaceUrl(value), "song-workspace.html");
    });
    assert.doesNotMatch(generatedUrl, /TITLE_CANARY|LYRIC_CANARY/);
});

test("regenerates imported and restored song IDs before navigation or storage", () => {
    assert.match(workspaceCore, /function prepareImportedSong[\s\S]*?song\.id = uid\("song"\)/);
    assert.match(workspaceImport, /core\.prepareImportedSong\(source, settings\.now\)[\s\S]*?storage\.put\(song\)/);
    assert.match(workspaceJs, /const restored = value\.songs\.map\(Core\.validateSong\)[\s\S]*?song\.id = Core\.createSong\(\{\}\)\.id;/);
    assert.match(workspaceJs, /history\.replaceState\(null, "", Core\.songWorkspaceUrl\(state\.song\.id\)\)/);
    assert.match(workspaceJs, /requestedId && !Core\.isOpaqueSongId\(requestedId\)/);
    assert.doesNotMatch(workspaceJs, /song-workspace\.html\?song=\$\{encodeURIComponent\(state\.song\.id\)\}/);
});

test("parser and JSON import failures never serialize raw song content", () => {
    assert.throws(
        () => Core.deserializeSong(`{ broken: ${LYRIC_CANARY}`),
        error => !error.message.includes(LYRIC_CANARY) && /not valid JSON/.test(error.message)
    );
    assert.throws(
        () => Core.parseChordPro(CHORDPRO_CANARY.repeat(25000)),
        error => !error.message.includes(CHORDPRO_CANARY) && /too large/.test(error.message)
    );
    assert.match(workspaceJs, /catch \(error\) \{\s*throw new Error\(t\("pages\.songWorkspace\.importError"/);
    assert.doesNotMatch(workspaceJs, /console\.(?:log|warn|error)\s*\(/);
});

test("Song Workspace production modules have no remote content transport or error forwarding", () => {
    const source = [workspaceCore, workspaceStorage, workspaceImport, workspaceJs].join("\n");
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|WebSocket\s*\(|EventSource|FormData|navigator\.sendBeacon/i);
    assert.doesNotMatch(source, /window\.onerror|unhandledrejection|console\.(?:log|warn|error)\s*\(/i);
    assert.doesNotMatch(source, /sentry|logrocket|posthog|mixpanel|segment|telemetry/i);
});

test("synthetic song content stays inside the canonical local document", () => {
    const song = Core.createSong({
        title: TITLE_CANARY,
        artist: "ARTIST_CANARY_NEVER_SEND",
        sections: [Core.createSection("SECTION_CANARY_NEVER_SEND", "section", [
            Core.createLine(LYRIC_CANARY, [Core.createChord("C", 0)], "lyric")
        ])]
    });
    const serialized = Core.serializeSong(song);

    [TITLE_CANARY, LYRIC_CANARY, "ARTIST_CANARY_NEVER_SEND", "SECTION_CANARY_NEVER_SEND"].forEach(value => {
        assert.match(serialized, new RegExp(value));
        assert.doesNotMatch(Core.songWorkspaceUrl(song.id), new RegExp(value));
    });
});
