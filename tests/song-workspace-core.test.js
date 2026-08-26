const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../scripts/song-workspace-core.js");

function syntheticSong() {
    return Core.createSong({
        title: "Anchor Test",
        originalKey: "G",
        targetKey: "G",
        sections: [Core.createSection("Verse", "verse", [
            Core.createLine("測試中文歌詞，with spaces.", [
                Core.createChord("G", 0),
                Core.createChord("D/F#", 8)
            ], "lyric")
        ])]
    });
}

test("creates and validates a versioned Song Document", () => {
    const song = syntheticSong();
    const serialized = Core.serializeSong(song);
    const restored = Core.deserializeSong(serialized);
    assert.equal(restored.schema, "jamtrackshub-song");
    assert.equal(restored.version, 1);
    assert.equal(restored.sections[0].id, song.sections[0].id);
    assert.equal(restored.sections[0].lines[0].id, song.sections[0].lines[0].id);
    assert.throws(() => Core.validateSong({ schema: "wrong", version: 1, sections: [] }));
    assert.throws(() => Core.validateSong({ schema: Core.SCHEMA, version: 2, sections: [] }));
    assert.throws(() => Core.deserializeSong("not-json"), /valid JSON/);
    assert.throws(() => Core.deserializeSong(JSON.stringify({ schema: Core.SCHEMA, version: 2, sections: [] })), /version 1/);
});

test("parses supported chord symbols and rejects malformed input", () => {
    ["G", "Am", "Bb", "F#m7", "Cmaj7", "Bm7b5", "A7(b13)", "G/B", "C#sus4", "Ebadd9"].forEach(symbol => {
        assert.ok(Core.parseChordSymbol(symbol), symbol);
    });
    assert.deepEqual(Core.parseChordSymbol("A7(b13)").alterations, ["b13"]);
    ["Hello", "H7", "C<script>", "C/", "Cmaj999"].forEach(symbol => {
        assert.equal(Core.parseChordSymbol(symbol), null, symbol);
    });
});

test("transposes roots, slash bass notes, and alterations", () => {
    const examples = [
        ["G", 2, "A", "A"],
        ["Am7", 2, "B", "Bm7"],
        ["Fadd9", 2, "G", "Gadd9"],
        ["G/B", 2, "A", "A/C#"],
        ["F#m7b5", 2, "G#", "G#m7b5"],
        ["Bbmaj7", 2, "C", "Cmaj7"],
        ["A7(b13)", 2, "B", "B7(b13)"]
    ];
    examples.forEach(([symbol, amount, key, expected]) => {
        assert.equal(Core.transposeChord(symbol, amount, key), expected);
    });
    assert.equal(Core.transposeChord("C", 1, "Db"), "Db");
    assert.equal(Core.transposeChord("C", 1, "C#"), "C#");
    assert.equal(Core.transposeChord("Eb/G", 2, "F"), "F/A");
});

test("keeps Unicode logical anchors stable across computed views", () => {
    const source = syntheticSong();
    const anchor = source.sections[0].lines[0].chords[1].anchor;
    const transposed = Core.songForTarget(source, "A");
    const easy = Core.transformSongChords(source, symbol => Core.simplifyChord(symbol, "beginner"));
    const numbers = Core.transformSongChords(source, symbol => Core.chordNumber(symbol, "G", "roman"));
    assert.equal(transposed.sections[0].lines[0].chords[1].anchor, anchor);
    assert.equal(easy.sections[0].lines[0].chords[1].anchor, anchor);
    assert.equal(numbers.sections[0].lines[0].chords[1].anchor, anchor);
    assert.equal(Core.codePoints("中 A，B").length, 5);
});

test("keeps English spaces and punctuation anchored by logical characters", () => {
    const source = Core.createSong({
        originalKey: "C",
        sections: [Core.createSection("Verse", "verse", [
            Core.createLine("Slow dancing, in a room.", [Core.createChord("C", 0), Core.createChord("G/B", 14)], "lyric")
        ])]
    });
    const anchor = source.sections[0].lines[0].chords[1].anchor;
    assert.equal(Core.songForTarget(source, "D").sections[0].lines[0].chords[1].anchor, anchor);
    assert.equal(Core.transformSongChords(source, chord => Core.simplifyChord(chord, "beginner")).sections[0].lines[0].chords[1].anchor, anchor);
    assert.equal(Core.transformSongChords(source, chord => Core.chordNumber(chord, "C", "nashville")).sections[0].lines[0].chords[1].anchor, anchor);
});

