// Chord Lab: parses free-form chord symbols (Gmaj7add13, D/F#, G7alt …),
// searches the neck for playable voicings, and suggests simpler chords.
import { DIAGRAM_FRET_ROWS, pitchFromName, STRING_NAMES, TUNING_MIDI } from "./chordDictionary.mjs";

export { DIAGRAM_FRET_ROWS, STRING_NAMES, TUNING_MIDI };
export const LAB_POSITION_TARGETS = Object.freeze([0, 3, 5, 7, 9, 12]);
export const TOP_VOICING_COUNT = 5;

const LETTERS = Object.freeze(["C", "D", "E", "F", "G", "A", "B"]);
const NATURAL_PITCHES = Object.freeze({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 });
const MAX_FRET = 15;
const MAX_SPAN = 3;
const MAX_FINGERS = 4;
const DEGREE_STEPS = Object.freeze({ 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 2, 11: 5, 13: 9 });
// A bass note outside the chord is named by its distance from the root.
const BASS_DEGREE_BY_SEMITONE = Object.freeze(["1", "b9", "9", "b3", "3", "11", "#11", "5", "b13", "13", "b7", "7"]);
const ROLE_ORDER = Object.freeze(["root", "third", "fifth", "sixth", "seventh", "tension", "bass"]);
const voicingCache = new Map();

export const LAB_EXAMPLES = Object.freeze([
  { id: "seventh", examples: ["Cmaj7", "Dm7"] },
  { id: "add", examples: ["Gadd9", "Gmaj7add13"] },
  { id: "sus", examples: ["Dsus2", "A7sus4"] },
  { id: "extended", examples: ["Am11", "F13"] },
  { id: "altered", examples: ["Cmaj7#11", "E7b9b13"] },
  { id: "slash", examples: ["D/F#", "C/E"] },
  { id: "omit", examples: ["C7omit5", "G7(omit3)"] },
  { id: "alt", examples: ["G7alt"] },
  { id: "sixth", examples: ["Am6", "C6/9"] },
  { id: "minorMajor", examples: ["Am(maj7)"] },
  { id: "dimAug", examples: ["Bm7b5", "Caug"] }
]);

