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
                Core.createChord("D/F#", 7)
            ], "lyric")
        ])]
    });
}

test("creates and validates a versioned Song Document", () => {
    const song = syntheticSong();
    const serialized = Core.serializeSong(song);
    const restored = Core.deserializeSong(serialized);
    assert.equal(restored.schema, "jamtrackshub-song");
    assert.equal(restored.version, 2);
    assert.equal(restored.chordSpelling, Core.CHORD_SPELLING.THEORY);
    assert.equal(restored.sections[0].id, song.sections[0].id);
    assert.equal(restored.sections[0].lines[0].id, song.sections[0].lines[0].id);
    assert.throws(() => Core.validateSong({ schema: "wrong", version: 2, sections: [] }));
    assert.throws(() => Core.validateSong({ schema: Core.SCHEMA, version: 1, sections: [] }), /version 2/);
    assert.throws(() => Core.deserializeSong("not-json"), /valid JSON/);
    assert.throws(() => Core.deserializeSong(JSON.stringify({ schema: Core.SCHEMA, version: 1, sections: [] })), /version 2/);
    assert.throws(() => Core.validateSong({
        schema: Core.SCHEMA,
        version: 2,
        sections: [{ title: "Old", type: "section", lines: [{ text: "Old data", type: "lyric", chords: [{ symbol: "C", anchor: 0 }] }] }]
    }), /invalid chord positions/);
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

test("separates canonical pitch identity from theory and preserve-input spelling", () => {
    assert.equal(Core.parseChordSymbol("C#m").rootPitch, Core.parseChordSymbol("Dbm").rootPitch);
    assert.ok(Core.KEY_OPTIONS.minor.includes("C#m"));
    assert.ok(!Core.KEY_OPTIONS.minor.includes("Dbm"));

    const theory = Core.createSong({
        originalKey: "Dbm",
        targetKey: "Dbm",
        chordSpelling: "theory",
        sections: [Core.createSection("Song", "section", [
            Core.createLine("Synthetic line", [Core.createChord("Dbm", 0), Core.createChord("Dbm7", 1)], "lyric")
        ])]
    });
    const theoryView = Core.songForTarget(theory, theory.targetKey);
    assert.equal(theory.originalKey, "C#m");
    assert.equal(theoryView.targetKey, "C#m");
    assert.deepEqual(theoryView.sections[0].lines[0].chords.map(chord => chord.symbol), ["C#m", "C#m7"]);

    const preservedSharp = Core.createSong({
        originalKey: "C#m",
        targetKey: "C#m",
        chordSpelling: "preserve",
        sections: [Core.createSection("Song", "section", [Core.createLine("Test", [Core.createChord("C#m", 0)], "lyric")])]
    });
    const preservedFlat = Core.createSong({
        originalKey: "Db",
        targetKey: "Db",
        chordSpelling: "preserve",
        sections: [Core.createSection("Song", "section", [Core.createLine("Test", [Core.createChord("Db", 0)], "lyric")])]
    });
    assert.equal(Core.songForTarget(preservedSharp, "C#m").sections[0].lines[0].chords[0].symbol, "C#m");
    assert.equal(Core.songForTarget(preservedFlat, "Db").sections[0].lines[0].chords[0].symbol, "Db");
    assert.equal(Core.transposeChord("C#/G#", 0, "C#", "preserve", true), "C#/G#");
    assert.equal(Core.transposeChord("Db/Ab", 0, "Db", "preserve", true), "Db/Ab");
    assert.equal(Core.parseChordSymbol("C#/G#").rootPitch, Core.parseChordSymbol("Db/Ab").rootPitch);
    assert.equal(Core.parseChordSymbol("C#/G#").bassPitch, Core.parseChordSymbol("Db/Ab").bassPitch);
});

test("keeps meaningful anchor positions stable across computed views", () => {
    const source = syntheticSong();
    const anchorPosition = source.sections[0].lines[0].chords[1].anchorPosition;
    const transposed = Core.songForTarget(source, "A");
    const easy = Core.transformSongChords(source, symbol => Core.simplifyChord(symbol, "beginner"));
    const numbers = Core.transformSongChords(source, symbol => Core.chordNumber(symbol, "G", "roman"));
    assert.equal(transposed.sections[0].lines[0].chords[1].anchorPosition, anchorPosition);
    assert.equal(easy.sections[0].lines[0].chords[1].anchorPosition, anchorPosition);
    assert.equal(numbers.sections[0].lines[0].chords[1].anchorPosition, anchorPosition);
    assert.equal(Core.codePoints("中 A，B").length, 5);
});

test("keeps English spaces and punctuation outside the meaningful position index", () => {
    const source = Core.createSong({
        originalKey: "C",
        sections: [Core.createSection("Verse", "verse", [
            Core.createLine("Slow dancing, in a room.", [Core.createChord("C", 0), Core.createChord("G/B", 3)], "lyric")
        ])]
    });
    const anchorPosition = source.sections[0].lines[0].chords[1].anchorPosition;
    assert.equal(Core.songForTarget(source, "D").sections[0].lines[0].chords[1].anchorPosition, anchorPosition);
    assert.equal(Core.transformSongChords(source, chord => Core.simplifyChord(chord, "beginner")).sections[0].lines[0].chords[1].anchorPosition, anchorPosition);
    assert.equal(Core.transformSongChords(source, chord => Core.chordNumber(chord, "C", "nashville")).sections[0].lines[0].chords[1].anchorPosition, anchorPosition);
});

test("tokenizes Chinese characters, English words, mixed text, and punctuation", () => {
    const tokens = Core.tokenizeLyric("故事 Slow-dancing， now!");
    assert.deepEqual(tokens.map(token => [token.text, token.kind]), [
        ["故", "cjk"],
        ["事", "cjk"],
        [" ", "space"],
        ["Slow-dancing，", "word"],
        [" ", "space"],
        ["now!", "word"]
    ]);
    assert.equal(Core.resolveAnchorToken("故事 Slow-dancing， now!", 2).text, "Slow-dancing，");
    assert.equal(Core.resolveAnchorToken("故事 Slow-dancing， now!", 3).text, "now!");
});

test("uses direct meaningful positions for required English, Chinese, and mixed examples", () => {
    const examples = new Map([
        ["slow", 1],
        ["slow dancing", 2],
        ["s l o w", 4],
        ["This is the deep and dying breath of", 8],
        ["slow     dancing", 2],
        ["slow, dancing", 2],
        ["don't stop", 2],
        ["burning-room", 1],
        ["burn ing", 2],
        ["故事", 2],
        ["故事，開始了", 5],
        ["你好 slow dancing", 4]
    ]);
    examples.forEach((expected, source) => assert.equal(Core.meaningfulPositionCount(source), expected, source));

    const exact = "This is the deep and dying breath of";
    assert.deepEqual(
        Core.tokenizeLyric(exact).filter(token => token.meaningful).map(token => token.text),
        ["This", "is", "the", "deep", "and", "dying", "breath", "of"]
    );
    const line = Core.createLine(exact, [Core.createChord("C#m7", 5)], "lyric");
    assert.equal(line.chords[0].anchorPosition, 5);
    assert.equal(Object.prototype.hasOwnProperty.call(line.chords[0], "anchor"), false);
    assert.equal(Core.layoutLyricLine(line).tokens.find(token => token.chords.length).text, "dying");
});

test("lays out long adjacent chords above meaningful tokens without changing song data", () => {
    const line = Core.createLine("我想 sing now", [
        Core.createChord("C#m7b5", 0),
        Core.createChord("Bbmaj9", 1),
        Core.createChord("A7(b13)", 2),
        Core.createChord("G/B", 3)
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
    const line = Core.createLine("Go home", [Core.createChord("G/B", 1)], "lyric", "line-transpose");
    const sourceToken = Core.layoutLyricLine(line).tokens.find(token => token.chords.length);
    const song = Core.createSong({
        originalKey: "G",
        targetKey: "G",
        sections: [Core.createSection("Verse", "verse", [line], "section-transpose")]
    });
    const transposedLine = Core.songForTarget(song, "A").sections[0].lines[0];
    const transposedToken = Core.layoutLyricLine(transposedLine).tokens.find(token => token.chords.length);

    assert.equal(transposedLine.chords[0].symbol, "A/C#");
    assert.equal(transposedLine.chords[0].anchorPosition, line.chords[0].anchorPosition);
    assert.equal(transposedToken.id, sourceToken.id);
    assert.equal(transposedToken.text, "home");
});

test("inserts a stable empty lyric line without rebuilding existing IDs or anchors", () => {
    const first = Core.createLine("First line", [Core.createChord("C", 0)], "lyric", "line-first");
    const second = Core.createLine("Second line", [Core.createChord("G/B", 1)], "lyric", "line-second");
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
    assert.deepEqual(result.song.sections[0].lines[0].chords.map(chord => chord.anchorPosition), [0]);
    assert.deepEqual(result.song.sections[0].lines[2].chords.map(chord => chord.anchorPosition), [1]);
    assert.equal(JSON.stringify(song), canonicalSnapshot);

    const beforeFirst = Core.insertLine(song, 0, 0);
    const beforeFinal = Core.insertLine(song, 0, song.sections[0].lines.length);
    assert.equal(beforeFirst.song.sections[0].lines[1].id, "line-first");
    assert.equal(beforeFinal.song.sections[0].lines.at(-2).id, "line-second");

    const reloaded = Core.deserializeSong(Core.serializeSong(result.song));
    assert.equal(reloaded.sections[0].lines[1].id, result.line.id);
    assert.equal(reloaded.sections[0].lines[1].text, "");
});

test("deletes only the selected line while preserving its section and stable sibling ids", () => {
    const song = Core.createSong({
        sections: [Core.createSection("Verse", "verse", [
            Core.createLine("Line A", [Core.createChord("C", 0)], "lyric", "line-A"),
            Core.createLine("Line B", [Core.createChord("G", 1)], "lyric", "line-B"),
            Core.createLine("Line C", [Core.createChord("Am", 0)], "lyric", "line-C")
        ], "section-stable")]
    });
    const result = Core.deleteLine(song, 0, 1);

    assert.equal(result.line.id, "line-B");
    assert.equal(result.line.chords.length, 1);
    assert.equal(result.song.sections[0].id, "section-stable");
    assert.deepEqual(result.song.sections[0].lines.map(line => line.id), ["line-A", "line-C"]);
    assert.deepEqual(song.sections[0].lines.map(line => line.id), ["line-A", "line-B", "line-C"]);

    const withoutLastLine = Core.deleteLine(Core.createSong({
        sections: [Core.createSection("Empty stays", "section", [Core.createLine("Only", [], "lyric", "line-only")], "section-empty")]
    }), 0, 0).song;
    assert.equal(withoutLastLine.sections.length, 1);
    assert.equal(withoutLastLine.sections[0].id, "section-empty");
    assert.equal(withoutLastLine.sections[0].lines.length, 0);

    const reloaded = Core.deserializeSong(Core.serializeSong(result.song));
    assert.deepEqual(reloaded.sections[0].lines.map(line => line.id), ["line-A", "line-C"]);
});

test("inserts sections at lyric boundaries without rebuilding existing IDs or anchors", () => {
    const first = Core.createLine("First line", [Core.createChord("G", 0)], "lyric", "line-section-first");
    const second = Core.createLine("Second line", [Core.createChord("D/F#", 1)], "lyric", "line-section-second");
    const third = Core.createLine("Third line", [Core.createChord("Em", 1)], "lyric", "line-section-third");
    const outro = Core.createSection("Outro", "outro", [
        Core.createLine("Last line", [Core.createChord("C", 0)], "lyric", "line-outro")
    ], "section-outro");
    const song = Core.createSong({
        id: "song-section-insert",
        sections: [
            Core.createSection("Verse", "verse", [first, second, third], "section-verse"),
            outro
        ]
    });
    const snapshot = JSON.stringify(song);
    const result = Core.insertSectionAtBoundary(song, 0, 2, "Interlude");

    assert.equal(result.sectionIndex, 1);
    assert.equal(result.song.sections[0].id, "section-verse");
    assert.deepEqual(result.song.sections[0].lines.map(line => line.id), ["line-section-first", "line-section-second"]);
    assert.equal(result.song.sections[1].title, "Interlude");
    assert.deepEqual(result.song.sections[1].lines.map(line => line.id), ["line-section-third"]);
    assert.equal(result.song.sections[2].id, "section-outro");
    assert.deepEqual(result.song.sections[1].lines[0].chords.map(chord => chord.anchorPosition), [1]);
    assert.equal(JSON.stringify(song), snapshot);

    const atBeginning = Core.insertSectionAtBoundary(song, 0, 0, "Intro");
    assert.equal(atBeginning.song.sections[1].id, "section-verse");
    assert.equal(atBeginning.song.sections[1].lines[0].id, "line-section-first");
    assert.equal(atBeginning.song.sections[0].lines.length, 1);

    const atEnd = Core.insertSectionAtBoundary(song, 0, 3, "Pre-Chorus");
    assert.equal(atEnd.song.sections[0].id, "section-verse");
    assert.equal(atEnd.song.sections[1].title, "Pre-Chorus");
    assert.equal(atEnd.song.sections[2].id, "section-outro");

    const reloaded = Core.deserializeSong(Core.serializeSong(result.song));
    assert.deepEqual(reloaded.sections.map(section => section.id), result.song.sections.map(section => section.id));
    assert.deepEqual(reloaded.sections[1].lines.map(line => line.id), ["line-section-third"]);
});

test("inserts a bounded instrumental section at the selected section boundary", () => {
    const verse = Core.createSection("Verse", "verse", [
        Core.createLine("Synthetic verse", [Core.createChord("C", 0)], "lyric", "line-verse")
    ], "section-verse");
    const chorus = Core.createSection("Chorus", "chorus", [
        Core.createLine("Synthetic chorus", [Core.createChord("G", 0)], "lyric", "line-chorus")
    ], "section-chorus");
    const song = Core.createSong({ sections: [verse, chorus] });
    const result = Core.insertInstrumentalSectionAtBoundary(song, 0, 1, "Intro", 4);

    assert.equal(result.sectionIndex, 1);
    assert.deepEqual(result.song.sections.map(section => section.title), ["Verse", "Intro", "Chorus"]);
    assert.equal(result.section.type, "instrumental");
    assert.equal(result.section.lines.length, 4);
    result.section.lines.forEach(function(line) {
        assert.equal(line.type, "instrumental");
        assert.equal(line.text, "");
        assert.deepEqual(line.chords, []);
    });
    assert.equal(result.song.sections[0].id, "section-verse");
    assert.equal(result.song.sections[2].id, "section-chorus");
    assert.equal(result.song.sections[0].lines[0].id, "line-verse");
    assert.equal(result.song.sections[2].lines[0].id, "line-chorus");
});

test("splits an internal boundary without rebuilding existing line or chord ids", () => {
    const lines = [
        Core.createLine("One", [Core.createChord("C", 0)], "lyric", "line-one"),
        Core.createLine("Two", [Core.createChord("G/B", 0)], "lyric", "line-two"),
        Core.createLine("Three", [Core.createChord("Am7", 0)], "lyric", "line-three")
    ];
    const song = Core.createSong({
        sections: [Core.createSection("Verse", "verse", lines, "section-verse-split")]
    });
    const result = Core.insertInstrumentalSectionAtBoundary(song, 0, 1, "Solo", 1);

    assert.deepEqual(result.song.sections.map(section => section.title), ["Verse", "Solo", "Verse"]);
    assert.equal(result.song.sections[0].id, "section-verse-split");
    assert.deepEqual(result.song.sections[0].lines.map(line => line.id), ["line-one"]);
    assert.deepEqual(result.song.sections[2].lines.map(line => line.id), ["line-two", "line-three"]);
    assert.equal(result.song.sections[2].lines[0].chords[0].id, lines[1].chords[0].id);
});

test("enforces instrumental bar bounds and preserves the chord-only model through export", () => {
    const empty = Core.createSong({ sections: [] });
    [1, 4, 64].forEach(function(count) {
        const result = Core.insertInstrumentalSectionAtBoundary(empty, 0, 0, "Instrumental", count);
        assert.equal(result.section.lines.length, count);
    });
    [0, -1, 1.5, 65, "many"].forEach(function(count) {
        assert.throws(
            () => Core.insertInstrumentalSectionAtBoundary(empty, 0, 0, "Instrumental", count),
            /1 to 64 bars/
        );
    });

    const created = Core.insertInstrumentalSectionAtBoundary(empty, 0, 0, "Interlude", 2).song;
    created.sections[0].lines[0] = Core.createLine("", [Core.createChord("Am7", 0), Core.createChord("Fadd9", 1)], "instrumental", created.sections[0].lines[0].id);
    created.sections[0].lines[1] = Core.createLine("", [Core.createChord("C", 0), Core.createChord("G/B", 1)], "instrumental", created.sections[0].lines[1].id);
    const jsonRoundtrip = Core.deserializeSong(Core.serializeSong(created));
    assert.deepEqual(jsonRoundtrip.sections[0].lines.map(line => line.type), ["instrumental", "instrumental"]);
    assert.deepEqual(jsonRoundtrip.sections[0].lines.map(line => line.chords.map(chord => chord.symbol)), [["Am7", "Fadd9"], ["C", "G/B"]]);
    assert.match(Core.toChordPro(created), /\[Am7\]\[Fadd9\]/);
    assert.match(Core.toPlainText(created), /Am7  Fadd9/);
    assert.doesNotMatch(Core.toChordPro(created), /placeholder|fake lyric/i);
});

test("applies all derived chord views to instrumental bars without lyric anchors", () => {
    const song = Core.createSong({
        originalKey: "C",
        targetKey: "C",
        sections: [Core.createSection("Solo", "instrumental", [
            Core.createLine("", [Core.createChord("Cmaj9", 0), Core.createChord("G/B", 1)], "instrumental", "bar-derived")
        ], "section-derived")]
    });
    const transposed = Core.songForTarget(song, "D");
    const balanced = Core.transformSongChords(song, chord => Core.simplifyChord(chord, "balanced"));
    const beginner = Core.transformSongChords(song, chord => Core.simplifyChord(chord, "beginner"));
    const roman = Core.transformSongChords(song, chord => Core.chordNumber(chord, "C", "roman"));
    const nashville = Core.transformSongChords(song, chord => Core.chordNumber(chord, "C", "nashville"));

    assert.deepEqual(transposed.sections[0].lines[0].chords.map(chord => chord.symbol), ["Dmaj9", "A/C#"]);
    assert.deepEqual(balanced.sections[0].lines[0].chords.map(chord => chord.symbol), ["Cmaj7", "G/B"]);
    assert.deepEqual(beginner.sections[0].lines[0].chords.map(chord => chord.symbol), ["C", "G"]);
    assert.deepEqual(roman.sections[0].lines[0].chords.map(chord => chord.symbol), ["Imaj9", "V/VII"]);
    assert.deepEqual(nashville.sections[0].lines[0].chords.map(chord => chord.symbol), ["1maj9", "5/7"]);
    [transposed, balanced, beginner, roman, nashville].forEach(function(view) {
        const line = view.sections[0].lines[0];
        assert.equal(line.id, "bar-derived");
        assert.equal(line.type, "instrumental");
        assert.equal(line.text, "");
        assert.deepEqual(line.chords.map(chord => chord.anchorPosition), [0, 1]);
    });
    assert.ok(Core.smartCapo(song, 2).length >= 2);
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

    const aligned = Core.parseChordLyrics("G       D\nThis is a test", { title: "Position mapping" });
    assert.deepEqual(aligned.sections[0].lines[0].chords.map(chord => chord.anchorPosition), [0, 2]);
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

test("maps ChordPro inline markers directly to meaningful position indexes", () => {
    const imported = Core.parseChordPro("[G]This is [D]a test");
    const line = imported.sections[0].lines[0];
    assert.equal(line.text, "This is a test");
    assert.deepEqual(line.chords.map(chord => chord.anchorPosition), [0, 2]);
    assert.deepEqual(
        Core.layoutLyricLine(line).tokens.filter(token => token.chords.length).map(token => token.text),
        ["This", "a"]
    );
    const roundtrip = Core.parseChordPro(Core.toChordPro(imported));
    const roundtripLine = roundtrip.sections.flatMap(section => section.lines).find(item => item.text === "This is a test");
    assert.deepEqual(roundtripLine.chords.map(chord => chord.anchorPosition), [0, 2]);
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
    assert.deepEqual(["Am7", "Fadd9", "G/B"].map(chord => Core.chordNumber(chord, "G", "roman")), ["ii7", "bVIIadd9", "I/III"]);
    assert.deepEqual(["Am7", "Fadd9", "G/B"].map(chord => Core.chordNumber(chord, "G", "nashville")), ["2m7", "b7add9", "1/3"]);
    assert.equal(Core.chordNumber("Bb", "C", "roman"), "bVII");
    assert.equal(Core.chordNumber("Fm", "C", "roman"), "iv");
    assert.equal(Core.chordNumber("F#", "C", "roman"), "#IV");
});

test("renders degree labels on the original lyric anchors without mutating canonical chords", () => {
    const source = Core.createSong({
        originalKey: "G",
        targetKey: "G",
        sections: [Core.createSection("Verse", "verse", [
            Core.createLine("故事的小黃花 從出生那年就飄著", [
                Core.createChord("Am7", 0),
                Core.createChord("Fadd9", 7),
                Core.createChord("G/B", 12)
            ], "lyric", "line-degree-anchors")
        ], "section-degree-anchors")]
    });
    const snapshot = JSON.stringify(source);
    const roman = Core.transformSongChords(source, symbol => Core.chordNumber(symbol, "G", "roman"));
    const nashville = Core.transformSongChords(source, symbol => Core.chordNumber(symbol, "G", "nashville"));
    const romanLine = roman.sections[0].lines[0];
    const nashvilleLine = nashville.sections[0].lines[0];

    assert.deepEqual(romanLine.chords.map(chord => chord.symbol), ["ii7", "bVIIadd9", "I/III"]);
    assert.deepEqual(nashvilleLine.chords.map(chord => chord.symbol), ["2m7", "b7add9", "1/3"]);
    assert.deepEqual(romanLine.chords.map(chord => chord.anchorPosition), [0, 7, 12]);
    assert.deepEqual(nashvilleLine.chords.map(chord => chord.anchorPosition), [0, 7, 12]);
    assert.deepEqual(
        Core.layoutLyricLine(romanLine).tokens.flatMap(token => token.chords.map(chord => chord.symbol)),
        ["ii7", "bVIIadd9", "I/III"]
    );
    assert.deepEqual(
        Core.layoutLyricLine(nashvilleLine).tokens.flatMap(token => token.chords.map(chord => chord.symbol)),
        ["2m7", "b7add9", "1/3"]
    );
    assert.equal(JSON.stringify(source), snapshot);
});

test("keeps Roman and Nashville identities through transpose and capo shape-key views", () => {
    const source = Core.createSong({
        originalKey: "G",
        targetKey: "G",
        sections: [Core.createSection("Song", "section", [
            Core.createLine("", ["G", "D", "Em", "C"].map((symbol, anchor) => Core.createChord(symbol, anchor)), "instrumental")
        ])]
    });
    const transposed = Core.songForTarget(source, "A");
    const transposedSymbols = transposed.sections[0].lines[0].chords.map(chord => chord.symbol);
    assert.deepEqual(transposedSymbols, ["A", "E", "F#m", "D"]);
    assert.deepEqual(transposedSymbols.map(chord => Core.chordNumber(chord, "A", "roman")), ["I", "V", "vi", "IV"]);
    assert.deepEqual(transposedSymbols.map(chord => Core.chordNumber(chord, "A", "nashville")), ["1", "5", "6m", "4"]);

    const capo = Core.songForCapo(transposed, 2);
    const playSymbols = capo.song.sections[0].lines[0].chords.map(chord => chord.symbol);
    assert.equal(capo.shapeKey, "G");
    assert.deepEqual(playSymbols, ["G", "D", "Em", "C"]);
    assert.deepEqual(playSymbols.map(chord => Core.chordNumber(chord, capo.shapeKey, "roman")), ["I", "V", "vi", "IV"]);
    assert.deepEqual(playSymbols.map(chord => Core.chordNumber(chord, capo.shapeKey, "nashville")), ["1", "5", "6m", "4"]);
});

test("fits chord annotations on one row without changing lyric anchor positions", () => {
    const items = [
        { id: "first", left: 0, width: 78 },
        { id: "second", left: 42, width: 68 },
        { id: "third", left: 124, width: 22 },
        { id: "fourth", left: 170, width: 44 }
    ];
    const fitted = Core.fitSingleRowChordAnnotations(items, 8, 0.6);

    assert.deepEqual(fitted.map(item => item.left), [0, 42, 124, 170]);
    assert.deepEqual(fitted.map(item => item.scale), [0.6, 1, 1, 1]);
    assert.ok(fitted.every(item => !("row" in item)));
    assert.deepEqual(items.map(item => item.left), [0, 42, 124, 170]);
});

test("keeps the former Roman collision regression on one annotation row", () => {
    const labels = [
        { symbol: "ii7", left: 0, width: 28 },
        { symbol: "bVIIadd9", left: 42, width: 78 },
        { symbol: "IV", left: 100, width: 22 },
        { symbol: "I/III", left: 170, width: 44 }
    ];
    const fitted = Core.fitSingleRowChordAnnotations(labels, 8, 0.6);

    assert.deepEqual(fitted.map(item => item.symbol), ["ii7", "bVIIadd9", "IV", "I/III"]);
    assert.deepEqual(fitted.map(item => item.left), [0, 42, 100, 170]);
    assert.ok(fitted.every(item => !("row" in item)));
    assert.ok(Math.abs(fitted[1].scale - (50 / 78)) < Number.EPSILON);
    assert.equal(fitted[1].left + (fitted[1].width * fitted[1].scale) + 8, fitted[2].left);
});

test("keeps canonical lyrics, chords, and anchors immutable across display modes", () => {
    const source = Core.createSong({
        originalKey: "G",
        targetKey: "G",
        sections: [Core.createSection("Verse", "verse", [
            Core.createLine("故事的小黃花 從出生那年就飄著", [
                Core.createChord("Am7", 0),
                Core.createChord("Fadd9", 7),
                Core.createChord("C", 10),
                Core.createChord("G/B", 12)
            ], "lyric", "line-mode-layout")
        ], "section-mode-layout")]
    });
    const snapshot = JSON.stringify(source);
    const modes = [
        source,
        Core.transformSongChords(source, symbol => Core.simplifyChord(symbol, "balanced")),
        Core.transformSongChords(source, symbol => Core.simplifyChord(symbol, "beginner")),
        Core.transformSongChords(source, symbol => Core.chordNumber(symbol, "G", "roman")),
        Core.transformSongChords(source, symbol => Core.chordNumber(symbol, "G", "nashville"))
    ];

    modes.forEach(function(song) {
        const line = song.sections[0].lines[0];
        assert.equal(line.text, source.sections[0].lines[0].text);
        assert.deepEqual(line.chords.map(chord => chord.anchorPosition), [0, 7, 10, 12]);
    });
    assert.deepEqual(modes[3].sections[0].lines[0].chords.map(chord => chord.symbol), ["ii7", "bVIIadd9", "IV", "I/III"]);
    assert.deepEqual(modes[4].sections[0].lines[0].chords.map(chord => chord.symbol), ["2m7", "b7add9", "4", "1/3"]);
    assert.equal(JSON.stringify(source), snapshot);
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

test("derives a finite bounded monotonic auto-scroll base from BPM", () => {
    const speeds = [60, 90, 120, 180].map(Core.baseScrollSpeedForBpm);

    assert.deepEqual(speeds, [24, 36, 48, 72]);
    assert.ok(speeds.every(Number.isFinite));
    assert.ok(speeds.every((speed, index) => index === 0 || speed > speeds[index - 1]));
    assert.equal(Core.baseScrollSpeedForBpm(30), Core.AUTO_SCROLL.minPixelsPerSecond);
    assert.equal(Core.baseScrollSpeedForBpm(300), Core.AUTO_SCROLL.maxPixelsPerSecond);
});

test("uses the existing default speed when BPM is empty or invalid", () => {
    [null, undefined, 0, Number.NaN, ""].forEach(value => {
        assert.equal(Core.baseScrollSpeedForBpm(value), Core.AUTO_SCROLL.defaultPixelsPerSecond);
    });
});

test("applies a retained user multiplier with frame-rate-independent elapsed time", () => {
    assert.equal(Core.normalizeScrollSpeedMultiplier(0.25), 0.5);
    assert.equal(Core.normalizeScrollSpeedMultiplier(3), 2);
    assert.equal(Core.normalizeScrollSpeedMultiplier(""), 1);
    assert.equal(Core.effectiveScrollSpeed(120, 1.25), 60);

    const at60Hz = Array.from({ length: 60 }, () => Core.scrollDistanceForElapsed(120, 1.25, 1000 / 60))
        .reduce((total, distance) => total + distance, 0);
    const at120Hz = Array.from({ length: 120 }, () => Core.scrollDistanceForElapsed(120, 1.25, 1000 / 120))
        .reduce((total, distance) => total + distance, 0);

    assert.ok(Math.abs(at60Hz - 60) < 1e-9);
    assert.ok(Math.abs(at120Hz - 60) < 1e-9);
    assert.ok(Math.abs(at60Hz - at120Hz) < 1e-9);
    assert.equal(Core.scrollDistanceForElapsed(120, 1, Number.NaN), 0);
});
