const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const Core = require("../scripts/song-workspace-core.js");
const Storage = require("../scripts/song-workspace-storage.js");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const moduleUrl = file => pathToFileURL(path.join(root, file)).href;

const XSS_CANARIES = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<svg onload=alert(1)>",
    "\"</script><script>alert(1)</script>",
    "javascript:alert(1)",
    "&lt;safe&gt; ' \" < >"
];

test("Song Workspace preserves XSS canaries as inert document text", () => {
    XSS_CANARIES.forEach(function(canary, index) {
        const song = Core.createSong({
            title: canary,
            artist: canary,
            sections: [Core.createSection(canary, "section", [
                Core.createLine(canary, [Core.createChord("C", 0)], "lyric")
            ])]
        });
        const restored = Core.deserializeSong(Core.serializeSong(song));
        assert.equal(restored.title, canary.slice(0, 160), `title canary ${index}`);
        assert.equal(restored.artist, canary.slice(0, 160), `artist canary ${index}`);
        assert.equal(restored.sections[0].title, canary.slice(0, 80), `section canary ${index}`);
        assert.equal(restored.sections[0].lines[0].text, canary.slice(0, Core.LIMITS.MAX_LINE_LENGTH), `lyric canary ${index}`);
        assert.doesNotMatch(Core.songWorkspaceUrl(restored.id), /script|javascript|onerror|onload/i);
    });
});

test("ChordPro, JSON, and chord inputs keep injection canaries non-executable", () => {
    const canary = "<img src=x onerror=alert(1)>";
    const chordProSong = Core.parseChordPro(`{title: ${canary}}\n[C]${canary}`);
    assert.equal(chordProSong.title, canary);
    assert.equal(chordProSong.sections[0].lines[0].text, canary);
    const jsonSong = Core.deserializeSong(Core.serializeSong(chordProSong));
    assert.equal(jsonSong.title, canary);
    XSS_CANARIES.forEach(function(value) {
        assert.equal(Core.parseChordSymbol(value), null);
    });
});