test("tokenizes Chinese characters, English words, mixed text, and punctuation", () => {
    const tokens = Core.tokenizeLyric("故事 Slow-dancing， now!");
    assert.deepEqual(tokens.map(token => [token.text, token.kind]), [
        ["故", "cjk"],
        ["事", "cjk"],
        [" ", "space"],
        ["Slow-dancing", "word"],
        ["，", "punctuation"],
        [" ", "space"],
        ["now", "word"],
        ["!", "punctuation"]
    ]);
    assert.equal(Core.resolveAnchorToken("故事 Slow-dancing， now!", 3).text, "Slow-dancing");
    assert.equal(Core.resolveAnchorToken("故事 Slow-dancing， now!", 15).text, "Slow-dancing");
    assert.equal(Core.resolveAnchorToken("故事 Slow-dancing， now!", 16).text, "now");
});

test("lays out long adjacent chords above meaningful tokens without changing song data", () => {
    const line = Core.createLine("我想 sing now", [
        Core.createChord("C#m7b5", 0),
        Core.createChord("Bbmaj9", 1),
        Core.createChord("A7(b13)", 3),
        Core.createChord("G/B", 8)
    ], "lyric", "line-long-chords");
    const snapshot = JSON.stringify(line);
    const layout = Core.layoutLyricLine(line);
    const meaningful = layout.tokens.filter(token => token.meaningful);

    assert.deepEqual(meaningful.map(token => token.text), ["我", "想", "sing", "now"]);
    assert.deepEqual(meaningful.map(token => token.chords.map(chord => chord.symbol)), [
        ["C#m7b5"],
        ["Bbmaj9"],
        ["A7(b13)"],
        ["G/B"]
    ]);
    assert.equal(layout.text, line.text);
    assert.equal(JSON.stringify(line), snapshot);
});

test("keeps token identity stable when chord labels change through transpose", () => {
    const line = Core.createLine("Go home", [Core.createChord("G/B", 3)], "lyric", "line-transpose");
    const sourceToken = Core.layoutLyricLine(line).tokens.find(token => token.chords.length);
    const song = Core.createSong({
        originalKey: "G",
        targetKey: "G",
        sections: [Core.createSection("Verse", "verse", [line], "section-transpose")]
    });
    const transposedLine = Core.songForTarget(song, "A").sections[0].lines[0];
    const transposedToken = Core.layoutLyricLine(transposedLine).tokens.find(token => token.chords.length);

    assert.equal(transposedLine.chords[0].symbol, "A/C#");
    assert.equal(transposedLine.chords[0].anchor, line.chords[0].anchor);
    assert.equal(transposedToken.id, sourceToken.id);
    assert.equal(transposedToken.text, "home");
});

test("inserts a stable empty lyric line without rebuilding existing IDs or anchors", () => {
    const first = Core.createLine("First line", [Core.createChord("C", 0)], "lyric", "line-first");
    const second = Core.createLine("Second line", [Core.createChord("G/B", 7)], "lyric", "line-second");
    const song = Core.createSong({
        id: "song-insert-test",
        sections: [Core.createSection("Verse", "verse", [first, second], "section-insert-test")]
    });
    const canonicalSnapshot = JSON.stringify(song);
    const result = Core.insertLine(song, 0, 1);

    assert.equal(result.index, 1);
    assert.equal(result.line.type, "lyric");
    assert.equal(result.line.text, "");
    assert.equal(result.song.sections[0].lines[0].id, "line-first");
    assert.equal(result.song.sections[0].lines[2].id, "line-second");
    assert.notEqual(result.line.id, "line-first");
    assert.notEqual(result.line.id, "line-second");
    assert.deepEqual(result.song.sections[0].lines[0].chords.map(chord => chord.anchor), [0]);
    assert.deepEqual(result.song.sections[0].lines[2].chords.map(chord => chord.anchor), [7]);
    assert.equal(JSON.stringify(song), canonicalSnapshot);

    const beforeFirst = Core.insertLine(song, 0, 0);
    const beforeFinal = Core.insertLine(song, 0, song.sections[0].lines.length);
    assert.equal(beforeFirst.song.sections[0].lines[1].id, "line-first");
    assert.equal(beforeFinal.song.sections[0].lines.at(-2).id, "line-second");

    const reloaded = Core.deserializeSong(Core.serializeSong(result.song));
    assert.equal(reloaded.sections[0].lines[1].id, result.line.id);
    assert.equal(reloaded.sections[0].lines[1].text, "");
});

test("imports chord lines, lyric lines, sections, and chord-only bars", () => {
    const chart = "[Intro]\n| G | D | Em | C |\n\n[Verse]\nG       D/F#\n測試中文歌詞 第一段";
    const song = Core.parseChordLyrics(chart, { title: "Test Song", originalKey: "G" });
    assert.equal(song.sections[0].type, "intro");
    assert.equal(song.sections[0].lines[0].type, "instrumental");
    assert.deepEqual(song.sections[0].lines[0].chords.map(chord => chord.symbol), ["G", "D", "Em", "C"]);
    assert.equal(song.sections[1].lines[0].text, "測試中文歌詞 第一段");
    assert.deepEqual(song.sections[1].lines[0].chords.map(chord => chord.symbol), ["G", "D/F#"]);
    const prose = Core.parseChordLyrics("Green apples grow here", { title: "Plain text" });
    assert.equal(prose.sections[0].lines[0].text, "Green apples grow here");
    assert.equal(prose.sections[0].lines[0].chords.length, 0);
});

