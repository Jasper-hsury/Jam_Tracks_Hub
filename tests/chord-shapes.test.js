const test = require("node:test");
const assert = require("node:assert/strict");
const Shapes = require("../scripts/chord-shapes.js");

test("parses the workspace chord-shape regression set", () => {
    const symbols = ["C", "Am7", "Fadd9", "G/B", "C#m7b5", "Bbmaj9", "A7(b13)", "F#sus4"];
    symbols.forEach(symbol => {
        const parsed = Shapes.parseChord(symbol);
        assert.ok(parsed, symbol);
        assert.equal(Shapes.normalizeChord(symbol), parsed.symbol);
        assert.ok(Shapes.generateVoicings(parsed).length > 0, symbol);
    });
    assert.equal(Shapes.parseChord("H7"), null);
    assert.equal(Shapes.parseChord("C<script>"), null);
});

test("keeps slash-chord bass notes in the lowest sounding voice", () => {
    const parsed = Shapes.parseChord("G/B");
    const voicings = Shapes.generateVoicings(parsed);
    assert.ok(voicings.length > 0);
    voicings.forEach(voicing => {
        const lowestString = voicing.frets.findIndex(fret => fret >= 0);
        const lowestPitch = (Shapes.TUNING_MIDI[lowestString] + voicing.frets[lowestString]) % 12;
        assert.equal(lowestPitch, parsed.bassPitch);
    });
});

test("returns defensive copies from the memoized voicing cache", () => {
    const first = Shapes.generateVoicings("Cmaj9");
    const expected = [...first[0].frets];
    first[0].frets[0] = 99;
    first[0].score = -1;
    const second = Shapes.generateVoicings("Cmaj9");

    assert.deepEqual(second[0].frets, expected);
    assert.notEqual(second[0].score, -1);
});

test("builds a compact diagram model without presentation metadata", () => {
    const parsed = Shapes.parseChord("F#sus4");
    const voicing = Shapes.generateVoicings(parsed)[0];
    const model = Shapes.diagramModel(parsed, voicing);

    assert.equal(model.symbol, "F#sus4");
    assert.equal(model.strings.length, 6);
    assert.ok(model.strings.some(string => string.tone?.isRoot));
    assert.equal(Object.prototype.hasOwnProperty.call(model, "shapeIndex"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(model, "rankingScore"), false);
});
