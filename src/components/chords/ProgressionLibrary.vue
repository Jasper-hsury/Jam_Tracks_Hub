<script setup>
import { computed } from "vue";
import ChordShapeCard from "./ChordShapeCard.vue";
import { chunkProgressionItems, progressionCategories } from "../../music/chordProgressions.mjs";

const props = defineProps({
  chordMap: { type: Object, required: true },
  messages: { type: Object, required: true },
  progressions: { type: Array, required: true },
  rootPositionLabel: { type: String, required: true },
  translateCopy: { type: Function, required: true }
});

function progressionGroups(progression) {
  const chords = progression.numerals.map(numeral => props.chordMap[numeral] || numeral);
  const chordGroups = chords.length > 4 ? chunkProgressionItems(chords, 4) : [chords];
  const numeralGroups = chords.length > 4 ? chunkProgressionItems(progression.numerals, 4) : [progression.numerals];
  return chordGroups.map((group, index) => ({
    chords: group,
    numerals: numeralGroups[index],
    start: index * 4 + 1,
    end: index * 4 + group.length
  }));
}

const categories = computed(() => progressionCategories(props.progressions).map(category => ({
  ...category,
  progressions: category.progressions.map(progression => ({
    ...progression,
    groups: progressionGroups(progression)
  }))
})));

function format(template, variables) {
  return String(template).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : match
  );
}

function progressionCount(count) {
  return format(count === 1 ? props.messages.progressionCount_one : props.messages.progressionCount_other, { count });
}

function openDictionaryLabel(chord) {
  return format(props.messages.openDictionary, { chord });
}

function barsLabel(group) {
  return format(props.messages.bars, group);
}

function shapeLabel(group) {
  return format(props.messages.shapeLabel, group);
}
</script>

<template>
  <div class="progression-category-list">
    <details
      v-for="(category, categoryIndex) in categories"
      :key="category.category"
      class="progression-voicing-category"
      :open="categoryIndex === 0"
    >
      <summary class="progression-category-heading progression-voicing-heading">
        <span class="progression-category-title">{{ translateCopy(category.category) }}</span>
        <span class="progression-category-meta"><strong>{{ progressionCount(category.progressions.length) }}</strong></span>
      </summary>
      <div class="progression-voicing-grid">
        <article
          v-for="progression in category.progressions"
          :key="progression.numerals.join('-')"
          class="progression-voicing-card"
          :class="{
            'has-four-voicings': progression.groups[0].chords.length === 4,
            'has-grouped-bars': progression.groups.length > 1
          }"
        >
          <template v-if="progression.groups.length > 1">
            <div class="progression-summary-stack">
              <div
                v-for="(group, groupIndex) in progression.groups"
                :key="groupIndex"
                class="progression-voicing-summary"
              >
                <span class="progression-numerals" :class="`progression-count-${group.chords.length}`">
                  <span v-for="(numeral, index) in group.numerals" :key="index" class="progression-numeral-token">{{ numeral }}</span>
                </span>
                <span class="progression-compact-chords" :class="`progression-count-${group.chords.length}`">
                  <span v-for="(chord, index) in group.chords" :key="index" class="progression-chord-token">{{ chord }}</span>
                </span>
                <p class="progression-style" :class="`progression-count-${group.chords.length}`">
                  <span class="progression-group-label">{{ barsLabel(group) }}</span>
                  <span v-if="groupIndex === progression.groups.length - 1" class="progression-style-name">{{ translateCopy(progression.style) }}</span>
                </p>
              </div>
            </div>
            <div class="progression-voicing-stack">
              <div
                v-for="(group, groupIndex) in progression.groups"
                :key="groupIndex"
                class="progression-chord-voicings progression-chord-voicing-group"
                :aria-label="shapeLabel(group)"
              >
                <ChordShapeCard
                  v-for="(chord, index) in group.chords"
                  :key="`${chord}-${index}`"
                  :chord-name="chord"
                  :dictionary-label="messages.dictionaryLabel"
                  :open-label="openDictionaryLabel(chord)"
                  :root-position-label="rootPositionLabel"
                />
              </div>
            </div>
          </template>
          <template v-else>
            <div class="progression-voicing-summary">
              <span class="progression-numerals" :class="`progression-count-${progression.groups[0].chords.length}`">
                <span v-for="(numeral, index) in progression.groups[0].numerals" :key="index" class="progression-numeral-token">{{ numeral }}</span>
              </span>
              <span class="progression-compact-chords" :class="`progression-count-${progression.groups[0].chords.length}`">
                <span v-for="(chord, index) in progression.groups[0].chords" :key="index" class="progression-chord-token">{{ chord }}</span>
              </span>
              <p class="progression-style" :class="`progression-count-${progression.groups[0].chords.length}`">{{ translateCopy(progression.style) }}</p>
            </div>
            <div class="progression-chord-voicings">
              <ChordShapeCard
                v-for="(chord, index) in progression.groups[0].chords"
                :key="`${chord}-${index}`"
                :chord-name="chord"
                :dictionary-label="messages.dictionaryLabel"
                :open-label="openDictionaryLabel(chord)"
                :root-position-label="rootPositionLabel"
              />
            </div>
          </template>
        </article>
      </div>
    </details>
  </div>
</template>
