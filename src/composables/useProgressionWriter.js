import { computed, reactive, readonly, ref } from "vue";
import {
  buildProgressionRecord,
  createChordEntry,
  createChordFields,
  normalizeSavedRecord,
  normalizeShapeIndex,
  PROGRESSION_MAX_SAVED,
  PROGRESSION_SECTION_NAMES,
  progressionRecordTitle,
  summarizeChordItems
} from "../music/progressionWriter.mjs";
import {
  readProgressionRecords,
  writeProgressionRecords
} from "../services/progressionWriterStorage.mjs";

export function useProgressionWriter({
  shapeEngine = globalThis.JamChordShapes,
  storage = globalThis.localStorage,
  createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  now = () => new Date().toISOString()
} = {}) {
  if (!shapeEngine) throw new Error("Progression Writer requires JamChordShapes.");

  const mode = ref("single");
  const songName = ref("");
  const keyRoot = ref("A");
  const keyQuality = ref("major");
  const bpm = ref("");
  const separateDownload = ref(false);
  const sections = reactive({
    single: createChordFields(),
    verse: createChordFields(),
    chorus: createChordFields()
  });
  const activeSavedProgressionId = ref(null);
  const status = ref("");
  const normalizeOptions = () => ({
    normalizeChord: shapeEngine.normalizeChord,
    createId,
    now,
    fallbackRoot: keyRoot.value,
    fallbackQuality: keyQuality.value
  });
  const savedProgressions = ref(readProgressionRecords(storage, normalizeOptions()));
  const selectedSavedId = ref(savedProgressions.value[0]?.id || "");

  const savedCountText = computed(() => {
    const count = savedProgressions.value.length;
    return count ? `${count} saved ${count === 1 ? "progression" : "progressions"}` : "No saved progressions";
  });
  const selectedSavedRecord = computed(() =>
    savedProgressions.value.find(item => item.id === (selectedSavedId.value || activeSavedProgressionId.value)) || null
  );

  function currentState() {
    return {
      mode: mode.value,
      songName: songName.value,
      keyRoot: keyRoot.value,
      keyQuality: keyQuality.value,
      bpm: bpm.value,
      separateDownload: separateDownload.value,
      sections
    };
  }

  function setStatus(message = "") {
    status.value = message;
  }

  function setMode(value) {
    mode.value = value === "sections" ? "sections" : "single";
    setStatus("");
  }

  function effectiveEntry(item) {
    const parsed = shapeEngine.parseChord(item.symbol);
    if (!parsed) return createChordEntry(item);
    const voicings = shapeEngine.generateVoicings(parsed);
    return createChordEntry({
      symbol: item.symbol,
      shapeIndex: voicings.length ? normalizeShapeIndex(item.shapeIndex) % voicings.length : 0
    });
  }

  function fieldsFor(items) {
    return createChordFields((items || []).map(effectiveEntry));
  }

  function replaceSection(sectionName, items) {
    sections[sectionName].splice(0, sections[sectionName].length, ...fieldsFor(items));
  }

  function applyProgressionRecord(record) {
    const item = normalizeSavedRecord(record, normalizeOptions());
    if (!item) {
      setStatus("Could not load that saved progression.");
      return false;
    }
    activeSavedProgressionId.value = item.id;
    selectedSavedId.value = item.id;
    mode.value = item.mode;
    songName.value = item.songName;
    keyRoot.value = item.keyRoot;
    keyQuality.value = item.keyQuality;
    bpm.value = item.bpm;
    separateDownload.value = item.separateDownload;
    PROGRESSION_SECTION_NAMES.forEach(sectionName => replaceSection(sectionName, item.sections[sectionName]));
    setStatus("Saved progression loaded.");
    return true;
  }

  function addChord(sectionName) {
    const entry = createChordEntry();
    sections[sectionName]?.push(entry);
    return entry.uid;
  }

  function deleteChord(sectionName) {
    const entries = sections[sectionName];
    if (!entries?.length) return null;
    if (entries.length === 1) {
      entries[0].symbol = "";
      entries[0].shapeIndex = 0;
      setStatus("Last chord cleared.");
      return entries[0].uid;
    }
    entries.pop();
    setStatus("Chord deleted.");
    return entries.at(-1)?.uid || null;
  }

  function updateChord(sectionName, uid, value) {
    const entry = sections[sectionName]?.find(item => item.uid === uid);
    if (!entry) return;
    entry.symbol = String(value || "");
    entry.shapeIndex = 0;
  }

  function normalizeChord(sectionName, uid) {
    const entry = sections[sectionName]?.find(item => item.uid === uid);
    if (!entry) return;
    const normalized = shapeEngine.normalizeChord(entry.symbol);
    if (normalized) entry.symbol = normalized;
  }

  function setShape(sectionName, uid, shapeIndex) {
    const entry = sections[sectionName]?.find(item => item.uid === uid);
    if (entry) entry.shapeIndex = normalizeShapeIndex(shapeIndex);
  }

  function buildRecord(existingRecord = null) {
    return buildProgressionRecord(currentState(), existingRecord, {
      normalizeChord: shapeEngine.normalizeChord,
      createId,
      now
    });
  }

  function persist(records) {
    savedProgressions.value = writeProgressionRecords(storage, records);
    if (!savedProgressions.value.some(item => item.id === activeSavedProgressionId.value)) {
      activeSavedProgressionId.value = null;
    }
    selectedSavedId.value = activeSavedProgressionId.value || savedProgressions.value[0]?.id || "";
  }

  function saveProgression() {
    const existing = activeSavedProgressionId.value
      ? savedProgressions.value.find(item => item.id === activeSavedProgressionId.value)
      : null;
    const record = buildRecord(existing);
    if (!record) {
      setStatus("Add at least one chord before saving.");
      return null;
    }
    if (record.error) {
      setStatus(record.error);
      return null;
    }
    const records = [...savedProgressions.value];
    const index = records.findIndex(item => item.id === record.id);
    if (index >= 0) records[index] = record;
    else records.unshift(record);
    activeSavedProgressionId.value = record.id;
    persist(records.slice(0, PROGRESSION_MAX_SAVED));
    setStatus(index >= 0 ? "Saved progression updated." : "Progression saved.");
    return record;
  }

  function loadSelected() {
    if (!selectedSavedRecord.value) {
      setStatus("Pick a saved progression first.");
      return false;
    }
    return applyProgressionRecord(selectedSavedRecord.value);
  }

  function selectSaved(value) {
    selectedSavedId.value = String(value || "");
    const record = selectedSavedRecord.value;
    if (record) applyProgressionRecord(record);
  }

  function duplicateProgression(record = selectedSavedRecord.value) {
    let source = record ? normalizeSavedRecord(record, normalizeOptions()) : null;
    if (!source) {
      const current = buildRecord();
      if (!current) {
        setStatus("Add at least one chord before duplicating.");
        return null;
      }
      if (current.error) {
        setStatus(current.error);
        return null;
      }
      source = current;
    }
    const timestamp = now();
    const copy = {
      ...source,
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      songName: source.songName ? `${source.songName} Copy` : ""
    };
    persist([copy, ...savedProgressions.value].slice(0, PROGRESSION_MAX_SAVED));
    applyProgressionRecord(copy);
    setStatus("Progression duplicated.");
    return copy;
  }

  function clearCurrentProgression() {
    activeSavedProgressionId.value = null;
    songName.value = "";
    bpm.value = "";
    separateDownload.value = false;
    PROGRESSION_SECTION_NAMES.forEach(sectionName => replaceSection(sectionName, []));
    selectedSavedId.value = savedProgressions.value[0]?.id || "";
    setStatus("Progression cleared.");
  }

  function deleteSavedProgression(id) {
    const next = savedProgressions.value.filter(item => item.id !== id);
    if (activeSavedProgressionId.value === id) activeSavedProgressionId.value = null;
    persist(next);
    setStatus("Saved progression deleted.");
  }

  function recordSummary(record) {
    const item = normalizeSavedRecord(record, normalizeOptions());
    if (!item) return null;
    return {
      item,
      title: progressionRecordTitle(item),
      meta: [item.songName, item.key, item.bpm ? `${item.bpm} BPM` : ""].filter(Boolean).join(" | "),
      single: summarizeChordItems(item.sections.single, shapeEngine.normalizeChord) || "No chords",
      verse: summarizeChordItems(item.sections.verse, shapeEngine.normalizeChord) || "No verse chords",
      chorus: summarizeChordItems(item.sections.chorus, shapeEngine.normalizeChord) || "No chorus chords"
    };
  }

  return {
    activeSavedProgressionId: readonly(activeSavedProgressionId),
    addChord,
    applyProgressionRecord,
    bpm,
    buildRecord,
    clearCurrentProgression,
    currentState,
    deleteChord,
    deleteSavedProgression,
    duplicateProgression,
    keyQuality,
    keyRoot,
    loadSelected,
    mode: readonly(mode),
    normalizeChord,
    recordSummary,
    saveProgression,
    savedCountText,
    savedProgressions: readonly(savedProgressions),
    sections,
    selectSaved,
    selectedSavedId,
    selectedSavedRecord,
    separateDownload,
    setMode,
    setShape,
    setStatus,
    shapeEngine,
    songName,
    status: readonly(status),
    updateChord
  };
}
