<script setup>
import ProgressionChordField from "./ProgressionChordField.vue";

defineProps({
  engine: { type: Object, required: true },
  entries: { type: Array, required: true },
  addLabel: { type: String, default: "Add Chord" },
  deleteLabel: { type: String, default: "Delete Chord" },
  headingId: { type: String, required: true },
  inputName: { type: String, required: true },
  kicker: { type: String, required: true },
  placeholders: { type: Array, default: () => [] },
  sectionName: { type: String, required: true },
  title: { type: String, required: true }
});
const emit = defineEmits(["add", "blur", "delete", "open-picker", "update"]);
</script>

<template>
  <section class="progression-writer-entry" :aria-labelledby="headingId">
    <div class="progression-writer-entry-heading">
      <div>
        <span class="result-kicker">{{ kicker }}</span>
        <h2 :id="headingId" class="section-title">{{ title }}</h2>
      </div>
      <div class="progression-writer-chord-actions">
        <button class="secondary-button progression-writer-add-button" type="button" :data-add-chord="sectionName" @click="emit('add', sectionName)">{{ addLabel }}</button>
        <button class="secondary-button progression-writer-delete-button" type="button" :data-delete-chord="sectionName" @click="emit('delete', sectionName)">{{ deleteLabel }}</button>
      </div>
    </div>
    <div class="progression-writer-chord-grid" :data-chord-list="sectionName">
      <ProgressionChordField
        v-for="(entry, index) in entries"
        :key="entry.uid"
        :engine="engine"
        :entry="entry"
        :index="index"
        :input-name="inputName"
        :placeholder="placeholders[index] || 'Chord'"
        :section-name="sectionName"
        @update="emit('update', sectionName, entry.uid, $event)"
        @blur="emit('blur', sectionName, entry.uid)"
        @open-picker="emit('open-picker', $event)"
      />
    </div>
  </section>
</template>
