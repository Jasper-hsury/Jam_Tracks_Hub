export const NOTE_NAMES_SHARP = Object.freeze(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]);
export const NOTE_NAMES_FLAT = Object.freeze(["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]);
export const ROOTS = Object.freeze(["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]);
export const TUNING_MIDI = Object.freeze([40, 45, 50, 55, 59, 64]);
export const STRING_NAMES = Object.freeze(["E", "A", "D", "G", "B", "e"]);
export const POSITION_TARGETS = Object.freeze([0, 3, 5, 7, 9, 12]);
export const SHAPES_PER_PAGE = 12;
export const DIAGRAM_FRET_ROWS = 4;

const FLAT_ROOTS = new Set([3, 5, 8, 10]);
const LETTERS = Object.freeze(["C", "D", "E", "F", "G", "A", "B"]);
const NATURAL_PITCHES = Object.freeze({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 });
const MAX_FRET_SPAN = 3;
const voicingCache = new Map();

export const CHORD_CATEGORIES = Object.freeze([
  {
    id: "triads", name: "Triads", description: "Three-note foundations", chords: [
      { id: "major", name: "Major", suffix: "", intervals: [0, 4, 7], formula: ["1", "3", "5"], description: "The basic major triad: stable, open, and resolved." },
      { id: "minor", name: "Minor", suffix: "m", intervals: [0, 3, 7], formula: ["1", "b3", "5"], description: "A minor triad with a darker, more introspective center." },
      { id: "diminished", name: "Diminished", suffix: "dim", intervals: [0, 3, 6], formula: ["1", "b3", "b5"], description: "A tense, symmetrical triad built from two minor thirds." },
      { id: "augmented", name: "Augmented", suffix: "aug", intervals: [0, 4, 8], formula: ["1", "3", "#5"], description: "A bright, unsettled triad with a raised fifth." }
    ]
  },
  {
    id: "seventh", name: "Seventh Chords", description: "Triads with an added seventh", chords: [
      { id: "dominant7", name: "Dominant 7", suffix: "7", intervals: [0, 4, 7, 10], formula: ["1", "3", "5", "b7"], description: "A major triad with a flat seventh, carrying strong dominant tension." },
      { id: "major7", name: "Major 7", suffix: "maj7", intervals: [0, 4, 7, 11], formula: ["1", "3", "5", "7"], description: "A smooth major color with a warm, floating natural seventh." },
      { id: "minor7", name: "Minor 7", suffix: "m7", intervals: [0, 3, 7, 10], formula: ["1", "b3", "5", "b7"], description: "A relaxed minor sound common in soul, jazz, funk, and pop." },
      { id: "minorMajor7", name: "Minor Major 7", suffix: "m(maj7)", intervals: [0, 3, 7, 11], formula: ["1", "b3", "5", "7"], description: "A minor triad with a dramatic natural seventh." },
      { id: "diminished7", name: "Diminished 7", suffix: "dim7", intervals: [0, 3, 6, 9], formula: ["1", "b3", "b5", "bb7"], description: "A fully symmetrical diminished chord with intense movement." },
      { id: "halfDiminished7", name: "Half-Diminished 7", suffix: "m7b5", intervals: [0, 3, 6, 10], formula: ["1", "b3", "b5", "b7"], description: "A diminished triad with a minor seventh, often used in minor-key harmony." }
    ]
  },
  {
    id: "sixth-added", name: "Sixth & Added Tone", description: "Color without a dominant seventh", chords: [
      { id: "sixth", name: "Major 6", suffix: "6", intervals: [0, 4, 7, 9], formula: ["1", "3", "5", "6"], description: "A major triad colored by a sweet, consonant sixth." },
      { id: "minor6", name: "Minor 6", suffix: "m6", intervals: [0, 3, 7, 9], formula: ["1", "b3", "5", "6"], description: "A minor chord with a sophisticated natural sixth." },
      { id: "add9", name: "Add 9", suffix: "add9", intervals: [0, 2, 4, 7], formula: ["1", "2", "3", "5"], description: "A major triad with an added ninth and no seventh." },
      { id: "minorAdd9", name: "Minor Add 9", suffix: "m(add9)", intervals: [0, 2, 3, 7], formula: ["1", "2", "b3", "5"], description: "A minor triad with a spacious added ninth." },
      { id: "sixNine", name: "6 / 9", suffix: "6/9", intervals: [0, 2, 4, 7, 9], formula: ["1", "2", "3", "5", "6"], description: "A polished major sound combining the sixth and ninth." }
    ]
  },
  {
    id: "extended", name: "Extended Chords", description: "Ninths, elevenths, and thirteenths", chords: [
      { id: "ninth", name: "Dominant 9", suffix: "9", intervals: [0, 2, 4, 7, 10], formula: ["1", "3", "5", "b7", "9"], description: "A dominant seventh expanded with a colorful ninth." },
      { id: "major9", name: "Major 9", suffix: "maj9", intervals: [0, 2, 4, 7, 11], formula: ["1", "3", "5", "7", "9"], description: "A lush major seventh with an added ninth." },
      { id: "minor9", name: "Minor 9", suffix: "m9", intervals: [0, 2, 3, 7, 10], formula: ["1", "b3", "5", "b7", "9"], description: "A broad, mellow minor seventh with an added ninth." },
      { id: "eleventh", name: "Dominant 11", suffix: "11", intervals: [0, 2, 4, 5, 7, 10], formula: ["1", "3", "5", "b7", "9", "11"], description: "A dense dominant sound extending through the eleventh." },
      { id: "minor11", name: "Minor 11", suffix: "m11", intervals: [0, 2, 3, 5, 7, 10], formula: ["1", "b3", "5", "b7", "9", "11"], description: "An expansive minor sound often voiced without every chord tone." },
      { id: "thirteenth", name: "Dominant 13", suffix: "13", intervals: [0, 2, 4, 7, 9, 10], formula: ["1", "3", "5", "b7", "9", "13"], description: "A rich dominant chord whose characteristic color is the thirteenth." },
      { id: "major13", name: "Major 13", suffix: "maj13", intervals: [0, 2, 4, 7, 9, 11], formula: ["1", "3", "5", "7", "9", "13"], description: "A wide major color combining the natural seventh, ninth, and thirteenth." },
      { id: "minor13", name: "Minor 13", suffix: "m13", intervals: [0, 2, 3, 7, 9, 10], formula: ["1", "b3", "5", "b7", "9", "13"], description: "A soulful minor extension with a natural thirteenth." }
    ]
  },
  {
    id: "suspended-power", name: "Suspended & Power", description: "Open harmony and neutral thirds", chords: [
      { id: "sus2", name: "Suspended 2", suffix: "sus2", intervals: [0, 2, 7], formula: ["1", "2", "5"], description: "The third is replaced by the second for an open, unresolved sound." },
      { id: "sus4", name: "Suspended 4", suffix: "sus4", intervals: [0, 5, 7], formula: ["1", "4", "5"], description: "The third is replaced by the fourth, creating a classic suspension." },
      { id: "sevenSus4", name: "7 Sus 4", suffix: "7sus4", intervals: [0, 5, 7, 10], formula: ["1", "4", "5", "b7"], description: "A dominant seventh chord with the third suspended to the fourth." },
      { id: "power", name: "Power Chord", suffix: "5", intervals: [0, 7], formula: ["1", "5"], description: "Root and fifth only: direct, neutral, and ideal for distorted guitar." }
    ]
  },
  {
    id: "altered", name: "Altered Dominant", description: "Dominant tension with changed chord tones", chords: [
      { id: "sevenFlat5", name: "7 Flat 5", suffix: "7b5", intervals: [0, 4, 6, 10], formula: ["1", "3", "b5", "b7"], description: "A dominant seventh with a lowered fifth." },
      { id: "sevenSharp5", name: "7 Sharp 5", suffix: "7#5", intervals: [0, 4, 8, 10], formula: ["1", "3", "#5", "b7"], description: "A dominant seventh with a raised fifth." },
      { id: "sevenFlat9", name: "7 Flat 9", suffix: "7b9", intervals: [0, 1, 4, 7, 10], formula: ["1", "b9", "3", "5", "b7"], description: "A dominant seventh with a tense flat ninth." },
      { id: "sevenSharp9", name: "7 Sharp 9", suffix: "7#9", intervals: [0, 3, 4, 7, 10], formula: ["1", "#9", "3", "5", "b7"], description: "A dominant sound combining major and minor-third colors." },
      { id: "nineSus4", name: "9 Sus 4", suffix: "9sus4", intervals: [0, 2, 5, 7, 10], formula: ["1", "9", "4", "5", "b7"], description: "A dominant ninth with the third replaced by the fourth." },
      { id: "thirteenFlat9", name: "13 Flat 9", suffix: "13b9", intervals: [0, 1, 4, 7, 9, 10], formula: ["1", "b9", "3", "5", "13", "b7"], description: "A dense altered dominant combining a flat ninth and natural thirteenth." }
    ]
  }
].map(category => Object.freeze({
  ...category,
  chords: Object.freeze(category.chords.map(chord => Object.freeze({
    ...chord,
    intervals: Object.freeze(chord.intervals),
    formula: Object.freeze(chord.formula)
  })))
})));

export const CHORDS = Object.freeze(CHORD_CATEGORIES.flatMap(category =>
  category.chords.map(chord => Object.freeze({ ...chord, categoryId: category.id, categoryName: category.name }))
));

export function noteNames(rootPitch) {
  return FLAT_ROOTS.has(Number(rootPitch)) ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
}

export function rootName(rootPitch) {
  return noteNames(rootPitch)[Number(rootPitch)];
}

export function pitchFromName(noteName) {
  const pitchMap = {
    c: 0, "b#": 0, "c#": 1, db: 1, d: 2, "d#": 3, eb: 3,
    e: 4, fb: 4, "e#": 5, f: 5, "f#": 6, gb: 6, g: 7,
    "g#": 8, ab: 8, a: 9, "a#": 10, bb: 10, b: 11, cb: 11
  };
  return pitchMap[String(noteName || "").trim().toLowerCase()] ?? null;
}

export function chordDisplayName(rootPitch, chord) {
  if (chord.id === "major") return `${rootName(rootPitch)} major`;
  if (chord.id === "minor") return `${rootName(rootPitch)} minor`;
  return `${rootName(rootPitch)} ${chord.name}`;
}

export function chordSymbolText(rootPitch, chord) {
  return `${rootName(rootPitch)}${chord.suffix}`;
}

export function chordPitchClasses(rootPitch, chord) {
  return chord.intervals.map(interval => (Number(rootPitch) + interval) % 12);
}

export function spellChordTone(rootPitch, pitch, formula, index) {
  if (index === 0) return rootName(rootPitch);
  const degreeMatch = String(formula || "").match(/\d+/);
  if (!degreeMatch) return noteNames(rootPitch)[pitch];
  const rootLetterIndex = LETTERS.indexOf(rootName(rootPitch)[0]);
  const targetLetter = LETTERS[(rootLetterIndex + (Number(degreeMatch[0]) - 1) % 7) % 7];
  let accidentalDistance = (pitch - NATURAL_PITCHES[targetLetter] + 12) % 12;
  if (accidentalDistance > 6) accidentalDistance -= 12;
  if (Math.abs(accidentalDistance) > 1) return noteNames(rootPitch)[pitch];
  if (accidentalDistance > 0) return `${targetLetter}${"#".repeat(accidentalDistance)}`;
  if (accidentalDistance < 0) return `${targetLetter}${"b".repeat(Math.abs(accidentalDistance))}`;
  return targetLetter;
}

export function chordNoteNames(rootPitch, chord) {
  return chordPitchClasses(rootPitch, chord).map((pitch, index) =>
    spellChordTone(rootPitch, pitch, chord.formula[index], index)
  );
}

export function chordIdFromSuffix(suffix) {
  const compact = String(suffix || "").replace(/[\s_-]/g, "");
  const lower = compact.toLowerCase();
  if (!compact || compact === "M") return "major";
  if (["M7", "Maj7", "MAJ7", "Δ7", "△7"].includes(compact)) return "major7";
  const aliases = {
    maj: "major", major: "major", m: "minor", min: "minor", "-": "minor",
    dim: "diminished", o: "diminished", aug: "augmented", "+": "augmented",
    7: "dominant7", dom7: "dominant7", maj7: "major7", major7: "major7", ma7: "major7",
    m7: "minor7", min7: "minor7", "-7": "minor7", mmaj7: "minorMajor7",
    "m(maj7)": "minorMajor7", mmajor7: "minorMajor7", minmaj7: "minorMajor7",
    dim7: "diminished7", o7: "diminished7", m7b5: "halfDiminished7", "ø": "halfDiminished7",
    "ø7": "halfDiminished7", halfdim7: "halfDiminished7", 6: "sixth", m6: "minor6",
    min6: "minor6", add9: "add9", madd9: "minorAdd9", "m(add9)": "minorAdd9",
    minadd9: "minorAdd9", "6/9": "sixNine", 69: "sixNine", 9: "ninth", maj9: "major9",
    major9: "major9", m9: "minor9", min9: "minor9", 11: "eleventh", m11: "minor11",
    min11: "minor11", 13: "thirteenth", maj13: "major13", major13: "major13",
    m13: "minor13", min13: "minor13", sus2: "sus2", sus4: "sus4", "7sus4": "sevenSus4",
    sus47: "sevenSus4", 5: "power", "7b5": "sevenFlat5", "7#5": "sevenSharp5",
    "7b9": "sevenFlat9", "7#9": "sevenSharp9", "9sus4": "nineSus4", "13b9": "thirteenFlat9"
  };
  return aliases[lower] || null;
}

export function parseChordSymbolInput(value) {
  const raw = String(value || "").trim();
  if (!raw || /\s/.test(raw)) return null;
  const match = raw.match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!match) return null;
  const pitch = pitchFromName(`${match[1].toUpperCase()}${match[2] || ""}`);
  const chordId = chordIdFromSuffix(match[3]);
  const chord = CHORDS.find(item => item.id === chordId);
  return pitch === null || !chord ? null : { pitch, chord };
}

export function intervalLabel(formula) {
  return formula === "1" ? "R" : formula;
}

export function toneFamily(formula) {
  const compact = String(formula || "").replace(/\s+/g, "");
  if (compact === "1") return "root";
  if (["3", "b3", "#9"].includes(compact)) return "third";
  if (["5", "b5", "#5"].includes(compact)) return "fifth";
  if (["7", "b7", "bb7"].includes(compact)) return "seventh";
  return "extension";
}

export function chordToneForPitch(rootPitch, pitch, chord) {
  const pitchClass = ((pitch % 12) + 12) % 12;
  const index = chord.intervals.findIndex(interval => (Number(rootPitch) + interval) % 12 === pitchClass);
  if (index === -1) return null;
  return {
    formula: chord.formula[index],
    label: intervalLabel(chord.formula[index]),
    note: spellChordTone(rootPitch, pitchClass, chord.formula[index], index),
    isRoot: index === 0,
    family: toneFamily(chord.formula[index]),
    order: index
  };
}

function stringOptionsForWindow(chordPitches, startFret, endFret) {
  return TUNING_MIDI.map(openMidi => {
    const options = [-1];
    if (startFret === 0 && chordPitches.includes(openMidi % 12)) options.push(0);
    for (let fret = Math.max(1, startFret); fret <= endFret; fret += 1) {
      if (chordPitches.includes((openMidi + fret) % 12)) options.push(fret);
    }
    return options;
  });
}

function scoreVoicing(rootPitch, frets, chord) {
  const sounding = frets.map((fret, index) => ({ fret, index })).filter(item => item.fret >= 0);
  if (sounding.length < 3) return null;
  const firstString = sounding[0].index;
  const lastString = sounding[sounding.length - 1].index;
  for (let index = firstString; index <= lastString; index += 1) {
    if (frets[index] < 0) return null;
  }
  const pitches = sounding.map(item => (TUNING_MIDI[item.index] + item.fret) % 12);
  const uniquePitches = new Set(pitches);
  const targetPitches = chordPitchClasses(rootPitch, chord);
  const coverage = targetPitches.filter(pitch => uniquePitches.has(pitch)).length;
  if (!uniquePitches.has(Number(rootPitch)) || coverage < Math.min(targetPitches.length, 4)) return null;
  const fretted = sounding.map(item => item.fret).filter(fret => fret > 0);
  const minimumFret = fretted.length ? Math.min(...fretted) : 0;
  const maximumFret = fretted.length ? Math.max(...fretted) : 0;
  const span = maximumFret - minimumFret;
  if (span > MAX_FRET_SPAN) return null;
  const rootInBass = pitches[0] === Number(rootPitch);
  const openStrings = sounding.filter(item => item.fret === 0).length;
  const mutedStrings = 6 - sounding.length;
  const repeatedNotes = sounding.length - uniquePitches.size;
  const averageFret = fretted.length ? fretted.reduce((sum, fret) => sum + fret, 0) / fretted.length : 0;
  return coverage * 24 + (coverage === targetPitches.length ? 18 : 0) + (rootInBass ? 22 : 0)
    + sounding.length * 3 + openStrings * 4 - span * 4 - averageFret * 0.8 - mutedStrings * 2 - repeatedNotes;
}

export function generateVoicings(rootPitch, chord) {
  const cacheKey = `${rootPitch}:${chord.id}`;
  if (voicingCache.has(cacheKey)) return voicingCache.get(cacheKey);
  const chordPitches = chordPitchClasses(rootPitch, chord);
  const candidates = [];
  const seen = new Set();
  for (let startFret = 0; startFret <= POSITION_TARGETS.at(-1); startFret += 1) {
    const options = stringOptionsForWindow(chordPitches, startFret, startFret + MAX_FRET_SPAN);
    const current = Array(6).fill(-1);
    (function search(stringIndex) {
      if (stringIndex === 6) {
        const key = current.join(",");
        if (seen.has(key)) return;
        seen.add(key);
        const score = scoreVoicing(rootPitch, current, chord);
        if (score !== null) candidates.push(Object.freeze({ frets: Object.freeze([...current]), score }));
        return;
      }
      options[stringIndex].forEach(fret => {
        current[stringIndex] = fret;
        search(stringIndex + 1);
      });
    })(0);
  }
  candidates.sort((a, b) => b.score - a.score);
  const result = Object.freeze(candidates);
  voicingCache.set(cacheKey, result);
  return result;
}

export function nearestPositionTarget(frets) {
  const position = frets.includes(0) ? 0 : Math.min(...frets.filter(fret => fret > 0));
  return POSITION_TARGETS.reduce((closest, target) =>
    Math.abs(target - position) < Math.abs(closest - position) ? target : closest
  , POSITION_TARGETS[0]);
}

export function rootStringLabel(rootString) {
  return ({ "6": "6th string", "5": "5th string", "4": "4th string", "3": "3rd string", "2": "2nd string", "1": "1st string" })[String(rootString)] || "any root string";
}

export function voicingHasRootOnString(rootPitch, chord, frets, rootString) {
  if (rootString === "all") return true;
  const stringIndex = 6 - Number(rootString);
  const fret = frets[stringIndex];
  return fret >= 0 && Boolean(chordToneForPitch(rootPitch, TUNING_MIDI[stringIndex] + fret, chord)?.isRoot);
}

export function triadStringSetRange(triadSet) {
  const ranges = {
    "top-three": { mutedBefore: 3, activeFrom: 3, label: "1-3 triads", allowedRootStrings: ["1", "2", "3"], chordTypes: "triads" },
    "top-four": { mutedBefore: 2, activeFrom: 2, label: "1-4 triads / 7ths", allowedRootStrings: ["1", "2", "3", "4"], chordTypes: "triads-sevenths" },
    "top-five": { mutedBefore: 1, activeFrom: 1, label: "1-5 triads / 7ths", allowedRootStrings: ["1", "2", "3", "4", "5"], chordTypes: "triads-sevenths" }
  };
  return ranges[triadSet] || null;
}

function isTriad(chord) {
  return chord.categoryId === "triads" && chord.intervals.length === 3;
}

function isSeventhChord(chord) {
  return chord.intervals.length === 4 && chord.formula.some(interval => ["7", "b7", "bb7"].includes(interval));
}

export function chordAllowedForStringSet(chord, triadSet) {
  const range = triadStringSetRange(triadSet);
  if (!range) return true;
  if (range.chordTypes === "triads") return isTriad(chord);
  return range.chordTypes === "triads-sevenths" ? isTriad(chord) || isSeventhChord(chord) : true;
}

export function isTopStringSetTriadVoicing(frets, triadSet) {
  const range = triadStringSetRange(triadSet);
  return !range || (frets.slice(0, range.mutedBefore).every(fret => fret < 0)
    && frets.slice(range.activeFrom).every(fret => fret >= 0));
}

export function filterVoicings({ rootPitch, chord, voicings, position = "all", rootString = "all", triadSet = "all" }) {
  return voicings.filter(voicing => {
    const matchesPosition = position === "all" || nearestPositionTarget(voicing.frets) === Number(position);
    const matchesRootString = voicingHasRootOnString(rootPitch, chord, voicing.frets, rootString);
    const matchesStringSet = triadSet === "all" || (chordAllowedForStringSet(chord, triadSet)
      && isTopStringSetTriadVoicing(voicing.frets, triadSet));
    return matchesPosition && matchesRootString && matchesStringSet;
  });
}

export function diagramBaseFret(frets) {
  const positive = frets.filter(fret => fret > 0);
  return !positive.length || Math.max(...positive) <= DIAGRAM_FRET_ROWS ? 1 : Math.min(...positive);
}

export function buildDiagramModel(rootPitch, chord, voicing, index) {
  const baseFret = diagramBaseFret(voicing.frets);
  const strings = voicing.frets.map((fret, stringIndex) => ({
    fret,
    name: STRING_NAMES[stringIndex],
    tone: fret < 0 ? null : chordToneForPitch(rootPitch, TUNING_MIDI[stringIndex] + fret, chord)
  }));
  const toneDescriptions = strings.filter(string => string.fret >= 0 && string.tone).map(string =>
    `${string.name} string ${string.fret === 0 ? "open" : `fret ${string.fret}`}: ${string.tone.label} ${string.tone.note}`
  ).join("; ");
  return {
    baseFret,
    index,
    strings,
    symbol: chordSymbolText(rootPitch, chord),
    toneDescriptions
  };
}

export function visibleChordCategories(search) {
  const parsed = parseChordSymbolInput(search);
  const query = parsed ? "" : String(search || "").trim().toLowerCase();
  return CHORD_CATEGORIES.map(category => ({
    ...category,
    chords: category.chords.filter(chord => !query || [
      chord.name, chord.suffix, chord.formula.join(" "), chord.description
    ].join(" ").toLowerCase().includes(query))
  })).filter(category => category.chords.length);
}

export function relatedScaleType(chord) {
  if (chord.id.includes("minor") || chord.id.includes("diminished") || chord.id === "halfDiminished7") return "natural-minor";
  if (chord.id.includes("dominant") || chord.id === "thirteenth" || chord.id === "nine" || chord.id === "eleven") return "mixolydian";
  return "major";
}

export function relatedToolUrls(rootPitch, chord) {
  const root = encodeURIComponent(rootName(rootPitch));
  const scaleType = relatedScaleType(chord);
  const keyMode = scaleType === "natural-minor" ? "minor" : "major";
  return {
    scale: `scale.html?root=${root}&type=${scaleType}`,
    progressions: `chord-progressions.html?key=${encodeURIComponent(`${rootName(rootPitch)} ${keyMode}`)}`,
    fretboard: "fretboard-trainer.html"
  };
}

export function initialChordDictionaryState(search = "") {
  const params = new URLSearchParams(search);
  let rootPitch = 0;
  let chord = CHORDS[0];
  const requestedRoot = params.get("root");
  const requestedChord = params.get("chord");
  if (requestedRoot) {
    const pitch = pitchFromName(requestedRoot);
    if (pitch !== null) rootPitch = pitch;
  }
  if (requestedChord) {
    const normalized = requestedChord.trim().toLowerCase();
    chord = CHORDS.find(item => item.id.toLowerCase() === normalized
      || item.suffix.toLowerCase() === normalized
      || item.name.toLowerCase().replace(/\s+/g, "-") === normalized) || chord;
  }
  return { rootPitch, chordId: chord.id };
}
