const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const DEGREES = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 2, 11: 5, 13: 9 };
const semitones = label => {
  const match = String(label === "R" ? "1" : label).match(/^(bb|b|#)?(\d+)$/);
  const shift = match[1] === "bb" ? -2 : match[1] === "b" ? -1 : match[1] === "#" ? 1 : 0;
  return (DEGREES[match[2]] + shift + 12) % 12;
};

test("Chord Dictionary labels every chord tone with its own interval and lists notes in formula order", async () => {
  const { CHORDS, chordNoteNames, chordToneForPitch } = await import(path.join(root, "src/music/chordDictionary.mjs"));
  for (const chord of CHORDS) {
    for (const interval of chord.intervals) {
      const tone = chordToneForPitch(9, 57 + interval, chord);
      assert.equal(semitones(tone.label), interval % 12, `A${chord.suffix} tone ${interval} is labelled ${tone.label}`);
    }
    assert.equal(chordNoteNames(9, chord).length, chord.formula.length);
  }
  const ninth = CHORDS.find(chord => chord.id === "ninth");
  assert.deepEqual(chordNoteNames(9, ninth), ["A", "C#", "E", "G", "B"]);
  const thirteenth = CHORDS.find(chord => chord.id === "thirteenth");
  assert.deepEqual(chordNoteNames(8, thirteenth), ["Ab", "C", "Eb", "Gb", "Bb", "F"]);
});

test("the shared chord-shape engine labels 9, 11 and 13 chords correctly on every diagram", () => {
  const context = { window: {}, globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(read("scripts/chord-shapes.js"), context);
  const Shapes = context.window.JamChordShapes || context.JamChordShapes;
  for (const symbol of ["A9", "Amaj9", "Am9", "A11", "Am11", "A13", "Amaj13", "Am13", "A7#9", "A7b9", "Adim7", "A6/9", "Aadd9"]) {
    const parsed = Shapes.parseChord(symbol);
    for (const interval of parsed.chord.intervals) {
      const tone = Shapes.chordToneForPitch(57 + interval, parsed);
      assert.equal(semitones(tone.label), interval % 12, `${symbol} tone ${interval} is labelled ${tone.label}`);
    }
  }
  const a9 = Shapes.parseChord("A9");
  assert.deepEqual([61, 59, 67].map(pitch => Shapes.chordToneForPitch(pitch, a9).label), ["3", "9", "b7"]);
});
