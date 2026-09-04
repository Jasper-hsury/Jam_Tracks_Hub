<script setup>
import { computed } from "vue";

const props = defineProps({
  model: { type: Object, required: true },
  fretRows: { type: Number, required: true }
});

const markers = computed(() => props.model.strings.flatMap((string, stringIndex) => {
  if (string.fret <= 0) return [];
  const row = string.fret - props.model.baseFret;
  if (row < 0 || row >= props.fretRows) return [];
  return [{
    ...string,
    stringIndex,
    style: {
      left: `${stringIndex * 20}%`,
      top: `${(row + 0.5) * (100 / props.fretRows)}%`
    }
  }];
}));
</script>

<template>
  <div class="chord-diagram" :aria-label="`${model.symbol} guitar chord shape`">
    <div class="diagram-status-row">
      <span
        v-for="(string, index) in model.strings"
        :key="`status-${index}`"
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
        v-for="fretLine in fretRows + 1"
        :key="`fret-${fretLine}`"
        class="diagram-fret-line"
        :class="{ 'is-nut': fretLine === 1 && model.baseFret === 1 }"
        :style="{ top: `${(fretLine - 1) * (100 / fretRows)}%` }"
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
        aria-hidden="true"
      >{{ marker.tone?.label || "" }}</span>
    </div>
    <div class="diagram-string-names">
      <span v-for="(string, index) in model.strings" :key="`name-${index}`">{{ string.name }}</span>
    </div>
  </div>
</template>
