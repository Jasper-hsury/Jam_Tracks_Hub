<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { filterShapeVoicings } from "../../music/progressionWriter.mjs";
import ProgressionShapeCard from "./ProgressionShapeCard.vue";

const props = defineProps({
  engine: { type: Object, required: true },
  open: { type: Boolean, required: true },
  parsed: { type: Object, default: null },
  position: { type: String, default: "all" },
  rootString: { type: String, default: "all" },
  voicings: { type: Array, default: () => [] },
  messages: { type: Object, required: true },
  common: { type: Object, required: true }
});
const emit = defineEmits(["close", "select", "update:position", "update:root-string"]);
const closeButton = ref(null);
const rootStringOptions = Object.freeze([
  { value: "6", label: "6th E" },
  { value: "5", label: "5th A" },
  { value: "4", label: "4th D" },
  { value: "3", label: "3rd G" },
  { value: "2", label: "2nd B" },
  { value: "1", label: "1st e" }
]);

const filtered = computed(() => props.parsed
  ? filterShapeVoicings(props.voicings, props.parsed, props.position, props.rootString, props.engine)
  : []);
const positionLabel = computed(() => props.position === "all" ? "all positions" : `near fret ${props.position}`);
const rootStringLabel = computed(() => props.rootString === "all" ? "any root string" : `root on ${props.engine.rootStringLabel(props.rootString)}`);
const countText = computed(() => {
  const active = props.position !== "all" || props.rootString !== "all";
  if (active) return `${filtered.value.length} of ${props.voicings.length} shapes matching ${positionLabel.value}, ${rootStringLabel.value}`;
  return `${props.voicings.length} ${props.voicings.length === 1 ? "shape" : "shapes"} found`;
});

function nearLabel(fret) {
  return String(props.messages.near).replace(/\{\{\s*fret\s*\}\}/, String(fret));
}

watch(() => props.open, async value => {
  if (!value) return;
  await nextTick();
  closeButton.value?.focus();
});
</script>

<template>
  <Teleport to="body">
    <div
      id="progressionShapePicker"
      class="progression-writer-shape-picker-modal"
      :hidden="!open"
      @keydown.esc="emit('close')"
    >
      <div class="progression-writer-shape-picker-backdrop" data-close-shape-picker @click="emit('close')"></div>
      <section class="progression-writer-shape-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="progressionShapePickerTitle">
        <div class="progression-writer-shape-picker-header">
          <div>
            <span class="result-kicker">{{ messages.guitarVoicings }}</span>
            <h2 id="progressionShapePickerTitle" class="section-title">{{ messages.availableShapes }}</h2>
            <p>{{ messages.shapeHelp }}</p>
          </div>
          <button ref="closeButton" class="secondary-button progression-writer-shape-picker-close" type="button" data-close-shape-picker @click="emit('close')">{{ common.close }}</button>
        </div>

        <div class="progression-writer-shape-picker-summary">
          <strong id="progressionShapePickerChord">{{ parsed?.symbol || messages.chord }}</strong>
          <span id="progressionShapePickerCount">{{ countText }}</span>
        </div>

        <div id="progressionShapePositionFilter" class="dictionary-position-filter progression-writer-shape-filter" :aria-label="messages.position">
          <span>{{ messages.position }}</span>
          <button type="button" :class="{ 'is-selected': position === 'all' }" :aria-pressed="String(position === 'all')" data-picker-position="all" @click="emit('update:position', 'all')">{{ common.all }}</button>
          <button
            v-for="fret in engine.POSITION_TARGETS"
            :key="fret"
            type="button"
            :class="{ 'is-selected': position === String(fret) }"
            :aria-pressed="String(position === String(fret))"
            :data-picker-position="fret"
            @click="emit('update:position', String(fret))"
          >{{ nearLabel(fret) }}</button>
        </div>

        <div id="progressionShapeRootFilter" class="dictionary-position-filter progression-writer-shape-filter" :aria-label="messages.rootString">
          <span>{{ messages.rootString }}</span>
          <button type="button" :class="{ 'is-selected': rootString === 'all' }" :aria-pressed="String(rootString === 'all')" data-picker-root-string="all" @click="emit('update:root-string', 'all')">{{ common.all }}</button>
          <button
            v-for="option in rootStringOptions"
            :key="option.value"
            type="button"
            :class="{ 'is-selected': rootString === option.value }"
            :aria-pressed="String(rootString === option.value)"
            :data-picker-root-string="option.value"
            @click="emit('update:root-string', option.value)"
          >{{ option.label }}</button>
        </div>

        <div id="progressionShapePickerGrid" class="progression-writer-shape-picker-grid">
          <ProgressionShapeCard
            v-for="item in filtered"
            :key="item.index"
            :engine="engine"
            :index="item.index"
            :parsed="parsed"
            :total="voicings.length"
            :voicing="item.voicing"
            variant="picker"
            @select="emit('select', $event)"
          />
          <div v-if="!filtered.length" class="dictionary-empty progression-writer-shape-picker-empty">
            <strong>No shapes found for {{ positionLabel }} with {{ rootStringLabel }}.</strong>
            <span>Choose another fret area, root string, or select All.</span>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>
