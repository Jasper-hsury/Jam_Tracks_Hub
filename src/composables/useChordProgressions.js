import { computed, readonly, ref } from "vue";
import {
  buildDiatonicChords,
  findKeyDefinition,
  KEY_DEFINITIONS,
  keyDefinitionForMode,
  MAJOR_PROGRESSIONS,
  MINOR_PROGRESSIONS
} from "../music/chordProgressions.mjs";

export function useChordProgressions({ search = globalThis.location?.search || "" } = {}) {
  const mode = ref("major");
  const extension = ref("triads");
  const selectedDefinition = ref(null);

  const keyButtons = computed(() => KEY_DEFINITIONS.map(definition => ({
    definition,
    ...keyDefinitionForMode(definition, mode.value)
  })));
  const selectedKey = computed(() => selectedDefinition.value
    ? keyDefinitionForMode(selectedDefinition.value, mode.value)
    : null);
  const progressions = computed(() => mode.value === "minor" ? MINOR_PROGRESSIONS : MAJOR_PROGRESSIONS);
  const chordMap = computed(() => selectedDefinition.value
    ? buildDiatonicChords(selectedDefinition.value, mode.value, extension.value)
    : {});

  function setMode(nextMode) {
    mode.value = nextMode === "minor" ? "minor" : "major";
  }

  function setExtension(nextExtension) {
    extension.value = nextExtension === "sevenths" ? "sevenths" : "triads";
  }

  function selectKey(definition) {
    if (KEY_DEFINITIONS.includes(definition)) selectedDefinition.value = definition;
  }

  function selectAnotherKey() {
    selectedDefinition.value = null;
  }

  const requestedKey = new URLSearchParams(search).get("key");
  if (requestedKey) {
    setMode(requestedKey.toLowerCase().includes("minor") ? "minor" : "major");
    const requestedDefinition = findKeyDefinition(requestedKey);
    if (requestedDefinition) selectKey(requestedDefinition);
  }

  return {
    chordMap,
    extension: readonly(extension),
    keyButtons,
    mode: readonly(mode),
    progressions,
    selectAnotherKey,
    selectedDefinition: readonly(selectedDefinition),
    selectedKey,
    selectKey,
    setExtension,
    setMode
  };
}
