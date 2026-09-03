export const NOTES_SHARP = Object.freeze(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]);
export const NOTES_FLAT = Object.freeze(["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]);

export const ROOTS = Object.freeze([
  Object.freeze({ pitch: 0, label: "C" }),
  Object.freeze({ pitch: 1, label: "C#" }),
  Object.freeze({ pitch: 2, label: "D" }),
  Object.freeze({ pitch: 3, label: "Eb" }),
  Object.freeze({ pitch: 4, label: "E" }),
  Object.freeze({ pitch: 5, label: "F" }),
  Object.freeze({ pitch: 6, label: "F#" }),
  Object.freeze({ pitch: 7, label: "G" }),
  Object.freeze({ pitch: 8, label: "Ab" }),
  Object.freeze({ pitch: 9, label: "A" }),
  Object.freeze({ pitch: 10, label: "Bb" }),
  Object.freeze({ pitch: 11, label: "B" })
]);

export const STRINGS = Object.freeze([
  Object.freeze({ name: "e", pitch: 4, description: "high E" }),
  Object.freeze({ name: "B", pitch: 11, description: "B" }),
  Object.freeze({ name: "G", pitch: 7, description: "G" }),
  Object.freeze({ name: "D", pitch: 2, description: "D" }),
  Object.freeze({ name: "A", pitch: 9, description: "A" }),
  Object.freeze({ name: "E", pitch: 4, description: "low E" })
]);

const scaleDefinitions = [
  { id: "major", translationId: "major", name: "Major", intervals: [0, 2, 4, 5, 7, 9, 11], degrees: ["1", "2", "3", "4", "5", "6", "7"], description: "A clear seven-note foundation for harmony, melody, and major-key improvisation." },
  { id: "natural-minor", translationId: "naturalMinor", name: "Natural Minor", intervals: [0, 2, 3, 5, 7, 8, 10], degrees: ["1", "2", "b3", "4", "5", "b6", "b7"], description: "A darker seven-note sound with a minor third, minor sixth, and minor seventh." },
  { id: "major-pentatonic", translationId: "majorPentatonic", name: "Major Pentatonic", intervals: [0, 2, 4, 7, 9], degrees: ["1", "2", "3", "5", "6"], description: "An open, melodic five-note sound common in pop, country, soul, and uplifting solos." },
  { id: "minor-pentatonic", translationId: "minorPentatonic", name: "Minor Pentatonic", intervals: [0, 3, 5, 7, 10], degrees: ["1", "b3", "4", "5", "b7"], description: "A focused five-note sound used throughout rock, blues, and modern guitar playing." },
  { id: "blues", translationId: "blues", name: "Blues", intervals: [0, 3, 5, 6, 7, 10], degrees: ["1", "b3", "4", "b5", "5", "b7"], description: "Minor pentatonic with the expressive flat fifth added for tension and blues phrasing." },
  { id: "dorian", translationId: "dorian", name: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10], degrees: ["1", "2", "b3", "4", "5", "6", "b7"], description: "A minor mode with a natural sixth, balancing a moody center with a brighter lift." },
  { id: "mixolydian", translationId: "mixolydian", name: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10], degrees: ["1", "2", "3", "4", "5", "6", "b7"], description: "A major sound with a flat seventh, ideal for rock, funk, blues, and dominant chords." },
  { id: "harmonic-minor", translationId: "harmonicMinor", name: "Harmonic Minor", intervals: [0, 2, 3, 5, 7, 8, 11], degrees: ["1", "2", "b3", "4", "5", "b6", "7"], description: "A dramatic minor scale with a raised seventh that strongly pulls back to the root." }
];

export const SCALE_TYPES = Object.freeze(Object.fromEntries(scaleDefinitions.map(definition => [
  definition.id,
  Object.freeze({
    ...definition,
    intervals: Object.freeze(definition.intervals),
    degrees: Object.freeze(definition.degrees)
  })
])));
export const SCALE_CATALOG = Object.freeze(scaleDefinitions.map(({ id }) => SCALE_TYPES[id]));

export const DEFAULT_SCALE_STATE = Object.freeze({
  rootPitch: 9,
  scaleId: "minor-pentatonic",
  neckFrets: 15,
  fretStart: 0,
  fretEnd: 15,
  labelMode: "note"
});

export const FRET_POSITION_MARKERS = Object.freeze([3, 5, 7, 9, 12, 15]);
export const EXPORT_FRET_POSITION_MARKERS = Object.freeze([3, 5, 7, 9, 12, 15, 17, 19, 21]);
const FLAT_ROOTS = new Set([3, 5, 8, 10]);

export function positiveModulo(value, modulo = 12) {
  return ((value % modulo) + modulo) % modulo;
}

export function noteNamesForRoot(rootPitch) {
  return FLAT_ROOTS.has(Number(rootPitch)) ? NOTES_FLAT : NOTES_SHARP;
}

export function rootName(rootPitch) {
  return noteNamesForRoot(rootPitch)[positiveModulo(Number(rootPitch))];
}

