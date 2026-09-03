<script setup>
import { computed } from "vue";
import { buildDiagramModel, DIAGRAM_FRET_ROWS } from "../../music/chordDictionary.mjs";

const props = defineProps({
  chord: { type: Object, required: true },
  index: { type: Number, required: true },
  rootPitch: { type: Number, required: true },
  voicing: { type: Object, required: true }
});

const model = computed(() => buildDiagramModel(props.rootPitch, props.chord, props.voicing, props.index));
const fretText = computed(() => props.voicing.frets.map(fret => fret < 0 ? "x" : fret).join(" "));
const ariaLabel = computed(() => `${model.value.symbol} guitar shape ${props.index + 1}: ${props.voicing.frets.join(", ")}. ${model.value.toneDescriptions}`);
const markers = computed(() => model.value.strings.flatMap((string, stringIndex) => {
  if (string.fret <= 0) return [];
  const row = string.fret - model.value.baseFret;
  if (row < 0 || row >= DIAGRAM_FRET_ROWS) return [];
  return [{
    ...string,
    stringIndex,
    style: {
      left: `${stringIndex * 20}%`,
      top: `${(row + 0.5) * (100 / DIAGRAM_FRET_ROWS)}%`
    }
  }];
}));
</script>

<template>
  <article class="chord-shape-card" :data-flip-id="`shape-card-${index}`">
    <div class="chord-shape-card-heading">
      <div>
        <span>Shape {{ index + 1 }}</span>
        <strong>{{ fretText }}</strong>
      </div>
      <small>{{ model.baseFret === 1 ? "Open / low position" : `Starts at fret ${model.baseFret}` }}</small>
    </div>
    <div class="chord-diagram" :aria-label="ariaLabel">
      <div class="diagram-status-row">
        <span
          v-for="string in model.strings"
          :key="string.name"
          class="diagram-string-status"
          :class="{ 'is-muted': string.fret < 0, 'is-open': string.fret === 0, 'is-root': string.tone?.isRoot }"
        >
          <template v-if="string.fret < 0">X</template>
          <template v-else-if="string.fret === 0">
            <span>O</span>
            <strong :data-tone-order="string.tone?.order ?? 99" :data-tone-family="string.tone?.family || 'other'">{{ string.tone?.label || "" }}</strong>
          </template>
        </span>
      </div>
      <div class="diagram-neck">
        <span class="diagram-base-fret">{{ model.baseFret > 1 ? model.baseFret : "" }}</span>
        <i
          v-for="(_, stringIndex) in model.strings"
          :key="`string-${stringIndex}`"
          class="diagram-string-line"
          :style="{ left: `${stringIndex * 20}%` }"
          aria-hidden="true"
        ></i>
        <i
          v-for="fretLine in DIAGRAM_FRET_ROWS + 1"
          :key="`fret-${fretLine}`"
          class="diagram-fret-line"
          :class="{ 'is-nut': fretLine === 1 && model.baseFret === 1 }"
          :style="{ top: `${(fretLine - 1) * (100 / DIAGRAM_FRET_ROWS)}%` }"
          aria-hidden="true"
        ></i>
        <span
          v-for="marker in markers"
          :key="`marker-${marker.stringIndex}`"
          class="diagram-finger"
          :class="{ 'is-root': marker.tone?.isRoot }"
          :data-tone-order="marker.tone?.order ?? 99"
          :data-tone-family="marker.tone?.family || 'other'"
          :style="marker.style"
          :title="marker.tone ? `${marker.tone.label} ${marker.tone.note}` : ''"
          aria-hidden="true"
        >{{ marker.tone?.label || "" }}</span>
      </div>
      <div class="diagram-string-names">
        <span v-for="string in model.strings" :key="string.name">{{ string.name }}</span>
      </div>
    </div>
  </article>
</template>
