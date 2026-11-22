<script setup>
import { computed } from "vue";
import {
  diagramBaseFret,
  DIAGRAM_FRET_ROWS,
  fretsText,
  STRING_NAMES,
  toneForString
} from "../../music/chordLab.mjs";

const props = defineProps({
  chord: { type: Object, required: true },
  voicing: { type: Object, required: true },
  rankText: { type: String, default: "" },
  title: { type: String, default: "" },
  positionText: { type: String, default: "" },
  metaText: { type: String, default: "" },
  tags: { type: Array, default: () => [] },
  note: { type: String, default: "" },
  ariaText: { type: String, default: "" },
  playLabel: { type: String, required: true },
  playing: { type: Boolean, default: false },
  highlight: { type: Boolean, default: false },
  compact: { type: Boolean, default: false }
});

defineEmits(["play"]);

const baseFret = computed(() => diagramBaseFret(props.voicing.frets));
const strings = computed(() => props.voicing.frets.map((fret, stringIndex) => ({
  fret,
  name: STRING_NAMES[stringIndex],
  tone: toneForString(props.chord, stringIndex, fret)
})));
const fretLabel = computed(() => fretsText(props.voicing.frets));
const toneText = computed(() => props.voicing.labels.join(" · "));
const markers = computed(() => strings.value.flatMap((string, stringIndex) => {
  if (string.fret <= 0) return [];
  const row = string.fret - baseFret.value;
  if (row < 0 || row >= DIAGRAM_FRET_ROWS) return [];
  return [{
    ...string,
    stringIndex,
    style: { left: `${stringIndex * 20}%`, top: `${(row + 0.5) * (100 / DIAGRAM_FRET_ROWS)}%` }
  }];
}));
</script>

<template>
  <article
    class="chord-shape-card chord-lab-shape-card"
    :class="{ 'is-highlighted': highlight, 'is-compact': compact }"
  >
    <div class="chord-lab-card-heading">
      <div>
        <span v-if="rankText" class="chord-lab-rank">{{ rankText }}</span>
        <h3>{{ title || chord.symbol }}</h3>
      </div>
      <strong v-if="positionText">{{ positionText }}</strong>
    </div>
    <div v-if="tags.length" class="chord-lab-tags">
      <span v-for="tag in tags" :key="tag.text" class="chord-lab-tag" :class="tag.className">{{ tag.text }}</span>
    </div>
    <div class="chord-diagram" role="img" :aria-label="ariaText || `${chord.symbol} ${fretLabel}`">
      <div class="diagram-status-row">
        <span
          v-for="string in strings"
          :key="string.name"
          class="diagram-string-status"
          :class="{ 'is-muted': string.fret < 0, 'is-open': string.fret === 0, 'is-root': string.tone?.role === 'root' }"
        >
          <template v-if="string.fret < 0">X</template>
          <template v-else-if="string.fret === 0">
            <span>O</span>
            <strong :data-tone-family="string.tone?.family || 'other'">{{ string.tone?.label || "" }}</strong>
          </template>
        </span>
      </div>
      <div class="diagram-neck">
        <span class="diagram-base-fret">{{ baseFret > 1 ? baseFret : "" }}</span>
        <i
          v-for="(_, stringIndex) in strings"
          :key="`string-${stringIndex}`"
          class="diagram-string-line"
          :style="{ left: `${stringIndex * 20}%` }"
          aria-hidden="true"
        ></i>
        <i
          v-for="fretLine in DIAGRAM_FRET_ROWS + 1"
          :key="`fret-${fretLine}`"
          class="diagram-fret-line"
          :class="{ 'is-nut': fretLine === 1 && baseFret === 1 }"
          :style="{ top: `${(fretLine - 1) * (100 / DIAGRAM_FRET_ROWS)}%` }"
          aria-hidden="true"
        ></i>
        <span
          v-for="marker in markers"
          :key="`marker-${marker.stringIndex}`"
          class="diagram-finger"
          :class="{ 'is-root': marker.tone?.role === 'root' }"
          :data-tone-family="marker.tone?.family || 'other'"
          :style="marker.style"
          :title="marker.tone ? `${marker.tone.label} ${marker.tone.note}` : ''"
          aria-hidden="true"
        >{{ marker.tone?.label || "" }}</span>
      </div>
      <div class="diagram-string-names" aria-hidden="true">
        <span v-for="string in strings" :key="string.name">{{ string.name }}</span>
      </div>
    </div>
    <p class="chord-lab-frets">{{ fretLabel }}</p>
    <p class="chord-lab-tones">{{ toneText }}</p>
    <slot></slot>
    <p v-if="note" class="chord-lab-card-note">{{ note }}</p>
    <div class="chord-lab-card-footer">
      <span>{{ metaText }}</span>
      <button
        type="button"
        class="chord-lab-play-button"
        :class="{ 'is-playing': playing }"
        :aria-label="playLabel"
        :aria-pressed="String(playing)"
        @click="$emit('play')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"></path></svg>
      </button>
    </div>
  </article>
</template>