function semitoneForDegree(degree) {
  const match = String(degree).match(/^(bb|b|#)?(\d+)$/);
  if (!match || DEGREE_STEPS[match[2]] === undefined) return null;
  const shift = match[1] === "bb" ? -2 : match[1] === "b" ? -1 : match[1] === "#" ? 1 : 0;
  return (DEGREE_STEPS[match[2]] + shift + 12) % 12;
}

export function toneFamilyForRole(role, degree) {
  if (role === "root") return "root";
  if (role === "third") return ["3", "b3"].includes(degree) ? "third" : "extension";
  if (role === "fifth") return "fifth";
  if (role === "seventh") return "seventh";
  if (degree === "#9") return "third";
  return "extension";
}

function spellNote(rootLetter, rootPitch, degree, semitone) {
  const match = String(degree).match(/(\d+)$/);
  const pitch = (rootPitch + semitone) % 12;
  if (!match) return null;
  const letterIndex = (LETTERS.indexOf(rootLetter) + (Number(match[1]) - 1)) % 7;
  const letter = LETTERS[letterIndex];
  let distance = (pitch - NATURAL_PITCHES[letter] + 12) % 12;
  if (distance > 6) distance -= 12;
  if (Math.abs(distance) > 2) return null;
  return `${letter}${distance > 0 ? "#".repeat(distance) : "b".repeat(-distance)}`;
}

function fallbackNoteName(pitch, preferFlats) {
  const sharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const flat = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  return (preferFlats ? flat : sharp)[((pitch % 12) + 12) % 12];
}

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .replace(/[−–—]/g, "-")
    .replace(/[øØ]7?/g, "m7b5")
    .replace(/°7/g, "dim7")
    .replace(/°/g, "dim")
    .replace(/[Δ∆△](?=\d)/g, "maj")
    .replace(/[Δ∆△]/g, "maj7");
}

function parseNote(text) {
  const match = String(text || "").match(/^([A-Ga-g])(#|b)?$/);
  if (!match) return null;
  const name = `${match[1].toUpperCase()}${match[2] || ""}`;
  const pitch = pitchFromName(name);
  return pitch === null ? null : { name, letter: match[1].toUpperCase(), pitch };
}

function fail(code, detail = "") {
  return { ok: false, error: { code, detail } };
}

// Parses the quality/extension text after the root into a chord "spec".
function parseQuality(text) {
  let rest = text;
  const spec = {
    third: "major", fifth: "5", seventh: null, sixth: false, top: null,
    sus: null, power: false, adds: [], alterations: [], omits: [], alt: false
  };
  const take = pattern => {
    const match = rest.match(pattern);
    if (!match) return null;
    rest = rest.slice(match[0].length);
    return match;
  };

  rest = rest.replace(/^M(?=\d)/, "maj").replace(/^M$/, "");
  rest = rest.toLowerCase().replace(/[(),]/g, "").replace(/6\/9/g, "69");

  if (take(/^(?:mmaj|minmaj|m\/maj|-maj|mma|mm(?=7|9|11|13))/)) {
    spec.third = "minor";
    spec.seventh = "7";
  } else if (take(/^(?:maj|ma)(?=\d)/)) {
    spec.seventh = "7";
  } else if (take(/^(?:major|maj)(?!\d)/)) {
    spec.seventh = null;
  } else if (take(/^(?:min|mi|m|-)/)) {
    spec.third = "minor";
  } else if (take(/^(?:dim|o(?!mit))/)) {
    spec.third = "minor";
    spec.fifth = "b5";
    spec.diminished = true;
  } else if (take(/^(?:aug|\+)/)) {
    spec.fifth = "#5";
  }

  const number = take(/^(13|11|69|9|7|6|5)/);
  if (number) {
    const value = number[1];
    if (value === "5" && spec.third === "major" && !spec.seventh && spec.fifth === "5") {
      spec.power = true;
    } else if (value === "6") {
      spec.sixth = true;
    } else if (value === "69") {
      spec.sixth = true;
      spec.adds.push("9");
    } else if (value === "5") {
      return null;
    } else {
      if (spec.diminished && !spec.seventh) spec.seventh = "bb7";
      if (!spec.seventh) spec.seventh = "b7";
      spec.top = value === "7" ? null : value;
    }
  }

  while (rest.length) {
    let match;
    if ((match = take(/^sus(2|4)?/))) {
      spec.sus = match[1] || "4";
    } else if ((match = take(/^add(b|#)?(2|4|6|9|11|13)/))) {
      spec.adds.push(`${match[1] || ""}${match[2]}`);
    } else if ((match = take(/^(?:omit|no)(3|5)/))) {
      spec.omits.push(match[1]);
    } else if (take(/^alt(?:ered)?/)) {
      spec.alt = true;
      if (!spec.seventh) spec.seventh = "b7";
    } else if ((match = take(/^(b|#|\+|-)(5|9|11|13)/))) {
      const accidental = match[1] === "+" ? "#" : match[1] === "-" ? "b" : match[1];
      if (match[2] === "5") spec.fifth = `${accidental}5`;
      else spec.alterations.push(`${accidental}${match[2]}`);
    } else if ((match = take(/^(?:maj|ma)7/))) {
      spec.seventh = "7";
    } else if ((match = take(/^(13|11|9|7|6)/))) {
      if (match[1] === "7") {
        if (!spec.seventh) spec.seventh = spec.diminished ? "bb7" : "b7";
      } else if (match[1] === "6") {
        spec.sixth = true;
      } else {
        spec.adds.push(match[1]);
      }
    } else {
      return null;
    }
  }
  return spec;
}

function addTone(tones, tone) {
  const semitone = semitoneForDegree(tone.degree);
  if (semitone === null) return;
  const existing = tones.find(item => item.semitone === semitone);
  if (existing) {
    existing.required = existing.required || tone.required;
    if (tone.group) existing.group = tone.group;
    return;
  }
  tones.push({ ...tone, semitone });
}

function buildTones(spec) {
  const tones = [];
  addTone(tones, { degree: "1", role: "root", required: true });
  if (spec.power) {
    addTone(tones, { degree: "5", role: "fifth", required: true });
    return tones;
  }
  const dominantEleven = spec.top === "11" && spec.third === "major" && !spec.sus;
  if (spec.sus) {
    addTone(tones, { degree: spec.sus, role: "third", required: true });
  } else if (!spec.omits.includes("3")) {
    addTone(tones, { degree: spec.third === "minor" ? "b3" : "3", role: "third", required: !dominantEleven });
  }
  const alteredFifth = spec.fifth !== "5";
  if (!spec.omits.includes("5") && !spec.alt) {
    addTone(tones, { degree: spec.fifth, role: "fifth", required: alteredFifth });
  }
  if (spec.sixth) addTone(tones, { degree: "6", role: "sixth", required: true });
  if (spec.seventh) addTone(tones, { degree: spec.seventh, role: "seventh", required: true });
  if (spec.top === "9") addTone(tones, { degree: "9", role: "tension", required: true });
  if (spec.top === "11") {
    addTone(tones, { degree: "9", role: "tension", required: false });
    addTone(tones, { degree: "11", role: "tension", required: true });
  }
  if (spec.top === "13") {
    addTone(tones, { degree: "9", role: "tension", required: false });
    if (spec.third === "minor") addTone(tones, { degree: "11", role: "tension", required: false });
    addTone(tones, { degree: "13", role: "tension", required: true });
  }
  spec.adds.forEach(degree => addTone(tones, { degree, role: degree === "6" ? "sixth" : "tension", required: true }));
  spec.alterations.forEach(degree => addTone(tones, { degree, role: "tension", required: true }));
  if (spec.alt) {
    ["b9", "#9", "b5", "#5"].forEach(degree => addTone(tones, { degree, role: degree.endsWith("5") ? "fifth" : "tension", required: false, group: "alt" }));
  }
  return tones;
}

// The quality "core" used to name simplified chords (maj7, m7b5, 7sus4 …).
function coreSuffix(spec, overrides = {}) {
  const s = { ...spec, ...overrides };
  if (s.power) return "5";
  if (s.sus) return `${s.seventh === "b7" ? "7" : s.seventh === "7" ? "maj7" : ""}sus${s.sus}`;
  if (s.third === "minor") {
    if (s.fifth === "b5") return s.seventh === "bb7" ? "dim7" : s.seventh === "b7" ? "m7b5" : "dim";
    if (s.seventh === "7") return "m(maj7)";
    if (s.seventh === "b7") return "m7";
    return s.sixth ? "m6" : "m";
  }
  if (s.fifth === "#5") return s.seventh === "b7" ? "7#5" : s.seventh === "7" ? "maj7#5" : "aug";
  if (s.fifth === "b5" && s.seventh === "b7") return "7b5";
  if (s.seventh === "7") return "maj7";
  if (s.seventh === "b7") return "7";
  return s.sixth ? "6" : "";
}

export function parseLabChord(value) {
  const symbol = normalizeSymbol(value);
  if (!symbol) return fail("empty");
  const rootMatch = symbol.match(/^([A-Ga-g])(#|b)?/);
  if (!rootMatch) return fail("root");
  const root = parseNote(rootMatch[0]);
  let rest = symbol.slice(rootMatch[0].length);
  let bass = null;
  const slash = rest.match(/\/([A-Ga-g](?:#|b)?)$/);
  if (slash) {
    bass = parseNote(slash[1]);
    rest = rest.slice(0, -slash[0].length);
  }
  const spec = parseQuality(rest);
  if (!spec) return fail("quality", rest);

  const tones = buildTones(spec);
  const preferFlats = root.name.includes("b") || ["F"].includes(root.name);
  tones.forEach(tone => {
    tone.note = spellNote(root.letter, root.pitch, tone.degree, tone.semitone) || fallbackNoteName(root.pitch + tone.semitone, preferFlats);
    tone.label = tone.degree === "1" ? "R" : tone.degree;
    tone.family = toneFamilyForRole(tone.role, tone.degree);
  });

  let bassSemitone = null;
  if (bass) {
    bassSemitone = (bass.pitch - root.pitch + 12) % 12;
    if (bassSemitone === 0) {
      bass = null;
      bassSemitone = null;
    } else if (!tones.some(tone => tone.semitone === bassSemitone)) {
      const degree = BASS_DEGREE_BY_SEMITONE[bassSemitone];
      tones.push({
        degree, semitone: bassSemitone, role: "bass", required: true, label: degree,
        note: bass.name, family: "extension"
      });
    } else {
      const tone = tones.find(item => item.semitone === bassSemitone);
      tone.required = true;
      tone.note = bass.name;
    }
  }

  tones.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
    || (Number(a.degree.replace(/\D/g, "")) - Number(b.degree.replace(/\D/g, ""))));

  const rootText = root.name;
  const display = `${rootText}${symbol.slice(rootMatch[0].length, symbol.length - (slash ? slash[0].length : 0))}${bass ? `/${bass.name}` : ""}`;
  const seventhOrMore = Boolean(spec.seventh) || spec.sixth;
  return {
    ok: true,
    chord: Object.freeze({
      symbol: display,
      rootName: rootText,
      rootLetter: root.letter,
      rootPitch: root.pitch,
      bassName: bass?.name || null,
      bassSemitone,
      spec: Object.freeze({ ...spec, adds: [...spec.adds], alterations: [...spec.alterations], omits: [...spec.omits] }),
      tones: Object.freeze(tones.map(tone => Object.freeze(tone))),
      allowRootless: !bass && !spec.power && seventhOrMore && tones.length >= 4,
      key: `${root.pitch}|${bassSemitone ?? ""}|${tones.map(tone => `${tone.semitone}${tone.required ? "!" : ""}${tone.group || ""}`).join(",")}`
    })
  };
}

export function toneForSemitone(chord, semitone) {
  return chord.tones.find(tone => tone.semitone === ((semitone % 12) + 12) % 12) || null;
}

export function toneForString(chord, stringIndex, fret) {
  if (fret < 0) return null;
  return toneForSemitone(chord, TUNING_MIDI[stringIndex] + fret - chord.rootPitch);
}

function fingerCount(frets) {
  const fretted = frets.map((fret, index) => ({ fret, index })).filter(item => item.fret > 0);
  if (!fretted.length) return 0;
  const minimum = Math.min(...fretted.map(item => item.fret));
  const atMinimum = fretted.filter(item => item.fret === minimum);
  if (atMinimum.length < 2) return fretted.length;
  const from = atMinimum[0].index;
  const to = atMinimum[atMinimum.length - 1].index;
  // One finger can barre the lowest fret when nothing between needs to ring open.
  const barreable = frets.slice(from, to + 1).every(fret => fret < 0 || fret >= minimum);
  return barreable ? fretted.length - atMinimum.length + 1 : fretted.length;
}

export function voicingPosition(frets) {
  const fretted = frets.filter(fret => fret > 0);
  return fretted.length ? Math.min(...fretted) : 0;
}

export function diagramBaseFret(frets) {
  const fretted = frets.filter(fret => fret > 0);
  return !fretted.length || Math.max(...fretted) <= DIAGRAM_FRET_ROWS ? 1 : Math.min(...fretted);
}

function evaluateVoicing(chord, frets) {
  const sounding = [];
  frets.forEach((fret, index) => { if (fret >= 0) sounding.push({ fret, index, midi: TUNING_MIDI[index] + fret }); });
  const minimumNotes = chord.spec.power ? 2 : 3;
  if (sounding.length < minimumNotes) return null;
  const first = sounding[0].index;
  const last = sounding[sounding.length - 1].index;
  let interiorMutes = 0;
  for (let index = first; index <= last; index += 1) if (frets[index] < 0) interiorMutes += 1;
  if (interiorMutes > 1) return null;

  const fretted = sounding.filter(item => item.fret > 0).map(item => item.fret);
  const minimum = fretted.length ? Math.min(...fretted) : 0;
  const maximum = fretted.length ? Math.max(...fretted) : 0;
  const span = fretted.length ? maximum - minimum : 0;
  if (span > MAX_SPAN) return null;
  const openCount = sounding.filter(item => item.fret === 0).length;
  if (openCount && maximum > 7) return null;
  const fingers = fingerCount(frets);
  if (fingers > MAX_FINGERS) return null;

  const tones = [];
  for (let position = 0; position < sounding.length; position += 1) {
    const item = sounding[position];
    const semitone = ((item.midi - chord.rootPitch) % 12 + 12) % 12;
    const tone = toneForSemitone(chord, semitone);
    if (!tone) return null;
    if (tone.role === "bass" && position !== 0) return null;
    tones.push(tone);
  }

  const bassTone = tones[0];
  const present = new Set(tones.map(tone => tone.semitone));
  const hasRoot = present.has(0);
  let rootless = false;
  if (chord.bassSemitone !== null) {
    if (bassTone.semitone !== chord.bassSemitone || !hasRoot) return null;
  } else if (bassTone.semitone !== 0) {
    if (hasRoot || !chord.allowRootless) return null;
    rootless = true;
  }
  const missingRequired = chord.tones.filter(tone => tone.required && !present.has(tone.semitone)
    && !(rootless && tone.role === "root"));
  if (missingRequired.length) return null;
  const groups = new Set(chord.tones.filter(tone => tone.group).map(tone => tone.group));
  for (const group of groups) {
    if (!chord.tones.some(tone => tone.group === group && present.has(tone.semitone))) return null;
  }
  // Rootless shapes are closed, mid-neck grips: no open strings, nothing on the low E.
  if (rootless && (present.size < 3 || openCount || first === 0)) return null;

  const lowInterval = sounding.length > 1 ? sounding[1].midi - sounding[0].midi : 12;
  if (sounding[0].midi < 50 && lowInterval < 3) return null;

  const optional = chord.tones.filter(tone => !tone.required && present.has(tone.semitone));
  const doublings = sounding.length - present.size;
  const averageFret = fretted.length ? fretted.reduce((sum, fret) => sum + fret, 0) / fretted.length : 0;
  const color = colorTone(chord);
  const topTone = tones[tones.length - 1];
  let score = 100;
  score += optional.reduce((sum, tone) => sum + (tone.role === "fifth" && !tone.group ? 2 : 4), 0);
  score += rootless ? -8 : 6;
  score -= 2 * Math.max(0, fingers - 2);
  score -= 2 * span;
  score -= 5 * interiorMutes;
  score -= 0.35 * averageFret;
  score += minimum <= 4 ? 1.5 * openCount : 0;
  score += 3 * sounding.length;
  score -= 0.5 * doublings;
  if (sounding.length === 3 && chord.tones.length >= 3) score -= 4;
  if (color && topTone.semitone === color.semitone) score += 4;
  if (sounding[0].midi < 48 && lowInterval < 5) score -= 4;
  if (sounding[sounding.length - 1].midi < 57) score -= 4;
  if (span === 3 && fingers === 4) score -= 2;

  const difficulty = fingers * 2 + span * 1.5 + interiorMutes * 1.5 + (fingers < fretted.length ? 1.5 : 0) + (minimum > 7 ? 0.5 : 0);
  return Object.freeze({
    frets: Object.freeze([...frets]),
    score: Math.round(score * 10) / 10,
    difficulty,
    fingers,
    span: fretted.length ? span + 1 : 0,
    noteCount: fretted.length,
    position: minimum,
    hasOpen: openCount > 0,
    rootless,
    bassString: first,
    present: Object.freeze([...present]),
    labels: Object.freeze(tones.map(tone => tone.label))
  });
}

// The tone that gives the chord its name: the highest tension, else the 7th/6th.
function colorTone(chord) {
  const ranked = ["tension", "sixth", "seventh"];
  for (const role of ranked) {
    const candidates = chord.tones.filter(tone => tone.role === role && tone.required);
    if (candidates.length) return candidates[candidates.length - 1];
  }
  return null;
}

export function generateLabVoicings(chord) {
  if (voicingCache.has(chord.key)) return voicingCache.get(chord.key);
  const allowed = new Set(chord.tones.map(tone => (chord.rootPitch + tone.semitone) % 12));
  const results = new Map();
  for (let start = 1; start <= MAX_FRET - MAX_SPAN; start += 1) {
    const options = TUNING_MIDI.map(open => {
      const list = [-1];
      if (allowed.has(open % 12)) list.push(0);
      for (let fret = start; fret <= start + MAX_SPAN; fret += 1) {
        if (allowed.has((open + fret) % 12)) list.push(fret);
      }
      return list;
    });
    const current = Array(6).fill(-1);
    (function search(stringIndex) {
      if (stringIndex === 6) {
        const key = current.join(",");
        if (results.has(key)) return;
        const voicing = evaluateVoicing(chord, current);
        if (voicing) results.set(key, voicing);
        return;
      }
      options[stringIndex].forEach(fret => {
        current[stringIndex] = fret;
        search(stringIndex + 1);
      });
    })(0);
  }
  const sorted = [...results.values()]
    .filter(voicing => !isRedundant(voicing, results))
    .sort((a, b) => b.score - a.score || a.position - b.position);
  const frozen = Object.freeze(sorted);
  voicingCache.set(chord.key, frozen);
  return frozen;
}

// Drops a shape when adding one more ringing open string gives the same shape
// with a better score, so the list is not padded with near-duplicates.
function isRedundant(voicing, results) {
  return voicing.frets.some((fret, index) => {
    if (fret !== -1) return false;
    const fuller = [...voicing.frets];
    fuller[index] = 0;
    const other = results.get(fuller.join(","));
    return other && other.score > voicing.score && other.rootless === voicing.rootless;
  });
}

function similar(a, b) {
  return a.bassString === b.bassString && Math.abs(a.position - b.position) <= 2 && a.rootless === b.rootless;
}

function diversify(list, count, maxRootless = count) {
  const chosen = [];
  const rootlessCount = () => chosen.filter(voicing => voicing.rootless).length;
  // Pass 1: varied shapes; pass 2: any shape; both keep the rootless limit.
  [true, false].forEach(varied => list.forEach(voicing => {
    if (chosen.length >= count || chosen.includes(voicing)) return;
    if (varied && chosen.some(other => similar(other, voicing))) return;
    if (voicing.rootless && rootlessCount() >= maxRootless) return;
    chosen.push(voicing);
  }));
  return chosen;
}

export function rankLabVoicings(voicings, { near = "best", rootMode = "all" } = {}) {
  let list = voicings;
  if (rootMode === "root") list = list.filter(voicing => !voicing.rootless);
  if (rootMode === "rootless") list = list.filter(voicing => voicing.rootless);
  const maxRootless = rootMode === "rootless" ? TOP_VOICING_COUNT : 1;
  let top;
  if (near !== "best") {
    const target = Number(near);
    const distance = voicing => target === 0
      ? (voicing.hasOpen ? 0 : voicing.position)
      : Math.abs((voicing.hasOpen && voicing.position <= 4 ? 0 : voicing.position) - target);
    list = [...list].sort((a, b) => distance(a) - distance(b) || b.score - a.score);
    // Vary the shapes near the chosen fret first; only then reach further away.
    // Varied shapes around the chosen fret first, then the next closest ones.
    top = diversify(list.filter(voicing => distance(voicing) <= 2), TOP_VOICING_COUNT, maxRootless);
    const rootlessCount = () => top.filter(voicing => voicing.rootless).length;
    [true, false].forEach(limitRootless => list.forEach(voicing => {
      if (top.length >= TOP_VOICING_COUNT || top.includes(voicing)) return;
      if (limitRootless && voicing.rootless && rootlessCount() >= maxRootless) return;
      top.push(voicing);
    }));
  } else {
    top = diversify(list, TOP_VOICING_COUNT, maxRootless);
  }
  if (near === "best" && rootMode === "all" && top.length === TOP_VOICING_COUNT && !top.some(voicing => voicing.rootless)) {
    const rootless = list.find(voicing => voicing.rootless);
    if (rootless) top[top.length - 1] = rootless;
  }
  const rest = list.filter(voicing => !top.includes(voicing));
  return { top, all: [...top, ...rest] };
}

function easiest(voicings, limit = 8) {
  const rooted = voicings.filter(voicing => !voicing.rootless);
  const pool = rooted.slice(0, limit);
  const full = pool.filter(voicing => voicing.labels.length >= 4);
  return [...(full.length ? full : pool)].sort((a, b) => a.difficulty - b.difficulty || b.score - a.score)[0] || null;
}

function toneDiff(from, to) {
  const changes = [];
  const removed = from.tones.filter(tone => tone.role !== "bass" && !to.tones.some(other => other.semitone === tone.semitone));
  const added = to.tones.filter(tone => tone.required && !from.tones.some(other => other.semitone === tone.semitone));
  const removedLeft = [...removed];
  const addedLeft = [...added];
  ["third", "fifth", "seventh"].forEach(role => {
    const before = removedLeft.find(tone => tone.role === role);
    const after = addedLeft.find(tone => tone.role === role);
    if (before && after) {
      changes.push({ type: "replace", from: before, to: after });
      removedLeft.splice(removedLeft.indexOf(before), 1);
      addedLeft.splice(addedLeft.indexOf(after), 1);
    }
  });
  removedLeft.forEach(tone => changes.push({ type: "remove", tone }));
  addedLeft.forEach(tone => changes.push({ type: "add", tone }));
  if (from.bassName && !to.bassName) changes.push({ type: "dropBass", note: from.bassName });
  return changes;
}

function variantSymbols(chord) {
  const spec = chord.spec;
  const root = chord.rootName;
  const core = coreSuffix(spec);
  const close = [];
  const color = [];
  const hasExtras = spec.top || spec.adds.length || spec.alterations.length || spec.alt || spec.sixth && spec.seventh;
  if (chord.bassName) close.push(`${root}${chord.symbol.slice(root.length, chord.symbol.lastIndexOf("/"))}`);
  if (spec.seventh === "7" && (spec.top === "13" || spec.adds.includes("13") || spec.adds.includes("6"))) {
    close.push(`${root}${spec.third === "minor" ? "m6" : "6"}`);
  }
  if (spec.alt) close.push(`${root}7#9`);
  if (hasExtras) close.push(`${root}${core}`);
  if (spec.seventh && spec.top === "9" && !spec.alterations.length && !spec.sus && spec.fifth === "5") {
    close.push(`${root}${spec.third === "minor" ? "m(add9)" : "add9"}`);
  }
  if (spec.third === "minor" && spec.seventh === "7") close.push(`${root}m`);
  if (spec.diminished && spec.seventh === "bb7") close.push(`${root}dim`);

  if (spec.seventh === "7" && spec.third === "major" && !spec.sus) color.push(`${root}7`);
  if (spec.third === "minor" && spec.seventh === "7") color.push(`${root}m7`);
  if (spec.fifth === "b5" && spec.third === "minor") color.push(`${root}${spec.seventh ? "m7" : "m"}`);
  if (spec.fifth === "#5" && !spec.seventh) color.push(root);
  if (!spec.sus && !spec.power && spec.fifth === "5") {
    color.push(`${root}${spec.seventh === "b7" ? "7sus4" : "sus4"}`);
    if (!spec.seventh) color.push(`${root}sus2`);
  }
  return { close, color };
}

function variantEntry(chord, symbol, tier) {
  const parsed = parseLabChord(symbol);
  if (!parsed.ok || parsed.chord.key === chord.key) return null;
  const voicing = easiest(generateLabVoicings(parsed.chord));
  if (!voicing) return null;
  return { tier, symbol: parsed.chord.symbol, chord: parsed.chord, voicing, changes: toneDiff(chord, parsed.chord) };
}

// Three tiers: (1) the same chord with fewer notes, (2) a close relative,
// (3) an easier chord whose color changes.
export function simplifyLabChord(chord, voicings = generateLabVoicings(chord)) {
  const best = voicings[0];
  const tiers = [];
  if (best) {
    const easier = [...voicings]
      .filter(voicing => voicing.difficulty < best.difficulty
        || (voicing.rootless && !best.rootless && voicing.difficulty <= best.difficulty))
      .sort((a, b) => b.score - a.score || a.difficulty - b.difficulty);
    const picks = [];
    const omittedKey = voicing => chord.tones.filter(tone => !voicing.present.includes(tone.semitone)).map(tone => tone.degree).join(",");
    easier.forEach(voicing => {
      if (picks.length < 2 && !picks.some(pick => omittedKey(pick) === omittedKey(voicing))) picks.push(voicing);
    });
    if (picks.length) {
      tiers.push({
        tier: 1,
        items: picks.map(voicing => ({
          tier: 1, symbol: chord.symbol, chord, voicing,
          changes: chord.tones.filter(tone => !voicing.present.includes(tone.semitone)).map(tone => ({ type: "omit", tone }))
        }))
      });
    }
  }
  const seen = new Set([chord.key]);
  const { close, color } = variantSymbols(chord);
  [[2, close], [3, color]].forEach(([tier, symbols]) => {
    const items = [];
    symbols.forEach(symbol => {
      if (items.length >= 2) return;
      const entry = variantEntry(chord, symbol, tier);
      if (!entry || seen.has(entry.chord.key)) return;
      seen.add(entry.chord.key);
      items.push(entry);
    });
    if (items.length) tiers.push({ tier, items });
  });
  return tiers;
}

export function fretsText(frets) {
  return frets.map(fret => fret < 0 ? "x" : String(fret)).join(" ");
}

export function labToolUrl(symbol) {
  return `chord-lab.html?chord=${encodeURIComponent(symbol)}`;
}

export function initialLabChord(search = "", fallback = "Gmaj7add13") {
  const params = new URLSearchParams(search);
  const requested = params.get("chord");
  return requested && parseLabChord(requested).ok ? requested : fallback;
}