test("Song Workspace user text uses text DOM sinks and has no executable URL sink", () => {
    const app = read("src/composables/useSongWorkspace.js");
    const core = read("scripts/song-workspace-core.js");
    const html = read("song-workspace.html") + read("src/views/SongWorkspaceView.vue");
    assert.match(app, /function node\([\s\S]*?textContent/);
    assert.doesNotMatch(app, /insertAdjacentHTML|outerHTML|document\.write|javascript:/i);
    assert.equal((app.match(/\.innerHTML\s*=/g) || []).length, 1);
    assert.match(app, /Shapes\.renderProgressionDiagram/);
    assert.doesNotMatch(core, /javascript:/i);
    assert.doesNotMatch(html, /data-umami-event/i);
});

test("Song Document validation rejects pathological logical structures before canonicalization", () => {
    const tooManySectionLines = Core.createSong({ sections: [Core.createSection("Verse", "verse", [])] });
    tooManySectionLines.sections[0].lines = Array.from(
        { length: Core.LIMITS.MAX_LINES_PER_SECTION + 1 },
        () => ({ id: "line-safe", type: "lyric", text: "x", chords: [] })
    );
    assert.throws(() => Core.validateSong(tooManySectionLines), /too many or invalid lines in a section/);

    const tooManyChords = Core.createSong({ sections: [Core.createSection("Verse", "verse", [Core.createLine("x", [], "lyric")])] });
    tooManyChords.sections[0].lines[0].chords = Array.from(
        { length: Core.LIMITS.MAX_CHORDS_PER_LINE + 1 },
        () => ({ id: "chord-safe", symbol: "C", anchorPosition: 0 })
    );
    assert.throws(() => Core.validateSong(tooManyChords), /too many chords in a line/);

    const oversizedTitle = Core.createSong({ sections: [] });
    oversizedTitle.title = "x".repeat(161);
    assert.throws(() => Core.validateSong(oversizedTitle), /oversized metadata/);

    const malformed = Core.createSong({ sections: [Core.createSection("Verse", "verse", [])] });
    malformed.sections[0].lines = [{ id: "line-safe", type: "lyric", text: {}, chords: [] }];
    assert.throws(() => Core.validateSong(malformed), /invalid or oversized line data/);

    const malformedType = Core.createSong({ sections: [Core.createSection("Verse", "verse", [Core.createLine("x", [], "lyric")])] });
    malformedType.sections[0].lines[0].type = { nested: "instrumental" };
    assert.throws(() => Core.validateSong(malformedType), /invalid line types/);

    const malformedAnchor = Core.createSong({ sections: [Core.createSection("Verse", "verse", [Core.createLine("x", [Core.createChord("C", 0)], "lyric")])] });
    malformedAnchor.sections[0].lines[0].chords[0].anchorPosition = Infinity;
    assert.throws(() => Core.validateSong(malformedAnchor), /invalid chord positions/);
});

test("ChordPro and plain-text parsers reject oversized lines and chord amplification", () => {
    assert.throws(() => Core.parseChordLyrics("x".repeat(Core.LIMITS.MAX_LINE_LENGTH + 1)), /oversized line/);
    assert.throws(() => Core.parseChordPro("x".repeat(Core.LIMITS.MAX_LINE_LENGTH + 1)), /oversized line/);
    const chordFlood = Array.from({ length: Core.LIMITS.MAX_CHORDS_PER_LINE + 1 }, () => "C").join(" ");
    assert.throws(() => Core.parseChordLyrics(chordFlood), /too many chords/);
    const instrumentalFlood = Array.from({ length: Core.LIMITS.MAX_CHORDS_PER_BAR + 1 }, () => "C").join(" ");
    assert.throws(() => Core.parseChordLyrics(instrumentalFlood), /too many chords/);
    const chordProFlood = Array.from({ length: Core.LIMITS.MAX_CHORDS_PER_LINE + 1 }, () => "[C]x").join("");
    assert.throws(() => Core.parseChordPro(chordProFlood), /too many chords/);
});

test("corrupted local records are bounded and do not block valid songs", () => {
    const valid = Core.createSong({ title: "Synthetic valid song", sections: [] });
    const invalid = { schema: Core.SCHEMA, version: Core.VERSION, title: "broken", sections: "not-an-array" };
    const result = Storage.filterValidSongs([invalid, valid], Core.validateSong);
    assert.equal(result.skippedCount, 1);
    assert.equal(result.songs.length, 1);
    assert.equal(result.songs[0].title, "Synthetic valid song");
    assert.equal(Storage.MAX_STORED_RECORDS, 500);
});

test("malformed and oversized preferences fall back to bounded canonical values", () => {
    const polluted = {
        chartZoom: Infinity,
        lineSpacing: 999999,
        viewMode: "<script>",
        chordHints: "yes",
        lastSongId: "x".repeat(1000),
        scrollSpeedMultiplier: 999,
        songShapeSelections: Object.fromEntries(
            Array.from({ length: 510 }, (_, index) => [`song-${index}`, { ["C".repeat(41)]: "x".repeat(500) }])
        ),
        unexpected: "drop me"
    };
    assert.deepEqual(Storage.sanitizePreferences(polluted), {
        chartZoom: Storage.CHART_ZOOM.default,
        lineSpacing: Storage.LINE_SPACING.default,
        scrollSpeedMultiplier: 2,
        songShapeSelections: {}
    });
});

test("bounded JSON helper rejects missing origin, wrong type, malformed, and oversized bodies", async () => {
    const { assertSameOrigin, readBoundedJson } = await import(moduleUrl("functions/api/request-security.mjs"));
    const valid = new Request("https://jamtrackshub.com/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Origin": "https://jamtrackshub.com" },
        body: JSON.stringify({ topic: "Synthetic" })
    });
    assert.doesNotThrow(() => assertSameOrigin(valid));
    assert.deepEqual(await readBoundedJson(valid, 1024), { topic: "Synthetic" });

    const missingOrigin = new Request("https://jamtrackshub.com/api/feedback");
    assert.throws(() => assertSameOrigin(missingOrigin), error => error.status === 403);
    const wrongOrigin = new Request("https://jamtrackshub.com/api/feedback", { headers: { Origin: "https://example.test" } });
    assert.throws(() => assertSameOrigin(wrongOrigin), error => error.status === 403);
    const wrongType = new Request("https://jamtrackshub.com/api/feedback", { method: "POST", body: "{}" });
    await assert.rejects(readBoundedJson(wrongType, 1024), error => error.status === 415);
    const oversized = new Request("https://jamtrackshub.com/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "x".repeat(64) })
    });
    await assert.rejects(readBoundedJson(oversized, 16), error => error.status === 413);
});