test("recognizes bounded leading metadata in pasted chord charts", () => {
    const source = "Title: Synthetic Song\nArtist: Test Artist\nKey: Bb\nBPM: 96\nTime Signature: 3/4\n\n[Verse]\nBb   F\nSafe test line";
    const song = Core.parseChordLyrics(source);
    assert.equal(song.title, "Synthetic Song");
    assert.equal(song.artist, "Test Artist");
    assert.equal(song.originalKey, "Bb");
    assert.equal(song.bpm, 96);
    assert.equal(song.timeSignature, "3/4");
    assert.equal(song.sections.length, 1);
    assert.equal(song.sections.at(-1).lines[0].text, "Safe test line");
});

test("rejects parser input beyond documented bounds", () => {
    const tooManyLines = Array.from({ length: Core.LIMITS.MAX_LINES + 1 }, () => "C").join("\n");
    assert.throws(() => Core.parseChordLyrics(tooManyLines), /too many lines/);
    assert.throws(() => Core.parseChordPro(tooManyLines), /too many lines/);
    const oversizedSong = Core.createSong({ sections: [] });
    oversizedSong.sections = Array.from({ length: Core.LIMITS.MAX_SECTIONS + 1 }, () => ({ title: "Verse", type: "verse", lines: [] }));
    assert.throws(() => Core.validateSong(oversizedSong), /too many or invalid sections/);
});

test("roundtrips common ChordPro metadata and inline anchors", () => {
    const source = "{title: Test Song}\n{artist: Example}\n{key: G}\n{tempo: 88}\n{time: 6/8}\n\n{start_of_verse: Verse}\n[G]Synthetic [D]line";
    const imported = Core.parseChordPro(source);
    assert.equal(imported.title, "Test Song");
    assert.equal(imported.artist, "Example");
    assert.equal(imported.originalKey, "G");
    assert.equal(imported.bpm, 88);
    assert.equal(imported.timeSignature, "6/8");
    const roundtrip = Core.parseChordPro(Core.toChordPro(imported));
    assert.equal(roundtrip.sections.at(-1).lines[0].text, "Synthetic line");
    assert.deepEqual(roundtrip.sections.at(-1).lines[0].chords.map(chord => chord.symbol), ["G", "D"]);
});

test("computes concert, capo, and shape-key relationships", () => {
    const song = Core.createSong({
        originalKey: "Bb",
        targetKey: "Bb",
        sections: [Core.createSection("Song", "section", [
            Core.createLine("", [Core.createChord("Bb", 0), Core.createChord("F", 1)], "instrumental")
        ])]
    });
    const result = Core.songForCapo(song, 3);
    assert.equal(result.shapeKey, "G");
    assert.deepEqual(result.song.sections[0].lines[0].chords.map(chord => chord.symbol), ["G", "D"]);
});

test("renders Roman and Nashville numbers including non-diatonic roots", () => {
    assert.deepEqual(["G", "D", "Em", "C"].map(chord => Core.chordNumber(chord, "G", "roman")), ["I", "V", "vi", "IV"]);
    assert.deepEqual(["G", "D", "Em", "C"].map(chord => Core.chordNumber(chord, "G", "nashville")), ["1", "5", "6m", "4"]);
    assert.equal(Core.chordNumber("Bb", "C", "roman"), "bVII");
    assert.equal(Core.chordNumber("Fm", "C", "roman"), "iv");
    assert.equal(Core.chordNumber("F#", "C", "roman"), "#IV");
});

test("simplifies conservatively without mutating the canonical song", () => {
    const canonical = syntheticSong();
    const snapshot = JSON.stringify(canonical);
    assert.equal(Core.simplifyChord("Dm9", "balanced"), "Dm7");
    assert.equal(Core.simplifyChord("Bbmaj7", "beginner"), "Bb");
    assert.equal(Core.simplifyChord("Gm11", "balanced"), "Gm7");
    assert.equal(Core.simplifyChord("A7(b13)", "balanced"), "A7(b13)");
    assert.equal(Core.simplifyChord("A7(b13)", "beginner"), "A7");
    assert.equal(Core.simplifyChord("G/B", "balanced"), "G/B");
    assert.equal(Core.simplifyChord("G/B", "beginner"), "G");
    assert.equal(Core.simplifyChord("Bm7b5", "beginner"), "Bm7b5");
    assert.equal(JSON.stringify(canonical), snapshot);
});
