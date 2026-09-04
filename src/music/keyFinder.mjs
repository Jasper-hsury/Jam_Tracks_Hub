export const MAX_UPLOAD_BYTES = 60 * 1024 * 1024;
export const MAX_CONTAINER_UPLOAD_BYTES = 25 * 1024 * 1024;
export const HEAVY_CONTAINER_EXTENSIONS = new Set([".mp4", ".webm"]);

export function getFileExtension(fileName) {
  const dotIndex = String(fileName || "").lastIndexOf(".");
  return dotIndex >= 0 ? String(fileName).slice(dotIndex).toLowerCase() : "";
}

export function validateFileSelection(file) {
  if (!file) return { valid: false, code: "empty-file" };
  if (file.size > MAX_UPLOAD_BYTES) return { valid: false, code: "file-too-large" };
  if (
    HEAVY_CONTAINER_EXTENSIONS.has(getFileExtension(file.name))
    && file.size > MAX_CONTAINER_UPLOAD_BYTES
  ) {
    return { valid: false, code: "container-too-large" };
  }
  return { valid: true, code: "valid" };
}

export function validateYoutubeInput(value) {
  const url = String(value || "").trim();
  return url ? { valid: true, url } : { valid: false, code: "empty-youtube", url: "" };
}

export function clampProgress(value) {
  const progress = Number(value || 0);
  return Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
}

export function normalizeKeyForUrl(keyName) {
  return String(keyName || "").replace(/\s+(major|minor)$/i, match => match.toLowerCase());
}

export function parseKeyName(keyName) {
  const match = String(keyName || "").trim().match(/^([A-G](?:#|b)?)(?:\s+(major|minor))?$/i);
  if (!match) return { root: "", mode: "major" };
  return {
    root: match[1].charAt(0).toUpperCase() + match[1].slice(1),
    mode: (match[2] || "major").toLowerCase()
  };
}

export function resultLinks(finalKey) {
  const key = encodeURIComponent(normalizeKeyForUrl(finalKey));
  const parsed = parseKeyName(finalKey);
  const root = encodeURIComponent(parsed.root);
  const chordType = parsed.mode === "minor" ? "minor" : "major";
  return {
    scale: `scale.html?key=${key}`,
    dictionary: `chord-dictionary.html?root=${root}&chord=${chordType}`,
    progressions: `chord-progressions.html?key=${key}`,
    tracks: `tracks.html?key=${key}`
  };
}

export function formatPercent(value, fallback = "Not available") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return fallback;
  return `${Number(value).toFixed(1)}%`;
}

export function formatRelativeScore(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "Not available";
  return `${(Number(value) / 100).toFixed(1)}x final score`;
}
