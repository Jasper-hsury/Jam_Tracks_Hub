export const KEY_DEFINITIONS = Object.freeze([
  { majorLabel: "C", majorKey: "C major", majorNotes: ["C", "D", "E", "F", "G", "A", "B"], minorLabel: "Cm", minorKey: "C minor", minorNotes: ["C", "D", "Eb", "F", "G", "Ab", "Bb"] },
  { majorLabel: "Db", majorKey: "Db major", majorNotes: ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"], minorLabel: "C#m", minorKey: "C# minor", minorNotes: ["C#", "D#", "E", "F#", "G#", "A", "B"] },
  { majorLabel: "D", majorKey: "D major", majorNotes: ["D", "E", "F#", "G", "A", "B", "C#"], minorLabel: "Dm", minorKey: "D minor", minorNotes: ["D", "E", "F", "G", "A", "Bb", "C"] },
  { majorLabel: "Eb", majorKey: "Eb major", majorNotes: ["Eb", "F", "G", "Ab", "Bb", "C", "D"], minorLabel: "Ebm", minorKey: "Eb minor", minorNotes: ["Eb", "F", "Gb", "Ab", "Bb", "Cb", "Db"] },
  { majorLabel: "E", majorKey: "E major", majorNotes: ["E", "F#", "G#", "A", "B", "C#", "D#"], minorLabel: "Em", minorKey: "E minor", minorNotes: ["E", "F#", "G", "A", "B", "C", "D"] },
  { majorLabel: "F", majorKey: "F major", majorNotes: ["F", "G", "A", "Bb", "C", "D", "E"], minorLabel: "Fm", minorKey: "F minor", minorNotes: ["F", "G", "Ab", "Bb", "C", "Db", "Eb"] },
  { majorLabel: "Gb", majorKey: "Gb major", majorNotes: ["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F"], minorLabel: "F#m", minorKey: "F# minor", minorNotes: ["F#", "G#", "A", "B", "C#", "D", "E"] },
  { majorLabel: "G", majorKey: "G major", majorNotes: ["G", "A", "B", "C", "D", "E", "F#"], minorLabel: "Gm", minorKey: "G minor", minorNotes: ["G", "A", "Bb", "C", "D", "Eb", "F"] },
  { majorLabel: "Ab", majorKey: "Ab major", majorNotes: ["Ab", "Bb", "C", "Db", "Eb", "F", "G"], minorLabel: "Abm", minorKey: "Ab minor", minorNotes: ["Ab", "Bb", "Cb", "Db", "Eb", "Fb", "Gb"] },
  { majorLabel: "A", majorKey: "A major", majorNotes: ["A", "B", "C#", "D", "E", "F#", "G#"], minorLabel: "Am", minorKey: "A minor", minorNotes: ["A", "B", "C", "D", "E", "F", "G"] },
  { majorLabel: "Bb", majorKey: "Bb major", majorNotes: ["Bb", "C", "D", "Eb", "F", "G", "A"], minorLabel: "Bbm", minorKey: "Bb minor", minorNotes: ["Bb", "C", "Db", "Eb", "F", "Gb", "Ab"] },
  { majorLabel: "B", majorKey: "B major", majorNotes: ["B", "C#", "D#", "E", "F#", "G#", "A#"], minorLabel: "Bm", minorKey: "B minor", minorNotes: ["B", "C#", "D", "E", "F#", "G", "A"] }
].map(definition => Object.freeze({
  ...definition,
  majorNotes: Object.freeze(definition.majorNotes),
  minorNotes: Object.freeze(definition.minorNotes)
})));

export const MAJOR_PROGRESSIONS = Object.freeze([
  { numerals: ["I", "V", "vi", "IV"], style: "Pop / Rock / Worship", category: "Pop staples", description: "A direct four-chord loop for modern songs and big choruses." },
  { numerals: ["vi", "IV", "I", "V"], style: "Emotional Pop", category: "Pop staples", description: "Starts on the relative minor for a more wistful version of the pop loop." },
  { numerals: ["I", "vi", "IV", "V"], style: "50s Progression / Ballad", category: "Pop staples", description: "Classic circular movement for ballads, oldies, and gentle songwriting." },
  { numerals: ["I", "IV", "V", "I"], style: "Classic / Folk Foundation", category: "Songwriting basics", description: "The plain-language foundation for folk, rock, country, and simple melodies." },
  { numerals: ["I", "I", "I", "I", "IV", "IV", "I", "I", "V", "IV", "I", "V"], style: "12 Bar Blues", category: "12 bar blues", description: "Twelve-bar form with the turnaround on the last bar." },
  { numerals: ["ii", "V", "I"], style: "Jazz / Smooth Turnaround", category: "Jazz essentials", description: "The core jazz cadence. Aim melodic lines toward the third and seventh of each chord." },
  { numerals: ["I", "vi", "ii", "V"], style: "Jazz / Pop Turnaround", category: "Jazz essentials", description: "A warm loop that can sound old-school, jazz-pop, or city-pop." },
  { numerals: ["I", "iii", "vi", "ii", "V"], style: "Neo Soul / Jazz", category: "Neo soul / jazz colors", description: "A smooth chain of diatonic movement that works well with seventh chords." },
  { numerals: ["IV", "iii", "vi", "ii", "V", "I"], style: "Neo Soul / R&B Resolution", category: "Neo soul / jazz colors", description: "Starts away from home, then gradually pulls the harmony back to I." }
].map(progression => Object.freeze({ ...progression, numerals: Object.freeze(progression.numerals) })));

export const MINOR_PROGRESSIONS = Object.freeze([
  { numerals: ["i", "VI", "III", "VII"], style: "Emotional / Pop Rock", category: "Minor pop staples", description: "A strong minor-key loop for emotional rock, pop, and cinematic writing." },
  { numerals: ["i", "VII", "VI", "VII"], style: "Rock / Dramatic", category: "Minor pop staples", description: "A descending minor color with a lift back into the loop." },
  { numerals: ["i", "iv", "VII", "III"], style: "Dark Pop / Cinematic", category: "Minor pop staples", description: "Keeps the home chord dark, then opens up through the relative major area." },
  { numerals: ["i", "iv", "v", "i"], style: "Natural Minor / Traditional", category: "Songwriting basics", description: "A plain natural-minor movement with no raised leading tone." },
  { numerals: ["i", "i", "i", "i", "iv", "iv", "i", "i", "V", "iv", "i", "V"], style: "Minor 12 Bar Blues", category: "12 bar blues", description: "Minor blues form with a dominant V turnaround for stronger pull." },
  { numerals: ["iiø", "V", "i"], style: "Minor Jazz Cadence", category: "Jazz essentials", description: "The minor-key version of ii - V - I, with a half-diminished ii chord." },
  { numerals: ["i", "VI", "iiø", "V"], style: "Minor Jazz Turnaround", category: "Jazz essentials", description: "A compact minor loop that moves from stable minor color into dominant tension." },
  { numerals: ["i", "iv", "VII", "III", "VI", "iiø", "V", "i"], style: "Neo Soul / Jazz Minor", category: "Neo soul / jazz colors", description: "A longer minor path with a clear jazz cadence at the end." },
  { numerals: ["i", "VI", "iv", "V"], style: "Harmonic Minor Flavor", category: "Neo soul / jazz colors", description: "The major V adds a raised leading tone and a stronger pull back to i." }
].map(progression => Object.freeze({ ...progression, numerals: Object.freeze(progression.numerals) })));

export const PROGRESSION_COPY_TRANSLATION_KEYS = Object.freeze({
  "Pop staples": "progression.extra.01",
  "Songwriting basics": "progression.extra.02",
  "12 bar blues": "progression.extra.03",
  "Jazz essentials": "progression.extra.04",
  "Neo soul / jazz colors": "progression.extra.05",
  "Minor pop staples": "progression.extra.06",
  "Pop / Rock / Worship": "progression.extra.07",
  "Emotional Pop": "progression.extra.08",
  "50s Progression / Ballad": "progression.extra.09",
  "Classic / Folk Foundation": "progression.extra.10",
  "Jazz / Smooth Turnaround": "progression.extra.11",
  "Neo Soul / R&B Resolution": "progression.extra.12",
  "Minor Jazz Cadence": "progression.extra.13",
  "A direct four-chord loop for modern songs and big choruses.": "progression.extra.14",
  "Starts on the relative minor for a more wistful version of the pop loop.": "progression.extra.15",
  "Classic circular movement for ballads, oldies, and gentle songwriting.": "progression.extra.16",
  "Twelve-bar form with the turnaround on the last bar.": "progression.extra.17"
});

export const PROGRESSION_STRING_NAMES = Object.freeze(["E", "A", "D", "G", "B", "e"]);

const PITCH_CLASSES = Object.freeze({
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, Fb: 4,
  "E#": 5, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8,
  A: 9, "A#": 10, Bb: 10, B: 11, Cb: 11
});
const GUITAR_TUNING = Object.freeze([40, 45, 50, 55, 59, 64]);
const voicingCache = new Map();

export function keyDefinitionForMode(definition, mode) {
  const prefix = mode === "minor" ? "minor" : "major";
  return {
    label: definition[`${prefix}Label`],
    key: definition[`${prefix}Key`],
    notes: definition[`${prefix}Notes`]
  };
}

export function findKeyDefinition(requestedKey) {
  const normalized = String(requestedKey || "").toLowerCase();
  if (!normalized) return null;
  return KEY_DEFINITIONS.find(definition =>
    definition.majorKey.toLowerCase() === normalized
      || definition.minorKey.toLowerCase() === normalized
  ) || null;
}

export function buildMajorDiatonicChords(notes, useSevenths = false) {
  if (useSevenths) {
    return { I: `${notes[0]}maj7`, ii: `${notes[1]}m7`, iii: `${notes[2]}m7`, IV: `${notes[3]}maj7`, V: `${notes[4]}7`, vi: `${notes[5]}m7`, vii: `${notes[6]}m7b5` };
  }
  return { I: notes[0], ii: `${notes[1]}m`, iii: `${notes[2]}m`, IV: notes[3], V: notes[4], vi: `${notes[5]}m`, vii: `${notes[6]}dim` };
}

export function buildMinorDiatonicChords(notes, useSevenths = false) {
  if (useSevenths) {
    return { i: `${notes[0]}m7`, "iiø": `${notes[1]}m7b5`, iidim: `${notes[1]}m7b5`, III: `${notes[2]}maj7`, iv: `${notes[3]}m7`, v: `${notes[4]}m7`, V: `${notes[4]}7`, VI: `${notes[5]}maj7`, VII: `${notes[6]}7` };
  }
  return { i: `${notes[0]}m`, "iiø": `${notes[1]}dim`, iidim: `${notes[1]}dim`, III: notes[2], iv: `${notes[3]}m`, v: `${notes[4]}m`, V: notes[4], VI: notes[5], VII: notes[6] };
}

export function buildDiatonicChords(keyDefinition, mode, extension) {
  const selected = keyDefinitionForMode(keyDefinition, mode);
  return mode === "minor"
    ? buildMinorDiatonicChords(selected.notes, extension === "sevenths")
    : buildMajorDiatonicChords(selected.notes, extension === "sevenths");
}

export function parseChordForDictionary(chordName) {
  const match = String(chordName || "").match(/^([A-G](?:#|b)?)(m7b5|maj7|m7|dim|m|7)?$/);
  if (!match) return null;
  const qualityMap = { "": "major", m: "minor", 7: "dominant7", maj7: "major7", m7: "minor7", dim: "diminished", m7b5: "halfDiminished7" };
  return { root: match[1], chord: qualityMap[match[2] || ""] || "major" };
}

export function chordDictionaryUrl(chordName) {
  const parsed = parseChordForDictionary(chordName);
  if (!parsed) return "chord-dictionary.html";
  return `chord-dictionary.html?root=${encodeURIComponent(parsed.root)}&chord=${encodeURIComponent(parsed.chord)}`;
}

export function parseChordForVoicing(chordName) {
  const match = String(chordName || "").match(/^([A-G](?:#|b)?)(m7b5|maj7|m7|dim|m|7)?$/);
  if (!match || PITCH_CLASSES[match[1]] === undefined) return null;
  const qualityMap = {
    "": { label: "major", intervals: [0, 4, 7] },
    m: { label: "minor", intervals: [0, 3, 7] },
    dim: { label: "diminished", intervals: [0, 3, 6] },
    7: { label: "dominant 7", intervals: [0, 4, 7, 10] },
    maj7: { label: "major 7", intervals: [0, 4, 7, 11] },
    m7: { label: "minor 7", intervals: [0, 3, 7, 10] },
    m7b5: { label: "half-diminished 7", intervals: [0, 3, 6, 10] }
  };
  const quality = qualityMap[match[2] || ""] || qualityMap[""];
  return { root: match[1], rootPc: PITCH_CLASSES[match[1]], quality: quality.label, intervals: quality.intervals };
}

function positiveModulo(value, modulo) {
  return ((value % modulo) + modulo) % modulo;
}

function chordToneForPitch(pitchClass, parsed) {
  const interval = positiveModulo(pitchClass - parsed.rootPc, 12);
  if (!parsed.intervals.includes(interval)) return null;
  const labels = { 0: "R", 3: "b3", 4: "3", 6: "b5", 7: "5", 8: "#5", 10: "b7", 11: "7" };
  const family = interval === 0 ? "root"
    : (interval === 3 || interval === 4) ? "third"
      : (interval === 6 || interval === 7 || interval === 8) ? "fifth"
        : (interval === 10 || interval === 11) ? "seventh" : "extension";
  return { label: labels[interval] || String(interval), family, interval };
}

function buildStringOptions(parsed, stringIndex) {
  const options = [];
  for (let fret = 0; fret <= 12; fret += 1) {
    const pitch = positiveModulo(GUITAR_TUNING[stringIndex] + fret, 12);
    const tone = chordToneForPitch(pitch, parsed);
    if (tone) options.push({ fret, tone, pitch });
  }
  return options;
}

function getVoicingSpan(values) {
  const fretted = values.filter(value => value && typeof value.fret === "number" && value.fret > 0).map(value => value.fret);
  return fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
}

export function buildRootPositionVoicing(chordName) {
  const cacheKey = String(chordName || "");
  if (voicingCache.has(cacheKey)) return voicingCache.get(cacheKey);
  const parsed = parseChordForVoicing(chordName);
  if (!parsed) {
    voicingCache.set(cacheKey, null);
    return null;
  }

  let best = null;
  GUITAR_TUNING.forEach((_openPitch, rootString) => {
    const rootChoices = buildStringOptions(parsed, rootString).filter(option => option.tone?.label === "R");
    rootChoices.forEach(rootChoice => {
      const voicing = Array.from({ length: 6 }, () => ({ fret: "x", tone: null, pitch: null }));
      voicing[rootString] = rootChoice;
      for (let stringIndex = rootString + 1; stringIndex < 6; stringIndex += 1) {
        const currentIntervals = new Set(voicing.filter(value => value?.tone).map(value => value.tone.interval));
        const choices = buildStringOptions(parsed, stringIndex);
        let bestOption = { fret: "x", tone: null, pitch: null };
        let bestOptionScore = -Infinity;
        choices.forEach(option => {
          const candidate = voicing.slice();
          candidate[stringIndex] = option;
          if (getVoicingSpan(candidate) > 4) return;
          const distance = option.fret === 0 ? 0 : Math.abs(option.fret - rootChoice.fret);
          const coverageBonus = currentIntervals.has(option.tone.interval) ? 0 : 28;
          const openBonus = option.fret === 0 ? 6 : 0;
          const rootBonus = option.tone.label === "R" ? 3 : 0;
          const score = coverageBonus + openBonus + rootBonus + stringIndex * 0.4 - distance;
          if (score > bestOptionScore) {
            bestOptionScore = score;
            bestOption = option;
          }
        });
        voicing[stringIndex] = bestOption;
      }

      const sounding = voicing.filter(value => value?.tone);
      const intervals = new Set(sounding.map(value => value.tone.interval));
      const lowest = sounding[0];
      if (!parsed.intervals.every(interval => intervals.has(interval)) || !lowest || lowest.tone.label !== "R" || sounding.length < Math.min(parsed.intervals.length, 4)) return;
      const span = getVoicingSpan(voicing);
      const mutedCount = voicing.filter(value => !value || value.fret === "x").length;
      const fretted = voicing.filter(value => value && typeof value.fret === "number" && value.fret > 0).map(value => value.fret);
      const baseFret = fretted.length ? Math.min(...fretted) : 1;
      const score = sounding.length * 12 - span * 6 - baseFret * 1.4 - mutedCount * 4 - rootString * 1.2 + (rootChoice.fret === 0 ? 8 : 0);
      if (!best || score > best.score) best = { chordName: cacheKey, parsed, frets: voicing, baseFret, score };
    });
  });
  voicingCache.set(cacheKey, best);
  return best;
}

export function chunkProgressionItems(items, size = 4) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

export function progressionCategories(progressions) {
  return Array.from(new Set(progressions.map(progression => progression.category))).map(category => ({
    category,
    progressions: progressions.filter(progression => progression.category === category)
  }));
}