export function pitchFromName(noteName) {
  const pitchMap = {
    c: 0, "b#": 0, "c#": 1, db: 1, d: 2, "d#": 3, eb: 3,
    e: 4, fb: 4, "e#": 5, f: 5, "f#": 6, gb: 6, g: 7,
    "g#": 8, ab: 8, a: 9, "a#": 10, bb: 10, b: 11, cb: 11
  };
  return pitchMap[String(noteName || "").trim().toLowerCase()] ?? null;
}

export function scaleDefinition(scaleId) {
  return SCALE_TYPES[scaleId] || SCALE_TYPES[DEFAULT_SCALE_STATE.scaleId];
}

export function scalePitchClasses(rootPitch, scaleId) {
  return scaleDefinition(scaleId).intervals.map(interval => positiveModulo(Number(rootPitch) + interval));
}

export function scaleNotes(rootPitch, scaleId) {
  const names = noteNamesForRoot(rootPitch);
  return scalePitchClasses(rootPitch, scaleId).map(pitch => names[pitch]);
}

export function scaleModeForTools(scaleId) {
  return ["natural-minor", "minor-pentatonic", "blues", "dorian", "harmonic-minor"].includes(scaleId)
    ? "minor"
    : "major";
}

export function scaleTypeFromMode(mode) {
  return String(mode || "").toLowerCase() === "minor" ? "natural-minor" : "major";
}

export function rangeOptions(neckFrets) {
  const fretCount = Number(neckFrets) === 22 ? 22 : 15;
  const ranges = [
    { label: "0-4", start: 0, end: 4 },
    { label: "3-7", start: 3, end: 7 },
    { label: "5-9", start: 5, end: 9 },
    { label: "7-12", start: 7, end: 12 },
    { label: "10-15", start: 10, end: 15 }
  ];
  if (fretCount === 22) {
    ranges.push(
      { label: "12-17", start: 12, end: 17 },
      { label: "17-22", start: 17, end: 22 }
    );
  }
  return [{ label: `Full neck (0-${fretCount})`, start: 0, end: fretCount }, ...ranges];
}

export function buildScaleRenderData({ rootPitch, scaleId, fretStart, fretEnd, labelMode }) {
  const scale = scaleDefinition(scaleId);
  const noteNames = noteNamesForRoot(rootPitch);
  const pitchClasses = scalePitchClasses(rootPitch, scaleId);
  const visibleFrets = Array.from(
    { length: Number(fretEnd) - Number(fretStart) + 1 },
    (_, index) => Number(fretStart) + index
  );
  const rows = STRINGS.map(string => ({
    ...string,
    cells: visibleFrets.map(fret => {
      const pitch = positiveModulo(string.pitch + fret);
      const intervalIndex = pitchClasses.indexOf(pitch);
      const included = intervalIndex !== -1;
      const note = noteNames[pitch];
      const degree = included ? scale.degrees[intervalIndex] : null;
      return {
        string: string.name,
        stringDescription: string.description,
        fret,
        pitch,
        note,
        degree,
        intervalIndex,
        included,
        tonic: intervalIndex === 0,
        label: included ? (labelMode === "degree" ? degree : note) : ""
      };
    })
  }));
  return {
    visibleFrets,
    rows,
    positionMarkers: visibleFrets.map(fret => ({
      fret,
      dots: FRET_POSITION_MARKERS.includes(fret) ? (fret === 12 ? 2 : 1) : 0
    }))
  };
}

export function parseScaleQuery(search = "") {
  const state = { ...DEFAULT_SCALE_STATE };
  const params = new URLSearchParams(search);
  const requestedKey = params.get("key");
  const requestedRoot = params.get("root");
  const requestedType = params.get("type");

  if (requestedKey) {
    const keyMatch = requestedKey.trim().match(/^([A-G](?:#|b)?)(?:\s+(major|minor))?$/i);
    if (keyMatch) {
      const pitch = pitchFromName(keyMatch[1]);
      if (pitch !== null) state.rootPitch = pitch;
      state.scaleId = scaleTypeFromMode(keyMatch[2]);
    }
  }
  if (requestedRoot) {
    const pitch = pitchFromName(requestedRoot);
    if (pitch !== null) state.rootPitch = pitch;
  }
  if (requestedType && SCALE_TYPES[requestedType]) state.scaleId = requestedType;
  return state;
}

export function relatedToolUrls(rootPitch, scaleId) {
  const root = rootName(rootPitch);
  const mode = scaleModeForTools(scaleId);
  return {
    chordDictionary: `chord-dictionary.html?root=${encodeURIComponent(root)}&chord=${mode === "minor" ? "minor" : "major"}`,
    chordProgressions: `chord-progressions.html?key=${encodeURIComponent(`${root} ${mode}`)}`,
    fretboardTrainer: "fretboard-trainer.html"
  };
}

export function audioSequence(rootPitch, scaleId) {
  const intervals = [...scaleDefinition(scaleId).intervals, 12];
  const startMidi = 60 + Number(rootPitch);
  return intervals.map((interval, index) => ({
    interval,
    index,
    midi: startMidi + interval,
    frequency: 440 * Math.pow(2, (startMidi + interval - 69) / 12),
    offsetSeconds: index * 0.28
  }));
}
