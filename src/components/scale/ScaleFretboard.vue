<script setup>
defineProps({
  ariaLabel: {
    type: String,
    required: true
  },
  renderData: {
    type: Object,
    required: true
  },
  stringLabel: {
    type: String,
    required: true
  }
});
</script>

<template>
  <div
    class="fretboard"
    id="fretboard"
    role="img"
    :aria-label="ariaLabel"
    :style="{ '--visible-frets': renderData.visibleFrets.length }"
  >
    <div class="fretboard-corner" aria-hidden="true">{{ stringLabel }}</div>
    <div
      v-for="fret in renderData.visibleFrets"
      :key="`fret-number-${fret}`"
      class="fret-number"
      aria-hidden="true"
    >{{ fret }}</div>

    <template v-for="row in renderData.rows" :key="row.description">
      <div class="string-label" :title="`${row.description} string`" aria-hidden="true">{{ row.name }}</div>
      <div
        v-for="cell in row.cells"
        :key="`${row.description}-${cell.fret}`"
        class="fret-cell"
        :class="{ 'open-string-cell': cell.fret === 0 }"
        aria-hidden="true"
        :data-string="row.name"
        :data-fret="cell.fret"
        :data-pitch="cell.pitch"
        :data-scale-member="String(cell.included)"
      >
        <span
          v-if="cell.included"
          class="fret-note"
          :class="[`interval-color-${cell.intervalIndex}`, { 'is-root': cell.tonic }]"
          :title="`${cell.note}, degree ${cell.degree}, ${row.description} string, fret ${cell.fret}`"
          :data-degree="cell.degree"
          :data-note="cell.note"
          :data-tonic="String(cell.tonic)"
        >{{ cell.label }}</span>
      </div>
    </template>

    <div class="fretboard-corner fretboard-bottom-corner" aria-hidden="true"></div>
    <div
      v-for="marker in renderData.positionMarkers"
      :key="`fret-marker-${marker.fret}`"
      class="fret-position-marker"
      aria-hidden="true"
    >
      <span v-for="dot in marker.dots" :key="dot"></span>
    </div>
  </div>
</template>
