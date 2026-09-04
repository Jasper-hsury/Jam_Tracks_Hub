import {
  normalizeSavedRecord,
  PROGRESSION_MAX_SAVED,
  PROGRESSION_STORAGE_KEY
} from "../music/progressionWriter.mjs";

export function readProgressionRecords(storage, options) {
  try {
    const value = JSON.parse(storage?.getItem(PROGRESSION_STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.map(item => normalizeSavedRecord(item, options)).filter(Boolean);
  } catch (error) {
    return [];
  }
}

export function writeProgressionRecords(storage, records) {
  const bounded = Array.isArray(records) ? records.slice(0, PROGRESSION_MAX_SAVED) : [];
  storage?.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(bounded));
  return bounded;
}
