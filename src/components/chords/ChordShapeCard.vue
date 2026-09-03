<script setup>
import { computed } from "vue";
import {
  buildRootPositionVoicing,
  chordDictionaryUrl,
  PROGRESSION_STRING_NAMES
} from "../../music/chordProgressions.mjs";

const props = defineProps({
  chordName: { type: String, required: true },
  dictionaryLabel: { type: String, required: true },
  openLabel: { type: String, required: true },
  rootPositionLabel: { type: String, required: true }
});

const voicing = computed(() => buildRootPositionVoicing(props.chordName));
const dictionaryUrl = computed(() => chordDictionaryUrl(props.chordName));
const fretted = computed(() => voicing.value?.frets
  .filter(value => value && typeof value.fret === "number" && value.fret > 0)
  .map(value => value.fret) || []);
const baseFret = computed(() => Math.max(1, fretted.value.length ? Math.min(...fretted.value) : 1));
const displayFrets = computed(() => voicing.value?.frets
  .map(value => value && typeof value.fret === "number" ? value.fret : "x")
  .join(" ") || "");
const markers = computed(() => voicing.value?.frets.flatMap((value, stringIndex) => {
  if (!value || typeof value.fret !== "number" || value.fret === 0) return [];
  const row = value.fret - baseFret.value;
  if (row < 0 || row > 3) return [];
  return [{
    family: value.tone.family,
    label: value.tone.label,
    stringIndex,
    style: {
      left: `${(stringIndex / 5) * 100}%`,
      top: `${((row + 0.5) / 4) * 100}%`
    }
  }];
}) || []);
</script>

<template>
  <a
    v-if="voicing"
    class="progression-shape-card"
    :href="dictionaryUrl"
    :aria-label="openLabel"
  >
    <div class="progression-shape-card-head">
      <strong>{{ chordName }}</strong>
      <span>{{ rootPositionLabel }}</span>
    </div>
    <div class="progression-shape-frets">{{ displayFrets }}</div>
    <div class="progression-mini-diagram" aria-hidden="true">
      <div class="progression-open-row">
        <span
          v-for="(value, index) in voicing.frets"
          :key="index"
          :class="value?.fret === 0 ? 'progression-open-tone' : null"
          :data-tone-family="value?.fret === 0 ? value.tone.family : null"
          :aria-label="!value || value.fret === 'x' ? 'muted' : null"
        >{{ !value || value.fret === "x" ? "x" : value.fret === 0 ? value.tone.label : "" }}</span>
      </div>
      <span class="progression-base-fret">{{ baseFret }}</span>
      <div class="progression-mini-neck">
        <span
          v-for="marker in markers"
          :key="marker.stringIndex"
          class="progression-fret-marker"
          :data-tone-family="marker.family"
          :style="marker.style"
        >{{ marker.label }}</span>
      </div>
      <div class="progression-string-row">
        <span v-for="stringName in PROGRESSION_STRING_NAMES" :key="stringName">{{ stringName }}</span>
      </div>
    </div>
  </a>
  <a v-else class="progression-shape-card progression-shape-card-fallback" :href="dictionaryUrl">
    <strong>{{ chordName }}</strong>
    <span>{{ dictionaryLabel }}</span>
  </a>
</template>
