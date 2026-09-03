import { computed, readonly, ref } from "vue";
import {
  CHORDS,
  chordAllowedForStringSet,
  filterVoicings,
  generateVoicings,
  initialChordDictionaryState,
  parseChordSymbolInput,
  SHAPES_PER_PAGE,
  triadStringSetRange,
  visibleChordCategories
} from "../music/chordDictionary.mjs";

export function useChordDictionary({ search = globalThis.location?.search || "" } = {}) {
  const initial = initialChordDictionaryState(search);
  const rootPitch = ref(initial.rootPitch);
  const chordId = ref(initial.chordId);
  const searchText = ref("");
  const position = ref("all");
  const rootString = ref("all");
  const triadSet = ref("all");
  const page = ref(0);

  const chord = computed(() => CHORDS.find(item => item.id === chordId.value) || CHORDS[0]);
  const categories = computed(() => visibleChordCategories(searchText.value));
  const voicings = computed(() => generateVoicings(rootPitch.value, chord.value));
  const filteredVoicings = computed(() => filterVoicings({
    rootPitch: rootPitch.value,
    chord: chord.value,
    voicings: voicings.value,
    position: position.value,
    rootString: rootString.value,
    triadSet: triadSet.value
  }));
  const pageCount = computed(() => Math.ceil(filteredVoicings.value.length / SHAPES_PER_PAGE));
  const visibleVoicings = computed(() => filteredVoicings.value.slice(
    page.value * SHAPES_PER_PAGE,
    (page.value + 1) * SHAPES_PER_PAGE
  ));

  function resetPage() {
    page.value = 0;
  }

  function selectRoot(value) {
    if (Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 11) {
      rootPitch.value = Number(value);
      resetPage();
    }
  }

  function selectChord(value) {
    if (CHORDS.some(item => item.id === value)) {
      chordId.value = value;
      resetPage();
    }
  }

  function setSearch(value) {
    searchText.value = String(value || "");
    const parsed = parseChordSymbolInput(searchText.value);
    if (parsed) {
      rootPitch.value = parsed.pitch;
      chordId.value = parsed.chord.id;
      resetPage();
    }
    return Boolean(parsed);
  }

  function setPosition(value) {
    position.value = String(value);
    resetPage();
  }

  function setRootString(value) {
    rootString.value = String(value);
    resetPage();
  }

  function setTriadSet(value) {
    triadSet.value = String(value);
    const range = triadStringSetRange(triadSet.value);
    if (range && rootString.value !== "all" && !range.allowedRootStrings.includes(rootString.value)) {
      rootString.value = "all";
    }
    resetPage();
  }

  function previousPage() {
    page.value = Math.max(0, page.value - 1);
  }

  function nextPage() {
    page.value = Math.min(Math.max(0, pageCount.value - 1), page.value + 1);
  }

  return {
    categories,
    chord,
    chordId: readonly(chordId),
    filteredVoicings,
    nextPage,
    page: readonly(page),
    pageCount,
    position: readonly(position),
    previousPage,
    rootPitch: readonly(rootPitch),
    rootString: readonly(rootString),
    searchText: readonly(searchText),
    selectChord,
    selectRoot,
    setPosition,
    setRootString,
    setSearch,
    setTriadSet,
    stringSetAllowed: computed(() => chordAllowedForStringSet(chord.value, triadSet.value)),
    triadSet: readonly(triadSet),
    visibleVoicings,
    voicings
  };
}
