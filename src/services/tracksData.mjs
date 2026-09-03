export const RELATIVE_KEY_GROUPS = Object.freeze([
  { id: "c-am", label: "C/Am", keys: ["C major", "A minor"] },
  { id: "csharp-bbm", label: "C#/Bbm", keys: ["C# major", "Db major", "Bb minor", "A# minor"] },
  { id: "d-bm", label: "D/Bm", keys: ["D major", "B minor"] },
  { id: "eb-cm", label: "Eb/Cm", keys: ["Eb major", "D# major", "C minor"] },
  { id: "e-csharpm", label: "E/C#m", keys: ["E major", "C# minor", "Db minor"] },
  { id: "f-dm", label: "F/Dm", keys: ["F major", "D minor"] },
  { id: "fsharp-ebm", label: "F#/Ebm", keys: ["F# major", "Gb major", "Eb minor", "D# minor"] },
  { id: "g-em", label: "G/Em", keys: ["G major", "E minor"] },
  { id: "ab-fm", label: "Ab/Fm", keys: ["Ab major", "G# major", "F minor"] },
  { id: "a-fsharpm", label: "A/F#m", keys: ["A major", "F# minor", "Gb minor"] },
  { id: "bb-gm", label: "Bb/Gm", keys: ["Bb major", "A# major", "G minor"] },
  { id: "b-gsharpm", label: "B/G#m", keys: ["B major", "G# minor", "Ab minor"] }
]);

export function normalizeTrack(track = {}) {
  return {
    id: String(track.id || "").trim(),
    title: String(track.title || "").trim(),
    key: String(track.key || "Unknown key").trim(),
    style: String(track.style || "Unknown style").trim(),
    mood: String(track.mood || "Unspecified").trim(),
    descriptor: String(track.descriptor || track.mood || track.style || "Practice").trim(),
    instrument: String(track.instrument || "Full band").trim(),
    bpm: String(track.bpm || "").trim(),
    coverUrl: String(track.coverUrl || "").trim(),
    youtubeUrl: String(track.youtubeUrl || "#").trim(),
    slidesUrl: String(track.slidesUrl || "#").trim(),
    downloadUrl: String(track.downloadUrl || "#").trim()
  };
}

export function getTrackNumber(track) {
  const match = String(track?.id || "").match(/[Ww](\d+)/);
  return match ? Number(match[1]) : 0;
}

export function getYouTubeVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1).split("/")[0];
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop() || "";
    }
  } catch (error) {
    return "";
  }
  return "";
}

export function selectedKeysForGroups(selectedGroupIds, groups = RELATIVE_KEY_GROUPS) {
  const selected = new Set(selectedGroupIds || []);
  return new Set(groups.filter(group => selected.has(group.id)).flatMap(group => group.keys));
}

export function filterAndSortTracks(tracks, selectedGroupIds, sortMode = "newest") {
  const selectedKeys = selectedKeysForGroups(selectedGroupIds);
  const filtered = (tracks || []).filter(track => selectedKeys.size === 0 || selectedKeys.has(track.key));
  return [...filtered].sort((a, b) => sortMode === "oldest"
    ? getTrackNumber(a) - getTrackNumber(b)
    : getTrackNumber(b) - getTrackNumber(a));
}

export function groupsFromSearch(search, groups = RELATIVE_KEY_GROUPS) {
  const requestedKeys = new URLSearchParams(search || "").getAll("key")
    .flatMap(value => value.split(","))
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  return groups.filter(group => requestedKeys.some(requested => (
    group.id.toLowerCase() === requested
    || group.label.toLowerCase() === requested
    || group.keys.some(key => key.toLowerCase() === requested)
  ))).map(group => group.id);
}

export async function loadTracks({ fetchImpl = globalThis.fetch, url = "data/tracks.json" } = {}) {
  const response = await fetchImpl(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load data/tracks.json");
  const tracks = await response.json();
  return tracks.map(normalizeTrack);
}