test("subscriber export token comparison is fixed-size and query tokens are forbidden", async () => {
    const { timingSafeTokenEqual } = await import(moduleUrl("functions/api/request-security.mjs"));
    assert.equal(await timingSafeTokenEqual("synthetic-token", "synthetic-token"), true);
    assert.equal(await timingSafeTokenEqual("wrong", "synthetic-token"), false);
    const source = read("functions/api/subscribers.csv.js");
    assert.match(source, /Authorization/);
    assert.match(source, /timingSafeTokenEqual/);
    assert.doesNotMatch(source, /searchParams|get\(["']token["']\)|queryToken/);
});

test("Worker allowlists routes and methods with bounded generic API responses", () => {
    const worker = read("worker.js");
    const handlers = read("functions/api/subscribe.js") + read("functions/api/feedback.js");
    assert.match(worker, /url\.pathname === "\/api" \|\| url\.pathname\.startsWith\("\/api\/"\)/);
    assert.match(worker, /methodNotAllowed\(\["POST", "OPTIONS"\]\)/);
    assert.match(worker, /methodNotAllowed\(\["GET"\]\)/);
    assert.match(worker, /API route not found/);
    assert.match(handlers, /MAX_REQUEST_BODY_BYTES = 4 \* 1024/);
    assert.match(handlers, /MAX_REQUEST_BODY_BYTES = 16 \* 1024/);
    assert.doesNotMatch(handlers, /request\.json\(\)|Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/);
    assert.doesNotMatch(worker + handlers, /stack|JTH_RENDER_PROXY_SECRET|JTH_REQUIRE_PROXY_AUTH/);
});

test("Worker returns bounded statuses for unknown APIs, methods, origins, and content types", async () => {
    const emitWarning = process.emitWarning;
    process.emitWarning = function() {};
    let worker;
    try {
        worker = (await import(`${moduleUrl("worker.js")}?security-test=1`)).default;
    } finally {
        process.emitWarning = emitWarning;
    }
    const env = {
        SUBSCRIBERS_DB: {},
        ASSETS: { fetch() { throw new Error("API requests must not reach static assets"); } }
    };
    const unknown = await worker.fetch(new Request("https://jamtrackshub.com/api/unknown"), env, {});
    assert.equal(unknown.status, 404);
    assert.equal(unknown.headers.get("Cache-Control"), "no-store");

    const wrongMethod = await worker.fetch(new Request("https://jamtrackshub.com/api/feedback", { method: "DELETE" }), env, {});
    assert.equal(wrongMethod.status, 405);
    assert.equal(wrongMethod.headers.get("Allow"), "POST, OPTIONS");

    const wrongOrigin = await worker.fetch(new Request("https://jamtrackshub.com/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Origin": "https://example.test" },
        body: "{}"
    }), env, {});
    assert.equal(wrongOrigin.status, 403);
    assert.equal(wrongOrigin.headers.get("Access-Control-Allow-Origin"), null);

    const wrongType = await worker.fetch(new Request("https://jamtrackshub.com/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "text/plain", "Origin": "https://jamtrackshub.com" },
        body: "{}"
    }), env, {});
    assert.equal(wrongType.status, 415);

    const preflight = await worker.fetch(new Request("https://jamtrackshub.com/api/subscribe", {
        method: "OPTIONS",
        headers: { "Origin": "https://jamtrackshub.com" }
    }), env, {});
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), "https://jamtrackshub.com");

    const wrongPreflight = await worker.fetch(new Request("https://jamtrackshub.com/api/subscribe", {
        method: "OPTIONS",
        headers: { "Origin": "https://example.test" }
    }), env, {});
    assert.equal(wrongPreflight.status, 403);

    const staticEnv = {
        ASSETS: { fetch(request) { return new Response(new URL(request.url).pathname, { status: 200 }); } }
    };
    const staticGet = await worker.fetch(new Request("https://jamtrackshub.com/styles/base.css"), staticEnv, {});
    assert.equal(staticGet.status, 200);
    assert.equal(await staticGet.text(), "/styles/base.css");
    const staticPost = await worker.fetch(new Request("https://jamtrackshub.com/styles/base.css", { method: "POST" }), staticEnv, {});
    assert.equal(staticPost.status, 405);
    assert.equal(staticPost.headers.get("Allow"), "GET, HEAD");
});

test("static build tracks CSP, browser restrictions, and bounded cache policy", () => {
    const headers = read("_headers");
    const build = read("tools/scripts/build-cloudflare.js");
    const waking = read("service-waking.html");
    assert.match(build, /"_headers"/);
    assert.match(headers, /Content-Security-Policy:/);
    assert.match(headers, /script-src 'self' https:\/\/cloud\.umami\.is/);
    assert.match(headers, /connect-src 'self' https:\/\/cloud\.umami\.is https:\/\/gateway\.umami\.is https:\/\/api\.jamtrackshub\.com/);
    assert.doesNotMatch(headers, /script-src[^;]*(?:unsafe-inline|unsafe-eval)/);
    assert.match(headers, /frame-ancestors 'none'/);
    assert.match(headers, /X-Content-Type-Options: nosniff/);
    assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/);
    assert.match(headers, /Permissions-Policy:/);
    assert.match(headers, /\/\*\.html[\s\S]*max-age=0, must-revalidate/);
    assert.match(headers, /\/assets\/\*[\s\S]*max-age=86400, must-revalidate/);
    assert.doesNotMatch(headers, /immutable|Strict-Transport-Security/);
    assert.doesNotMatch(waking, /<script>\s*[\s\S]+?<\/script>/);
    assert.match(waking, /src\/entries\/service-waking\.js/);
    assert.doesNotMatch(read("src/views/ServiceWakingView.vue"), /v-html|innerHTML|analytics|data-umami-event/i);
});

test("security hardening does not add Song Workspace transport or content telemetry", () => {
    const songSource = [
        "scripts/song-workspace-core.js",
        "scripts/song-workspace-storage.js",
        "scripts/song-workspace-import.js",
        "src/composables/useSongWorkspace.js"
    ].map(read).join("\n");
    assert.doesNotMatch(songSource, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|FormData|console\.(?:log|warn|error)/i);
    assert.doesNotMatch(songSource, /cloud\.umami\.is|sentry|posthog|telemetry/i);
    assert.match(read("src/composables/useSongWorkspace.js"), /duplicateInFlight\.has\(song\.id\)/);
});
