<script setup>
import { computed } from "vue";
import ProgressionShapeCard from "./ProgressionShapeCard.vue";

const props = defineProps({
  engine: { type: Object, required: true },
  entry: { type: Object, required: true },
  index: { type: Number, required: true },
  inputName: { type: String, required: true },
  placeholder: { type: String, default: "Chord" },
  sectionName: { type: String, required: true }
});
const emit = defineEmits(["blur", "open-picker", "update"]);

const parsed = computed(() => props.engine.parseChord(props.entry.symbol));
const voicings = computed(() => parsed.value ? props.engine.generateVoicings(parsed.value) : []);
const effectiveIndex = computed(() => voicings.value.length ? props.entry.shapeIndex % voicings.value.length : 0);
const selectedVoicing = computed(() => voicings.value[effectiveIndex.value] || null);
</script>

<template>
  <div class="progression-writer-chord-field" :data-entry-id="entry.uid" :data-shape-index="effectiveIndex">
    <label>
      <span>Chord {{ index + 1 }}</span>
      <input
        type="text"
        :name="inputName"
        autocomplete="off"
        :placeholder="placeholder"
        :value="entry.symbol"
        @input="emit('update', $event.target.value)"
        @blur="emit('blur')"
      >
    </label>
    <div class="progression-writer-shape-preview" data-shape-preview>
      <ProgressionShapeCard
        v-if="parsed && selectedVoicing"
        :engine="engine"
        :index="effectiveIndex"
        :parsed="parsed"
        :total="voicings.length"
        :voicing="selectedVoicing"
        @choose="emit('open-picker', { sectionName, uid: entry.uid })"
      />
      <p v-else-if="parsed" class="progression-writer-shape-empty">No compact guitar shape found.</p>
    </div>
  </div>
</template>
