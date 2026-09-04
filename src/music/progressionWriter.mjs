export const PROGRESSION_STORAGE_KEY = "jamTracksHubProgressionWriter";
export const PROGRESSION_MAX_SAVED = 12;
export const PROGRESSION_MIN_FIELDS = 4;
export const PROGRESSION_KEY_ROOTS = Object.freeze([
  "A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab"
]);
export const PROGRESSION_SECTION_NAMES = Object.freeze(["single", "verse", "chorus"]);

let entrySequence = 0;

export function createEntryId() {
  entrySequence += 1;
  return `progression-entry-${entrySequence}`;
}

export function normalizeShapeIndex(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

export function createChordEntry(item = {}) {
  return {
    uid: createEntryId(),
    symbol: String(item.symbol || ""),
    shapeIndex: normalizeShapeIndex(item.shapeIndex)
  };
}

export function createChordFields(items = [], minimumCount = PROGRESSION_MIN_FIELDS) {
  const fields = items.map(createChordEntry);
  while (fields.length < Math.max(1, minimumCount)) fields.push(createChordEntry());
  return fields;
}

export function normalizeChordItem(item, normalizeChord) {
  if (typeof item === "string") {
    const symbol = normalizeChord(item) || item.trim();
    return symbol ? { symbol, shapeIndex: 0 } : null;
  }
  if (!item || typeof item !== "object") return null;
  const rawSymbol = item.symbol || item.chord || item.name || "";
  const symbol = normalizeChord(rawSymbol) || String(rawSymbol).trim();
  if (!symbol) return null;
  return { symbol, shapeIndex: normalizeShapeIndex(item.shapeIndex) };
}

export function normalizeChordItems(items, normalizeChord) {
  return Array.isArray(items)
    ? items.map(item => normalizeChordItem(item, normalizeChord)).filter(Boolean)
    : [];
}

export function selectedKeyLabel(keyRoot = "A", keyQuality = "major") {
  return `${keyRoot || "A"} ${keyQuality === "minor" ? "Minor" : "Major"}`;
}

export function inferSavedKeyParts(item, fallbackRoot = "A", fallbackQuality = "major") {
  if (item?.keyRoot) {
    return {
      root: item.keyRoot,
      quality: item.keyQuality === "minor" ? "minor" : "major"
    };
  }
  const match = String(item?.key || "").trim().match(/^(.+?)\s+(major|minor)$/i);
  if (match) return { root: match[1], quality: match[2].toLowerCase() };
  return { root: fallbackRoot || "A", quality: fallbackQuality === "minor" ? "minor" : "major" };
}

export function normalizeSavedRecord(item, {
  normalizeChord,
  createId,
  now,
  fallbackRoot = "A",
  fallbackQuality = "major"
}) {
  if (!item || typeof item !== "object") return null;
  const makeId = createId || (() => `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const currentTime = now || (() => new Date().toISOString());
  const keyParts = inferSavedKeyParts(item, fallbackRoot, fallbackQuality);
  const mode = item.mode === "sections" ? "sections" : "single";
  const sourceSections = item.sections || {};
  return {
    id: String(item.id || makeId()),
    mode,
    createdAt: item.createdAt || currentTime(),
    updatedAt: item.updatedAt || item.createdAt || currentTime(),
    songName: String(item.songName || ""),
    keyRoot: keyParts.root,
    keyQuality: keyParts.quality,
    key: selectedKeyLabel(keyParts.root, keyParts.quality),
    bpm: String(item.bpm || ""),
    separateDownload: Boolean(item.separateDownload),
    sections: {
      single: normalizeChordItems(sourceSections.single || item.chords, normalizeChord),
      verse: normalizeChordItems(sourceSections.verse || item.verse, normalizeChord),
      chorus: normalizeChordItems(sourceSections.chorus || item.chorus, normalizeChord)
    }
  };
}

export function readSectionEntries(entries, normalizeChord) {
  const chords = [];
  const invalid = [];
  for (const entry of entries || []) {
    const raw = String(entry?.symbol || "").trim();
    if (!raw) continue;
    const normalized = normalizeChord(raw);
    if (!normalized) {
      invalid.push(raw);
      continue;
    }
    chords.push({ symbol: normalized, shapeIndex: normalizeShapeIndex(entry.shapeIndex) });
  }
  return { chords, invalid };
}

export function buildProgressionRecord(state, existingRecord, {
  normalizeChord,
  createId,
  now
}) {
  const currentTime = now || (() => new Date().toISOString());
  const makeId = createId || (() => `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const existing = existingRecord
    ? normalizeSavedRecord(existingRecord, {
      normalizeChord,
      createId: makeId,
      now: currentTime,
      fallbackRoot: state.keyRoot,
      fallbackQuality: state.keyQuality
    })
    : null;
  const mode = state.mode === "sections" ? "sections" : "single";
  const timestamp = currentTime();
  const base = {
    id: existing?.id || makeId(),
    mode,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
    songName: String(state.songName || "").trim(),
    keyRoot: state.keyRoot || "A",
    keyQuality: state.keyQuality === "minor" ? "minor" : "major",
    key: selectedKeyLabel(state.keyRoot, state.keyQuality),
    bpm: String(state.bpm || "").trim(),
    separateDownload: Boolean(state.separateDownload)
  };

  if (mode === "sections") {
    const verse = readSectionEntries(state.sections.verse, normalizeChord);
    const chorus = readSectionEntries(state.sections.chorus, normalizeChord);
    const invalid = [...verse.invalid, ...chorus.invalid];
    if (invalid.length) return { error: `Could not read: ${invalid.join(", ")}` };
    if (!verse.chords.length && !chorus.chords.length) return null;
    return {
      ...base,
      sections: {
        single: existing?.sections.single || [],
        verse: verse.chords,
        chorus: chorus.chords
      }
    };
  }

  const single = readSectionEntries(state.sections.single, normalizeChord);
  if (single.invalid.length) return { error: `Could not read: ${single.invalid.join(", ")}` };
  if (!single.chords.length) return null;
  return {
    ...base,
    sections: {
      single: single.chords,
      verse: existing?.sections.verse || [],
      chorus: existing?.sections.chorus || []
    }
  };
}

export function collectDownloadProgression(state, shapeEngine) {
  const sectionNames = state.mode === "sections" ? ["verse", "chorus"] : ["single"];
  const sectionLabels = { single: "Progression", verse: "Verse", chorus: "Chorus" };
  const sections = [];
  const invalid = [];

  for (const sectionName of sectionNames) {
    const chords = [];
    for (const entry of state.sections[sectionName] || []) {
      const raw = String(entry?.symbol || "").trim();
      if (!raw) continue;
      const parsed = shapeEngine.parseChord(raw);
      if (!parsed) {
        invalid.push(raw);
        continue;
      }
      const voicings = shapeEngine.generateVoicings(parsed);
      if (!voicings.length) {
        invalid.push(raw);
        continue;
      }
      const shapeIndex = normalizeShapeIndex(entry.shapeIndex) % voicings.length;
      chords.push({ parsed, voicing: voicings[shapeIndex], shapeIndex, totalShapes: voicings.length });
    }
    if (chords.length) sections.push({ title: sectionLabels[sectionName], chords });
  }

  if (invalid.length) return { error: `Could not read: ${invalid.join(", ")}` };
  if (!sections.some(section => section.chords.length)) {
    return { error: "Add at least one chord before downloading." };
  }
  return {
    mode: state.mode,
    songName: String(state.songName || "").trim() || "Untitled Progression",
    key: selectedKeyLabel(state.keyRoot, state.keyQuality),
    bpm: String(state.bpm || "").trim(),
    sections
  };
}

export function fileSafeName(value) {
  return String(value || "custom-progression")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "custom-progression";
}

export function summarizeChordItems(items, normalizeChord) {
  const chords = normalizeChordItems(items, normalizeChord);
  return chords.length ? chords.map(item => item.symbol).join(" - ") : "";
}

export function progressionRecordTitle(item) {
  return item?.mode === "sections" ? "With Verse & Chorus" : "Chord Progression";
}

export function filterShapeVoicings(voicings, parsed, position, rootString, shapeEngine) {
  return (voicings || []).map((voicing, index) => ({ voicing, index })).filter(item => {
    const matchesPosition = position === "all"
      || shapeEngine.nearestPositionTarget(item.voicing.frets) === Number(position);
    const matchesRootString = shapeEngine.voicingHasRootOnString(item.voicing.frets, rootString, parsed);
    return matchesPosition && matchesRootString;
  });
}
