const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const Core = require("../scripts/song-workspace-core.js");
const Storage = require("../scripts/song-workspace-storage.js");
const SongImport = require("../scripts/song-workspace-import.js");
const Shapes = require("../scripts/chord-shapes.js");
const { createIsolatedIndexedDb } = require("./helpers/isolated-indexeddb.js");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const fixture = JSON.parse(read("tests/fixtures/song-workspace-phase6a-contract.json"));
const workspaceHtml = read("song-workspace.html") + read("src/views/SongWorkspaceView.vue");
const workspaceJs = read("src/composables/useSongWorkspace.js");
const workspaceCore = read("scripts/song-workspace-core.js");
const workspaceStorage = read("scripts/song-workspace-storage.js");
const workspaceImport = read("scripts/song-workspace-import.js");

function semanticSong(song) {
    const copy = structuredClone(song);
    delete copy.id;
    delete copy.createdAt;
    delete copy.updatedAt;
    return copy;
}

function allLines(song) {
    return song.sections.flatMap(section => section.lines);
}

test("freezes unchanged Song domain resources while Vue owns the workspace runtime", () => {
    Object.entries(fixture.legacyRuntimeSha256).forEach(([file, expected]) => {
        const actual = crypto.createHash("sha256").update(read(file)).digest("hex");
        assert.equal(actual, expected, file);
    });
    assert.match(workspaceHtml, /id="vue-song-workspace-root"/);
    assert.match(workspaceHtml, /src="\/src\/entries\/song-workspace\.js"/);
    assert.doesNotMatch(workspaceHtml, /scripts\/song-workspace\.js/);
    assert.match(workspaceJs, /export function useSongWorkspace\(\)/);
    assert.match(workspaceJs, /onMounted\(function\(\) \{\s*initialize\(\)/);
    assert.doesNotMatch(workspaceJs, /DOMContentLoaded/);
});

test("defines a synthetic 20-category characterization corpus", () => {
    assert.equal(fixture.syntheticOnly, true);
    assert.equal(fixture.characterizationCategories.length, 20);
    assert.equal(new Set(fixture.characterizationCategories).size, 20);
    [
        "english-song", "traditional-chinese-song", "mixed-english-cjk-song",
        "chord-only-instrumental-section", "repeated-lyric-tokens", "punctuation-heavy-line",
        "multiple-chord-anchors", "natural-key", "sharp-key", "flat-key", "capo-shape-key",
        "smart-capo", "roman-mode", "nashville-mode", "chordpro-import",
        "jth-json-v2-round-trip", "malformed-import", "corrupted-storage",
        "storage-boundary", "read-performance-state"
    ].forEach(category => assert.ok(fixture.characterizationCategories.includes(category), category));
});

test("freezes Song Document v2 fields, defaults, validation, unknown fields, and stable nested IDs", () => {
    const song = Core.validateSong(Object.assign({ futureField: "discarded" }, fixture.canonicalSong));
    assert.equal(Core.SCHEMA, "jamtrackshub-song");
    assert.equal(Core.VERSION, 2);
    assert.deepEqual(Object.keys(song), [
        "schema", "version", "id", "title", "artist", "originalKey", "targetKey",
        "chordSpelling", "capo", "bpm", "timeSignature", "sections", "createdAt", "updatedAt"
    ]);
    assert.equal(Object.hasOwn(song, "futureField"), false);
    assert.equal(song.sections[0].id, "section-verse");
    assert.equal(song.sections[0].lines[0].id, "line-en");
    assert.equal(song.sections[0].lines[0].chords[0].id, "chord-en-1");
    assert.deepEqual(Core.deserializeSong(Core.serializeSong(song)), song);
    assert.throws(() => Core.validateSong({ schema: Core.SCHEMA, version: 1, sections: [] }), /version 2/);

    const defaults = Core.createSong({ id: "song-default-contract" });
    assert.equal(defaults.title, "Untitled Song");
    assert.equal(defaults.artist, "");
    assert.equal(defaults.originalKey, "C");
    assert.equal(defaults.targetKey, "C");
    assert.equal(defaults.chordSpelling, "theory");
    assert.equal(defaults.capo, 0);
    assert.equal(defaults.bpm, null);
    assert.equal(defaults.timeSignature, "4/4");
    assert.deepEqual(defaults.sections, []);
});

test("preserves canonical lyric strings and freezes English, CJK, and mixed tokenization", () => {
    const restored = Core.deserializeSong(Core.serializeSong(fixture.canonicalSong));
    assert.deepEqual(
        allLines(restored).map(line => line.text),
        allLines(fixture.canonicalSong).map(line => line.text)
    );

    fixture.tokenization.forEach(example => {
        const tokens = Core.tokenizeLyric(example.source);
        assert.deepEqual(tokens.map(token => token.kind), example.kinds, example.id);
        assert.deepEqual(tokens.filter(token => token.meaningful).map(token => token.text), example.meaningful, example.id);
        assert.deepEqual(
            tokens.filter(token => token.meaningful).map(token => token.positionIndex),
            example.meaningful.map((_, index) => index),
            example.id
        );
        assert.equal(tokens.map(token => token.text).join(""), example.source, example.id);
    });
});

test("freezes anchor round-trip, duplicate ordering, unanchored behavior, and line-edit semantics", () => {
    const source = Core.createLine("alpha beta gamma", [
        { id: "chord-first", symbol: "C", anchorPosition: 1 },
        { id: "chord-second", symbol: "G", anchorPosition: 1 }
    ], "lyric", "line-anchor");
    const song = Core.createSong({ sections: [Core.createSection("Verse", "verse", [source], "section-anchor")] });
    const roundTrip = Core.deserializeSong(Core.serializeSong(song)).sections[0].lines[0];
    assert.deepEqual(roundTrip.chords.map(chord => [chord.id, chord.anchorPosition]), [["chord-first", 1], ["chord-second", 1]]);
    assert.deepEqual(Core.layoutLyricLine(roundTrip).tokens.find(token => token.text === "beta").chords.map(chord => chord.id), ["chord-first", "chord-second"]);

    const edits = [
        ["new alpha beta gamma", "alpha", 1],
        ["beta gamma", "gamma", 1],
        ["solo", "solo", 0],
        ["", null, 1]
    ];
    edits.forEach(([text, resolved, storedPosition]) => {
        const edited = Core.createLine(text, [source.chords[0]], "lyric", source.id);
        const layout = Core.layoutLyricLine(edited);
        assert.equal(edited.chords[0].anchorPosition, storedPosition, text);
        assert.equal(layout.tokens.find(token => token.chords.length)?.text || null, resolved, text);
        assert.equal(layout.unanchored.length, resolved === null ? 1 : 0, text);
    });
});

test("freezes chord grammar, display modes, key/capo/Shape Key, enharmonics, and Smart Capo", () => {
    fixture.displayModes.source.forEach(symbol => assert.ok(Core.parseChordSymbol(symbol), symbol));
    ["H7", "C<script>", "C/", "Cmaj999"].forEach(symbol => assert.equal(Core.parseChordSymbol(symbol), null, symbol));
    assert.deepEqual(fixture.displayModes.source.map(symbol => Core.simplifyChord(symbol, "balanced")), fixture.displayModes.balanced);
    assert.deepEqual(fixture.displayModes.source.map(symbol => Core.simplifyChord(symbol, "beginner")), fixture.displayModes.beginner);
    assert.deepEqual(fixture.displayModes.source.map(symbol => Core.chordNumber(symbol, "C", "roman")), fixture.displayModes.roman);
    assert.deepEqual(fixture.displayModes.source.map(symbol => Core.chordNumber(symbol, "C", "nashville")), fixture.displayModes.nashville);

    const capoSong = Core.createSong({
        originalKey: "Bb", targetKey: "Bb", chordSpelling: "theory", capo: 3,
        sections: [Core.createSection("Song", "section", [Core.createLine("", [Core.createChord("Bb", 0), Core.createChord("F", 1)], "instrumental")])]
    });
    const capo = Core.songForCapo(capoSong, 3);
    assert.equal(capo.shapeKey, "G");
    assert.deepEqual(capo.song.sections[0].lines[0].chords.map(chord => chord.symbol), ["G", "D"]);
    assert.equal(Core.songForTarget(Core.createSong({ originalKey: "C", chordSpelling: "theory" }), "Db").targetKey, "Db");
    assert.equal(Core.songForTarget(Core.createSong({ originalKey: "C#m", chordSpelling: "theory" }), "Dbm").targetKey, "C#m");
    assert.deepEqual(Core.smartCapo(fixture.canonicalSong, 3).map(choice => choice.capo), [0, 5, 10]);
    assert.ok(Shapes.generateVoicings(Shapes.parseChord("G/B")).length > 0);
});

test("freezes BPM-derived auto-scroll distance and multiplier bounds", () => {
    fixture.autoScroll.forEach(example => {
        assert.equal(
            Core.scrollDistanceForElapsed(example.bpm, example.multiplier, example.milliseconds),
            example.distance
        );
    });
    assert.equal(Core.baseScrollSpeedForBpm(0), 48);
    assert.equal(Core.baseScrollSpeedForBpm(20), 18);
    assert.equal(Core.baseScrollSpeedForBpm(320), 96);
    assert.equal(Core.normalizeScrollSpeedMultiplier(0.1), 0.5);
    assert.equal(Core.normalizeScrollSpeedMultiplier(9), 2);
});

test("freezes ChordPro metadata, sections, Unicode, instrumental, unknown-directive, and malformed-chord behavior", () => {
    fixture.chordProCases.forEach(example => {
        const song = Core.parseChordPro(example.source);
        const line = allLines(song).find(candidate => candidate.text === example.text && (!example.lineType || candidate.type === example.lineType));
        assert.ok(line, example.id);
        assert.deepEqual(line.chords.map(chord => chord.symbol), example.chords, example.id);
        if (example.title) assert.equal(song.title, example.title);
        if (example.artist) assert.equal(song.artist, example.artist);
        if (example.key) assert.equal(song.originalKey, example.key);
        if (example.bpm) assert.equal(song.bpm, example.bpm);
        if (example.timeSignature) assert.equal(song.timeSignature, example.timeSignature);
    });
});

test("freezes JTH JSON import, ID regeneration, exports, and semantic round-trips", async () => {
    const source = Core.serializeSong(fixture.canonicalSong);
    const persisted = [];
    const imported = await SongImport.importSingleSong(source, {
        core: Core,
        storage: { async put(song) { persisted.push(structuredClone(song)); } },
        existingSongs: [],
        now: "2026-09-04T01:02:03.000Z"
    });
    assert.notEqual(imported.song.id, fixture.canonicalSong.id);
    assert.equal(Core.isOpaqueSongId(imported.song.id), true);
    assert.equal(imported.song.createdAt, "2026-09-04T01:02:03.000Z");
    assert.equal(imported.song.updatedAt, "2026-09-04T01:02:03.000Z");
    assert.deepEqual(imported.song.sections.map(section => section.id), fixture.canonicalSong.sections.map(section => section.id));
    assert.deepEqual(semanticSong(imported.song), semanticSong(fixture.canonicalSong));
    assert.deepEqual(persisted[0], imported.song);

    const chordPro = Core.toChordPro(fixture.canonicalSong);
    const chordProRoundTrip = Core.parseChordPro(chordPro);
    const lyricSource = allLines(fixture.canonicalSong).filter(line => line.text);
    const lyricRoundTrip = allLines(chordProRoundTrip).filter(line => line.text);
    assert.deepEqual(lyricRoundTrip.map(line => line.text), lyricSource.map(line => line.text));
    assert.deepEqual(lyricRoundTrip.map(line => line.chords.map(chord => chord.symbol)), lyricSource.map(line => line.chords.map(chord => chord.symbol)));
    assert.deepEqual(lyricRoundTrip.map(line => line.chords.map(chord => chord.anchorPosition)), lyricSource.map(line => line.chords.map(chord => chord.anchorPosition)));
    assert.deepEqual(
        chordProRoundTrip.sections.find(section => section.title === "Instrumental").lines.map(line => line.chords.map(chord => chord.symbol)),
        [["C", "G/B"], ["Am7", "Fadd9"], []]
    );
    assert.deepEqual(
        chordProRoundTrip.sections.find(section => section.title === "Instrumental").lines.slice(0, 2).map(line => line.chords.map(chord => chord.anchorPosition)),
        [[0, 0], [0, 0]]
    );
    assert.match(Core.toPlainText(fixture.canonicalSong), /測試，節奏開始了。/);
    assert.doesNotMatch(chordPro, /<script>|javascript:/i);
});

test("rejects malformed, wrong-schema, wrong-version, legacy-anchor, and oversized JTH input with bounded errors", async () => {
    const canary = fixture.privacyCanaries.lyric;
    const cases = [
        `{ broken: ${canary}`,
        JSON.stringify({ schema: "wrong", version: 2, sections: [] }),
        JSON.stringify({ schema: Core.SCHEMA, version: 1, sections: [] }),
        JSON.stringify({ schema: Core.SCHEMA, version: 2, sections: [{ id: "s", type: "verse", title: "V", lines: [{ id: "l", type: "lyric", text: "x", chords: [{ id: "c", symbol: "C", anchor: 0, anchorPosition: 0 }] }] }] }),
        "x".repeat(Core.LIMITS.MAX_SOURCE_LENGTH + 1)
    ];
    for (const source of cases) {
        await assert.rejects(
            SongImport.importSingleSong(source, { core: Core, storage: { async put() {} } }),
            error => error.name === "SingleSongImportError"
                && error.message === "JTH_SINGLE_SONG_IMPORT_FAILED"
                && !error.message.includes(canary)
        );
    }
});

test("round-trips songs through an isolated IndexedDB contract without touching browser storage", async () => {
    const indexedDb = createIsolatedIndexedDb();
    const songA = Core.validateSong(fixture.canonicalSong);
    const songB = Core.createSong({
        id: "song-22222222-2222-4222-8222-222222222222",
        title: "Synthetic B",
        updatedAt: "2026-09-04T02:00:00.000Z"
    });
    await Storage.put(songA, indexedDb);
    await Storage.put(songB, indexedDb);
    assert.deepEqual(await Storage.get(songA.id, indexedDb), songA);
    assert.deepEqual((await Storage.list(indexedDb)).map(song => song.id), [songB.id, songA.id]);
    await Storage.remove(songA.id, indexedDb);
    assert.equal(await Storage.get(songA.id, indexedDb), undefined);
    await Storage.replaceAll([songA], indexedDb);
    assert.deepEqual(await Storage.list(indexedDb), [songA]);
});

test("freezes the 500-record visibility boundary, corrupt-record skip, and storage failures in isolation", async () => {
    const records = Array.from({ length: 501 }, (_, index) => Core.createSong({
        id: `song-boundary-${String(index).padStart(8, "0")}-abcdef`,
        title: `Synthetic ${index}`,
        updatedAt: new Date(Date.UTC(2026, 8, 4, 0, 0, index % 60)).toISOString()
    }));
    const filtered = Storage.filterValidSongs(records, Core.validateSong);
    assert.equal(filtered.songs.length, 500);
    assert.equal(filtered.skippedCount, 1);

    const corrupt = Storage.filterValidSongs([fixture.canonicalSong, { schema: "wrong" }], Core.validateSong);
    assert.equal(corrupt.songs.length, 1);
    assert.equal(corrupt.skippedCount, 1);
    await assert.rejects(Storage.list(createIsolatedIndexedDb({ failOpen: true })));
    await assert.rejects(Storage.put(fixture.canonicalSong, createIsolatedIndexedDb({ failWrites: true })));
});

test("freezes isolated localStorage preferences, bounds, corruption, and the 256 KiB read limit", () => {
    const values = new Map();
    const previous = global.localStorage;
    global.localStorage = {
        getItem(key) { return values.get(key) ?? null; },
        setItem(key, value) { values.set(key, value); }
    };
    try {
        const preferences = {
            chartZoom: 120,
            lineSpacing: 7,
            viewMode: "roman",
            chordHints: true,
            scrollSpeedMultiplier: 1.25,
            lastSongId: fixture.canonicalSong.id,
            songShapeSelections: { [fixture.canonicalSong.id]: { "G/B": "x,2,0,0,0,3" } }
        };
        assert.equal(Storage.writePreferences(preferences), true);
        assert.deepEqual(Storage.readPreferences(), preferences);
        values.set(Storage.PREFERENCES_KEY, "{");
        assert.deepEqual(Storage.readPreferences(), {});
        values.set(Storage.PREFERENCES_KEY, "x".repeat(Storage.MAX_PREFERENCES_BYTES + 1));
        assert.deepEqual(Storage.readPreferences(), {});
        assert.deepEqual(Storage.CHART_ZOOM, { min: 50, max: 150, step: 10, default: 100 });
        assert.deepEqual(Storage.LINE_SPACING, { min: 0, max: 20, step: 1, default: 10 });
    } finally {
        if (previous === undefined) delete global.localStorage;
        else global.localStorage = previous;
    }
});

test("freezes local My Songs, autosave, backup/restore, export, modal, focus, scroll, and responsive UI wiring", () => {
    assert.match(workspaceJs, /Storage\.list\(\)[\s\S]*Storage\.filterValidSongs/);
    assert.match(workspaceJs, /\[t\("pages\.songWorkspace\.open"[\s\S]*"duplicate"[\s\S]*"download"[\s\S]*"delete"/);
    assert.match(workspaceJs, /window\.setTimeout\(saveCurrentSong, 500\)/);
    assert.match(workspaceJs, /jamtrackshub-song-backup[\s\S]*version: 1[\s\S]*MAX_BACKUP_SONGS/);
    assert.match(workspaceJs, /\[\["JSON", "json"\], \["ChordPro", "chordpro"\], \["TXT", "txt"\]/);
    assert.match(workspaceJs, /lockDialogBackground[\s\S]*body\.style\.position = "fixed"/);
    assert.match(workspaceJs, /restoreDialogBackground[\s\S]*window\.scrollTo\(locked\.x, locked\.y\)/);
    assert.match(workspaceJs, /focusWithoutScroll/);
    assert.match(workspaceJs, /setReadMode\(true/);
    assert.match(workspaceJs, /openPerformance/);
    assert.match(workspaceJs, /max-width: 720px/);
    assert.match(read("styles/song-workspace.css"), /@media \(max-width: 720px\)/);
    assert.match(read("styles/song-workspace.css"), /@media print/);
});

test("enforces NO_LYRICS_EGRESS across URL, title, analytics, transport, Worker, and remote-log surfaces", () => {
    const canaries = Object.values(fixture.privacyCanaries);
    const song = Core.createSong({
        title: fixture.privacyCanaries.title,
        artist: fixture.privacyCanaries.artist,
        sections: [Core.createSection(fixture.privacyCanaries.section, "section", [
            Core.createLine(fixture.privacyCanaries.lyric, [Core.createChord("C", 0)], "lyric")
        ])]
    });
    const contentFreeSurfaces = [
        Core.songWorkspaceUrl(song.id),
        workspaceHtml.match(/<title>([^<]+)<\/title>/)?.[1] || "",
        workspaceHtml.match(/<script[^>]+cloud\.umami\.is[^>]*>/i)?.[0] || ""
    ];
    canaries.forEach(canary => contentFreeSurfaces.forEach(surface => assert.doesNotMatch(surface, new RegExp(canary))));
    assert.match(workspaceHtml, /<meta name="referrer" content="no-referrer">/);
    assert.match(workspaceHtml, /data-exclude-search="true"/);
    assert.match(workspaceHtml, /data-exclude-hash="true"/);
    assert.doesNotMatch(workspaceHtml, /data-umami-event/i);
    assert.doesNotMatch(workspaceJs, /document\.title|\bumami\.(?:track|identify)|analytics\.track/i);
    assert.doesNotMatch([workspaceCore, workspaceStorage, workspaceImport, workspaceJs].join("\n"), /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|FormData|console\.(?:log|warn|error)|sentry|logrocket|posthog|mixpanel|segment|telemetry/i);
    assert.doesNotMatch(workspaceJs, /\/api\/|worker/i);
});

test("publishes the interaction inventory, shared-consumer map, Phase 6B map, and zero-caller removal gates", () => {
    const document = read("docs/SONG_WORKSPACE_PHASE_6A_CONTRACT.md");
    [
        "Runtime dependency graph", "State and domain model", "Interaction inventory",
        "Persistence contract", "Import and export contract", "Privacy contract",
        "Responsive and accessibility contract", "Phase 6B migration map", "Legacy removal plan"
    ].forEach(heading => assert.match(document, new RegExp(heading, "i"), heading));
    [
        "scripts/chord-shapes.js", "Progression Writer", "song-workspace-core.js",
        "song-workspace-storage.js", "song-workspace-import.js", "song-workspace.js",
        "zero-caller"
    ].forEach(value => assert.match(document, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), value));
});
