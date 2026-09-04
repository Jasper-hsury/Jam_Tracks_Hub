<script setup>
import { computed } from "vue";
import ProgressionChordDiagram from "./ProgressionChordDiagram.vue";

const props = defineProps({
  engine: { type: Object, required: true },
  index: { type: Number, required: true },
  parsed: { type: Object, required: true },
  total: { type: Number, required: true },
  variant: { type: String, default: "preview" },
  voicing: { type: Object, required: true }
});
const emit = defineEmits(["choose", "select"]);

const model = computed(() => props.engine.diagramModel(props.parsed, props.voicing));
const fretText = computed(() => props.voicing.frets.map(fret => fret < 0 ? "x" : fret).join(" "));
const positionText = computed(() => model.value.baseFret === 1
  ? "Open / low position"
  : `Starts at fret ${model.value.baseFret}`);
const isPicker = computed(() => props.variant === "picker");

function selectFromCard() {
  if (isPicker.value) emit("select", props.index);
}
</script>

<template>
  <article
    class="chord-shape-card progression-writer-shape-card"
    :class="{ 'progression-writer-shape-picker-card': isPicker }"
    :data-select-shape-index="isPicker ? index : null"
    :tabindex="isPicker ? 0 : null"
    @click="selectFromCard"
    @keydown.enter.prevent="selectFromCard"
    @keydown.space.prevent="selectFromCard"
  >
    <div class="chord-shape-card-heading progression-writer-shape-heading">
      <div>
        <span>Shape {{ index + 1 }}{{ isPicker ? "" : ` of ${total}` }}</span>
        <strong>{{ parsed.symbol }}</strong>
        <small>{{ fretText }}</small>
      </div>
      <small>{{ positionText }}</small>
      <button
        class="secondary-button progression-writer-shape-button"
        type="button"
        :data-select-shape-index="isPicker ? index : null"
        :data-open-shape-picker="isPicker ? null : ''"
        @click.stop="isPicker ? emit('select', index) : emit('choose')"
      >{{ isPicker ? "Use Shape" : "Choose Other Shape" }}</button>
    </div>
    <ProgressionChordDiagram :model="model" :fret-rows="engine.DIAGRAM_FRET_ROWS" />
  </article>
</template>
